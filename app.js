/**
 * app.js — v2 (corrigé & enrichi)
 *
 * ✅ Directions bus correctes + temps d'attente fiables (Europe/Paris)
 * ✅ RER A (header prochain train)
 * ✅ Vélib (2+ stations, % dispo, couleurs dynamiques)
 * ✅ News (rotation auto 15s : titre + description)
 * ✅ Courses Hippodrome (date/heure + chrono prochaine course)
 * ✅ Alertes trafic par ligne (PRIM /general-message)
 * 🗑️ Bloc Trafic routier supprimé (ne plus appeler updateRoadTraffic)
 *
 * ⚠️ Remplace/merge ce fichier avec ton app.js existant.
 */

/**********************
 * ⚙️ CONFIG GÉNÉRALE
 **********************/
const PROXY = "https://ratp-proxy.hippodrome-proxy42.workers.dev/?url=";
const PRIM  = "https://prim.iledefrance-mobilites.fr/marketplace/";
const TZ    = "Europe/Paris";

// Lignes/Arrêts à suivre
const LINE_RER_A      = "STIF:Line::C01742:";                 // RER A
const STOP_JOINVILLE  = "STIF:StopArea:SP:43135:";             // RER A – Joinville-le-Pont
const STOP_HIPPODROME = "STIF:StopArea:SP:463641:";            // Bus 77 (exemple)
const STOP_ECOLE_BREUIL = "STIF:StopArea:SP:463644:";          // Bus 201 (exemple)

// (Optionnel) LineRef des bus pour /general-message — à ajuster si connu
const LINE_BUS_77  = ""; // ex: "STIF:Line::C0XXXX:" si tu l'as
const LINE_BUS_201 = "";

// Vélib — liste des stations à afficher (IDs GBFS) : remplace par tes stations
// Tu peux retrouver les IDs dans station_information.json
const VELIB_STATIONS = [
  { id: 21014, label: "Vincennes – Avenue de Nogent" },
  { id: 12128, label: "Joinville – RER" }
];

// Courses — configure tes horaires (Date ISO locale Europe/Paris)
const COURSES = [
  // Exemple : prochaine(s) réunion(s)
  // "2025-10-20T14:55:00+02:00",
  // "2025-10-20T16:10:00+02:00",
];

/**********************
 * 🧰 HELPERS GÉNÉRIQUES
 **********************/
const $ = (sel) => document.querySelector(sel);

function parseISO(iso){ try{ const d=new Date(iso); return isNaN(d)?null:d;}catch{return null;} }
function fmtHM(iso){ const d=parseISO(iso); return d?d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",timeZone:TZ}):"--:--"; }
function diffMin(iso){ const d=parseISO(iso); if(!d) return null; return Math.round((d.getTime()-Date.now())/60000); }
function normalize(v){ return (v||"").normalize("NFD").replace(/\p{Diacritic}/gu,"").toLowerCase(); }
function safe(obj, path, fallback=null){ try{ return path.split(".").reduce((o,k)=>o&&k in o?o[k]:undefined,obj) ?? fallback;}catch{return fallback;} }

function soonestVisitOrder(a,b){
  const ta = safe(a,"MonitoredVehicleJourney.MonitoredCall.ExpectedDepartureTime")
          || safe(a,"MonitoredVehicleJourney.MonitoredCall.ExpectedArrivalTime")
          || safe(a,"MonitoredVehicleJourney.MonitoredCall.AimedDepartureTime")
          || safe(a,"MonitoredVehicleJourney.MonitoredCall.AimedArrivalTime");
  const tb = safe(b,"MonitoredVehicleJourney.MonitoredCall.ExpectedDepartureTime")
          || safe(b,"MonitoredVehicleJourney.MonitoredCall.ExpectedArrivalTime")
          || safe(b,"MonitoredVehicleJourney.MonitoredCall.AimedDepartureTime")
          || safe(b,"MonitoredVehicleJourney.MonitoredCall.AimedArrivalTime");
  const ma = ta?diffMin(ta):9e9; const mb = tb?diffMin(tb):9e9; return ma-mb;
}

/**********************
 * 🌐 PRIM CALLS
 **********************/
async function fetchStopMonitoring({ stopAreaRef, lineRef, maxItems=8 }){
  const url = `${PROXY}${PRIM}stop-monitoring?MonitoringRef=${encodeURIComponent(stopAreaRef)}${lineRef?`&LineRef=${encodeURIComponent(lineRef)}`:""}`;
  const r = await fetch(url); if(!r.ok) throw new Error(`StopMonitoring ${r.status}`);
  const j = await r.json();
  return safe(j,"Siri.ServiceDelivery.StopMonitoringDelivery.0.MonitoredStopVisit",[]).sort(soonestVisitOrder).slice(0,maxItems);
}

async function fetchGeneralMessage({ lineRef }){
  // PRIM /general-message — on filtre par ligne si fournie
  const base = `${PROXY}${PRIM}general-message`;
  const url = lineRef ? `${base}?LineRef=${encodeURIComponent(lineRef)}` : base;
  const r = await fetch(url); if(!r.ok) throw new Error(`GeneralMessage ${r.status}`);
  const j = await r.json();
  return safe(j,"Siri.ServiceDelivery.GeneralMessageDelivery.0.InfoMessage",[]);
}

/**********************
 * 🚌 BUS PANELS (77/201)
 **********************/
function makeVisitHTML(v){
  const mvj = v.MonitoredVehicleJourney||{};
  const name = safe(mvj,"PublishedLineName.0.value") || safe(mvj,"LineRef.value") || "—";
  const dest = safe(mvj,"DestinationDisplay.0.value") || safe(mvj,"DestinationName.0.value") || "";
  const call = mvj.MonitoredCall||{};
  const iso  = call.ExpectedDepartureTime||call.ExpectedArrivalTime||call.AimedDepartureTime||call.AimedArrivalTime;
  const mins = iso?diffMin(iso):null; const eta = mins==null?"—":(mins<=0?"à quai":`${mins} min`);
  const hm   = fmtHM(iso);
  return `<div class="visit"><div class="visit-line">${name}</div><div class="visit-dest">→ ${dest}</div><div class="visit-time">${hm} <span class="visit-eta">(${eta})</span></div></div>`;
}

function dirKey(mvj){
  return normalize( safe(mvj,"DestinationDisplay.0.value") || safe(mvj,"DestinationName.0.value") || safe(mvj,"DirectionName.0.value") || safe(mvj,"DirectionRef.value") );
}

function groupByDirection(visits){
  const map = new Map();
  for(const v of visits){
    const k = dirKey(v.MonitoredVehicleJourney||{} ) || "inconnu";
    if(!map.has(k)) map.set(k,[]);
    map.get(k).push(v);
  }
  for(const [k,arr] of map) arr.sort(soonestVisitOrder);
  return map;
}

function renderDirectionBlock(title, arr){
  const html = arr.map(makeVisitHTML).join("");
  return `<section class="dir-block"><header class="dir-h"><span class="dir-dot"></span><span class="dir-title">${title}</span><span class="dir-count">${arr.length}</span></header><div class="dir-list">${html}</div></section>`;
}

function renderEmpty(title,msg){ return `<section class="dir-block empty"><header class="dir-h"><span class="dir-title">${title}</span></header><div class="dir-list"><div class="visit">${msg}</div></div></section>`; }

async function updateBusPanel({ containerId, stopRef, lineRef, title }){
  const el = document.getElementById(containerId); if(!el) return;
  el.innerHTML = `<div class="panel"><div class="panel-title">${title}</div><div class="panel-body">Chargement…</div></div>`;
  try{
    const visits = await fetchStopMonitoring({ stopAreaRef: stopRef, lineRef, maxItems: 8 });
    if(!visits.length){ el.innerHTML = renderEmpty(title, "🌙 Service terminé – reprise au matin."); return; }
    const groups = groupByDirection(visits);
    const ordered = [...groups.entries()].sort((a,b)=> soonestVisitOrder(a[1][0], b[1][0]));
    const blocks = ordered.map(([key,arr])=>{
      const pretty = safe(arr[0],"MonitoredVehicleJourney.DestinationDisplay.0.value") || safe(arr[0],"MonitoredVehicleJourney.DestinationName.0.value") || key;
      return renderDirectionBlock(pretty, arr);
    }).join("");
    el.innerHTML = `<div class="panel"><div class="panel-title">${title}</div><div class="panel-body">${blocks}</div></div>`;
  }catch(e){ el.innerHTML = renderEmpty(title, `Erreur : ${e.message}`); }
}

/**********************
 * 🚆 RER A HEADER (prochain train)
 **********************/
async function updateRERAHeader({ containerId }){
  const el = document.getElementById(containerId); if(!el) return;
  el.innerHTML = `<div class="panel"><div class="panel-title">RER A – Joinville</div><div class="panel-body">Chargement…</div></div>`;
  try{
    const visits = await fetchStopMonitoring({ stopAreaRef: STOP_JOINVILLE, lineRef: LINE_RER_A, maxItems: 6 });
    if(!visits.length){ el.innerHTML = renderEmpty("RER A – Joinville","🌙 Service terminé – reprise au matin."); return; }
    const groups = groupByDirection(visits);
    const ordered = [...groups.entries()].sort((a,b)=> soonestVisitOrder(a[1][0], b[1][0]));
    const blocks = ordered.map(([key,arr])=>{
      const pretty = safe(arr[0],"MonitoredVehicleJourney.DestinationDisplay.0.value") || safe(arr[0],"MonitoredVehicleJourney.DestinationName.0.value") || key;
      return renderDirectionBlock(pretty, arr);
    }).join("");
    el.innerHTML = `<div class="panel"><div class="panel-title">RER A – Joinville</div><div class="panel-body">${blocks}</div></div>`;
  }catch(e){ el.innerHTML = renderEmpty("RER A – Joinville",`Erreur : ${e.message}`); }
}

/**********************
 * 🚴 VÉLIB PANEL
 **********************/
async function fetchVelib() {
  const infoUrl = `${PROXY}https://velib-metropole-opendata.smoove.pro/opendata/Velib_Metropole/station_information.json`;
  const statUrl = `${PROXY}https://velib-metropole-opendata.smoove.pro/opendata/Velib_Metropole/station_status.json`;
  const [infoRes, statRes] = await Promise.all([fetch(infoUrl), fetch(statUrl)]);
  const info = await infoRes.json();
  const stat = await statRes.json();
  const infoMap = new Map(info.data.stations.map(s=>[s.station_id, s]));
  const statMap = new Map(stat.data.stations.map(s=>[s.station_id, s]));
  return VELIB_STATIONS.map(cfg=>{
    const i = infoMap.get(String(cfg.id));
    const s = statMap.get(String(cfg.id));
    if(!i||!s) return { label: cfg.label, error: true };
    const total = i.capacity || (s.num_bikes_available + s.num_docks_available);
    const avail = s.num_bikes_available;
    const pct = total? Math.round((avail/total)*100) : 0;
    return { label: cfg.label, total, avail, pct, isRenting: !!s.is_renting, isReturning: !!s.is_returning };
  });
}

function velibColor(pct){ if(pct>=50) return "ok"; if(pct>=20) return "warn"; return "err"; }

async function updateVelibPanel({ containerId }){
  const el = document.getElementById(containerId); if(!el) return;
  el.innerHTML = `<div class=panel><div class=panel-title>Vélib'</div><div class=panel-body>Chargement…</div></div>`;
  try{
    const rows = await fetchVelib();
    const html = rows.map(r=>{
      if(r.error) return `<div class="velib-row err">${r.label}: données indisponibles</div>`;
      const cls = velibColor(r.pct);
      return `<div class="velib-row ${cls}">🟢 ${r.avail} / ${r.total} — 🚲 ${r.label} <span class=pct>(${r.pct}%)</span></div>`;
    }).join("");
    el.innerHTML = `<div class=panel><div class=panel-title>Vélib'</div><div class=panel-body>${html}</div></div>`;
  }catch(e){ el.innerHTML = `<div class=panel><div class=panel-title>Vélib'</div><div class=panel-body>Erreur: ${e.message}</div></div>`; }
}

/**********************
 * 📰 NEWS ROTATOR (15s)
 **********************/
let NEWS_TIMER = null, NEWS_ITEMS = [], NEWS_INDEX = 0;

async function fetchNews(){
  // Flux Franceinfo — via proxy pour CORS
  const rssUrl = `${PROXY}https://www.francetvinfo.fr/titres.rss`;
  const res = await fetch(rssUrl); if(!res.ok) throw new Error(`news ${res.status}`);
  const xml = await res.text();
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const items = [...doc.querySelectorAll("item")].slice(0,10).map(n=>({
    title: n.querySelector("title")?.textContent?.trim()||"",
    desc: n.querySelector("description")?.textContent?.trim()||"",
    link: n.querySelector("link")?.textContent?.trim()||""
  }));
  return items;
}

function renderNewsOnce(el){
  if(!NEWS_ITEMS.length){ el.innerHTML = `<div class=panel><div class=panel-title>Actus</div><div class=panel-body>Aucune actualité disponible</div></div>`; return; }
  const it = NEWS_ITEMS[NEWS_INDEX % NEWS_ITEMS.length];
  el.innerHTML = `<div class=panel>
    <div class=panel-title>Actus</div>
    <div class=panel-body news-fade-in>
      <div class=news-title>${it.title}</div>
      <div class=news-desc>${it.desc}</div>
    </div>
  </div>`;
  NEWS_INDEX++;
}

async function updateNewsPanel({ containerId }){
  const el = document.getElementById(containerId); if(!el) return;
  el.innerHTML = `<div class=panel><div class=panel-title>Actus</div><div class=panel-body>Chargement…</div></div>`;
  try{
    NEWS_ITEMS = await fetchNews(); NEWS_INDEX = 0;
    renderNewsOnce(el);
    if(NEWS_TIMER) clearInterval(NEWS_TIMER);
    NEWS_TIMER = setInterval(()=> renderNewsOnce(el), 15000);
  }catch(e){ el.innerHTML = `<div class=panel><div class=panel-title>Actus</div><div class=panel-body>Erreur: ${e.message}</div></div>`; }
}

/***************************
 * 🏇 COURSES (date/heure + chrono)
 ***************************/
function nextCourse(){
  const now = Date.now();
  const list = COURSES.map(s=>parseISO(s)).filter(Boolean).sort((a,b)=>a-b);
  return list.find(d=>d.getTime()>now) || null;
}

function formatDateFR(d){
  return d.toLocaleString('fr-FR', { weekday:'long', day:'2-digit', month:'long', hour:'2-digit', minute:'2-digit', timeZone:TZ });
}

let COURSE_TIMER=null;
async function updateCoursesPanel({ containerId }){
  const el = document.getElementById(containerId); if(!el) return;
  const target = nextCourse();
  if(!target){ el.innerHTML = `<div class=panel><div class=panel-title>Courses</div><div class=panel-body>Aucune course à venir</div></div>`; return; }
  function tick(){
    const mins = Math.max(0, Math.floor((target.getTime()-Date.now())/60000));
    const secs = Math.max(0, Math.floor(((target.getTime()-Date.now())%60000)/1000));
    el.innerHTML = `<div class=panel>
      <div class=panel-title>Courses</div>
      <div class=panel-body>
        <div><strong>Prochaine course :</strong> ${formatDateFR(target)}</div>
        <div><strong>Départ dans :</strong> ${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}</div>
      </div>
    </div>`;
  }
  tick();
  if(COURSE_TIMER) clearInterval(COURSE_TIMER);
  COURSE_TIMER = setInterval(tick, 1000);
}

/*********************************
 * ⚠️ ALERTES TRAFIC /general-message
 *********************************/
function renderAlertLine(name, arr){
  const txt = arr.map(im => safe(im,"Content.MessageText.0.value","") ).filter(Boolean).join(" • ");
  return txt ? `<div class=alert-line>⚠️ ${name} — ${txt}</div>` : "";
}

async function updateTrafficAlerts({ containerId }){
  const el = document.getElementById(containerId); if(!el) return;
  el.innerHTML = `<div class=panel><div class=panel-title>Alertes trafic</div><div class=panel-body>Chargement…</div></div>`;
  try{
    const [a, b77, b201] = await Promise.all([
      fetchGeneralMessage({ lineRef: LINE_RER_A }),
      LINE_BUS_77 ? fetchGeneralMessage({ lineRef: LINE_BUS_77 }) : Promise.resolve([]),
      LINE_BUS_201 ? fetchGeneralMessage({ lineRef: LINE_BUS_201 }) : Promise.resolve([]),
    ]);
    const html = [
      renderAlertLine("RER A", a),
      LINE_BUS_77 && renderAlertLine("Bus 77", b77),
      LINE_BUS_201 && renderAlertLine("Bus 201", b201)
    ].filter(Boolean).join("");
    el.innerHTML = `<div class=panel><div class=panel-title>Alertes trafic</div><div class=panel-body>${html || "Aucune alerte"}</div></div>`;
  }catch(e){ el.innerHTML = `<div class=panel><div class=panel-title>Alertes trafic</div><div class=panel-body>Erreur: ${e.message}</div></div>`; }
}

/**********************
 * 🔁 INIT
 **********************/
async function initDashboard(){
  // RER + Bus
  updateRERAHeader({ containerId: "panel-rera" });
  updateBusPanel({ containerId: "panel-bus-77",  stopRef: STOP_HIPPODROME,  lineRef: null, title: "Bus 77 – Hippodrome" });
  updateBusPanel({ containerId: "panel-bus-201", stopRef: STOP_ECOLE_BREUIL, lineRef: null, title: "Bus 201 – École du Breuil" });

  // Vélib / News / Courses / Alertes
  updateVelibPanel({ containerId: "panel-velib" });
  updateNewsPanel({ containerId: "panel-news" });
  updateCoursesPanel({ containerId: "panel-courses" });
  updateTrafficAlerts({ containerId: "panel-alerts" });

  // 🗑️ Ne plus appeler updateRoadTraffic() et retirer le bloc HTML correspondant
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initDashboard); else initDashboard();

/**********************
 * 💅 Styles suggérés (si besoin)
 * (mets-les plutôt dans ton CSS)
 **********************/
/*
.panel{background:#0f1117;border:1px solid #262a33;border-radius:12px;padding:10px}
.panel-title{font-weight:700;margin-bottom:8px}
.dir-block{background:#12131a;border:1px solid #262a33;border-radius:10px;margin:8px 0;padding:10px}
.dir-h{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.dir-dot{width:10px;height:10px;border-radius:50%;background:#7dcfff}
.dir-title{font-weight:600}.dir-count{margin-left:auto;opacity:.7}
.dir-list{display:grid;gap:8px}
.visit{display:flex;gap:10px;align-items:center;justify-content:space-between}
.visit-time{font-variant-numeric:tabular-nums}
.velib-row{padding:6px 8px;border-radius:8px;margin:6px 0;background:#141722;border:1px solid #232838}
.velib-row.ok{border-color:#2f7}
.velib-row.warn{border-color:#fc3}
.velib-row.err{border-color:#f66}
.news-title{font-weight:700;margin-bottom:6px}
.news-desc{opacity:.9}
.alert-line{padding:6px 8px;border-radius:6px;margin:6px 0;background:#2a1f1f;border:1px solid #6a2b2b}
.news-fade-in{animation:.4s ease both fadein}
@keyframes fadein{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
*/
