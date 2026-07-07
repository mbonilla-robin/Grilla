import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { DesignBrief, DesignBriefSlide, PostFormat } from "@/lib/types";
import { brandKitToPalette, isBrandKitConfigured } from "@/lib/brief-colors";
import { formatSlideCopyAsTextInstructions } from "@/lib/brief-text";
import { parseDesignerCopy } from "@/lib/utils";
import { resolvePostIdentifierReference } from "@/lib/resolve-post-identifier";
import type { OrgIdentifier } from "@/lib/types";

export async function POST(request: Request) {
  const { postId, orgId, instructions } = await request.json();
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .single();

  if (!post) {
    return NextResponse.json({ error: "Post no encontrado" }, { status: 404 });
  }

  const { data: brandKit } = await supabase
    .from("brand_kits")
    .select("*")
    .eq("organization_id", orgId)
    .single();

  const { data: org } = await supabase
    .from("organizations")
    .select("identifier_label, identifier_allow_photo")
    .eq("id", orgId)
    .single();

  const { data: catalog } = await supabase
    .from("org_identifiers")
    .select("*")
    .eq("organization_id", orgId);

  const identifierRef = resolvePostIdentifierReference(
    post,
    (catalog as OrgIdentifier[]) || []
  );

  const configuredBrandKit =
    brandKit && isBrandKitConfigured(brandKit) ? brandKit : null;

  const brief = await generateBrief(
    post.title,
    post.copy,
    post.references_text,
    post.format as PostFormat,
    configuredBrandKit,
    instructions,
    {
      label: org?.identifier_label || null,
      value: identifierRef.value || post.plate || null,
      photoUrl: identifierRef.photoUrl || null,
    }
  );

  const existingHistory = (post.brief_history as unknown[]) || [];
  const newHistory = post.brief
    ? [
        { ...(post.brief as DesignBrief), archived_at: new Date().toISOString() },
        ...existingHistory,
      ].slice(0, 10)
    : existingHistory;

  const withHistory = await supabase
    .from("posts")
    .update({ brief, brief_history: newHistory, status: "brief_ready" })
    .eq("id", postId);

  if (withHistory.error?.message?.includes("brief_history")) {
    await supabase
      .from("posts")
      .update({ brief, status: "brief_ready" })
      .eq("id", postId);
  }

  const { syncTasksForPost } = await import("@/lib/task-sync");
  await syncTasksForPost(supabase, postId, post.status);

  revalidatePath(`/org/${orgId}/grilla/${postId}`);
  revalidatePath(`/org/${orgId}/grilla`);
  revalidatePath(`/org/${orgId}/home`);
  revalidatePath("/home");
  revalidatePath("/home/calendario");

  return NextResponse.json({ brief, history: newHistory });
}

const BRIEF_SYSTEM_PROMPT = `Eres un director creativo senior de social media para marcas premium e industriales. Generas briefs de diseño detallados, accionables y con tono profesional.

SIEMPRE responde en JSON con esta estructura exacta:
{
  "format": "feed|carousel|reel|story|image|video_carousel",
  "execution_title": "Nombre de campaña o producto (ej: Built for the Field (ZXAuto Terralord 2024))",
  "slides": [
    {
      "slide": 1,
      "focus": "Enfoque creativo en pocas palabras (ej: Professional Utility)",
      "format_label": "Diseño de Post Único (Focus: ...) — o 'Carousel Slide 1 (Focus: ...)' si aplica",
      "visual_concept": "Descripción detallada de fotografía/arte: tipo de toma, entorno, iluminación, actitud, materiales. Sé específico y cinematográfico.",
      "text_instructions": "Especificaciones tipográficas respetando la ESTRUCTURA del copy del creador en este slide (ver reglas de formato abajo).",
      "image_treatment": "...",
      "layout": "...",
      "colors_used": [
        { "hex": "#E5E5E5", "name": "Blanco marca", "role": "título" },
        { "hex": "#DA4928", "name": "Naranja acento", "role": "subtítulo" }
      ]
    }
  ],
  "brand_palette": {
    "colors": [{ "hex": "#...", "name": "...", "role": "..." }],
    "fonts": { "heading": "Montserrat", "body": "Montserrat" }
  },
  "strategic_note": "..."
}

REGLAS DE ESTILO (obligatorias):
- Las etiquetas de sección van en español: Concepto Visual, Instrucciones de Texto, Tratamiento de Imagen, Layout.
- El copy del post respeta el idioma del contenido recibido (inglés si el post está en inglés).
- OBLIGATORIO si hay brand kit: usa EXCLUSIVAMENTE los colores hex y las fuentes tipográficas del brand kit recibido. No inventes colores ni fuentes alternativas.
- Copia brand_palette.colors y brand_palette.fonts directamente del brand kit del input.
- En colors_used de cada slide, lista cada color del brand kit que uses con hex, name descriptivo y role (título, subtítulo, acento, fondo, logo, degradado).
- En text_instructions cita el hex exacto del brand kit junto al color (ej: Blanco #E5E5E5) — la UI mostrará muestras visuales del color.
- Usa las fuentes del brand kit por nombre exacto en título (heading) y cuerpo/subtítulo (body).

ESTRUCTURA DEL COPY (crítico — no forzar siempre Título/Subtítulo):
- Analiza el campo "copy" del input ANTES de escribir text_instructions en cada slide.
- NO conviertas todo a Título + Subtítulo. Respeta el formato que la creadora dejó en cada slide o sección.
- Formatos soportados en text_instructions (puedes mezclar dentro de un slide si aplica):
  1. Jerarquía explícita: líneas con etiqueta Título:, Subtítulo:, Cuerpo:, CTA: — solo cuando el copy original use ese formato o sea claramente un headline + apoyo.
  2. Bullets: líneas que empiezan con "- " cuando el copy tiene listas, viñetas, ítems separados por " · ", o varias líneas cortas enumeradas.
  3. Párrafo: bloque de texto continuo con etiqueta Párrafo: cuando el copy es un párrafo narrativo sin jerarquía de título.
- Ejemplos de detección:
  · Copy "Título: X / Subtítulo: Y" → mantener Título + Subtítulo.
  · Copy "Slide 2: Ford F-800D — Bucket Truck / Pickman arm · Aerial access · ..." → bullets con "- Pickman arm", "- Aerial access", etc.
  · Copy "Slide 3: Every project has different terrain..." → Párrafo: Every project has different terrain...
  · Copy "Slide 1: ELEVATED ACCESS. / Built for operations..." → Título + Subtítulo (headline + línea de apoyo).
  · Copy con 3+ ítems separados por " · " en una línea → convertir a bullets.
- En carousels: un slide por tarjeta; cada slide puede tener formato distinto (slide 1 título/subtítulo, slide 2 párrafo, slide 3 bullets).
- Las especificaciones tipográficas van entre paréntesis al final de cada línea: (Montserrat Extra Bold, Blanco #E5E5E5, tamaño masivo).
- Si brandKit es null en el input (sin Brand Kit configurado):
  - NO inventes colores hex, fuentes tipográficas, paletas ni nombres de marca visual.
  - Omite brand_palette del JSON o envíalo como null.
  - En text_instructions, indica "Sin Brand Kit configurado" y describe la estructura del copy (Título/Subtítulo, bullets o Párrafo según corresponda) — sin fuentes ni colores inventados.
  - Deja colors_used como array vacío en cada slide.
  - En strategic_note, indica que la marca no tiene Brand Kit y debe configurarse o coordinarse con el equipo.
- El tono es "Industrial-Premium": minimalista pero contundente, documental, operacional.
- Si el input incluye "identifier" con label, value y/o photoUrl: úsalo como referencia del sujeto principal del post (ej. placa de carro con foto). Menciona el identificador en visual_concept cuando sea relevante para el diseño.
- Para carousels: un slide por tarjeta, cada uno con su propio focus y variación visual coherente.
- Para reels/stories: adapta format_label y layout al formato vertical.

EJEMPLO DE REFERENCIA (sigue este nivel de detalle y tono):

🎨 Ejecución: Adaptability Campaign
Carousel Slide 1 (Focus: Hook)
Concepto Visual: ...
Instrucciones de Texto:
Título: ADAPTABILITY IS NOT A FEATURE. (Montserrat Extra Bold, Blanco #E5E5E5, tamaño masivo).
Subtítulo: It's how we operate. (Montserrat Regular/Medium, Naranja #DA4928, tracking abierto).

Carousel Slide 2 (Focus: Context)
Concepto Visual: ...
Instrucciones de Texto:
Párrafo: Every project has different terrain, timelines, and technical demands. We don't offer a fixed solution — we build the right one. (Montserrat Regular/Medium, Blanco #E5E5E5, cuerpo legible).

Carousel Slide 3 (Focus: Capabilities)
Concepto Visual: ...
Instrucciones de Texto:
- Ambulances for HSE coverage (Montserrat Medium, Naranja #DA4928).
- Cranes for heavy lifts (Montserrat Medium, Blanco #E5E5E5).
- 4x4s for remote access (Montserrat Medium, Blanco #E5E5E5).
- Welding units for on-site intervention (Montserrat Medium, Blanco #E5E5E5).

Carousel Slide 4 (Focus: CTA)
Instrucciones de Texto:
CTA: Whatever your operation requires. PetroEquip has it ready. (Montserrat SemiBold, Naranja #DA4928, destacado).

Nota Estratégica: "..."`;

async function generateBrief(
  title: string,
  copy: string | null,
  references: string | null,
  format: PostFormat,
  brandKit: {
    colors: string[];
    fonts: { heading: string; body: string };
    tone_of_voice: string | null;
    guidelines: string | null;
  } | null,
  instructions?: string,
  identifier?: {
    label: string | null;
    value: string | null;
    photoUrl: string | null;
  }
): Promise<DesignBrief> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const models = (
    process.env.GEMINI_MODEL
      ? [process.env.GEMINI_MODEL]
      : ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
  ) as string[];

  if (apiKey) {
    let lastError = "Respuesta inválida de Gemini";

    for (const model of models) {
      try {
        const result = await callGemini(apiKey, model, {
          title,
          copy,
          references,
          format,
          brandKit,
          instructions,
          identifier,
        });
        if (result) return result;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        console.error(`[brief] Gemini (${model}):`, lastError);
      }
    }

    return generateMockBrief(title, copy, format, brandKit, lastError, instructions);
  }

  return generateMockBrief(title, copy, format, brandKit, undefined, instructions);
}

async function callGemini(
  apiKey: string,
  model: string,
  input: {
    title: string;
    copy: string | null;
    references: string | null;
    format: PostFormat;
    brandKit: {
      colors: string[];
      fonts: { heading: string; body: string };
      tone_of_voice: string | null;
      guidelines: string | null;
    } | null;
    instructions?: string;
    identifier?: {
      label: string | null;
      value: string | null;
      photoUrl: string | null;
    };
  }
): Promise<DesignBrief | null> {
  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
  );
  url.searchParams.set("key", apiKey);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: BRIEF_SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: JSON.stringify({
                title: input.title,
                copy: input.copy,
                references: input.references,
                format: input.format,
                instructions: input.instructions || null,
                identifier: input.identifier || null,
                brandKit: input.brandKit
                  ? {
                      colors: input.brandKit.colors,
                      fonts: input.brandKit.fonts,
                      tone: input.brandKit.tone_of_voice,
                      guidelines: input.brandKit.guidelines,
                    }
                  : null,
              }),
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
      },
    }),
  });

  const raw = await response.text();

  if (!response.ok) {
    throw new Error(`${response.status}: ${raw.slice(0, 300)}`);
  }

  let data: {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`JSON inválido: ${raw.slice(0, 200)}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini no devolvió contenido");
  }

  const content = JSON.parse(text);
  return normalizeBrief(content, input.format, input.brandKit);
}

function buildBrandPalette(
  brandKit: {
    colors: string[];
    fonts: { heading: string; body: string };
  } | null
) {
  if (!brandKit?.colors?.length) return undefined;
  return brandKitToPalette(brandKit.colors, brandKit.fonts);
}

function normalizeBrief(
  content: unknown,
  fallbackFormat: PostFormat,
  brandKit: {
    colors: string[];
    fonts: { heading: string; body: string };
  } | null
): DesignBrief | null {
  if (!content || typeof content !== "object") return null;
  const raw = content as Record<string, unknown>;
  if (!Array.isArray(raw.slides) || raw.slides.length === 0) return null;

  const configured = isBrandKitConfigured(brandKit);
  let slides = raw.slides as DesignBriefSlide[];
  const hasStructured = slides.some(
    (s) => s.visual_concept || s.text_instructions
  );
  const hasLegacy = slides.some((s) => s.title || s.image_prompt);

  if (!hasStructured && !hasLegacy) return null;

  if (!configured) {
    slides = slides.map((s) => ({
      ...s,
      colors_used: undefined,
    }));
  }

  const brand_palette = configured
    ? (raw.brand_palette as DesignBrief["brand_palette"]) ||
      buildBrandPalette(brandKit)
    : undefined;

  return {
    format: (raw.format as PostFormat) || fallbackFormat,
    execution_title:
      typeof raw.execution_title === "string" ? raw.execution_title : undefined,
    brand_kit_configured: configured,
    brand_palette,
    slides,
    strategic_note:
      typeof raw.strategic_note === "string" ? raw.strategic_note : undefined,
    notes: typeof raw.notes === "string" ? raw.notes : undefined,
    generated_at: new Date().toISOString(),
  };
}

function generateMockBrief(
  title: string,
  copy: string | null,
  format: PostFormat,
  brandKit: { colors: string[]; fonts: { heading: string; body: string } } | null,
  geminiError?: string,
  instructions?: string
): DesignBrief {
  const configured = isBrandKitConfigured(brandKit);
  const brand_palette = configured ? buildBrandPalette(brandKit) : undefined;
  const primary = brandKit?.colors?.[0] || "#E5E5E5";
  const accent = brandKit?.colors?.[1] || brandKit?.colors?.[0] || "#DA4928";
  const headingFont = brandKit?.fonts?.heading || "Montserrat";
  const bodyFont = brandKit?.fonts?.body || "Montserrat";
  const designer = parseDesignerCopy(copy);
  const slideSources =
    designer.slides.length > 0
      ? designer.slides
      : [
          {
            slide: 1,
            content: [designer.title, designer.subtitle, designer.body].filter(Boolean).join("\n\n") || copy || title,
          },
        ];
  const slideCount =
    format === "carousel" || format === "video_carousel"
      ? Math.max(slideSources.length, 3)
      : 1;

  const colorRefs = configured
    ? (brand_palette?.colors ?? [
        { hex: primary, name: "Principal", role: "título" },
        { hex: accent, name: "Acento", role: "subtítulo" },
      ])
    : undefined;

  const slides: DesignBriefSlide[] = Array.from({ length: slideCount }, (_, i) => {
    const source = slideSources[i];
    const slideContent = source?.content || `[contenido slide ${i + 1}]`;
    const slideLabel = source?.label;

    return {
      slide: i + 1,
      focus: slideLabel || (i === 0 ? "Enfoque principal" : `Slide ${i + 1}`),
      format_label:
        slideCount > 1
          ? `Carousel Slide ${i + 1}${slideLabel ? ` (${slideLabel})` : ""} (Focus: ${slideLabel || `Contenido ${i + 1}`})`
          : "Diseño de Post Único (Focus: Enfoque principal)",
      visual_concept:
        i === 0
          ? `Fotografía documental de gran angular relacionada con "${title}". Entorno real de trabajo, iluminación natural, actitud de "lista para la acción". Sin retoques plásticos.`
          : `Visual complementario slide ${i + 1} coherente con la estética Industrial-Premium del tema "${title}".`,
      text_instructions: formatSlideCopyAsTextInstructions(
        slideContent,
        configured,
        { heading: headingFont, body: bodyFont },
        { primary, accent }
      ),
      image_treatment: configured
        ? `Degradado ${primary} suave desde la base (opacidad 70% a 0%) para legibilidad. Mantener saturación en el sujeto principal, entorno ligeramente desaturado.`
        : "Degradado suave desde la base para legibilidad del texto. Mantener saturación en el sujeto principal, entorno ligeramente desaturado.",
      layout: configured
        ? `Alineación a la izquierda, tercio inferior o lateral. Logo de marca en esquina superior derecha, ${primary}, pequeño y equilibrado.`
        : "Alineación a la izquierda, tercio inferior o lateral. Logo de marca en esquina superior derecha, pequeño y equilibrado.",
      colors_used: colorRefs,
    };
  });

  return {
    format,
    execution_title: title,
    brand_kit_configured: configured,
    brand_palette,
    slides,
    strategic_note: configured
      ? `Diseño minimalista pero contundente. Prioriza contraste limpio y estética Industrial-Premium. Respeta el idioma del copy del post.${instructions ? ` Instrucciones adicionales: ${instructions}` : ""}`
      : `Esta marca no tiene Brand Kit configurado. Coordinar colores y tipografías con el equipo de marca antes de diseñar, o configurar el Brand Kit en la plataforma.${instructions ? ` Instrucciones: ${instructions}` : ""}`,
    instructions: instructions || undefined,
    notes: geminiError
      ? `Gemini falló: ${geminiError}`
      : "Brief generado localmente. Configura GEMINI_API_KEY para briefs con IA real.",
    generated_at: new Date().toISOString(),
  };
}
