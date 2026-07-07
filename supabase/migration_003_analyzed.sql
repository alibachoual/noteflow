-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 003 : sauvegarde des notes sans analyse IA
-- ─────────────────────────────────────────────────────────────────────────────

-- Marque si la note a été traitée par l'IA (titre/corps/catégorie/priorité
-- générés) ou enregistrée telle quelle en attendant une analyse ultérieure.
alter table public.notes
  add column if not exists analyzed boolean not null default true;

-- La contrainte d'origine limitait "category" aux 4 catégories pro de départ,
-- ce qui est incompatible avec les catégories personnalisées (et les espaces
-- perso) déjà en place, et bloquerait aussi la sauvegarde sans analyse.
alter table public.notes drop constraint if exists notes_category_check;
