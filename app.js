/* ============================================================
   SHP Social Ad Planner
   Vanilla JS, ingen build. Data per kund i data/<slug>.json.
   ============================================================ */
"use strict";

const GH = { owner: "ShinyHappyDaniel", repo: "social-ad-planner", branch: "main" };

const PLATFORMS = {
  Meta: {
    placements: ["Feed", "Stories", "Reels", "Carousel"],
    formats: ["1:1", "4:5", "9:16", "16:9"],
    limits: { headline: 40, primaryText: 125, description: 30 },
    limitLabels: { primaryText: "125 (synligt före “See More”)" },
    ctas: ["Läs mer", "Registrera dig", "Kom igång", "Boka nu", "Ladda ner", "Skicka meddelande"]
  },
  YouTube: {
    placements: ["In-stream (skippable)", "In-stream (non-skip)", "Shorts", "In-feed", "Bumper 6s"],
    formats: ["16:9", "9:16", "1:1"],
    limits: { headline: 15, description: 35 },
    ctas: ["Läs mer", "Prenumerera", "Besök", "Kom igång"]
  },
  TikTok: {
    placements: ["In-feed", "TopView", "Spark Ad"],
    formats: ["9:16", "1:1"],
    limits: { primaryText: 100, headline: 40 },
    limitLabels: { primaryText: "100 (ad text)", headline: "40 (display name)" },
    ctas: ["Läs mer", "Registrera dig", "Ladda ner", "Handla nu", "Boka nu"]
  }
};
const STATUSES = ["Utkast", "Redo för granskning", "Godkänd", "Ändring begärd"];
const STATUS_CLASS = { "Utkast": "s-utkast", "Redo för granskning": "s-redo", "Godkänd": "s-godkänd", "Ändring begärd": "s-ändring" };
const AR_CLASS = { "1:1": "ar-1-1", "4:5": "ar-4-5", "9:16": "ar-9-16", "16:9": "ar-16-9" };

/* ---------------- State ---------------- */
let clients = [];                 // [{slug,name}]
let slug = null;
let doc = null;                   // current document
let remoteSnapshot = "";          // JSON string of last-known committed doc
let filterPlatform = "all", filterStatus = "all", view = "cards";
let editingId = null;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => "ad_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const esc = s => (s == null ? "" : String(s)).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const todayISO = () => { const d = new Date(); return d.toISOString().slice(2, 10).replace(/-/g, "-"); };

function emptyDoc(name, sg) {
  return { client: { slug: sg, name: name || "" }, campaign: { title: "", period: "", by: "Shiny Happy People", date: todayISO(), version: "v1" }, ads: [] };
}
function emptyAd() {
  const now = todayISO();
  return {
    id: uid(), platform: "Meta", placement: "Feed", campaign: "", name: "", objective: "Awareness",
    audience: "", region: "Sverige", language: "Svenska", format: "1:1",
    headline: "", primaryText: "", cta: "Läs mer", url: "",
    assetType: "Bild", assetUrl: "", assetData: "",
    budget: "", startDate: "", endDate: "",
    status: "Utkast", approver: "", approvedDate: "", clientComment: "", notes: "",
    created: now, updated: now
  };
}

/* ---------------- LocalStorage ---------------- */
const lsTheme = "sap:theme", lsToken = "sap:token";
const lsDoc = s => "sap:doc:" + s;
const lsClients = "sap:clients";

/* ---------------- Boot ---------------- */
init();
async function init() {
  const themeParam = new URLSearchParams(location.search).get("theme");
  applyTheme(themeParam === "dark" || themeParam === "light" ? themeParam : (localStorage.getItem(lsTheme) || "light"));
  bindStaticEvents();
  await loadClients();
  const params = new URLSearchParams(location.search);
  slug = params.get("client") || (clients[0] && clients[0].slug) || "demo";
  await loadDoc(slug);
  renderClientSwitcher();
  renderAll();
}

async function loadClients() {
  try {
    const r = await fetch(`data/index.json?ts=${Date.now()}`, { cache: "no-store" });
    if (r.ok) { const j = await r.json(); clients = j.clients || []; localStorage.setItem(lsClients, JSON.stringify(clients)); return; }
  } catch (e) {}
  clients = JSON.parse(localStorage.getItem(lsClients) || "[]");
}

async function loadDoc(sg) {
  let remote = null;
  try {
    const r = await fetch(`data/${sg}.json?ts=${Date.now()}`, { cache: "no-store" });
    if (r.ok) remote = await r.json();
  } catch (e) {}
  remoteSnapshot = remote ? JSON.stringify(remote) : "";
  const local = localStorage.getItem(lsDoc(sg));
  if (local) { try { doc = JSON.parse(local); } catch (e) { doc = remote || emptyDoc("", sg); } }
  else doc = remote || emptyDoc(clientName(sg), sg);
  if (!doc.client) doc.client = { slug: sg, name: clientName(sg) };
  doc.client.slug = sg;
  if (!doc.ads) doc.ads = [];
}
function clientName(sg) { const c = clients.find(c => c.slug === sg); return c ? c.name : ""; }

/* ---------------- Persistence ---------------- */
function saveLocal() {
  doc.client.slug = slug;
  localStorage.setItem(lsDoc(slug), JSON.stringify(doc));
  updateDirty();
}
function isDirty() { return JSON.stringify(doc) !== remoteSnapshot; }
function updateDirty() {
  const el = $("#brandClient");
  const nm = doc.client.name || "Namnlös kund";
  el.textContent = isDirty() ? nm + " · osparade ändringar" : nm;
}

/* ---------------- Theme ---------------- */
function applyTheme(t) { document.documentElement.setAttribute("data-theme", t); localStorage.setItem(lsTheme, t); }
function toggleTheme() { applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark"); }

/* ---------------- Render ---------------- */
function renderClientSwitcher() {
  const sel = $("#clientSwitcher");
  const known = clients.slice();
  if (!known.find(c => c.slug === slug)) known.unshift({ slug, name: doc.client.name || slug });
  sel.innerHTML = known.map(c => `<option value="${esc(c.slug)}" ${c.slug === slug ? "selected" : ""}>${esc(c.name || c.slug)}</option>`).join("");
}

function renderAll() {
  // cover
  $("#covClient").value = doc.client.name || "";
  $("#covCampaign").value = doc.campaign.title || "";
  $("#covPeriod").value = doc.campaign.period || "";
  $("#covBy").value = doc.campaign.by || "";
  $("#covDate").value = doc.campaign.date || "";
  $("#covVersion").value = doc.campaign.version || "";
  $("#footVersion").textContent = [doc.client.name, doc.campaign.title, doc.campaign.version].filter(Boolean).join(" · ");
  updateDirty();
  renderSummary();
  renderAds();
}

function renderSummary() {
  const ads = doc.ads;
  const byP = p => ads.filter(a => a.platform === p).length;
  const byS = s => ads.filter(a => a.status === s).length;
  const cards = [
    ["Annonser", ads.length],
    ["Meta", byP("Meta")],
    ["YouTube", byP("YouTube")],
    ["TikTok", byP("TikTok")],
    ["Godkända", byS("Godkänd")],
    ["Väntar", ads.length - byS("Godkänd")]
  ];
  $("#summary").innerHTML = cards.map(([l, n]) => `<div class="summary-card"><span class="summary-num">${n}</span><span class="summary-label">${l}</span></div>`).join("");
}

function visibleAds() {
  return doc.ads.filter(a =>
    (filterPlatform === "all" || a.platform === filterPlatform) &&
    (filterStatus === "all" || a.status === filterStatus));
}

function renderAds() {
  const wrap = $("#adsContainer");
  const ads = visibleAds();
  $("#emptyState").hidden = doc.ads.length !== 0;
  if (!doc.ads.length) { wrap.innerHTML = ""; return; }

  if (view === "table") { wrap.innerHTML = tableHTML(ads); bindRowClicks(wrap); return; }

  const order = ["Meta", "YouTube", "TikTok"];
  const groups = order.filter(p => filterPlatform === "all" || filterPlatform === p);
  wrap.innerHTML = groups.map(p => {
    const list = ads.filter(a => a.platform === p);
    if (!list.length) return "";
    return `<section class="platform-group">
      <div class="platform-head"><h2>${p}</h2><span class="count">${list.length} st</span></div>
      <div class="cards-grid">${list.map(cardHTML).join("")}</div>
    </section>`;
  }).join("");
  bindCardClicks(wrap);
}

function cardHTML(a) {
  const ar = AR_CLASS[a.format] || "ar-1-1";
  const thumb = a.assetData ? `<img src="${esc(a.assetData)}" alt="">`
    : a.assetUrl ? `<img src="${esc(a.assetUrl)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'ph',textContent:'${a.assetType === 'Film' ? 'FILM' : 'BILD'}'}))">`
    : `<span class="ph">${a.assetType === "Film" ? "▶ Film" : "Ingen asset"}</span>`;
  const meta = [
    ["Audience", a.audience], ["Region", a.region], ["Mål", a.objective], ["Placering", a.placement]
  ].filter(([, v]) => v).map(([l, v]) =>
    `<div class="preview-meta-item"><span class="preview-meta-label">${l}</span><span class="preview-meta-val">${esc(v)}</span></div>`).join("");
  return `<article class="ad-card" data-id="${a.id}">
    <div class="preview-thumb ${ar}">
      <span class="preview-badge">${esc(a.platform)}</span>
      <span class="preview-ar">${esc(a.format)}</span>
      ${thumb}
    </div>
    <div class="preview-body">
      ${a.headline ? `<div class="preview-headline">${esc(a.headline)}</div>` : ""}
      ${a.primaryText ? `<div class="preview-text">${esc(a.primaryText)}</div>` : ""}
      ${a.cta ? `<span class="preview-cta">${esc(a.cta)}</span>` : ""}
      ${meta ? `<div class="preview-meta">${meta}</div>` : ""}
    </div>
    <div class="card-foot">
      <span class="status-chip ${STATUS_CLASS[a.status] || ""}">${esc(a.status)}</span>
      <span class="card-name">${esc(a.name || a.campaign || "Namnlös")}</span>
    </div>
  </article>`;
}

function tableHTML(ads) {
  const rows = ads.map(a => `<tr data-id="${a.id}">
    <td>${esc(a.platform)}</td><td>${esc(a.name || "—")}</td><td>${esc(a.campaign || "—")}</td>
    <td>${esc(a.headline || "—")}</td><td>${esc(a.audience || "—")}</td><td>${esc(a.region || "—")}</td>
    <td>${esc(a.format)}</td><td><span class="status-chip ${STATUS_CLASS[a.status] || ""}">${esc(a.status)}</span></td>
  </tr>`).join("");
  return `<table class="ads-table"><thead><tr>
    <th>Plattform</th><th>Annons</th><th>Kampanj</th><th>Rubrik</th><th>Audience</th><th>Region</th><th>Format</th><th>Status</th>
  </tr></thead><tbody>${rows}</tbody></table>`;
}
function bindCardClicks(w) { $$(".ad-card", w).forEach(c => c.onclick = () => openDrawer(c.dataset.id)); }
function bindRowClicks(w) { $$("tr[data-id]", w).forEach(r => r.onclick = () => openDrawer(r.dataset.id)); }

/* ---------------- Drawer (edit) ---------------- */
function field(label, html, hint) {
  return `<div class="field"><label>${label}</label>${html}${hint || ""}</div>`;
}
function opts(arr, val) { return arr.map(o => `<option ${o === val ? "selected" : ""}>${esc(o)}</option>`).join(""); }

function openDrawer(id) {
  const a = doc.ads.find(x => x.id === id);
  if (!a) return;
  editingId = id;
  const pf = PLATFORMS[a.platform];
  $("#drawerTitle").textContent = (a.name || "Annons") + " · " + a.platform;
  $("#drawerBody").innerHTML = `
    <div class="field-row">
      ${field("Plattform", `<select id="f_platform">${opts(Object.keys(PLATFORMS), a.platform)}</select>`)}
      ${field("Placering", `<select id="f_placement">${opts(pf.placements, a.placement)}</select>`)}
    </div>
    <div class="field-row">
      ${field("Annonsnamn", `<input id="f_name" value="${esc(a.name)}">`)}
      ${field("Kampanj", `<input id="f_campaign" value="${esc(a.campaign)}">`)}
    </div>
    <div class="field-row">
      ${field("Mål / funnel", `<select id="f_objective">${opts(["Awareness", "Consideration", "Conversion"], a.objective)}</select>`)}
      ${field("Format / aspect ratio", `<select id="f_format">${opts(pf.formats, a.format)}</select>`)}
    </div>

    <div class="field-group-title">Innehåll</div>
    ${field("Rubrik / headline", `<input id="f_headline" value="${esc(a.headline)}">`, counterHint(a.platform, "headline", a.headline))}
    ${field("Primary text / beskrivning", `<textarea id="f_primaryText">${esc(a.primaryText)}</textarea>`, counterHint(a.platform, "primaryText", a.primaryText))}
    <div class="field-row">
      ${field("CTA", `<select id="f_cta">${opts(pf.ctas, a.cta)}</select>`)}
      ${field("Destinations-URL", `<input id="f_url" value="${esc(a.url)}" placeholder="https://">`)}
    </div>

    <div class="field-group-title">Creative-asset</div>
    <div class="field-row">
      ${field("Typ", `<select id="f_assetType">${opts(["Bild", "Film"], a.assetType)}</select>`)}
      ${field("Asset-länk (Drive/Dropbox)", `<input id="f_assetUrl" value="${esc(a.assetUrl)}" placeholder="https:// eller filnamn">`)}
    </div>
    ${field("Thumbnail (ladda upp)", `<div class="thumb-drop"><img class="thumb-prev" id="f_thumbPrev" ${a.assetData ? `src="${esc(a.assetData)}"` : ""} alt=""><input type="file" id="f_thumb" accept="image/*"><button class="btn btn-ghost" id="f_thumbClear" type="button">Rensa</button></div>`)}

    <div class="field-group-title">Targeting</div>
    ${field("Audience / targeting", `<textarea id="f_audience">${esc(a.audience)}</textarea>`)}
    <div class="field-row">
      ${field("Region / geo", `<input id="f_region" value="${esc(a.region)}">`)}
      ${field("Språk", `<input id="f_language" value="${esc(a.language)}">`)}
    </div>

    <div class="field-group-title">Schema &amp; budget</div>
    <div class="field-row">
      ${field("Start", `<input id="f_startDate" value="${esc(a.startDate)}" placeholder="ÅÅ-MM-DD">`)}
      ${field("Slut", `<input id="f_endDate" value="${esc(a.endDate)}" placeholder="ÅÅ-MM-DD">`)}
    </div>
    ${field("Budget (valfritt)", `<input id="f_budget" value="${esc(a.budget)}" placeholder="t.ex. 15 000 SEK">`)}

    <div class="field-group-title">Status &amp; godkännande</div>
    ${field("Status", `<select id="f_status">${opts(STATUSES, a.status)}</select>`)}
    <div class="field-row">
      ${field("Godkännare", `<input id="f_approver" value="${esc(a.approver)}">`)}
      ${field("Godkänt datum", `<input id="f_approvedDate" value="${esc(a.approvedDate)}" placeholder="ÅÅ-MM-DD">`)}
    </div>
    ${field("Kundkommentar", `<textarea id="f_clientComment">${esc(a.clientComment)}</textarea>`)}
    ${field("Interna anteckningar", `<textarea id="f_notes">${esc(a.notes)}</textarea>`)}
  `;
  // live: platform change updates placements/formats/ctas/counters
  $("#f_platform").onchange = e => { a.platform = e.target.value; a.placement = PLATFORMS[a.platform].placements[0]; pullForm(a); openDrawer(id); };
  ["headline", "primaryText"].forEach(k => {
    const el = $("#f_" + k); if (!el) return;
    el.oninput = () => { const old = el.closest(".field").querySelector(".counter"); if (old) old.outerHTML = counterEl(a.platform, k, el.value); };
  });
  // thumbnail upload
  $("#f_thumb").onchange = ev => {
    const file = ev.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { a.assetData = reader.result; $("#f_thumbPrev").src = reader.result; };
    reader.readAsDataURL(file);
  };
  $("#f_thumbClear").onclick = () => { a.assetData = ""; $("#f_thumbPrev").removeAttribute("src"); };

  $("#drawer").hidden = false; $("#drawerBackdrop").hidden = false;
}

function counterEl(platform, key, val) {
  const lim = PLATFORMS[platform].limits[key];
  if (!lim) return `<span class="field-hint"></span>`;
  const lblMap = PLATFORMS[platform].limitLabels || {};
  const lbl = lblMap[key] || lim;
  const over = (val || "").length > lim;
  return `<span class="counter ${over ? "over" : ""}">${(val || "").length} / ${lbl}</span>`;
}
function counterHint(platform, key, val) {
  return PLATFORMS[platform].limits[key] ? counterEl(platform, key, val) : "";
}

function pullForm(a) {
  const g = id => { const el = $("#f_" + id); return el ? el.value : a[id]; };
  ["placement", "name", "campaign", "objective", "format", "headline", "primaryText", "cta", "url",
   "assetType", "assetUrl", "audience", "region", "language", "startDate", "endDate", "budget",
   "status", "approver", "approvedDate", "clientComment", "notes"].forEach(k => { const el = $("#f_" + k); if (el) a[k] = el.value; });
  a.updated = todayISO();
}

function closeDrawer() { $("#drawer").hidden = true; $("#drawerBackdrop").hidden = true; editingId = null; }
function saveDrawer() {
  const a = doc.ads.find(x => x.id === editingId); if (!a) return;
  pullForm(a);
  saveLocal(); renderAll(); closeDrawer(); toast("Annons sparad lokalt");
}
function deleteAd() {
  if (!editingId) return;
  if (!confirm("Ta bort den här annonsen?")) return;
  doc.ads = doc.ads.filter(x => x.id !== editingId);
  saveLocal(); renderAll(); closeDrawer(); toast("Annons borttagen");
}

/* ---------------- Add ad / client ---------------- */
function addAd() {
  const a = emptyAd();
  if (filterPlatform !== "all") a.platform = filterPlatform, a.placement = PLATFORMS[filterPlatform].placements[0], a.format = PLATFORMS[filterPlatform].formats[0];
  doc.ads.push(a); saveLocal(); renderAll(); openDrawer(a.id);
}
function addClient() {
  const name = prompt("Kundnamn?"); if (!name) return;
  const sg = name.toLowerCase().trim().replace(/[åä]/g, "a").replace(/ö/g, "o").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!sg) return;
  if (!clients.find(c => c.slug === sg)) clients.push({ slug: sg, name });
  localStorage.setItem(lsClients, JSON.stringify(clients));
  location.search = "?client=" + encodeURIComponent(sg);
}

/* ---------------- Cover inputs ---------------- */
function bindCover() {
  const map = { covClient: ["client", "name"], covCampaign: ["campaign", "title"], covPeriod: ["campaign", "period"], covBy: ["campaign", "by"], covDate: ["campaign", "date"], covVersion: ["campaign", "version"] };
  Object.entries(map).forEach(([id, [a, b]]) => {
    $("#" + id).oninput = e => { doc[a][b] = e.target.value; if (id === "covClient") { const c = clients.find(c => c.slug === slug); if (c) c.name = e.target.value; renderClientSwitcher(); } saveLocal(); $("#footVersion").textContent = [doc.client.name, doc.campaign.title, doc.campaign.version].filter(Boolean).join(" · "); };
  });
}

/* ---------------- Export / Import / Print ---------------- */
function exportJSON() {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${slug}-${(doc.campaign.version || "v1")}.json`;
  a.click(); URL.revokeObjectURL(a.href);
}
function importJSON(file) {
  const r = new FileReader();
  r.onload = () => { try { doc = JSON.parse(r.result); if (!doc.ads) doc.ads = []; if (!doc.client) doc.client = { slug, name: "" }; saveLocal(); renderClientSwitcher(); renderAll(); toast("Importerat"); } catch (e) { alert("Kunde inte läsa JSON-filen."); } };
  r.readAsText(file);
}

/* ---------------- GitHub save ---------------- */
function utf8ToB64(str) { return btoa(unescape(encodeURIComponent(str))); }
async function ghGetSha(path) {
  const r = await fetch(`https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${path}?ref=${GH.branch}`, { headers: ghHeaders() });
  if (r.status === 200) { const j = await r.json(); return j.sha; }
  return null;
}
function ghHeaders() { return { "Authorization": "Bearer " + localStorage.getItem(lsToken), "Accept": "application/vnd.github+json" }; }
async function ghPut(path, contentStr, message) {
  const sha = await ghGetSha(path);
  const body = { message, content: utf8ToB64(contentStr), branch: GH.branch };
  if (sha) body.sha = sha;
  const r = await fetch(`https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${path}`, { method: "PUT", headers: ghHeaders(), body: JSON.stringify(body) });
  if (!r.ok) throw new Error((await r.json()).message || r.statusText);
}

function openTokenModal() {
  const existing = localStorage.getItem(lsToken);
  if (existing) { doSave(); return; }
  $("#tokenBackdrop").hidden = false; $("#tokenInput").focus();
}
async function doSave() {
  const btn = $("#saveBtn"); btn.disabled = true; const orig = btn.textContent; btn.textContent = "Sparar…";
  try {
    // ensure client in index
    if (!clients.find(c => c.slug === slug)) clients.push({ slug, name: doc.client.name || slug });
    else { const c = clients.find(c => c.slug === slug); c.name = doc.client.name || c.name; }
    await ghPut(`data/${slug}.json`, JSON.stringify(doc, null, 2), `Update ${slug} (${doc.campaign.version || ""})`);
    await ghPut(`data/index.json`, JSON.stringify({ clients }, null, 2), `Update client index`);
    remoteSnapshot = JSON.stringify(doc);
    localStorage.setItem(lsClients, JSON.stringify(clients));
    updateDirty();
    toast("Sparat till GitHub · live-länk uppdaterad");
  } catch (e) {
    alert("Kunde inte spara: " + e.message + "\n\nKontrollera att din token har Contents: Read and write på repot.");
  } finally { btn.disabled = false; btn.textContent = orig; }
}

/* ---------------- Misc ---------------- */
let toastT;
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2600); }

function bindStaticEvents() {
  $("#themeBtn").onclick = toggleTheme;
  $("#addAdBtn").onclick = addAd;
  $("#addClientBtn").onclick = addClient;
  $("#exportBtn").onclick = exportJSON;
  $("#importBtn").onclick = () => $("#importFile").click();
  $("#importFile").onchange = e => { if (e.target.files[0]) importJSON(e.target.files[0]); };
  $("#printBtn").onclick = () => window.print();
  $("#saveBtn").onclick = openTokenModal;
  $("#drawerClose").onclick = closeDrawer;
  $("#drawerBackdrop").onclick = closeDrawer;
  $("#saveAdBtn").onclick = saveDrawer;
  $("#deleteAdBtn").onclick = deleteAd;
  $("#clientSwitcher").onchange = e => { location.search = "?client=" + encodeURIComponent(e.target.value); };
  // token modal
  $("#tokenCancel").onclick = () => $("#tokenBackdrop").hidden = true;
  $("#tokenSave").onclick = () => {
    const v = $("#tokenInput").value.trim(); if (!v) return;
    localStorage.setItem(lsToken, v);
    if (!$("#tokenRemember").checked) window.addEventListener("beforeunload", () => localStorage.removeItem(lsToken));
    $("#tokenBackdrop").hidden = true; doSave();
  };
  // filters
  $("#platformFilter").onclick = e => { const b = e.target.closest("[data-filter]"); if (!b) return; filterPlatform = b.dataset.filter; setActive("#platformFilter", b); renderAds(); };
  $("#statusFilter").onclick = e => { const b = e.target.closest("[data-status]"); if (!b) return; filterStatus = b.dataset.status; setActive("#statusFilter", b); renderAds(); };
  $(".view-toggle").onclick = e => { const b = e.target.closest("[data-view]"); if (!b) return; view = b.dataset.view; setActive(".view-toggle", b); renderAds(); };
  document.addEventListener("keydown", e => { if (e.key === "Escape") { closeDrawer(); $("#tokenBackdrop").hidden = true; } });
  bindCover();
}
function setActive(scope, btn) { $$(scope + " .chip-btn").forEach(x => x.classList.remove("is-active")); btn.classList.add("is-active"); }
