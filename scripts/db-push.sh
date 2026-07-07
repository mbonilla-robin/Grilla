#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env.local ]; then
  # Leer sin expandir $ u otros caracteres especiales de la contraseña
  DATABASE_URL=$(grep -E '^DATABASE_URL=' .env.local | head -1 | cut -d= -f2-)
  export DATABASE_URL
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo ""
  echo "Falta DATABASE_URL en .env.local"
  echo ""
  echo "1. Abre: https://supabase.com/dashboard/project/yyttpdbuhrtnzbvlkvey/settings/database"
  echo "2. En Connect elige Session pooler (o Transaction pooler) — NO uses la conexión directa"
  echo "3. Copia la URI completa y pégala en .env.local:"
  echo "   DATABASE_URL=postgresql://postgres.yyttpdbuhrtnzbvlkvey:...@aws-0-....pooler.supabase.com:5432/postgres"
  echo ""
  echo "   Si tu contraseña tiene $, @, #, etc., codifícala ($ → %24, @ → %40)"
  echo ""
  exit 1
fi

echo "Aplicando migraciones pendientes..."
npx supabase db push --db-url "$DATABASE_URL" --include-all --yes

echo ""
echo "Listo. Migraciones aplicadas."
