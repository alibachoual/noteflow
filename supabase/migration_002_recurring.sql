-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 002 : tâches récurrentes
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.notes
  add column if not exists is_recurring  boolean   not null default false,
  add column if not exists recurrence    text      check (recurrence in ('daily','weekly','monthly','yearly')),
  add column if not exists recurrence_day int,      -- jour cible (ex: 1 = le 1er du mois)
  add column if not exists done_at       timestamptz,
  add column if not exists next_due      date;      -- début de la prochaine occurrence

-- Index pour récupérer les récurrentes efficacement
create index if not exists notes_recurring_idx
  on public.notes(user_id, is_recurring) where is_recurring = true;
