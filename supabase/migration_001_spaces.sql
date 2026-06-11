-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 001 : espaces PRO/PERSO + catégories personnalisées
-- À exécuter dans Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Ajouter la colonne "space" sur les notes existantes
alter table public.notes
  add column if not exists space text not null default 'pro'
    check (space in ('pro', 'perso'));

-- 2. Table des catégories personnalisées
create table if not exists public.categories (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  space      text not null check (space in ('pro', 'perso')),
  key        text not null,          -- identifiant technique ex: "client"
  label      text not null,          -- libellé affiché ex: "Client"
  icon       text not null default 'ti-tag',
  color      text not null default 'purple',
  position   int  not null default 0,
  created_at timestamptz not null default now(),
  unique(user_id, space, key)
);

create index if not exists categories_user_space_idx on public.categories(user_id, space);

-- RLS sur categories
alter table public.categories enable row level security;

drop policy if exists "categories: lecture propriétaire"    on public.categories;
drop policy if exists "categories: insertion propriétaire"  on public.categories;
drop policy if exists "categories: modification propriétaire" on public.categories;
drop policy if exists "categories: suppression propriétaire" on public.categories;

create policy "categories: lecture propriétaire"
  on public.categories for select using (auth.uid() = user_id);
create policy "categories: insertion propriétaire"
  on public.categories for insert with check (auth.uid() = user_id);
create policy "categories: modification propriétaire"
  on public.categories for update using (auth.uid() = user_id);
create policy "categories: suppression propriétaire"
  on public.categories for delete using (auth.uid() = user_id);

-- 3. Fonction update_note pour édition complète
create or replace function public.update_note(
  p_id       uuid,
  p_title    text,
  p_body     text,
  p_category text,
  p_priority text,
  p_due_date date,
  p_due_label text,
  p_due_urgent boolean,
  p_actions  text[]
) returns public.notes language plpgsql security definer as $$
begin
  update public.notes set
    title      = p_title,
    body       = p_body,
    category   = p_category,
    priority   = p_priority,
    due_date   = p_due_date,
    due_label  = p_due_label,
    due_urgent = p_due_urgent,
    actions    = p_actions,
    updated_at = now()
  where id = p_id and user_id = auth.uid();
  return (select * from public.notes where id = p_id);
end;
$$;

-- 4. Trigger : créer les catégories par défaut pour tout nouvel utilisateur
create or replace function public.handle_new_user_categories()
returns trigger language plpgsql security definer as $$
begin
  insert into public.categories (user_id, space, key, label, icon, color, position)
  values
    (new.id, 'pro',   'mission', 'Mission', 'ti-briefcase', 'purple', 0),
    (new.id, 'pro',   'client',  'Client',  'ti-users',     'teal',   1),
    (new.id, 'pro',   'reunion', 'Réunion', 'ti-video',     'blue',   2),
    (new.id, 'pro',   'idee',    'Idée',    'ti-bulb',      'amber',  3),
    (new.id, 'perso', 'perso',   'Personnel','ti-home',     'green',  0),
    (new.id, 'perso', 'loisir',  'Loisirs', 'ti-confetti',  'amber',  1),
    (new.id, 'perso', 'sante',   'Santé',   'ti-heart',     'red',    2)
  on conflict (user_id, space, key) do nothing;
  return new;
end;
$$;

-- Lier au trigger existant on_auth_user_created ou créer un second trigger
drop trigger if exists on_auth_user_created_categories on auth.users;
create trigger on_auth_user_created_categories
  after insert on auth.users
  for each row execute function public.handle_new_user_categories();

-- 5. Mettre à jour les notes existantes avec space = 'pro'
update public.notes set space = 'pro' where space is null or space = '';
