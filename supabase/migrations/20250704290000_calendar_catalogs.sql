-- Calendar catalogs: subscribeable fértile/holiday collections per organization

create table public.calendar_catalogs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  category text not null default 'general',
  color text not null default '#6366f1',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.calendar_catalog_events (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.calendar_catalogs(id) on delete cascade,
  month int not null check (month between 1 and 12),
  day int not null check (day between 1 and 31),
  name text not null,
  description text,
  unique (catalog_id, month, day, name)
);

create index idx_calendar_catalog_events_catalog on public.calendar_catalog_events(catalog_id);
create index idx_calendar_catalog_events_date on public.calendar_catalog_events(month, day);

create table public.organization_calendar_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  catalog_id uuid not null references public.calendar_catalogs(id) on delete cascade,
  subscribed_at timestamptz not null default now(),
  unique (organization_id, catalog_id)
);

create index idx_org_calendar_subs_org on public.organization_calendar_subscriptions(organization_id);

-- RLS
alter table public.calendar_catalogs enable row level security;
alter table public.calendar_catalog_events enable row level security;
alter table public.organization_calendar_subscriptions enable row level security;

create policy "Authenticated users can view calendar catalogs"
  on public.calendar_catalogs for select
  to authenticated
  using (true);

create policy "Authenticated users can view catalog events"
  on public.calendar_catalog_events for select
  to authenticated
  using (true);

create policy "Org members can view calendar subscriptions"
  on public.organization_calendar_subscriptions for select
  using (public.is_org_member(organization_id));

create policy "Internal members can manage calendar subscriptions"
  on public.organization_calendar_subscriptions for all
  using (public.is_internal_member(organization_id))
  with check (public.is_internal_member(organization_id));

-- Seed catalogs
insert into public.calendar_catalogs (slug, name, description, category, color, sort_order) values
  ('venezuela-general', 'Venezuela — Fértiles generales', 'Días del padre, madre, niño, navidad, feriados nacionales y celebraciones venezolanas.', 'general', '#dc2626', 1),
  ('comercial-ecommerce', 'Comercial & E-commerce', 'Black Friday, Cyber Monday, Singles Day, Hot Sale y fechas clave de ventas.', 'comercial', '#f59e0b', 2),
  ('petrolero-energia', 'Sector petrolero & energía', 'Día del petróleo, energía, minería y fechas del sector hidrocarburos.', 'industria', '#1e40af', 3),
  ('salud-bienestar', 'Salud & bienestar', 'Día mundial de la salud, enfermería, medicina, salud mental y bienestar.', 'industria', '#059669', 4),
  ('banca-finanzas', 'Banca & finanzas', 'Día del banquero, ahorro, seguros, inversiones y fechas del sector financiero.', 'industria', '#7c3aed', 5),
  ('ninos-educacion', 'Niños & educación', 'Día del niño, regreso a clases, docentes, lectura y fechas escolares.', 'industria', '#ec4899', 6),
  ('deportes-fifa', 'Deportes & FIFA', 'Copa América, Mundial, Olimpiadas, día del deportista y eventos deportivos.', 'deportes', '#16a34a', 7),
  ('gastronomia-bebidas', 'Gastronomía & bebidas', 'Día del barista, licor, chef, pizza, hamburguesa y fechas food & beverage.', 'profesiones', '#ea580c', 8),
  ('profesiones', 'Días profesionales', 'Arquitecto, ingeniero, abogado, contador, periodista y otras profesiones.', 'profesiones', '#64748b', 9),
  ('cultura-latam', 'Cultura LATAM', 'Independencias, carnavales, Halloween, Día de Muertos y tradiciones regionales.', 'cultural', '#0ea5e9', 10),
  ('tecnologia-digital', 'Tecnología & digital', 'Día de internet, programador, emprendimiento, innovación y tech.', 'industria', '#6366f1', 11),
  ('medio-ambiente', 'Medio ambiente & sostenibilidad', 'Día de la tierra, reciclaje, océanos, biodiversidad y causas verdes.', 'social', '#22c55e', 12);

-- Helper to insert events by catalog slug
create or replace function public._seed_catalog_events(
  p_slug text,
  p_events jsonb
) returns void as $$
declare
  v_catalog_id uuid;
  ev jsonb;
begin
  select id into v_catalog_id from public.calendar_catalogs where slug = p_slug;
  if v_catalog_id is null then return; end if;

  for ev in select * from jsonb_array_elements(p_events)
  loop
    insert into public.calendar_catalog_events (catalog_id, month, day, name, description)
    values (
      v_catalog_id,
      (ev->>'month')::int,
      (ev->>'day')::int,
      ev->>'name',
      ev->>'description'
    )
    on conflict (catalog_id, month, day, name) do nothing;
  end loop;
end;
$$ language plpgsql;

-- Venezuela general
select public._seed_catalog_events('venezuela-general', '[
  {"month":1,"day":1,"name":"Año Nuevo"},
  {"month":1,"day":6,"name":"Día de Reyes"},
  {"month":2,"day":12,"name":"Día de la Juventud"},
  {"month":3,"day":19,"name":"Día de San José"},
  {"month":4,"day":19,"name":"Declaración de Independencia"},
  {"month":5,"day":1,"name":"Día del Trabajador"},
  {"month":5,"day":3,"name":"Día de la Cruz"},
  {"month":5,"day":10,"name":"Día de la Madre"},
  {"month":6,"day":21,"name":"Día del Padre"},
  {"month":6,"day":24,"name":"Batalla de Carabobo"},
  {"month":7,"day":5,"name":"Día de la Independencia"},
  {"month":7,"day":24,"name":"Natalicio de Bolívar"},
  {"month":8,"day":15,"name":"Asunción de la Virgen"},
  {"month":10,"day":12,"name":"Día de la Resistencia Indígena"},
  {"month":11,"day":1,"name":"Día de Todos los Santos"},
  {"month":12,"day":8,"name":"Inmaculada Concepción"},
  {"month":12,"day":24,"name":"Nochebuena"},
  {"month":12,"day":25,"name":"Navidad"},
  {"month":12,"day":31,"name":"Fin de Año"}
]'::jsonb);

-- Comercial
select public._seed_catalog_events('comercial-ecommerce', '[
  {"month":2,"day":14,"name":"San Valentín"},
  {"month":3,"day":8,"name":"Día de la Mujer"},
  {"month":5,"day":10,"name":"Día de la Madre (comercial)"},
  {"month":6,"day":21,"name":"Día del Padre (comercial)"},
  {"month":7,"day":15,"name":"Hot Sale"},
  {"month":8,"day":15,"name":"Regreso a Clases"},
  {"month":11,"day":11,"name":"Singles Day / 11.11"},
  {"month":11,"day":28,"name":"Black Friday"},
  {"month":11,"day":29,"name":"Small Business Saturday"},
  {"month":11,"day":30,"name":"Cyber Monday"},
  {"month":12,"day":12,"name":"Día del Envío Gratis"},
  {"month":12,"day":25,"name":"Navidad (comercial)"}
]'::jsonb);

-- Petrolero
select public._seed_catalog_events('petrolero-energia', '[
  {"month":1,"day":10,"name":"Día Mundial de la Energía"},
  {"month":3,"day":18,"name":"Día Nacional del Petróleo (VE)"},
  {"month":4,"day":22,"name":"Día de la Tierra (energía)"},
  {"month":5,"day":28,"name":"Día de la Seguridad Industrial"},
  {"month":6,"day":5,"name":"Día Mundial del Medio Ambiente (energía)"},
  {"month":8,"day":10,"name":"Día del Ingeniero Petrolero"},
  {"month":9,"day":10,"name":"Día Mundial de Prevención de Riesgos"},
  {"month":10,"day":13,"name":"Día Internacional para la Reducción de Desastres"},
  {"month":11,"day":14,"name":"Día Mundial de la Diabetes (salud ocupacional)"},
  {"month":12,"day":14,"name":"Día del Geólogo"}
]'::jsonb);

-- Salud
select public._seed_catalog_events('salud-bienestar', '[
  {"month":1,"day":4,"name":"Día Mundial del Braille"},
  {"month":2,"day":4,"name":"Día Mundial contra el Cáncer"},
  {"month":3,"day":8,"name":"Día Internacional de la Mujer (salud)"},
  {"month":4,"day":7,"name":"Día Mundial de la Salud"},
  {"month":5,"day":12,"name":"Día Internacional de la Enfermería"},
  {"month":6,"day":14,"name":"Día Mundial del Donante de Sangre"},
  {"month":7,"day":28,"name":"Día Mundial contra la Hepatitis"},
  {"month":9,"day":10,"name":"Día Mundial de Prevención del Suicidio"},
  {"month":10,"day":10,"name":"Día Mundial de la Salud Mental"},
  {"month":10,"day":12,"name":"Día Mundial de la Artritis"},
  {"month":11,"day":14,"name":"Día Mundial de la Diabetes"},
  {"month":12,"day":1,"name":"Día Mundial del SIDA"}
]'::jsonb);

-- Banca
select public._seed_catalog_events('banca-finanzas', '[
  {"month":1,"day":31,"name":"Día del Ahorro"},
  {"month":3,"day":8,"name":"Día Internacional de la Mujer (finanzas)"},
  {"month":4,"day":17,"name":"Día Mundial del Emprendimiento"},
  {"month":5,"day":15,"name":"Día Internacional de la Familia (finanzas)"},
  {"month":6,"day":26,"name":"Día Internacional contra el Uso Indebido de Drogas"},
  {"month":7,"day":1,"name":"Día del Banquero (LATAM)"},
  {"month":8,"day":12,"name":"Día Internacional de la Juventud (finanzas)"},
  {"month":9,"day":8,"name":"Día Mundial de la Alfabetización Financiera"},
  {"month":10,"day":31,"name":"Día Mundial del Ahorro"},
  {"month":11,"day":21,"name":"Día Mundial del Crédito"},
  {"month":12,"day":10,"name":"Día de los Derechos Humanos (inclusión financiera)"}
]'::jsonb);

-- Niños & educación
select public._seed_catalog_events('ninos-educacion', '[
  {"month":1,"day":24,"name":"Día Internacional de la Educación"},
  {"month":2,"day":21,"name":"Día Internacional de la Lengua Materna"},
  {"month":4,"day":1,"name":"Día del Niño (LATAM)"},
  {"month":4,"day":23,"name":"Día del Libro"},
  {"month":5,"day":15,"name":"Día del Maestro (varios países)"},
  {"month":6,"day":1,"name":"Día Internacional de la Protección de la Infancia"},
  {"month":8,"day":15,"name":"Regreso a Clases"},
  {"month":9,"day":8,"name":"Día Internacional de la Alfabetización"},
  {"month":10,"day":5,"name":"Día Mundial de los Docentes"},
  {"month":11,"day":20,"name":"Día Universal del Niño"},
  {"month":12,"day":10,"name":"Día de los Derechos Humanos (niños)"}
]'::jsonb);

-- Deportes
select public._seed_catalog_events('deportes-fifa', '[
  {"month":1,"day":1,"name":"Copa América / eventos FIFA (temporada)"},
  {"month":4,"day":6,"name":"Día Internacional del Deporte"},
  {"month":6,"day":23,"name":"Día Olímpico"},
  {"month":7,"day":13,"name":"Final Copa América (aprox.)"},
  {"month":8,"day":8,"name":"Día Internacional de la Mujer en el Deporte"},
  {"month":9,"day":27,"name":"Día Mundial del Turismo (deportes)"},
  {"month":10,"day":16,"name":"Día Mundial del Alimentos (deportes/nutrición)"},
  {"month":11,"day":21,"name":"Inicio temporada futbol (aprox.)"},
  {"month":12,"day":10,"name":"Día de los Derechos Humanos (deporte inclusivo)"}
]'::jsonb);

-- Gastronomía
select public._seed_catalog_events('gastronomia-bebidas', '[
  {"month":1,"day":24,"name":"Día Internacional de la Educación Culinaria"},
  {"month":2,"day":18,"name":"Día Nacional del Drink"},
  {"month":3,"day":25,"name":"Día Internacional del Waffle"},
  {"month":4,"day":7,"name":"Día Mundial de la Salud (nutrición)"},
  {"month":5,"day":16,"name":"Día Internacional de la Hummus"},
  {"month":5,"day":28,"name":"Día Internacional del Hamburger"},
  {"month":6,"day":1,"name":"Día Mundial de la Leche"},
  {"month":7,"day":21,"name":"Día del Cóctel"},
  {"month":8,"day":24,"name":"Día Nacional del Barista"},
  {"month":9,"day":29,"name":"Día Internacional del Café"},
  {"month":10,"day":1,"name":"Día Internacional del Café (alterno)"},
  {"month":11,"day":12,"name":"Día Nacional del Licor (US)"},
  {"month":12,"day":4,"name":"Día Nacional del Cookie"}
]'::jsonb);

-- Profesiones
select public._seed_catalog_events('profesiones', '[
  {"month":1,"day":31,"name":"Día del Arquitecto"},
  {"month":2,"day":13,"name":"Día Mundial de la Radio"},
  {"month":3,"day":8,"name":"Día Internacional de la Mujer (profesiones)"},
  {"month":4,"day":28,"name":"Día Mundial de la Seguridad y Salud en el Trabajo"},
  {"month":5,"day":1,"name":"Día del Trabajador"},
  {"month":6,"day":1,"name":"Día de la Marina Mercante"},
  {"month":7,"day":1,"name":"Día del Ingeniero"},
  {"month":7,"day":25,"name":"Día del Chofer"},
  {"month":8,"day":12,"name":"Día Internacional de la Juventud"},
  {"month":9,"day":25,"name":"Día del Periodista"},
  {"month":10,"day":12,"name":"Día del Contador"},
  {"month":11,"day":3,"name":"Día del Arquitecto (alterno)"},
  {"month":12,"day":9,"name":"Día Internacional contra la Corrupción (legal)"}
]'::jsonb);

-- Cultura LATAM
select public._seed_catalog_events('cultura-latam', '[
  {"month":2,"day":2,"name":"Día de la Candelaria"},
  {"month":2,"day":14,"name":"San Valentín"},
  {"month":3,"day":20,"name":"Inicio de Primavera"},
  {"month":4,"day":1,"name":"Día de los Inocentes (aprox.)"},
  {"month":5,"day":5,"name":"Cinco de Mayo"},
  {"month":6,"day":21,"name":"Inicio de Verano"},
  {"month":7,"day":4,"name":"Independencia USA"},
  {"month":9,"day":15,"name":"Independencias Centroamérica"},
  {"month":9,"day":16,"name":"Grito de Dolores (México)"},
  {"month":10,"day":12,"name":"Día de la Raza / Resistencia Indígena"},
  {"month":10,"day":31,"name":"Halloween"},
  {"month":11,"day":1,"name":"Día de Todos los Santos"},
  {"month":11,"day":2,"name":"Día de Muertos"}
]'::jsonb);

-- Tecnología
select public._seed_catalog_events('tecnologia-digital', '[
  {"month":2,"day":11,"name":"Día Internacional de la Mujer y la Niña en la Ciencia"},
  {"month":3,"day":12,"name":"Día Mundial de la Internet"},
  {"month":4,"day":4,"name":"Día Internacional de la Información"},
  {"month":5,"day":17,"name":"Día Mundial de las Telecomunicaciones"},
  {"month":6,"day":28,"name":"Día Internacional del Orgullo LGBTQ+ (tech diversity)"},
  {"month":8,"day":12,"name":"Día Internacional de la Juventud (tech)"},
  {"month":9,"day":13,"name":"Día del Programador"},
  {"month":10,"day":29,"name":"Día Mundial de la Internet (alterno)"},
  {"month":11,"day":30,"name":"Día de la Seguridad Informática"},
  {"month":12,"day":3,"name":"Día Internacional de las Personas con Discapacidad (accesibilidad)"}
]'::jsonb);

-- Medio ambiente
select public._seed_catalog_events('medio-ambiente', '[
  {"month":2,"day":2,"name":"Día Mundial de los Humedales"},
  {"month":3,"day":21,"name":"Día Internacional de los Bosques"},
  {"month":3,"day":22,"name":"Día Mundial del Agua"},
  {"month":4,"day":22,"name":"Día de la Tierra"},
  {"month":5,"day":22,"name":"Día Internacional de la Biodiversidad"},
  {"month":6,"day":5,"name":"Día Mundial del Medio Ambiente"},
  {"month":6,"day":8,"name":"Día Mundial de los Océanos"},
  {"month":9,"day":16,"name":"Día de la Capa de Ozono"},
  {"month":10,"day":16,"name":"Día Mundial de la Alimentación"},
  {"month":11,"day":6,"name":"Día Internacional para la Prevención de la Explotación del Medio Ambiente"},
  {"month":12,"day":11,"name":"Día Internacional de las Montañas"}
]'::jsonb);

drop function public._seed_catalog_events(text, jsonb);

-- Auto-subscribe new orgs to Venezuela general (default calendar everyone needs)
create or replace function public.subscribe_org_default_calendars()
returns trigger as $$
declare
  v_catalog_id uuid;
begin
  select id into v_catalog_id
  from public.calendar_catalogs
  where slug = 'venezuela-general'
  limit 1;

  if v_catalog_id is not null then
    insert into public.organization_calendar_subscriptions (organization_id, catalog_id)
    values (new.id, v_catalog_id)
    on conflict do nothing;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = '';

create trigger on_org_created_subscribe_default_calendar
  after insert on public.organizations
  for each row execute function public.subscribe_org_default_calendars();

-- Backfill existing orgs with default subscription
insert into public.organization_calendar_subscriptions (organization_id, catalog_id)
select o.id, c.id
from public.organizations o
cross join public.calendar_catalogs c
where c.slug = 'venezuela-general'
on conflict do nothing;
