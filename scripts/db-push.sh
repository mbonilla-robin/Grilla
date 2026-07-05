#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env.local ]; then
  # shellcheck disable=SC2046
  export $(grep -E '^DATABASE_URL=' .env.local | xargs) || true
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo ""
  echo "Falta DATABASE_URL en .env.local"
  echo ""
  echo "1. Abre: https://supabase.com/dashboard/project/yyttpdbuhrtnzbvlkvey/settings/database"
  echo "2. En Connection string elige URI y copia la cadena completa"
  echo "3. Pégala en .env.local así:"
  echo "   DATABASE_URL=postgresql://postgres...."
  echo ""
  exit 1
fi

echo "Aplicando migraciones pendientes..."
npx supabase db push --db-url "$DATABASE_URL" --include-all --yes

echo ""
echo "Listo. Migraciones aplicadas."
