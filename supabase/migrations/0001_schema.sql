-- POLÍCIA BRASIL — esquema do banco (Supabase / PostgreSQL)
-- Execute no SQL Editor do Supabase ou com `supabase db push`.

create extension if not exists pgcrypto;

-- ============ CONFIGURAÇÕES E ACESSO ============
create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into app_settings (key, value) values ('allow_signups', 'false'::jsonb)
  on conflict (key) do nothing;

-- E-mails autorizados pelo administrador (valem mesmo com cadastros bloqueados)
create table if not exists allowed_emails (
  email text primary key,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'user' check (role in ('admin','user')),
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and approved);
$$;

create or replace function is_approved() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and approved);
$$;

-- Bloqueia cadastros de quem não foi autorizado quando allow_signups = false
create or replace function guard_signup() returns trigger
language plpgsql security definer set search_path = public as $$
declare open_signups boolean; total int;
begin
  select coalesce((value)::text::boolean, false) into open_signups from app_settings where key = 'allow_signups';
  select count(*) into total from profiles;
  if total = 0 then return new; end if; -- o primeiro usuário vira administrador
  if not open_signups and not exists (select 1 from allowed_emails where lower(email) = lower(new.email)) then
    raise exception 'Cadastro não autorizado. Peça acesso ao administrador.';
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_signup on auth.users;
create trigger trg_guard_signup before insert on auth.users
  for each row execute function guard_signup();

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare total int;
begin
  select count(*) into total from profiles;
  insert into profiles (id, email, full_name, role, approved)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name',
          case when total = 0 then 'admin' else 'user' end, true);
  return new;
end $$;

drop trigger if exists trg_new_user on auth.users;
create trigger trg_new_user after insert on auth.users
  for each row execute function handle_new_user();

-- ============ INSTITUIÇÕES E SALÁRIOS ============
create table if not exists institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  acronym text,
  kind text not null,  -- PF, PRF, PM, PC, PP, CIENTIFICA, GM, LEGISLATIVA, OUTRA
  sphere text not null check (sphere in ('federal','estadual','distrital','municipal')),
  state char(2),
  official_site text,
  created_at timestamptz not null default now(),
  unique nulls not distinct (name, state)
);

create table if not exists salary_records (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references institutions(id) on delete cascade,
  role_title text not null,
  rank_class text,
  salary_initial numeric(12,2),
  salary_final numeric(12,2),
  bonuses text,
  benefits text,
  education text,
  workload text,
  status text not null default 'nao_confirmado'
    check (status in ('confirmado','em_verificacao','desatualizado','nao_confirmado')),
  reference_date date,
  source_name text,
  source_url text,
  source_checked_at timestamptz,
  source_ok boolean,
  notes text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
create index if not exists idx_salary_inst on salary_records(institution_id);

-- Evolução ao longo dos anos (gráfico 2)
create table if not exists salary_history (
  id uuid primary key default gen_random_uuid(),
  salary_record_id uuid not null references salary_records(id) on delete cascade,
  year int not null,
  salary_initial numeric(12,2),
  salary_final numeric(12,2),
  source_url text,
  unique (salary_record_id, year)
);

-- Progressão de carreira (calculadora)
create table if not exists career_steps (
  id uuid primary key default gen_random_uuid(),
  salary_record_id uuid not null references salary_records(id) on delete cascade,
  step_order int not null,
  step_label text not null,
  amount numeric(12,2) not null,
  source_url text
);

-- ============ CONCURSOS E NOTÍCIAS ============
create table if not exists contests (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references institutions(id) on delete set null,
  title text not null,
  status text not null check (status in ('autorizado','previsto','edital_publicado','inscricoes_abertas','em_andamento','encerrado')),
  vacancies int,
  organizer text,
  state char(2),
  notes text,
  source_url text,
  reference_date date,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  category text not null default 'geral',
  institution_name text,
  state char(2),
  published_at timestamptz not null default now(),
  source_name text,
  url text not null unique,
  priority int not null default 7,   -- 1 = PRF ... 7 = demais
  important boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_news_pub on news(priority, published_at desc);

-- ============ ESTUDOS ============
create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  sort_order int not null default 0
);

create table if not exists study_items (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  kind text not null check (kind in ('aula','resumo','apostila','mapa_mental')),
  topic text not null,
  title text not null,
  body text,
  url text,
  created_at timestamptz not null default now()
);

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  topic text,
  style text not null default 'multipla_escolha' check (style in ('multipla_escolha','cebraspe')),
  difficulty text not null default 'medio' check (difficulty in ('facil','medio','dificil')),
  statement text not null,
  options jsonb not null,           -- múltipla escolha: ["A","B",...]; CEBRASPE: ["Certo","Errado"]
  correct_index int not null,
  explanation text,
  source text,
  created_at timestamptz not null default now()
);

create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  question_id uuid not null references questions(id) on delete cascade,
  chosen_index int not null,
  correct boolean not null,
  answered_at timestamptz not null default now()
);
create index if not exists idx_attempts_user on attempts(user_id, answered_at);

-- ============ FAVORITOS, LOGS ============
create table if not exists favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  kind text not null check (kind in ('institution','contest','news','subject','question')),
  ref_id text not null,
  label text,
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref_id)
);

create table if not exists audit_log (
  id bigint generated always as identity primary key,
  actor uuid,
  action text not null,
  table_name text not null,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create table if not exists sync_logs (
  id bigint generated always as identity primary key,
  job text not null,
  status text not null check (status in ('ok','erro','parcial')),
  items int not null default 0,
  message text,
  ran_at timestamptz not null default now()
);

create or replace function audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log (actor, action, table_name, record_id, old_data, new_data)
  values (auth.uid(), tg_op, tg_table_name,
          coalesce((case when tg_op = 'DELETE' then old.id else new.id end)::text, ''),
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

do $$ declare t text; begin
  foreach t in array array['institutions','salary_records','career_steps','contests','news','questions','study_items'] loop
    execute format('drop trigger if exists trg_audit on %I', t);
    execute format('create trigger trg_audit after insert or update or delete on %I for each row execute function audit_row()', t);
  end loop;
end $$;

create or replace function touch_salary() returns trigger language plpgsql as $$
begin new.updated_at = now(); new.updated_by = auth.uid(); return new; end $$;
drop trigger if exists trg_touch_salary on salary_records;
create trigger trg_touch_salary before update on salary_records
  for each row execute function touch_salary();

-- ============ SEGURANÇA (RLS) ============
alter table app_settings enable row level security;
alter table allowed_emails enable row level security;
alter table profiles enable row level security;
alter table institutions enable row level security;
alter table salary_records enable row level security;
alter table salary_history enable row level security;
alter table career_steps enable row level security;
alter table contests enable row level security;
alter table news enable row level security;
alter table subjects enable row level security;
alter table study_items enable row level security;
alter table questions enable row level security;
alter table attempts enable row level security;
alter table favorites enable row level security;
alter table audit_log enable row level security;
alter table sync_logs enable row level security;

-- Leitura para usuários aprovados; escrita só para administradores
do $$ declare t text; begin
  foreach t in array array['institutions','salary_records','salary_history','career_steps','contests','news','subjects','study_items','questions'] loop
    execute format('drop policy if exists read_approved on %I', t);
    execute format('create policy read_approved on %I for select using (is_approved())', t);
    execute format('drop policy if exists admin_write on %I', t);
    execute format('create policy admin_write on %I for all using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

create policy app_settings_read on app_settings for select using (is_approved());
create policy app_settings_admin on app_settings for all using (is_admin()) with check (is_admin());
create policy allowed_admin on allowed_emails for all using (is_admin()) with check (is_admin());
create policy profiles_self on profiles for select using (id = auth.uid() or is_admin());
create policy profiles_admin_update on profiles for update using (is_admin()) with check (is_admin());
create policy attempts_own on attempts for all using (user_id = auth.uid() and is_approved()) with check (user_id = auth.uid());
create policy favorites_own on favorites for all using (user_id = auth.uid() and is_approved()) with check (user_id = auth.uid());
create policy audit_admin on audit_log for select using (is_admin());
create policy sync_admin on sync_logs for select using (is_admin());

alter publication supabase_realtime add table news;
