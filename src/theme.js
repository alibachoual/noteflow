// ─── Système de thème NoteFlow ────────────────────────────────────────────────
// Deux jeux de tokens : light et dark
// Injecté via des CSS custom properties sur :root

export const THEMES = {
  light: {
    "--nf-bg-primary":    "#ffffff",
    "--nf-bg-secondary":  "#f7f7f5",
    "--nf-bg-tertiary":   "#f0efec",
    "--nf-text-primary":  "#111110",
    "--nf-text-secondary":"#6f6e69",
    "--nf-text-tertiary": "#a8a69f",
    "--nf-border":        "rgba(0,0,0,0.08)",
    "--nf-border-hover":  "rgba(0,0,0,0.16)",
    "--nf-accent":        "#534AB7",
    "--nf-accent-hover":  "#3C3489",
    "--nf-accent-subtle": "#EEEDFE",
    // Tags et badges — mode light
    "--nf-purple-bg": "#EEEDFE", "--nf-purple-text": "#534AB7",
    "--nf-teal-bg":   "#E1F5EE", "--nf-teal-text":   "#0F6E56",
    "--nf-blue-bg":   "#E6F1FB", "--nf-blue-text":   "#185FA5",
    "--nf-amber-bg":  "#FAEEDA", "--nf-amber-text":  "#854F0B",
    "--nf-red-bg":    "#FCEBEB", "--nf-red-text":    "#A32D2D",
    "--nf-red-border":"#F09595", "--nf-red-dark":    "#791F1F",
    "--nf-green-bg":  "#EAF3DE", "--nf-green-text":  "#3B6D11",
  },
  dark: {
    "--nf-bg-primary":    "#1c1c1e",
    "--nf-bg-secondary":  "#141414",
    "--nf-bg-tertiary":   "#0e0e0f",
    "--nf-text-primary":  "#ededec",
    "--nf-text-secondary":"#9b9a96",
    "--nf-text-tertiary": "#616060",
    "--nf-border":        "rgba(255,255,255,0.08)",
    "--nf-border-hover":  "rgba(255,255,255,0.15)",
    "--nf-accent":        "#7F77DD",
    "--nf-accent-hover":  "#AFA9EC",
    "--nf-accent-subtle": "#26215C",
    // Tags et badges — mode dark (fonds sombres, textes clairs)
    "--nf-purple-bg": "#26215C", "--nf-purple-text": "#AFA9EC",
    "--nf-teal-bg":   "#04342C", "--nf-teal-text":   "#5DCAA5",
    "--nf-blue-bg":   "#042C53", "--nf-blue-text":   "#85B7EB",
    "--nf-amber-bg":  "#412402", "--nf-amber-text":  "#FAC775",
    "--nf-red-bg":    "#501313", "--nf-red-text":    "#F09595",
    "--nf-red-border":"#791F1F", "--nf-red-dark":    "#F7C1C1",
    "--nf-green-bg":  "#173404", "--nf-green-text":  "#C0DD97",
  },
};

export function applyTheme(mode) {
  const vars = THEMES[mode];
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.setAttribute("data-theme", mode);
  localStorage.setItem("nf-theme", mode);
}

export function getInitialTheme() {
  const saved = localStorage.getItem("nf-theme");
  if (saved) return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
