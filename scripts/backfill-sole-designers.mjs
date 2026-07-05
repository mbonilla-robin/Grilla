/**
 * Asigna el diseñador único a posts sin diseñador y crea tareas faltantes.
 * Uso: node scripts/backfill-sole-designers.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

function loadEnv() {
  const env = {};
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i === -1) continue;
    env[line.slice(0, i)] = line.slice(i + 1);
  }
  return env;
}

function isDesigner(role, extra = []) {
  return role === "designer" || extra.includes("designer");
}

const env = loadEnv();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TARGET_ORGS = ["petroequip", "metalkor", "metalcore", "metal kor"];

const { data: orgs, error: orgError } = await admin
  .from("organizations")
  .select("id, name, slug");

if (orgError) {
  console.error(orgError.message);
  process.exit(1);
}

const targets = (orgs || []).filter((o) =>
  TARGET_ORGS.some((t) => o.name.toLowerCase().includes(t) || o.slug.toLowerCase().includes(t))
);

console.log("Marcas objetivo:", targets.map((o) => o.name).join(", ") || "(ninguna)");

for (const org of targets) {
  const { data: members, error: membersError } = await admin
    .from("organization_members")
    .select("user_id, role, extra_roles")
    .eq("organization_id", org.id);

  if (membersError) {
    console.error(`  Error miembros: ${membersError.message}`);
    continue;
  }

  console.log(
    "  Miembros:",
    (members || [])
      .map((m) => `${m.role}${m.extra_roles?.length ? `+${m.extra_roles.join("+")}` : ""}`)
      .join(", ")
  );

  const designers = (members || []).filter((m) =>
    isDesigner(m.role, m.extra_roles || [])
  );

  console.log(`\n${org.name}: ${designers.length} diseñador(es)`);

  if (designers.length !== 1) {
    console.log("  → Se omite (no hay un solo diseñador)");
    continue;
  }

  const designer = designers[0];
  const { data: profile } = await admin
    .from("profiles")
    .select("first_name, last_name, full_name")
    .eq("id", designer.user_id)
    .maybeSingle();

  const designerName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    profile?.full_name ||
    designer.user_id;

  const { data: unassigned, error: postsError } = await admin
    .from("posts")
    .select("id, title, assigned_to")
    .eq("organization_id", org.id)
    .is("assigned_to", null);

  if (postsError) {
    console.error("  Error posts:", postsError.message);
    continue;
  }

  console.log(`  → ${unassigned?.length || 0} posts sin diseñador`);

  if (!unassigned?.length) continue;

  const postIds = unassigned.map((p) => p.id);

  const { error: updateError } = await admin
    .from("posts")
    .update({ assigned_to: designer.user_id })
    .in("id", postIds);

  if (updateError) {
    console.error("  Error actualizando:", updateError.message);
    continue;
  }

  const { data: existingTasks } = await admin
    .from("tasks")
    .select("post_id")
    .in("post_id", postIds)
    .ilike("title", "Diseñar:%");

  const withTask = new Set((existingTasks || []).map((t) => t.post_id));
  const adminMember = (members || []).find((m) => m.role === "admin") || members?.[0];

  const newTasks = unassigned
    .filter((p) => !withTask.has(p.id))
    .map((p) => ({
      organization_id: org.id,
      title: `Diseñar: ${p.title}`,
      description: "Asignación automática — diseñador único en la marca",
      assigned_to: designer.user_id,
      created_by: adminMember?.user_id || designer.user_id,
      post_id: p.id,
      status: "pending",
    }));

  if (newTasks.length) {
    const { error: taskError } = await admin.from("tasks").insert(newTasks);
    if (taskError) console.error("  Error tareas:", taskError.message);
    else console.log(`  → ${newTasks.length} tareas de diseño creadas`);
  }

  console.log(`  ✓ Asignado a ${designerName}`);
}

console.log("\nListo.");
