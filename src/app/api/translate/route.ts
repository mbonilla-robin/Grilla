import { NextResponse } from "next/server";

const LANG_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
};

export async function POST(request: Request) {
  const { text, from = "en", to = "es" } = await request.json();

  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "Texto requerido" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Traducción no disponible" }, { status: 503 });
  }

  const models = (
    process.env.GEMINI_MODEL
      ? [process.env.GEMINI_MODEL]
      : ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
  ) as string[];

  const fromLang = LANG_NAMES[from] || from;
  const toLang = LANG_NAMES[to] || to;

  let lastError = "No se pudo traducir";

  for (const model of models) {
    try {
      const url = new URL(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
      );
      url.searchParams.set("key", apiKey);

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Translate the following text from ${fromLang} to ${toLang}. Return ONLY the translated text, no quotes or explanation. Preserve technical/industrial terminology accurately.\n\n${text}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
          },
        }),
      });

      const raw = await response.text();
      if (!response.ok) throw new Error(`${response.status}: ${raw.slice(0, 200)}`);

      const data = JSON.parse(raw) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const translation = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!translation) throw new Error("Respuesta vacía");

      return NextResponse.json({ translation });
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  return NextResponse.json({ error: lastError }, { status: 502 });
}
