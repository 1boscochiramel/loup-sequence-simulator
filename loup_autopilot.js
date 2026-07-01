/* loup_autopilot.js — ISA-106 procedural-automation engine for the LOUP sequences.
   Runs the transcribed DCS auto-sequence step-by-step on a synthetic twin:
     - check   : brief logic verification, auto-advances
     - field   : Field Officer physical action -> waits for a "Confirm done" click
     - signoff : operator must press the DCS confirmation/START button
     - ramp    : animates a tag toward target at its rate; updates telemetry
     - hold    : 30-min hold timer counts down (time-compressed)
     - branch  : evaluates PV vs criterion; proceeds or puts the sequence ON HOLD
   No real DCS. All values synthetic; the point is the procedure logic, live. */
(function () {
"use strict";
const $ = s => document.querySelector(s);
let mode = "startup", view = "live", speed = 3;
let emKey = Object.keys(LOUP.EMERGENCIES)[0];   // selected emergency scenario
let seq = [], flat = [], idx = -1, running = false, holding = false, timer = null;
const tele = {};           // live tag values
let simMin = 0;            // sequence clock (min)
let audit = [];

function emScenario() { return LOUP.EMERGENCIES[emKey]; }

// ---- build a flat step list with controller/index bookkeeping ----
function load() {
  const src = mode === "startup" ? LOUP.STARTUP : emScenario().controllers;
  seq = src;
  flat = [];
  src.forEach((c, ci) => c.steps.forEach(s => flat.push(Object.assign({ci, ctrlTitle:c.title, ctrlId:c.ctrl}, s))));
  idx = -1; running = false; holding = false; simMin = 0; audit = [];
  for (const k in tele) delete tele[k];
  // seed telemetry from first ramp "from" values so tiles show sensible starts
  flat.forEach(s => { if (s.tag && s.from != null && tele[s.tag] == null) tele[s.tag] = s.from; });
  $("#unitName").textContent = LOUP.unit;
  $("#prov").textContent = LOUP.provenance;
  const sn = $("#scenNote");
  if (sn) sn.innerHTML = mode==="startup" ? "" : `<b>SOP/${emScenario().code}</b> · ${emScenario().note}`;
  setChip("READY", "wait");
  renderRail(); renderSteps(); renderTele(); renderAudit(); renderTable();
}

function setChip(t, cls) { const c = $("#stateChip"); c.textContent = t; c.className = "chip " + cls; }
function clockStr() { const m = Math.floor(simMin); const h = Math.floor(m/60);
  return `T+${String(h).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`; }
function log(kind, msg) { audit.unshift({kind, msg, ts:clockStr()}); if (audit.length>80) audit.pop(); renderAudit(); }

// ---- rendering ----
function renderRail() {
  $("#rail").innerHTML = seq.map((c, ci) => {
    const done = flat.filter(s => s.ci===ci).every(s => s._done);
    const active = idx>=0 && flat[idx] && flat[idx].ci===ci;
    const tot = c.steps.length, dn = flat.filter(s=>s.ci===ci && s._done).length;
    return `<div class="r ${active?'active':''} ${done?'done':''}">
      <div class="t">C${c.ctrl} · ${c.title}</div><div class="n">${dn}/${tot} steps</div>
      <div class="bar"><i style="width:${100*dn/tot}%"></i></div></div>`;
  }).join("");
}
function renderSteps() {
  $("#steps").innerHTML = flat.map((s, i) => {
    const cls = s._done ? "done" : i===idx ? "active" : i<idx ? "done" : "pending";
    const hs = (holding && i===idx) ? "holdstep" : "";
    const gate = (i===idx && running && (s.type==="signoff"||s.type==="field") && !s._acted) ? `
      <div class="gate">${s.type==="signoff"
        ? `<button class="ok" data-gate="${i}">✓ Press &amp; confirm (DCS)</button>`
        : `<button class="field" data-gate="${i}">✓ Field officer: done</button>`}</div>` : "";
    const showHead = i===0 || flat[i-1].ci!==s.ci;
    const ctrlHead = showHead ? `<div style="grid-column:1/4;margin:6px 0 2px;font-weight:800;color:var(--accent);font-size:12px">CONTROLLER ${s.ctrlId}: ${s.ctrlTitle.toUpperCase()}</div>` : "";
    return ctrlHead + `<div class="st ${cls} ${hs}" id="st${i}">
      <div class="no">${s.n}</div>
      <div><div class="grp">${s.grp}</div><div class="tx">${s.text}</div></div>
      <div class="meta"><span class="ty ${s.type}">${s.type}</span><span class="by">${s.by}</span></div>
      <div class="prog"><i id="pg${i}"></i></div>
      <div class="live" id="lv${i}"></div>${gate}</div>`;
  }).join("");
  const a = $("#st"+idx); if (a) a.scrollIntoView({block:"center", behavior:"smooth"});
}
function renderTele() {
  const keys = Object.keys(tele);
  $("#tele").innerHTML = keys.length ? keys.map(k =>
    `<div class="t"><div class="k">${k}</div><div class="v">${(+tele[k]).toFixed(2)}</div></div>`).join("")
    : `<div class="dim" style="grid-column:1/3;font-size:12px">No live tags yet — press Start.</div>`;
}
function renderAudit() {
  $("#audit").innerHTML = audit.map(a =>
    `<div class="row"><span class="ts">${a.ts}</span> <span class="${a.kind}">${a.kind==='hold'?'⏸':a.kind==='ok'?'✓':a.kind==='field'?'⛑':'●'}</span> ${a.msg}</div>`
  ).join("") || `<div class="row dim" style="padding:10px">Awaiting start…</div>`;
}
function renderTable() {
  const rows = [];
  rows.push(`<table class="seq"><tr><th>Sr.</th><th>Action</th><th>Action By</th><th>Remarks</th></tr>`);
  seq.forEach(c => {
    rows.push(`<tr><td class="ctrl" colspan="4">Controller ${c.ctrl}: ${c.title}</td></tr>`);
    let lastGrp = null;
    c.steps.forEach(s => {
      if (s.grp !== lastGrp) { rows.push(`<tr><td class="grp" colspan="4">${s.grp}</td></tr>`); lastGrp = s.grp; }
      const rm = s.type==="ramp" ? `${s.rate} ${s.rateUnit||''}` : s.type==="hold" ? `${s.holdMin} min` : s.type==="branch" ? "conditional" : "";
      rows.push(`<tr><td class="no">${s.n}</td><td>${s.text}</td><td class="by">${s.by}</td><td class="rm">${rm}</td></tr>`);
    });
  });
  rows.push(`</table>`);
  $("#tableHost").innerHTML = rows.join("");
}

// ---- engine ----
function tickMs() { return Math.max(120, 700 / speed); }

function advance() {
  if (!running) return;
  idx++;
  if (idx >= flat.length) { finish(); return; }
  const s = flat[idx];
  s._acted = false;
  renderRail(); renderSteps();
  runStep(s);
}

function finish() {
  const label = mode==="startup" ? "START-UP COMPLETE ✓" : "PROCEDURE COMPLETE ✓";
  running = false; setChip(label, "done");
  log("sys", `<b>${mode==='startup'?'Start-up':'SOP/'+emScenario().code+' '+emScenario().title} — procedure completed.</b>`);
  flat.forEach(s=>s._done=true); renderRail(); renderSteps();
}

function runStep(s) {
  // HOLD-recovery note — only relevant if a hold was triggered; auto-advance otherwise
  if (s.hr) {
    log("sys", `#${s.n}: (hold-recovery note — not triggered)`);
    setChip("RUNNING", "run");
    wait(tickMs(), () => { s._done = true; advance(); });
    return;
  }
  // CHECK — logic verification, quick auto-advance
  if (s.type === "check") {
    log("sys", `C${s.ctrlId}·${s.grp} #${s.n}: ${short(s.text)}`);
    setChip("RUNNING", "run");
    wait(tickMs()*1.1, () => { s._done = true; advance(); });
    return;
  }
  // FIELD / SIGNOFF — wait for human
  if (s.type === "field" || s.type === "signoff") {
    setChip(s.type==="signoff" ? "AWAITING DCS SIGN-OFF" : "AWAITING FIELD ACTION", "wait");
    log(s.type==="signoff"?"sys":"field", `⏳ #${s.n} waiting: ${short(s.text)}`);
    return; // resumes on gate click
  }
  // RAMP — animate tag toward target
  if (s.type === "ramp") {
    setChip("RAMPING", "run");
    log("sys", `C${s.ctrlId}·${s.grp} #${s.n}: ramp ${s.tag} ${s.from}→${s.target} @ ${s.rate} ${s.rateUnit}`);
    const pg = $("#pg"+idx), lv = $("#lv"+idx);
    const from = s.from, to = s.target;
    const stepDur = 1400 / speed;      // wall time for the ramp
    const t0 = Date.now();
    timer = setInterval(() => {         // setInterval fires even when tab is hidden
      const p = Math.min(1, (Date.now() - t0)/stepDur);
      const val = from + (to-from)*p;
      tele[s.tag] = val;
      if (pg) pg.style.width = (100*p)+"%";
      if (lv) lv.textContent = `${s.tag} = ${val.toFixed(2)} ${uOf(s)} → target ${to}`;
      renderTele();
      if (p >= 1 || !running) { clearInterval(timer);
        if (running) { simMin += rampMinutes(s); s._done = true; advance(); } }
    }, 45);
    return;
  }
  // HOLD — timer countdown (time-compressed)
  if (s.type === "hold") {
    holding = false; setChip("HOLD TIMER", "wait");
    log("sys", `#${s.n}: ${s.holdMin}-min system hold timer started`);
    const pg = $("#pg"+idx), lv = $("#lv"+idx);
    const dur = 1600 / speed; const t0 = Date.now();
    timer = setInterval(() => {
      const p = Math.min(1, (Date.now()-t0)/dur);
      const remain = Math.ceil(s.holdMin*(1-p));
      if (pg) pg.style.width = (100*p)+"%";
      if (lv) lv.textContent = `Hold timer: ${remain} min remaining…`;
      if (p>=1 || !running) { clearInterval(timer);
        if (running) { simMin += s.holdMin; s._done = true; advance(); } }
    }, 45);
    return;
  }
  // BRANCH — evaluate PV vs criterion
  if (s.type === "branch") {
    setChip("LOGIC CHECK", "run");
    const val = tele[s.tag] != null ? tele[s.tag] : NaN;
    const ok = evalCond(val, s.cond);
    const lv = $("#lv"+idx);
    if (lv) lv.textContent = `Check ${s.tag}=${(+val).toFixed(2)} ${s.cond}  →  ${ok?"PASS":"FAIL → HOLD"}`;
    if (ok) {
      log("ok", `#${s.n}: ${s.tag} ${s.cond} satisfied — proceed`);
      wait(tickMs(), () => { s._done = true; advance(); });
    } else {
      holding = true; setChip("ON HOLD", "hold");
      log("hold", `<b>#${s.n}: SEQUENCE ON HOLD</b> — ${s.tag}=${(+val).toFixed(2)} fails ${s.cond}. Attend & restart (STOP→RESET→START SEQ).`);
      renderSteps();
      // show a resume affordance by reusing the gate mechanism
      const host = $("#st"+idx);
      if (host && !host.querySelector(".gate")) {
        const g = document.createElement("div"); g.className = "gate"; g.style.gridColumn="2/4";
        g.innerHTML = `<button class="ok" data-resume="${idx}">✓ Leak-check done — RESET &amp; resume</button>`;
        host.appendChild(g);
      }
    }
    return;
  }
}

// helpers
function uOf(s){ return (s.rateUnit||"").split("/")[0]; }
function rampMinutes(s){ if(!s.rate) return 1; const span=Math.abs(s.target-s.from);
  const per=s.rateUnit||""; if(per.includes("/hr")) return span/s.rate*60; if(per.includes("/min")) return span/s.rate; return 2; }
function evalCond(v, c){ const m=c.match(/([<>]=?)\s*([\d.]+)/); if(!m) return true; const op=m[1],x=parseFloat(m[2]);
  return op===">"?v>x:op===">="?v>=x:op==="<"?v<x:op==="<="?v<=x:v===x; }
function short(t){ return t.length>70 ? t.slice(0,68)+"…" : t; }
function wait(ms, fn){ timer = setTimeout(fn, ms); }

// gate / resume clicks
document.addEventListener("click", e => {
  const g = e.target.closest("[data-gate]"), r = e.target.closest("[data-resume]");
  if (g) {
    const i = +g.dataset.gate; const s = flat[i]; if (i!==idx) return;
    s._acted = true; s._done = true;
    log(s.type==="signoff"?"ok":"field", `${s.type==="signoff"?"DCS sign-off":"Field confirmed"} #${s.n}: ${short(s.text)}`);
    advance();
  }
  if (r) {
    const i = +r.dataset.resume; if (i!==idx) return;
    holding = false; const s = flat[i];
    // on resume, nudge the tag to just pass (operator attended the leak)
    if (s.tag) tele[s.tag] = parseFloat((s.cond.match(/[\d.]+/)||[0])[0]) + (s.cond.includes("<") ? -0.3 : 0.3);
    log("ok", `#${s.n}: attended & reset — resuming`);
    s._done = true; renderTele(); advance();
  }
});

// ---- controls ----
function start() {
  if (running) return;
  if (idx >= flat.length-1 || idx < 0) { load(); }
  running = true; setChip("RUNNING", "run");
  const what = mode==='startup' ? 'START-UP' : `SOP/${emScenario().code} — ${emScenario().title.toUpperCase()}`;
  log("sys", `<b>${what} initiated</b> — ${LOUP.unit}`);
  if (idx < 0) advance(); else runStep(flat[idx]);
}
function reset() { running=false; if(timer){clearTimeout(timer);clearInterval(timer);} load(); }

// populate the emergency scenario picker once
function buildEmPicker() {
  const sel = $("#emSelect"); if (!sel) return;
  sel.innerHTML = Object.entries(LOUP.EMERGENCIES).map(([k,e]) =>
    `<option value="${k}">SOP/${e.code} — ${e.title}</option>`).join("");
  sel.value = emKey;
}
function syncModeUI() {
  const wrap = $("#emWrap"); if (wrap) wrap.style.display = mode==="emergency" ? "" : "none";
}

$("#startBtn").addEventListener("click", start);
$("#resetBtn").addEventListener("click", reset);
$("#speed").addEventListener("change", e => speed = +e.target.value);
$("#emSelect") && $("#emSelect").addEventListener("change", e => { emKey = e.target.value; reset(); });
$("#modeSeg").addEventListener("click", e => { const b=e.target.closest("[data-m]"); if(!b) return;
  $("#modeSeg").querySelectorAll("button").forEach(x=>x.classList.remove("on")); b.classList.add("on");
  mode=b.dataset.m; syncModeUI(); reset(); });
$("#viewSeg").addEventListener("click", e => { const b=e.target.closest("[data-v]"); if(!b) return;
  $("#viewSeg").querySelectorAll("button").forEach(x=>x.classList.remove("on")); b.classList.add("on");
  view=b.dataset.v; $("#liveView").style.display = view==="live"?"":"none"; $("#tableView").style.display = view==="table"?"":"none"; });

// boot
buildEmPicker(); syncModeUI(); load();
})();
