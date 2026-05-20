import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabaseClient";

/* ═══════ CONSTANTS & HELPERS ═══════ */
const FC_RATE = 2800;
const LOGO = "/image_2026-05-12_204244494.png";
const today = () => new Date().toISOString().split("T")[0];
const fmtUSD = (n) => new Intl.NumberFormat("fr-CD", { style: "currency", currency: "USD" }).format(n);
const fmtAmt = (n, cur) => cur === "FC" ? new Intl.NumberFormat("fr-CD").format(Math.round(n * FC_RATE)) + " FC" : fmtUSD(n);
const genInv = () => `FAC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
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
const Sv=({d,size=18,...p})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d={d}/></svg>;
const Ic={
  search:p=><Sv d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" {...p}/>,
  plus:p=><Sv d="M12 5v14M5 12h14" {...p}/>,
  x:p=><Sv d="M18 6L6 18M6 6l12 12" {...p}/>,
  check:p=><Sv d="M20 6L9 17l-5-5" {...p}/>,
  cart:p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>,
  users:p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  alert:p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  upload:p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  download:p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  pill:p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 1.5l-8 8a5.66 5.66 0 008 8l8-8a5.66 5.66 0 00-8-8z"/><line x1="6" y1="14" x2="14" y2="6"/></svg>,
  box:p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0022 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  edit:p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash:p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  home:p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  receipt:p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2-3-2z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="12" y2="16"/></svg>,
  arrow:p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  logout:p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  help:p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  shield:p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  zap:p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  bar:p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  leaf:p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75"/></svg>,
  print:p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  globe:p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  clipboard:p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>,
  pkg:p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0022 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  copy:p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
  phone:p=><svg width={p?.size||18} height={p?.size||18} viewBox="0 0 24 24" fill="none" stroke={p?.color||"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.29 6.29l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>,
};

/* ═══════ ONBOARDING TOUR ═══════ */
const TOUR=[
  {target:".srch",title:"Rechercher",desc:"Tapez le nom d'un médicament, un code-barres ou une catégorie pour trouver rapidement un produit.",pos:"bottom"},
  {target:".bt-p",title:"Ajouter un médicament",desc:"Cliquez ici pour ajouter un nouveau médicament à votre inventaire.",pos:"bottom"},
  {target:".cart-top",title:"Panier d'achats",desc:"Cliquez sur l'icône panier d'un médicament pour l'ajouter au panier. Le compteur indique le nombre d'articles. Cliquez ici pour finaliser la vente et générer une facture.",pos:"bottom"},
  {target:".curr-toggle",title:"Devise USD / FC",desc:"Basculez entre le Dollar américain (USD) et le Franc Congolais (FC). Taux : 1 USD = 2 800 FC. Votre préférence est enregistrée automatiquement.",pos:"bottom"},
  {target:".stats",title:"Tableau de bord",desc:"Visualisez en un coup d'œil le total de médicaments, le stock, les alertes et les ventes du jour.",pos:"bottom"},
  {target:".tc",title:"Inventaire",desc:"Votre liste complète. Cliquez sur les en-têtes pour trier. Utilisez les icônes pour ajouter au panier, réapprovisionner, modifier ou supprimer.",pos:"top"},
  {target:".sb-nav",title:"Navigation",desc:"Accédez au tableau de bord, à l'inventaire, aux analytiques des ventes (graphiques, top 5, filtres) et aux alertes depuis ce menu.",pos:"right"},
];
function Tour({onClose}){
  const[step,setStep]=useState(0);
  const[pos,setPos]=useState({top:0,left:0,width:0,height:0});
  useEffect(()=>{
    const u=()=>{const el=document.querySelector(TOUR[step].target);if(el){const r=el.getBoundingClientRect();setPos({top:r.top,left:r.left,width:r.width,height:r.height})}};
    u();window.addEventListener("resize",u);return()=>window.removeEventListener("resize",u);
  },[step]);
  const s=TOUR[step];const last=step===TOUR.length-1;
  const ts={position:"fixed",zIndex:1002,background:"#fff",borderRadius:14,padding:"20px 24px",width:320,boxShadow:"0 12px 40px rgba(15,76,42,0.18)",border:"1px solid rgba(30,140,78,0.1)",...(s.pos==="bottom"?{top:pos.top+pos.height+14,left:Math.max(10,pos.left+pos.width/2-160)}:s.pos==="top"?{top:Math.max(10,pos.top-190),left:Math.max(10,pos.left+pos.width/2-160)}:{top:pos.top,left:pos.left+pos.width+14})};
  return(<><div style={{position:"fixed",inset:0,background:"rgba(15,76,42,0.35)",zIndex:1000}} onClick={onClose}/><div style={{position:"fixed",top:pos.top-4,left:pos.left-4,width:pos.width+8,height:pos.height+8,border:"3px solid #1A7F48",borderRadius:12,zIndex:1001,pointerEvents:"none",boxShadow:"0 0 0 4000px rgba(15,76,42,0.3)",transition:"all .3s ease"}}/><div style={ts}><div style={{fontSize:11,color:"#1A7F48",fontWeight:600,marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Étape {step+1}/{TOUR.length}</div><div style={{fontSize:17,fontWeight:600,color:"#0F4C2A",marginBottom:6,fontFamily:"'Cormorant Garamond',serif"}}>{s.title}</div><div style={{fontSize:13,color:"#4A6B5A",lineHeight:1.6,marginBottom:16}}>{s.desc}</div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><button onClick={onClose} style={{background:"none",border:"none",color:"#8AA69A",cursor:"pointer",fontSize:12,fontFamily:"'Outfit',sans-serif"}}>Passer</button><div style={{display:"flex",gap:8}}>{step>0&&<button onClick={()=>setStep(step-1)} style={{padding:"6px 14px",border:"1px solid #D4E4DB",borderRadius:8,background:"#fff",cursor:"pointer",fontSize:12,fontFamily:"'Outfit',sans-serif"}}>Précédent</button>}<button onClick={()=>last?onClose():setStep(step+1)} style={{padding:"6px 16px",border:"none",borderRadius:8,background:"#1A7F48",color:"#fff",cursor:"pointer",fontSize:12,fontWeight:500,fontFamily:"'Outfit',sans-serif"}}>{last?"Terminer":"Suivant"}</button></div></div></div></>);
}

/* ═══════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════ */
const LCSS=`
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400;1,500&family=Outfit:wght@300;400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}html{scroll-behavior:smooth}
.land{min-height:100vh;background:#FAFDF8;font-family:'Outfit',sans-serif;color:#1A2E23;overflow-x:hidden}
.ln{position:fixed;top:0;left:0;right:0;z-index:50;padding:16px 48px;display:flex;align-items:center;justify-content:space-between;background:rgba(250,253,248,0.85);backdrop-filter:blur(20px);border-bottom:1px solid rgba(30,140,78,0.06)}
.ln-logo{display:flex;align-items:center;gap:12px}
.ln-logo img{height:42px;border-radius:8px;object-fit:contain}
.ln-logo h1{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600;color:#0F4C2A;line-height:1.1}
.ln-logo span{display:block;font-family:'Outfit',sans-serif;font-size:9px;color:#5A8A6A;letter-spacing:2px;text-transform:uppercase;font-weight:500}
.ln-r{display:flex;align-items:center;gap:28px}
.ln-r a{font-size:13px;color:#3A6B4A;text-decoration:none;font-weight:400;transition:.2s;letter-spacing:.3px}
.ln-r a:hover{color:#0F4C2A}
.lbtn{display:inline-flex;align-items:center;gap:9px;padding:11px 26px;background:linear-gradient(135deg,#1A7F48,#0F4C2A);color:#fff;border:none;border-radius:50px;font-size:13px;font-weight:500;font-family:'Outfit',sans-serif;cursor:pointer;transition:all .3s;box-shadow:0 4px 20px rgba(15,76,42,0.25);letter-spacing:.3px}
.lbtn:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(15,76,42,0.35)}
.lbtn-s{display:inline-flex;align-items:center;gap:9px;padding:11px 26px;background:transparent;color:#0F4C2A;border:1.5px solid #C5DEC5;border-radius:50px;font-size:13px;font-weight:500;font-family:'Outfit',sans-serif;cursor:pointer;transition:all .3s}
.lbtn-s:hover{border-color:#1A7F48;background:rgba(30,140,78,0.04)}
.hero{min-height:100vh;display:flex;align-items:center;padding:110px 48px 70px;position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;top:-200px;right:-200px;width:800px;height:800px;background:radial-gradient(circle,rgba(76,175,80,0.06) 0%,transparent 70%);border-radius:50%;pointer-events:none}
.hero-in{max-width:1200px;margin:0 auto;width:100%;display:flex;align-items:center;gap:70px;position:relative;z-index:1}
.hero-txt{flex:1;max-width:560px}
.lbadge{display:inline-flex;align-items:center;gap:8px;padding:5px 14px;background:rgba(30,140,78,0.08);border:1px solid rgba(30,140,78,0.15);border-radius:50px;font-size:11px;font-weight:500;color:#1A7F48;margin-bottom:24px;animation:fu .8s ease both}
.lbadge .dot{width:6px;height:6px;background:#1A7F48;border-radius:50%;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.hero-txt h2{font-family:'Cormorant Garamond',serif;font-size:clamp(38px,5vw,66px);font-weight:300;line-height:1.08;color:#0F4C2A;margin-bottom:20px;animation:fu .8s ease .1s both}
.hero-txt h2 em{font-style:italic;font-weight:500;color:#1A7F48}
.hero-txt p{font-size:16px;line-height:1.7;color:#4A6B5A;max-width:440px;margin-bottom:32px;font-weight:300;animation:fu .8s ease .2s both}
.hero-btns{display:flex;gap:12px;animation:fu .8s ease .3s both}
.hero-vis{flex:1;position:relative;animation:fu .8s ease .4s both}
.hcard{background:#fff;border-radius:18px;border:1px solid rgba(30,140,78,0.08);box-shadow:0 20px 60px rgba(15,76,42,0.08);padding:24px;position:relative;overflow:hidden}
.hcard::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#1A7F48,#4CAF50,#81C784)}
.hm-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.hm-dots{display:flex;gap:5px}.hm-dots span{width:9px;height:9px;border-radius:50%}.hm-dots span:nth-child(1){background:#FF6B6B}.hm-dots span:nth-child(2){background:#FFD93D}.hm-dots span:nth-child(3){background:#6BCB77}
.hm-srch{background:#F4F7F5;border-radius:7px;padding:7px 12px;font-size:10px;color:#8AA69A;flex:1;margin-left:14px;border:1px solid #E8F0EC}
.hm-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px}
.hm-st{background:#F4F7F5;border-radius:9px;padding:12px;text-align:center}
.hm-st .n{font-size:20px;font-weight:700;color:#0F4C2A}.hm-st .lb{font-size:9px;color:#8AA69A;text-transform:uppercase;letter-spacing:.5px;margin-top:2px}
.hm-rows{display:flex;flex-direction:column;gap:7px}
.hm-row{display:flex;align-items:center;justify-content:space-between;background:#FAFDF8;border-radius:7px;padding:9px 12px;border:1px solid #E8F0EC}
.hm-row .nm{font-size:11px;font-weight:600;color:#1A2E23}.hm-row .ca{font-size:9px;background:#E6F5EC;color:#1A7F48;padding:2px 7px;border-radius:12px}
.hm-row .sk{font-size:11px;font-weight:600}.hm-row .sk.g{color:#10B981}.hm-row .sk.r{color:#EF4444}
.lfloat{position:absolute;background:#fff;border-radius:13px;box-shadow:0 8px 28px rgba(15,76,42,0.12);padding:12px 16px;animation:float 6s ease-in-out infinite}
.lf1{top:-18px;right:-28px;animation-delay:0s}.lf2{bottom:28px;left:-36px;animation-delay:2s}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
.lfloat .fn{font-size:18px;font-weight:700;color:#0F4C2A}.lfloat .fl{font-size:9px;color:#8AA69A;text-transform:uppercase;letter-spacing:.5px}
.feat{padding:90px 48px;max-width:1200px;margin:0 auto}
.slbl{font-size:10px;text-transform:uppercase;letter-spacing:3px;color:#1A7F48;font-weight:600;margin-bottom:12px;text-align:center}
.stitle{font-family:'Cormorant Garamond',serif;font-size:clamp(28px,3.5vw,44px);font-weight:400;text-align:center;color:#0F4C2A;margin-bottom:14px;line-height:1.15}
.ssub{text-align:center;font-size:15px;color:#5A8A6A;max-width:520px;margin:0 auto 50px;font-weight:300;line-height:1.6}
.fgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.fcard{background:#fff;border-radius:14px;border:1px solid rgba(30,140,78,0.06);padding:28px 24px;transition:all .3s;position:relative;overflow:hidden}
.fcard::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#1A7F48,#4CAF50);transform:scaleX(0);transform-origin:left;transition:transform .4s}
.fcard:hover::before{transform:scaleX(1)}.fcard:hover{box-shadow:0 10px 36px rgba(15,76,42,0.08);transform:translateY(-3px)}
.ficon{width:44px;height:44px;border-radius:11px;display:flex;align-items:center;justify-content:center;margin-bottom:16px}
.ficon.g1{background:linear-gradient(135deg,#E6F5EC,#C5DEC5);color:#1A7F48}
.ficon.g2{background:linear-gradient(135deg,#ECFDF5,#D1FAE5);color:#059669}
.ficon.g3{background:linear-gradient(135deg,#F0FDF4,#DCFCE7);color:#16A34A}
.fcard h3{font-size:15px;font-weight:600;color:#0F4C2A;margin-bottom:8px}
.fcard p{font-size:13px;color:#5A8A6A;line-height:1.6;font-weight:300}
.lbot{padding:70px 48px;text-align:center}
.lbot-box{max-width:660px;margin:0 auto;background:linear-gradient(135deg,#0F4C2A 0%,#1A7F48 100%);border-radius:22px;padding:52px 44px;position:relative;overflow:hidden}
.lbot-box::before{content:'';position:absolute;top:-50%;right:-30%;width:400px;height:400px;background:radial-gradient(circle,rgba(255,255,255,0.06) 0%,transparent 70%);border-radius:50%}
.lbot-box h3{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:400;color:#fff;margin-bottom:12px;position:relative;z-index:1}
.lbot-box p{font-size:14px;color:rgba(255,255,255,0.7);margin-bottom:28px;position:relative;z-index:1;font-weight:300}
.lbot-cta{display:inline-flex;align-items:center;gap:9px;padding:13px 32px;background:#fff;color:#0F4C2A;border:none;border-radius:50px;font-size:14px;font-weight:600;font-family:'Outfit',sans-serif;cursor:pointer;transition:all .3s;position:relative;z-index:1;box-shadow:0 4px 20px rgba(0,0,0,0.15)}
.lbot-cta:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(0,0,0,0.2)}
.lfooter{padding:28px 48px;text-align:center;font-size:12px;color:#8AA69A;border-top:1px solid #E8F0EC}
@keyframes fu{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.fade-in{animation:fu .6s ease both}.d1{animation-delay:.1s}.d2{animation-delay:.2s}.d3{animation-delay:.3s}.d4{animation-delay:.4s}.d5{animation-delay:.5s}.d6{animation-delay:.6s}
.pg-out{animation:pgo .4s ease forwards}@keyframes pgo{to{opacity:0;transform:scale(.98)}}
.auth-overlay{position:fixed;inset:0;background:rgba(15,76,42,0.5);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:60;animation:fi .2s}
.auth-box{background:#fff;border-radius:20px;width:420px;max-width:95vw;padding:36px;box-shadow:0 20px 60px rgba(15,76,42,0.15);animation:su .25s;position:relative}
.auth-logo{display:block;margin:0 auto 18px;height:56px;border-radius:10px;object-fit:contain}
.auth-box h3{font-family:'Cormorant Garamond',serif;font-size:26px;color:#0F4C2A;margin-bottom:4px;text-align:center}
.auth-box .sub{font-size:13px;color:#5A8A6A;margin-bottom:24px;font-weight:300;text-align:center}
.auth-fi{display:flex;flex-direction:column;gap:4px;margin-bottom:14px}
.auth-fi label{font-size:10px;font-weight:600;color:#4A6B5A;text-transform:uppercase;letter-spacing:.5px}
.auth-fi input{padding:10px 13px;border:1px solid #D4E4DB;border-radius:9px;font-size:13px;font-family:'Outfit',sans-serif;outline:none;transition:.2s;color:#1A2E23}
.auth-fi input:focus{border-color:#1A7F48;box-shadow:0 0 0 3px rgba(30,140,78,0.1)}
.auth-btn{width:100%;padding:12px;border:none;border-radius:9px;background:linear-gradient(135deg,#1A7F48,#0F4C2A);color:#fff;font-size:14px;font-weight:500;font-family:'Outfit',sans-serif;cursor:pointer;transition:.3s;margin-top:6px}
.auth-btn:hover{box-shadow:0 6px 20px rgba(15,76,42,0.3);transform:translateY(-1px)}
.auth-btn:disabled{opacity:.6;cursor:not-allowed;transform:none;box-shadow:none}
.auth-sw{text-align:center;margin-top:16px;font-size:12px;color:#5A8A6A}
.auth-sw button{background:none;border:none;color:#1A7F48;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif;font-size:12px;text-decoration:underline}
.auth-forgot{text-align:right;margin-top:-6px;margin-bottom:10px}
.auth-forgot button{background:none;border:none;color:#1A7F48;font-size:11px;cursor:pointer;font-family:'Outfit',sans-serif}
.auth-err{background:#FEF2F2;color:#991B1B;padding:9px 12px;border-radius:7px;font-size:12px;margin-bottom:12px;border:1px solid rgba(239,68,68,0.15)}
.auth-ok{background:#ECFDF5;color:#065F46;padding:9px 12px;border-radius:7px;font-size:12px;margin-bottom:12px;border:1px solid rgba(16,185,129,0.15)}
.auth-close{position:absolute;top:14px;right:14px;background:none;border:none;color:#8AA69A;cursor:pointer}
@keyframes fi{from{opacity:0}to{opacity:1}}@keyframes su{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
@media(max-width:900px){.ln{padding:12px 18px}.ln-r a{display:none}.hero{padding:90px 18px 50px}.hero-in{flex-direction:column;gap:36px}.hero-vis{width:100%}.lfloat{display:none}.feat{padding:50px 18px}.fgrid{grid-template-columns:1fr}.lbot{padding:36px 18px}.lbot-box{padding:36px 20px}}
`;

function LandingPage({onAuth}){
  const[showAuth,setShowAuth]=useState(false);
  const[authMode,setAuthMode]=useState("login");
  const[exiting,setExiting]=useState(false);
  const openAuth=(mode)=>{setAuthMode(mode);setShowAuth(true)};
  return(<><style>{LCSS}</style><div className={`land ${exiting?"pg-out":""}`}>
    <nav className="ln">
      <div className="ln-logo"><img src={LOGO} alt="Speranza" onError={e=>{e.target.style.display='none'}}/><div><h1>Speranza Della Pharma</h1><span>Système d'Inventaire</span></div></div>
      <div className="ln-r">
        <a href="#features">Fonctionnalités</a>
        <a href="#start">Commencer</a>
        <button className="lbtn" onClick={()=>openAuth("login")}>Se connecter {Ic.arrow({size:15})}</button>
      </div>
    </nav>
    <section className="hero"><div className="hero-in">
      <div className="hero-txt">
        <div className="lbadge"><span className="dot"></span> Gestion pharmaceutique simplifiée</div>
        <h2>Votre pharmacie,<br/><em>intelligemment</em><br/>gérée.</h2>
        <p>Suivez votre inventaire en temps réel, traitez les ventes instantanément et ne manquez plus jamais une date d'expiration.</p>
        <div className="hero-btns">
          <button className="lbtn" onClick={()=>openAuth("signup")}>Commencer gratuitement {Ic.arrow({size:15})}</button>
          <button className="lbtn-s" onClick={()=>document.getElementById('features')?.scrollIntoView({behavior:'smooth'})}>Voir les fonctionnalités</button>
        </div>
      </div>
      <div className="hero-vis">
        <div className="hcard">
          <div className="hm-h"><div className="hm-dots"><span/><span/><span/></div><div className="hm-srch">Rechercher par nom ou code-barres...</div></div>
          <div className="hm-stats"><div className="hm-st"><div className="n">1 038</div><div className="lb">En Stock</div></div><div className="hm-st"><div className="n">24</div><div className="lb">Ventes du jour</div></div><div className="hm-st"><div className="n">3</div><div className="lb">Alertes</div></div></div>
          <div className="hm-rows">
            <div className="hm-row"><span className="nm">Paracétamol 500mg</span><span className="ca">Antidouleur</span><span className="sk g">240 unités</span></div>
            <div className="hm-row"><span className="nm">Amoxicilline 250mg</span><span className="ca">Antibiotiques</span><span className="sk g">85 unités</span></div>
            <div className="hm-row"><span className="nm">Metformine 500mg</span><span className="ca">Diabète</span><span className="sk r">8 unités</span></div>
          </div>
        </div>
        <div className="lfloat lf1"><div>{Ic.shield({size:16,color:"#1A7F48"})}</div><div className="fn">99,9%</div><div className="fl">Précision</div></div>
        <div className="lfloat lf2"><div>{Ic.zap({size:16,color:"#F59E0B"})}</div><div className="fn">&lt; 1s</div><div className="fl">Recherche</div></div>
      </div>
    </div></section>
    <section className="feat" id="features">
      <div className="slbl">Pourquoi Speranza</div>
      <div className="stitle">Tout ce dont votre pharmacie a besoin</div>
      <div className="ssub">Un outil complet pour gérer votre inventaire, suivre les ventes et anticiper les expirations — depuis un seul écran.</div>
      <div className="fgrid">
        <div className="fcard fade-in d1"><div className="ficon g1">{Ic.search({size:20})}</div><h3>Recherche instantanée</h3><p>Trouvez n'importe quel médicament par nom, code-barres ou catégorie en millisecondes.</p></div>
        <div className="fcard fade-in d2"><div className="ficon g2">{Ic.cart({size:20})}</div><h3>Panier & Facturation</h3><p>Ajoutez plusieurs médicaments au panier, confirmez la vente et imprimez une facture en un clic.</p></div>
        <div className="fcard fade-in d3"><div className="ficon g3">{Ic.alert({size:20})}</div><h3>Alertes intelligentes</h3><p>Soyez notifié des stocks faibles et des médicaments proches de l'expiration.</p></div>
        <div className="fcard fade-in d4"><div className="ficon g1">{Ic.upload({size:20})}</div><h3>Import & Export CSV</h3><p>Importez votre inventaire depuis un tableur. Exportez à tout moment.</p></div>
        <div className="fcard fade-in d5"><div className="ficon g2">{Ic.bar({size:20})}</div><h3>Analytique avancée</h3><p>Graphiques de revenus, top médicaments et filtres par période (jour, semaine, mois).</p></div>
        <div className="fcard fade-in d6"><div className="ficon g3">{Ic.leaf({size:20})}</div><h3>USD & Franc Congolais</h3><p>Basculez entre USD et FC à tout moment. Taux de conversion intégré.</p></div>
      </div>
    </section>
    <section className="lbot" id="start">
      <div className="lbot-box">
        <h3>Prêt à prendre le contrôle ?</h3>
        <p>Votre inventaire pharmaceutique est à un clic d'être organisé, suivi et optimisé.</p>
        <button className="lbot-cta" onClick={()=>openAuth("signup")}>Lancer le tableau de bord {Ic.arrow({size:16,color:"#0F4C2A"})}</button>
      </div>
    </section>
    <footer className="lfooter"><p>Speranza Della Pharma — Système de Gestion d'Inventaire · Conçu avec soin</p></footer>
    {showAuth&&<AuthModal mode={authMode} setMode={setAuthMode} onClose={()=>setShowAuth(false)} onAuth={onAuth}/>}
  </div></>);
}

/* ═══════ AUTH MODAL ═══════ */
function AuthModal({mode,setMode,onClose,onAuth}){
  const[email,setEmail]=useState("");const[pass,setPass]=useState("");const[name,setName]=useState("");
  const[loading,setLoading]=useState(false);const[error,setError]=useState("");const[success,setSuccess]=useState("");
  const[forgot,setForgot]=useState(false);
  const handleSubmit=async()=>{
    setError("");setSuccess("");setLoading(true);
    try{
      if(forgot){
        const{error:e}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin});
        if(e)throw e;
        setSuccess("Un e-mail de réinitialisation a été envoyé à "+email);setForgot(false);
      }else if(mode==="login"){
        const{data,error:e}=await supabase.auth.signInWithPassword({email,password:pass});
        if(e)throw e;onAuth(data.session);
      }else{
        const{data,error:e}=await supabase.auth.signUp({email,password:pass,options:{data:{full_name:name}}});
        if(e)throw e;
        if(data.user&&!data.session){setSuccess("Vérifiez votre e-mail pour confirmer votre compte.");setMode("login")}
        else if(data.session)onAuth(data.session);
      }
    }catch(e){
      const m=e.message||"Erreur inconnue";
      if(m.includes("Invalid login"))setError("E-mail ou mot de passe incorrect.");
      else if(m.includes("already registered"))setError("Cet e-mail est déjà enregistré.");
      else if(m.includes("Password"))setError("Le mot de passe doit contenir au moins 6 caractères.");
      else setError(m);
    }
    setLoading(false);
  };
  return(
    <div className="auth-overlay" onClick={onClose}><div className="auth-box" onClick={e=>e.stopPropagation()}>
      <button className="auth-close" onClick={onClose}>{Ic.x({size:18})}</button>
      <img src={LOGO} alt="Speranza" className="auth-logo" onError={e=>{e.target.style.display='none'}}/>
      <h3>{forgot?"Mot de passe oublié":mode==="login"?"Connexion":"Créer un compte"}</h3>
      <p className="sub">{forgot?"Entrez votre e-mail pour recevoir un lien de réinitialisation.":mode==="login"?"Connectez-vous pour accéder à votre inventaire.":"Inscrivez-vous pour commencer."}</p>
      {error&&<div className="auth-err">{error}</div>}
      {success&&<div className="auth-ok">{success}</div>}
      {mode==="signup"&&!forgot&&<div className="auth-fi"><label>Nom complet</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex: Jean Mukendi"/></div>}
      <div className="auth-fi"><label>Adresse e-mail</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="votre@email.com"/></div>
      {!forgot&&<div className="auth-fi"><label>Mot de passe</label><input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Min. 6 caractères" onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/></div>}
      {mode==="login"&&!forgot&&<div className="auth-forgot"><button onClick={()=>{setForgot(true);setError("")}}>Mot de passe oublié ?</button></div>}
      <button className="auth-btn" onClick={handleSubmit} disabled={loading||!email||((!forgot)&&!pass)}>{loading?"Chargement...":forgot?"Envoyer le lien":mode==="login"?"Se connecter":"S'inscrire"}</button>
      {forgot?<div className="auth-sw"><button onClick={()=>{setForgot(false);setError("")}}>Retour à la connexion</button></div>:
      <div className="auth-sw">{mode==="login"?<>Pas encore de compte ? <button onClick={()=>{setMode("signup");setError("")}}>S'inscrire</button></>:<>Déjà un compte ? <button onClick={()=>{setMode("login");setError("")}}>Se connecter</button></>}</div>}
    </div></div>
  );
}

/* ═══════════════════════════════════════
   DASHBOARD CSS
   ═══════════════════════════════════════ */
const DCSS=`
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Outfit:wght@300;400;500;600;700&display=swap');
:root{--bg:#F4F7F5;--card:#FFF;--sb:#0F4C2A;--sbh:#14663A;--sba:#1A7F48;--ac:#1E8C4E;--al:#E6F5EC;--ad:#156B3A;--t:#1A2E23;--t2:#4A6B5A;--t3:#8AA69A;--od:#E0F0E6;--od2:#7AAF8E;--bd:#D4E4DB;--bd2:#E8F0EC;--ok:#10B981;--ok-bg:#ECFDF5;--w:#F59E0B;--w-bg:#FFFBEB;--d:#EF4444;--d-bg:#FEF2F2;--sh:0 1px 3px rgba(15,76,42,.06);--sh2:0 4px 14px rgba(15,76,42,.08);--r:12px;--rs:8px;--rl:16px}
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Outfit',sans-serif;background:var(--bg);color:var(--t);-webkit-font-smoothing:antialiased}
.app{display:flex;height:100vh;overflow:hidden}
.sb{width:250px;min-width:250px;background:var(--sb);display:flex;flex-direction:column;z-index:10}
.sb-brand{padding:16px 13px;display:flex;align-items:center;gap:10px;border-bottom:1px solid rgba(255,255,255,.08)}
.sb-brand-logo{width:38px;height:38px;border-radius:8px;object-fit:contain;background:#fff;padding:2px}
.sb-brand h1{font-family:'Cormorant Garamond',serif;font-size:14px;color:#fff;font-weight:500;line-height:1.15}
.sb-brand span{font-family:'Outfit',sans-serif;font-size:9px;color:var(--od2);letter-spacing:1px;text-transform:uppercase}
.sb-nav{padding:10px 8px;flex:1;display:flex;flex-direction:column;gap:2px}
.sb-lbl{font-size:9px;text-transform:uppercase;letter-spacing:1.2px;color:var(--od2);padding:10px 10px 4px;font-weight:600}
.sb-btn{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:var(--rs);color:var(--od);cursor:pointer;transition:.15s;font-size:12.5px;border:none;background:none;width:100%;text-align:left;font-family:'Outfit',sans-serif}
.sb-btn:hover{background:var(--sbh)}.sb-btn.on{background:var(--sba);font-weight:500;color:#fff}
.sb-btn .badge{margin-left:auto;background:var(--d);color:#fff;font-size:9.5px;font-weight:600;padding:2px 6px;border-radius:10px}
.mn{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
.top{background:var(--card);border-bottom:1px solid var(--bd);padding:11px 22px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-shrink:0}
.top h2{font-family:'Cormorant Garamond',serif;font-size:19px;font-weight:500}
.top-a{display:flex;align-items:center;gap:7px}
.srch{position:relative;width:260px}
.srch input{width:100%;padding:7px 10px 7px 34px;border:1px solid var(--bd);border-radius:var(--rs);font-size:12px;font-family:'Outfit',sans-serif;background:var(--bg);color:var(--t);outline:none;transition:.15s}
.srch input:focus{border-color:var(--ac);box-shadow:0 0 0 3px var(--al);background:#fff}
.srch input::placeholder{color:var(--t3)}
.srch svg{position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--t3)}
.cnt{flex:1;overflow-y:auto;padding:18px 22px}
.bt{display:inline-flex;align-items:center;gap:5px;padding:6px 13px;border-radius:var(--rs);font-size:12px;font-weight:500;font-family:'Outfit',sans-serif;cursor:pointer;transition:.15s;border:1px solid transparent;white-space:nowrap}
.bt-p{background:var(--ac);color:#fff;border-color:var(--ac)}.bt-p:hover{background:var(--ad)}
.bt-s{background:#fff;color:var(--t);border-color:var(--bd)}.bt-s:hover{background:var(--bg)}
.bt-ok{background:var(--ok);color:#fff}.bt-ok:hover{background:#0D9668}
.bt-g{background:transparent;color:var(--t2);border:none;padding:4px 6px}.bt-g:hover{background:var(--bg);color:var(--t)}
.bt-sm{padding:3px 7px;font-size:11px}
.curr-toggle{font-size:11px;font-weight:600;letter-spacing:.3px;padding:5px 11px}
.cart-top{position:relative;padding:5px 9px}
.cart-badge{position:absolute;top:-5px;right:-5px;background:var(--d);color:#fff;border-radius:50%;width:16px;height:16px;font-size:9px;display:flex;align-items:center;justify-content:center;font-weight:700;line-height:1}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;margin-bottom:14px}
.stc{background:var(--card);border-radius:var(--r);padding:14px;border:1px solid var(--bd2);box-shadow:var(--sh);display:flex;align-items:flex-start;gap:10px}
.sti{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.sti.g{background:var(--al);color:var(--ac)}.sti.gn{background:var(--ok-bg);color:var(--ok)}.sti.am{background:var(--w-bg);color:var(--w)}
.stv{flex:1}.stv .l{font-size:9.5px;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;font-weight:500;margin-bottom:2px}.stv .v{font-size:20px;font-weight:700;line-height:1}
.tc{background:var(--card);border-radius:var(--r);border:1px solid var(--bd2);box-shadow:var(--sh);overflow:hidden}
.th2{padding:10px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--bd)}.th2 h3{font-size:13px;font-weight:600}
.ts{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:12px}
thead th{text-align:left;padding:8px 11px;font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:var(--t3);font-weight:600;border-bottom:1px solid var(--bd);background:#FAFCFB;white-space:nowrap;cursor:pointer;user-select:none}
thead th:hover{color:var(--t2)}
tbody tr{border-bottom:1px solid var(--bd2);transition:.1s}tbody tr:hover{background:#F6FAF8}tbody tr:last-child{border-bottom:none}
tbody td{padding:8px 11px;vertical-align:middle}
.dn{font-weight:600;font-size:11.5px}.db{font-size:9.5px;color:var(--t3);font-family:monospace}
.ct{display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:500;background:var(--al);color:var(--ac)}
.sb-stock{display:inline-flex;align-items:center;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600}
.sb-stock.ok{background:var(--ok-bg);color:#065F46}.sb-stock.low{background:var(--w-bg);color:#92400E}.sb-stock.crit{background:var(--d-bg);color:#991B1B}
.eb{display:inline-flex;align-items:center;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:500}
.eb.ok{background:var(--ok-bg);color:#065F46}.eb.warning{background:var(--w-bg);color:#92400E}.eb.critical{background:var(--d-bg);color:#991B1B}.eb.expired{background:#991B1B;color:#fff}
.ac-c{display:flex;gap:2px}
.mo-bk{position:fixed;inset:0;background:rgba(15,76,42,.45);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:100;animation:fi .15s}
.mo{background:var(--card);border-radius:var(--rl);box-shadow:var(--sh2);width:450px;max-width:95vw;max-height:90vh;overflow-y:auto;animation:su .2s}
.mo-h{padding:14px 18px 0;display:flex;align-items:center;justify-content:space-between}.mo-h h3{font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:500}
.mo-b{padding:12px 18px}.mo-f{padding:10px 18px;display:flex;justify-content:flex-end;gap:7px;border-top:1px solid var(--bd)}
.fg{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.fi{display:flex;flex-direction:column;gap:3px}.fi.full{grid-column:1/-1}
.fi label{font-size:10px;font-weight:600;color:var(--t2);text-transform:uppercase;letter-spacing:.4px}
.fi input{padding:7px 9px;border:1px solid var(--bd);border-radius:var(--rs);font-size:12px;font-family:'Outfit',sans-serif;color:var(--t);background:#fff;outline:none;transition:.15s}
.fi input:focus{border-color:var(--ac);box-shadow:0 0 0 3px var(--al)}
.ag{display:grid;grid-template-columns:1fr 1fr;gap:11px}
.alc{background:var(--card);border-radius:var(--r);border:1px solid var(--bd2);box-shadow:var(--sh);overflow:hidden}
.alc-h{padding:9px 12px;display:flex;align-items:center;gap:6px;font-weight:600;font-size:12px;border-bottom:1px solid var(--bd)}
.alc-h.w{background:var(--w-bg);color:#92400E}.alc-h.d{background:var(--d-bg);color:#991B1B}
.all2{padding:2px 0;max-height:260px;overflow-y:auto}
.ali{padding:7px 12px;display:flex;align-items:center;justify-content:space-between;font-size:12px;border-bottom:1px solid var(--bd2)}.ali:last-child{border-bottom:none}
.aln{font-weight:500}.ald{font-size:10px;color:var(--t3)}
.ss{background:var(--bg);border-radius:var(--rs);padding:10px;margin-top:7px}
.ssr{display:flex;justify-content:space-between;font-size:12px;padding:2px 0}
.ssr.tot{font-weight:700;font-size:15px;padding-top:6px;margin-top:4px;border-top:2px solid var(--bd);color:var(--ac)}
.sli{display:flex;align-items:center;justify-content:space-between;padding:7px 12px;border-bottom:1px solid var(--bd2);font-size:12px}.sli:last-child{border-bottom:none}
.emp{text-align:center;padding:28px 12px;color:var(--t3)}.emp p{margin-top:4px;font-size:11px}
.dz{border:2px dashed var(--bd);border-radius:var(--r);padding:26px 12px;text-align:center;color:var(--t3);cursor:pointer;transition:.15s;background:#FAFCFB}
.dz:hover,.dz.on{border-color:var(--ac);background:var(--al);color:var(--ac)}.dz p{margin-top:4px;font-size:10px}
.toast{position:fixed;bottom:14px;right:14px;background:var(--sb);color:#fff;padding:9px 14px;border-radius:var(--rs);box-shadow:var(--sh2);font-size:12px;display:flex;align-items:center;gap:6px;z-index:200;animation:su .2s;max-width:290px}
.toast.ok{background:#065F46}.toast.er{background:#991B1B}
.ld-ov{position:fixed;inset:0;background:rgba(250,253,248,.9);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:50}
.spin{width:32px;height:32px;border:3px solid var(--bd);border-top-color:var(--ac);border-radius:50%;animation:sp 1s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}
.period-tabs{display:flex;gap:5px;margin-bottom:14px;flex-wrap:wrap}
.an-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:11px;margin-bottom:14px}
.chart-wrap{background:var(--card);border-radius:var(--r);border:1px solid var(--bd2);box-shadow:var(--sh);padding:14px 14px 8px;margin-bottom:14px}
.chart-inner{display:flex;align-items:flex-end;gap:3px;height:90px;padding:0 2px}
.chart-bar-wrap{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px}
.chart-bar{width:100%;border-radius:3px 3px 0 0;background:linear-gradient(180deg,#1A7F48,#0F4C2A);transition:height .3s ease;min-height:0}
.chart-lbl{font-size:7px;color:var(--t3);text-align:center;line-height:1;white-space:nowrap}
.top5-row{display:flex;align-items:center;padding:8px 12px;border-bottom:1px solid var(--bd2);font-size:12px;gap:6px}
.top5-row:last-child{border-bottom:none}
.inv-row{border-bottom:1px solid var(--bd2)}
.inv-header{padding:6px 12px;background:#FAFCFB;display:flex;justify-content:space-between;align-items:center;font-size:11px}
.inv-item{padding:4px 12px 4px 24px;display:flex;justify-content:space-between;font-size:11px;color:var(--t2)}
.cart-item-row{display:flex;align-items:center;padding:8px 0;border-bottom:1px solid var(--bd2);gap:8px}
.cart-item-row:last-child{border-bottom:none}
.qty-ctrl{display:flex;align-items:center;gap:4px}
.qty-ctrl button{width:24px;height:24px;border-radius:5px;border:1px solid var(--bd);background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:var(--t2);line-height:1;transition:.1s}
.qty-ctrl button:hover:not(:disabled){background:var(--al);border-color:var(--ac);color:var(--ac)}
.qty-ctrl button:disabled{opacity:.35;cursor:not-allowed}
.qty-ctrl span{min-width:28px;text-align:center;font-size:13px;font-weight:600}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--bd);border-radius:3px}
.team-avatar{width:34px;height:34px;border-radius:50%;background:var(--al);color:var(--ac);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0}
.team-member-row{display:flex;align-items:center;padding:10px 14px;border-bottom:1px solid var(--bd2);gap:10px;font-size:12px}
.team-member-row:last-child{border-bottom:none}
.team-role{font-size:10px;font-weight:600;padding:2px 9px;border-radius:20px}
.team-role.owner{background:var(--al);color:var(--ac)}
.team-role.member{background:var(--bg);color:var(--t3);border:1px solid var(--bd)}
.team-status{font-size:10px;margin-top:1px}
.team-status.active{color:var(--ok)}
.team-status.pending{color:var(--w)}
.team-invite-box{padding:16px}
.ws-id{font-size:10px;color:var(--t3);font-family:monospace;margin-top:3px;word-break:break-all}
.cart-item{display:grid;grid-template-columns:1fr auto auto auto;gap:14px;align-items:center;padding:14px 0;border-bottom:1px solid var(--bd2)}
.cart-item:last-child{border-bottom:none}
.cart-item-name{font-weight:600;font-size:13px;color:var(--t);margin-bottom:2px}
.cart-item-meta{font-size:11px;color:var(--t3)}
.cart-cat-badge{display:inline-block;font-size:9px;font-weight:600;padding:2px 8px;border-radius:10px;background:var(--al);color:var(--ac);margin-top:4px;letter-spacing:.3px}
.cart-line-total{font-weight:700;font-size:14px;color:var(--ok);min-width:76px;text-align:right}
.cart-summary{background:var(--bg);border-radius:var(--rs);padding:12px 14px;margin-top:14px;border:1px solid var(--bd2)}
.cart-sum-row{display:flex;justify-content:space-between;font-size:12px;color:var(--t2);padding:3px 0}
.cart-total-row{display:flex;justify-content:space-between;font-size:16px;font-weight:700;color:var(--t);padding:10px 0 0;margin-top:8px;border-top:2px solid var(--bd)}
/* Ruptures */
.rup-form{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:14px;padding:14px 18px}
.rup-row{display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border-bottom:1px solid var(--bd2);font-size:12px}.rup-row:last-child{border-bottom:none}
/* Clients */
.client-row{display:flex;align-items:center;padding:10px 14px;border-bottom:1px solid var(--bd2);gap:10px;cursor:pointer;transition:.1s}.client-row:last-child{border-bottom:none}
.client-row:hover{background:var(--bg)}
.client-avatar{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--al),#C5DEC5);color:var(--ac);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0}
/* Commands/Orders */
.cmd-row{padding:12px 14px;border-bottom:1px solid var(--bd2)}.cmd-row:last-child{border-bottom:none}
.cmd-status{display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600}
.cmd-status.pending{background:var(--w-bg);color:#92400E}.cmd-status.confirmed{background:var(--ok-bg);color:#065F46}.cmd-status.cancelled{background:var(--d-bg);color:#991B1B}
/* Vitrine sidebar */
.sb-vitrine{margin:6px 8px;padding:8px 10px;background:rgba(255,255,255,.08);border-radius:var(--rs);border:1px solid rgba(255,255,255,.12)}
.sb-vitrine-lbl{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--od2);margin-bottom:4px;font-weight:600;display:flex;align-items:center;gap:4px}
.sb-vitrine-url{font-size:8px;color:rgba(255,255,255,.45);word-break:break-all;line-height:1.4;margin-bottom:6px;font-family:monospace}
.sb-vitrine-btns{display:flex;gap:4px}
.sb-vitrine-btn{flex:1;padding:4px 0;border:none;border-radius:5px;font-size:9px;font-weight:600;font-family:'Outfit',sans-serif;cursor:pointer;transition:.15s}
.sb-vitrine-btn.cp{background:rgba(255,255,255,.15);color:#fff}.sb-vitrine-btn.cp:hover{background:rgba(255,255,255,.25)}
.sb-vitrine-btn.op{background:var(--sba);color:#fff}.sb-vitrine-btn.op:hover{background:var(--ac)}
@media(max-width:900px){.stats,.an-grid{grid-template-columns:repeat(2,1fr)}.ag{grid-template-columns:1fr}.sb{width:52px;min-width:52px}.sb-brand h1,.sb-brand span,.sb-lbl,.sb-btn span{display:none}.sb-brand{justify-content:center;padding:10px 5px}.sb-brand-logo{width:30px;height:30px}.sb-btn{justify-content:center;padding:8px}.sb-btn .badge{display:none}.top{padding:8px 10px}.cnt{padding:10px}.srch{width:140px}.sb-vitrine{display:none}.sb-vitrine-full{display:none}}
`;

/* ═══════ WORKSPACE SETUP ═══════ */
async function setupWorkspace(user){
  // 1. Accept any pending invites for this email
  const{data:pending}=await supabase.from("workspace_members").select("id").eq("email",user.email).is("user_id",null);
  for(const inv of(pending||[])){
    await supabase.from("workspace_members").update({user_id:user.id,accepted_at:new Date().toISOString()}).eq("id",inv.id);
  }
  // 2. Find existing workspace membership
  const{data:memberships}=await supabase.from("workspace_members").select("workspace_id").eq("user_id",user.id).not("accepted_at","is",null).order("accepted_at",{ascending:true}).limit(1);
  if(memberships?.length){
    const{data:ws}=await supabase.from("workspaces").select("*").eq("id",memberships[0].workspace_id).single();
    if(ws)return ws;
  }
  // 3. Try to find any existing workspace this user owns (fallback before creating new)
  const{data:owned}=await supabase.from("workspaces").select("*").eq("owner_id",user.id).order("created_at",{ascending:true}).limit(1);
  if(owned?.length)return owned[0];
  // 4. Create a new workspace
  const wsName=user.user_metadata?.full_name?`Pharmacie ${user.user_metadata.full_name}`:"Ma Pharmacie";
  const{data:ws,error}=await supabase.from("workspaces").insert({name:wsName,owner_id:user.id}).select().single();
  if(error||!ws){
    // Last resort: return a synthetic workspace so the app never crashes
    return{id:user.id,name:"Ma Pharmacie",owner_id:user.id,created_at:new Date().toISOString()};
  }
  await supabase.from("workspace_members").insert({workspace_id:ws.id,user_id:user.id,email:user.email,role:"owner",accepted_at:new Date().toISOString()});
  return ws;
}

/* ═══════ BAR CHART ═══════ */
function BarChart({data,fmt}){
  if(!data||!data.length)return<div className="emp" style={{height:90}}><p>Aucune donnée</p></div>;
  const max=Math.max(...data.map(d=>d.value),1);
  return(<div className="chart-inner">{data.map((d,i)=>{const pct=Math.max(0,Math.round((d.value/max)*88));return(<div key={i} className="chart-bar-wrap"><div className="chart-bar" style={{height:pct||2}} title={fmt?fmt(d.value):d.value}/><div className="chart-lbl">{d.label}</div></div>)})}</div>);
}

/* ═══════ DASHBOARD ═══════ */
function DashApp({session,onLogout}){
  const[drugs,setDrugs]=useState(SAMPLE);const[sales,setSales]=useState([]);const[page,setPage]=useState("dashboard");
  const[search,setSearch]=useState("");const[toast,setToast]=useState(null);const[modal,setModal]=useState(null);
  const[loading,setLoading]=useState(true);const[showTour,setShowTour]=useState(false);
  const[cart,setCart]=useState([]);const[showCart,setShowCart]=useState(false);const[invoice,setInvoice]=useState(null);
  const[currency,setCurrency]=useState(()=>localStorage.getItem("sp_currency")||"USD");
  const[workspace,setWorkspace]=useState(null);const[members,setMembers]=useState([]);
  const[sfOrders,setSfOrders]=useState([]);
  const uid=session.user.id;
  const[ruptures,setRuptures]=useState(()=>{try{return JSON.parse(localStorage.getItem(`sp_ruptures_${session.user.id}`)||"[]")}catch{return[]}});
  const[clientExtra,setClientExtra]=useState(()=>{try{return JSON.parse(localStorage.getItem(`sp_crm_${session.user.id}`)||"{}")}catch{return{}}});
  const workspaceRef=useRef(null);
  const fileRef=useRef(null);

  const fmt=useCallback((n)=>fmtAmt(n,currency),[currency]);
  const fmtFC=useCallback((n)=>fmtAmt(n,"FC"),[]);
  const toggleCurrency=()=>{const nx=currency==="USD"?"FC":"USD";setCurrency(nx);localStorage.setItem("sp_currency",nx)};

  useEffect(()=>{const ld=async()=>{setLoading(true);
    let ws;
    try{ws=await setupWorkspace(session.user)}catch(e){console.error("Workspace setup failed:",e);setLoading(false);return}
    workspaceRef.current=ws;setWorkspace(ws);
    // Broad OR: catch drugs by current workspace OR by user_id (any workspace_id, including orphaned ones)
    const wsOr=`workspace_id.eq.${ws.id},user_id.eq.${uid}`;
    const[{data:d},{data:s},{data:m},{data:sfo}]=await Promise.all([
      supabase.from("drugs").select("*").or(wsOr).order("name"),
      supabase.from("sales").select("*").or(wsOr).order("created_at",{ascending:false}),
      supabase.from("workspace_members").select("*").eq("workspace_id",ws.id).order("invited_at"),
      supabase.from("storefront_orders").select("*").eq("workspace_id",ws.id).order("created_at",{ascending:false}),
    ]);
    setMembers(m||[]);setSales(s||[]);setSfOrders(sfo||[]);
    // Only migrate to workspace if it's a real DB workspace (not the synthetic fallback)
    if(ws.id!==uid){
      if(d?.some(x=>x.workspace_id!==ws.id)) supabase.from("drugs").update({workspace_id:ws.id}).eq("user_id",uid);
      if(s?.some(x=>x.workspace_id!==ws.id)) supabase.from("sales").update({workspace_id:ws.id}).eq("user_id",uid);
    }
    if(d&&d.length>0){
      // Real data from DB — use it
      setDrugs(d);
    }else{
      // DB returned nothing (empty table, RLS block, or query error) — SAMPLE is already showing.
      // Try to seed into DB in the background; if it works, replace with persisted rows.
      const samples=SAMPLE.map(s=>({...s,user_id:uid,workspace_id:ws.id!==uid?ws.id:null}));
      supabase.from("drugs").insert(samples).select().then(({data:ins})=>{
        if(ins&&ins.length>0)setDrugs(ins);
        // else: keep showing initial SAMPLE state — never blank
      });
    }
    setLoading(false);
    const v=localStorage.getItem(`sp_v_${uid}`);
    if(!v){setShowTour(true);localStorage.setItem(`sp_v_${uid}`,"1")}
  };ld()},[uid]);

  const t2=(m,t="ok")=>{setToast({m,t});setTimeout(()=>setToast(null),3000)};
  const rlD=async()=>{const ws=workspaceRef.current;if(!ws)return;const f=`workspace_id.eq.${ws.id},user_id.eq.${uid}`;const{data}=await supabase.from("drugs").select("*").or(f).order("name");setDrugs(data||[])};
  const rlS=async()=>{const ws=workspaceRef.current;if(!ws)return;const f=`workspace_id.eq.${ws.id},user_id.eq.${uid}`;const{data}=await supabase.from("sales").select("*").or(f).order("created_at",{ascending:false});setSales(data||[])};
  const loadMembers=async()=>{const ws=workspaceRef.current;if(!ws)return;const{data}=await supabase.from("workspace_members").select("*").eq("workspace_id",ws.id).order("invited_at");setMembers(data||[])};

  const addToCart=(drug)=>{
    const dk=drug.id||drug.name;
    setCart(prev=>{const ex=prev.find(i=>(i.drug.id||i.drug.name)===dk);if(ex)return prev.map(i=>(i.drug.id||i.drug.name)===dk?{...i,qty:Math.min(i.qty+1,drug.stock)}:i);return[...prev,{drug,qty:1}]});
    t2(`${drug.name} ajouté au panier`);
  };

  const hAdd=async(drug)=>{const ws=workspaceRef.current;const wsId=ws?.id&&ws.id!==uid?ws.id:null;const{error}=await supabase.from("drugs").insert({...drug,user_id:uid,workspace_id:wsId});if(error){t2("Erreur: "+error.message,"er");return}await rlD();t2(`${drug.name} ajouté`);setModal(null)};
  const hEdit=async(drug)=>{const{id,user_id,created_at,updated_at,...rest}=drug;const{error}=await supabase.from("drugs").update({...rest,updated_at:new Date().toISOString()}).eq("id",id);if(error){t2("Erreur","er");return}await rlD();t2(`${drug.name} modifié`);setModal(null)};
  const hDel=async(id)=>{const d=drugs.find(x=>x.id===id);if(!window.confirm(`Supprimer "${d?.name}" ?`))return;await supabase.from("sales").delete().eq("drug_id",id);await supabase.from("drugs").delete().eq("id",id);await rlD();await rlS();t2(`${d?.name} supprimé`,"er")};
  const hRes=async(did,qty)=>{const d=drugs.find(x=>x.id===did);if(!d||qty<1)return;const{error}=await supabase.from("drugs").update({stock:d.stock+qty}).eq("id",did);if(error){t2("Erreur","er");return}await rlD();t2(`+${qty} ${d.name}`);setModal(null)};

  const hCartSell=async(cartItems,customerName)=>{
    const ws=workspaceRef.current;const invNum=genInv();
    const wsId=ws?.id&&ws.id!==uid?ws.id:null;
    const salesData=cartItems.map(item=>({
      user_id:uid,workspace_id:wsId,drug_id:item.drug.id,drug_name:item.drug.name,
      qty:item.qty,unit_price:item.drug.price,total:item.qty*item.drug.price,
      sale_date:today(),sale_time:new Date().toLocaleTimeString(),
      invoice_number:invNum,customer_name:customerName||null,
    }));
    let{error}=await supabase.from("sales").insert(salesData);
    if(error&&(error.message.includes("column")||error.code==="PGRST204")){
      const basic=salesData.map(({invoice_number,customer_name,...r})=>r);
      const res=await supabase.from("sales").insert(basic);error=res.error;
    }
    if(error){t2("Erreur: "+error.message,"er");return}
    for(const item of cartItems){const d=drugs.find(x=>x.id===item.drug.id);if(d)await supabase.from("drugs").update({stock:d.stock-item.qty}).eq("id",item.drug.id)}
    await rlD();await rlS();
    const total=cartItems.reduce((s,i)=>s+i.drug.price*i.qty,0);
    setInvoice({number:invNum,date:today(),customer:customerName,items:cartItems.map(i=>({drug_name:i.drug.name,qty:i.qty,unit_price:i.drug.price,total:i.drug.price*i.qty})),total});
    setCart([]);setShowCart(false);
    t2(`Vente confirmée · ${fmt(total)}`);
  };

  const hCSV=async(text,pricesInFC=false)=>{
    const ws=workspaceRef.current;const wsId=ws?.id&&ws.id!==uid?ws.id:null;
    try{
      // Strip BOM, normalize line endings
      const clean=text.replace(/^﻿/,"").replace(/\r\n/g,"\n").replace(/\r/g,"\n");
      const lines=clean.trim().split("\n").filter(l=>l.trim());
      if(lines.length<2)throw new Error("CSV invalide — au moins 2 lignes requises");
      // Auto-detect delimiter
      const first=lines[0];
      const delim=first.includes(";")?";":first.includes("\t")?"\t":",";
      // Parse a CSV line respecting quoted fields (handles commas inside quotes)
      const parseLine=line=>{
        const fields=[];let f="";let inQ=false;
        for(let i=0;i<line.length;i++){
          const ch=line[i];
          if(ch==='"'){inQ=!inQ;}
          else if(ch===delim&&!inQ){fields.push(f);f="";}
          else{f+=ch;}
        }
        fields.push(f);
        return fields;
      };
      // Normalize header: remove accents, lowercase, alphanumeric only
      const norm=s=>s.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
      const unquote=s=>s?.trim().replace(/^["']|["']$/g,"").trim()||"";
      const parseNum=s=>parseFloat(unquote(s).replace(",","."))||0;
      const convPrice=s=>{const v=parseNum(s);return pricesInFC?v/FC_RATE:v};
      const h=parseLine(first).map(s=>norm(unquote(s)));
      const col=(...terms)=>h.findIndex(s=>terms.some(t=>s.includes(t)));
      const ni=col("nom","name","drug","medic","produit","article","designation","libelle");
      if(ni===-1)throw new Error(`Colonne "Nom" introuvable. En-têtes détectés : ${parseLine(first).slice(0,8).join(" | ")}`);
      const bi=col("barcode","codebarre","code","ean","ref");
      const ci=col("categor","cat","type","famille","classe");
      const si=col("stock","qte","qty","quantit","nombre");
      const pi=col("prix","price","pv","ventepu","pu","tarif");
      const coi=col("cout","cost","achat","pa","prixachat","revient");
      const ei=col("expir","exp","perempt","dlc","date");
      const sui=col("fournisseur","supplier","fourni","vendor","marque");
      const mi=col("min","seuil","minimum","alert");
      const imp=[];
      for(let i=1;i<lines.length;i++){
        const c=parseLine(lines[i]);
        const name=unquote(c[ni]);
        if(!name)continue;
        imp.push({
          user_id:uid,workspace_id:wsId,name,
          barcode:bi>=0?unquote(c[bi]):"",
          category:ci>=0?unquote(c[ci])||"Général":"Général",
          stock:si>=0?parseInt(unquote(c[si]))||0:0,
          price:pi>=0?convPrice(c[pi]):0,
          cost_price:coi>=0?convPrice(c[coi]):0,
          expiry_date:ei>=0&&unquote(c[ei])?unquote(c[ei]):null,
          supplier:sui>=0?unquote(c[sui]):"",
          min_stock:mi>=0?parseInt(unquote(c[mi]))||20:20,
        });
      }
      if(!imp.length)throw new Error("Aucune ligne valide trouvée dans le fichier");
      const{error}=await supabase.from("drugs").insert(imp);
      if(error)throw error;
      await rlD();t2(`${imp.length} médicament(s) importé(s) avec succès`);setModal(null);
    }catch(e){t2(e.message,"er")}
  };
  const expCSV=()=>{const hdr="Nom,Code-barres,Catégorie,Stock,Prix,Coût,Expiration,Fournisseur,Stock Min";const rows=drugs.map(d=>[d.name,d.barcode,d.category,d.stock,d.price,d.cost_price,d.expiry_date||"",d.supplier,d.min_stock].join(","));const blob=new Blob([hdr+"\n"+rows.join("\n")],{type:"text/csv;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`speranza_${today()}.csv`;a.click();t2("CSV exporté")};

  const hClearAll=async()=>{
    if(!window.confirm("Supprimer tous les médicaments de l'inventaire ? Cette action est irréversible."))return;
    const ws=workspaceRef.current;
    await supabase.from("drugs").delete().eq("workspace_id",ws.id);
    await supabase.from("drugs").delete().eq("user_id",uid).is("workspace_id",null);
    await rlD();t2("Inventaire vidé","er");
  };

  const hInvite=async(email)=>{
    const ws=workspaceRef.current;if(!ws)return;
    if(members.find(m=>m.email.toLowerCase()===email.toLowerCase())){t2("Cet e-mail est déjà invité","er");return}
    const{error}=await supabase.from("workspace_members").insert({workspace_id:ws.id,email,role:"member"});
    if(error){t2("Erreur: "+error.message,"er");return}
    await loadMembers();t2(`Invitation envoyée à ${email}`);
  };
  const hRemoveMember=async(memberId)=>{
    if(!window.confirm("Retirer ce membre de l'espace de travail ?"))return;
    const{error}=await supabase.from("workspace_members").delete().eq("id",memberId);
    if(error){t2("Erreur","er");return}
    await loadMembers();t2("Membre retiré");
  };

  const saveRuptures=(r)=>{setRuptures(r);localStorage.setItem(`sp_ruptures_${uid}`,JSON.stringify(r))};
  const saveClientExtra=(extra)=>{setClientExtra(extra);localStorage.setItem(`sp_crm_${uid}`,JSON.stringify(extra))};
  const hAddRupture=(item)=>saveRuptures([{...item,id:Date.now().toString(),date:today()},...ruptures]);
  const hDelRupture=(id)=>saveRuptures(ruptures.filter(r=>r.id!==id));

  const hUpdateOrderStatus=async(id,status)=>{
    const{error}=await supabase.from("storefront_orders").update({status}).eq("id",id);
    if(error){t2("Erreur: "+error.message,"er");return}
    setSfOrders(prev=>prev.map(o=>o.id===id?{...o,status}:o));
    t2("Statut mis à jour");
  };

  const tD=drugs.length,tS=drugs.reduce((s,d)=>s+d.stock,0);
  const low=drugs.filter(d=>d.stock>0&&d.stock<=(d.min_stock||20));const out=drugs.filter(d=>d.stock===0);
  const ex=drugs.filter(d=>{const s=expSt(d.expiry_date);return s==="critical"||s==="expired"});
  const wrn=drugs.filter(d=>expSt(d.expiry_date)==="warning");const ac=low.length+out.length+ex.length+ruptures.length;
  const tsl=sales.filter(s=>s.sale_date===today()),tr=tsl.reduce((s,sl)=>s+Number(sl.total),0);
  const flt=drugs.filter(d=>{const q=search.toLowerCase();return d.name.toLowerCase().includes(q)||(d.barcode&&d.barcode.includes(q))||(d.category&&d.category.toLowerCase().includes(q))});
  const cartCount=cart.reduce((s,i)=>s+i.qty,0);
  const pendingOrders=sfOrders.filter(o=>o.status==="pending").length;
  const storeUrl=workspace?`${window.location.origin}/store/${workspace.id}`:null;

  const nav=[{id:"dashboard",label:"Tableau de bord",icon:Ic.home},{id:"inventory",label:"Inventaire",icon:Ic.box},{id:"sales",label:"Analytique",icon:Ic.bar},{id:"alerts",label:"Alertes",icon:Ic.alert,badge:ac||null},{id:"clients",label:"Clients",icon:Ic.users},{id:"ruptures",label:"Ruptures",icon:Ic.clipboard,badge:ruptures.length||null},{id:"commandes",label:"Commandes",icon:Ic.pkg,badge:pendingOrders||null},{id:"team",label:"Équipe",icon:Ic.users}];
  const titles={dashboard:"Tableau de bord",inventory:"Inventaire des médicaments",sales:"Analytique des ventes",alerts:"Alertes & Expiration",clients:"Clients & CRM",ruptures:"Ruptures de stock",commandes:"Commandes vitrine",team:"Équipe & Accès"};

  if(loading)return(<><style>{DCSS}</style><div className="ld-ov"><div className="spin"/><p style={{marginTop:12,color:'#4A6B5A',fontSize:12}}>Chargement...</p></div></>);

  return(<><style>{DCSS}</style><div className="app">
    <aside className="sb">
      <div className="sb-brand"><img src={LOGO} alt="S" className="sb-brand-logo" onError={e=>{e.target.style.display='none'}}/><div><h1>Speranza Della Pharma</h1><span>Système d'Inventaire</span></div></div>
      <nav className="sb-nav">
        <div className="sb-lbl">Menu</div>
        {nav.map(n=><button key={n.id} className={`sb-btn ${page===n.id?"on":""}`} onClick={()=>setPage(n.id)}>{n.icon({size:15})}<span>{n.label}</span>{n.badge&&<span className="badge">{n.badge}</span>}</button>)}
        <div className="sb-vitrine">
          <div className="sb-vitrine-lbl">{Ic.globe({size:10})} Vitrine en ligne</div>
          {storeUrl?<>
            <div className="sb-vitrine-url">{storeUrl}</div>
            <div className="sb-vitrine-btns">
              <button className="sb-vitrine-btn cp" onClick={()=>{navigator.clipboard.writeText(storeUrl);t2("Lien vitrine copié")}}>Copier le lien</button>
              <button className="sb-vitrine-btn op" onClick={()=>window.open(storeUrl,"_blank")}>Ouvrir</button>
            </div>
          </>:<div style={{fontSize:9,color:"rgba(255,255,255,.4)",lineHeight:1.5,marginTop:2}}>Lien disponible après configuration de votre espace de travail.</div>}
        </div>
        <div className="sb-lbl" style={{marginTop:"auto"}}>Données</div>
        <button className="sb-btn" onClick={()=>setModal({type:"csv"})}>{Ic.upload({size:15})}<span>Importer CSV</span></button>
        <button className="sb-btn" onClick={expCSV}>{Ic.download({size:15})}<span>Exporter CSV</span></button>
        <button className="sb-btn" onClick={hClearAll} style={{color:'#F87171'}}>{Ic.trash({size:15})}<span>Vider l'inventaire</span></button>
      </nav>
    </aside>
    <main className="mn">
      <header className="top">
        <h2>{titles[page]}</h2>
        <div className="top-a">
          {(page==="dashboard"||page==="inventory")&&<div className="srch"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input placeholder="Rechercher..." value={search} onChange={e=>setSearch(e.target.value)}/></div>}
          {(page==="dashboard"||page==="inventory")&&<button className="bt bt-p" onClick={()=>setModal({type:"add"})}>{Ic.plus({size:13})} Ajouter</button>}
          <button className="bt bt-s curr-toggle" onClick={toggleCurrency} title={`Basculer vers ${currency==="USD"?"FC":"USD"}`}>{currency==="USD"?"$ USD":"FC"}</button>
          <button className="bt bt-s cart-top" onClick={()=>setShowCart(true)} title="Voir le panier">{Ic.cart({size:15})}{cartCount>0&&<span className="cart-badge">{cartCount}</span>}</button>
          <button className="bt bt-g" onClick={()=>setShowTour(true)} title="Guide">{Ic.help({size:15})}</button>
          <button className="bt bt-g" onClick={onLogout} title="Déconnexion" style={{color:'var(--d)'}}>{Ic.logout({size:15})}</button>
        </div>
      </header>
      <div className="cnt">
        {page==="dashboard"&&<><div className="stats"><div className="stc"><div className="sti g">{Ic.pill({size:15})}</div><div className="stv"><div className="l">Médicaments</div><div className="v">{tD}</div></div></div><div className="stc"><div className="sti gn">{Ic.box({size:15})}</div><div className="stv"><div className="l">Stock total</div><div className="v">{tS.toLocaleString()}</div></div></div><div className="stc"><div className="sti am">{Ic.alert({size:15})}</div><div className="stv"><div className="l">Alertes</div><div className="v">{ac}</div></div></div><div className="stc"><div className="sti g">{Ic.cart({size:15})}</div><div className="stv"><div className="l">Ventes du jour</div><div className="v">{tsl.length}<span style={{fontSize:10,fontWeight:400,color:'var(--t3)'}}> ({fmt(tr)})</span></div></div></div></div><DT drugs={flt} fmt={fmt} onAddToCart={addToCart} onEdit={d=>setModal({type:"edit",drug:d})} onRes={d=>setModal({type:"restock",drug:d})} onDel={hDel}/></>}
        {page==="inventory"&&<DT drugs={flt} fmt={fmt} onAddToCart={addToCart} onEdit={d=>setModal({type:"edit",drug:d})} onRes={d=>setModal({type:"restock",drug:d})} onDel={hDel}/>}
        {page==="sales"&&<AnalyticsPage sales={sales} fmt={fmt}/>}
        {page==="alerts"&&<AP low={low} out={out} exp={ex} warn={wrn} onRes={d=>setModal({type:"restock",drug:d})}/>}
        {page==="clients"&&<ClientsPage sales={sales} sfOrders={sfOrders} fmt={fmt} clientExtra={clientExtra} onSaveExtra={saveClientExtra}/>}
        {page==="ruptures"&&<RupturesPage ruptures={ruptures} onAdd={hAddRupture} onDel={hDelRupture}/>}
        {page==="commandes"&&<StorefrontOrdersPage orders={sfOrders} onUpdateStatus={hUpdateOrderStatus}/>}
        {page==="team"&&<TeamPage workspace={workspace} members={members} currentUserId={uid} onInvite={hInvite} onRemoveMember={hRemoveMember}/>}
      </div>
    </main>
    {modal?.type==="add"&&<DF title="Ajouter un médicament" onClose={()=>setModal(null)} onSave={hAdd}/>}
    {modal?.type==="edit"&&<DF title="Modifier" drug={modal.drug} onClose={()=>setModal(null)} onSave={hEdit}/>}
    {modal?.type==="restock"&&<RM drug={modal.drug} onClose={()=>setModal(null)} onRes={hRes}/>}
    {modal?.type==="csv"&&<CM onClose={()=>setModal(null)} onImport={hCSV} fileRef={fileRef}/>}
    {showCart&&<CartModal cart={cart} setCart={setCart} onConfirm={hCartSell} onClose={()=>setShowCart(false)} fmt={fmtFC}/>}
    {invoice&&<InvoiceModal invoice={invoice} onClose={()=>setInvoice(null)} fmt={fmtFC}/>}
    {toast&&<div className={`toast ${toast.t}`}>{toast.t==="ok"?Ic.check({size:13}):Ic.alert({size:13})} {toast.m}</div>}
    {showTour&&<Tour onClose={()=>setShowTour(false)}/>}
  </div></>);
}

/* ═══════ DRUG TABLE ═══════ */
function DT({drugs,fmt,onAddToCart,onEdit,onRes,onDel}){
  const[sk,setSk]=useState("name");const[sd,setSd]=useState(1);
  const sort=k=>{if(sk===k)setSd(-sd);else{setSk(k);setSd(1)}};
  const sorted=[...drugs].sort((a,b)=>{let va=a[sk],vb=b[sk];if(typeof va==="string"){va=(va||"").toLowerCase();vb=(vb||"").toLowerCase()}return va<vb?-sd:va>vb?sd:0});
  const SA=({col})=>sk===col?<span style={{marginLeft:2,fontSize:8}}>{sd===1?"▲":"▼"}</span>:null;
  return(<div className="tc"><div className="th2"><h3>Inventaire</h3><span style={{fontSize:10,color:'var(--t3)'}}>{drugs.length} articles</span></div>
    {!drugs.length?<div className="emp">{Ic.pill({size:28,color:'var(--t3)'})}<p>Aucun médicament trouvé.</p></div>:
    <div className="ts"><table><thead><tr>
      <th onClick={()=>sort("name")}>Nom<SA col="name"/></th>
      <th onClick={()=>sort("barcode")}>Code<SA col="barcode"/></th>
      <th onClick={()=>sort("category")}>Catégorie<SA col="category"/></th>
      <th onClick={()=>sort("stock")}>Stock<SA col="stock"/></th>
      <th onClick={()=>sort("price")}>Prix<SA col="price"/></th>
      <th onClick={()=>sort("expiry_date")}>Exp.<SA col="expiry_date"/></th>
      <th>Actions</th>
    </tr></thead><tbody>{sorted.map(d=>{
      const ss=d.stock===0?"crit":d.stock<=(d.min_stock||20)?"low":"ok";
      const es=expSt(d.expiry_date);
      return(<tr key={d.id}>
        <td><div className="dn">{d.name}</div>{d.supplier&&<div style={{fontSize:9,color:'var(--t3)'}}>{d.supplier}</div>}</td>
        <td><span className="db">{d.barcode||"—"}</span></td>
        <td><span className="ct">{d.category||"Général"}</span></td>
        <td><span className={`sb-stock ${ss}`}>{d.stock===0?"Épuisé":d.stock}</span></td>
        <td style={{fontWeight:500}}>{fmt(d.price)}</td>
        <td>{d.expiry_date?<span className={`eb ${es}`}>{es==="expired"?"EXPIRÉ":d.expiry_date}</span>:"—"}</td>
        <td><div className="ac-c">
          <button className="bt bt-g bt-sm" onClick={()=>onAddToCart(d)} disabled={d.stock===0} title="Ajouter au panier" style={{color:d.stock>0?'var(--ac)':undefined}}>{Ic.cart({size:12})}</button>
          <button className="bt bt-g bt-sm" onClick={()=>onRes(d)} title="Réappro.">{Ic.plus({size:12})}</button>
          <button className="bt bt-g bt-sm" onClick={()=>onEdit(d)} title="Modifier">{Ic.edit({size:12})}</button>
          <button className="bt bt-g bt-sm" onClick={()=>onDel(d.id)} style={{color:'var(--d)'}} title="Supprimer">{Ic.trash({size:12})}</button>
        </div></td>
      </tr>);
    })}</tbody></table></div>}
  </div>);
}

/* ═══════ CART MODAL ═══════ */
function CartModal({cart,setCart,onConfirm,onClose,fmt}){
  const[customer,setCustomer]=useState("");
  const dk=d=>d.id||d.name;
  const upd=(key,qty)=>setCart(prev=>qty<1?prev.filter(i=>dk(i.drug)!==key):prev.map(i=>dk(i.drug)===key?{...i,qty:Math.min(qty,i.drug.stock)}:i));
  const subtotal=cart.reduce((s,i)=>s+i.drug.price*i.qty,0);
  const totalQty=cart.reduce((s,i)=>s+i.qty,0);
  return(<div className="mo-bk" onClick={onClose}><div className="mo" onClick={e=>e.stopPropagation()} style={{width:'min(860px,94vw)',maxHeight:'92vh'}}>
    <div className="mo-h" style={{borderBottom:'1px solid var(--bd)',paddingBottom:14}}>
      <div><h3 style={{fontSize:19,display:'flex',alignItems:'center',gap:8}}>{Ic.cart({size:17})} Panier d'achats</h3>
        {cart.length>0&&<div style={{fontSize:11,color:'var(--t3)',marginTop:3}}>{cart.length} médicament{cart.length!==1?'s':''} · {totalQty} unité{totalQty!==1?'s':''} au total</div>}
      </div>
      <button className="bt bt-g" onClick={onClose}>{Ic.x({size:14})}</button>
    </div>
    <div className="mo-b" style={{maxHeight:'65vh',overflowY:'auto'}}>
      {cart.length===0
        ?<div className="emp" style={{padding:'48px 0'}}>{Ic.cart({size:36,color:'var(--t3)'})}<p style={{marginTop:14,fontSize:13}}>Le panier est vide.<br/>Ajoutez des médicaments depuis l'inventaire.</p></div>
        :<>
          <div>
            {cart.map(item=>{const key=dk(item.drug);const line=item.drug.price*item.qty;return(
              <div key={key} className="cart-item">
                <div>
                  <div className="cart-item-name">{item.drug.name}</div>
                  <div className="cart-item-meta">{fmt(item.drug.price)} / unité · stock : {item.drug.stock}</div>
                  {item.drug.category&&<span className="cart-cat-badge">{item.drug.category}</span>}
                </div>
                <div className="qty-ctrl">
                  <button onClick={()=>upd(key,item.qty-1)}>−</button>
                  <span>{item.qty}</span>
                  <button onClick={()=>upd(key,item.qty+1)} disabled={item.qty>=item.drug.stock}>+</button>
                </div>
                <div className="cart-line-total">{fmt(line)}</div>
                <button className="bt bt-g bt-sm" onClick={()=>upd(key,0)} style={{color:'var(--d)'}} title="Retirer du panier">{Ic.trash({size:11})}</button>
              </div>
            )})}
          </div>
          <div className="fi" style={{marginTop:16}}>
            <label>Nom du client (optionnel)</label>
            <input value={customer} onChange={e=>setCustomer(e.target.value)} placeholder="Ex: Jean Mukendi" onKeyDown={e=>e.key==="Enter"&&cart.length>0&&onConfirm(cart,customer)}/>
          </div>
          <div className="cart-summary">
            {cart.map(item=><div key={dk(item.drug)} className="cart-sum-row"><span>{item.drug.name} ×{item.qty}</span><span>{fmt(item.drug.price*item.qty)}</span></div>)}
            <div className="cart-total-row"><span>Total</span><span>{fmt(subtotal)}</span></div>
          </div>
        </>
      }
    </div>
    <div className="mo-f" style={{justifyContent:'space-between',alignItems:'center'}}>
      <button className="bt bt-s" onClick={onClose}>Fermer</button>
      <button className="bt bt-ok" onClick={()=>onConfirm(cart,customer)} disabled={cart.length===0} style={{padding:'10px 22px',fontSize:13,gap:7}}>
        {Ic.check({size:13})} Confirmer la vente · {fmt(subtotal)}
      </button>
    </div>
  </div></div>);
}

/* ═══════ INVOICE MODAL ═══════ */
function InvoiceModal({invoice,onClose,fmt}){
  const printInvoice=()=>{
    const win=window.open("","_blank");
    const fc=n=>fmtAmt(n,"FC");
    const rows=invoice.items.map(i=>`<tr><td>${i.drug_name}</td><td style="text-align:center">${i.qty}</td><td style="text-align:right">${fc(i.unit_price)}</td><td style="text-align:right">${fc(i.total)}</td></tr>`).join("");
    const logoUrl=window.location.origin+LOGO;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Facture ${invoice.number}</title><style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;max-width:640px;margin:40px auto;color:#1A2E23;font-size:13px;padding:0 20px}
.header{display:flex;align-items:center;gap:16px;padding-bottom:18px;border-bottom:3px solid #0F4C2A;margin-bottom:22px}
.logo{width:56px;height:56px;border-radius:10px;object-fit:contain}
.company-name{font-size:22px;font-weight:700;color:#0F4C2A;letter-spacing:-.3px}
.company-sub{font-size:11px;color:#5A8A6A;margin-top:3px}
.meta{display:flex;justify-content:space-between;margin-bottom:22px;padding:14px 16px;background:#F4F7F5;border-radius:10px;font-size:12px;gap:20px}
.meta-block{}.meta-block strong{color:#0F4C2A;display:block;font-size:10px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
.meta-block span{font-size:13px;color:#1A2E23;font-weight:600}
table{width:100%;border-collapse:collapse;margin-bottom:20px;border-radius:8px;overflow:hidden}
thead tr{background:#0F4C2A}
th{color:#fff;padding:10px 12px;text-align:left;font-size:11px;font-weight:600;letter-spacing:.4px;text-transform:uppercase}
td{padding:10px 12px;border-bottom:1px solid #E8F0EC;font-size:12px}
tbody tr:last-child td{border-bottom:none}
tbody tr:nth-child(even){background:#FAFCFB}
.total-row{background:#F4F7F5!important}
.total-row td{font-weight:700;font-size:14px;border-top:2px solid #1A7F48;color:#0F4C2A}
.footer{text-align:center;margin-top:32px;font-size:10px;color:#8AA69A;border-top:1px solid #E8F0EC;padding-top:16px;line-height:1.8}
@media print{body{margin:10px}.footer{position:fixed;bottom:10px;width:100%}}
</style></head><body>
<div class="header"><img src="${logoUrl}" class="logo" onerror="this.style.display='none'"/><div><div class="company-name">Speranza Della Pharma</div><div class="company-sub">Système de Gestion Pharmaceutique</div></div></div>
<div class="meta">
  <div class="meta-block"><strong>Facture N°</strong><span>${invoice.number}</span></div>
  <div class="meta-block"><strong>Date</strong><span>${invoice.date}</span></div>
  <div class="meta-block" style="text-align:right"><strong>Client</strong><span>${invoice.customer||"Client de passage"}</span></div>
</div>
<table><thead><tr><th>Médicament</th><th style="text-align:center">Qté</th><th style="text-align:right">Prix unit.</th><th style="text-align:right">Total</th></tr></thead>
<tbody>${rows}<tr class="total-row"><td colspan="3" style="text-align:right">TOTAL</td><td style="text-align:right">${fc(invoice.total)}</td></tr></tbody></table>
<div class="footer">Merci pour votre confiance &nbsp;·&nbsp; Speranza Della Pharma<br/>Ce document est une facture officielle</div>
</body></html>`);
    win.document.close();setTimeout(()=>win.print(),400);
  };
  return(<div className="mo-bk"><div className="mo" onClick={e=>e.stopPropagation()} style={{width:580,maxWidth:'96vw'}}>
    <div className="mo-h" style={{borderBottom:'1px solid var(--bd)',paddingBottom:14}}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <img src={LOGO} alt="" style={{width:36,height:36,borderRadius:7,objectFit:'contain'}} onError={e=>e.target.style.display='none'}/>
        <div><h3 style={{fontSize:17}}>Facture {invoice.number}</h3><div style={{fontSize:11,color:'var(--t3)',marginTop:1}}>{invoice.date}{invoice.customer&&` · ${invoice.customer}`}</div></div>
      </div>
      <button className="bt bt-g" onClick={onClose}>{Ic.x({size:14})}</button>
    </div>
    <div className="mo-b">
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,marginBottom:0}}>
          <thead><tr style={{background:'var(--al)'}}>
            <th style={{padding:'8px 10px',textAlign:'left',fontWeight:600,fontSize:11,color:'var(--ac)'}}>Médicament</th>
            <th style={{padding:'8px 10px',textAlign:'center',fontWeight:600,fontSize:11,color:'var(--ac)'}}>Qté</th>
            <th style={{padding:'8px 10px',textAlign:'right',fontWeight:600,fontSize:11,color:'var(--ac)'}}>Prix unit.</th>
            <th style={{padding:'8px 10px',textAlign:'right',fontWeight:600,fontSize:11,color:'var(--ac)'}}>Total</th>
          </tr></thead>
          <tbody>
            {invoice.items.map((item,i)=><tr key={i} style={{borderBottom:'1px solid var(--bd2)'}}>
              <td style={{padding:'9px 10px',fontWeight:500}}>{item.drug_name}</td>
              <td style={{padding:'9px 10px',textAlign:'center',color:'var(--t2)'}}>{item.qty}</td>
              <td style={{padding:'9px 10px',textAlign:'right',color:'var(--t2)'}}>{fmt(item.unit_price)}</td>
              <td style={{padding:'9px 10px',textAlign:'right',fontWeight:700,color:'var(--ok)'}}>{fmt(item.total)}</td>
            </tr>)}
            <tr style={{background:'var(--bg)',borderTop:'2px solid var(--ac)'}}>
              <td colSpan={3} style={{padding:'10px 10px',textAlign:'right',fontWeight:700,fontSize:13}}>TOTAL</td>
              <td style={{padding:'10px 10px',textAlign:'right',fontWeight:700,fontSize:16,color:'var(--ac)'}}>{fmt(invoice.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{fontSize:10,color:'var(--t3)',marginTop:10,textAlign:'center'}}>Facture en Francs Congolais (FC)</div>
    </div>
    <div className="mo-f" style={{justifyContent:'space-between'}}>
      <button className="bt bt-s" onClick={onClose}>Fermer</button>
      <button className="bt bt-p" onClick={printInvoice} style={{gap:7}}>{Ic.print({size:13})} Imprimer la facture</button>
    </div>
  </div></div>);
}

/* ═══════ ANALYTICS PAGE ═══════ */
function AnalyticsPage({sales,fmt}){
  const[period,setPeriod]=useState("7d");
  const getStart=p=>{const n=new Date();const d={today:0,"7d":7,"14d":14,"30d":30,"3m":90}[p]||7;if(p==="today")return today();return new Date(n-d*864e5).toISOString().split("T")[0]};
  const start=getStart(period);
  const filtered=sales.filter(s=>(s.sale_date||"")>=start);
  const revenue=filtered.reduce((s,sl)=>s+Number(sl.total),0);
  const itemsSold=filtered.reduce((s,sl)=>s+Number(sl.qty),0);
  const invKeys=[...new Set(filtered.map(s=>s.invoice_number||s.id))];
  const avgBasket=invKeys.length>0?revenue/invKeys.length:0;

  const dayMap={};filtered.forEach(s=>{const d=s.sale_date||today();dayMap[d]=(dayMap[d]||0)+Number(s.total)});
  const chartDays=Object.keys(dayMap).sort().slice(-14);
  const chartData=chartDays.map(d=>({label:new Date(d+"T00:00").toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"}),value:dayMap[d]}));

  const drugMap={};filtered.forEach(s=>{if(!drugMap[s.drug_name])drugMap[s.drug_name]={qty:0,revenue:0};drugMap[s.drug_name].qty+=Number(s.qty);drugMap[s.drug_name].revenue+=Number(s.total)});
  const top5=Object.entries(drugMap).sort((a,b)=>b[1].qty-a[1].qty).slice(0,5);

  const grouped={};filtered.forEach(s=>{const k=s.invoice_number||s.id;if(!grouped[k])grouped[k]={date:s.sale_date,time:s.sale_time,customer:s.customer_name,items:[],total:0};grouped[k].items.push(s);grouped[k].total+=Number(s.total)});
  const sortedInv=Object.entries(grouped).sort((a,b)=>(b[1].date||"").localeCompare(a[1].date||""));

  const ps=[{k:"today",l:"Aujourd'hui"},{k:"7d",l:"7 jours"},{k:"14d",l:"14 jours"},{k:"30d",l:"30 jours"},{k:"3m",l:"3 mois"}];
  return(<div>
    <div className="period-tabs">{ps.map(p=><button key={p.k} className={`bt ${period===p.k?"bt-p":"bt-s"}`} onClick={()=>setPeriod(p.k)}>{p.l}</button>)}</div>
    <div className="an-grid">
      <div className="stc"><div className="sti g">{Ic.receipt({size:15})}</div><div className="stv"><div className="l">Chiffre d'affaires</div><div className="v" style={{fontSize:16}}>{fmt(revenue)}</div></div></div>
      <div className="stc"><div className="sti gn">{Ic.box({size:15})}</div><div className="stv"><div className="l">Articles vendus</div><div className="v">{itemsSold}</div></div></div>
      <div className="stc"><div className="sti am">{Ic.cart({size:15})}</div><div className="stv"><div className="l">Panier moyen</div><div className="v" style={{fontSize:16}}>{fmt(avgBasket)}</div></div></div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
      <div className="chart-wrap"><div style={{fontWeight:600,fontSize:13,marginBottom:10,color:'var(--t)'}}>Revenus quotidiens</div><BarChart data={chartData} fmt={fmt}/></div>
      <div className="tc"><div className="th2"><h3>Top 5 médicaments</h3></div>
        {top5.length===0?<div className="emp"><p>Aucune vente sur cette période</p></div>:top5.map(([name,data],i)=><div key={name} className="top5-row">
          <span style={{width:18,fontWeight:700,color:'var(--ac)',fontSize:11}}>{i+1}.</span>
          <span style={{flex:1,fontWeight:500}}>{name}</span>
          <span style={{color:'var(--t3)',marginRight:8,fontSize:11}}>{data.qty} u.</span>
          <span style={{fontWeight:600,color:'var(--ok)',fontSize:11}}>{fmt(data.revenue)}</span>
        </div>)}
      </div>
    </div>
    <div className="tc"><div className="th2"><h3>Transactions</h3><span style={{fontSize:10,color:'var(--t3)'}}>{sortedInv.length} facture{sortedInv.length!==1?"s":""}</span></div>
      {sortedInv.length===0?<div className="emp">{Ic.receipt({size:28,color:'var(--t3)'})}<p>Aucune vente sur cette période</p></div>:
      sortedInv.map(([inv,g])=><div key={inv} className="inv-row">
        <div className="inv-header">
          <div><span style={{fontWeight:600,color:'var(--ac)',fontFamily:'monospace'}}>{inv}</span>{g.customer&&<span style={{marginLeft:8,color:'var(--t3)'}}>· {g.customer}</span>}</div>
          <div style={{display:'flex',gap:12,alignItems:'center'}}><span style={{color:'var(--t3)'}}>{g.date}{g.time?` · ${g.time}`:""}</span><span style={{fontWeight:700,color:'var(--ok)'}}>{fmt(g.total)}</span></div>
        </div>
        {g.items.map((s,i)=><div key={i} className="inv-item"><span>{s.drug_name} <span style={{color:'var(--t3)'}}>×{s.qty}</span></span><span>{fmt(s.total)}</span></div>)}
      </div>)}
    </div>
  </div>);
}

/* ═══════ ALERTS PAGE ═══════ */
function AP({low,out,exp,warn,onRes}){return(<div className="ag"><AC t={`Stock faible (${low.length})`} tp="w" items={low} em="Tout en stock" render={d=><div key={d.id} className="ali"><div><div className="aln">{d.name}</div><div className="ald">{d.stock} restant(s)</div></div><button className="bt bt-sm bt-p" onClick={()=>onRes(d)}>Réappro.</button></div>}/><AC t={`Épuisé (${out.length})`} tp="d" items={out} em="Aucun" render={d=><div key={d.id} className="ali"><div><div className="aln">{d.name}</div><div className="ald">{d.category}</div></div><button className="bt bt-sm bt-p" onClick={()=>onRes(d)}>Réappro.</button></div>}/><AC t={`Expiration (${exp.length})`} tp="d" items={exp} em="Aucun" render={d=>{const days=daysUntil(d.expiry_date);return<div key={d.id} className="ali"><div><div className="aln">{d.name}</div><div className="ald">{days<0?`Expiré il y a ${Math.abs(days)}j`:`${days}j`}</div></div><span className={`eb ${days<0?"expired":"critical"}`}>{days<0?"EXPIRÉ":`${days}j`}</span></div>}}/><AC t={`90 jours (${warn.length})`} tp="w" items={warn} em="Aucun" render={d=><div key={d.id} className="ali"><div><div className="aln">{d.name}</div><div className="ald">{d.expiry_date}</div></div><span className="eb warning">{daysUntil(d.expiry_date)}j</span></div>}/></div>)}
function AC({t,tp,items,em,render}){return(<div className="alc"><div className={`alc-h ${tp}`}>{tp==="w"?Ic.alert({size:13}):Ic.box({size:13})} {t}</div><div className="all2">{!items.length?<div className="emp" style={{padding:12}}><p>{em}</p></div>:items.map(render)}</div></div>)}

/* ═══════ DRUG FORM MODAL ═══════ */
function DF({title,drug,onClose,onSave}){
  const[f,setF]=useState({name:drug?.name||"",barcode:drug?.barcode||"",category:drug?.category||"",stock:drug?.stock??0,price:drug?.price??0,cost_price:drug?.cost_price??0,expiry_date:drug?.expiry_date||"",supplier:drug?.supplier||"",min_stock:drug?.min_stock??20});
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  const sv=()=>{if(!f.name.trim())return;onSave({...drug,...f,stock:parseInt(f.stock)||0,price:parseFloat(f.price)||0,cost_price:parseFloat(f.cost_price)||0,min_stock:parseInt(f.min_stock)||20})};
  return(<div className="mo-bk" onClick={onClose}><div className="mo" onClick={e=>e.stopPropagation()}>
    <div className="mo-h"><h3>{title}</h3><button className="bt bt-g" onClick={onClose}>{Ic.x({size:14})}</button></div>
    <div className="mo-b"><div className="fg">
      <div className="fi full"><label>Nom *</label><input value={f.name} onChange={e=>s("name",e.target.value)} placeholder="Ex: Paracétamol 500mg" autoFocus/></div>
      <div className="fi"><label>Code-barres</label><input value={f.barcode} onChange={e=>s("barcode",e.target.value)}/></div>
      <div className="fi"><label>Catégorie</label><input value={f.category} onChange={e=>s("category",e.target.value)}/></div>
      <div className="fi"><label>Stock</label><input type="number" min="0" value={f.stock} onChange={e=>s("stock",e.target.value)}/></div>
      <div className="fi"><label>Stock min</label><input type="number" min="0" value={f.min_stock} onChange={e=>s("min_stock",e.target.value)}/></div>
      <div className="fi"><label>Prix (USD)</label><input type="number" min="0" step="0.01" value={f.price} onChange={e=>s("price",e.target.value)}/></div>
      <div className="fi"><label>Coût (USD)</label><input type="number" min="0" step="0.01" value={f.cost_price} onChange={e=>s("cost_price",e.target.value)}/></div>
      <div className="fi"><label>Expiration</label><input type="date" value={f.expiry_date} onChange={e=>s("expiry_date",e.target.value)}/></div>
      <div className="fi"><label>Fournisseur</label><input value={f.supplier} onChange={e=>s("supplier",e.target.value)}/></div>
    </div></div>
    <div className="mo-f"><button className="bt bt-s" onClick={onClose}>Annuler</button><button className="bt bt-p" onClick={sv} disabled={!f.name.trim()}>{Ic.check({size:12})} {drug?"Enregistrer":"Ajouter"}</button></div>
  </div></div>);
}

/* ═══════ RESTOCK MODAL ═══════ */
function RM({drug,onClose,onRes}){
  const[qty,setQty]=useState(10);
  return(<div className="mo-bk" onClick={onClose}><div className="mo" onClick={e=>e.stopPropagation()}>
    <div className="mo-h"><h3>Réapprovisionner</h3><button className="bt bt-g" onClick={onClose}>{Ic.x({size:14})}</button></div>
    <div className="mo-b">
      <div style={{fontSize:14,fontWeight:600,marginBottom:2}}>{drug.name}</div>
      <div style={{fontSize:10,color:'var(--t3)',marginBottom:10}}>Actuel : {drug.stock} · Min : {drug.min_stock||20}</div>
      <div className="fi"><label>Quantité</label><input type="number" min="1" value={qty} onChange={e=>setQty(Math.max(1,parseInt(e.target.value)||1))} autoFocus/></div>
      <div className="ss"><div className="ssr"><span>Actuel</span><span>{drug.stock}</span></div><div className="ssr"><span>Ajout</span><span>+{qty}</span></div><div className="ssr tot"><span>Nouveau</span><span>{drug.stock+qty}</span></div></div>
    </div>
    <div className="mo-f"><button className="bt bt-s" onClick={onClose}>Annuler</button><button className="bt bt-p" onClick={()=>onRes(drug.id,qty)}>{Ic.plus({size:12})} +{qty}</button></div>
  </div></div>);
}

/* ═══════ CSV IMPORT MODAL ═══════ */
function CM({onClose,onImport,fileRef}){
  const[drag,setDrag]=useState(false);const[pv,setPv]=useState(null);const[fc,setFc]=useState(true);
  const ref=fileRef||React.createRef();
  const h=file=>{if(!file)return;const r=new FileReader();r.onload=e=>setPv(e.target.result);r.readAsText(file,"UTF-8")};
  return(<div className="mo-bk" onClick={onClose}><div className="mo" onClick={e=>e.stopPropagation()} style={{width:500}}>
    <div className="mo-h"><h3>Importer CSV</h3><button className="bt bt-g" onClick={onClose}>{Ic.x({size:14})}</button></div>
    <div className="mo-b">
      <div className={`dz ${drag?"on":""}`} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);h(e.dataTransfer.files[0])}} onClick={()=>ref.current?.click()}>
        {Ic.upload({size:22})}<p><strong>Déposez un fichier CSV</strong> ou cliquez pour choisir</p>
        <p style={{fontSize:10,color:'var(--t3)',marginTop:4}}>Formats acceptés : virgule, point-virgule, tabulation</p>
        <input ref={ref} type="file" accept=".csv,.txt" style={{display:'none'}} onChange={e=>h(e.target.files[0])}/>
      </div>
      {pv&&<pre style={{background:'var(--bg)',padding:7,borderRadius:6,fontSize:9,overflow:'auto',maxHeight:90,marginTop:8}}>{pv.split("\n").slice(0,5).join("\n")}</pre>}
      <label style={{display:'flex',alignItems:'center',gap:8,marginTop:12,fontSize:12,cursor:'pointer',userSelect:'none'}}>
        <input type="checkbox" checked={fc} onChange={e=>setFc(e.target.checked)} style={{width:15,height:15,cursor:'pointer'}}/>
        <span>Les prix sont en <strong>FC</strong> (Francs Congolais) — ils seront convertis automatiquement</span>
      </label>
    </div>
    <div className="mo-f"><button className="bt bt-s" onClick={onClose}>Annuler</button><button className="bt bt-p" onClick={()=>onImport(pv,fc)} disabled={!pv}>{Ic.upload({size:12})} Importer</button></div>
  </div></div>);
}

/* ═══════ TEAM PAGE ═══════ */
function TeamPage({workspace,members,currentUserId,onInvite,onRemoveMember}){
  const[email,setEmail]=useState("");const[busy,setBusy]=useState(false);
  if(!workspace)return<div className="emp"><p>Chargement de l'espace de travail...</p></div>;
  const isOwner=workspace?.owner_id===currentUserId;
  const handleInvite=async()=>{if(!email.trim())return;setBusy(true);await onInvite(email.trim().toLowerCase());setEmail("");setBusy(false)};
  const activeCount=members.filter(m=>m.accepted_at).length;
  const pendingCount=members.filter(m=>!m.accepted_at).length;
  return(<div>
    {/* Workspace card */}
    <div className="tc" style={{marginBottom:14}}>
      <div className="th2"><h3>Espace de travail</h3>{isOwner&&<span style={{fontSize:10,background:'var(--al)',color:'var(--ac)',padding:'2px 8px',borderRadius:20,fontWeight:600}}>Propriétaire</span>}</div>
      <div style={{padding:'14px 16px'}}>
        <div style={{fontSize:17,fontWeight:600,color:'var(--t)',marginBottom:4}}>{workspace.name}</div>
        <div className="ws-id">ID : {workspace.id}</div>
        <div style={{marginTop:10,display:'flex',gap:14,fontSize:12,color:'var(--t3)'}}>
          <span>{Ic.users({size:13})} {activeCount} membre{activeCount!==1?"s":""} actif{activeCount!==1?"s":""}</span>
          {pendingCount>0&&<span style={{color:'var(--w)'}}>· {pendingCount} invitation{pendingCount!==1?"s":""} en attente</span>}
        </div>
      </div>
    </div>

    {/* Members list */}
    <div className="tc" style={{marginBottom:14}}>
      <div className="th2"><h3>Membres de l'équipe</h3><span style={{fontSize:10,color:'var(--t3)'}}>{members.length} personne{members.length!==1?"s":""}</span></div>
      {members.length===0?<div className="emp"><p>Aucun membre pour l'instant</p></div>:
      members.map(m=><div key={m.id} className="team-member-row">
        <div className="team-avatar">{m.email[0].toUpperCase()}</div>
        <div style={{flex:1}}>
          <div style={{fontWeight:600,fontSize:12}}>{m.email}</div>
          <div className={`team-status ${m.accepted_at?"active":"pending"}`}>
            {m.accepted_at?"● Actif":"○ Invitation en attente"}
          </div>
        </div>
        <span className={`team-role ${m.role}`}>{m.role==="owner"?"Propriétaire":"Membre"}</span>
        {isOwner&&m.role!=="owner"&&<button className="bt bt-g bt-sm" onClick={()=>onRemoveMember(m.id)} style={{color:'var(--d)'}} title="Retirer">{Ic.x({size:11})}</button>}
      </div>)}
    </div>

    {/* Invite form — owner only */}
    {isOwner&&<div className="tc">
      <div className="th2"><h3>Inviter un collaborateur</h3></div>
      <div className="team-invite-box">
        <p style={{fontSize:12,color:'var(--t3)',lineHeight:1.6,marginBottom:12}}>
          Entrez l'adresse e-mail du collaborateur. Cette personne doit créer un compte avec cette adresse exacte — elle aura alors automatiquement accès à tout l'inventaire et aux ventes partagés.
        </p>
        <div style={{display:'flex',gap:8}}>
          <div style={{flex:1}}><input className="fi input" type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleInvite()} placeholder="collaborateur@exemple.com" style={{width:'100%',padding:'7px 9px',border:'1px solid var(--bd)',borderRadius:'var(--rs)',fontSize:12,fontFamily:"'Outfit',sans-serif",color:'var(--t)',outline:'none'}}/></div>
          <button className="bt bt-p" onClick={handleInvite} disabled={!email.trim()||busy}>{Ic.plus({size:13})} {busy?"...":"Inviter"}</button>
        </div>
      </div>
    </div>}

    {!isOwner&&<div style={{background:'var(--bg)',borderRadius:'var(--r)',padding:'14px 16px',border:'1px solid var(--bd2)',fontSize:12,color:'var(--t3)',textAlign:'center'}}>
      Seul le propriétaire de l'espace de travail peut inviter des membres.
    </div>}
  </div>);
}

/* ═══════ CLIENTS PAGE ═══════ */
function ClientsPage({sales,sfOrders,fmt,clientExtra,onSaveExtra}){
  const[selected,setSelected]=useState(null);
  const[editing,setEditing]=useState(false);
  const[editF,setEditF]=useState({phone:"",address:"",notes:""});
  const ef=(k,v)=>setEditF(p=>({...p,[k]:v}));

  // Build client map from sales
  const clientMap={};
  sales.forEach(s=>{
    const name=s.customer_name||null;if(!name)return;
    if(!clientMap[name])clientMap[name]={name,count:0,total:0,lastDate:"",purchases:[]};
    clientMap[name].count+=1;clientMap[name].total+=Number(s.total);
    if(!clientMap[name].lastDate||(s.sale_date||"")>clientMap[name].lastDate)clientMap[name].lastDate=s.sale_date||"";
    clientMap[name].purchases.push(s);
  });
  // Auto-populate phone from storefront orders by matching customer_name
  const phoneFromOrders={};
  (sfOrders||[]).forEach(o=>{if(o.customer_name&&o.customer_phone&&!phoneFromOrders[o.customer_name])phoneFromOrders[o.customer_name]=o.customer_phone});
  const getExtra=(name)=>clientExtra[name]||{};
  const getPhone=(name)=>getExtra(name).phone||phoneFromOrders[name]||null;

  const clients=Object.values(clientMap).sort((a,b)=>b.total-a.total);

  const openEdit=(c)=>{
    const ex=getExtra(c.name);
    setEditF({phone:ex.phone||phoneFromOrders[c.name]||"",address:ex.address||"",notes:ex.notes||""});
    setEditing(true);
  };
  const saveEdit=()=>{onSaveExtra({...clientExtra,[selected.name]:editF});setEditing(false)};

  if(!clients.length)return(<div className="emp" style={{paddingTop:48}}>{Ic.users({size:36,color:"var(--t3)"})}<p style={{marginTop:12,fontSize:13}}>Aucun client enregistré.<br/>Les clients apparaissent automatiquement lors des ventes avec nom.</p></div>);

  return(<div style={{display:"grid",gridTemplateColumns:selected?"1fr 1fr":"1fr",gap:12,alignItems:"start"}}>
    {/* Client list */}
    <div className="tc">
      <div className="th2"><h3>Clients</h3><span style={{fontSize:10,color:"var(--t3)"}}>{clients.length} client{clients.length!==1?"s":""}</span></div>
      {clients.map(c=>{const phone=getPhone(c.name);const ex=getExtra(c.name);return(
        <div key={c.name} className="client-row" onClick={()=>{setSelected(selected?.name===c.name?null:c);setEditing(false)}} style={{background:selected?.name===c.name?"var(--al)":undefined}}>
          <div className="client-avatar">{c.name[0].toUpperCase()}</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:600,fontSize:12,color:"var(--t)"}}>{c.name}</div>
            <div style={{fontSize:10,color:"var(--t3)",marginTop:1}}>
              {phone&&<span>{phone} · </span>}
              {ex.address&&<span>{ex.address} · </span>}
              {c.count} achat{c.count!==1?"s":""} · Dernier: {c.lastDate||"—"}
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontWeight:700,fontSize:12,color:"var(--ok)"}}>{fmt(c.total)}</div>
            {phone&&<a href={`tel:${phone}`} onClick={e=>e.stopPropagation()} style={{fontSize:9,color:"var(--ac)",textDecoration:"none"}}>{Ic.phone({size:9})} Appeler</a>}
          </div>
        </div>
      )})}
    </div>

    {/* Client detail + contact card */}
    {selected&&<div className="tc">
      <div className="th2" style={{alignItems:"flex-start"}}>
        <div style={{flex:1}}>
          <h3 style={{fontSize:14}}>{selected.name}</h3>
          <div style={{fontSize:10,color:"var(--t3)",marginTop:1}}>{selected.count} achat{selected.count!==1?"s":""} · Total: {fmt(selected.total)}</div>
        </div>
        <div style={{display:"flex",gap:4}}>
          <button className="bt bt-s bt-sm" onClick={()=>openEdit(selected)}>{Ic.edit({size:11})} Modifier</button>
          <button className="bt bt-g" onClick={()=>setSelected(null)}>{Ic.x({size:13})}</button>
        </div>
      </div>

      {/* Contact info block */}
      {editing?(<div style={{padding:"12px 14px",borderBottom:"1px solid var(--bd)",background:"var(--bg)"}}>
        <div style={{fontSize:11,fontWeight:600,color:"var(--t)",marginBottom:8}}>Modifier les coordonnées</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
          <div className="fi"><label>Téléphone</label><input value={editF.phone} onChange={e=>ef("phone",e.target.value)} placeholder="+243 81 234 5678"/></div>
          <div className="fi"><label>Adresse / Établissement</label><input value={editF.address} onChange={e=>ef("address",e.target.value)} placeholder="Ex: Pharmacie Centrale"/></div>
        </div>
        <div className="fi" style={{marginBottom:8}}><label>Notes</label><input value={editF.notes} onChange={e=>ef("notes",e.target.value)} placeholder="Notes internes..."/></div>
        <div style={{display:"flex",gap:6}}>
          <button className="bt bt-p bt-sm" onClick={saveEdit}>{Ic.check({size:11})} Enregistrer</button>
          <button className="bt bt-s bt-sm" onClick={()=>setEditing(false)}>Annuler</button>
        </div>
      </div>):(()=>{const ex=getExtra(selected.name);const phone=getPhone(selected.name);return(ex.phone||phone||ex.address||ex.notes)?(<div style={{padding:"10px 14px",borderBottom:"1px solid var(--bd)",background:"var(--bg)",display:"flex",flexWrap:"wrap",gap:12,fontSize:11}}>
        {(ex.phone||phone)&&<div style={{display:"flex",alignItems:"center",gap:5,color:"var(--t)"}}>{Ic.phone({size:12,color:"var(--ac)"})} <a href={`tel:${ex.phone||phone}`} style={{color:"var(--ac)",textDecoration:"none",fontWeight:500}}>{ex.phone||phone}</a></div>}
        {ex.address&&<div style={{color:"var(--t2)"}}>{Ic.clipboard({size:12,color:"var(--t3)"})} {ex.address}</div>}
        {ex.notes&&<div style={{color:"var(--t3)",fontStyle:"italic"}}>{ex.notes}</div>}
      </div>):null})()}

      {/* Purchase history */}
      {[...selected.purchases].sort((a,b)=>(b.sale_date||"").localeCompare(a.sale_date||"")).map((s,i)=>(
        <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 14px",borderBottom:"1px solid var(--bd2)",fontSize:12}}>
          <div>
            <div style={{fontWeight:500}}>{s.drug_name} <span style={{color:"var(--t3)"}}>×{s.qty}</span></div>
            <div style={{fontSize:9,color:"var(--t3)"}}>{s.sale_date}{s.invoice_number?` · ${s.invoice_number}`:""}</div>
          </div>
          <span style={{fontWeight:700,fontSize:11,color:"var(--ok)"}}>{fmt(s.total)}</span>
        </div>
      ))}
    </div>}
  </div>);
}

/* ═══════ RUPTURES PAGE ═══════ */
function RupturesPage({ruptures,onAdd,onDel}){
  const[f,setF]=useState({name:"",askedBy:"",notes:""});
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  const submit=()=>{if(!f.name.trim())return;onAdd({...f});setF({name:"",askedBy:"",notes:""})};
  return(<div>
    <div className="tc" style={{marginBottom:14}}>
      <div className="th2"><h3>Signaler une rupture</h3></div>
      <div className="rup-form">
        <div className="fi full"><label>Médicament demandé *</label><input value={f.name} onChange={e=>s("name",e.target.value)} placeholder="Ex: Augmentin 500mg" autoFocus/></div>
        <div className="fi"><label>Demandé par</label><input value={f.askedBy} onChange={e=>s("askedBy",e.target.value)} placeholder="Nom du client"/></div>
        <div className="fi"><label>Notes</label><input value={f.notes} onChange={e=>s("notes",e.target.value)} placeholder="Quantité, urgence..."/></div>
      </div>
      <div style={{padding:"0 18px 14px"}}><button className="bt bt-p" onClick={submit} disabled={!f.name.trim()}>{Ic.plus({size:12})} Signaler</button></div>
    </div>
    <div className="tc">
      <div className="th2"><h3>Ruptures signalées</h3><span style={{fontSize:10,color:"var(--t3)"}}>{ruptures.length} produit{ruptures.length!==1?"s":""}</span></div>
      {!ruptures.length
        ?<div className="emp">{Ic.clipboard({size:28,color:"var(--t3)"})}<p>Aucune rupture signalée.</p></div>
        :ruptures.map(r=><div key={r.id} className="rup-row">
          <div style={{flex:1}}>
            <div style={{fontWeight:600,fontSize:12,color:"var(--t)"}}>{r.name}</div>
            {r.askedBy&&<div style={{fontSize:10,color:"var(--t3)"}}>Demandé par : {r.askedBy}</div>}
            {r.notes&&<div style={{fontSize:10,color:"var(--t3)"}}>{r.notes}</div>}
            <div style={{fontSize:9,color:"var(--t3)",marginTop:2}}>{r.date}</div>
          </div>
          <button className="bt bt-g bt-sm" onClick={()=>onDel(r.id)} style={{color:"var(--d)"}} title="Supprimer">{Ic.trash({size:11})}</button>
        </div>)
      }
    </div>
  </div>);
}

/* ═══════ STOREFRONT ORDERS PAGE ═══════ */
function StorefrontOrdersPage({orders,onUpdateStatus}){
  const pending=orders.filter(o=>o.status==="pending").length;
  const lbl={pending:"En attente",confirmed:"Confirmée",cancelled:"Annulée"};
  return(<div>
    {pending>0&&<div style={{background:"var(--w-bg)",border:"1px solid #FDE68A",borderRadius:"var(--r)",padding:"10px 14px",marginBottom:12,fontSize:12,color:"#92400E",display:"flex",alignItems:"center",gap:8}}>{Ic.alert({size:13})} {pending} commande{pending!==1?"s":""} en attente de traitement</div>}
    <div className="tc">
      <div className="th2"><h3>Commandes vitrine</h3><span style={{fontSize:10,color:"var(--t3)"}}>{orders.length} commande{orders.length!==1?"s":""}</span></div>
      {!orders.length
        ?<div className="emp">{Ic.pkg({size:28,color:"var(--t3)"})}<p>Aucune commande reçue.<br/>Partagez votre lien vitrine pour recevoir des demandes.</p></div>
        :orders.map(o=>{
          const items=Array.isArray(o.items)?o.items:[];
          const dt=new Date(o.created_at).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"});
          const tm=new Date(o.created_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
          return(<div key={o.id} className="cmd-row">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
              <div>
                <div style={{fontWeight:600,fontSize:12}}>{o.customer_name}</div>
                <div style={{fontSize:10,color:"var(--t3)"}}>{o.customer_phone||"Pas de téléphone"} · {dt} à {tm}</div>
              </div>
              <span className={`cmd-status ${o.status}`}>{lbl[o.status]||o.status}</span>
            </div>
            <div style={{fontSize:11,color:"var(--t2)",marginBottom:6}}>
              {items.map((it,i)=><span key={i} style={{marginRight:10}}>{it.name} <span style={{color:"var(--t3)"}}>×{it.qty}</span></span>)}
            </div>
            {o.notes&&<div style={{fontSize:10,color:"var(--t3)",marginBottom:8,fontStyle:"italic"}}>Note : {o.notes}</div>}
            {o.status==="pending"&&<div style={{display:"flex",gap:6}}>
              <button className="bt bt-ok bt-sm" onClick={()=>onUpdateStatus(o.id,"confirmed")}>{Ic.check({size:11})} Confirmer</button>
              <button className="bt bt-sm" style={{background:"var(--d-bg)",color:"var(--d)",border:"1px solid transparent"}} onClick={()=>onUpdateStatus(o.id,"cancelled")}>{Ic.x({size:11})} Annuler</button>
              {o.customer_phone&&<a href={`https://wa.me/${o.customer_phone.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer" className="bt bt-s bt-sm" style={{textDecoration:"none",color:"#128C7E"}}>{Ic.phone({size:11})} WhatsApp</a>}
            </div>}
          </div>);
        })
      }
    </div>
  </div>);
}

/* ═══════ PUBLIC STOREFRONT ═══════ */
const SFCSS=`
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400;1,500&family=Outfit:wght@300;400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{font-family:'Outfit',sans-serif;background:#F4F7F5;color:#1A2E23;-webkit-font-smoothing:antialiased}
/* Layout */
.sf{min-height:100vh;display:flex;flex-direction:column}
/* ── Nav ── */
.sf-nav{background:linear-gradient(135deg,#0F4C2A 0%,#1A7F48 100%);padding:0 40px;height:68px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:20;box-shadow:0 2px 24px rgba(15,76,42,.3)}
.sf-nav-brand{display:flex;align-items:center;gap:13px}
.sf-nav-logo{width:40px;height:40px;border-radius:9px;object-fit:contain;background:rgba(255,255,255,.14);padding:3px}
.sf-nav-txt h1{font-family:'Cormorant Garamond',serif;font-size:20px;color:#fff;font-weight:500;line-height:1.1}
.sf-nav-txt span{font-size:9px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:2px;display:block;margin-top:1px}
.sf-cart-btn{display:flex;align-items:center;gap:8px;padding:10px 20px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.22);border-radius:26px;color:#fff;font-size:12px;font-weight:600;font-family:'Outfit',sans-serif;cursor:pointer;transition:all .2s;letter-spacing:.2px}
.sf-cart-btn:hover{background:rgba(255,255,255,.26);transform:translateY(-1px);box-shadow:0 4px 14px rgba(0,0,0,.15)}
.sf-cart-badge{background:#EF4444;color:#fff;border-radius:50%;width:18px;height:18px;font-size:9px;display:flex;align-items:center;justify-content:center;font-weight:700;box-shadow:0 1px 4px rgba(0,0,0,.2)}
/* ── Hero banner ── */
.sf-hero{background:#fff;border-bottom:1px solid rgba(30,140,78,.07);padding:32px 40px 24px;position:relative;overflow:hidden}
.sf-hero::before{content:'';position:absolute;top:-120px;right:-120px;width:400px;height:400px;background:radial-gradient(circle,rgba(76,175,80,.07) 0%,transparent 70%);border-radius:50%;pointer-events:none}
.sf-hero-inner{max-width:1060px;margin:0 auto;position:relative;z-index:1}
.sf-hero-badge{display:inline-flex;align-items:center;gap:7px;padding:4px 12px;background:rgba(30,140,78,.08);border:1px solid rgba(30,140,78,.14);border-radius:20px;font-size:10px;font-weight:600;color:#1A7F48;margin-bottom:12px;letter-spacing:.3px}
.sf-hero-badge .dot{width:5px;height:5px;background:#1A7F48;border-radius:50%;animation:sfpulse 2s infinite}
@keyframes sfpulse{0%,100%{opacity:1}50%{opacity:.35}}
.sf-hero h2{font-family:'Cormorant Garamond',serif;font-size:clamp(26px,4vw,40px);font-weight:400;color:#0F4C2A;line-height:1.1;margin-bottom:6px}
.sf-hero h2 em{font-style:italic;color:#1A7F48}
.sf-hero p{font-size:13px;color:#5A8A6A;font-weight:300;margin-bottom:20px;max-width:480px;line-height:1.6}
/* ── Search & categories ── */
.sf-search{position:relative;max-width:680px}
.sf-search input{width:100%;padding:12px 16px 12px 44px;border:1.5px solid #D4E4DB;border-radius:14px;font-size:13px;font-family:'Outfit',sans-serif;background:#fff;color:#1A2E23;outline:none;transition:.2s;box-shadow:0 1px 6px rgba(15,76,42,.06)}
.sf-search input:focus{border-color:#1A7F48;box-shadow:0 0 0 3px rgba(30,140,78,.1)}
.sf-search input::placeholder{color:#A8BFB5}
.sf-search svg{position:absolute;left:15px;top:50%;transform:translateY(-50%);color:#8AA69A}
.sf-cats{display:flex;gap:6px;flex-wrap:wrap;margin-top:14px}
.sf-cat-pill{padding:6px 14px;border-radius:22px;font-size:11px;font-weight:500;font-family:'Outfit',sans-serif;cursor:pointer;transition:all .15s;border:1.5px solid #D4E4DB;background:#fff;color:#5A8A6A;white-space:nowrap}
.sf-cat-pill:hover{border-color:#1A7F48;color:#1A7F48;background:#F0FAF4}
.sf-cat-pill.on{background:#1A7F48;border-color:#1A7F48;color:#fff;box-shadow:0 2px 10px rgba(26,127,72,.28)}
/* ── Product grid ── */
.sf-body{flex:1;max-width:1140px;margin:0 auto;width:100%;padding:28px 40px}
.sf-grid-wrap h3{font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:#8AA69A;font-weight:600;margin-bottom:14px}
.sf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:18px}
/* ── Product card ── */
.sf-card{background:#fff;border-radius:16px;border:1px solid #E8F0EC;overflow:hidden;cursor:pointer;transition:all .22s;display:flex;flex-direction:column;box-shadow:0 1px 5px rgba(15,76,42,.05)}
.sf-card:hover{box-shadow:0 10px 32px rgba(15,76,42,.11);transform:translateY(-4px);border-color:#C5DEC5}
.sf-card.in-cart{border-color:#1A7F48;box-shadow:0 6px 20px rgba(26,127,72,.18)}
.sf-card-stripe{height:4px}
.sf-card-body{padding:18px 16px 16px;flex:1;display:flex;flex-direction:column;gap:9px}
.sf-card-icon{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#E6F5EC,#C5DEC5);display:flex;align-items:center;justify-content:center;font-size:20px;margin-bottom:2px;flex-shrink:0}
.sf-cat-badge{font-size:9px;font-weight:700;padding:3px 9px;border-radius:12px;background:#E6F5EC;color:#1A7F48;display:inline-block;text-transform:uppercase;letter-spacing:.5px}
.sf-name{font-family:'Cormorant Garamond',serif;font-weight:500;font-size:18px;color:#0F4C2A;line-height:1.2}
.sf-stock-wrap{display:flex;align-items:center;gap:5px;font-size:10px;font-weight:500}
.sf-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.sf-dot.g{background:#10B981}.sf-dot.y{background:#F59E0B}.sf-dot.r{background:#EF4444}
.sf-stock-ok{color:#059669}.sf-stock-warn{color:#D97706}.sf-stock-low{color:#EF4444}
.sf-add-btn{margin-top:auto;padding:10px 0;border:none;border-radius:10px;font-size:12px;font-weight:600;font-family:'Outfit',sans-serif;cursor:pointer;transition:all .2s;width:100%;letter-spacing:.2px}
.sf-add-btn.idle{background:linear-gradient(135deg,#1A7F48,#0F4C2A);color:#fff;box-shadow:0 2px 8px rgba(15,76,42,.18)}
.sf-add-btn.idle:hover{box-shadow:0 5px 16px rgba(15,76,42,.3);transform:translateY(-1px)}
.sf-add-btn.added{background:linear-gradient(135deg,#E6F5EC,#D0EDD8);color:#1A7F48;cursor:default}
/* ── Empty state ── */
.sf-empty{text-align:center;padding:80px 20px;color:#8AA69A}
.sf-empty-icon{width:80px;height:80px;margin:0 auto 20px;background:linear-gradient(135deg,#E6F5EC,#D0EDD8);border-radius:50%;display:flex;align-items:center;justify-content:center}
.sf-empty h4{font-family:'Cormorant Garamond',serif;font-size:22px;color:#4A6B5A;margin-bottom:6px}
.sf-empty p{font-size:13px;color:#8AA69A;font-weight:300}
/* ── Overlay/panel ── */
.sf-overlay{position:fixed;inset:0;background:rgba(15,76,42,.38);backdrop-filter:blur(6px);display:flex;align-items:stretch;justify-content:flex-end;z-index:100;animation:sfi .18s}
@keyframes sfi{from{opacity:0}to{opacity:1}}
.sf-panel{background:#fff;width:490px;max-width:100vw;height:100vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:-10px 0 50px rgba(15,76,42,.16);animation:sfp .24s ease}
@keyframes sfp{from{transform:translateX(48px);opacity:0}to{transform:none;opacity:1}}
.sf-panel-h{padding:20px 22px;border-bottom:1px solid #E8F0EC;display:flex;justify-content:space-between;align-items:flex-start;background:linear-gradient(135deg,#0F4C2A 0%,#1A7F48 100%)}
.sf-panel-h h3{font-family:'Cormorant Garamond',serif;font-size:21px;color:#fff;font-weight:400}
.sf-panel-h p{font-size:10px;color:rgba(255,255,255,.55);margin-top:2px}
.sf-close{background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.2);color:#fff;cursor:pointer;padding:7px;border-radius:8px;display:flex;align-items:center;justify-content:center;transition:.15s;flex-shrink:0}
.sf-close:hover{background:rgba(255,255,255,.28)}
.sf-items{flex:1;padding:18px 22px;overflow-y:auto}
.sf-item{display:flex;align-items:flex-start;gap:12px;padding:13px 0;border-bottom:1px solid #F0F7F2}
.sf-item:last-child{border-bottom:none}
.sf-item-icon{width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#E6F5EC,#C5DEC5);display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0}
.sf-item-info{flex:1}
.sf-item-name{font-weight:600;font-size:12.5px;color:#1A2E23;line-height:1.3}
.sf-item-cat{font-size:10px;color:#8AA69A;margin-top:2px}
.sf-qty{display:flex;align-items:center;gap:7px;margin-top:9px}
.sf-qty button{width:28px;height:28px;border-radius:8px;border:1.5px solid #D4E4DB;background:#fff;cursor:pointer;font-size:16px;font-weight:700;color:#4A6B5A;display:flex;align-items:center;justify-content:center;transition:.15s;line-height:1}
.sf-qty button:hover:not(:disabled){background:#E6F5EC;border-color:#1A7F48;color:#1A7F48}
.sf-qty button:disabled{opacity:.3;cursor:not-allowed}
.sf-qty span{min-width:28px;text-align:center;font-weight:700;font-size:14px;color:#1A2E23}
.sf-form{padding:18px 22px;border-top:1.5px solid #E8F0EC;background:#FAFCFB}
.sf-form h4{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:500;color:#0F4C2A;margin-bottom:14px}
.sf-fi{display:flex;flex-direction:column;gap:4px;margin-bottom:12px}
.sf-fi label{font-size:10px;font-weight:700;color:#4A6B5A;text-transform:uppercase;letter-spacing:.5px}
.sf-fi input,.sf-fi textarea{padding:10px 13px;border:1.5px solid #D4E4DB;border-radius:10px;font-size:12.5px;font-family:'Outfit',sans-serif;color:#1A2E23;outline:none;transition:.2s;background:#fff;resize:none}
.sf-fi input:focus,.sf-fi textarea:focus{border-color:#1A7F48;box-shadow:0 0 0 3px rgba(30,140,78,.09)}
.sf-submit{width:100%;padding:13px;border:none;border-radius:11px;background:linear-gradient(135deg,#1A7F48,#0F4C2A);color:#fff;font-size:13px;font-weight:600;font-family:'Outfit',sans-serif;cursor:pointer;transition:all .2s;letter-spacing:.3px;box-shadow:0 4px 16px rgba(15,76,42,.26)}
.sf-submit:hover:not(:disabled){box-shadow:0 7px 22px rgba(15,76,42,.38);transform:translateY(-1px)}
.sf-submit:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none}
/* ── Success ── */
.sf-success{padding:36px 24px;text-align:center;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center}
.sf-success-ring{width:80px;height:80px;background:linear-gradient(135deg,#E6F5EC,#C5DEC5);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;box-shadow:0 6px 24px rgba(26,127,72,.2)}
.sf-success h4{font-family:'Cormorant Garamond',serif;font-size:26px;color:#0F4C2A;margin-bottom:10px}
.sf-success p{font-size:13px;color:#5A8A6A;line-height:1.7;margin-bottom:22px;max-width:310px}
.sf-wa-btn{display:inline-flex;align-items:center;gap:9px;padding:13px 26px;background:#25D366;border:none;border-radius:28px;color:#fff;font-size:13px;font-weight:600;font-family:'Outfit',sans-serif;cursor:pointer;text-decoration:none;transition:all .2s;box-shadow:0 4px 18px rgba(37,211,102,.32)}
.sf-wa-btn:hover{background:#1fca5e;transform:translateY(-1px);box-shadow:0 6px 24px rgba(37,211,102,.42)}
.sf-new-btn{margin-top:14px;padding:9px 22px;border:1.5px solid #D4E4DB;border-radius:22px;background:#fff;cursor:pointer;font-size:12px;font-family:'Outfit',sans-serif;color:#5A8A6A;transition:.15s}
.sf-new-btn:hover{border-color:#1A7F48;color:#1A7F48}
/* ── Footer ── */
.sf-footer{padding:18px 40px;text-align:center;font-size:11px;color:#8AA69A;border-top:1px solid #E8F0EC;background:#fff;display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap}
.sf-footer img{height:20px;border-radius:4px;opacity:.6}
/* ── Responsive ── */
@media(max-width:768px){
  .sf-nav{padding:0 18px;height:60px}
  .sf-nav-txt h1{font-size:16px}
  .sf-hero{padding:20px 18px 18px}
  .sf-hero h2{font-size:24px}
  .sf-body{padding:18px}
  .sf-grid{grid-template-columns:repeat(2,1fr);gap:12px}
  .sf-card-body{padding:14px 12px 12px}
  .sf-name{font-size:15px}
  .sf-panel{width:100vw}
  .sf-footer{padding:14px 18px}
}
@media(max-width:400px){.sf-grid{grid-template-columns:1fr}}
`;

const CAT_ICON={antibiot:"🔬",allergi:"🌿",gastro:"🫀",antidoul:"💊",cardio:"❤️",diabet:"🩸",vitam:"✨",neuro:"🧠",respirat:"🫁",dermato:"🧴"};
const getCatIcon=(cat="")=>{const c=(cat||"").toLowerCase();const k=Object.keys(CAT_ICON).find(k=>c.includes(k));return k?CAT_ICON[k]:"💊"};
const CAT_STRIPE={antibiot:"#4CAF50",allergi:"#8BC34A",gastro:"#00BCD4",antidoul:"#FF7043",cardio:"#E91E63",diabet:"#9C27B0",vitam:"#FFC107",default:"#1A7F48"};
const getCatStripe=(cat="")=>{const c=(cat||"").toLowerCase();const k=Object.keys(CAT_STRIPE).find(k=>c.includes(k));return k?CAT_STRIPE[k]:CAT_STRIPE.default};

function StoreFront({wsId}){
  const[drugs,setDrugs]=useState([]);const[wsName,setWsName]=useState("Pharmacie");const[loading,setLoading]=useState(true);
  const[cart,setCart]=useState([]);const[showPanel,setShowPanel]=useState(false);
  const[submitted,setSubmitted]=useState(false);const[submitting,setSubmitting]=useState(false);
  const[form,setForm]=useState({name:"",phone:"",notes:""});const[search,setSearch]=useState("");
  const[lastOrder,setLastOrder]=useState(null);const[activeCat,setActiveCat]=useState("Tous");
  useEffect(()=>{
    const load=async()=>{
      const[{data:ws},{data:d}]=await Promise.all([
        supabase.from("workspaces").select("name").eq("id",wsId).single(),
        supabase.from("drugs").select("*").or(`workspace_id.eq.${wsId},user_id.eq.${wsId}`).gt("stock",0).order("name"),
      ]);
      if(ws)setWsName(ws.name);setDrugs(d||[]);setLoading(false);
    };
    load();
  },[wsId]);
  const sf=(k,v)=>setForm(p=>({...p,[k]:v}));
  const addToCart=(drug)=>{setCart(prev=>{const ex=prev.find(i=>i.drug.id===drug.id);if(ex)return prev.map(i=>i.drug.id===drug.id?{...i,qty:Math.min(i.qty+1,drug.stock)}:i);return[...prev,{drug,qty:1}]})};
  const updCart=(id,qty)=>setCart(prev=>qty<1?prev.filter(i=>i.drug.id!==id):prev.map(i=>i.drug.id===id?{...i,qty}:i));
  const cartCount=cart.reduce((s,i)=>s+i.qty,0);
  const cats=["Tous",...[...new Set(drugs.map(d=>d.category||"Général"))].sort()];
  const filtered=drugs.filter(d=>{const q=search.toLowerCase();const ms=d.name.toLowerCase().includes(q)||(d.category||"").toLowerCase().includes(q);const mc=activeCat==="Tous"||(d.category||"Général")===activeCat;return ms&&mc});
  const submitOrder=async()=>{
    if(!form.name.trim()||!cart.length)return;setSubmitting(true);
    const items=cart.map(i=>({name:i.drug.name,qty:i.qty,category:i.drug.category||""}));
    const{data,error}=await supabase.from("storefront_orders").insert({workspace_id:wsId,customer_name:form.name.trim(),customer_phone:form.phone.trim()||null,items,notes:form.notes.trim()||null,status:"pending"}).select().single();
    setSubmitting(false);
    if(error){alert("Erreur: "+error.message);return}
    setLastOrder({...data,items,form:{...form}});setSubmitted(true);setCart([]);
  };
  const waText=lastOrder?encodeURIComponent(`Bonjour ${wsName}, j'ai soumis une demande de devis. Nom: ${lastOrder.form.name}. Articles: ${lastOrder.items.map(i=>`${i.name} x${i.qty}`).join(", ")}.`):"";
  const stockInfo=(d)=>d.stock>50?{cls:"sf-stock-ok",dot:"g",label:"En stock"}:d.stock>10?{cls:"sf-stock-warn",dot:"y",label:`Stock limité (${d.stock})`}:{cls:"sf-stock-low",dot:"r",label:`Derniers exemplaires (${d.stock})`};
  const CartIcon=()=><svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>;
  const XIcon=()=><svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
  const CheckIcon=()=><svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#1A7F48" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
  const WaIcon=()=><svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>;
  if(loading)return(<><style>{SFCSS}</style><div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",background:"#F4F7F5",gap:14}}><div style={{width:40,height:40,border:"3px solid #D4E4DB",borderTopColor:"#1A7F48",borderRadius:"50%",animation:"spin 1s linear infinite"}}/><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:"#1A7F48"}}>Chargement de la vitrine…</div><style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style></div></>);
  return(<><style>{SFCSS}</style><div className="sf">
    {/* ── Nav ── */}
    <nav className="sf-nav">
      <div className="sf-nav-brand">
        <img src={LOGO} alt="Speranza" className="sf-nav-logo" onError={e=>e.target.style.display="none"}/>
        <div className="sf-nav-txt"><h1>{wsName}</h1><span>Vitrine en ligne</span></div>
      </div>
      <button className="sf-cart-btn" onClick={()=>setShowPanel(true)}>
        <CartIcon/> Mon devis{cartCount>0&&<span className="sf-cart-badge">{cartCount}</span>}
      </button>
    </nav>

    {/* ── Hero ── */}
    <div className="sf-hero">
      <div className="sf-hero-inner">
        <div className="sf-hero-badge"><span className="dot"/>{drugs.length} produit{drugs.length!==1?"s":""} disponible{drugs.length!==1?"s":""}</div>
        <h2>Nos médicaments,<br/><em>disponibles maintenant.</em></h2>
        <p>Parcourez notre catalogue, ajoutez vos produits et envoyez une demande de devis. Nous vous contacterons rapidement.</p>
        <div className="sf-search">
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input placeholder="Rechercher par nom ou catégorie…" value={search} onChange={e=>{setSearch(e.target.value);setActiveCat("Tous")}}/>
        </div>
        <div className="sf-cats">
          {cats.map(c=><button key={c} className={`sf-cat-pill ${activeCat===c?"on":""}`} onClick={()=>setActiveCat(c)}>{c}</button>)}
        </div>
      </div>
    </div>

    {/* ── Grid ── */}
    <div className="sf-body">
      {!filtered.length
        ?<div className="sf-empty">
          <div className="sf-empty-icon"><svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#1A7F48" strokeWidth="1.5"><path d="M10.5 1.5l-8 8a5.66 5.66 0 008 8l8-8a5.66 5.66 0 00-8-8z"/><line x1="6" y1="14" x2="14" y2="6"/></svg></div>
          <h4>Aucun produit trouvé</h4>
          <p>Essayez une autre recherche ou catégorie.</p>
        </div>
        :<div className="sf-grid-wrap">
          <h3>{activeCat==="Tous"?"Tous les produits":activeCat} — {filtered.length} article{filtered.length!==1?"s":""}</h3>
          <div className="sf-grid">{filtered.map(d=>{const inCart=cart.find(i=>i.drug.id===d.id);const si=stockInfo(d);const stripe=getCatStripe(d.category);const icon=getCatIcon(d.category);return(
            <div key={d.id} className={`sf-card ${inCart?"in-cart":""}`}>
              <div className="sf-card-stripe" style={{background:stripe}}/>
              <div className="sf-card-body">
                <div className="sf-card-icon">{icon}</div>
                <span className="sf-cat-badge">{d.category||"Général"}</span>
                <div className="sf-name">{d.name}</div>
                <div className="sf-stock-wrap"><span className={`sf-dot ${si.dot}`}/><span className={si.cls}>{si.label}</span></div>
                <button className={`sf-add-btn ${inCart?"added":"idle"}`} onClick={()=>{if(!inCart){addToCart(d);setShowPanel(true)}}}>
                  {inCart?`✓ Dans le devis (×${inCart.qty})`:"Ajouter au devis"}
                </button>
              </div>
            </div>
          )})}</div>
        </div>
      }
    </div>

    {/* ── Footer ── */}
    <div className="sf-footer">
      <img src={LOGO} alt="" onError={e=>e.target.style.display="none"}/>
      <span>Vitrine de {wsName}</span>
      <span style={{color:"#D4E4DB"}}>·</span>
      <span>Propulsé par <strong style={{color:"#1A7F48"}}>Speranza Della Pharma</strong></span>
    </div>

    {/* ── Cart panel ── */}
    {showPanel&&<div className="sf-overlay" onClick={()=>setShowPanel(false)}>
      <div className="sf-panel" onClick={e=>e.stopPropagation()}>
        <div className="sf-panel-h">
          <div><h3>{submitted?"Demande envoyée ✓":"Demande de devis"}</h3><p>{submitted?"Nous allons vous contacter.":cart.length>0?`${cartCount} article${cartCount!==1?"s":""} sélectionné${cartCount!==1?"s":""}`:"Votre panier est vide"}</p></div>
          <button className="sf-close" onClick={()=>setShowPanel(false)}><XIcon/></button>
        </div>
        {submitted
          ?<div className="sf-success">
            <div className="sf-success-ring"><CheckIcon/></div>
            <h4>Merci, {lastOrder?.form?.name} !</h4>
            <p>Votre demande a bien été reçue par {wsName}. La pharmacie vous contactera sous peu pour confirmer la disponibilité et le prix.</p>
            {lastOrder?.form?.phone&&<a href={`https://wa.me/?text=${waText}`} target="_blank" rel="noopener noreferrer" className="sf-wa-btn"><WaIcon/> Partager via WhatsApp</a>}
            <button className="sf-new-btn" onClick={()=>{setSubmitted(false);setForm({name:"",phone:"",notes:""});setLastOrder(null)}}>Faire une nouvelle demande</button>
          </div>
          :<>
            <div className="sf-items">
              {!cart.length
                ?<div style={{textAlign:"center",padding:"48px 20px",color:"#8AA69A"}}>
                  <div style={{fontSize:36,marginBottom:10}}>🛒</div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:"#4A6B5A",marginBottom:6}}>Votre devis est vide</div>
                  <div style={{fontSize:12}}>Ajoutez des médicaments depuis la vitrine.</div>
                </div>
                :cart.map(item=>{const si=stockInfo(item.drug);return(
                  <div key={item.drug.id} className="sf-item">
                    <div className="sf-item-icon">{getCatIcon(item.drug.category)}</div>
                    <div className="sf-item-info">
                      <div className="sf-item-name">{item.drug.name}</div>
                      <div className="sf-item-cat">{item.drug.category||"Général"} · <span className={si.cls}>{si.label}</span></div>
                      <div className="sf-qty">
                        <button onClick={()=>updCart(item.drug.id,item.qty-1)}>−</button>
                        <span>{item.qty}</span>
                        <button onClick={()=>updCart(item.drug.id,item.qty+1)} disabled={item.qty>=item.drug.stock}>+</button>
                        <button onClick={()=>updCart(item.drug.id,0)} style={{marginLeft:4,fontSize:12,color:"#EF4444",width:24,height:24}}>✕</button>
                      </div>
                    </div>
                  </div>
                )})
              }
            </div>
            {cart.length>0&&<div className="sf-form">
              <h4>Vos coordonnées</h4>
              <div className="sf-fi"><label>Nom complet *</label><input value={form.name} onChange={e=>sf("name",e.target.value)} placeholder="Ex: Jean Mukendi"/></div>
              <div className="sf-fi"><label>Téléphone (WhatsApp)</label><input value={form.phone} onChange={e=>sf("phone",e.target.value)} placeholder="+243 81 234 5678" type="tel"/></div>
              <div className="sf-fi"><label>Notes (optionnel)</label><textarea value={form.notes} onChange={e=>sf("notes",e.target.value)} placeholder="Quantités spécifiques, questions…" rows={2}/></div>
              <button className="sf-submit" onClick={submitOrder} disabled={!form.name.trim()||submitting}>{submitting?"Envoi en cours…":"Envoyer la demande de devis →"}</button>
            </div>}
          </>
        }
      </div>
    </div>}
  </div></>);
}

/* ═══════ ROOT ═══════ */
export default function App(){
  const[session,setSession]=useState(null);const[checking,setChecking]=useState(true);
  const isStorefront=window.location.pathname.startsWith("/store/");
  const sfWsId=isStorefront?window.location.pathname.split("/store/")[1]?.split("/")[0]:null;
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{setSession(session);setChecking(false)});
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>setSession(s));
    return()=>subscription.unsubscribe();
  },[]);
  if(isStorefront&&sfWsId)return<StoreFront wsId={sfWsId}/>;
  const logout=async()=>{await supabase.auth.signOut();setSession(null)};
  if(checking)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#F4F7F5'}}><div className="spin" style={{width:32,height:32,border:'3px solid #D4E4DB',borderTopColor:'#1A7F48',borderRadius:'50%',animation:'sp 1s linear infinite'}}/><style>{"@keyframes sp{to{transform:rotate(360deg)}}"}</style></div>;
  if(!session)return<LandingPage onAuth={setSession}/>;
  return<DashApp session={session} onLogout={logout}/>;
}
