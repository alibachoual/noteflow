import { useState, useEffect, useRef } from "react";
import { MOCK_NOTES, CATEGORIES, PRIORITIES } from "./data/mockNotes";
import AuthScreen from "./components/AuthScreen";
import { fetchNotes, createNote, markNoteDone, onAuthChange, signOut } from "./lib/supabase";
import { applyTheme, getInitialTheme } from "./theme";

const USE_MOCK = false;

// ─── CSS global injecté une seule fois ───────────────────────────────────────
const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body, #root { height: 100%; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  button, input, textarea { font-family: inherit; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--nf-border); border-radius: 4px; }
  .nf-nav-btn {
    display: flex; align-items: center; gap: 8px; width: 100%;
    padding: 8px 14px; font-size: 13px; border: none; cursor: pointer;
    text-align: left; background: transparent;
    color: var(--nf-text-secondary); transition: background 0.1s, color 0.1s;
  }
  .nf-nav-btn:hover { background: var(--nf-bg-primary); color: var(--nf-text-primary); }
  .nf-nav-btn.active { background: var(--nf-bg-primary); color: var(--nf-accent); font-weight: 500; }
  .nf-card {
    background: var(--nf-bg-primary);
    border: 0.5px solid var(--nf-border);
    border-radius: 12px; padding: 11px 14px; cursor: pointer;
    transition: border-color 0.15s;
  }
  .nf-card:hover { border-color: var(--nf-border-hover); }
  .nf-btn-primary {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 14px; font-size: 13px; border-radius: 8px; border: none;
    cursor: pointer; background: var(--nf-accent); color: #fff;
    transition: background 0.15s;
  }
  .nf-btn-primary:hover { background: var(--nf-accent-hover); }
  .nf-btn-ghost {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 13px; font-size: 13px; border-radius: 8px;
    border: 0.5px solid var(--nf-border-hover); cursor: pointer;
    background: var(--nf-bg-primary); color: var(--nf-text-primary);
    transition: background 0.15s;
  }
  .nf-btn-ghost:hover { background: var(--nf-bg-secondary); }
  .nf-input {
    width: 100%; padding: 9px 12px; font-size: 14px; border-radius: 8px;
    border: 0.5px solid var(--nf-border-hover); outline: none;
    background: var(--nf-bg-primary); color: var(--nf-text-primary);
    transition: border-color 0.15s;
  }
  .nf-input:focus { border-color: var(--nf-accent); }
  @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
`;

// ─── Helpers couleur via CSS vars ─────────────────────────────────────────────
const C = {
  purple: { bg:"var(--nf-purple-bg)", text:"var(--nf-purple-text)" },
  teal:   { bg:"var(--nf-teal-bg)",   text:"var(--nf-teal-text)"   },
  blue:   { bg:"var(--nf-blue-bg)",   text:"var(--nf-blue-text)"   },
  amber:  { bg:"var(--nf-amber-bg)",  text:"var(--nf-amber-text)"  },
  red:    { bg:"var(--nf-red-bg)",    text:"var(--nf-red-text)",
            border:"var(--nf-red-border)", dark:"var(--nf-red-dark)" },
  green:  { bg:"var(--nf-green-bg)",  text:"var(--nf-green-text)"  },
};

// ─── Atoms ────────────────────────────────────────────────────────────────────
function Tag({ category }) {
  const meta = CATEGORIES[category];
  const c = C[meta.color];
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:11,
      padding:"2px 8px", borderRadius:20, fontWeight:500, background:c.bg, color:c.text }}>
      <i className={`ti ${meta.icon}`} aria-hidden="true" style={{fontSize:12}} />
      {meta.label}
    </span>
  );
}

function Prio({ priority }) {
  const meta = PRIORITIES[priority];
  const c = C[meta.color];
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:11,
      padding:"2px 8px", borderRadius:20, fontWeight:500, background:c.bg, color:c.text }}>
      {priority === "haute" && <i className={`ti ${meta.icon}`} aria-hidden="true" style={{fontSize:12}} />}
      {meta.label}
    </span>
  );
}

function DueBadge({ label, urgent }) {
  return (
    <span style={{ marginLeft:"auto", display:"inline-flex", alignItems:"center", gap:3,
      fontSize:11, color: urgent ? C.red.text : "var(--nf-text-tertiary)" }}>
      <i className="ti ti-clock" aria-hidden="true" style={{fontSize:13}} />
      {label}
    </span>
  );
}

// ─── Toggle dark mode ─────────────────────────────────────────────────────────
function ThemeToggle({ theme, onToggle }) {
  return (
    <button onClick={onToggle} title={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
      style={{ background:"none", border:"none", cursor:"pointer", padding:"4px 6px",
        color:"var(--nf-text-tertiary)", display:"flex", alignItems:"center",
        borderRadius:6, transition:"color 0.15s, background 0.15s" }}
      onMouseEnter={e => e.currentTarget.style.background = "var(--nf-bg-primary)"}
      onMouseLeave={e => e.currentTarget.style.background = "none"}>
      <i className={`ti ${theme === "dark" ? "ti-sun" : "ti-moon"}`}
        aria-hidden="true" style={{fontSize:16}} />
    </button>
  );
}

// ─── Note card ────────────────────────────────────────────────────────────────
function NoteCard({ note, onClick }) {
  return (
    <div className="nf-card" onClick={() => onClick(note)}>
      <div style={{ fontSize:14, fontWeight:500, color:"var(--nf-text-primary)",
        marginBottom:5, lineHeight:1.4 }}>{note.title}</div>
      <div style={{ fontSize:13, color:"var(--nf-text-secondary)",
        lineHeight:1.5, marginBottom:8 }}>{note.body}</div>
      <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap" }}>
        <Tag category={note.category} />
        <Prio priority={note.priority} />
        <DueBadge label={note.dueLabel} urgent={note.dueUrgent} />
      </div>
    </div>
  );
}

// ─── Note detail ──────────────────────────────────────────────────────────────
function NoteDetail({ note, onClose, onMarkDone }) {
  return (
    <div style={{ position:"absolute", inset:0, background:"var(--nf-bg-primary)",
      display:"flex", flexDirection:"column", zIndex:10 }}>
      <div style={{ padding:"14px 18px", borderBottom:`0.5px solid var(--nf-border)`,
        display:"flex", alignItems:"center", gap:10 }}>
        <button onClick={onClose} className="nf-btn-ghost" style={{padding:"5px 11px"}}>
          <i className="ti ti-arrow-left" aria-hidden="true" /> Retour
        </button>
        <div style={{ flex:1 }} />
        <button onClick={() => onMarkDone(note.id)} className="nf-btn-ghost">
          <i className="ti ti-circle-check" aria-hidden="true" /> Marquer comme fait
        </button>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>
        <div style={{ fontSize:18, fontWeight:500, color:"var(--nf-text-primary)",
          marginBottom:14, lineHeight:1.4 }}>{note.title}</div>
        <div style={{ display:"flex", gap:8, marginBottom:18, flexWrap:"wrap" }}>
          <Tag category={note.category} />
          <Prio priority={note.priority} />
          {note.dueLabel && <DueBadge label={note.dueLabel} urgent={note.dueUrgent} />}
        </div>
        <div style={{ fontSize:14, color:"var(--nf-text-secondary)",
          lineHeight:1.7, marginBottom:20 }}>{note.body}</div>
        <div style={{ background:"var(--nf-bg-secondary)", border:`0.5px solid var(--nf-border)`,
          borderRadius:10, padding:"14px 16px", marginBottom:16 }}>
          <div style={{ fontSize:11, color:"var(--nf-text-tertiary)", marginBottom:8,
            display:"flex", alignItems:"center", gap:4 }}>
            <i className="ti ti-list-check" aria-hidden="true" style={{fontSize:13}} />
            Actions suggérées
          </div>
          {note.actions.map((a, i) => (
            <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:8,
              fontSize:13, color:"var(--nf-text-primary)", paddingTop: i > 0 ? 6 : 0 }}>
              <i className="ti ti-point" aria-hidden="true"
                style={{ color:"var(--nf-text-tertiary)", marginTop:1 }} />
              {a}
            </div>
          ))}
        </div>
        <div style={{ fontSize:12, color:"var(--nf-text-tertiary)" }}>
          Créée le {new Date(note.createdAt).toLocaleDateString("fr-FR",
            { day:"numeric", month:"long", year:"numeric" })}
        </div>
      </div>
    </div>
  );
}

// ─── Compose ──────────────────────────────────────────────────────────────────
function ComposeView({ onSave }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const taRef = useRef();

  useEffect(() => { taRef.current?.focus(); }, []);

  async function analyze() {
    if (!text.trim()) { taRef.current?.focus(); return; }
    setLoading(true); setResult(null); setError(null);
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1000,
          messages:[{ role:"user", content:
            `Tu es l'IA de NoteFlow. Analyse cette note et retourne UNIQUEMENT un objet JSON valide, sans markdown.\n\nNote brute : "${text}"\n\nFormat JSON attendu :\n{\n  "title": "titre court (max 10 mots)",\n  "body": "note reformulée professionnellement (2-3 phrases)",\n  "category": "mission | client | reunion | idee",\n  "priority": "haute | moyenne | basse",\n  "dueLabel": "Aujourd'hui | Demain | Cette semaine | Ce mois | Pas d'échéance",\n  "dueUrgent": true/false,\n  "actions": ["action 1", "action 2", "action 3"]\n}`
          }]
        })
      });
      const data = await resp.json();
      const raw = data.content?.find(b => b.type === "text")?.text || "";
      setResult(JSON.parse(raw.replace(/```json|```/g, "").trim()));
    } catch {
      setError("Impossible d'analyser la note. Vérifie ta connexion.");
    }
    setLoading(false);
  }

  async function handleSave() {
    const newNote = { ...result, raw:text, due:null, createdAt:new Date().toISOString(),
      done:false, id: USE_MOCK ? Date.now() : undefined };
    if (!USE_MOCK) { const saved = await createNote(newNote); onSave(saved); }
    else onSave(newNote);
    setText(""); setResult(null);
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ background:"var(--nf-bg-secondary)", border:`0.5px solid var(--nf-border)`,
        borderRadius:12, padding:"14px 16px" }}>
        <textarea ref={taRef} value={text}
          onChange={e => { setText(e.target.value); setResult(null); }}
          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) analyze(); }}
          placeholder="Écris ta note librement... L'IA corrige, catégorise et priorise. ⌘↵ pour analyser"
          rows={4} style={{ width:"100%", background:"transparent", border:"none", outline:"none",
            fontSize:14, color:"var(--nf-text-primary)", resize:"none", lineHeight:1.6, minHeight:80 }} />
        <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:10 }}>
          <span style={{ fontSize:12, color:"var(--nf-text-tertiary)", flex:1 }}>
            Parle naturellement — l'IA s'occupe du reste
          </span>
          <button onClick={analyze} disabled={loading || !text.trim()} className="nf-btn-primary"
            style={{ opacity: !text.trim() ? 0.45 : 1, cursor: !text.trim() ? "not-allowed" : "pointer" }}>
            <i className="ti ti-sparkles" aria-hidden="true" />
            {loading ? "Analyse…" : "Analyser"}
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0",
          fontSize:13, color:"var(--nf-accent)" }}>
          {[0,150,300].map(d => (
            <span key={d} style={{ width:6, height:6, borderRadius:"50%",
              background:"var(--nf-accent)", display:"inline-block",
              animation:"bounce 1.2s infinite", animationDelay:`${d}ms` }} />
          ))}
          Analyse en cours…
        </div>
      )}

      {error && (
        <div style={{ padding:"10px 14px", background:C.red.bg, color:C.red.text,
          borderRadius:8, fontSize:13 }}>
          <i className="ti ti-alert-triangle" aria-hidden="true" style={{marginRight:6}} />{error}
        </div>
      )}

      {result && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ fontSize:12, color:"var(--nf-text-tertiary)" }}>Résultat de l'analyse</div>
          <div className="nf-card" style={{ cursor:"default" }}>
            <div style={{ fontSize:11, color:"var(--nf-text-tertiary)", marginBottom:8,
              display:"flex", alignItems:"center", gap:4 }}>
              <i className="ti ti-check" aria-hidden="true" style={{fontSize:13}} /> Note reformulée
            </div>
            <div style={{ fontSize:15, fontWeight:500, color:"var(--nf-text-primary)",
              marginBottom:6 }}>{result.title}</div>
            <div style={{ fontSize:13, color:"var(--nf-text-secondary)", lineHeight:1.6 }}>{result.body}</div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {[
              { label:"Catégorie", val:<Tag category={result.category} /> },
              { label:"Priorité",  val:<Prio priority={result.priority} /> },
              { label:"Échéance",  val:<DueBadge label={result.dueLabel} urgent={result.dueUrgent} /> },
            ].map(({ label, val }) => (
              <div key={label} className="nf-card" style={{ flex:1, cursor:"default" }}>
                <div style={{ fontSize:11, color:"var(--nf-text-tertiary)", marginBottom:6 }}>{label}</div>
                <div>{val}</div>
              </div>
            ))}
          </div>
          <div className="nf-card" style={{ cursor:"default" }}>
            <div style={{ fontSize:11, color:"var(--nf-text-tertiary)", marginBottom:8,
              display:"flex", alignItems:"center", gap:4 }}>
              <i className="ti ti-list-check" aria-hidden="true" style={{fontSize:13}} /> Actions suggérées
            </div>
            {result.actions?.map((a, i) => (
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:8,
                fontSize:13, color:"var(--nf-text-primary)", paddingTop: i > 0 ? 6 : 0 }}>
                <i className="ti ti-point" aria-hidden="true"
                  style={{ color:"var(--nf-text-tertiary)", marginTop:1 }} />{a}
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={handleSave} className="nf-btn-primary">
              <i className="ti ti-device-floppy" aria-hidden="true" /> Enregistrer
            </button>
            <button onClick={() => setResult(null)} className="nf-btn-ghost">
              <i className="ti ti-refresh" aria-hidden="true" /> Modifier
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Today ────────────────────────────────────────────────────────────────────
function TodayView({ notes, onNoteClick }) {
  const urgent = notes.filter(n => n.dueUrgent && !n.done);
  const active = notes.filter(n => !n.done && n.priority !== "basse");
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {urgent.length > 0 && (
        <div style={{ background:C.red.bg, border:`0.5px solid ${C.red.border}`,
          borderRadius:12, padding:"14px 16px" }}>
          <div style={{ fontSize:13, fontWeight:500, color:C.red.dark, marginBottom:10,
            display:"flex", alignItems:"center", gap:6 }}>
            <i className="ti ti-bell-ringing" aria-hidden="true" /> Relances urgentes
          </div>
          {urgent.map(n => (
            <div key={n.id} style={{ display:"flex", alignItems:"center", gap:8,
              fontSize:12, color:C.red.text, paddingTop:4 }}>
              <i className="ti ti-alert-triangle" aria-hidden="true" style={{fontSize:14}} />
              {n.title} — {n.dueLabel?.toLowerCase()}
            </div>
          ))}
        </div>
      )}
      <div style={{ fontSize:12, color:"var(--nf-text-tertiary)" }}>À traiter aujourd'hui</div>
      {active.map(n => <NoteCard key={n.id} note={n} onClick={onNoteClick} />)}
    </div>
  );
}

// ─── Digest ───────────────────────────────────────────────────────────────────
function DigestView({ notes }) {
  const sorted = [...notes].filter(n => !n.done)
    .sort((a, b) => ({ haute:0, moyenne:1, basse:2 })[a.priority] - ({ haute:0, moyenne:1, basse:2 })[b.priority])
    .slice(0, 3);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ background:"var(--nf-accent-subtle)", border:`0.5px solid var(--nf-accent)`,
        borderRadius:12, padding:"14px 16px", opacity:0.9 }}>
        <div style={{ fontSize:13, fontWeight:500, color:"var(--nf-accent-hover)", marginBottom:10,
          display:"flex", alignItems:"center", gap:6 }}>
          <i className="ti ti-sun" aria-hidden="true" />
          Récap du {new Date().toLocaleDateString("fr-FR",
            { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
        </div>
        {[
          { icon:"ti-layout-list", text:`${notes.length} notes au total` },
          { icon:"ti-flame",       text:`${notes.filter(n=>n.dueUrgent&&!n.done).length} urgences en attente` },
          { icon:"ti-circle-check",text:`${notes.filter(n=>n.done).length} notes complétées` },
        ].map(({ icon, text }) => (
          <div key={text} style={{ display:"flex", alignItems:"center", gap:8,
            fontSize:12, color:"var(--nf-accent)", paddingTop:4 }}>
            <i className={`ti ${icon}`} aria-hidden="true" style={{fontSize:14}} />{text}
          </div>
        ))}
      </div>
      <div style={{ fontSize:12, color:"var(--nf-text-tertiary)" }}>
        Ce que l'IA te suggère de faire en premier
      </div>
      {sorted.map((n, i) => (
        <div key={n.id} className="nf-card" style={{ cursor:"default" }}>
          <div style={{ fontSize:13, fontWeight:500, color:"var(--nf-text-primary)", marginBottom:4 }}>
            {i + 1} · {n.title}
          </div>
          <div style={{ fontSize:12, color:"var(--nf-text-secondary)" }}>{n.actions[0]}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Right panel ──────────────────────────────────────────────────────────────
function RightPanel({ notes }) {
  const upcoming = notes.filter(n => n.due && !n.done)
    .sort((a, b) => new Date(a.due) - new Date(b.due)).slice(0, 4);
  return (
    <div style={{ width:230, borderLeft:`0.5px solid var(--nf-border)`,
      background:"var(--nf-bg-secondary)", display:"flex",
      flexDirection:"column", flexShrink:0, overflow:"hidden" }}>
      <div style={{ padding:"13px 15px 10px", borderBottom:`0.5px solid var(--nf-border)`,
        fontSize:13, fontWeight:500, color:"var(--nf-text-primary)",
        display:"flex", alignItems:"center", gap:6 }}>
        <i className="ti ti-chart-bar" aria-hidden="true" style={{fontSize:15}} /> Vue d'ensemble
      </div>
      <div style={{ padding:"14px 15px", flex:1, overflowY:"auto",
        display:"flex", flexDirection:"column", gap:12 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {[
            { n:notes.length, l:"Notes", c:"var(--nf-text-primary)" },
            { n:notes.filter(n=>n.dueUrgent&&!n.done).length, l:"Urgentes", c:C.red.text },
            { n:notes.filter(n=>{ const d=new Date(n.createdAt); return (new Date()-d)/86400000<=7; }).length, l:"Cette semaine", c:"var(--nf-text-primary)" },
            { n:notes.filter(n=>n.done).length, l:"Complétées", c:C.green.text },
          ].map(({ n, l, c }) => (
            <div key={l} style={{ background:"var(--nf-bg-primary)", borderRadius:8, padding:"9px 12px" }}>
              <div style={{ fontSize:22, fontWeight:500, color:c }}>{n}</div>
              <div style={{ fontSize:11, color:"var(--nf-text-tertiary)", marginTop:2 }}>{l}</div>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize:12, color:"var(--nf-text-tertiary)", marginBottom:8 }}>
            Prochaines échéances
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {upcoming.length === 0 && (
              <div style={{ fontSize:12, color:"var(--nf-text-tertiary)" }}>Aucune échéance.</div>
            )}
            {upcoming.map(n => (
              <div key={n.id} style={{ display:"flex", alignItems:"center", gap:8,
                fontSize:12, padding:"8px 10px", background:"var(--nf-bg-primary)",
                borderRadius:8, border:`0.5px solid ${n.dueUrgent ? C.red.border : "var(--nf-border)"}` }}>
                <i className="ti ti-clock" aria-hidden="true"
                  style={{ fontSize:14, color: n.dueUrgent ? C.red.text : "var(--nf-text-tertiary)" }} />
                <div style={{ flex:1, color:"var(--nf-text-primary)", overflow:"hidden",
                  textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{n.title}</div>
                <div style={{ color: n.dueUrgent ? C.red.text : "var(--nf-text-secondary)",
                  fontWeight: n.dueUrgent ? 500 : 400, whiteSpace:"nowrap" }}>{n.dueLabel}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize:12, color:"var(--nf-text-tertiary)", marginBottom:6 }}>Répartition</div>
          {Object.entries(CATEGORIES).map(([key, meta]) => {
            const count = notes.filter(n => n.category === key).length;
            const pct = notes.length > 0 ? Math.round((count / notes.length) * 100) : 0;
            const c = C[meta.color];
            return (
              <div key={key} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                <i className={`ti ${meta.icon}`} aria-hidden="true"
                  style={{ fontSize:13, color:c.text, width:16 }} />
                <div style={{ flex:1 }}>
                  <div style={{ height:4, background:"var(--nf-bg-primary)", borderRadius:4, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${pct}%`, background:c.text,
                      borderRadius:4, transition:"width 0.4s" }} />
                  </div>
                </div>
                <div style={{ fontSize:11, color:"var(--nf-text-tertiary)",
                  minWidth:24, textAlign:"right" }}>{count}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ activeView, onNav, noteCount, urgentCount, user, theme, onToggleTheme }) {
  const nav = [
    { id:"all",     icon:"ti-layout-list", label:"Toutes les notes", badge:noteCount },
    { id:"today",   icon:"ti-sun",         label:"Aujourd'hui",      badge:urgentCount, urgent:true },
    { id:"digest",  icon:"ti-newspaper",   label:"Récap du jour" },
    { id:"compose", icon:"ti-plus",        label:"Nouvelle note" },
  ];
  return (
    <div style={{ width:196, borderRight:`0.5px solid var(--nf-border)`,
      background:"var(--nf-bg-secondary)", display:"flex",
      flexDirection:"column", flexShrink:0 }}>
      <div style={{ padding:"14px 14px 10px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ fontSize:17, fontWeight:500, color:"var(--nf-text-primary)", letterSpacing:"-0.3px" }}>
          Note<span style={{ color:"var(--nf-accent)" }}>Flow</span>
        </div>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
      <nav style={{ flex:1, padding:"4px 0" }}>
        {nav.map(item => (
          <button key={item.id} onClick={() => onNav(item.id)}
            className={`nf-nav-btn${activeView === item.id ? " active" : ""}`}>
            <i className={`ti ${item.icon}`} aria-hidden="true" style={{fontSize:15}} />
            {item.label}
            {item.badge > 0 && (
              <span style={{ marginLeft:"auto", fontSize:11, padding:"1px 7px",
                borderRadius:20, fontWeight:500,
                background: item.urgent ? C.red.bg : "var(--nf-accent-subtle)",
                color: item.urgent ? C.red.text : "var(--nf-accent)" }}>
                {item.badge}
              </span>
            )}
          </button>
        ))}
        <div style={{ padding:"14px 14px 4px", fontSize:11, color:"var(--nf-text-tertiary)",
          letterSpacing:"0.5px", textTransform:"uppercase" }}>
          Catégories
        </div>
        {Object.entries(CATEGORIES).map(([key, meta]) => (
          <button key={key} onClick={() => onNav(`cat:${key}`)}
            className={`nf-nav-btn${activeView === `cat:${key}` ? " active" : ""}`}>
            <i className={`ti ${meta.icon}`} aria-hidden="true" style={{fontSize:15}} />
            {meta.label}
          </button>
        ))}
      </nav>
      <div style={{ padding:"12px 14px", borderTop:`0.5px solid var(--nf-border)` }}>
        {user && (
          <div style={{ fontSize:11, color:"var(--nf-text-tertiary)", marginBottom:6,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {user.email}
          </div>
        )}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:12, color:"var(--nf-text-tertiary)" }}>
            {new Date().toLocaleDateString("fr-FR", { day:"numeric", month:"long" })}
          </div>
          {!USE_MOCK && user && (
            <button onClick={signOut} style={{ background:"none", border:"none", cursor:"pointer",
              fontSize:11, color:"var(--nf-text-tertiary)" }}>
              Déconnexion
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
const VIEW_TITLES = {
  all:"Toutes les notes", today:"Urgences du jour",
  digest:"Récap du jour", compose:"Nouvelle note",
};

export default function App() {
  const [notes, setNotes]               = useState([]);
  const [view, setView]                 = useState("all");
  const [selectedNote, setSelectedNote] = useState(null);
  const [search, setSearch]             = useState("");
  const [user, setUser]                 = useState(USE_MOCK ? { email:"demo@noteflow.app" } : null);
  const [loading, setLoading]           = useState(!USE_MOCK);
  const [theme, setTheme]               = useState(() => getInitialTheme());

  // Injecter le CSS global une seule fois
  useEffect(() => {
    if (!document.getElementById("nf-global-css")) {
      const style = document.createElement("style");
      style.id = "nf-global-css";
      style.textContent = GLOBAL_CSS;
      document.head.appendChild(style);
    }
  }, []);

  // Appliquer le thème au montage et à chaque changement
  useEffect(() => { applyTheme(theme); }, [theme]);

  function toggleTheme() {
    setTheme(t => t === "light" ? "dark" : "light");
  }

  useEffect(() => {
    if (USE_MOCK) { setNotes(MOCK_NOTES); return; }
    const { data: { subscription } } = onAuthChange(u => {
      setUser(u); setLoading(false);
      if (u) fetchNotes().then(setNotes);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleMarkDone(id) {
    if (!USE_MOCK) await markNoteDone(id);
    setNotes(prev => prev.map(n => n.id === id ? { ...n, done:true } : n));
    setSelectedNote(null);
  }

  function handleSave(newNote) {
    setNotes(prev => [newNote, ...prev]);
    setView("all");
  }

  if (loading) return null;
  if (!USE_MOCK && !user) return <AuthScreen />;

  const isCat = view.startsWith("cat:");
  const filtered = notes
    .filter(n => isCat ? n.category === view.slice(4) && !n.done : !n.done)
    .filter(n => !search.trim() || [n.title, n.body].join(" ").toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => ({ haute:0, moyenne:1, basse:2 })[a.priority] - ({ haute:0, moyenne:1, basse:2 })[b.priority]);

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden",
      background:"var(--nf-bg-tertiary)", color:"var(--nf-text-primary)",
      transition:"background 0.2s, color 0.2s" }}>
      <Sidebar
        activeView={view} onNav={id => { setView(id); setSelectedNote(null); }}
        noteCount={notes.filter(n=>!n.done).length}
        urgentCount={notes.filter(n=>n.dueUrgent&&!n.done).length}
        user={user} theme={theme} onToggleTheme={toggleTheme}
      />
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden",
        background:"var(--nf-bg-primary)", transition:"background 0.2s" }}>
        <div style={{ padding:"12px 20px", borderBottom:`0.5px solid var(--nf-border)`,
          display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
          <div style={{ fontSize:15, fontWeight:500, color:"var(--nf-text-primary)", flex:1 }}>
            {isCat ? CATEGORIES[view.slice(4)]?.label : VIEW_TITLES[view] || "Notes"}
          </div>
          {(view === "all" || isCat) && (
            <div style={{ display:"flex", alignItems:"center", gap:8,
              background:"var(--nf-bg-secondary)", border:`0.5px solid var(--nf-border)`,
              borderRadius:8, padding:"6px 12px" }}>
              <i className="ti ti-search" aria-hidden="true"
                style={{ fontSize:14, color:"var(--nf-text-tertiary)" }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher…" style={{ background:"none", border:"none",
                  outline:"none", fontSize:13, color:"var(--nf-text-primary)", width:160 }} />
            </div>
          )}
          <button onClick={() => { setView("compose"); setSelectedNote(null); }}
            className="nf-btn-primary">
            <i className="ti ti-plus" aria-hidden="true" /> Nouvelle note
          </button>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"16px 20px", position:"relative" }}>
          {selectedNote && (
            <NoteDetail note={selectedNote} onClose={() => setSelectedNote(null)}
              onMarkDone={handleMarkDone} />
          )}
          {view === "compose" && <ComposeView onSave={handleSave} />}
          {(view === "all" || isCat) && !selectedNote && (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign:"center", padding:"48px 0",
                  color:"var(--nf-text-tertiary)", fontSize:14 }}>
                  <i className="ti ti-notes" aria-hidden="true"
                    style={{ fontSize:32, display:"block", marginBottom:12 }} />
                  {search ? "Aucune note ne correspond." : "Aucune note ici pour l'instant."}
                </div>
              ) : (
                <>
                  <div style={{ fontSize:12, color:"var(--nf-text-tertiary)", marginBottom:4 }}>
                    {filtered.length} note{filtered.length > 1 ? "s" : ""} · triées par priorité
                  </div>
                  {filtered.map(n => <NoteCard key={n.id} note={n} onClick={setSelectedNote} />)}
                </>
              )}
            </div>
          )}
          {view === "today" && !selectedNote && (
            <TodayView notes={notes} onNoteClick={setSelectedNote} />
          )}
          {view === "digest" && !selectedNote && <DigestView notes={notes} />}
        </div>
      </div>
      <RightPanel notes={notes} />
    </div>
  );
}
