// ─── Catégories fixes par espace (utilisées en mode mock) ─────────────────────
export const DEFAULT_CATEGORIES = {
  pro: {
    mission: { label:"Mission", icon:"ti-briefcase", color:"purple" },
    client:  { label:"Client",  icon:"ti-users",     color:"teal"   },
    reunion: { label:"Réunion", icon:"ti-video",      color:"blue"   },
    idee:    { label:"Idée",    icon:"ti-bulb",       color:"amber"  },
  },
  perso: {
    maison:  { label:"Maison",       icon:"ti-home",       color:"teal"   },
    finances:{ label:"Finances",     icon:"ti-coin",       color:"green"  },
    famille: { label:"Famille",      icon:"ti-heart",      color:"purple" },
    loisirs: { label:"Loisirs",      icon:"ti-confetti",   color:"amber"  },
  },
};

// Alias global utilisé partout dans l'appli (remplacé dynamiquement en mode Supabase)
export let CATEGORIES = { ...DEFAULT_CATEGORIES.pro };

export function setCategories(cats) {
  Object.keys(CATEGORIES).forEach(k => delete CATEGORIES[k]);
  Object.assign(CATEGORIES, cats);
}

export const PRIORITIES = {
  haute:   { label:"Haute",   icon:"ti-flame",      color:"red"   },
  moyenne: { label:"Moyenne", icon:"ti-minus",       color:"amber" },
  basse:   { label:"Basse",   icon:"ti-arrow-down",  color:"green" },
};

export const MOCK_NOTES = [
  {
    id:1, space:"pro",
    title:"Valider le planning de livraison avec le client",
    body:"Revoir les jalons Q3 et anticiper les risques de dérive avant la réunion de vendredi.",
    raw:"faut valider le planning de livraison avec le client avant vendredi",
    category:"client", priority:"haute",
    due:"2026-06-10", dueLabel:"Demain", dueUrgent:true,
    actions:["Envoyer un email à Lucas","Préparer le tableau des jalons Q3","Prévoir 30 min avant"],
    createdAt:"2026-06-09T09:14:00", done:false,
  },
  {
    id:2, space:"pro",
    title:"CR réunion backlog — sprint 12",
    body:"Décisions : sortir la feature notifications, prioriser le moteur de recherche.",
    raw:"réunion backlog sprint 12",
    category:"reunion", priority:"moyenne",
    due:"2026-06-12", dueLabel:"Dans 3 jours", dueUrgent:false,
    actions:["Partager le CR","Mettre à jour le backlog","Informer le client"],
    createdAt:"2026-06-09T11:30:00", done:false,
  },
  {
    id:3, space:"pro",
    title:"Idée : dashboard de suivi de vélocité",
    body:"Visualiser les sprints passés, comparer aux estimations, détecter les dettes récurrentes.",
    raw:"idée dashboard vélocité",
    category:"idee", priority:"basse",
    due:null, dueLabel:"Pas d'échéance", dueUrgent:false,
    actions:["Explorer les outils","Faire une démo React","Soumettre à l'équipe"],
    createdAt:"2026-06-08T16:45:00", done:false,
  },
  {
    id:4, space:"perso",
    title:"Renouveler le contrat d'assurance habitation",
    body:"Le contrat expire fin juillet. Comparer les offres et envoyer le courrier de résiliation.",
    raw:"renouveler assurance maison avant fin juillet",
    category:"maison", priority:"haute",
    due:"2026-06-20", dueLabel:"Dans 11 jours", dueUrgent:false,
    actions:["Comparer les offres en ligne","Demander un devis","Envoyer la résiliation en AR"],
    createdAt:"2026-06-08T09:00:00", done:false,
  },
  {
    id:5, space:"perso",
    title:"Organiser le week-end en famille à La Baule",
    body:"Réserver l'hébergement et prévoir les activités pour le week-end du 21 juin.",
    raw:"week-end la baule famille organiser",
    category:"famille", priority:"moyenne",
    due:"2026-06-14", dueLabel:"Dans 5 jours", dueUrgent:false,
    actions:["Réserver l'hôtel","Regarder les activités karting/char à voile","Prévenir tout le monde"],
    createdAt:"2026-06-07T18:00:00", done:false,
  },
];
