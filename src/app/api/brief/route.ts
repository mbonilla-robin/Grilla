import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { DesignBrief, PostFormat } from "@/lib/types";

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

async function generateBrief(
  title: string,
  copy: string | null,
  references: string | null,
  format: PostFormat,
  brandKit: {
    colors: string[];
    fonts: { heading: string; body: string };
    tone_of_voice: string | null;
  } | null
): Promise<DesignBrief> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `Eres un director creativo para social media. Genera briefs de diseño estructurados en JSON.
              
Formato de respuesta:
{
  "format": "feed|carousel|reel|story",
  "slides": [
    {
      "slide": 1,
      "title": "...",
      "subtitle": "...",
      "body": "...",
      "image_prompt": "descripción detallada para generar/buscar imagen",
      "colors": ["#hex1", "#hex2"],
      "typography": { "heading": "...", "body": "..." }
    }
  ],
  "notes": "notas adicionales para el diseñador"
}

Usa el brand kit cuando esté disponible. Responde en español.`,
            },
            {
              role: "user",
              content: JSON.stringify({
                title,
                copy,
                references,
                format,
                brandKit: brandKit
                  ? {
                      colors: brandKit.colors,
                      fonts: brandKit.fonts,
                      tone: brandKit.tone_of_voice,
                    }
                  : null,
              }),
            },
          ],
        }),
      });

      const data = await response.json();
      const content = JSON.parse(data.choices[0].message.content);
      return { ...content, generated_at: new Date().toISOString() };
    } catch {
      // fall through to mock
    }
  }

  return generateMockBrief(title, copy, format, brandKit);
}

function generateMockBrief(
  title: string,
  copy: string | null,
  format: PostFormat,
  brandKit: { colors: string[]; fonts: { heading: string; body: string } } | null
): DesignBrief {
  const colors = brandKit?.colors?.length
    ? brandKit.colors
    : ["#171717", "#fafafa", "#737373"];
  const fonts = brandKit?.fonts || { heading: "Inter", body: "Inter" };
  const slideCount = format === "carousel" ? 3 : 1;

  const slides = Array.from({ length: slideCount }, (_, i) => ({
    slide: i + 1,
    title: i === 0 ? title : `Slide ${i + 1}`,
    subtitle: i === 0 ? "Subtítulo sugerido" : undefined,
    body: i === 0 ? copy || "Texto del post aquí" : `Contenido slide ${i + 1}`,
    image_prompt:
      i === 0
        ? `Imagen minimalista relacionada con "${title}", estilo editorial, fondo limpio`
        : `Visual complementario para slide ${i + 1} del tema "${title}"`,
    colors,
    typography: fonts,
  }));

  return {
    format,
    slides,
    notes:
      "Brief generado localmente. Configura OPENAI_API_KEY para briefs con IA real.",
    generated_at: new Date().toISOString(),
  };
}
