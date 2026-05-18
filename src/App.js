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
@media(max-width:900px){.stats,.an-grid{grid-template-columns:repeat(2,1fr)}.ag{grid-template-columns:1fr}.sb{width:52px;min-width:52px}.sb-brand h1,.sb-brand span,.sb-lbl,.sb-btn span{display:none}.sb-brand{justify-content:center;padding:10px 5px}.sb-brand-logo{width:30px;height:30px}.sb-btn{justify-content:center;padding:8px}.sb-btn .badge{display:none}.top{padding:8px 10px}.cnt{padding:10px}.srch{width:140px}}
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
  // 3. Create a new workspace for this user
  const wsName=user.user_metadata?.full_name?`Pharmacie ${user.user_metadata.full_name}`:"Ma Pharmacie";
  const{data:ws,error}=await supabase.from("workspaces").insert({name:wsName,owner_id:user.id}).select().single();
  if(error)throw error;
  await supabase.from("workspace_members").insert({workspace_id:ws.id,user_id:user.id,email:user.email,role:"owner",accepted_at:new Date().toISOString()});
  // 4. Migrate any existing drugs/sales that don't have a workspace_id yet
  await supabase.from("drugs").update({workspace_id:ws.id}).eq("user_id",user.id).is("workspace_id",null);
  await supabase.from("sales").update({workspace_id:ws.id}).eq("user_id",user.id).is("workspace_id",null);
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
  const[drugs,setDrugs]=useState([]);const[sales,setSales]=useState([]);const[page,setPage]=useState("dashboard");
  const[search,setSearch]=useState("");const[toast,setToast]=useState(null);const[modal,setModal]=useState(null);
  const[loading,setLoading]=useState(true);const[showTour,setShowTour]=useState(false);
  const[cart,setCart]=useState([]);const[showCart,setShowCart]=useState(false);const[invoice,setInvoice]=useState(null);
  const[currency,setCurrency]=useState(()=>localStorage.getItem("sp_currency")||"USD");
  const[workspace,setWorkspace]=useState(null);const[members,setMembers]=useState([]);
  const workspaceRef=useRef(null);
  const fileRef=useRef(null);
  const uid=session.user.id;

  const fmt=useCallback((n)=>fmtAmt(n,currency),[currency]);
  const toggleCurrency=()=>{const nx=currency==="USD"?"FC":"USD";setCurrency(nx);localStorage.setItem("sp_currency",nx)};

  useEffect(()=>{const ld=async()=>{setLoading(true);
    let ws;
    try{ws=await setupWorkspace(session.user)}catch(e){console.error("Workspace setup failed:",e);setLoading(false);return}
    workspaceRef.current=ws;setWorkspace(ws);
    const wsOr=`workspace_id.eq.${ws.id},and(user_id.eq.${uid},workspace_id.is.null)`;
    const[{data:d},{data:s},{data:m}]=await Promise.all([
      supabase.from("drugs").select("*").or(wsOr).order("name"),
      supabase.from("sales").select("*").or(wsOr).order("created_at",{ascending:false}),
      supabase.from("workspace_members").select("*").eq("workspace_id",ws.id).order("invited_at"),
    ]);
    setMembers(m||[]);setSales(s||[]);
    // Silently migrate any legacy records that have user_id but no workspace_id
    if(d?.some(x=>!x.workspace_id)) supabase.from("drugs").update({workspace_id:ws.id}).eq("user_id",uid).is("workspace_id",null);
    if(s?.some(x=>!x.workspace_id)) supabase.from("sales").update({workspace_id:ws.id}).eq("user_id",uid).is("workspace_id",null);
    if(d&&d.length===0&&ws.owner_id===uid){
      const samples=SAMPLE.map(s=>({...s,user_id:uid,workspace_id:ws.id}));
      const{data:ins,error:insErr}=await supabase.from("drugs").insert(samples).select();
      if(ins&&ins.length>0){
        setDrugs(ins);
      }else{
        // INSERT returned nothing (silent RLS failure or timing issue) — display in-memory samples
        // so the UI is never blank. They'll persist to DB on next successful write or page reload.
        console.warn("Sample seed silent fail:",insErr);
        setDrugs(samples);
      }
      setShowTour(true);
    }else{setDrugs(d||[])}
    setLoading(false);
    const v=localStorage.getItem(`sp_v_${uid}`);if(!v){setShowTour(true);localStorage.setItem(`sp_v_${uid}`,"1")}
  };ld()},[uid]);

  const t2=(m,t="ok")=>{setToast({m,t});setTimeout(()=>setToast(null),3000)};
  const rlD=async()=>{const ws=workspaceRef.current;if(!ws)return;const f=`workspace_id.eq.${ws.id},and(user_id.eq.${uid},workspace_id.is.null)`;const{data}=await supabase.from("drugs").select("*").or(f).order("name");setDrugs(data||[])};
  const rlS=async()=>{const ws=workspaceRef.current;if(!ws)return;const f=`workspace_id.eq.${ws.id},and(user_id.eq.${uid},workspace_id.is.null)`;const{data}=await supabase.from("sales").select("*").or(f).order("created_at",{ascending:false});setSales(data||[])};
  const loadMembers=async()=>{const ws=workspaceRef.current;if(!ws)return;const{data}=await supabase.from("workspace_members").select("*").eq("workspace_id",ws.id).order("invited_at");setMembers(data||[])};

  const addToCart=(drug)=>{
    setCart(prev=>{const ex=prev.find(i=>i.drug.id===drug.id);if(ex)return prev.map(i=>i.drug.id===drug.id?{...i,qty:Math.min(i.qty+1,drug.stock)}:i);return[...prev,{drug,qty:1}]});
    t2(`${drug.name} ajouté au panier`);
  };

  const hAdd=async(drug)=>{const ws=workspaceRef.current;const{error}=await supabase.from("drugs").insert({...drug,user_id:uid,workspace_id:ws?.id});if(error){t2("Erreur: "+error.message,"er");return}await rlD();t2(`${drug.name} ajouté`);setModal(null)};
  const hEdit=async(drug)=>{const{id,user_id,created_at,updated_at,...rest}=drug;const{error}=await supabase.from("drugs").update({...rest,updated_at:new Date().toISOString()}).eq("id",id);if(error){t2("Erreur","er");return}await rlD();t2(`${drug.name} modifié`);setModal(null)};
  const hDel=async(id)=>{const d=drugs.find(x=>x.id===id);if(!window.confirm(`Supprimer "${d?.name}" ?`))return;await supabase.from("sales").delete().eq("drug_id",id);await supabase.from("drugs").delete().eq("id",id);await rlD();await rlS();t2(`${d?.name} supprimé`,"er")};
  const hRes=async(did,qty)=>{const d=drugs.find(x=>x.id===did);if(!d||qty<1)return;const{error}=await supabase.from("drugs").update({stock:d.stock+qty}).eq("id",did);if(error){t2("Erreur","er");return}await rlD();t2(`+${qty} ${d.name}`);setModal(null)};

  const hCartSell=async(cartItems,customerName)=>{
    const ws=workspaceRef.current;const invNum=genInv();
    const salesData=cartItems.map(item=>({
      user_id:uid,workspace_id:ws?.id,drug_id:item.drug.id,drug_name:item.drug.name,
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

  const hCSV=async(text)=>{const ws=workspaceRef.current;try{const lines=text.trim().split("\n");if(lines.length<2)throw new Error("CSV invalide");const h=lines[0].split(",").map(s=>s.trim().toLowerCase().replace(/[^a-z0-9]/g,""));const ni=h.findIndex(s=>s.includes("name")||s.includes("nom")||s.includes("drug")||s.includes("medicament"));if(ni===-1)throw new Error("Colonne 'nom' introuvable");const bi=h.findIndex(s=>s.includes("barcode")||s.includes("code"));const ci=h.findIndex(s=>s.includes("categor")||s.includes("cat"));const si=h.findIndex(s=>s.includes("stock")||s.includes("qty")||s.includes("quantit"));const pi=h.findIndex(s=>s.includes("prix")||s.includes("price"));const coi=h.findIndex(s=>s.includes("cout")||s.includes("cost"));const ei=h.findIndex(s=>s.includes("expir")||s.includes("exp"));const sui=h.findIndex(s=>s.includes("fournisseur")||s.includes("supplier"));const mi=h.findIndex(s=>s.includes("min"));const imp=[];for(let i=1;i<lines.length;i++){const c=lines[i].split(",").map(s=>s.trim());if(!c[ni])continue;imp.push({user_id:uid,workspace_id:ws?.id,name:c[ni],barcode:bi>=0?c[bi]:"",category:ci>=0?c[ci]:"Général",stock:si>=0?parseInt(c[si])||0:0,price:pi>=0?parseFloat(c[pi])||0:0,cost_price:coi>=0?parseFloat(c[coi])||0:0,expiry_date:ei>=0?c[ei]:null,supplier:sui>=0?c[sui]:"",min_stock:mi>=0?parseInt(c[mi])||20:20})}if(!imp.length)throw new Error("Aucune ligne valide");const{error}=await supabase.from("drugs").insert(imp);if(error)throw error;await rlD();t2(`${imp.length} importé(s)`);setModal(null)}catch(e){t2(e.message,"er")}};
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

  const tD=drugs.length,tS=drugs.reduce((s,d)=>s+d.stock,0);
  const low=drugs.filter(d=>d.stock>0&&d.stock<=(d.min_stock||20));const out=drugs.filter(d=>d.stock===0);
  const ex=drugs.filter(d=>{const s=expSt(d.expiry_date);return s==="critical"||s==="expired"});
  const wrn=drugs.filter(d=>expSt(d.expiry_date)==="warning");const ac=low.length+out.length+ex.length;
  const tsl=sales.filter(s=>s.sale_date===today()),tr=tsl.reduce((s,sl)=>s+Number(sl.total),0);
  const flt=drugs.filter(d=>{const q=search.toLowerCase();return d.name.toLowerCase().includes(q)||(d.barcode&&d.barcode.includes(q))||(d.category&&d.category.toLowerCase().includes(q))});
  const cartCount=cart.reduce((s,i)=>s+i.qty,0);

  const nav=[{id:"dashboard",label:"Tableau de bord",icon:Ic.home},{id:"inventory",label:"Inventaire",icon:Ic.box},{id:"sales",label:"Analytique",icon:Ic.bar},{id:"alerts",label:"Alertes",icon:Ic.alert,badge:ac||null},{id:"team",label:"Équipe",icon:Ic.users}];
  const titles={dashboard:"Tableau de bord",inventory:"Inventaire des médicaments",sales:"Analytique des ventes",alerts:"Alertes & Expiration",team:"Équipe & Accès"};

  if(loading)return(<><style>{DCSS}</style><div className="ld-ov"><div className="spin"/><p style={{marginTop:12,color:'#4A6B5A',fontSize:12}}>Chargement...</p></div></>);

  return(<><style>{DCSS}</style><div className="app">
    <aside className="sb">
      <div className="sb-brand"><img src={LOGO} alt="S" className="sb-brand-logo" onError={e=>{e.target.style.display='none'}}/><div><h1>Speranza Della Pharma</h1><span>Système d'Inventaire</span></div></div>
      <nav className="sb-nav">
        <div className="sb-lbl">Menu</div>
        {nav.map(n=><button key={n.id} className={`sb-btn ${page===n.id?"on":""}`} onClick={()=>setPage(n.id)}>{n.icon({size:15})}<span>{n.label}</span>{n.badge&&<span className="badge">{n.badge}</span>}</button>)}
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
        {page==="team"&&workspace&&<TeamPage workspace={workspace} members={members} currentUserId={uid} onInvite={hInvite} onRemoveMember={hRemoveMember}/>}
      </div>
    </main>
    {modal?.type==="add"&&<DF title="Ajouter un médicament" onClose={()=>setModal(null)} onSave={hAdd}/>}
    {modal?.type==="edit"&&<DF title="Modifier" drug={modal.drug} onClose={()=>setModal(null)} onSave={hEdit}/>}
    {modal?.type==="restock"&&<RM drug={modal.drug} onClose={()=>setModal(null)} onRes={hRes}/>}
    {modal?.type==="csv"&&<CM onClose={()=>setModal(null)} onImport={hCSV} fileRef={fileRef}/>}
    {showCart&&<CartModal cart={cart} setCart={setCart} onConfirm={hCartSell} onClose={()=>setShowCart(false)} fmt={fmt}/>}
    {invoice&&<InvoiceModal invoice={invoice} onClose={()=>setInvoice(null)} fmt={fmt}/>}
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
  const upd=(id,qty)=>setCart(prev=>qty<1?prev.filter(i=>i.drug.id!==id):prev.map(i=>i.drug.id===id?{...i,qty:Math.min(qty,i.drug.stock)}:i));
  const total=cart.reduce((s,i)=>s+i.drug.price*i.qty,0);
  const totalQty=cart.reduce((s,i)=>s+i.qty,0);
  return(<div className="mo-bk" onClick={onClose}><div className="mo" onClick={e=>e.stopPropagation()} style={{width:520}}>
    <div className="mo-h"><h3>Panier {cart.length>0&&`(${totalQty} article${totalQty!==1?"s":""})`}</h3><button className="bt bt-g" onClick={onClose}>{Ic.x({size:14})}</button></div>
    <div className="mo-b">
      {cart.length===0?<div className="emp">{Ic.cart({size:28,color:'var(--t3)'})}<p>Le panier est vide. Ajoutez des médicaments depuis l'inventaire.</p></div>:
      <><div>{cart.map(item=><div key={item.drug.id} className="cart-item-row">
        <div style={{flex:1}}><div style={{fontWeight:600,fontSize:12}}>{item.drug.name}</div><div style={{fontSize:10,color:'var(--t3)'}}>{fmt(item.drug.price)}/u · max {item.drug.stock}</div></div>
        <div className="qty-ctrl">
          <button onClick={()=>upd(item.drug.id,item.qty-1)}>−</button>
          <span>{item.qty}</span>
          <button onClick={()=>upd(item.drug.id,item.qty+1)} disabled={item.qty>=item.drug.stock}>+</button>
        </div>
        <div style={{minWidth:70,textAlign:'right',fontWeight:600,fontSize:12,color:'var(--ok)'}}>{fmt(item.drug.price*item.qty)}</div>
        <button className="bt bt-g bt-sm" onClick={()=>upd(item.drug.id,0)} style={{color:'var(--d)'}}>{Ic.trash({size:11})}</button>
      </div>)}</div>
      <div className="fi" style={{marginTop:12}}><label>Nom du client (optionnel)</label><input value={customer} onChange={e=>setCustomer(e.target.value)} placeholder="Ex: Jean Mukendi"/></div>
      <div className="ss"><div className="ssr"><span>Articles</span><span>{totalQty} unité{totalQty!==1?"s":""}</span></div><div className="ssr tot"><span>Total</span><span>{fmt(total)}</span></div></div></>}
    </div>
    <div className="mo-f"><button className="bt bt-s" onClick={onClose}>Fermer</button><button className="bt bt-ok" onClick={()=>onConfirm(cart,customer)} disabled={cart.length===0}>{Ic.check({size:12})} Confirmer · {fmt(total)}</button></div>
  </div></div>);
}

/* ═══════ INVOICE MODAL ═══════ */
function InvoiceModal({invoice,onClose,fmt}){
  const printInvoice=()=>{
    const win=window.open("","_blank");
    const rows=invoice.items.map(i=>`<tr><td>${i.drug_name}</td><td style="text-align:center">${i.qty}</td><td style="text-align:right">${fmtUSD(i.unit_price)}</td><td style="text-align:right">${fmtUSD(i.total)}</td></tr>`).join("");
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Facture ${invoice.number}</title><style>
body{font-family:Arial,sans-serif;max-width:600px;margin:40px auto;color:#1A2E23;font-size:13px}
h1{color:#0F4C2A;font-size:24px;margin-bottom:2px}.sub{color:#5A8A6A;font-size:11px;margin-bottom:20px}
.meta{display:flex;justify-content:space-between;margin-bottom:20px;padding:12px;background:#F4F7F5;border-radius:8px;font-size:12px}
.meta strong{color:#0F4C2A}
table{width:100%;border-collapse:collapse;margin-bottom:16px}
th{background:#0F4C2A;color:#fff;padding:8px 10px;text-align:left;font-size:11px}
td{padding:8px 10px;border-bottom:1px solid #E8F0EC}
.total-row td{font-weight:700;font-size:14px;border-top:2px solid #1A7F48;border-bottom:none;background:#F4F7F5}
.footer{text-align:center;margin-top:30px;font-size:10px;color:#8AA69A;border-top:1px solid #E8F0EC;padding-top:14px}
@media print{body{margin:20px}}
</style></head><body>
<h1>Speranza Della Pharma</h1><p class="sub">Système de Gestion Pharmaceutique</p>
<div class="meta"><div><strong>Facture N° :</strong> ${invoice.number}<br/><strong>Date :</strong> ${invoice.date}</div><div style="text-align:right"><strong>Client :</strong> ${invoice.customer||"Client de passage"}</div></div>
<table><thead><tr><th>Médicament</th><th style="text-align:center">Qté</th><th style="text-align:right">Prix unit.</th><th style="text-align:right">Total</th></tr></thead>
<tbody>${rows}<tr class="total-row"><td colspan="3">Total</td><td style="text-align:right">${fmtUSD(invoice.total)}</td></tr></tbody></table>
<div class="footer">Merci pour votre confiance · Speranza Della Pharma</div>
</body></html>`);
    win.document.close();setTimeout(()=>win.print(),300);
  };
  return(<div className="mo-bk"><div className="mo" onClick={e=>e.stopPropagation()} style={{width:500}}>
    <div className="mo-h"><h3>{Ic.receipt({size:15})} Facture {invoice.number}</h3><button className="bt bt-g" onClick={onClose}>{Ic.x({size:14})}</button></div>
    <div className="mo-b">
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:12,fontSize:12,background:'var(--bg)',borderRadius:'var(--rs)',padding:'8px 10px'}}>
        <span style={{color:'var(--t3)'}}>Date : <strong style={{color:'var(--t)'}}>{invoice.date}</strong></span>
        {invoice.customer&&<span style={{color:'var(--t3)'}}>Client : <strong style={{color:'var(--t)'}}>{invoice.customer}</strong></span>}
      </div>
      {invoice.items.map((item,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:'1px solid var(--bd2)',fontSize:12}}>
        <span style={{fontWeight:500}}>{item.drug_name} <span style={{color:'var(--t3)',fontWeight:400}}>×{item.qty}</span></span>
        <span style={{fontWeight:600,color:'var(--ok)'}}>{fmt(item.total)}</span>
      </div>)}
      <div className="ss"><div className="ssr tot"><span>Total</span><span>{fmt(invoice.total)}</span></div></div>
      <div style={{fontSize:10,color:'var(--t3)',marginTop:8,textAlign:'center'}}>L'impression s'effectue toujours en USD</div>
    </div>
    <div className="mo-f"><button className="bt bt-s" onClick={onClose}>Fermer</button><button className="bt bt-p" onClick={printInvoice}>{Ic.print({size:12})} Imprimer la facture</button></div>
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
  const[drag,setDrag]=useState(false);const[pv,setPv]=useState(null);
  const ref=fileRef||React.createRef();
  const h=file=>{if(!file)return;const r=new FileReader();r.onload=e=>setPv(e.target.result);r.readAsText(file)};
  return(<div className="mo-bk" onClick={onClose}><div className="mo" onClick={e=>e.stopPropagation()} style={{width:480}}>
    <div className="mo-h"><h3>Importer CSV</h3><button className="bt bt-g" onClick={onClose}>{Ic.x({size:14})}</button></div>
    <div className="mo-b">
      <div className={`dz ${drag?"on":""}`} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);h(e.dataTransfer.files[0])}} onClick={()=>ref.current?.click()}>
        {Ic.upload({size:22})}<p><strong>Déposez un CSV</strong> ou cliquez</p>
        <input ref={ref} type="file" accept=".csv" style={{display:'none'}} onChange={e=>h(e.target.files[0])}/>
      </div>
      {pv&&<pre style={{background:'var(--bg)',padding:7,borderRadius:6,fontSize:9,overflow:'auto',maxHeight:90,marginTop:8}}>{pv.split("\n").slice(0,5).join("\n")}</pre>}
    </div>
    <div className="mo-f"><button className="bt bt-s" onClick={onClose}>Annuler</button><button className="bt bt-p" onClick={()=>onImport(pv)} disabled={!pv}>{Ic.upload({size:12})} Importer</button></div>
  </div></div>);
}

/* ═══════ TEAM PAGE ═══════ */
function TeamPage({workspace,members,currentUserId,onInvite,onRemoveMember}){
  const[email,setEmail]=useState("");const[busy,setBusy]=useState(false);
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

/* ═══════ ROOT ═══════ */
export default function App(){
  const[session,setSession]=useState(null);const[checking,setChecking]=useState(true);
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{setSession(session);setChecking(false)});
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>setSession(s));
    return()=>subscription.unsubscribe();
  },[]);
  const logout=async()=>{await supabase.auth.signOut();setSession(null)};
  if(checking)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#F4F7F5'}}><div className="spin" style={{width:32,height:32,border:'3px solid #D4E4DB',borderTopColor:'#1A7F48',borderRadius:'50%',animation:'sp 1s linear infinite'}}/><style>{"@keyframes sp{to{transform:rotate(360deg)}}"}</style></div>;
  if(!session)return<LandingPage onAuth={setSession}/>;
  return<DashApp session={session} onLogout={logout}/>;
}
