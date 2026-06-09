# NoteFlow

Application de prise de notes intelligente avec catégorisation et priorisation automatique par IA.

## Stack

- React 18 + Vite
- API Anthropic (claude-sonnet-4) pour l'analyse des notes
- Supabase (à venir) pour la persistance

## Lancer en local

```bash
npm install
npm run dev
```

## Fonctionnalités

- Saisie libre en langage naturel — l'IA corrige, catégorise et priorise
- Vues : toutes les notes, urgences du jour, récap quotidien
- Filtres par catégorie (Mission, Client, Réunion, Idée)
- Panneau de bord avec stats et prochaines échéances
- Actions suggérées automatiquement pour chaque note
