import { useState, useRef, useEffect } from "react";
import { MOCK_NOTES, CATEGORIES, PRIORITIES } from "./data/mockNotes";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  purple: { bg: "#EEEDFE", text: "#534AB7", border: "#AFA9EC", dark: "#3C3489" },
  teal:   { bg: "#E1F5EE", text: "#0F6E56", border: "#5DCAA5", dark: "#085041" },
  blue:   { bg: "#E6F1FB", text: "#185FA5", border: "#85B7EB", dark: "#0C447C" },
  amber:  { bg: "#FAEEDA", text: "#854F0B", border: "#EF9F27", dark: "#633806" },
  red:    { bg: "#FCEBEB", text: "#A32D2D", border: "#F09595", dark: "#791F1F" },
  green:  { bg: "#EAF3DE", text: "#3B6D11", border: "#97C459", dark: "#27500A" },
};

// ─── Reusable atoms ───────────────────────────────────────────────────────────
function Tag({ category }) {
  const meta = CATEGORIES[category];
  const c = T[meta.color];
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:11,
      padding:"2px 8px", borderRadius:20, fontWeight:500,
      background:c.bg, color:c.text }}>
      <i className={`ti ${meta.icon}`} aria-hidden="true" style={{fontSize:12}} />
      {meta.label}
    </span>
  );
}

function Prio({ priority }) {
  const meta = PRIORITIES[priority];
  const c = T[meta.color];
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:11,
      padding:"2px 8px", borderRadius:20, fontWeight:500,
      background:c.bg, color:c.text }}>
      {priority === "haute" && <i className={`ti ${meta.icon}`} aria-hidden="true" style={{fontSize:12}} />}
      {meta.label}
    </span>
  );
}

function DueBadge({ label, urgent }) {
  return (
    <span style={{ marginLeft:"auto", display:"inline-flex", alignItems:"center", gap:3,
      fontSize:11, color: urgent ? T.red.text : "#888" }}>
      <i className="ti ti-clock" aria-hidden="true" style={{fontSize:13}} />
      {label}
    </span>
  );
}

function NoteCard({ note, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={() => onClick(note)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "var(--color-background-primary)",
        border: `0.5px solid ${hovered ? "var(--color-border-secondary)" : "var(--color-border-tertiary)"}`,
        borderRadius: 12, padding: "11px 14px", cursor: "pointer",
        transition: "border-color 0.15s",
      }}
    >
      <div style={{ fontSize:14, fontWeight:500, color:"var(--color-text-primary)",
        marginBottom:5, lineHeight:1.4 }}>
        {note.title}
      </div>
      <div style={{ fontSize:13, color:"var(--color-text-secondary)",
        lineHeight:1.5, marginBottom:8 }}>
        {note.body}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap" }}>
        <Tag category={note.category} />
        <Prio priority={note.priority} />
        <DueBadge label={note.dueLabel} urgent={note.dueUrgent} />
      </div>
    </div>
  );
}

// ─── Note detail panel ────────────────────────────────────────────────────────
function NoteDetail({ note, onClose, onMarkDone }) {
  const catMeta = CATEGORIES[note.category];
  const priMeta = PRIORITIES[note.priority];
  const cc = T[catMeta.color];
  return (
    <div style={{
      position:"absolute", inset:0, background:"var(--color-background-primary)",
      display:"flex", flexDirection:"column", zIndex:10,
    }}>
      <div style={{ padding:"14px 18px", borderBottom:"0.5px solid var(--color-border-tertiary)",
        display:"flex", alignItems:"center", gap:10 }}>
        <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer",
          color:"var(--color-text-secondary)", display:"flex", alignItems:"center", gap:5, fontSize:13 }}>
          <i className="ti ti-arrow-left" aria-hidden="true" /> Retour
        </button>
        <div style={{ flex:1 }} />
        <button onClick={() => onMarkDone(note.id)} style={{
          display:"inline-flex", alignItems:"center", gap:6, padding:"6px 13px",
          fontSize:13, borderRadius:8, border:"0.5px solid var(--color-border-secondary)",
          background:"var(--color-background-primary)", color:"var(--color-text-primary)", cursor:"pointer" }}>
          <i className="ti ti-circle-check" aria-hidden="true" /> Marquer comme fait
        </button>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>
        <div style={{ fontSize:18, fontWeight:500, color:"var(--color-text-primary)",
          marginBottom:14, lineHeight:1.4 }}>
          {note.title}
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:18, flexWrap:"wrap" }}>
          <Tag category={note.category} />
          <Prio priority={note.priority} />
          {note.due && <DueBadge label={note.dueLabel} urgent={note.dueUrgent} />}
        </div>
        <div style={{ fontSize:14, color:"var(--color-text-secondary)",
          lineHeight:1.7, marginBottom:20 }}>
          {note.body}
        </div>
        <div style={{ background:"var(--color-background-secondary)",
          border:"0.5px solid var(--color-border-tertiary)", borderRadius:10, padding:"14px 16px",
          marginBottom:16 }}>
          <div style={{ fontSize:11, color:"var(--color-text-tertiary)", marginBottom:8,
            display:"flex", alignItems:"center", gap:4 }}>
            <i className="ti ti-list-check" aria-hidden="true" style={{fontSize:13}} />
            Actions suggérées par l'IA
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {note.actions.map((a, i) => (
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:8,
                fontSize:13, color:"var(--color-text-primary)" }}>
                <i className="ti ti-point" aria-hidden="true"
                  style={{ fontSize:14, color:"var(--color-text-tertiary)", marginTop:1 }} />
                {a}
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontSize:12, color:"var(--color-text-tertiary)" }}>
          Note saisie le {new Date(note.createdAt).toLocaleDateString("fr-FR",
            { day:"numeric", month:"long", year:"numeric" })}
        </div>
      </div>
    </div>
  );
}

// ─── Compose view ─────────────────────────────────────────────────────────────
function ComposeView({ onSave }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const taRef = useRef();

  useEffect(() => { taRef.current?.focus(); }, []);

  async function analyze() {
    if (!text.trim()) { taRef.current?.focus(); return; }
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `Tu es l'IA de l'application NoteFlow. Analyse cette note saisie librement et retourne UNIQUEMENT un objet JSON valide, sans balises markdown, sans commentaires.

Note brute : "${text}"

Retourne exactement ce format JSON :
{
  "title": "titre court et précis (max 10 mots)",
  "body": "note corrigée, reformulée de manière professionnelle (2-3 phrases max)",
  "category": "mission | client | reunion | idee",
  "priority": "haute | moyenne | basse",
  "dueLabel": "Aujourd'hui | Demain | Cette semaine | Ce mois | Pas d'échéance",
  "dueUrgent": true/false,
  "actions": ["action 1", "action 2", "action 3"]
}`
          }]
        })
      });
      const data = await resp.json();
      const raw = data.content?.find(b => b.type === "text")?.text || "";
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
    } catch (e) {
      setError("Impossible d'analyser la note. Vérifie ta connexion.");
    }
    setLoading(false);
  }

  function handleSave() {
    const newNote = {
      id: Date.now(),
      ...result,
      raw: text,
      due: null,
      createdAt: new Date().toISOString(),
      done: false,
    };
    onSave(newNote);
    setText("");
    setResult(null);
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ background:"var(--color-background-secondary)",
        border:"0.5px solid var(--color-border-tertiary)", borderRadius:12, padding:"14px 16px" }}>
        <textarea
          ref={taRef}
          value={text}
          onChange={e => { setText(e.target.value); setResult(null); }}
          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) analyze(); }}
          placeholder="Écris ta note librement... ex : «&nbsp;faut rappeler lucas sur le planning de juillet avant vendredi, c'est urgent&nbsp;»"
          rows={4}
          style={{ width:"100%", background:"transparent", border:"none", outline:"none",
            fontSize:14, fontFamily:"inherit", color:"var(--color-text-primary)",
            resize:"none", lineHeight:1.6, minHeight:80 }}
        />
        <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:10 }}>
          <span style={{ fontSize:12, color:"var(--color-text-tertiary)", flex:1 }}>
            L'IA corrige, catégorise et priorise automatiquement · ⌘↵ pour analyser
          </span>
          <button onClick={analyze} disabled={loading || !text.trim()} style={{
            display:"inline-flex", alignItems:"center", gap:6, padding:"7px 15px",
            fontSize:13, borderRadius:8, border:"none", cursor: !text.trim() ? "not-allowed" : "pointer",
            background: !text.trim() ? "var(--color-background-secondary)" : "#534AB7",
            color: !text.trim() ? "var(--color-text-tertiary)" : "#fff",
            transition:"background 0.15s" }}>
            <i className="ti ti-sparkles" aria-hidden="true" />
            {loading ? "Analyse…" : "Analyser"}
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 0",
          fontSize:13, color:"#7F77DD" }}>
          <div style={{ display:"flex", gap:4 }}>
            {[0,150,300].map(d => (
              <span key={d} style={{ width:6, height:6, borderRadius:"50%", background:"#7F77DD",
                animation:"bounce 1.2s infinite", animationDelay:`${d}ms`,
                display:"inline-block" }} />
            ))}
          </div>
          Analyse en cours…
          <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>
        </div>
      )}

      {error && (
        <div style={{ padding:"10px 14px", background:T.red.bg, color:T.red.text,
          borderRadius:8, fontSize:13 }}>
          <i className="ti ti-alert-triangle" aria-hidden="true" style={{marginRight:6}} />
          {error}
        </div>
      )}

      {result && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ fontSize:12, color:"var(--color-text-tertiary)" }}>Résultat de l'analyse</div>

          <div style={{ background:"var(--color-background-primary)",
            border:"0.5px solid var(--color-border-tertiary)", borderRadius:12, padding:"14px 16px" }}>
            <div style={{ fontSize:11, color:"var(--color-text-tertiary)", marginBottom:8,
              display:"flex", alignItems:"center", gap:4 }}>
              <i className="ti ti-check" aria-hidden="true" style={{fontSize:13}} /> Note reformulée
            </div>
            <div style={{ fontSize:15, fontWeight:500, color:"var(--color-text-primary)",
              marginBottom:6 }}>{result.title}</div>
            <div style={{ fontSize:13, color:"var(--color-text-secondary)",
              lineHeight:1.6 }}>{result.body}</div>
          </div>

          <div style={{ display:"flex", gap:8 }}>
            {[
              { label:"Catégorie", val:<Tag category={result.category} /> },
              { label:"Priorité",  val:<Prio priority={result.priority} /> },
              { label:"Échéance",  val:<DueBadge label={result.dueLabel} urgent={result.dueUrgent} /> },
            ].map(({ label, val }) => (
              <div key={label} style={{ flex:1, background:"var(--color-background-primary)",
                border:"0.5px solid var(--color-border-tertiary)", borderRadius:10, padding:"10px 13px" }}>
                <div style={{ fontSize:11, color:"var(--color-text-tertiary)", marginBottom:6 }}>{label}</div>
                <div>{val}</div>
              </div>
            ))}
          </div>

          <div style={{ background:"var(--color-background-primary)",
            border:"0.5px solid var(--color-border-tertiary)", borderRadius:12, padding:"14px 16px" }}>
            <div style={{ fontSize:11, color:"var(--color-text-tertiary)", marginBottom:8,
              display:"flex", alignItems:"center", gap:4 }}>
              <i className="ti ti-list-check" aria-hidden="true" style={{fontSize:13}} /> Actions suggérées
            </div>
            {result.actions?.map((a, i) => (
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:8,
                fontSize:13, color:"var(--color-text-primary)", paddingTop: i > 0 ? 6 : 0 }}>
                <i className="ti ti-point" aria-hidden="true"
                  style={{ color:"var(--color-text-tertiary)", marginTop:1 }} />
                {a}
              </div>
            ))}
          </div>

          <div style={{ display:"flex", gap:8 }}>
            <button onClick={handleSave} style={{
              display:"inline-flex", alignItems:"center", gap:6, padding:"8px 16px",
              fontSize:13, borderRadius:8, border:"none", cursor:"pointer",
              background:"#534AB7", color:"#fff" }}>
              <i className="ti ti-device-floppy" aria-hidden="true" /> Enregistrer la note
            </button>
            <button onClick={() => setResult(null)} style={{
              display:"inline-flex", alignItems:"center", gap:6, padding:"8px 14px",
              fontSize:13, borderRadius:8, border:"0.5px solid var(--color-border-secondary)",
              background:"var(--color-background-primary)", color:"var(--color-text-primary)",
              cursor:"pointer" }}>
              <i className="ti ti-refresh" aria-hidden="true" /> Modifier
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Today view ───────────────────────────────────────────────────────────────
function TodayView({ notes, onNoteClick }) {
  const urgent = notes.filter(n => n.dueUrgent && !n.done);
  const today = notes.filter(n => !n.done && n.priority !== "basse");
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {urgent.length > 0 && (
        <div style={{ background:T.red.bg, border:`0.5px solid ${T.red.border}`,
          borderRadius:12, padding:"14px 16px" }}>
          <div style={{ fontSize:13, fontWeight:500, color:T.red.dark,
            marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
            <i className="ti ti-bell-ringing" aria-hidden="true" /> Relances urgentes
          </div>
          {urgent.map(n => (
            <div key={n.id} style={{ display:"flex", alignItems:"center", gap:8,
              fontSize:12, color:T.red.text, paddingTop:4 }}>
              <i className="ti ti-alert-triangle" aria-hidden="true" style={{fontSize:14}} />
              {n.title} — {n.dueLabel.toLowerCase()}
            </div>
          ))}
        </div>
      )}
      <div style={{ fontSize:12, color:"var(--color-text-tertiary)" }}>À traiter aujourd'hui</div>
      {today.map(n => <NoteCard key={n.id} note={n} onClick={onNoteClick} />)}
    </div>
  );
}

// ─── Digest view ──────────────────────────────────────────────────────────────
function DigestView({ notes }) {
  const total = notes.length;
  const urgentes = notes.filter(n => n.dueUrgent && !n.done).length;
  const done = notes.filter(n => n.done).length;
  const hauteOpen = notes.filter(n => n.priority === "haute" && !n.done);

  const sorted = [...notes].filter(n => !n.done).sort((a, b) => {
    const po = { haute:0, moyenne:1, basse:2 };
    return po[a.priority] - po[b.priority];
  }).slice(0, 3);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ background:T.purple.bg, border:`0.5px solid ${T.purple.border}`,
        borderRadius:12, padding:"14px 16px" }}>
        <div style={{ fontSize:13, fontWeight:500, color:T.purple.dark,
          marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
          <i className="ti ti-sun" aria-hidden="true" />
          Récap du {new Date().toLocaleDateString("fr-FR",
            { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
        </div>
        {[
          { icon:"ti-layout-list", label:`${total} notes au total` },
          { icon:"ti-flame", label:`${urgentes} urgence${urgentes > 1 ? "s" : ""} en attente` },
          { icon:"ti-circle-check", label:`${done} note${done > 1 ? "s" : ""} complétée${done > 1 ? "s" : ""}` },
        ].map(({ icon, label }) => (
          <div key={label} style={{ display:"flex", alignItems:"center", gap:8,
            fontSize:12, color:T.purple.text, paddingTop:4 }}>
            <i className={`ti ${icon}`} aria-hidden="true" style={{fontSize:14, color:"#7F77DD"}} />
            {label}
          </div>
        ))}
      </div>
      <div style={{ fontSize:12, color:"var(--color-text-tertiary)" }}>Ce que l'IA te suggère de faire en premier</div>
      {sorted.map((n, i) => (
        <div key={n.id} style={{ background:"var(--color-background-primary)",
          border:"0.5px solid var(--color-border-tertiary)", borderRadius:12, padding:"11px 14px" }}>
          <div style={{ fontSize:13, fontWeight:500, color:"var(--color-text-primary)",
            marginBottom:4 }}>{i + 1} · {n.title}</div>
          <div style={{ fontSize:12, color:"var(--color-text-secondary)" }}>{n.actions[0]}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Right panel ──────────────────────────────────────────────────────────────
function RightPanel({ notes }) {
  const total = notes.length;
  const urgentes = notes.filter(n => n.dueUrgent && !n.done).length;
  const semaine = notes.filter(n => {
    if (!n.createdAt) return false;
    const d = new Date(n.createdAt);
    const now = new Date();
    return (now - d) / 86400000 <= 7;
  }).length;
  const done = notes.filter(n => n.done).length;

  const upcoming = notes
    .filter(n => n.due && !n.done)
    .sort((a, b) => new Date(a.due) - new Date(b.due))
    .slice(0, 4);

  return (
    <div style={{ width:230, borderLeft:"0.5px solid var(--color-border-tertiary)",
      background:"var(--color-background-secondary)", display:"flex",
      flexDirection:"column", flexShrink:0, overflow:"hidden" }}>
      <div style={{ padding:"13px 15px 10px", borderBottom:"0.5px solid var(--color-border-tertiary)",
        fontSize:13, fontWeight:500, color:"var(--color-text-primary)",
        display:"flex", alignItems:"center", gap:6 }}>
        <i className="ti ti-chart-bar" aria-hidden="true" style={{fontSize:15}} /> Vue d'ensemble
      </div>
      <div style={{ padding:"14px 15px", flex:1, overflowY:"auto", display:"flex",
        flexDirection:"column", gap:12 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {[
            { n: total,    l: "Notes",        c: "var(--color-text-primary)" },
            { n: urgentes, l: "Urgentes",     c: T.red.text },
            { n: semaine,  l: "Cette semaine",c: "var(--color-text-primary)" },
            { n: done,     l: "Complétées",   c: T.green.text },
          ].map(({ n, l, c }) => (
            <div key={l} style={{ background:"var(--color-background-primary)",
              borderRadius:8, padding:"9px 12px" }}>
              <div style={{ fontSize:22, fontWeight:500, color:c }}>{n}</div>
              <div style={{ fontSize:11, color:"var(--color-text-tertiary)", marginTop:2 }}>{l}</div>
            </div>
          ))}
        </div>

        <div>
          <div style={{ fontSize:12, color:"var(--color-text-tertiary)", marginBottom:8 }}>
            Prochaines échéances
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {upcoming.map(n => (
              <div key={n.id} style={{ display:"flex", alignItems:"center", gap:8,
                fontSize:12, padding:"8px 10px", background:"var(--color-background-primary)",
                borderRadius:8, border:`0.5px solid ${n.dueUrgent ? T.red.border : "var(--color-border-tertiary)"}` }}>
                <i className="ti ti-clock" aria-hidden="true"
                  style={{ fontSize:14, color: n.dueUrgent ? T.red.text : "var(--color-text-tertiary)" }} />
                <div style={{ flex:1, color:"var(--color-text-primary)",
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {n.title}
                </div>
                <div style={{ color: n.dueUrgent ? T.red.text : "var(--color-text-secondary)",
                  fontWeight: n.dueUrgent ? 500 : 400, whiteSpace:"nowrap" }}>
                  {n.dueLabel}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize:12, color:"var(--color-text-tertiary)", marginBottom:6 }}>
            Répartition
          </div>
          {Object.entries(CATEGORIES).map(([key, meta]) => {
            const count = notes.filter(n => n.category === key).length;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const c = T[meta.color];
            return (
              <div key={key} style={{ display:"flex", alignItems:"center", gap:8,
                marginBottom:6 }}>
                <i className={`ti ${meta.icon}`} aria-hidden="true"
                  style={{ fontSize:13, color:c.text, width:16 }} />
                <div style={{ flex:1 }}>
                  <div style={{ height:4, background:"var(--color-background-primary)",
                    borderRadius:4, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${pct}%`,
                      background:c.text, borderRadius:4, transition:"width 0.4s" }} />
                  </div>
                </div>
                <div style={{ fontSize:11, color:"var(--color-text-tertiary)",
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
function Sidebar({ activeView, onNav, noteCount, urgentCount }) {
  const navItems = [
    { id:"all",     icon:"ti-layout-list", label:"Toutes les notes", badge: noteCount },
    { id:"today",   icon:"ti-sun",         label:"Aujourd'hui",      badge: urgentCount, urgent: true },
    { id:"digest",  icon:"ti-newspaper",   label:"Récap du jour",    badge: null },
    { id:"compose", icon:"ti-plus",        label:"Nouvelle note",    badge: null },
  ];

  const catItems = Object.entries(CATEGORIES).map(([key, meta]) => ({
    id: `cat:${key}`, icon: meta.icon, label: meta.label,
    badge: null, color: T[meta.color].text,
  }));

  return (
    <div style={{ width:196, borderRight:"0.5px solid var(--color-border-tertiary)",
      background:"var(--color-background-secondary)", display:"flex",
      flexDirection:"column", flexShrink:0 }}>
      <div style={{ padding:"16px 14px 12px" }}>
        <div style={{ fontSize:17, fontWeight:500, color:"var(--color-text-primary)",
          letterSpacing:"-0.3px" }}>
          Note<span style={{ color:"#7F77DD" }}>Flow</span>
        </div>
      </div>
      <nav style={{ flex:1, padding:"4px 0" }}>
        {navItems.map(item => (
          <button key={item.id} onClick={() => onNav(item.id)} style={{
            display:"flex", alignItems:"center", gap:8, width:"100%",
            padding:"8px 14px", fontSize:13, border:"none", cursor:"pointer", textAlign:"left",
            background: activeView === item.id ? "var(--color-background-primary)" : "transparent",
            color: activeView === item.id ? "#534AB7" : "var(--color-text-secondary)",
            fontWeight: activeView === item.id ? 500 : 400,
          }}>
            <i className={`ti ${item.icon}`} aria-hidden="true" style={{fontSize:15}} />
            {item.label}
            {item.badge > 0 && (
              <span style={{ marginLeft:"auto", fontSize:11, padding:"1px 7px",
                borderRadius:20, fontWeight:500,
                background: item.urgent ? T.red.bg : T.purple.bg,
                color: item.urgent ? T.red.text : T.purple.text }}>
                {item.badge}
              </span>
            )}
          </button>
        ))}
        <div style={{ padding:"14px 14px 4px", fontSize:11,
          color:"var(--color-text-tertiary)", letterSpacing:"0.5px", textTransform:"uppercase" }}>
          Catégories
        </div>
        {catItems.map(item => (
          <button key={item.id} onClick={() => onNav(item.id)} style={{
            display:"flex", alignItems:"center", gap:8, width:"100%",
            padding:"8px 14px", fontSize:13, border:"none", cursor:"pointer", textAlign:"left",
            background: activeView === item.id ? "var(--color-background-primary)" : "transparent",
            color: activeView === item.id ? item.color : "var(--color-text-secondary)",
            fontWeight: activeView === item.id ? 500 : 400,
          }}>
            <i className={`ti ${item.icon}`} aria-hidden="true" style={{fontSize:15}} />
            {item.label}
          </button>
        ))}
      </nav>
      <div style={{ padding:"12px 14px", borderTop:"0.5px solid var(--color-border-tertiary)",
        fontSize:12, color:"var(--color-text-tertiary)" }}>
        {new Date().toLocaleDateString("fr-FR", { day:"numeric", month:"long", year:"numeric" })}
      </div>
    </div>
  );
}

// ─── Main view title ──────────────────────────────────────────────────────────
const VIEW_TITLES = {
  all: "Toutes les notes",
  today: "Urgences du jour",
  digest: "Récap du jour",
  compose: "Nouvelle note",
};

// ─── Root app ─────────────────────────────────────────────────────────────────
export default function App() {
  const [notes, setNotes] = useState(MOCK_NOTES);
  const [view, setView] = useState("all");
  const [selectedNote, setSelectedNote] = useState(null);
  const [search, setSearch] = useState("");

  const urgentCount = notes.filter(n => n.dueUrgent && !n.done).length;

  function handleNav(id) {
    setView(id);
    setSelectedNote(null);
  }

  function handleNoteClick(note) {
    setSelectedNote(note);
  }

  function handleMarkDone(id) {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, done: true } : n));
    setSelectedNote(null);
  }

  function handleSave(newNote) {
    setNotes(prev => [newNote, ...prev]);
    setView("all");
  }

  // Filter notes for current view
  const visibleNotes = notes.filter(n => {
    if (view.startsWith("cat:")) {
      const cat = view.slice(4);
      return n.category === cat && !n.done;
    }
    return !n.done;
  });

  const filteredNotes = search.trim()
    ? visibleNotes.filter(n =>
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.body.toLowerCase().includes(search.toLowerCase()))
    : visibleNotes;

  const sortedNotes = [...filteredNotes].sort((a, b) => {
    const po = { haute:0, moyenne:1, basse:2 };
    return po[a.priority] - po[b.priority];
  });

  const isCatView = view.startsWith("cat:");
  const currentTitle = isCatView
    ? CATEGORIES[view.slice(4)]?.label
    : VIEW_TITLES[view] || "Notes";

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"var(--font-sans)",
      background:"var(--color-background-tertiary)", overflow:"hidden" }}>
      <Sidebar
        activeView={view}
        onNav={handleNav}
        noteCount={notes.filter(n => !n.done).length}
        urgentCount={urgentCount}
      />

      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden",
        background:"var(--color-background-primary)" }}>
        {/* Topbar */}
        <div style={{ padding:"12px 20px", borderBottom:"0.5px solid var(--color-border-tertiary)",
          display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
          <div style={{ fontSize:15, fontWeight:500, color:"var(--color-text-primary)", flex:1 }}>
            {currentTitle}
          </div>
          {(view === "all" || isCatView) && (
            <div style={{ display:"flex", alignItems:"center", gap:8,
              background:"var(--color-background-secondary)",
              border:"0.5px solid var(--color-border-tertiary)",
              borderRadius:8, padding:"6px 12px", fontSize:13 }}>
              <i className="ti ti-search" aria-hidden="true"
                style={{ fontSize:14, color:"var(--color-text-tertiary)" }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher…"
                style={{ background:"none", border:"none", outline:"none", fontSize:13,
                  color:"var(--color-text-primary)", width:160,
                  fontFamily:"inherit" }}
              />
            </div>
          )}
          <button onClick={() => handleNav("compose")} style={{
            display:"inline-flex", alignItems:"center", gap:6, padding:"7px 14px",
            fontSize:13, borderRadius:8, border:"none", cursor:"pointer",
            background:"#534AB7", color:"#fff" }}>
            <i className="ti ti-plus" aria-hidden="true" /> Nouvelle note
          </button>
        </div>

        {/* Content */}
        <div style={{ flex:1, overflowY:"auto", padding:"16px 20px", position:"relative" }}>
          {selectedNote && (
            <NoteDetail
              note={selectedNote}
              onClose={() => setSelectedNote(null)}
              onMarkDone={handleMarkDone}
            />
          )}

          {view === "compose" && <ComposeView onSave={handleSave} />}

          {(view === "all" || isCatView) && !selectedNote && (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {sortedNotes.length === 0 ? (
                <div style={{ textAlign:"center", padding:"48px 0",
                  color:"var(--color-text-tertiary)", fontSize:14 }}>
                  <i className="ti ti-notes" aria-hidden="true"
                    style={{ fontSize:32, display:"block", marginBottom:12 }} />
                  {search ? "Aucune note ne correspond à ta recherche." : "Aucune note ici pour l'instant."}
                </div>
              ) : (
                <>
                  {!search && (
                    <div style={{ fontSize:12, color:"var(--color-text-tertiary)",
                      marginBottom:4 }}>
                      {sortedNotes.length} note{sortedNotes.length > 1 ? "s" : ""} · triées par priorité
                    </div>
                  )}
                  {sortedNotes.map(n => (
                    <NoteCard key={n.id} note={n} onClick={handleNoteClick} />
                  ))}
                </>
              )}
            </div>
          )}

          {view === "today" && !selectedNote && (
            <TodayView notes={notes} onNoteClick={handleNoteClick} />
          )}

          {view === "digest" && !selectedNote && (
            <DigestView notes={notes} />
          )}
        </div>
      </div>

      <RightPanel notes={notes} />
    </div>
  );
}
