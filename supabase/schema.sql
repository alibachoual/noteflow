-- ─────────────────────────────────────────────────────────────────────────────
-- NoteFlow — Schéma Supabase
-- À exécuter dans l'éditeur SQL de ton projet Supabase
-- ─────────────────────────────────────────────────────────────────────────────


-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";


-- ─── Table : notes ───────────────────────────────────────────────────────────
create table public.notes (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,

  -- Contenu
  raw          text not null,                        -- saisie brute de l'utilisateur
  title        text not null,                        -- titre généré par l'IA
  body         text not null,                        -- note reformulée par l'IA

  -- Classification IA
  category     text not null check (category in ('mission', 'client', 'reunion', 'idee')),
  priority     text not null check (priority in ('haute', 'moyenne', 'basse')),

  -- Échéance
  due_date     date,                                 -- null = pas d'échéance
  due_label    text,                                 -- ex : "Demain", "12 juin"
  due_urgent   boolean not null default false,

  -- Actions suggérées par l'IA (tableau de strings)
  actions      text[] not null default '{}',

  -- État
  done         boolean not null default false,
  done_at      timestamptz,

  -- Timestamps
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Index pour les requêtes fréquentes
create index notes_user_id_idx       on public.notes(user_id);
create index notes_category_idx      on public.notes(user_id, category);
create index notes_priority_idx      on public.notes(user_id, priority);
create index notes_due_date_idx      on public.notes(user_id, due_date) where due_date is not null;
create index notes_done_idx          on public.notes(user_id, done);

-- Mise à jour automatique de updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger notes_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();


-- ─── Table : reminders ───────────────────────────────────────────────────────
-- Relances planifiées pour chaque note avec échéance
create table public.reminders (
  id           uuid primary key default uuid_generate_v4(),
  note_id      uuid not null references public.notes(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,

  remind_at    timestamptz not null,                 -- quand déclencher la relance
  offset_days  int not null default 1,               -- J-N avant l'échéance
  sent         boolean not null default false,
  sent_at      timestamptz,

  created_at   timestamptz not null default now()
);

create index reminders_note_id_idx   on public.reminders(note_id);
create index reminders_user_id_idx   on public.reminders(user_id);
create index reminders_pending_idx   on public.reminders(remind_at) where sent = false;


-- ─── Table : digests ─────────────────────────────────────────────────────────
-- Récaps quotidiens générés et mis en cache
create table public.digests (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,

  digest_date  date not null,                        -- date du récap (une seule par jour)
  summary      text not null,                        -- texte généré par l'IA
  top_actions  text[] not null default '{}',         -- les 3 actions prioritaires du jour
  stats        jsonb not null default '{}',          -- { total, urgentes, done, new_today }

  created_at   timestamptz not null default now(),

  unique(user_id, digest_date)
);

create index digests_user_date_idx   on public.digests(user_id, digest_date desc);


-- ─── Table : profiles ────────────────────────────────────────────────────────
-- Données complémentaires de l'utilisateur (nom, langue, avatar)
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  first_name  text,
  last_name   text,
  language    text not null default 'fr' check (language in ('fr', 'en')),
  avatar_url  text,
  updated_at  timestamptz not null default now()
);

create index profiles_id_idx on public.profiles(id);

-- Crée automatiquement une ligne profil à l'inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security (RLS)
-- Chaque utilisateur ne voit que ses propres données
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.notes     enable row level security;
alter table public.reminders enable row level security;
alter table public.digests   enable row level security;
alter table public.profiles  enable row level security;

-- Profiles
create policy "profiles: lecture propriétaire"
  on public.profiles for select using (auth.uid() = id);
create policy "profiles: insertion propriétaire"
  on public.profiles for insert with check (auth.uid() = id);
create policy "profiles: modification propriétaire"
  on public.profiles for update using (auth.uid() = id);

-- Notes
create policy "notes: lecture propriétaire"
  on public.notes for select
  using (auth.uid() = user_id);

create policy "notes: insertion propriétaire"
  on public.notes for insert
  with check (auth.uid() = user_id);

create policy "notes: modification propriétaire"
  on public.notes for update
  using (auth.uid() = user_id);

create policy "notes: suppression propriétaire"
  on public.notes for delete
  using (auth.uid() = user_id);

-- Reminders
create policy "reminders: lecture propriétaire"
  on public.reminders for select
  using (auth.uid() = user_id);

create policy "reminders: insertion propriétaire"
  on public.reminders for insert
  with check (auth.uid() = user_id);

create policy "reminders: modification propriétaire"
  on public.reminders for update
  using (auth.uid() = user_id);

create policy "reminders: suppression propriétaire"
  on public.reminders for delete
  using (auth.uid() = user_id);

-- Digests
create policy "digests: lecture propriétaire"
  on public.digests for select
  using (auth.uid() = user_id);

create policy "digests: insertion propriétaire"
  on public.digests for insert
  with check (auth.uid() = user_id);

create policy "digests: modification propriétaire"
  on public.digests for update
  using (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- Vues utilitaires
-- ─────────────────────────────────────────────────────────────────────────────

-- Notes urgentes de l'utilisateur connecté (dues aujourd'hui ou demain, non faites)
create view public.urgent_notes as
  select * from public.notes
  where user_id = auth.uid()
    and done = false
    and due_date is not null
    and due_date <= current_date + interval '1 day'
  order by due_date asc, priority asc;

-- Notes du jour triées par priorité
create view public.today_notes as
  select * from public.notes
  where user_id = auth.uid()
    and done = false
  order by
    case priority when 'haute' then 0 when 'moyenne' then 1 else 2 end,
    due_date asc nulls last,
    created_at desc;
