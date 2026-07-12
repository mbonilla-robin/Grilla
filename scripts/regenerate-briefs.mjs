/**
 * Regenera briefs que salieron en español (pre-fix de idioma).
 * Uso: node scripts/regenerate-briefs.mjs [--all] [--post-id <uuid>]
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function loadEnv() {
  const env = {};
  for (const line of readFileSync(resolve(ROOT, ".env.local"), "utf8").split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i === -1) continue;
    env[line.slice(0, i)] = line.slice(i + 1);
  }
  return env;
}

function loadSystemPrompt() {
  const source = readFileSync(resolve(ROOT, "src/app/api/brief/route.ts"), "utf8");
  const match = source.match(/const BRIEF_SYSTEM_PROMPT = `([\s\S]*?)`;/);
  if (!match) throw new Error("No se encontró BRIEF_SYSTEM_PROMPT en route.ts");
  return match[1];
}

function isBrandKitConfigured(brandKit) {
  if (!brandKit) return false;
  const hasColors = (brandKit.colors ?? []).some((c) => c?.trim());
  const hasFonts = Boolean(
    brandKit.fonts?.heading?.trim() && brandKit.fonts?.body?.trim()
  );
  return hasColors || hasFonts;
}

function brandKitToPalette(colors, fonts) {
  return {
    colors: colors.map((hex, i) => ({
      hex: hex.toUpperCase(),
      name: i === 0 ? "Primary" : i === 1 ? "Accent" : `Color ${i + 1}`,
      role: i === 0 ? "title" : i === 1 ? "accent" : "support",
    })),
    fonts,
  };
}

function normalizeBrief(content, fallbackFormat, brandKit) {
  if (!content || typeof content !== "object") return null;
  if (!Array.isArray(content.slides) || content.slides.length === 0) return null;

  const configured = isBrandKitConfigured(brandKit);
  let slides = content.slides;
  const hasStructured = slides.some((s) => s.visual_concept || s.text_instructions);
  const hasLegacy = slides.some((s) => s.title || s.image_prompt);
  if (!hasStructured && !hasLegacy) return null;

  if (!configured) {
    slides = slides.map((s) => ({ ...s, colors_used: undefined }));
  }

  const brand_palette = configured
    ? content.brand_palette || brandKitToPalette(brandKit.colors, brandKit.fonts)
    : undefined;

  return {
    format: content.format || fallbackFormat,
    execution_title:
      typeof content.execution_title === "string" ? content.execution_title : undefined,
    brand_kit_configured: configured,
    brand_palette,
    slides,
    strategic_note:
      typeof content.strategic_note === "string" ? content.strategic_note : undefined,
    notes: typeof content.notes === "string" ? content.notes : undefined,
    generated_at: new Date().toISOString(),
  };
}

const BAD_PATTERNS = [
  /Título:/,
  /Párrafo:/,
  /Subtítulo:/,
  /Sin Brand Kit configurado/,
  /¿Tu equipo/,
  /Garantiza tu/,
  /Esta marca no tiene/,
  /Señal \d/,
  /Introducción/,
  /Diseño limpio/,
  /Fotografía realista/,
  /Un plano general/,
  /Un primer plano/,
];

function isBadBrief(brief) {
  const text = JSON.stringify(brief);
  return BAD_PATTERNS.some((pattern) => pattern.test(text));
}

async function callGemini(apiKey, model, systemPrompt, input) {
  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
  );
  url.searchParams.set("key", apiKey);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
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
                      text_casing: input.brandKit.text_casing ?? null,
                    }
                  : null,
              }),
            },
          ],
        },
      ],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });

  const raw = await response.text();
  if (!response.ok) throw new Error(`${response.status}: ${raw.slice(0, 300)}`);

  const data = JSON.parse(raw);
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini no devolvió contenido");

  return JSON.parse(text);
}

async function generateBrief(apiKey, models, systemPrompt, input) {
  let lastError = "Respuesta inválida de Gemini";
  for (const model of models) {
    try {
      const content = await callGemini(apiKey, model, systemPrompt, input);
      const brief = normalizeBrief(content, input.format, input.brandKit);
      if (brief) return brief;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.error(`  Gemini (${model}):`, lastError);
    }
  }
  throw new Error(lastError);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const env = loadEnv();
const apiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error("Falta GEMINI_API_KEY en .env.local");
  process.exit(1);
}

const models = env.GEMINI_MODEL
  ? [env.GEMINI_MODEL]
  : ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const systemPrompt = loadSystemPrompt();
const args = process.argv.slice(2);
const postIdArg = args.includes("--post-id") ? args[args.indexOf("--post-id") + 1] : null;
const forceAll = args.includes("--all");

const { data: posts, error } = await admin
  .from("posts")
  .select("id, title, copy, references_text, format, organization_id, brief, brief_history, status")
  .not("brief", "is", null);

if (error) {
  console.error("Error consultando posts:", error.message);
  process.exit(1);
}

let targets = posts || [];
if (postIdArg) {
  targets = targets.filter((post) => post.id === postIdArg);
} else if (!forceAll) {
  targets = targets.filter((post) => isBadBrief(post.brief));
}

if (targets.length === 0) {
  console.log("No hay briefs para regenerar.");
  process.exit(0);
}

console.log(`Regenerando ${targets.length} brief(s)...`);

for (const post of targets) {
  console.log(`\n→ ${post.title}`);

  const { data: brandKitRow } = await admin
    .from("brand_kits")
    .select("*")
    .eq("organization_id", post.organization_id)
    .single();

  const brandKit = isBrandKitConfigured(brandKitRow)
    ? {
        colors: brandKitRow.colors,
        fonts: brandKitRow.fonts,
        tone_of_voice: brandKitRow.tone_of_voice,
        guidelines: brandKitRow.guidelines,
        text_casing: brandKitRow.text_casing,
      }
    : null;

  try {
    const brief = await generateBrief(apiKey, models, systemPrompt, {
      title: post.title,
      copy: post.copy,
      references: post.references_text,
      format: post.format,
      brandKit,
      instructions: post.brief?.instructions || undefined,
    });

    const existingHistory = post.brief_history || [];
    const newHistory = post.brief
      ? [{ ...post.brief, archived_at: new Date().toISOString() }, ...existingHistory].slice(0, 10)
      : existingHistory;

    const { error: updateError } = await admin
      .from("posts")
      .update({ brief, brief_history: newHistory, status: "brief_ready" })
      .eq("id", post.id);

    if (updateError?.message?.includes("brief_history")) {
      await admin.from("posts").update({ brief, status: "brief_ready" }).eq("id", post.id);
    } else if (updateError) {
      throw updateError;
    }

    console.log(`  ✓ Regenerado (${brief.slides?.length || 0} slides)`);
    console.log(`    execution_title: ${brief.execution_title}`);
    console.log(`    sample: ${brief.slides?.[0]?.text_instructions?.slice(0, 80)}...`);
  } catch (err) {
    console.error(`  ✗ Error: ${err instanceof Error ? err.message : err}`);
  }

  await sleep(1500);
}

console.log("\nListo.");
