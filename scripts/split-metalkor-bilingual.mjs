/**
 * Split Metalkor posts that embed Español + English in `copy` into copy / copy_en.
 * Petroequip is left untouched (English-only content stays in `copy`).
 *
 * Dry run:  node scripts/split-metalkor-bilingual.mjs
 * Apply:    node scripts/split-metalkor-bilingual.mjs --apply
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { createRequire } from "module";
import { pathToFileURL } from "url";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnv() {
  const env = {};
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i === -1) continue;
    env[line.slice(0, i)] = line.slice(i + 1);
  }
  return env;
}

// Load TS util via dynamic transpile-free duplicate for Node script stability.
// Keep logic mirrored with src/lib/bilingual-copy.ts

const ES_LINE =
  /^(?:versi[oó]n\s+en\s+espa[nñ]ol(?:\s*\([^)]*\))?|espa[nñ]ol)\s*:?\s*$/i;
const EN_LINE =
  /^(?:versi[oó]n\s+en\s+ingl[eé]s(?:\s*\([^)]*\))?|english\s+version|ingl[eé]s|english)\s*:?\s*$/i;
const ES_INLINE = /^(?:espa[nñ]ol|es)\s*:\s*/i;
const EN_INLINE = /^(?:ingl[eé]s|english|en)\s*:\s*/i;

function normalizeNewlines(text) {
  return text.replace(/\r\n/g, "\n").trim();
}

function cleanBlock(text) {
  return text.replace(/^\s+|\s+$/g, "").replace(/\n{3,}/g, "\n\n");
}

function looksBilingualCopy(copy) {
  if (!copy?.trim()) return false;
  const text = normalizeNewlines(copy);
  return (
    text.split("\n").some((l) => ES_LINE.test(l.trim()) || EN_LINE.test(l.trim())) ||
    /(^|\n)\s*(?:espa[nñ]ol|es)\s*:/i.test(text) ||
    /(^|\n)\s*(?:ingl[eé]s|english|en)\s*:/i.test(text) ||
    /(^|\n)\s*english\s+version\s*:?\s*($|\n)/i.test(text)
  );
}

function looksInterleaved(text) {
  const esHits = (text.match(/(?:^|\n)\s*(?:espa[nñ]ol|es)\s*:/gi) || []).length;
  const enHits = (text.match(/(?:^|\n)\s*(?:ingl[eé]s|english|en)\s*:/gi) || []).length;
  const slideHits = (text.match(/(?:^|\n)\s*(?:slide|SLIDE)\s*\d+/gi) || []).length;
  return slideHits >= 2 && esHits >= 2 && enHits >= 2;
}

function splitInterleaved(text) {
  const lines = text.split("\n");
  const slides = [];
  let current = null;
  let lang = null;
  const preamble = [];

  function pushLine(bucket, line) {
    if (!current) {
      if (bucket === "note") preamble.push(line);
      return;
    }
    if (bucket === "es") current.es.push(line);
    else if (bucket === "en") current.en.push(line);
    else current.notes.push(line);
  }

  for (const line of lines) {
    const trimmed = line.trim();
    const slideMatch = trimmed.match(/^(?:slide|SLIDE)\s*(\d+)\b(.*)$/i);
    if (slideMatch) {
      current = { header: trimmed, es: [], en: [], notes: [] };
      slides.push(current);
      lang = null;
      continue;
    }
    if (!current) {
      preamble.push(line);
      continue;
    }
    if (ES_LINE.test(trimmed) || /^espa[nñ]ol\s*:?\s*$/i.test(trimmed)) {
      lang = "es";
      continue;
    }
    if (EN_LINE.test(trimmed) || /^(?:ingl[eé]s|english)\s*:?\s*$/i.test(trimmed)) {
      lang = "en";
      continue;
    }
    if (ES_INLINE.test(trimmed)) {
      lang = "es";
      const rest = trimmed.replace(ES_INLINE, "");
      if (rest) pushLine("es", rest);
      continue;
    }
    if (EN_INLINE.test(trimmed)) {
      lang = "en";
      const rest = trimmed.replace(EN_INLINE, "");
      if (rest) pushLine("en", rest);
      continue;
    }
    if (/^(?:imagen de referencia|referencia visual)\s*:/i.test(trimmed)) {
      lang = "note";
      pushLine("note", trimmed);
      continue;
    }
    if (lang === "es") pushLine("es", line);
    else if (lang === "en") pushLine("en", line);
    else if (lang === "note") pushLine("note", line);
    else pushLine("note", line);
  }

  if (!slides.length) return null;
  if (!slides.some((s) => s.es.join("").trim() && s.en.join("").trim())) return null;

  const prefix = cleanBlock(preamble.join("\n"));
  const esParts = [];
  const enParts = [];
  if (prefix) esParts.push(prefix);

  for (const slide of slides) {
    const esBody = cleanBlock([...slide.es, ...slide.notes].join("\n"));
    const enBody = cleanBlock(slide.en.join("\n"));
    if (esBody || slide.es.length || slide.notes.length) {
      esParts.push(cleanBlock(`${slide.header}\n${esBody}`));
    }
    if (enBody) enParts.push(cleanBlock(`${slide.header}\n${enBody}`));
  }

  const es = cleanBlock(esParts.join("\n\n"));
  const en = cleanBlock(enParts.join("\n\n"));
  if (!es || !en) return null;
  return { es, en, mode: "interleaved" };
}

function findLineIndex(lines, re) {
  return lines.findIndex((line) => re.test(line.trim()));
}

function splitBlock(text) {
  const lines = text.split("\n");
  const esIdx = findLineIndex(lines, ES_LINE);
  const enIdx = findLineIndex(lines, EN_LINE);
  if (enIdx === -1) return null;

  if (esIdx === -1) {
    const prefix = cleanBlock(lines.slice(0, enIdx).join("\n"));
    const en = cleanBlock(lines.slice(enIdx + 1).join("\n"));
    if (!en) return null;
    return { es: prefix || en, en, mode: "block" };
  }

  if (esIdx > enIdx) {
    const prefix = cleanBlock(lines.slice(0, enIdx).join("\n"));
    const en = cleanBlock(lines.slice(enIdx + 1, esIdx).join("\n"));
    const es = cleanBlock(lines.slice(esIdx + 1).join("\n"));
    if (!es || !en) return null;
    return {
      es: cleanBlock([prefix, es].filter(Boolean).join("\n\n")),
      en,
      mode: "block",
    };
  }

  const prefix = cleanBlock(lines.slice(0, esIdx).join("\n"));
  const es = cleanBlock(lines.slice(esIdx + 1, enIdx).join("\n"));
  const en = cleanBlock(lines.slice(enIdx + 1).join("\n"));
  if (!es || !en) return null;
  return {
    es: cleanBlock([prefix, es].filter(Boolean).join("\n\n")),
    en,
    mode: "block",
  };
}

function splitBilingualCopy(raw) {
  if (!raw?.trim()) return null;
  const text = normalizeNewlines(raw);
  if (!looksBilingualCopy(text)) return null;
  if (looksInterleaved(text)) {
    const interleaved = splitInterleaved(text);
    if (interleaved) return interleaved;
  }
  return splitBlock(text);
}

const apply = process.argv.includes("--apply");
const env = loadEnv();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const METALKOR_ID = "135eec2b-f100-4b49-bfa0-79bb3f191474";

const { data: posts, error } = await admin
  .from("posts")
  .select("id, title, copy, copy_en, caption, caption_en")
  .eq("organization_id", METALKOR_ID)
  .not("copy", "is", null);

if (error) {
  console.error(error.message);
  process.exit(1);
}

console.log(`Metalkor posts with copy: ${(posts || []).length}`);
console.log(apply ? "Mode: APPLY" : "Mode: dry-run (pass --apply to write)");

let splitCount = 0;
let skipCount = 0;
let failCount = 0;

for (const post of posts || []) {
  if (post.copy_en?.trim()) {
    skipCount++;
    console.log(`  skip (already has copy_en): ${post.title}`);
    continue;
  }

  const split = splitBilingualCopy(post.copy);
  if (!split) {
    failCount++;
    console.log(`  no-split: ${post.title}`);
    continue;
  }

  splitCount++;
  console.log(`  ${split.mode}: ${post.title}`);
  console.log(`    ES (${split.es.length} chars) | EN (${split.en.length} chars)`);

  if (apply) {
    const { error: updateError } = await admin
      .from("posts")
      .update({ copy: split.es, copy_en: split.en })
      .eq("id", post.id);
    if (updateError) {
      console.error(`    ERROR: ${updateError.message}`);
      failCount++;
      splitCount--;
    }
  }
}

console.log(`\nDone. split=${splitCount} skip=${skipCount} no-split=${failCount}`);
