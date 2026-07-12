/**
 * Importa la grilla de julio 2026 de Metalkor desde scripts/metalkor_july_2026.json
 * Uso: node scripts/import-metalkor-july.mjs
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

const env = loadEnv();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const posts = JSON.parse(readFileSync(resolve(__dirname, "metalkor_july_2026.json"), "utf8"));

const { data: orgs, error: orgError } = await admin
  .from("organizations")
  .select("id, name, slug");

if (orgError) {
  console.error("Error buscando organizaciones:", orgError.message);
  process.exit(1);
}

const org = (orgs || []).find(
  (o) =>
    o.name.toLowerCase().includes("metalkor") || o.slug.toLowerCase().includes("metalkor")
);

if (!org) {
  console.error("No se encontró la organización Metalkor.");
  process.exit(1);
}

console.log(`Organización: ${org.name} (${org.id})`);

const { data: members, error: membersError } = await admin
  .from("organization_members")
  .select("user_id, role, extra_roles")
  .eq("organization_id", org.id);

if (membersError) {
  console.error("Error buscando miembros:", membersError.message);
  process.exit(1);
}

const owner =
  members?.find((m) => m.role === "owner") ||
  members?.find((m) => m.role === "admin") ||
  members?.[0];

if (!owner) {
  console.error("No hay miembros en la organización.");
  process.exit(1);
}

const designer =
  members?.find(
    (m) => m.role === "designer" || (m.extra_roles || []).includes("designer")
  ) || owner;

const { count: existingCount, error: countError } = await admin
  .from("posts")
  .select("id", { count: "exact", head: true })
  .eq("organization_id", org.id)
  .gte("scheduled_at", "2026-07-01")
  .lt("scheduled_at", "2026-08-01");

if (countError) {
  console.error("Error contando posts existentes:", countError.message);
  process.exit(1);
}

if (existingCount > 0) {
  const { error: deleteError } = await admin
    .from("posts")
    .delete()
    .eq("organization_id", org.id)
    .gte("scheduled_at", "2026-07-01")
    .lt("scheduled_at", "2026-08-01");

  if (deleteError) {
    console.error("Error eliminando posts de julio:", deleteError.message);
    process.exit(1);
  }
  console.log(`Eliminados ${existingCount} posts previos de julio 2026.`);
}

const rows = posts.map((post) => ({
  organization_id: org.id,
  title: post.title,
  scheduled_at: post.scheduled_at,
  format: post.format,
  pillar: post.pillar || null,
  copy: post.copy || null,
  caption: post.caption || null,
  in_drive: post.in_drive ?? false,
  references_text: post.references_text || null,
  created_by: owner.user_id,
  assigned_to: designer.user_id,
  status: "draft",
  published: false,
}));

const { data: inserted, error: insertError } = await admin.from("posts").insert(rows).select("id, title, scheduled_at");

if (insertError) {
  console.error("Error insertando posts:", insertError.message);
  process.exit(1);
}

const taskRows = (inserted || []).map((post) => ({
  organization_id: org.id,
  title: post.title,
  description: "Post creado en la grilla",
  assigned_to: designer.user_id,
  created_by: owner.user_id,
  post_id: post.id,
  due_at: post.scheduled_at,
  status: "contenido",
}));

if (taskRows.length > 0) {
  const { error: taskError } = await admin.from("tasks").insert(taskRows);
  if (taskError) {
    console.error("Posts creados, pero error en tareas:", taskError.message);
    process.exit(1);
  }
}

console.log(`Importados ${inserted.length} posts de julio 2026:`);
for (const post of inserted) {
  console.log(`  - ${post.scheduled_at?.slice(0, 10)} | ${post.title}`);
}
