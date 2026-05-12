import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabaseClient";

/* ═══════ HELPERS ═══════ */
const today = () => new Date().toISOString().split("T")[0];
const fmtUSD = (n) => new Intl.NumberFormat("fr-CD", { style: "currency", currency: "USD" }).format(n);
const daysUntil = (d) => { if (!d) return Infinity; return Math.ceil((new Date(d) - new Date()) / 86400000); };
const expSt = (d) => { const x = daysUntil(d); if (x < 0) return "expired"; if (x <= 30) return "critical"; if (x <= 90) return "warning"; return "ok"; };

const SAMPLE = [
  { name: "Paracétamol 500mg", barcode: "6291001000101", category: "Antidouleur", stock: 240, price: 2.50, cost_price: 1.20, expiry_date: "2026-08-15", supplier: "PharmaCorp", min_stock: 50 },
  { name: "Amoxicilline 250mg", barcode: "6291001000202", category: "Antibiotiques", stock: 85, price: 5.00, cost_price: 2.80, expiry_date: "2025-12-01", supplier: "MediSupply", min_stock: 30 },
  { name: "Oméprazole 20mg", barcode: "6291001000303", category: "Gastro", stock: 120, price: 3.75, cost_price: 1.80, expiry_date: "2026-05-20", supplier: "PharmaCorp", min_stock: 40 },
  { name: "Cétirizine 10mg", barcode: "6291001000404", category: "Allergie", stock: 15, price: 2.50, cost_price: 1.00, expiry_date: "2026-11-30", supplier: "AllergyMed", min_stock: 25 },
  { name: "Ibuprofène 400mg", barcode: "6291001000505", category: "Antidouleur", stock: 200, price: 3.00, cost_price: 1.40, expiry_date: "2025-06-10", supplier: "PharmaCorp", min_stock: 60 },
  { name: "Metformine 500mg", barcode: "6291001000606", category: "Diabète", stock: 8, price: 4.00, cost_price: 2.10, expiry_date: "2026-09-01", supplier: "DiaCare", min_stock: 20 },
  { name: "Vitamine D3 1000UI", barcode: "6291001000707", category: "Vitamines", stock: 300, price: 6.50, cost_price: 3.00, expiry_date: "2027-03-15", supplier: "VitaHealth", min_stock: 50 },
  { name: "Losartan 50mg", barcode: "6291001000808", category: "Cardiovasculaire", stock: 45, price: 4.50, cost_price: 2.40, expiry_date: "2026-07-22", supplier: "HeartMed", min_stock: 20 },
];

/* ═══════ ICONS ═══════ */
const Sv = ({ d, size = 18, ...p }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d={d}/></svg>;
const Ic = {
  search: p=><Sv d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" {...p}/>,
  plus: p=><Sv d="M12 5v14M5 12h14" {...p}/>,
  x: p=><Sv d="M18 6L6 18M6 6l12 12" {...p}/>,
  check: p=><Sv d="M20 6L9 17l-5-5" {...p}/>,
  cart: p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>,
  alert: p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  upload: p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  download: p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  pill: p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 1.5l-8 8a5.66 5.66 0 008 8l8-8a5.66 5.66 0 00-8-8z"/><line x1="6" y1="14" x2="14" y2="6"/></svg>,
  box: p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0022 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  edit: p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash: p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  clock: p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  home: p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  receipt: p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2-3-2z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="12" y2="16"/></svg>,
  arrow: p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  logout: p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  help: p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  user: p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  shield: p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  zap: p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  bar: p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  leaf: p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75"/></svg>,
  back: p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
};

/* ═══════ ONBOARDING TOUR ═══════ */
const TOUR_STEPS = [
  { target: ".srch", title: "Rechercher", desc: "Tapez le nom d'un médicament, un code-barres ou une catégorie pour trouver rapidement un produit.", pos: "bottom" },
  { target: ".bt-p", title: "Ajouter un médicament", desc: "Cliquez ici pour ajouter un nouveau médicament à votre inventaire.", pos: "bottom" },
  { target: ".stats", title: "Tableau de bord", desc: "Visualisez en un coup d'œil le total de médicaments, le stock, les alertes et les ventes du jour.", pos: "bottom" },
  { target: ".tc", title: "Inventaire", desc: "Votre liste complète de médicaments. Cliquez sur les en-têtes de colonnes pour trier. Utilisez les icônes pour vendre, réapprovisionner, modifier ou supprimer.", pos: "top" },
  { target: ".sb-nav", title: "Navigation", desc: "Accédez au tableau de bord, à l'inventaire, à l'historique des ventes et aux alertes depuis ce menu.", pos: "right" },
];

function OnboardingTour({ onClose }) {
  const [step, setStep] = useState(0);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, height: 0 });

  useEffect(() => {
    const updatePos = () => {
      const el = document.querySelector(TOUR_STEPS[step].target);
      if (el) { const r = el.getBoundingClientRect(); setPos({ top: r.top, left: r.left, width: r.width, height: r.height }); }
    };
    updatePos();
    window.addEventListener("resize", updatePos);
    return () => window.removeEventListener("resize", updatePos);
  }, [step]);

  const s = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;
  const tipStyle = {
    position: "fixed", zIndex: 1002, background: "#fff", borderRadius: 14, padding: "20px 24px", width: 320,
    boxShadow: "0 12px 40px rgba(15,76,42,0.18)", border: "1px solid rgba(30,140,78,0.1)",
    ...(s.pos === "bottom" ? { top: pos.top + pos.height + 14, left: Math.max(10, pos.left + pos.width / 2 - 160) } :
       s.pos === "top" ? { top: pos.top - 180, left: Math.max(10, pos.left + pos.width / 2 - 160) } :
       { top: pos.top, left: pos.left + pos.width + 14 })
  };

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(15,76,42,0.35)", zIndex: 1000 }} onClick={onClose} />
      <div style={{ position: "fixed", top: pos.top - 4, left: pos.left - 4, width: pos.width + 8, height: pos.height + 8, border: "3px solid #1A7F48", borderRadius: 12, zIndex: 1001, pointerEvents: "none", boxShadow: "0 0 0 4000px rgba(15,76,42,0.3)", transition: "all .3s ease" }} />
      <div style={tipStyle}>
        <div style={{ fontSize: 11, color: "#1A7F48", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Étape {step + 1}/{TOUR_STEPS.length}</div>
        <div style={{ fontSize: 17, fontWeight: 600, color: "#0F4C2A", marginBottom: 6, fontFamily: "'Cormorant Garamond',serif" }}>{s.title}</div>
        <div style={{ fontSize: 13, color: "#4A6B5A", lineHeight: 1.6, marginBottom: 16 }}>{s.desc}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8AA69A", cursor: "pointer", fontSize: 12, fontFamily: "'Outfit',sans-serif" }}>Passer</button>
          <div style={{ display: "flex", gap: 8 }}>
            {step > 0 && <button onClick={() => setStep(step - 1)} style={{ padding: "6px 14px", border: "1px solid #D4E4DB", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 12, fontFamily: "'Outfit',sans-serif" }}>Précédent</button>}
            <button onClick={() => isLast ? onClose() : setStep(step + 1)} style={{ padding: "6px 16px", border: "none", borderRadius: 8, background: "#1A7F48", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 500, fontFamily: "'Outfit',sans-serif" }}>{isLast ? "Terminer" : "Suivant"}</button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════ AUTH PAGE ═══════ */
const AUTH_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Outfit:wght@300;400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
.auth-page{min-height:100vh;display:flex;font-family:'Outfit',sans-serif;background:#F4F7F5}
.auth-left{flex:1;background:linear-gradient(135deg,#0F4C2A 0%,#1A7F48 50%,#0F4C2A 100%);display:flex;flex-direction:column;justify-content:center;padding:60px;position:relative;overflow:hidden}
.auth-left::before{content:'';position:absolute;top:-50%;right:-30%;width:600px;height:600px;background:radial-gradient(circle,rgba(255,255,255,0.04) 0%,transparent 70%);border-radius:50%}
.auth-left::after{content:'';position:absolute;bottom:-30%;left:-20%;width:400px;height:400px;background:radial-gradient(circle,rgba(76,175,80,0.08) 0%,transparent 70%);border-radius:50%}
.auth-left h1{font-family:'Cormorant Garamond',serif;font-size:48px;color:#fff;font-weight:400;line-height:1.1;margin-bottom:16px;position:relative;z-index:1}
.auth-left h1 em{font-style:italic;color:#81C784}
.auth-left p{font-size:16px;color:rgba(255,255,255,0.65);max-width:380px;line-height:1.7;position:relative;z-index:1;font-weight:300}
.auth-left .auth-brand{display:flex;align-items:center;gap:14px;margin-bottom:48px;position:relative;z-index:1}
.auth-left .auth-brand svg{flex-shrink:0}
.auth-left .auth-brand-text h2{font-family:'Cormorant Garamond',serif;font-size:22px;color:#fff;font-weight:500}
.auth-left .auth-brand-text span{font-size:10px;color:rgba(255,255,255,0.5);letter-spacing:2px;text-transform:uppercase}
.auth-right{width:480px;display:flex;flex-direction:column;justify-content:center;padding:60px;background:#fff}
.auth-right h3{font-family:'Cormorant Garamond',serif;font-size:28px;color:#0F4C2A;margin-bottom:6px}
.auth-right .sub{font-size:14px;color:#5A8A6A;margin-bottom:32px;font-weight:300}
.auth-fi{display:flex;flex-direction:column;gap:5px;margin-bottom:16px}
.auth-fi label{font-size:11px;font-weight:600;color:#4A6B5A;text-transform:uppercase;letter-spacing:.5px}
.auth-fi input{padding:11px 14px;border:1px solid #D4E4DB;border-radius:10px;font-size:14px;font-family:'Outfit',sans-serif;outline:none;transition:.2s;color:#1A2E23}
.auth-fi input:focus{border-color:#1A7F48;box-shadow:0 0 0 3px rgba(30,140,78,0.1)}
.auth-btn{width:100%;padding:13px;border:none;border-radius:10px;background:linear-gradient(135deg,#1A7F48,#0F4C2A);color:#fff;font-size:15px;font-weight:500;font-family:'Outfit',sans-serif;cursor:pointer;transition:.3s;margin-top:8px}
.auth-btn:hover{box-shadow:0 6px 20px rgba(15,76,42,0.3);transform:translateY(-1px)}
.auth-btn:disabled{opacity:.6;cursor:not-allowed;transform:none;box-shadow:none}
.auth-switch{text-align:center;margin-top:20px;font-size:13px;color:#5A8A6A}
.auth-switch button{background:none;border:none;color:#1A7F48;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif;font-size:13px;text-decoration:underline}
.auth-error{background:#FEF2F2;color:#991B1B;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:14px;border:1px solid rgba(239,68,68,0.15)}
.auth-success{background:#ECFDF5;color:#065F46;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:14px;border:1px solid rgba(16,185,129,0.15)}
@media(max-width:900px){.auth-left{display:none}.auth-right{width:100%;padding:32px 24px}}
`;

function AuthPage({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async () => {
    setError(""); setSuccess(""); setLoading(true);
    try {
      if (mode === "login") {
        const { data, error: e } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (e) throw e;
        onAuth(data.session);
      } else {
        const { data, error: e } = await supabase.auth.signUp({ email, password: pass, options: { data: { full_name: name } } });
        if (e) throw e;
        if (data.user && !data.session) { setSuccess("Vérifiez votre e-mail pour confirmer votre compte."); setMode("login"); }
        else if (data.session) onAuth(data.session);
      }
    } catch (e) {
      const msg = e.message || "Erreur inconnue";
      if (msg.includes("Invalid login")) setError("E-mail ou mot de passe incorrect.");
      else if (msg.includes("already registered")) setError("Cet e-mail est déjà enregistré.");
      else if (msg.includes("Password")) setError("Le mot de passe doit contenir au moins 6 caractères.");
      else setError(msg);
    }
    setLoading(false);
  };

  return (
    <>
      <style>{AUTH_CSS}</style>
      <div className="auth-page">
        <div className="auth-left">
          <div className="auth-brand">
            <svg width="44" height="44" viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="10" fill="rgba(255,255,255,0.1)"/><path d="M20 8v24M8 20h24" stroke="#4CAF50" strokeWidth="3.5" strokeLinecap="round"/><path d="M14 17c0 0 3 8 6 8s6-8 6-8" stroke="#81C784" strokeWidth="2" strokeLinecap="round" fill="none"/></svg>
            <div className="auth-brand-text"><h2>Speranza Della Pharma</h2><span>Système d'Inventaire</span></div>
          </div>
          <h1>Gérez votre<br/>pharmacie avec<br/><em>précision.</em></h1>
          <p>Suivi d'inventaire en temps réel, gestion des ventes et alertes d'expiration — tout en un seul endroit.</p>
        </div>
        <div className="auth-right">
          <h3>{mode === "login" ? "Connexion" : "Créer un compte"}</h3>
          <p className="sub">{mode === "login" ? "Connectez-vous pour accéder à votre inventaire." : "Inscrivez-vous pour commencer."}</p>
          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}
          {mode === "signup" && <div className="auth-fi"><label>Nom complet</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Jean Mukendi" /></div>}
          <div className="auth-fi"><label>Adresse e-mail</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" /></div>
          <div className="auth-fi"><label>Mot de passe</label><input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="Min. 6 caractères" onKeyDown={e => e.key === "Enter" && handleSubmit()} /></div>
          <button className="auth-btn" onClick={handleSubmit} disabled={loading || !email || !pass}>{loading ? "Chargement..." : mode === "login" ? "Se connecter" : "S'inscrire"}</button>
          <div className="auth-switch">
            {mode === "login" ? <>Pas encore de compte ? <button onClick={() => { setMode("signup"); setError(""); }}>S'inscrire</button></> : <>Déjà un compte ? <button onClick={() => { setMode("login"); setError(""); }}>Se connecter</button></>}
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════ DASHBOARD CSS ═══════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Outfit:wght@300;400;500;600;700&display=swap');
:root{--bg:#F4F7F5;--card:#FFF;--sb-bg:#0F4C2A;--sbh:#14663A;--sba:#1A7F48;--ac:#1E8C4E;--al:#E6F5EC;--ad:#156B3A;--t:#1A2E23;--t2:#4A6B5A;--t3:#8AA69A;--od:#E0F0E6;--od2:#7AAF8E;--bd:#D4E4DB;--bd2:#E8F0EC;--ok:#10B981;--ok-bg:#ECFDF5;--w:#F59E0B;--w-bg:#FFFBEB;--d:#EF4444;--d-bg:#FEF2F2;--sh:0 1px 3px rgba(15,76,42,.06);--sh2:0 4px 14px rgba(15,76,42,.08);--r:12px;--rs:8px;--rl:16px}
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Outfit',sans-serif;background:var(--bg);color:var(--t);-webkit-font-smoothing:antialiased}
.app{display:flex;height:100vh;overflow:hidden}
.sb{width:250px;min-width:250px;background:var(--sb-bg);display:flex;flex-direction:column;z-index:10}
.sb-brand{padding:18px 14px;display:flex;align-items:center;gap:11px;border-bottom:1px solid rgba(255,255,255,.08)}
.sb-brand h1{font-family:'Cormorant Garamond',serif;font-size:15px;color:#fff;font-weight:500;line-height:1.15}
.sb-brand span{font-family:'Outfit',sans-serif;font-size:9px;color:var(--od2);letter-spacing:1px;text-transform:uppercase}
.sb-nav{padding:12px 10px;flex:1;display:flex;flex-direction:column;gap:2px}
.sb-lbl{font-size:9px;text-transform:uppercase;letter-spacing:1.2px;color:var(--od2);padding:12px 10px 5px;font-weight:600}
.sb-btn{display:flex;align-items:center;gap:9px;padding:9px 11px;border-radius:var(--rs);color:var(--od);cursor:pointer;transition:.15s;font-size:13px;border:none;background:none;width:100%;text-align:left;font-family:'Outfit',sans-serif}
.sb-btn:hover{background:var(--sbh)}.sb-btn.on{background:var(--sba);font-weight:500;color:#fff}
.sb-btn .badge{margin-left:auto;background:var(--d);color:#fff;font-size:10px;font-weight:600;padding:2px 6px;border-radius:10px}
.mn{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
.top{background:var(--card);border-bottom:1px solid var(--bd);padding:12px 24px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-shrink:0}
.top h2{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:500}
.top-a{display:flex;align-items:center;gap:8px}
.srch{position:relative;width:280px}
.srch input{width:100%;padding:8px 11px 8px 36px;border:1px solid var(--bd);border-radius:var(--rs);font-size:12px;font-family:'Outfit',sans-serif;background:var(--bg);color:var(--t);outline:none;transition:.15s}
.srch input:focus{border-color:var(--ac);box-shadow:0 0 0 3px var(--al);background:#fff}
.srch input::placeholder{color:var(--t3)}
.srch svg{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--t3)}
.cnt{flex:1;overflow-y:auto;padding:20px 24px}
.bt{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:var(--rs);font-size:12px;font-weight:500;font-family:'Outfit',sans-serif;cursor:pointer;transition:.15s;border:1px solid transparent;white-space:nowrap}
.bt-p{background:var(--ac);color:#fff;border-color:var(--ac)}.bt-p:hover{background:var(--ad)}
.bt-s{background:#fff;color:var(--t);border-color:var(--bd)}.bt-s:hover{background:var(--bg)}
.bt-ok{background:var(--ok);color:#fff}.bt-ok:hover{background:#0D9668}
.bt-g{background:transparent;color:var(--t2);border:none;padding:4px 7px}.bt-g:hover{background:var(--bg);color:var(--t)}
.bt-sm{padding:4px 8px;font-size:11px}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}
.stc{background:var(--card);border-radius:var(--r);padding:15px;border:1px solid var(--bd2);box-shadow:var(--sh);display:flex;align-items:flex-start;gap:10px}
.sti{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.sti.g{background:var(--al);color:var(--ac)}.sti.gn{background:var(--ok-bg);color:var(--ok)}.sti.am{background:var(--w-bg);color:var(--w)}.sti.rd{background:var(--d-bg);color:var(--d)}
.stv{flex:1}.stv .l{font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;font-weight:500;margin-bottom:2px}.stv .v{font-size:21px;font-weight:700;line-height:1}
.tc{background:var(--card);border-radius:var(--r);border:1px solid var(--bd2);box-shadow:var(--sh);overflow:hidden}
.th{padding:11px 15px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--bd)}.th h3{font-size:13px;font-weight:600}
.ts{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:12px}
thead th{text-align:left;padding:8px 12px;font-size:9.5px;text-transform:uppercase;letter-spacing:.8px;color:var(--t3);font-weight:600;border-bottom:1px solid var(--bd);background:#FAFCFB;white-space:nowrap;cursor:pointer;user-select:none}
thead th:hover{color:var(--t2)}
tbody tr{border-bottom:1px solid var(--bd2);transition:.1s}tbody tr:hover{background:#F6FAF8}tbody tr:last-child{border-bottom:none}
tbody td{padding:8px 12px;vertical-align:middle}
.dn{font-weight:600;font-size:12px}.db{font-size:10px;color:var(--t3);font-family:monospace}
.ct{display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:500;background:var(--al);color:var(--ac)}
.sb-stock{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600}
.sb-stock.ok{background:var(--ok-bg);color:#065F46}.sb-stock.low{background:var(--w-bg);color:#92400E}.sb-stock.crit{background:var(--d-bg);color:#991B1B}
.eb{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:500}
.eb.ok{background:var(--ok-bg);color:#065F46}.eb.warning{background:var(--w-bg);color:#92400E}.eb.critical{background:var(--d-bg);color:#991B1B}.eb.expired{background:#991B1B;color:#fff}
.ac-c{display:flex;gap:2px}
.mo-bk{position:fixed;inset:0;background:rgba(15,76,42,.45);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:100;animation:fi .15s}
@keyframes fi{from{opacity:0}to{opacity:1}}@keyframes su{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
.mo{background:var(--card);border-radius:var(--rl);box-shadow:var(--sh2);width:460px;max-width:95vw;max-height:90vh;overflow-y:auto;animation:su .2s}
.mo-h{padding:15px 20px 0;display:flex;align-items:center;justify-content:space-between}.mo-h h3{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:500}
.mo-b{padding:14px 20px}.mo-f{padding:12px 20px;display:flex;justify-content:flex-end;gap:8px;border-top:1px solid var(--bd)}
.fg{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.fi{display:flex;flex-direction:column;gap:3px}.fi.full{grid-column:1/-1}
.fi label{font-size:10px;font-weight:600;color:var(--t2);text-transform:uppercase;letter-spacing:.4px}
.fi input,.fi select{padding:7px 10px;border:1px solid var(--bd);border-radius:var(--rs);font-size:12px;font-family:'Outfit',sans-serif;color:var(--t);background:#fff;outline:none;transition:.15s}
.fi input:focus{border-color:var(--ac);box-shadow:0 0 0 3px var(--al)}
.ag{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.alc{background:var(--card);border-radius:var(--r);border:1px solid var(--bd2);box-shadow:var(--sh);overflow:hidden}
.alc-h{padding:10px 13px;display:flex;align-items:center;gap:6px;font-weight:600;font-size:12px;border-bottom:1px solid var(--bd)}
.alc-h.w{background:var(--w-bg);color:#92400E}.alc-h.d{background:var(--d-bg);color:#991B1B}
.all{padding:3px 0;max-height:280px;overflow-y:auto}
.ali{padding:7px 13px;display:flex;align-items:center;justify-content:space-between;font-size:12px;border-bottom:1px solid var(--bd2)}.ali:last-child{border-bottom:none}
.aln{font-weight:500}.ald{font-size:10px;color:var(--t3)}
.ss{background:var(--bg);border-radius:var(--rs);padding:12px;margin-top:8px}
.ssr{display:flex;justify-content:space-between;font-size:12px;padding:2px 0}
.ssr.tot{font-weight:700;font-size:15px;padding-top:6px;margin-top:4px;border-top:2px solid var(--bd);color:var(--ac)}
.sli{display:flex;align-items:center;justify-content:space-between;padding:8px 13px;border-bottom:1px solid var(--bd2);font-size:12px}.sli:last-child{border-bottom:none}
.emp{text-align:center;padding:32px 14px;color:var(--t3)}.emp p{margin-top:5px;font-size:12px}
.dz{border:2px dashed var(--bd);border-radius:var(--r);padding:28px 14px;text-align:center;color:var(--t3);cursor:pointer;transition:.15s;background:#FAFCFB}
.dz:hover,.dz.on{border-color:var(--ac);background:var(--al);color:var(--ac)}.dz p{margin-top:4px;font-size:10px}
.toast{position:fixed;bottom:16px;right:16px;background:var(--sb-bg);color:#fff;padding:10px 15px;border-radius:var(--rs);box-shadow:var(--sh2);font-size:12px;display:flex;align-items:center;gap:7px;z-index:200;animation:su .2s;max-width:300px}
.toast.ok{background:#065F46}.toast.er{background:#991B1B}
.loading-overlay{position:fixed;inset:0;background:rgba(250,253,248,.9);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:50}
.spinner{width:36px;height:36px;border:3px solid var(--bd);border-top-color:var(--ac);border-radius:50%;animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--bd);border-radius:3px}
@media(max-width:900px){.stats{grid-template-columns:repeat(2,1fr)}.ag{grid-template-columns:1fr}.sb{width:56px;min-width:56px}.sb-brand h1,.sb-brand span,.sb-lbl,.sb-btn span{display:none}.sb-brand{justify-content:center;padding:12px 6px}.sb-btn{justify-content:center;padding:9px}.sb-btn .badge{display:none}.top{padding:10px 12px}.cnt{padding:12px}.srch{width:160px}}
`;

/* ═══════ MAIN DASHBOARD ═══════ */
function DashboardApp({ session, onLogout }) {
  const [drugs, setDrugs] = useState([]);
  const [sales, setSales] = useState([]);
  const [page, setPage] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTour, setShowTour] = useState(false);
  const fileRef = useRef(null);
  const uid = session.user.id;

  // Load data from Supabase
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const { data: d } = await supabase.from("drugs").select("*").eq("user_id", uid).order("name");
      const { data: s } = await supabase.from("sales").select("*").eq("user_id", uid).order("created_at", { ascending: false });

      if (d && d.length === 0) {
        // First login — seed sample data
        const samples = SAMPLE.map(s => ({ ...s, user_id: uid }));
        const { data: inserted } = await supabase.from("drugs").insert(samples).select();
        setDrugs(inserted || []);
        setShowTour(true); // Show onboarding for first-time users
      } else {
        setDrugs(d || []);
      }
      setSales(s || []);
      setLoading(false);

      // Check if first visit
      const visited = localStorage.getItem(`speranza_visited_${uid}`);
      if (!visited) { setShowTour(true); localStorage.setItem(`speranza_visited_${uid}`, "1"); }
    };
    loadData();
  }, [uid]);

  const toast2 = (m, t = "ok") => { setToast({ m, t }); setTimeout(() => setToast(null), 3000); };

  const reloadDrugs = async () => { const { data } = await supabase.from("drugs").select("*").eq("user_id", uid).order("name"); setDrugs(data || []); };
  const reloadSales = async () => { const { data } = await supabase.from("sales").select("*").eq("user_id", uid).order("created_at", { ascending: false }); setSales(data || []); };

  const handleAdd = async (drug) => {
    const { error } = await supabase.from("drugs").insert({ ...drug, user_id: uid });
    if (error) { toast2("Erreur: " + error.message, "er"); return; }
    await reloadDrugs(); toast2(`${drug.name} ajouté`); setModal(null);
  };

  const handleEdit = async (drug) => {
    const { id, user_id, created_at, updated_at, ...rest } = drug;
    const { error } = await supabase.from("drugs").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast2("Erreur: " + error.message, "er"); return; }
    await reloadDrugs(); toast2(`${drug.name} modifié`); setModal(null);
  };

  const handleDel = async (id) => {
    const d = drugs.find(x => x.id === id);
    if (!window.confirm(`Supprimer "${d?.name}" ?`)) return;
    await supabase.from("sales").delete().eq("drug_id", id);
    await supabase.from("drugs").delete().eq("id", id);
    await reloadDrugs(); await reloadSales(); toast2(`${d?.name} supprimé`, "er");
  };

  const handleSell = async (drugId, qty) => {
    const d = drugs.find(x => x.id === drugId);
    if (!d || qty < 1 || qty > d.stock) return;
    const sale = { user_id: uid, drug_id: drugId, drug_name: d.name, qty, unit_price: d.price, total: qty * d.price, sale_date: today(), sale_time: new Date().toLocaleTimeString() };
    const { error: e1 } = await supabase.from("sales").insert(sale);
    const { error: e2 } = await supabase.from("drugs").update({ stock: d.stock - qty }).eq("id", drugId);
    if (e1 || e2) { toast2("Erreur lors de la vente", "er"); return; }
    await reloadDrugs(); await reloadSales(); toast2(`${qty}x ${d.name} vendu — ${fmtUSD(sale.total)}`); setModal(null);
  };

  const handleRestock = async (drugId, qty) => {
    const d = drugs.find(x => x.id === drugId);
    if (!d || qty < 1) return;
    const { error } = await supabase.from("drugs").update({ stock: d.stock + qty }).eq("id", drugId);
    if (error) { toast2("Erreur", "er"); return; }
    await reloadDrugs(); toast2(`${qty}x ${d.name} réapprovisionné`); setModal(null);
  };

  const handleCSV = async (text) => {
    try {
      const lines = text.trim().split("\n"); if (lines.length < 2) throw new Error("Fichier CSV invalide");
      const h = lines[0].split(",").map(s => s.trim().toLowerCase().replace(/[^a-z0-9]/g, ""));
      const ni = h.findIndex(s => s.includes("name") || s.includes("nom") || s.includes("drug") || s.includes("medicament"));
      if (ni === -1) throw new Error("Colonne 'nom' introuvable");
      const bi=h.findIndex(s=>s.includes("barcode")||s.includes("code"));const ci=h.findIndex(s=>s.includes("categor")||s.includes("cat"));const si=h.findIndex(s=>s.includes("stock")||s.includes("qty")||s.includes("quantit"));const pi=h.findIndex(s=>s.includes("prix")||s.includes("price"));const coi=h.findIndex(s=>s.includes("cout")||s.includes("cost"));const ei=h.findIndex(s=>s.includes("expir")||s.includes("exp"));const sui=h.findIndex(s=>s.includes("fournisseur")||s.includes("supplier"));const mi=h.findIndex(s=>s.includes("min"));
      const imp = [];
      for (let i = 1; i < lines.length; i++) {
        const c = lines[i].split(",").map(s => s.trim()); if (!c[ni]) continue;
        imp.push({ user_id: uid, name: c[ni], barcode: bi>=0?c[bi]:"", category: ci>=0?c[ci]:"Général", stock: si>=0?parseInt(c[si])||0:0, price: pi>=0?parseFloat(c[pi])||0:0, cost_price: coi>=0?parseFloat(c[coi])||0:0, expiry_date: ei>=0?c[ei]:null, supplier: sui>=0?c[sui]:"", min_stock: mi>=0?parseInt(c[mi])||20:20 });
      }
      if (!imp.length) throw new Error("Aucune ligne valide");
      const { error } = await supabase.from("drugs").insert(imp);
      if (error) throw error;
      await reloadDrugs(); toast2(`${imp.length} médicament(s) importé(s)`); setModal(null);
    } catch (e) { toast2(e.message, "er"); }
  };

  const exportCSV = () => {
    const hdr = "Nom,Code-barres,Catégorie,Stock,Prix,Coût,Date Expiration,Fournisseur,Stock Min";
    const rows = drugs.map(d => [d.name,d.barcode,d.category,d.stock,d.price,d.cost_price,d.expiry_date||"",d.supplier,d.min_stock].join(","));
    const blob = new Blob([hdr+"\n"+rows.join("\n")],{type:"text/csv;charset=utf-8"});
    const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`speranza_${today()}.csv`; a.click(); toast2("CSV exporté");
  };

  const totalDrugs = drugs.length, totalStock = drugs.reduce((s, d) => s + d.stock, 0);
  const low = drugs.filter(d => d.stock > 0 && d.stock <= (d.min_stock || 20));
  const out = drugs.filter(d => d.stock === 0);
  const exp = drugs.filter(d => { const s = expSt(d.expiry_date); return s === "critical" || s === "expired"; });
  const warn = drugs.filter(d => expSt(d.expiry_date) === "warning");
  const ac = low.length + out.length + exp.length;
  const ts = sales.filter(s => s.sale_date === today()), tr = ts.reduce((s, sl) => s + Number(sl.total), 0);
  const flt = drugs.filter(d => { const q = search.toLowerCase(); return d.name.toLowerCase().includes(q) || (d.barcode && d.barcode.includes(q)) || (d.category && d.category.toLowerCase().includes(q)); });

  const nav = [
    { id:"dashboard",label:"Tableau de bord",icon:Ic.home },
    { id:"inventory",label:"Inventaire",icon:Ic.box },
    { id:"sales",label:"Ventes",icon:Ic.receipt },
    { id:"alerts",label:"Alertes",icon:Ic.alert,badge:ac||null },
  ];
  const titles = {dashboard:"Tableau de bord",inventory:"Inventaire des médicaments",sales:"Historique des ventes",alerts:"Alertes & Expiration"};

  if (loading) return (<><style>{CSS}</style><div className="loading-overlay"><div className="spinner"/><p style={{marginTop:14,color:'#4A6B5A',fontSize:13}}>Chargement de vos données...</p></div></>);

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <aside className="sb">
          <div className="sb-brand">
            <svg width="34" height="34" viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="10" fill="#1A7F48"/><path d="M20 8v24M8 20h24" stroke="#fff" strokeWidth="3" strokeLinecap="round"/><path d="M14 17c0 0 3 8 6 8s6-8 6-8" stroke="rgba(255,255,255,.5)" strokeWidth="2" strokeLinecap="round" fill="none"/></svg>
            <div><h1>Speranza Della Pharma</h1><span>Système d'Inventaire</span></div>
          </div>
          <nav className="sb-nav">
            <div className="sb-lbl">Menu</div>
            {nav.map(n=>(<button key={n.id} className={`sb-btn ${page===n.id?"on":""}`} onClick={()=>setPage(n.id)}>{n.icon({size:16})}<span>{n.label}</span>{n.badge&&<span className="badge">{n.badge}</span>}</button>))}
            <div className="sb-lbl" style={{marginTop:"auto"}}>Données</div>
            <button className="sb-btn" onClick={()=>setModal({type:"csv"})}>{Ic.upload({size:16})}<span>Importer CSV</span></button>
            <button className="sb-btn" onClick={exportCSV}>{Ic.download({size:16})}<span>Exporter CSV</span></button>
          </nav>
        </aside>

        <main className="mn">
          <header className="top">
            <h2>{titles[page]}</h2>
            <div className="top-a">
              {(page==="dashboard"||page==="inventory")&&<div className="srch"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input placeholder="Rechercher par nom, code-barres, catégorie..." value={search} onChange={e=>setSearch(e.target.value)}/></div>}
              {(page==="dashboard"||page==="inventory")&&<button className="bt bt-p" onClick={()=>setModal({type:"add"})}>{Ic.plus({size:14})} Ajouter</button>}
              <button className="bt bt-g" onClick={()=>setShowTour(true)} title="Guide d'utilisation">{Ic.help({size:16})}</button>
              <button className="bt bt-g" onClick={onLogout} title="Déconnexion" style={{color:'var(--d)'}}>{Ic.logout({size:16})}</button>
            </div>
          </header>
          <div className="cnt">
            {page==="dashboard"&&<><div className="stats"><div className="stc"><div className="sti g">{Ic.pill({size:16})}</div><div className="stv"><div className="l">Médicaments</div><div className="v">{totalDrugs}</div></div></div><div className="stc"><div className="sti gn">{Ic.box({size:16})}</div><div className="stv"><div className="l">Stock total</div><div className="v">{totalStock.toLocaleString()}</div></div></div><div className="stc"><div className="sti am">{Ic.alert({size:16})}</div><div className="stv"><div className="l">Alertes</div><div className="v">{ac}</div></div></div><div className="stc"><div className="sti g">{Ic.cart({size:16})}</div><div className="stv"><div className="l">Ventes du jour</div><div className="v">{ts.length} <span style={{fontSize:11,fontWeight:400,color:'var(--t3)'}}>({fmtUSD(tr)})</span></div></div></div></div><DrugTable drugs={flt} onSell={d=>setModal({type:"sell",drug:d})} onEdit={d=>setModal({type:"edit",drug:d})} onRes={d=>setModal({type:"restock",drug:d})} onDel={handleDel}/></>}
            {page==="inventory"&&<DrugTable drugs={flt} onSell={d=>setModal({type:"sell",drug:d})} onEdit={d=>setModal({type:"edit",drug:d})} onRes={d=>setModal({type:"restock",drug:d})} onDel={handleDel}/>}
            {page==="sales"&&<SalesPage sales={sales}/>}
            {page==="alerts"&&<AlertsPage low={low} out={out} exp={exp} warn={warn} onRes={d=>setModal({type:"restock",drug:d})}/>}
          </div>
        </main>

        {modal?.type==="add"&&<DrugForm title="Ajouter un médicament" onClose={()=>setModal(null)} onSave={handleAdd}/>}
        {modal?.type==="edit"&&<DrugForm title="Modifier le médicament" drug={modal.drug} onClose={()=>setModal(null)} onSave={handleEdit}/>}
        {modal?.type==="sell"&&<SellModal drug={modal.drug} onClose={()=>setModal(null)} onSell={handleSell}/>}
        {modal?.type==="restock"&&<RestockModal drug={modal.drug} onClose={()=>setModal(null)} onRes={handleRestock}/>}
        {modal?.type==="csv"&&<CSVModal onClose={()=>setModal(null)} onImport={handleCSV} fileRef={fileRef}/>}
        {toast&&<div className={`toast ${toast.t}`}>{toast.t==="ok"?Ic.check({size:14}):Ic.alert({size:14})} {toast.m}</div>}
        {showTour&&<OnboardingTour onClose={()=>setShowTour(false)}/>}
      </div>
    </>
  );
}

/* ═══════ TABLE, MODALS, PAGES ═══════ */
function DrugTable({drugs,onSell,onEdit,onRes,onDel}){const[sk,setSk]=useState("name");const[sd,setSd]=useState(1);const sort=(k)=>{if(sk===k)setSd(-sd);else{setSk(k);setSd(1)}};const sorted=[...drugs].sort((a,b)=>{let va=a[sk],vb=b[sk];if(typeof va==="string"){va=(va||"").toLowerCase();vb=(vb||"").toLowerCase()}return va<vb?-sd:va>vb?sd:0});const SA=({col})=>sk===col?<span style={{marginLeft:2,fontSize:8}}>{sd===1?"▲":"▼"}</span>:null;return(<div className="tc"><div className="th"><h3>Inventaire</h3><span style={{fontSize:10,color:'var(--t3)'}}>{drugs.length} articles</span></div>{!drugs.length?<div className="emp">{Ic.pill({size:30,color:'var(--t3)'})}<p>Aucun médicament trouvé.</p></div>:<div className="ts"><table><thead><tr><th onClick={()=>sort("name")}>Nom<SA col="name"/></th><th onClick={()=>sort("barcode")}>Code-barres<SA col="barcode"/></th><th onClick={()=>sort("category")}>Catégorie<SA col="category"/></th><th onClick={()=>sort("stock")}>Stock<SA col="stock"/></th><th onClick={()=>sort("price")}>Prix<SA col="price"/></th><th onClick={()=>sort("expiry_date")}>Expiration<SA col="expiry_date"/></th><th>Actions</th></tr></thead><tbody>{sorted.map(d=>{const ss=d.stock===0?"crit":d.stock<=(d.min_stock||20)?"low":"ok";const es=expSt(d.expiry_date);return(<tr key={d.id}><td><div className="dn">{d.name}</div>{d.supplier&&<div style={{fontSize:9,color:'var(--t3)'}}>{d.supplier}</div>}</td><td><span className="db">{d.barcode||"—"}</span></td><td><span className="ct">{d.category||"Général"}</span></td><td><span className={`sb-stock ${ss}`}>{d.stock===0?"Épuisé":d.stock}</span></td><td style={{fontWeight:500}}>{fmtUSD(d.price)}</td><td>{d.expiry_date?<span className={`eb ${es}`}>{es==="expired"?"EXPIRÉ":d.expiry_date}</span>:"—"}</td><td><div className="ac-c"><button className="bt bt-g bt-sm" onClick={()=>onSell(d)} disabled={d.stock===0} title="Vendre">{Ic.cart({size:13})}</button><button className="bt bt-g bt-sm" onClick={()=>onRes(d)} title="Réapprovisionner">{Ic.plus({size:13})}</button><button className="bt bt-g bt-sm" onClick={()=>onEdit(d)} title="Modifier">{Ic.edit({size:13})}</button><button className="bt bt-g bt-sm" onClick={()=>onDel(d.id)} style={{color:'var(--d)'}} title="Supprimer">{Ic.trash({size:13})}</button></div></td></tr>)})}</tbody></table></div>}</div>)}

function SalesPage({sales}){const g={};sales.forEach(s=>{const d=s.sale_date||today();if(!g[d])g[d]=[];g[d].push(s)});const dates=Object.keys(g).sort().reverse();return(<div className="tc"><div className="th"><h3>Historique des ventes</h3><span style={{fontSize:10,color:'var(--t3)'}}>{sales.length} transactions</span></div>{!sales.length?<div className="emp">{Ic.receipt({size:30,color:'var(--t3)'})}<p>Aucune vente enregistrée</p></div>:dates.map(d=>(<div key={d}><div style={{padding:'6px 13px',background:'#FAFCFB',fontWeight:600,fontSize:10,color:'var(--t3)',textTransform:'uppercase',letterSpacing:.5,borderBottom:'1px solid var(--bd2)'}}>{new Date(d+"T00:00").toLocaleDateString("fr-FR",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}<span style={{float:'right',color:'var(--ac)',fontWeight:700}}>{fmtUSD(g[d].reduce((s,sl)=>s+Number(sl.total),0))}</span></div>{g[d].map(s=>(<div key={s.id} className="sli"><div><span style={{fontWeight:500}}>{s.drug_name}</span><span style={{color:'var(--t3)',marginLeft:5}}>x{s.qty}</span></div><div style={{display:'flex',alignItems:'center',gap:10}}><span style={{fontSize:10,color:'var(--t3)'}}>{s.sale_time}</span><span style={{fontWeight:600,color:'var(--ok)'}}>{fmtUSD(s.total)}</span></div></div>))}</div>))}</div>)}

function AlertsPage({low,out,exp,warn,onRes}){return(<div className="ag"><AlertCard title={`Stock faible (${low.length})`} type="w" items={low} empty="Tout est en stock" render={d=><div key={d.id} className="ali"><div><div className="aln">{d.name}</div><div className="ald">{d.stock} restant(s)</div></div><button className="bt bt-sm bt-p" onClick={()=>onRes(d)}>Réappro.</button></div>}/><AlertCard title={`Épuisé (${out.length})`} type="d" items={out} empty="Aucun" render={d=><div key={d.id} className="ali"><div><div className="aln">{d.name}</div><div className="ald">{d.category}</div></div><button className="bt bt-sm bt-p" onClick={()=>onRes(d)}>Réappro.</button></div>}/><AlertCard title={`Expiration (${exp.length})`} type="d" items={exp} empty="Aucun" render={d=>{const days=daysUntil(d.expiry_date);return<div key={d.id} className="ali"><div><div className="aln">{d.name}</div><div className="ald">{days<0?`Expiré il y a ${Math.abs(days)}j`:`${days}j restants`}</div></div><span className={`eb ${days<0?"expired":"critical"}`}>{days<0?"EXPIRÉ":`${days}j`}</span></div>}}/><AlertCard title={`Alerte 90 jours (${warn.length})`} type="w" items={warn} empty="Aucun" render={d=><div key={d.id} className="ali"><div><div className="aln">{d.name}</div><div className="ald">{d.expiry_date}</div></div><span className="eb warning">{daysUntil(d.expiry_date)}j</span></div>}/></div>)}

function AlertCard({title,type,items,empty,render}){return(<div className="alc"><div className={`alc-h ${type}`}>{type==="w"?Ic.alert({size:14}):Ic.box({size:14})} {title}</div><div className="all">{!items.length?<div className="emp" style={{padding:14}}><p>{empty}</p></div>:items.map(render)}</div></div>)}

function DrugForm({title,drug,onClose,onSave}){const[f,setF]=useState({name:drug?.name||"",barcode:drug?.barcode||"",category:drug?.category||"",stock:drug?.stock??0,price:drug?.price??0,cost_price:drug?.cost_price??0,expiry_date:drug?.expiry_date||"",supplier:drug?.supplier||"",min_stock:drug?.min_stock??20});const s=(k,v)=>setF(p=>({...p,[k]:v}));const sv=()=>{if(!f.name.trim())return;onSave({...drug,...f,stock:parseInt(f.stock)||0,price:parseFloat(f.price)||0,cost_price:parseFloat(f.cost_price)||0,min_stock:parseInt(f.min_stock)||20})};return(<div className="mo-bk" onClick={onClose}><div className="mo" onClick={e=>e.stopPropagation()}><div className="mo-h"><h3>{title}</h3><button className="bt bt-g" onClick={onClose}>{Ic.x({size:14})}</button></div><div className="mo-b"><div className="fg"><div className="fi full"><label>Nom du médicament *</label><input value={f.name} onChange={e=>s("name",e.target.value)} placeholder="Ex: Paracétamol 500mg" autoFocus/></div><div className="fi"><label>Code-barres</label><input value={f.barcode} onChange={e=>s("barcode",e.target.value)}/></div><div className="fi"><label>Catégorie</label><input value={f.category} onChange={e=>s("category",e.target.value)} placeholder="Ex: Antidouleur"/></div><div className="fi"><label>Stock actuel</label><input type="number" min="0" value={f.stock} onChange={e=>s("stock",e.target.value)}/></div><div className="fi"><label>Stock minimum</label><input type="number" min="0" value={f.min_stock} onChange={e=>s("min_stock",e.target.value)}/></div><div className="fi"><label>Prix de vente (USD)</label><input type="number" min="0" step="0.01" value={f.price} onChange={e=>s("price",e.target.value)}/></div><div className="fi"><label>Prix d'achat (USD)</label><input type="number" min="0" step="0.01" value={f.cost_price} onChange={e=>s("cost_price",e.target.value)}/></div><div className="fi"><label>Date d'expiration</label><input type="date" value={f.expiry_date} onChange={e=>s("expiry_date",e.target.value)}/></div><div className="fi"><label>Fournisseur</label><input value={f.supplier} onChange={e=>s("supplier",e.target.value)}/></div></div></div><div className="mo-f"><button className="bt bt-s" onClick={onClose}>Annuler</button><button className="bt bt-p" onClick={sv} disabled={!f.name.trim()}>{Ic.check({size:13})} {drug?"Enregistrer":"Ajouter"}</button></div></div></div>)}

function SellModal({drug,onClose,onSell}){const[qty,setQty]=useState(1);return(<div className="mo-bk" onClick={onClose}><div className="mo" onClick={e=>e.stopPropagation()}><div className="mo-h"><h3>Traiter une vente</h3><button className="bt bt-g" onClick={onClose}>{Ic.x({size:14})}</button></div><div className="mo-b"><div style={{fontSize:15,fontWeight:600,marginBottom:2}}>{drug.name}</div><div style={{fontSize:11,color:'var(--t3)',marginBottom:12}}>Disponible : {drug.stock} unités · {fmtUSD(drug.price)} chacun</div><div className="fi"><label>Quantité</label><input type="number" min="1" max={drug.stock} value={qty} onChange={e=>setQty(Math.min(drug.stock,Math.max(1,parseInt(e.target.value)||1)))} autoFocus/></div><div className="ss"><div className="ssr"><span>Prix unitaire</span><span>{fmtUSD(drug.price)}</span></div><div className="ssr"><span>Quantité</span><span>x{qty}</span></div><div className="ssr tot"><span>Total</span><span>{fmtUSD(drug.price*qty)}</span></div></div></div><div className="mo-f"><button className="bt bt-s" onClick={onClose}>Annuler</button><button className="bt bt-ok" onClick={()=>onSell(drug.id,qty)}>{Ic.cart({size:13})} Confirmer — {fmtUSD(drug.price*qty)}</button></div></div></div>)}

function RestockModal({drug,onClose,onRes}){const[qty,setQty]=useState(10);return(<div className="mo-bk" onClick={onClose}><div className="mo" onClick={e=>e.stopPropagation()}><div className="mo-h"><h3>Réapprovisionner</h3><button className="bt bt-g" onClick={onClose}>{Ic.x({size:14})}</button></div><div className="mo-b"><div style={{fontSize:15,fontWeight:600,marginBottom:2}}>{drug.name}</div><div style={{fontSize:11,color:'var(--t3)',marginBottom:12}}>Stock actuel : {drug.stock} · Min : {drug.min_stock||20}</div><div className="fi"><label>Quantité à ajouter</label><input type="number" min="1" value={qty} onChange={e=>setQty(Math.max(1,parseInt(e.target.value)||1))} autoFocus/></div><div className="ss"><div className="ssr"><span>Stock actuel</span><span>{drug.stock}</span></div><div className="ssr"><span>Ajout</span><span>+{qty}</span></div><div className="ssr tot"><span>Nouveau stock</span><span>{drug.stock+qty}</span></div></div></div><div className="mo-f"><button className="bt bt-s" onClick={onClose}>Annuler</button><button className="bt bt-p" onClick={()=>onRes(drug.id,qty)}>{Ic.plus({size:13})} Ajouter {qty}</button></div></div></div>)}

function CSVModal({onClose,onImport,fileRef}){const[drag,setDrag]=useState(false);const[pv,setPv]=useState(null);const ref=fileRef||React.createRef();const h=(file)=>{if(!file)return;const r=new FileReader();r.onload=e=>setPv(e.target.result);r.readAsText(file)};return(<div className="mo-bk" onClick={onClose}><div className="mo" onClick={e=>e.stopPropagation()} style={{width:500}}><div className="mo-h"><h3>Importer un fichier CSV</h3><button className="bt bt-g" onClick={onClose}>{Ic.x({size:14})}</button></div><div className="mo-b"><div className={`dz ${drag?"on":""}`} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);h(e.dataTransfer.files[0])}} onClick={()=>ref.current?.click()}>{Ic.upload({size:24})}<p><strong>Déposez un fichier CSV</strong> ou cliquez pour parcourir</p><input ref={ref} type="file" accept=".csv" style={{display:'none'}} onChange={e=>h(e.target.files[0])}/></div>{pv&&<div style={{marginTop:10}}><pre style={{background:'var(--bg)',padding:8,borderRadius:6,fontSize:9,overflow:'auto',maxHeight:100}}>{pv.split("\n").slice(0,5).join("\n")}</pre></div>}</div><div className="mo-f"><button className="bt bt-s" onClick={onClose}>Annuler</button><button className="bt bt-p" onClick={()=>onImport(pv)} disabled={!pv}>{Ic.upload({size:13})} Importer</button></div></div></div>)}

/* ═══════ ROOT APP ═══════ */
export default function App() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setChecking(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => { await supabase.auth.signOut(); setSession(null); };

  if (checking) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#F4F7F5'}}><div className="spinner" style={{width:36,height:36,border:'3px solid #D4E4DB',borderTopColor:'#1A7F48',borderRadius:'50%',animation:'spin 1s linear infinite'}}/><style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style></div>;

  if (!session) return <AuthPage onAuth={setSession} />;
  return <DashboardApp session={session} onLogout={handleLogout} />;
}
