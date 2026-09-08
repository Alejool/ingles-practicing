-- Ruta B1 → B2 · esquema de la API (PostgreSQL / Neon)
-- Idempotente: se puede lanzar tantas veces como haga falta.

-- gen_random_uuid() es nativo desde PostgreSQL 13, así que no hace falta pgcrypto.

-- Cuentas. Sin contraseña: se entra por enlace mágico.
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text        not null unique,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz,
  blocked       boolean     not null default false,
  -- Permite subir la cuota a una persona concreta sin tocar el .env.
  daily_bonus   integer     not null default 0
);

-- Enlaces mágicos. Solo se guarda el hash del token.
create table if not exists login_tokens (
  id          bigserial primary key,
  email       text        not null,
  token_hash  text        not null unique,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  ip_hash     text,
  created_at  timestamptz not null default now()
);
-- A dónde devolver al usuario tras pulsar el enlace. Permite que en desarrollo
-- vuelva a :4321 (donde está el front) en vez de a APP_URL.
alter table login_tokens add column if not exists return_to text;

create index if not exists login_tokens_email_idx on login_tokens (email, created_at desc);
create index if not exists login_tokens_expires_idx on login_tokens (expires_at);

-- Sesiones. También solo el hash.
create table if not exists sessions (
  id            bigserial primary key,
  user_id       uuid        not null references users(id) on delete cascade,
  token_hash    text        not null unique,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz not null default now(),
  expires_at    timestamptz not null,
  user_agent    text
);
create index if not exists sessions_user_idx on sessions (user_id);
create index if not exists sessions_expires_idx on sessions (expires_at);

-- Una fila por llamada a la IA. Es la base de todas las cuotas y del control de gasto.
create table if not exists ai_usage (
  id                bigserial primary key,
  created_at        timestamptz not null default now(),
  day               date        not null default current_date,
  user_id           uuid        references users(id) on delete set null,
  device_id         text,
  ip_hash           text        not null,
  kind              text        not null,
  model             text        not null,
  prompt_tokens     integer     not null default 0,
  completion_tokens integer     not null default 0,
  -- Coste real de la llamada en millonésimas de dólar. Es la unidad de cuota:
  -- contar llamadas mentía, porque un writing largo cuesta diez veces un cloze.
  cost_micros       integer     not null default 0,
  ok                boolean     not null default true
);
-- Para bases creadas antes de que la cuota pasara a medirse por coste.
alter table ai_usage add column if not exists cost_micros integer not null default 0;
create index if not exists ai_usage_day_idx      on ai_usage (day);
create index if not exists ai_usage_user_day_idx on ai_usage (user_id, day);
create index if not exists ai_usage_user_idx     on ai_usage (user_id, created_at desc);
create index if not exists ai_usage_device_idx   on ai_usage (device_id) where device_id is not null;
create index if not exists ai_usage_ip_idx       on ai_usage (ip_hash, created_at desc);

-- Progreso sincronizado. Un JSON por persona, con versión para detectar conflictos.
create table if not exists progress (
  user_id    uuid        primary key references users(id) on delete cascade,
  data       jsonb       not null,
  version    integer     not null default 1,
  updated_at timestamptz not null default now()
);

-- Biblioteca compartida de lecturas generadas con IA.
--
-- Antes cada texto vivía solo en el localStorage de quien lo pidió: se pagaba
-- una generación por persona y el contenido no crecía para nadie más. Aquí se
-- guardan una vez y los ve todo el mundo, así el catálogo crece solo y el coste
-- se reparte. El texto en sí es `data`, con el mismo shape que las lecturas del
-- banco (title, body, qs), para que el cliente no tenga que distinguirlas.
create table if not exists shared_readings (
  id         text        primary key,
  created_at timestamptz not null default now(),
  track      text        not null,
  level      text        not null,
  topic      text        not null default '',
  title      text        not null,
  words      integer     not null default 0,
  data       jsonb       not null,
  -- Quién la generó: solo para poder retirar lo que suba alguien concreto.
  author_id  uuid        references users(id) on delete set null,
  -- Cuántas veces se ha abierto; ordena la biblioteca por lo que la gente lee.
  reads      integer     not null default 0,
  -- Retirada por el administrador: deja de servirse sin borrar el historial.
  hidden     boolean     not null default false
);
create index if not exists shared_readings_track_idx on shared_readings (track, hidden, created_at desc);
create index if not exists shared_readings_topic_idx on shared_readings (track, lower(topic));

-- Latido anónimo, para saber dónde abandona la gente.
--
-- No identifica a nadie: la clave es un hash del dispositivo con la misma
-- pimienta que las IP, y no se guarda ni correo ni user_id. Solo sirve para
-- responder a una pregunta: ¿en qué día del plan se cae la gente, y qué
-- módulos no abre nunca? Sin eso, mejorar la app es adivinar.
create table if not exists pulse (
  anon       text        not null,
  day        date        not null default current_date,
  track      text        not null,
  -- Día del plan en el que va, de 1 a 120.
  plan_day   integer     not null default 1,
  -- Días marcados como hechos y racha, para ver quién avanza y quién se estanca.
  done_days  integer     not null default 0,
  streak     integer     not null default 0,
  -- Módulos abiertos alguna vez, como lista corta de ids.
  seen       text        not null default '',
  updated_at timestamptz not null default now(),
  primary key (anon, day)
);
create index if not exists pulse_day_idx on pulse (day);
