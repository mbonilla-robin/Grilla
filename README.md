# Grilla

Organizador creativo para equipos de social media. Unifica la grilla editorial, briefs de diseño con IA, brand kits y preview del feed en un solo lugar.

## Stack

- **Next.js 15** — App Router, TypeScript
- **Supabase** — Auth, Postgres, Storage, RLS
- **Tailwind CSS 4** — UI minimalista estilo Linear/Notion
- **Lucide** — Iconos SVG

## Setup

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar Supabase

Grilla usa su **propio proyecto de Supabase**, separado de Robin u otras apps.

1. Crea un proyecto dedicado en [supabase.com](https://supabase.com) (nombre sugerido: `Grilla`)
2. Copia las credenciales de **ese** proyecto:

```bash
cp .env.local.example .env.local
```

3. Aplica la migración en el SQL Editor del proyecto Grilla (o con CLI):

```bash
# Con Supabase CLI
supabase link --project-ref tu-project-ref-de-grilla
supabase db push
```

El archivo de migración está en `supabase/migrations/20250704120000_initial_schema.sql`.

### 3. Correr en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Flujo

1. **Registro** → Crear cuenta
2. **Onboarding** → Crear organización (cuenta/empresa)
3. **Grilla** → Agregar posts con copy y referencias
4. **Brief IA** → Generar brief de diseño por post
5. **Brand Kit** → Configurar colores, tipografías, tono
6. **Feed Preview** → Ver cómo se verá el Instagram
7. **Equipo** → Invitar creadora, diseñador, cliente

## Roles

| Rol | Acceso |
|-----|--------|
| Admin | Todo + invitar miembros |
| Creadora | Grilla, briefs |
| Diseñador | Grilla, briefs, brand kit, assets |
| Cliente | Solo feed preview y posts aprobados |

## Estructura

```
src/
├── app/
│   ├── (auth)/          # Login, registro
│   ├── (app)/           # Dashboard, org pages
│   └── api/brief/       # Generación de briefs IA
├── components/
│   ├── ui/              # Button, Input, Badge
│   ├── layout/          # Sidebar, Logo
│   ├── grilla/          # Tabla, posts, briefs
│   ├── feed/            # Preview Instagram
│   ├── brand-kit/       # Editor de marca
│   └── team/            # Invitaciones
└── lib/
    ├── supabase/        # Client, server, middleware
    ├── actions.ts       # Server actions
    └── types.ts         # Tipos TypeScript
```

## Próximos pasos

- [ ] Upload de assets (diseños finales) a Supabase Storage
- [ ] Envío de invitaciones por email (Resend / Supabase Edge Function)
- [ ] Página de aceptar invitación
- [ ] App móvil (React Native / Expo)
- [ ] Integración Meta API para publicación automática
