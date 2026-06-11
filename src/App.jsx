import { useState, useEffect, useRef } from "react";
import { MOCK_NOTES, CATEGORIES, setCategories, PRIORITIES } from "./data/mockNotes";
import AuthScreen from "./components/AuthScreen";
import { fetchNotes, createNote, updateNote, deleteNote, markNoteDone,
         fetchCategories, createCategory, deleteCategory,
         calcNextDue, resetRecurring,
         onAuthChange, signOut } from "./lib/supabase";
import { applyTheme, getInitialTheme } from "./theme";

const USE_MOCK = false;

// ─── Global CSS ───────────────────────────────────────────────────────────────
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
    background: var(--nf-bg-primary); border: 0.5px solid var(--nf-border);
    border-radius: 12px; padding: 11px 14px; cursor: pointer; transition: border-color 0.15s;
  }
  .nf-card:hover { border-color: var(--nf-border-hover); }
  .nf-btn-primary {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 14px; font-size: 13px; border-radius: 8px; border: none;
    cursor: pointer; background: var(--nf-accent); color: #fff; transition: background 0.15s;
  }
  .nf-btn-primary:hover { background: var(--nf-accent-hover); }
  .nf-btn-ghost {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 13px; font-size: 13px; border-radius: 8px;
    border: 0.5px solid var(--nf-border-hover); cursor: pointer;
    background: var(--nf-bg-primary); color: var(--nf-text-primary); transition: background 0.15s;
  }
  .nf-btn-ghost:hover { background: var(--nf-bg-secondary); }
  .nf-btn-danger {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 13px; font-size: 13px; border-radius: 8px;
    border: 0.5px solid var(--nf-red-border); cursor: pointer;
    background: var(--nf-bg-primary); color: var(--nf-red-text); transition: background 0.15s;
  }
  .nf-btn-danger:hover { background: var(--nf-red-bg); }
  .nf-input {
    width: 100%; padding: 9px 12px; font-size: 14px; border-radius: 8px;
    border: 0.5px solid var(--nf-border-hover); outline: none;
    background: var(--nf-bg-primary); color: var(--nf-text-primary); transition: border-color 0.15s;
  }
  .nf-input:focus { border-color: var(--nf-accent); }
  @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
  select.nf-input, select.nf-select {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
    padding-right: 30px !important;
  }
`;

// ─── Tokens ───────────────────────────────────────────────────────────────────
const C = {
  purple:{ bg:"var(--nf-purple-bg)", text:"var(--nf-purple-text)" },
  teal:  { bg:"var(--nf-teal-bg)",   text:"var(--nf-teal-text)"   },
  blue:  { bg:"var(--nf-blue-bg)",   text:"var(--nf-blue-text)"   },
  amber: { bg:"var(--nf-amber-bg)",  text:"var(--nf-amber-text)"  },
  red:   { bg:"var(--nf-red-bg)",    text:"var(--nf-red-text)",
           border:"var(--nf-red-border)", dark:"var(--nf-red-dark)" },
  green: { bg:"var(--nf-green-bg)",  text:"var(--nf-green-text)"  },
};

const COLOR_OPTIONS = [
  { key:"purple", label:"Violet" }, { key:"teal", label:"Vert" },
  { key:"blue",   label:"Bleu"   }, { key:"amber", label:"Jaune" },
  { key:"green",  label:"Sauge"  }, { key:"red",   label:"Rouge" },
];

const ICON_OPTIONS = [
  "ti-tag","ti-briefcase","ti-users","ti-video","ti-bulb","ti-home","ti-coin",
  "ti-heart","ti-confetti","ti-car","ti-plane","ti-book","ti-gym","ti-tool",
  "ti-shopping-cart","ti-phone","ti-music","ti-camera","ti-star","ti-flag",
];

// ─── CategorySelect — select + création inline ───────────────────────────────
function CategorySelect({ value, onChange, cats, onCatCreated, style = {} }) {
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const inputRef = useRef();

  function slugify(s) {
    return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/[^a-z0-9]/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"");
  }

  useEffect(() => { if (creating) inputRef.current?.focus(); }, [creating]);

  async function handleCreate() {
    const label = newLabel.trim();
    if (!label) return;
    const key = slugify(label);
    const cat = { key, label, icon:"ti-tag", color:"purple" };
    await onCatCreated(cat);
    onChange(key);
    setNewLabel("");
    setCreating(false);
  }

  if (creating) {
    return (
      <div style={{ display:"flex", gap:6, alignItems:"center", ...style }}>
        <input
          ref={inputRef}
          className="nf-input"
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") handleCreate();
            if (e.key === "Escape") { setCreating(false); setNewLabel(""); }
          }}
          placeholder="Nom de la catégorie…"
          style={{ fontSize:13, flex:1 }}
        />
        <button onClick={handleCreate} className="nf-btn-primary"
          style={{ padding:"6px 12px", flexShrink:0 }}
          disabled={!newLabel.trim()}>
          <i className="ti ti-check" aria-hidden="true" />
        </button>
        <button onClick={() => { setCreating(false); setNewLabel(""); }}
          className="nf-btn-ghost" style={{ padding:"6px 10px", flexShrink:0 }}>
          <i className="ti ti-x" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", gap:6, alignItems:"center", ...style }}>
      <select className="nf-input" value={value} onChange={e => onChange(e.target.value)}
        style={{ flex:1, fontSize:13 }}>
        {Object.keys(cats).length === 0 && (
          <option value="" disabled>— aucune catégorie —</option>
        )}
        {Object.entries(cats).map(([key, meta]) => (
          <option key={key} value={key}>{meta.label}</option>
        ))}
      </select>
      <button onClick={() => setCreating(true)} className="nf-btn-ghost"
        title="Nouvelle catégorie"
        style={{ padding:"6px 10px", flexShrink:0, color:"var(--nf-accent)" }}>
        <i className="ti ti-plus" aria-hidden="true" />
      </button>
    </div>
  );
}

// ─── Atoms ────────────────────────────────────────────────────────────────────
function Tag({ category, cats }) {
  const meta = (cats || CATEGORIES)[category] || { label: category, icon:"ti-tag", color:"purple" };
  const c = C[meta.color] || C.purple;
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
      <i className="ti ti-clock" aria-hidden="true" style={{fontSize:13}} />{label}
    </span>
  );
}

function SpacePill({ space }) {
  const isPro = space === "pro";
  return (
    <span style={{ fontSize:10, padding:"1px 7px", borderRadius:20, fontWeight:600,
      letterSpacing:"0.4px", textTransform:"uppercase",
      background: isPro ? "var(--nf-blue-bg)" : "var(--nf-purple-bg)",
      color:       isPro ? "var(--nf-blue-text)" : "var(--nf-purple-text)" }}>
      {isPro ? "Pro" : "Perso"}
    </span>
  );
}

const RECURRENCE_LABELS = {
  daily:   "Quotidienne",
  weekly:  "Hebdomadaire",
  monthly: "Mensuelle",
  yearly:  "Annuelle",
};

function RecurringBadge({ recurrence }) {
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:3, fontSize:10,
      padding:"1px 7px", borderRadius:20, fontWeight:600, letterSpacing:"0.3px",
      background:"var(--nf-green-bg)", color:"var(--nf-green-text)" }}>
      <i className="ti ti-refresh" aria-hidden="true" style={{fontSize:11}} />
      {RECURRENCE_LABELS[recurrence] || recurrence}
    </span>
  );
}

// ─── Space Switcher ───────────────────────────────────────────────────────────
function SpaceSwitcher({ space, onChange }) {
  return (
    <div style={{ display:"flex", margin:"10px 10px 6px", borderRadius:10,
      background:"var(--nf-bg-primary)", border:"0.5px solid var(--nf-border)",
      padding:3, gap:2 }}>
      {["pro","perso"].map(s => (
        <button key={s} onClick={() => onChange(s)} style={{
          flex:1, padding:"5px 0", fontSize:12, fontWeight: space===s ? 500 : 400,
          border:"none", borderRadius:8, cursor:"pointer", transition:"all 0.15s",
          background: space===s ? "var(--nf-accent)" : "transparent",
          color:       space===s ? "#fff" : "var(--nf-text-secondary)",
        }}>
          {s === "pro" ? "💼 Pro" : "🏠 Perso"}
        </button>
      ))}
    </div>
  );
}

// ─── Note card ────────────────────────────────────────────────────────────────
function NoteCard({ note, onClick, cats, showSpace }) {
  const isDone = note.done && note.isRecurring;
  return (
    <div className="nf-card" onClick={() => onClick(note)}
      style={{ opacity: isDone ? 0.6 : 1 }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
        <div style={{ fontSize:14, fontWeight:500,
          color: isDone ? "var(--nf-text-tertiary)" : "var(--nf-text-primary)",
          lineHeight:1.4, flex:1,
          textDecoration: isDone ? "line-through" : "none" }}>
          {note.title}
        </div>
        {note.isRecurring && <RecurringBadge recurrence={note.recurrence} />}
        {showSpace && <SpacePill space={note.space} />}
      </div>
      {isDone ? (
        <div style={{ fontSize:12, color:"var(--nf-text-tertiary)", marginBottom:8,
          display:"flex", alignItems:"center", gap:5 }}>
          <i className="ti ti-circle-check" aria-hidden="true" style={{fontSize:14, color:"var(--nf-green-text)"}} />
          Fait · revient le {new Date(note.nextDue).toLocaleDateString("fr-FR", { day:"numeric", month:"long" })}
        </div>
      ) : (
        <div style={{ fontSize:13, color:"var(--nf-text-secondary)",
          lineHeight:1.5, marginBottom:8 }}>{note.body}</div>
      )}
      <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap" }}>
        <Tag category={note.category} cats={cats} />
        {!isDone && <Prio priority={note.priority} />}
        {!isDone && <DueBadge label={note.dueLabel} urgent={note.dueUrgent} />}
      </div>
    </div>
  );
}

// ─── DuePicker — date précise ou raccourci ────────────────────────────────────
function DuePicker({ due, dueLabel, dueUrgent, onChange }) {
  // onChange({ due, dueLabel, dueUrgent })

  function fromShortcut(label) {
    const d = new Date();
    switch(label) {
      case "Aujourd'hui":  break;
      case "Demain":       d.setDate(d.getDate()+1); break;
      case "Cette semaine":d.setDate(d.getDate()+(7-d.getDay()||7)); break;
      case "Ce mois":      d.setMonth(d.getMonth()+1); d.setDate(0); break;
      case "Pas d'échéance": return onChange({ due:null, dueLabel:"Pas d'échéance", dueUrgent:false });
      default: return;
    }
    const iso = d.toISOString().split("T")[0];
    const urgent = label === "Aujourd'hui" || label === "Demain";
    onChange({ due:iso, dueLabel:label, dueUrgent:urgent });
  }

  function fromDate(iso) {
    if (!iso) return onChange({ due:null, dueLabel:"Pas d'échéance", dueUrgent:false });
    const d     = new Date(iso + "T12:00:00");
    const today = new Date(); today.setHours(0,0,0,0);
    const diff  = Math.round((d - today) / 86400000);
    let label;
    if (diff === 0)      label = "Aujourd'hui";
    else if (diff === 1) label = "Demain";
    else label = d.toLocaleDateString("fr-FR", { day:"numeric", month:"long" });
    onChange({ due:iso, dueLabel:label, dueUrgent:diff <= 1 });
  }

  const SHORTCUTS = ["Aujourd'hui","Demain","Cette semaine","Ce mois","Pas d'échéance"];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      {/* Raccourcis */}
      <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
        {SHORTCUTS.map(s => {
          const active = dueLabel === s || (!due && s === "Pas d'échéance");
          return (
            <button key={s} onClick={() => fromShortcut(s)} style={{
              padding:"3px 9px", fontSize:11, borderRadius:20, border:"none",
              cursor:"pointer", fontFamily:"inherit", transition:"all 0.12s",
              background: active ? "var(--nf-accent)" : "var(--nf-bg-secondary)",
              color:       active ? "#fff" : "var(--nf-text-secondary)",
              outline: active ? "none" : `0.5px solid var(--nf-border)`,
            }}>
              {s}
            </button>
          );
        })}
      </div>
      {/* Date précise */}
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <input
          type="date"
          className="nf-input"
          value={due || ""}
          min={new Date().toISOString().split("T")[0]}
          onChange={e => fromDate(e.target.value)}
          style={{ fontSize:13, flex:1,
            colorScheme: document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light" }}
        />
        {due && (
          <button onClick={() => onChange({ due:null, dueLabel:"Pas d'échéance", dueUrgent:false })}
            className="nf-btn-ghost" style={{ padding:"6px 10px", flexShrink:0 }}
            title="Effacer la date">
            <i className="ti ti-x" aria-hidden="true" style={{fontSize:13}} />
          </button>
        )}
      </div>
      {due && (
        <div style={{ fontSize:11, color: dueUrgent ? C.red.text : "var(--nf-text-tertiary)",
          display:"flex", alignItems:"center", gap:4 }}>
          <i className="ti ti-clock" aria-hidden="true" style={{fontSize:12}} />
          {dueLabel}
        </div>
      )}
    </div>
  );
}

// ─── Edit modal ───────────────────────────────────────────────────────────────
function EditModal({ note, cats, onSave, onClose, onCatCreated }) {
  const [title, setTitle]       = useState(note.title);
  const [body, setBody]         = useState(note.body);
  const [category, setCategory] = useState(note.category);
  const [priority, setPriority] = useState(note.priority);
  const [due, setDue]           = useState(note.due || null);
  const [dueLabel, setDueLabel] = useState(note.dueLabel || "Pas d'échéance");
  const [dueUrgent, setDueUrgent] = useState(note.dueUrgent || false);
  const [saving, setSaving]     = useState(false);

  function handleDueChange({ due: d, dueLabel: l, dueUrgent: u }) {
    setDue(d); setDueLabel(l); setDueUrgent(u);
  }

  async function handleSave() {
    setSaving(true);
    await onSave(note.id, { ...note, title, body, category, priority, due, dueLabel, dueUrgent });
    setSaving(false);
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:100,
      display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"var(--nf-bg-primary)", border:"0.5px solid var(--nf-border)",
        borderRadius:16, padding:"24px", width:480, maxWidth:"90vw",
        display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:15, fontWeight:500, color:"var(--nf-text-primary)" }}>
            Modifier la note
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer",
            color:"var(--nf-text-tertiary)", fontSize:18, lineHeight:1, padding:"2px 6px" }}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
          <label style={{ fontSize:12, color:"var(--nf-text-tertiary)" }}>Titre</label>
          <input className="nf-input" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
          <label style={{ fontSize:12, color:"var(--nf-text-tertiary)" }}>Corps</label>
          <textarea className="nf-input" value={body} onChange={e => setBody(e.target.value)}
            rows={3} style={{ resize:"vertical" }} />
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <div style={{ flex:1, display:"flex", flexDirection:"column", gap:4 }}>
            <label style={{ fontSize:12, color:"var(--nf-text-tertiary)" }}>Catégorie</label>
            <CategorySelect
              value={category} onChange={setCategory}
              cats={cats} onCatCreated={onCatCreated}
            />
          </div>
          <div style={{ flex:1, display:"flex", flexDirection:"column", gap:4 }}>
            <label style={{ fontSize:12, color:"var(--nf-text-tertiary)" }}>Priorité</label>
            <select className="nf-input" value={priority} onChange={e => setPriority(e.target.value)}
              style={{}}>
              {Object.entries(PRIORITIES).map(([key, meta]) => (
                <option key={key} value={key}>{meta.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
          <label style={{ fontSize:12, color:"var(--nf-text-tertiary)" }}>Échéance</label>
          <DuePicker due={due} dueLabel={dueLabel} dueUrgent={dueUrgent} onChange={handleDueChange} />
        </div>
        <div style={{ display:"flex", gap:8, marginTop:4 }}>
          <button onClick={handleSave} className="nf-btn-primary" disabled={saving}>
            <i className="ti ti-device-floppy" aria-hidden="true" />
            {saving ? "Sauvegarde…" : "Sauvegarder"}
          </button>
          <button onClick={onClose} className="nf-btn-ghost">Annuler</button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete confirm ───────────────────────────────────────────────────────────
function DeleteConfirm({ note, onConfirm, onClose }) {
  const [deleting, setDeleting] = useState(false);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:100,
      display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"var(--nf-bg-primary)", border:`0.5px solid ${C.red.border}`,
        borderRadius:16, padding:"24px", width:380, maxWidth:"90vw",
        display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <i className="ti ti-trash" aria-hidden="true"
            style={{ fontSize:20, color:C.red.text }} />
          <div style={{ fontSize:15, fontWeight:500, color:"var(--nf-text-primary)" }}>
            Supprimer cette note ?
          </div>
        </div>
        <div style={{ fontSize:13, color:"var(--nf-text-secondary)", lineHeight:1.6 }}>
          « {note.title} »<br />
          Cette action est irréversible.
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={async () => { setDeleting(true); await onConfirm(note.id); }}
            className="nf-btn-danger" disabled={deleting}>
            <i className="ti ti-trash" aria-hidden="true" />
            {deleting ? "Suppression…" : "Supprimer"}
          </button>
          <button onClick={onClose} className="nf-btn-ghost">Annuler</button>
        </div>
      </div>
    </div>
  );
}

// ─── Category manager ─────────────────────────────────────────────────────────
function CategoryManager({ space, cats, onAdd, onDelete, onClose }) {
  const [label, setLabel]       = useState("");
  const [icon, setIcon]         = useState("ti-tag");
  const [color, setColor]       = useState("purple");
  const [adding, setAdding]     = useState(false);
  const [addError, setAddError] = useState(null);

  function slugify(s) {
    return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/[^a-z0-9]/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"");
  }

  async function handleAdd() {
    if (!label.trim()) return;
    setAddError(null);
    const key = slugify(label);
    if (cats[key]) { setAddError("Une catégorie avec ce nom existe déjà."); return; }
    setAdding(true);
    try {
      await onAdd({ key, label: label.trim(), icon, color });
      setLabel("");
    } catch(e) {
      setAddError(e.message || "Erreur lors de l\'ajout.");
    }
    setAdding(false);
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:100,
      display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"var(--nf-bg-primary)", border:"0.5px solid var(--nf-border)",
        borderRadius:16, padding:"24px", width:440, maxWidth:"90vw",
        display:"flex", flexDirection:"column", gap:16 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:15, fontWeight:500, color:"var(--nf-text-primary)" }}>
            Catégories · {space === "pro" ? "💼 Pro" : "🏠 Perso"}
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer",
            color:"var(--nf-text-tertiary)", fontSize:18, padding:"2px 6px" }}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        {/* Catégories existantes */}
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {Object.entries(cats).map(([key, meta]) => {
            const c = C[meta.color] || C.purple;
            return (
              <div key={key} style={{ display:"flex", alignItems:"center", gap:10,
                padding:"8px 12px", borderRadius:8, background:"var(--nf-bg-secondary)",
                border:"0.5px solid var(--nf-border)" }}>
                <span style={{ display:"inline-flex", alignItems:"center", gap:6,
                  fontSize:12, padding:"2px 9px", borderRadius:20, fontWeight:500,
                  background:c.bg, color:c.text }}>
                  <i className={`ti ${meta.icon}`} aria-hidden="true" style={{fontSize:12}} />
                  {meta.label}
                </span>
                <div style={{ flex:1 }} />
                <button onClick={() => onDelete(key, meta.id)}
                  style={{ background:"none", border:"none", cursor:"pointer",
                    color:"var(--nf-text-tertiary)", padding:"2px 4px", borderRadius:4 }}
                  title="Supprimer">
                  <i className="ti ti-trash" aria-hidden="true" style={{fontSize:14}} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Ajouter une catégorie */}
        <div style={{ borderTop:"0.5px solid var(--nf-border)", paddingTop:14,
          display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ fontSize:12, color:"var(--nf-text-tertiary)" }}>Nouvelle catégorie</div>
          <input className="nf-input" value={label} onChange={e => setLabel(e.target.value)}
            placeholder="Nom de la catégorie…" style={{ fontSize:13 }}
            onKeyDown={e => e.key === "Enter" && handleAdd()} />
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {ICON_OPTIONS.map(ic => (
              <button key={ic} onClick={() => setIcon(ic)} style={{
                width:32, height:32, borderRadius:8, border:"none", cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center",
                background: icon === ic ? "var(--nf-accent)" : "var(--nf-bg-secondary)",
                color:       icon === ic ? "#fff" : "var(--nf-text-secondary)",
                fontSize:15 }}>
                <i className={`ti ${ic}`} aria-hidden="true" />
              </button>
            ))}
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {COLOR_OPTIONS.map(({ key, label: cl }) => {
              const cv = C[key] || C.purple;
              return (
                <button key={key} onClick={() => setColor(key)} style={{
                  padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:500,
                  border: color === key ? `1.5px solid ${cv.text}` : "1.5px solid transparent",
                  background: cv.bg, color: cv.text, cursor:"pointer" }}>
                  {cl}
                </button>
              );
            })}
          </div>
          {addError && (
            <div style={{ padding:"8px 12px", background:"var(--nf-red-bg)",
              color:"var(--nf-red-text)", borderRadius:8, fontSize:12 }}>
              <i className="ti ti-alert-triangle" aria-hidden="true" style={{marginRight:6}} />
              {addError}
            </div>
          )}
          <button onClick={handleAdd} className="nf-btn-primary"
            disabled={adding || !label.trim()} style={{ alignSelf:"flex-start" }}>
            <i className="ti ti-plus" aria-hidden="true" />
            {adding ? "Ajout…" : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Note detail ──────────────────────────────────────────────────────────────
function NoteDetail({ note, cats, onClose, onMarkDone, onEdit, onDelete }) {
  return (
    <div style={{ position:"absolute", inset:0, background:"var(--nf-bg-primary)",
      display:"flex", flexDirection:"column", zIndex:10 }}>
      <div style={{ padding:"14px 18px", borderBottom:`0.5px solid var(--nf-border)`,
        display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
        <button onClick={onClose} className="nf-btn-ghost" style={{padding:"5px 11px"}}>
          <i className="ti ti-arrow-left" aria-hidden="true" /> Retour
        </button>
        <div style={{ flex:1 }} />
        <button onClick={() => onEdit(note)} className="nf-btn-ghost">
          <i className="ti ti-edit" aria-hidden="true" /> Modifier
        </button>
        <button onClick={() => onMarkDone(note.id)} className="nf-btn-ghost">
          <i className="ti ti-circle-check" aria-hidden="true" /> Marquer comme fait
        </button>
        <button onClick={() => onDelete(note)} className="nf-btn-danger">
          <i className="ti ti-trash" aria-hidden="true" /> Supprimer
        </button>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
          <div style={{ fontSize:18, fontWeight:500, color:"var(--nf-text-primary)",
            lineHeight:1.4, flex:1 }}>{note.title}</div>
          <SpacePill space={note.space} />
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:18, flexWrap:"wrap" }}>
          <Tag category={note.category} cats={cats} />
          <Prio priority={note.priority} />
          {note.dueLabel && <DueBadge label={note.dueLabel} urgent={note.dueUrgent} />}
          {note.isRecurring && <RecurringBadge recurrence={note.recurrence} />}
        </div>
        {note.isRecurring && note.done && note.nextDue && (
          <div style={{ marginBottom:16, padding:"10px 14px",
            background:"var(--nf-green-bg)", borderRadius:8,
            fontSize:13, color:"var(--nf-green-text)",
            display:"flex", alignItems:"center", gap:8 }}>
            <i className="ti ti-circle-check" aria-hidden="true" style={{fontSize:16}} />
            Fait · prochaine occurrence le {new Date(note.nextDue).toLocaleDateString("fr-FR",
              { weekday:"long", day:"numeric", month:"long" })}
          </div>
        )}
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
                style={{ color:"var(--nf-text-tertiary)", marginTop:1 }} />{a}
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
function ComposeView({ space, cats, onSave, onCatCreated }) {
  const [text, setText]           = useState("");
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrence, setRecurrence]   = useState("monthly");
  const taRef = useRef();

  useEffect(() => { taRef.current?.focus(); }, []);

  const catKeys = Object.keys(cats).join(" | ");

  async function analyze() {
    if (!text.trim()) { taRef.current?.focus(); return; }
    setLoading(true); setResult(null); setError(null);
    try {
      const resp = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          space,
          categories: Object.keys(cats),
        })
      });
      if (!resp.ok) throw new Error(`Erreur ${resp.status}`);
      setResult(await resp.json());
    } catch { setError("Impossible d'analyser la note. Vérifie ta connexion."); }
    setLoading(false);
  }

  async function handleSave() {
    const newNote = {
      ...result,
      raw:text,
      due: result.due || null,
      createdAt:new Date().toISOString(), done:false,
      id: USE_MOCK ? Date.now() : undefined, space,
      isRecurring, recurrence: isRecurring ? recurrence : null,
      recurrenceDay: recurrence === "monthly" ? 1 : null,
    };
    if (!USE_MOCK) { const saved = await createNote(newNote, space); onSave(saved); }
    else onSave(newNote);
    setText(""); setResult(null); setIsRecurring(false);
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
        <SpacePill space={space} />
        <span style={{ fontSize:12, color:"var(--nf-text-tertiary)" }}>
          La note sera créée dans l'espace {space === "pro" ? "professionnel" : "personnel"}
        </span>
      </div>
      <div style={{ background:"var(--nf-bg-secondary)", border:`0.5px solid var(--nf-border)`,
        borderRadius:12, padding:"14px 16px" }}>
        <textarea ref={taRef} value={text}
          onChange={e => { setText(e.target.value); setResult(null); }}
          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) analyze(); }}
          placeholder="Écris ta note librement… L'IA corrige, catégorise et priorise. ⌘↵ pour analyser"
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

        {/* Toggle récurrence */}
        <div style={{ marginTop:10, paddingTop:10,
          borderTop:"0.5px solid var(--nf-border)", display:"flex", alignItems:"center", gap:10 }}>
          <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer",
            fontSize:13, color:"var(--nf-text-secondary)", userSelect:"none" }}>
            <div onClick={() => setIsRecurring(v => !v)} style={{
              width:32, height:18, borderRadius:9, transition:"background 0.2s",
              background: isRecurring ? "var(--nf-accent)" : "var(--nf-border-hover)",
              position:"relative", flexShrink:0, cursor:"pointer" }}>
              <div style={{
                position:"absolute", top:2, left: isRecurring ? 16 : 2,
                width:14, height:14, borderRadius:"50%", background:"#fff",
                transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }} />
            </div>
            Tâche récurrente
          </label>
          {isRecurring && (
            <select className="nf-input" value={recurrence}
              onChange={e => setRecurrence(e.target.value)}
              style={{ fontSize:12, padding:"4px 10px", width:"auto" }}>
              <option value="daily">Quotidienne</option>
              <option value="weekly">Hebdomadaire</option>
              <option value="monthly">Mensuelle</option>
              <option value="yearly">Annuelle</option>
            </select>
          )}
        </div>
      </div>
      {loading && (
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0",
          fontSize:13, color:"var(--nf-accent)" }}>
          {[0,150,300].map(d => (
            <span key={d} style={{ width:6, height:6, borderRadius:"50%", background:"var(--nf-accent)",
              display:"inline-block", animation:"bounce 1.2s infinite", animationDelay:`${d}ms` }} />
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
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ fontSize:12, color:"var(--nf-text-tertiary)", flex:1 }}>
              Résultat de l'analyse — <span style={{ color:"var(--nf-accent)" }}>modifiable avant enregistrement</span>
            </div>
          </div>

          {/* Titre + corps éditables */}
          <div className="nf-card" style={{ cursor:"default", display:"flex", flexDirection:"column", gap:10 }}>

            {/* Saisie corrigée */}
            {result.corrected && (
              <div>
                <div style={{ fontSize:11, color:"var(--nf-text-tertiary)", marginBottom:5,
                  display:"flex", alignItems:"center", gap:4 }}>
                  <i className="ti ti-pencil-check" aria-hidden="true" style={{fontSize:13}} />
                  Ta saisie corrigée
                </div>
                <div style={{ fontSize:13, color:"var(--nf-text-secondary)", lineHeight:1.6,
                  padding:"8px 10px", background:"var(--nf-bg-secondary)",
                  borderRadius:6, fontStyle:"italic" }}>
                  {result.corrected}
                </div>
              </div>
            )}

            {/* Titre éditable */}
            <div>
              <div style={{ fontSize:11, color:"var(--nf-text-tertiary)", marginBottom:5,
                display:"flex", alignItems:"center", gap:4 }}>
                <i className="ti ti-check" aria-hidden="true" style={{fontSize:13}} />
                Version reformulée
              </div>
              <input
                className="nf-input"
                value={result.title}
                onChange={e => setResult(r => ({ ...r, title: e.target.value }))}
                style={{ fontSize:14, fontWeight:500, marginBottom:6 }}
                placeholder="Titre…"
              />
              <textarea
                className="nf-input"
                value={result.body}
                onChange={e => setResult(r => ({ ...r, body: e.target.value }))}
                rows={2}
                style={{ fontSize:13, resize:"vertical" }}
                placeholder="Corps de la note…"
              />
            </div>
          </div>

          {/* Catégorie + Priorité + Échéance éditables */}
          <div style={{ display:"flex", gap:8 }}>
            <div className="nf-card" style={{ flex:1, cursor:"default" }}>
              <div style={{ fontSize:11, color:"var(--nf-text-tertiary)", marginBottom:6 }}>Catégorie</div>
              <CategorySelect
                value={result.category}
                onChange={v => setResult(r => ({ ...r, category: v }))}
                cats={cats} onCatCreated={onCatCreated}
              />
            </div>
            <div className="nf-card" style={{ flex:1, cursor:"default" }}>
              <div style={{ fontSize:11, color:"var(--nf-text-tertiary)", marginBottom:6 }}>Priorité</div>
              <select
                className="nf-input"
                value={result.priority}
                onChange={e => setResult(r => ({ ...r, priority: e.target.value }))}
                style={{ fontSize:12, padding:"4px 8px" }}>
                {Object.entries(PRIORITIES).map(([key, meta]) => (
                  <option key={key} value={key}>{meta.label}</option>
                ))}
              </select>
            </div>
            <div className="nf-card" style={{ flex:1, cursor:"default" }}>
              <div style={{ fontSize:11, color:"var(--nf-text-tertiary)", marginBottom:6 }}>Échéance</div>
              <DuePicker
                due={result.due || null}
                dueLabel={result.dueLabel}
                dueUrgent={result.dueUrgent}
                onChange={({ due, dueLabel, dueUrgent }) =>
                  setResult(r => ({ ...r, due, dueLabel, dueUrgent }))}
              />
            </div>
          </div>

          {/* Actions éditables */}
          <div className="nf-card" style={{ cursor:"default" }}>
            <div style={{ fontSize:11, color:"var(--nf-text-tertiary)", marginBottom:8,
              display:"flex", alignItems:"center", gap:4 }}>
              <i className="ti ti-list-check" aria-hidden="true" style={{fontSize:13}} /> Actions suggérées
            </div>
            {result.actions?.map((a, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8,
                paddingTop: i > 0 ? 6 : 0 }}>
                <i className="ti ti-point" aria-hidden="true"
                  style={{ color:"var(--nf-text-tertiary)", fontSize:14, flexShrink:0 }} />
                <input
                  className="nf-input"
                  value={a}
                  onChange={e => setResult(r => ({
                    ...r,
                    actions: r.actions.map((ac, idx) => idx === i ? e.target.value : ac)
                  }))}
                  style={{ fontSize:13, padding:"5px 10px" }}
                />
              </div>
            ))}
          </div>

          <div style={{ display:"flex", gap:8 }}>
            <button onClick={handleSave} className="nf-btn-primary">
              <i className="ti ti-device-floppy" aria-hidden="true" /> Enregistrer
            </button>
            <button onClick={() => setResult(null)} className="nf-btn-ghost">
              <i className="ti ti-refresh" aria-hidden="true" /> Ré-analyser
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Today ────────────────────────────────────────────────────────────────────
function TodayView({ notes, cats, onNoteClick }) {
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
      {active.map(n => <NoteCard key={n.id} note={n} onClick={onNoteClick} cats={cats} showSpace />)}
    </div>
  );
}

// ─── Digest ───────────────────────────────────────────────────────────────────
function HomeView({ notes, user, onNav }) {
  const now    = new Date();
  const hour   = now.getHours();
  const prenom = user?.email?.split("@")[0]?.split(".")?.[0] ?? "";
  const prenom_cap = prenom.charAt(0).toUpperCase() + prenom.slice(1);

  const greeting = hour < 6  ? "Bonne nuit" :
                   hour < 12 ? "Bonjour" :
                   hour < 18 ? "Bon après-midi" : "Bonsoir";

  const dateStr = now.toLocaleDateString("fr-FR", {
    weekday:"long", day:"numeric", month:"long", year:"numeric"
  });
  const dateCapStr = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  const open     = notes.filter(n => !n.done);
  const urgent   = notes.filter(n => n.dueUrgent && !n.done);
  const dueToday = notes.filter(n => {
    if (n.done) return false;
    if (!n.due) return false;
    return n.due <= now.toISOString().split("T")[0];
  });
  const recurring = notes.filter(n => n.isRecurring && !n.done);
  const doneCount = notes.filter(n => n.done && !n.isRecurring).length;

  // Top 5 prioritaires
  const top = [...open]
    .sort((a,b) => {
      const po = {haute:0,moyenne:1,basse:2};
      if (a.dueUrgent !== b.dueUrgent) return a.dueUrgent ? -1 : 1;
      return po[a.priority] - po[b.priority];
    })
    .slice(0, 5);

  const statCards = [
    { n:open.length,     l:"À traiter",  icon:"ti-layout-list", c:"var(--nf-text-primary)" },
    { n:urgent.length,   l:"Urgentes",   icon:"ti-flame",       c:C.red.text,  bg:C.red.bg },
    { n:dueToday.length, l:"Dues aujourd'hui", icon:"ti-clock", c:C.amber.text, bg:C.amber.bg },
    { n:recurring.length,l:"Récurrentes",icon:"ti-refresh",     c:C.green.text, bg:C.green.bg },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24, maxWidth:640, padding:"4px 0" }}>

      {/* Header salutation */}
      <div>
        <div style={{ fontSize:24, fontWeight:500, color:"var(--nf-text-primary)",
          letterSpacing:"-0.5px", marginBottom:4 }}>
          {greeting}{prenom_cap ? `, ${prenom_cap}` : ""} 👋
        </div>
        <div style={{ fontSize:14, color:"var(--nf-text-tertiary)" }}>{dateCapStr}</div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
        {statCards.map(({ n, l, icon, c, bg }) => (
          <div key={l} style={{ background: bg || "var(--nf-bg-secondary)",
            border:`0.5px solid var(--nf-border)`, borderRadius:12, padding:"14px 14px 12px" }}>
            <i className={`ti ${icon}`} aria-hidden="true"
              style={{ fontSize:18, color:c, display:"block", marginBottom:8 }} />
            <div style={{ fontSize:26, fontWeight:500, color:c, lineHeight:1 }}>{n}</div>
            <div style={{ fontSize:11, color:c, opacity:0.8, marginTop:4 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Urgences */}
      {urgent.length > 0 && (
        <div>
          <div style={{ fontSize:12, fontWeight:500, color:C.red.text,
            display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
            <i className="ti ti-bell-ringing" aria-hidden="true" />
            {urgent.length} relance{urgent.length > 1 ? "s" : ""} urgente{urgent.length > 1 ? "s" : ""}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {urgent.map(n => (
              <div key={n.id} onClick={() => onNav("all")}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
                  background:C.red.bg, border:`0.5px solid ${C.red.border}`,
                  borderRadius:10, cursor:"pointer" }}>
                <i className="ti ti-alert-triangle" aria-hidden="true"
                  style={{ fontSize:15, color:C.red.text, flexShrink:0 }} />
                <div style={{ flex:1, fontSize:13, fontWeight:500, color:C.red.text }}>{n.title}</div>
                <div style={{ fontSize:11, color:C.red.text, opacity:0.8 }}>{n.dueLabel}</div>
                <SpacePill space={n.space} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* À faire */}
      <div>
        <div style={{ fontSize:12, fontWeight:500, color:"var(--nf-text-tertiary)",
          display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
          <span style={{ display:"flex", alignItems:"center", gap:6 }}>
            <i className="ti ti-list-check" aria-hidden="true" />
            {top.length > 0 ? `Les ${top.length} prochaines à traiter` : "Rien à traiter"}
          </span>
          {open.length > 5 && (
            <button onClick={() => onNav("all")}
              style={{ background:"none", border:"none", cursor:"pointer",
                fontSize:12, color:"var(--nf-accent)", fontFamily:"inherit" }}>
              Voir tout ({open.length}) →
            </button>
          )}
        </div>
        {top.length === 0 ? (
          <div style={{ textAlign:"center", padding:"32px 0",
            color:"var(--nf-text-tertiary)", fontSize:14 }}>
            <i className="ti ti-circle-check" aria-hidden="true"
              style={{ fontSize:36, display:"block", marginBottom:10,
                color:"var(--nf-green-text)" }} />
            Tout est à jour, bravo ! 🎉
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {top.map(n => (
              <div key={n.id} onClick={() => onNav("all")}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
                  background:"var(--nf-bg-primary)", border:`0.5px solid var(--nf-border)`,
                  borderRadius:10, cursor:"pointer", transition:"border-color 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor="var(--nf-border-hover)"}
                onMouseLeave={e => e.currentTarget.style.borderColor="var(--nf-border)"}>
                <Prio priority={n.priority} />
                <div style={{ flex:1, fontSize:13, fontWeight:500,
                  color:"var(--nf-text-primary)" }}>{n.title}</div>
                {n.isRecurring && <RecurringBadge recurrence={n.recurrence} />}
                {n.dueLabel && n.dueLabel !== "Pas d'échéance" && (
                  <span style={{ fontSize:11, color: n.dueUrgent ? C.red.text : "var(--nf-text-tertiary)",
                    display:"flex", alignItems:"center", gap:3, flexShrink:0 }}>
                    <i className="ti ti-clock" aria-hidden="true" style={{fontSize:12}} />
                    {n.dueLabel}
                  </span>
                )}
                <SpacePill space={n.space} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bouton nouvelle note */}
      <button onClick={() => onNav("compose")} className="nf-btn-primary"
        style={{ alignSelf:"flex-start", padding:"9px 18px", fontSize:14 }}>
        <i className="ti ti-plus" aria-hidden="true" /> Nouvelle note
      </button>
    </div>
  );
}

// ─── Right panel ──────────────────────────────────────────────────────────────
function RightPanel({ notes, space, cats }) {
  const spaceNotes = notes.filter(n => n.space === space);
  const upcoming = notes.filter(n => n.due && !n.done)
    .sort((a,b) => new Date(a.due)-new Date(b.due)).slice(0,4);
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
            { n:notes.filter(n=>!n.done).length,             l:"Total",        c:"var(--nf-text-primary)" },
            { n:notes.filter(n=>n.dueUrgent&&!n.done).length,l:"Urgentes",     c:C.red.text },
            { n:spaceNotes.filter(n=>!n.done).length,         l:space==="pro"?"Pro":"Perso", c:space==="pro"?"var(--nf-blue-text)":"var(--nf-purple-text)" },
            { n:notes.filter(n=>n.done).length,               l:"Complétées",  c:C.green.text },
          ].map(({ n, l, c }) => (
            <div key={l} style={{ background:"var(--nf-bg-primary)", borderRadius:8, padding:"9px 12px" }}>
              <div style={{ fontSize:22, fontWeight:500, color:c }}>{n}</div>
              <div style={{ fontSize:11, color:"var(--nf-text-tertiary)", marginTop:2 }}>{l}</div>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize:12, color:"var(--nf-text-tertiary)", marginBottom:8 }}>Prochaines échéances</div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {upcoming.length === 0 && (
              <div style={{ fontSize:12, color:"var(--nf-text-tertiary)" }}>Aucune échéance.</div>
            )}
            {upcoming.map(n => (
              <div key={n.id} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12,
                padding:"8px 10px", background:"var(--nf-bg-primary)", borderRadius:8,
                border:`0.5px solid ${n.dueUrgent ? C.red.border : "var(--nf-border)"}` }}>
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
          <div style={{ fontSize:12, color:"var(--nf-text-tertiary)", marginBottom:6 }}>
            Répartition ({space === "pro" ? "Pro" : "Perso"})
          </div>
          {Object.entries(cats).map(([key, meta]) => {
            const count = spaceNotes.filter(n => n.category === key).length;
            const pct = spaceNotes.length > 0 ? Math.round((count/spaceNotes.length)*100) : 0;
            const c = C[meta.color] || C.purple;
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
function Sidebar({ activeView, onNav, space, onSpaceChange, noteCount, urgentCount,
                   cats, onManageCats, user, theme, onToggleTheme }) {
  const nav = [
    { id:"home",  icon:"ti-home",        label:"Accueil" },
    { id:"all",     icon:"ti-layout-list", label:"Toutes les notes", badge:noteCount },
    { id:"today",   icon:"ti-sun",         label:"Aujourd'hui",      badge:urgentCount, urgent:true },
    { id:"compose", icon:"ti-plus",        label:"Nouvelle note" },
  ];
  return (
    <div style={{ width:210, borderRight:`0.5px solid var(--nf-border)`,
      background:"var(--nf-bg-secondary)", display:"flex", flexDirection:"column", flexShrink:0 }}>
      <div style={{ padding:"14px 14px 6px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div onClick={() => { setView("home"); setSelectedNote(null); }} style={{ fontSize:17, fontWeight:500, color:"var(--nf-text-primary)", letterSpacing:"-0.3px", cursor:"pointer" }}>
          Note<span style={{ color:"var(--nf-accent)" }}>Flow</span>
        </div>
        <button onClick={onToggleTheme} title={theme==="dark"?"Mode clair":"Mode sombre"}
          style={{ background:"none", border:"none", cursor:"pointer", padding:"4px 6px",
            color:"var(--nf-text-tertiary)", borderRadius:6 }}>
          <i className={`ti ${theme==="dark"?"ti-sun":"ti-moon"}`} aria-hidden="true" style={{fontSize:16}} />
        </button>
      </div>

      <SpaceSwitcher space={space} onChange={onSpaceChange} />

      <nav style={{ flex:1, padding:"4px 0", overflowY:"auto" }}>
        {nav.map(item => (
          <button key={item.id} onClick={() => onNav(item.id)}
            className={`nf-nav-btn${activeView===item.id?" active":""}`}>
            <i className={`ti ${item.icon}`} aria-hidden="true" style={{fontSize:15}} />
            {item.label}
            {item.badge > 0 && (
              <span style={{ marginLeft:"auto", fontSize:11, padding:"1px 7px", borderRadius:20, fontWeight:500,
                background: item.urgent ? C.red.bg : "var(--nf-accent-subtle)",
                color: item.urgent ? C.red.text : "var(--nf-accent)" }}>
                {item.badge}
              </span>
            )}
          </button>
        ))}

        <div style={{ padding:"12px 14px 4px", display:"flex", alignItems:"center",
          justifyContent:"space-between" }}>
          <span style={{ fontSize:11, color:"var(--nf-text-tertiary)",
            letterSpacing:"0.5px", textTransform:"uppercase" }}>
            Catégories
          </span>
          <button onClick={onManageCats} title="Gérer les catégories"
            style={{ background:"none", border:"none", cursor:"pointer",
              color:"var(--nf-text-tertiary)", padding:"2px 4px", borderRadius:4,
              display:"flex", alignItems:"center" }}>
            <i className="ti ti-settings" aria-hidden="true" style={{fontSize:13}} />
          </button>
        </div>
        {Object.entries(cats).map(([key, meta]) => (
          <button key={key} onClick={() => onNav(`cat:${key}`)}
            className={`nf-nav-btn${activeView===`cat:${key}`?" active":""}`}>
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
  const [allNotes, setAllNotes]         = useState([]);
  const [view, setView]                 = useState("home");
  const [space, setSpace]               = useState("pro");
  const [cats, setCats]                 = useState({});
  const [selectedNote, setSelectedNote] = useState(null);
  const [editNote, setEditNote]         = useState(null);
  const [deleteNote_, setDeleteNote]    = useState(null);
  const [showCatMgr, setShowCatMgr]     = useState(false);
  const [search, setSearch]             = useState("");
  const [filterStatus, setFilterStatus] = useState("active"); // "active" | "done" | "all"
  const [filterPriority, setFilterPriority] = useState("all"); // "all" | "haute" | "moyenne" | "basse"
  const [filterRecurring, setFilterRecurring] = useState(false);
  const [user, setUser]                 = useState(USE_MOCK ? { email:"demo@noteflow.app" } : null);
  const [loading, setLoading]           = useState(!USE_MOCK);
  const [theme, setTheme]               = useState(() => getInitialTheme());

  useEffect(() => {
    if (!document.getElementById("nf-global-css")) {
      const s = document.createElement("style");
      s.id = "nf-global-css"; s.textContent = GLOBAL_CSS;
      document.head.appendChild(s);
    }
  }, []);

  useEffect(() => { applyTheme(theme); }, [theme]);

  // Charger les notes + catégories selon l'espace actif
  useEffect(() => {
    if (USE_MOCK) {
      setAllNotes(MOCK_NOTES);
      setCats({});
      return;
    }
    if (!user) return;
    fetchNotes().then(notes => {
      const today = new Date().toISOString().split("T")[0];
      // Reset auto des récurrentes dont la prochaine occurrence est arrivée
      notes.forEach(n => {
        if (n.isRecurring && n.done && n.nextDue && n.nextDue <= today) {
          resetRecurring(n.id);
          n.done = false; n.doneAt = null; n.nextDue = null;
        }
      });
      setAllNotes(notes);
    });
    fetchCategories(space).then(c => { setCats(c); setCategories(c); });
  }, [space, user]);

  useEffect(() => {
    if (USE_MOCK) return;
    const { data: { subscription } } = onAuthChange(u => {
      setUser(u); setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  function handleSpaceChange(s) {
    setSpace(s);
    setView(v => v === "home" ? "home" : "all");
    setSelectedNote(null); setSearch("");
  }

  async function handleMarkDone(id) {
    const note = allNotes.find(n => n.id === id);
    if (!USE_MOCK) await markNoteDone(id, note);

    if (note?.isRecurring && note?.recurrence) {
      const nextDue = calcNextDue(new Date(), note.recurrence, note.recurrenceDay);
      setAllNotes(prev => prev.map(n => n.id===id
        ? { ...n, done:true, doneAt:new Date().toISOString(), nextDue }
        : n));
    } else {
      setAllNotes(prev => prev.map(n => n.id===id ? { ...n, done:true } : n));
    }
    setSelectedNote(null);
  }

  async function handleEdit(id, fields) {
    if (!USE_MOCK) {
      const updated = await updateNote(id, fields);
      setAllNotes(prev => prev.map(n => n.id===id ? updated : n));
    } else {
      setAllNotes(prev => prev.map(n => n.id===id ? { ...n, ...fields } : n));
    }
    setEditNote(null);
    setSelectedNote(null);
  }

  async function handleDelete(id) {
    if (!USE_MOCK) await deleteNote(id);
    setAllNotes(prev => prev.filter(n => n.id !== id));
    setDeleteNote(null); setSelectedNote(null);
  }

  async function handleAddCategory(catData) {
    if (!USE_MOCK) {
      await createCategory(space, catData);
      const updated = await fetchCategories(space);
      setCats(updated); setCategories(updated);
    } else {
      setCats(prev => ({ ...prev, [catData.key]: catData }));
    }
  }

  async function handleDeleteCategory(key, id) {
    if (!USE_MOCK && id) await deleteCategory(id);
    setCats(prev => { const c = { ...prev }; delete c[key]; return c; });
  }

  function handleSave(newNote) {
    setAllNotes(prev => [newNote, ...prev]);
    setView("all");
  }

  if (loading) return null;
  if (!USE_MOCK && !user) return <AuthScreen />;

  // Notes filtrées selon l'espace actif (sauf today/digest qui montrent tout)
  const spaceNotes = allNotes.filter(n => n.space === space);
  const isCat = view.startsWith("cat:");
  const baseNotes = view === "today" ? allNotes : spaceNotes;

  const filtered = baseNotes
    .filter(n => {
      // Filtre catégorie
      if (isCat && n.category !== view.slice(4)) return false;
      // Filtre statut
      if (filterStatus === "active") return !n.done || (n.isRecurring && n.done);
      if (filterStatus === "done")   return n.done && !n.isRecurring;
      return true; // "all"
    })
    .filter(n => !search.trim() || [n.title,n.body].join(" ").toLowerCase().includes(search.toLowerCase()))
    .filter(n => filterPriority === "all" || n.priority === filterPriority)
    .filter(n => !filterRecurring || n.isRecurring)
    .sort((a,b) => {
      // Notes faites (non récurrentes) → tout en bas
      if (a.done && !a.isRecurring && !(b.done && !b.isRecurring)) return 1;
      if (b.done && !b.isRecurring && !(a.done && !a.isRecurring)) return -1;
      // Récurrentes faites → avant les notes faites, après les actives
      if (a.done && a.isRecurring && !(b.done)) return 1;
      if (b.done && b.isRecurring && !(a.done)) return -1;
      return ({haute:0,moyenne:1,basse:2})[a.priority] - ({haute:0,moyenne:1,basse:2})[b.priority];
    });

  const isCatView = view==="all" || isCat;

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden",
      background:"var(--nf-bg-tertiary)", color:"var(--nf-text-primary)",
      transition:"background 0.2s, color 0.2s" }}>

      <Sidebar
        activeView={view} onNav={id => { setView(id); setSelectedNote(null); setSearch(""); setFilterStatus("active"); setFilterPriority("all"); setFilterRecurring(false); }}
        space={space} onSpaceChange={handleSpaceChange}
        noteCount={spaceNotes.filter(n=>!n.done).length}
        urgentCount={allNotes.filter(n=>n.dueUrgent&&!n.done).length}
        cats={cats} onManageCats={() => setShowCatMgr(true)}
        user={user} theme={theme} onToggleTheme={() => setTheme(t => t==="light"?"dark":"light")}
      />

      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden",
        background:"var(--nf-bg-primary)", transition:"background 0.2s" }}>
        <div style={{ padding:"12px 20px", borderBottom:`0.5px solid var(--nf-border)`,
          display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
          <div style={{ fontSize:15, fontWeight:500, color:"var(--nf-text-primary)", flex:1 }}>
            {isCat ? cats[view.slice(4)]?.label || view.slice(4) : VIEW_TITLES[view] || "Notes"}
          </div>
          {isCatView && (
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              {/* Recherche */}
              <div style={{ display:"flex", alignItems:"center", gap:8,
                background:"var(--nf-bg-secondary)", border:`0.5px solid var(--nf-border)`,
                borderRadius:8, padding:"6px 12px" }}>
                <i className="ti ti-search" aria-hidden="true"
                  style={{ fontSize:14, color:"var(--nf-text-tertiary)" }} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher…" style={{ background:"none", border:"none",
                    outline:"none", fontSize:13, color:"var(--nf-text-primary)", width:130 }} />
                {search && (
                  <button onClick={() => setSearch("")} style={{ background:"none", border:"none",
                    cursor:"pointer", color:"var(--nf-text-tertiary)", padding:0, lineHeight:1 }}>
                    <i className="ti ti-x" style={{fontSize:13}} />
                  </button>
                )}
              </div>

              {/* Statut */}
              <div style={{ display:"flex", borderRadius:8, overflow:"hidden",
                border:`0.5px solid var(--nf-border)` }}>
                {[
                  { v:"active", label:"À faire" },
                  { v:"done",   label:"Faites"  },
                  { v:"all",    label:"Tout"    },
                ].map(({ v, label }) => (
                  <button key={v} onClick={() => setFilterStatus(v)} style={{
                    padding:"6px 12px", fontSize:12, border:"none", cursor:"pointer",
                    background: filterStatus===v ? "var(--nf-accent)" : "var(--nf-bg-secondary)",
                    color:       filterStatus===v ? "#fff" : "var(--nf-text-secondary)",
                    fontFamily:"inherit", transition:"background 0.15s" }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Priorité */}
              <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
                style={{ padding:"6px 10px", fontSize:12, borderRadius:8, border:`0.5px solid var(--nf-border)`,
                  background:"var(--nf-bg-secondary)", color:"var(--nf-text-secondary)",
                  cursor:"pointer", fontFamily:"inherit" }}>
                <option value="all">Toutes priorités</option>
                <option value="haute">🔥 Haute</option>
                <option value="moyenne">— Moyenne</option>
                <option value="basse">↓ Basse</option>
              </select>

              {/* Récurrentes seulement */}
              <button onClick={() => setFilterRecurring(v => !v)} style={{
                padding:"6px 11px", fontSize:12, borderRadius:8, border:`0.5px solid var(--nf-border)`,
                cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s",
                background: filterRecurring ? "var(--nf-green-bg)" : "var(--nf-bg-secondary)",
                color:       filterRecurring ? "var(--nf-green-text)" : "var(--nf-text-secondary)" }}>
                <i className="ti ti-refresh" aria-hidden="true" style={{marginRight:4, fontSize:12}} />
                Récurrentes
              </button>
            </div>
          )}
          <button onClick={() => { setView("compose"); setSelectedNote(null); }}
            className="nf-btn-primary">
            <i className="ti ti-plus" aria-hidden="true" /> Nouvelle note
          </button>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"16px 20px", position:"relative" }}>
          {selectedNote && (
            <NoteDetail note={selectedNote} cats={cats}
              onClose={() => setSelectedNote(null)}
              onMarkDone={handleMarkDone}
              onEdit={n => setEditNote(n)}
              onDelete={n => setDeleteNote(n)} />
          )}
          {view === "compose" && (
            <ComposeView space={space} cats={cats} onSave={handleSave} onCatCreated={handleAddCategory} />
          )}
          {isCatView && !selectedNote && (
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
                    {filtered.length} note{filtered.length>1?"s":""} · triées par priorité
                  </div>
                  {filtered.map(n => <NoteCard key={n.id} note={n} onClick={setSelectedNote} cats={cats} />)}
                </>
              )}
            </div>
          )}
          {view === "today" && !selectedNote && (
            <TodayView notes={allNotes} cats={cats} onNoteClick={setSelectedNote} />
          )}
          {view === "home" && !selectedNote && <HomeView notes={allNotes} user={user} onNav={id => { setView(id); setSelectedNote(null); setSearch(""); }} />}
        </div>
      </div>

      <RightPanel notes={allNotes} space={space} cats={cats} />

      {editNote && (
        <EditModal note={editNote} cats={cats}
          onSave={handleEdit} onClose={() => setEditNote(null)}
          onCatCreated={handleAddCategory} />
      )}
      {deleteNote_ && (
        <DeleteConfirm note={deleteNote_}
          onConfirm={handleDelete} onClose={() => setDeleteNote(null)} />
      )}
      {showCatMgr && (
        <CategoryManager space={space} cats={cats}
          onAdd={handleAddCategory}
          onDelete={handleDeleteCategory}
          onClose={() => setShowCatMgr(false)} />
      )}
    </div>
  );
}
