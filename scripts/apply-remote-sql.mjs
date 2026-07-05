#!/usr/bin/env node
/**
 * Aplica una migración SQL al proyecto remoto de Supabase vía Management API.
 * Requiere: SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens)
 *
 * Uso:
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/apply-remote-sql.mjs supabase/migrations/20250704230000_add_member_by_email.sql
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PROJECT_REF = "yyttpdbuhrtnzbvlkvey";
const file = process.argv[2];

if (!file) {
  console.error("Uso: node scripts/apply-remote-sql.mjs <ruta-sql>");
  process.exit(1);
}

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("Falta SUPABASE_ACCESS_TOKEN.");
  process.exit(1);
}

const sql = readFileSync(resolve(file), "utf8");

const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  }
);

const body = await res.text();
if (!res.ok) {
  console.error(`Error ${res.status}:`, body);
  process.exit(1);
}

console.log("Migración aplicada correctamente.");
if (body && body !== "[]") console.log(body);
