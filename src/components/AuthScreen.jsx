import { useState } from "react";
import { signIn, signUp } from "../lib/supabase";

export default function AuthScreen() {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  async function handleSubmit() {
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (mode === "login") {
        await signIn(email, password);
      } else {
        await signUp(email, password);
        setSuccess("Compte créé ! Vérifie ton email pour confirmer.");
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      height:"100vh", background:"var(--color-background-tertiary)",
      fontFamily:"var(--font-sans)" }}>
      <div style={{ width:360, background:"var(--color-background-primary)",
        border:"0.5px solid var(--color-border-tertiary)", borderRadius:16, padding:"32px 28px" }}>
        <div style={{ fontSize:22, fontWeight:500, marginBottom:6,
          color:"var(--color-text-primary)", letterSpacing:"-0.3px" }}>
          Note<span style={{ color:"#7F77DD" }}>Flow</span>
        </div>
        <div style={{ fontSize:13, color:"var(--color-text-secondary)", marginBottom:28 }}>
          {mode === "login" ? "Connecte-toi pour accéder à tes notes." : "Crée ton compte."}
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            style={{ width:"100%", padding:"9px 12px", fontSize:14, borderRadius:8,
              border:"0.5px solid var(--color-border-secondary)", outline:"none",
              background:"var(--color-background-primary)", color:"var(--color-text-primary)",
              fontFamily:"inherit" }}
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            style={{ width:"100%", padding:"9px 12px", fontSize:14, borderRadius:8,
              border:"0.5px solid var(--color-border-secondary)", outline:"none",
              background:"var(--color-background-primary)", color:"var(--color-text-primary)",
              fontFamily:"inherit" }}
          />
        </div>

        {error && (
          <div style={{ marginTop:12, padding:"9px 12px", borderRadius:8, fontSize:13,
            background:"#FCEBEB", color:"#A32D2D" }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ marginTop:12, padding:"9px 12px", borderRadius:8, fontSize:13,
            background:"#EAF3DE", color:"#3B6D11" }}>
            {success}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !email || !password}
          style={{ marginTop:16, width:"100%", padding:"9px", fontSize:14, borderRadius:8,
            border:"none", cursor: loading ? "wait" : "pointer",
            background: (!email || !password) ? "#AFA9EC" : "#534AB7",
            color:"#fff", fontFamily:"inherit", fontWeight:500 }}>
          {loading ? "…" : mode === "login" ? "Se connecter" : "Créer le compte"}
        </button>

        <div style={{ marginTop:14, textAlign:"center", fontSize:13,
          color:"var(--color-text-secondary)" }}>
          {mode === "login" ? "Pas encore de compte ? " : "Déjà un compte ? "}
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }}
            style={{ background:"none", border:"none", cursor:"pointer",
              color:"#534AB7", fontWeight:500, fontFamily:"inherit", fontSize:13 }}>
            {mode === "login" ? "S'inscrire" : "Se connecter"}
          </button>
        </div>
      </div>
    </div>
  );
}
