import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { DesignBrief, DesignBriefSlide, PostFormat } from "@/lib/types";
import { brandKitToPalette } from "@/lib/brief-colors";

export async function POST(request: Request) {
  const { postId, orgId } = await request.json();
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

  const brief = await generateBrief(
    post.title,
    post.copy,
    post.references_text,
    post.format as PostFormat,
    brandKit
  );

  await supabase
    .from("posts")
    .update({ brief, status: "brief_ready" })
    .eq("id", postId);

  return NextResponse.json({ brief });
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
      "text_instructions": "Especificaciones tipográficas usando las fuentes del brand kit. Línea por línea:\\nTítulo: TEXTO. (Fuente heading del brand kit + peso, color hex del brand kit, tamaño).\\nSubtítulo: texto. (Fuente body del brand kit + peso, color hex del brand kit, tracking).",
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
- Si no hay brand kit, infiere una paleta coherente y documéntala en brand_palette.
- El tono es "Industrial-Premium": minimalista pero contundente, documental, operacional.
- Para carousels: un slide por tarjeta, cada uno con su propio focus y variación visual coherente.
- Para reels/stories: adapta format_label y layout al formato vertical.

EJEMPLO DE REFERENCIA (sigue este nivel de detalle y tono):

🎨 Ejecución: Built for the Field (ZXAuto Terralord 2024)
Diseño de Post Único (Focus: Professional Utility)
Concepto Visual: Fotografía documental industrial de gran angular (wide shot). La unidad (ZXAuto Terralord 2024) debe estar ubicada en un entorno de trabajo real: terreno sin pavimentar, grava o frente a una infraestructura energética. La iluminación debe ser natural, destacando los detalles de la carrocería y los neumáticos sin retoques plásticos. La toma debe capturar la actitud de "lista para la acción".
Instrucciones de Texto:
Título: BUILT FOR THE FIELD. (Montserrat Extra Bold, Blanco #E5E5E5, tamaño masivo).
Subtítulo: ZXAuto Terralord 2024 — 4x4 double cab, operational-grade. (Montserrat Regular/Medium, Naranja #DA4928, con tracking/espaciado abierto).
Tratamiento de Imagen: Degradado negro suave desde la base del post (opacidad de 70% a 0%) para legibilidad del texto. Saturación intacta en el camión, entorno desaturado para que la unidad sea el centro de gravedad.
Layout: Alineación a la izquierda, tercio inferior o lateral. Logo completo en esquina superior derecha, blanco, pequeño y equilibrado.
Nota Estratégica: "El diseño debe ser minimalista pero contundente. La palabra clave es 'Operational-grade'; el cliente necesita sentir que esta unidad no es una camioneta de ciudad, sino una herramienta de trabajo de alta gama. Todo el contenido en inglés. Montserrat con peso importante en el título. Estética Industrial-Premium."`;

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
  } | null
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
        });
        if (result) return result;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        console.error(`[brief] Gemini (${model}):`, lastError);
      }
    }

    return generateMockBrief(title, copy, format, brandKit, lastError);
  }

  return generateMockBrief(title, copy, format, brandKit);
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

  const slides = raw.slides as DesignBriefSlide[];
  const hasStructured = slides.some(
    (s) => s.visual_concept || s.text_instructions
  );
  const hasLegacy = slides.some((s) => s.title || s.image_prompt);

  if (!hasStructured && !hasLegacy) return null;

  const brand_palette =
    (raw.brand_palette as DesignBrief["brand_palette"]) ||
    buildBrandPalette(brandKit);

  return {
    format: (raw.format as PostFormat) || fallbackFormat,
    execution_title:
      typeof raw.execution_title === "string" ? raw.execution_title : undefined,
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
  geminiError?: string
): DesignBrief {
  const brand_palette = buildBrandPalette(brandKit);
  const primary = brandKit?.colors?.[0] || "#E5E5E5";
  const accent = brandKit?.colors?.[1] || brandKit?.colors?.[0] || "#DA4928";
  const headingFont = brandKit?.fonts?.heading || "Montserrat";
  const bodyFont = brandKit?.fonts?.body || "Montserrat";
  const slideCount = format === "carousel" ? 3 : 1;

  const colorRefs = brand_palette?.colors ?? [
    { hex: primary, name: "Principal", role: "título" },
    { hex: accent, name: "Acento", role: "subtítulo" },
  ];

  const slides: DesignBriefSlide[] = Array.from({ length: slideCount }, (_, i) => ({
    slide: i + 1,
    focus: i === 0 ? "Enfoque principal" : `Slide ${i + 1}`,
    format_label:
      slideCount > 1
        ? `Carousel Slide ${i + 1} (Focus: Contenido ${i + 1})`
        : "Diseño de Post Único (Focus: Enfoque principal)",
    visual_concept:
      i === 0
        ? `Fotografía documental de gran angular relacionada con "${title}". Entorno real de trabajo, iluminación natural, actitud de "lista para la acción". Sin retoques plásticos.`
        : `Visual complementario slide ${i + 1} coherente con la estética Industrial-Premium del tema "${title}".`,
    text_instructions:
      i === 0
        ? `Título: ${title.toUpperCase()}. (${headingFont} Extra Bold, ${primary}, tamaño masivo).\n${copy ? `Cuerpo: ${copy}. (${bodyFont} Regular/Medium, ${accent}, tracking abierto).` : `Subtítulo: [copy del post]. (${bodyFont} Regular/Medium, ${accent}, tracking abierto).`}`
        : `Texto slide ${i + 1}: [contenido]. (${bodyFont} Medium, ${accent}).`,
    image_treatment:
      `Degradado ${primary} suave desde la base (opacidad 70% a 0%) para legibilidad. Mantener saturación en el sujeto principal, entorno ligeramente desaturado.`,
    layout:
      `Alineación a la izquierda, tercio inferior o lateral. Logo de marca en esquina superior derecha, ${primary}, pequeño y equilibrado.`,
    colors_used: colorRefs,
  }));

  return {
    format,
    execution_title: title,
    brand_palette,
    slides,
    strategic_note:
      "Diseño minimalista pero contundente. Prioriza contraste limpio y estética Industrial-Premium. Respeta el idioma del copy del post.",
    notes: geminiError
      ? `Gemini falló: ${geminiError}`
      : "Brief generado localmente. Configura GEMINI_API_KEY para briefs con IA real.",
    generated_at: new Date().toISOString(),
  };
}
