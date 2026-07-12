import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { DesignBrief, DesignBriefSlide, PostFormat } from "@/lib/types";
import { brandKitToPalette, isBrandKitConfigured } from "@/lib/brief-colors";
import { formatSlideCopyAsTextInstructions, postProcessTextInstructions, truncateExecutionTitle } from "@/lib/brief-text";
import { normalizeBrandTextCasing } from "@/lib/brand-text-casing";
import { parseDesignerCopy } from "@/lib/utils";
import { resolvePostIdentifierReferences } from "@/lib/resolve-post-identifier";
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

  const identifierRefs = resolvePostIdentifierReferences(
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
      values: identifierRefs
        .map((ref) => ref.value)
        .filter((value): value is string => !!value),
      items: identifierRefs
        .filter((ref) => ref.value)
        .map((ref) => ({
          value: ref.value as string,
          photoUrl: ref.photoUrl,
        })),
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

IDIOMA (crítico — respeta siempre esta separación):
- El copy del post (campo "copy") está en INGLÉS. Preserva ese texto tal cual en text_instructions — nunca lo traduzcas.
- Las instrucciones del usuario (campo "instructions") llegan en ESPAÑOL. Léelas, interprétalas y aplícalas.
- CONTENIDO DE DISEÑO → INGLÉS (lo que va en la pieza gráfica): execution_title, focus, format_label, visual_concept, text_instructions (copy + specs tipográficas), image_treatment, layout, nombres y roles de colores en colors_used.
- COMUNICACIÓN INTERNA → ESPAÑOL (hablas al equipo creativo, no al post): strategic_note. Es contexto estratégico para quien produce el brief en la plataforma — siempre en español, tono directo y profesional.
- Usa etiquetas en inglés dentro de text_instructions: Title, Subtitle, Body, Paragraph, CTA.

SIEMPRE responde en JSON con esta estructura exacta:
{
  "format": "feed|carousel|reel|story|image|video_carousel",
  "execution_title": "Campaign or product name (e.g. Built for the Field (ZXAuto Terralord 2024))",
  "slides": [
    {
      "slide": 1,
      "focus": "Creative focus in a few words (e.g. Professional Utility)",
      "format_label": "Single Post Design (Focus: ...) — or 'Carousel Slide 1 (Focus: ...)' when applicable",
      "visual_concept": "Detailed photography/art direction: shot type, environment, lighting, attitude, materials. Be specific and cinematic. Always in English.",
      "text_instructions": "Typographic specs preserving the creator's copy STRUCTURE for this slide (see format rules below). Copy in English.",
      "image_treatment": "...",
      "layout": "...",
      "colors_used": [
        { "hex": "#E5E5E5", "name": "Brand White", "role": "title" },
        { "hex": "#DA4928", "name": "Accent Orange", "role": "subtitle" }
      ]
    }
  ],
  "brand_palette": {
    "colors": [{ "hex": "#...", "name": "...", "role": "..." }],
    "fonts": { "heading": "Montserrat", "body": "Montserrat" }
  },
  "strategic_note": "Nota estratégica en ESPAÑOL para el equipo interno (contexto, intención, coordinación — no copy del post)"
}

REGLAS DE ESTILO (obligatorias):
- Contenido de diseño en inglés; strategic_note en español (ver IDIOMA). Las etiquetas de sección en la UI las maneja la plataforma — no las repitas en el JSON.
- OBLIGATORIO si hay brand kit: usa EXCLUSIVAMENTE los colores hex y las fuentes tipográficas del brand kit recibido. No inventes colores ni fuentes alternativas.
- Copia brand_palette.colors y brand_palette.fonts directamente del brand kit del input.
- En colors_used de cada slide, lista cada color del brand kit que uses con hex, name descriptivo en inglés y role en inglés (title, subtitle, accent, background, logo, gradient).
- En text_instructions cita el hex exacto del brand kit junto al color (ej: Brand White #E5E5E5) — la UI mostrará muestras visuales del color.
- Usa las fuentes del brand kit por nombre exacto en heading y body.

CAPITALIZACIÓN DEL COPY (obligatorio si brandKit incluye text_casing):
- Aplica text_casing del brand kit al copy dentro de text_instructions — normaliza mayúsculas/minúsculas según la marca, sin cambiar palabras ni traducir.
- uppercase = TODO EN MAYÚSCULAS (ej: ABNORMAL VIBRATIONS).
- sentence = Sentence case: primera letra mayúscula, resto minúsculas (ej: Excessive movement may indicate imbalance...).
- Title → text_casing.title (casi siempre MAYÚSCULAS en marcas industriales).
- Paragraph / Body → text_casing.body (casi siempre estilo oración).
- Bullets (- ...) → text_casing.bullet
- CTA → text_casing.cta

SUBTITLE — REGLA CONTEXTUAL (crítico, no aplicar ciego text_casing.subtitle):
- Usa la etiqueta Subtitle SOLO cuando hay jerarquía de 3 niveles: Title (headline) + Subtitle (línea corta de apoyo) + Paragraph/Body (texto largo debajo).
- En ese caso (3 niveles), el Subtitle va en MAYÚSCULAS si text_casing.subtitle = uppercase.
- Si el slide solo tiene Title + un bloque de apoyo SIN párrafo separado debajo, NO uses Subtitle: convierte ese bloque en Paragraph con estilo oración — aunque en el copy original diga "subtítulo" o sea una segunda línea.
- Mal (2 niveles): Title: BUILT FOR THE FIELD. / Subtitle: We deliver integrated solutions for demanding field operations.
- Bien (2 niveles): Title: BUILT FOR THE FIELD. / Paragraph: We deliver integrated solutions for demanding field operations.
- Bien (3 niveles): Title: BUILT FOR THE FIELD. / Subtitle: READY WHEN YOU ARE. / Paragraph: Every unit in our fleet is configured for remote access.

ÉNFASIS EN PÁRRAFOS (obligatorio en Paragraph / Body):
- El copy va en texto PLANO — NUNCA uses asteriscos, markdown ni **negrita** / *cursiva* en el texto. Canva no los interpreta.
- Resalta 1-3 fragmentos por párrafo indicándolos SOLO en los paréntesis tipográficos al final de la línea.
- Formato: SemiBold on "frase exacta" o Italic on "frase exacta" dentro del paréntesis.
- Ejemplo: Paragraph: Every project has different terrain. We build the right solution for your operation. (Montserrat Regular/Medium, Brand White #E5E5E5; SemiBold on "We build the right solution").
- Mal: Paragraph: Every project. **We build the right solution** for your operation. (...)

JERARQUÍA TIPOGRÁFICA — TÍTULOS CORTOS (crítico — se aplica post-procesado si incumples):
- Title: es un HEADLINE corto e impactante. Ideal ~5 palabras; máximo 7 palabras (~40 caracteres). NUNCA un párrafo, bloque largo ni múltiples oraciones.
- Si el copy del slide trae texto largo, NO lo etiquetes entero como Title. Extrae la frase más corta y contundente para Title; el resto va en Subtitle, Body o Paragraph.
- Subtitle: una sola línea de apoyo MUY corta (ideal ≤8 palabras). Solo si hay Paragraph debajo; si no hay párrafo, usa Paragraph en lugar de Subtitle.
- Paragraph / Body: texto narrativo o explicativo más largo.
- CTA: acción clara en 1-2 frases cortas — no un bloque de párrafo.
- execution_title y focus también deben ser concisos (ideal ~5 palabras, máximo 7).
- Mal: Title: At Metalkor we have experience in rotating equipment maintenance and standardized processes under API, ASME, AWS, ISO, and OSHA standards.
- Bien: Title: Ensure operational continuity. + Paragraph: At Metalkor, we have experience in rotating equipment maintenance...
- Mal: Title: Excessive movement may indicate imbalance, misalignment, or internal wear in critical components.
- Bien: Title: Abnormal vibrations + Paragraph: Excessive movement may indicate imbalance, misalignment, or internal wear in critical components.

ESTRUCTURA DEL COPY (crítico — no forzar siempre Título/Subtítulo):
- Analiza el campo "copy" del input ANTES de escribir text_instructions en cada slide.
- NO conviertas todo a Título + Subtítulo. Respeta el formato que la creadora dejó en cada slide o sección.
- Formatos soportados en text_instructions (puedes mezclar dentro de un slide si aplica):
  1. Jerarquía explícita: líneas con etiqueta Title:, Subtitle:, Body:, CTA: — solo cuando el copy original use ese formato o sea claramente un headline + apoyo.
  2. Bullets: líneas que empiezan con "- " cuando el copy tiene listas, viñetas, ítems separados por " · ", o varias líneas cortas enumeradas.
  3. Paragraph: bloque de texto continuo con etiqueta Paragraph: cuando el copy es un párrafo narrativo sin jerarquía de título.
- Ejemplos de detección:
  · Copy "Título: X / Subtítulo: Y" → mantener Título + Subtítulo.
  · Copy "Slide 2: Ford F-800D — Bucket Truck / Pickman arm · Aerial access · ..." → bullets con "- Pickman arm", "- Aerial access", etc.
  · Copy "Slide 3: Every project has different terrain..." → Paragraph: Every project has different terrain...
  · Copy "Slide 1: ELEVATED ACCESS. / Built for operations..." → Title + Paragraph (la segunda línea actúa como párrafo, estilo oración con énfasis en paréntesis).
  · Copy "Slide 1: HEADLINE / Short hook / Long explanatory paragraph..." → Title + Subtitle (MAYÚSC) + Paragraph (oración con énfasis en paréntesis).
  · Copy con 3+ ítems separados por " · " en una línea → convertir a bullets.
- En carousels: un slide por tarjeta; cada slide puede tener formato distinto (slide 1 título/subtítulo, slide 2 párrafo, slide 3 bullets).
- Las especificaciones tipográficas van entre paréntesis al final de cada línea, en inglés: (Montserrat Extra Bold, Brand White #E5E5E5, massive size).
- Si brandKit es null en el input (sin Brand Kit configurado):
  - NO inventes colores hex, fuentes tipográficas, paletas ni nombres de marca visual.
  - Omite brand_palette del JSON o envíalo como null.
  - En text_instructions, indica "No Brand Kit configured" y describe la estructura del copy (Title/Subtitle, bullets o Paragraph según corresponda) — sin fuentes ni colores inventados.
  - Deja colors_used como array vacío en cada slide.
  - En strategic_note (en ESPAÑOL), indica que la marca no tiene Brand Kit y debe configurarse o coordinarse con el equipo.
- El tono es "Industrial-Premium": minimalista pero contundente, documental, operacional.
- Si el input incluye "identifier" con label, values y/o items (cada uno con value y photoUrl): úsalos como referencia de los sujetos del post (ej. placas de carros con foto). Si hay varios identificadores, menciónalos por separado en visual_concept cuando sea relevante.
- Para carousels: un slide por tarjeta, cada uno con su propio focus y variación visual coherente.
- Para reels/stories: adapta format_label y layout al formato vertical.

EJEMPLO DE REFERENCIA (sigue este nivel de detalle y tono):

🎨 Ejecución: Adaptability Campaign
Carousel Slide 1 (Focus: Hook)
visual_concept: Wide-angle documentary shot of industrial fleet vehicles in a real work environment. Natural lighting, ready-for-action attitude. No plastic retouching.
text_instructions:
Title: ADAPTABILITY IS NOT A FEATURE. (Montserrat Extra Bold, Brand White #E5E5E5, massive size).
Paragraph: It's how we operate. (Montserrat Regular/Medium, Accent Orange #DA4928, open tracking).

Carousel Slide 2 (Focus: Context)
visual_concept: Complementary operational context shot, same Industrial-Premium aesthetic.
text_instructions:
Paragraph: Every project has different terrain, timelines, and technical demands. We don't offer a fixed solution — we build the right one. (Montserrat Regular/Medium, Brand White #E5E5E5; SemiBold on "We don't offer a fixed solution").

Carousel Slide 3 (Focus: Capabilities)
text_instructions:
- Ambulances for HSE coverage (Montserrat Medium, Accent Orange #DA4928).
- Cranes for heavy lifts (Montserrat Medium, Brand White #E5E5E5).
- 4x4s for remote access (Montserrat Medium, Brand White #E5E5E5).
- Welding units for on-site intervention (Montserrat Medium, Brand White #E5E5E5).

Carousel Slide 4 (Focus: CTA)
text_instructions:
CTA: Whatever your operation requires. PetroEquip has it ready. (Montserrat SemiBold, Accent Orange #DA4928, emphasized).

strategic_note: "Priorizar estética Industrial-Premium con contraste limpio. El copy del post va en inglés; esta nota es contexto interno para el diseñador." (siempre en español)`;

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
    text_casing?: unknown;
  } | null,
  instructions?: string,
  identifier?: {
    label: string | null;
    values: string[];
    items: Array<{ value: string; photoUrl: string | null }>;
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
      text_casing?: unknown;
    } | null;
    instructions?: string;
    identifier?: {
      label: string | null;
      values: string[];
      items: Array<{ value: string; photoUrl: string | null }>;
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
                language: {
                  content: "english",
                  user_instructions: "spanish",
                  design_output: "english",
                  internal_notes: "spanish",
                },
                identifier: input.identifier || null,
                brandKit: input.brandKit
                  ? {
                      colors: input.brandKit.colors,
                      fonts: input.brandKit.fonts,
                      tone: input.brandKit.tone_of_voice,
                      guidelines: input.brandKit.guidelines,
                      text_casing: normalizeBrandTextCasing(input.brandKit.text_casing),
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

  slides = slides.map((s) => ({
    ...s,
    text_instructions: s.text_instructions
      ? postProcessTextInstructions(s.text_instructions)
      : s.text_instructions,
  }));

  const rawExecutionTitle =
    typeof raw.execution_title === "string" ? raw.execution_title : undefined;

  const brand_palette = configured
    ? (raw.brand_palette as DesignBrief["brand_palette"]) ||
      buildBrandPalette(brandKit)
    : undefined;

  return {
    format: (raw.format as PostFormat) || fallbackFormat,
    execution_title: rawExecutionTitle
      ? truncateExecutionTitle(rawExecutionTitle)
      : undefined,
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
  brandKit: { colors: string[]; fonts: { heading: string; body: string }; text_casing?: unknown } | null,
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
      focus: slideLabel || (i === 0 ? "Primary focus" : `Slide ${i + 1}`),
      format_label:
        slideCount > 1
          ? `Carousel Slide ${i + 1}${slideLabel ? ` (${slideLabel})` : ""} (Focus: ${slideLabel || `Content ${i + 1}`})`
          : "Single Post Design (Focus: Primary focus)",
      visual_concept:
        i === 0
          ? `Wide-angle documentary photography related to "${title}". Real work environment, natural lighting, ready-for-action attitude. No plastic retouching.`
          : `Complementary visual for slide ${i + 1}, consistent with the Industrial-Premium aesthetic of "${title}".`,
      text_instructions: postProcessTextInstructions(
        formatSlideCopyAsTextInstructions(
          slideContent,
          configured,
          { heading: headingFont, body: bodyFont },
          { primary, accent },
          brandKit?.text_casing ? normalizeBrandTextCasing(brandKit.text_casing) : undefined
        )
      ),
      image_treatment: configured
        ? `Soft ${primary} gradient from the base (70% to 0% opacity) for legibility. Keep saturation on the main subject, slightly desaturated environment.`
        : "Soft gradient from the base for text legibility. Keep saturation on the main subject, slightly desaturated environment.",
      layout: configured
        ? `Left alignment, lower third or side placement. Brand logo in top-right corner, ${primary}, small and balanced.`
        : "Left alignment, lower third or side placement. Brand logo in top-right corner, small and balanced.",
      colors_used: colorRefs,
    };
  });

  return {
    format,
    execution_title: truncateExecutionTitle(title),
    brand_kit_configured: configured,
    brand_palette,
    slides,
    strategic_note: configured
      ? `Diseño minimalista pero contundente. Priorizar contraste limpio y estética Industrial-Premium. El copy del post va en inglés.${instructions ? ` Instrucciones adicionales: ${instructions}` : ""}`
      : `Esta marca no tiene Brand Kit configurado. Coordinar colores y tipografías con el equipo de marca antes de diseñar, o configurar el Brand Kit en la plataforma.${instructions ? ` Instrucciones: ${instructions}` : ""}`,
    instructions: instructions || undefined,
    notes: geminiError
      ? `Gemini falló: ${geminiError}`
      : "Brief generado localmente. Configura GEMINI_API_KEY para briefs con IA real.",
    generated_at: new Date().toISOString(),
  };
}
