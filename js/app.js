(function () {
  "use strict";

  var stations = window.DEKA_STATIONS;
  var storage = window.DekaStorage;
  var exporter = window.DekaExport;
  var key = "deka-fit-parejas-v1";
  var activeKey = "deka-fit-parejas-active-v1";
  var setupKey = "deka-fit-parejas-setup-v1";
  var actionLockedUntil = 0;

  var state = {
    active: false,
    paused: false,
    current: 0,
    startAt: 0,
    stationStartAt: 0,
    stationOffset: 0,
    elapsedBefore: 0,
    splits: [],
    assignments: [],
    editIndex: -1,
    tickId: 0,
    previous: null,
    progress: [],
    photos: { a: "", b: "" }
  };

  var defaultPhotos = { a: "img/person-a.jpg", b: "img/person-b.jpg" };

  var $ = function (id) { return document.getElementById(id); };
  function isWorkoutPage() { return document.body.getAttribute("data-page") === "workout"; }

  function bind(el, fn) {
    if (!el) return;
    var last = 0;
    var run = function (event) {
      last = Date.now();
      fn(event || window.event);
    };
    el.addEventListener("touchend", run, false);
    el.addEventListener("click", function (event) {
      if (Date.now() - last < 650) return;
      fn(event || window.event);
    }, false);
  }

  function escapeHtml(text) {
    return String(text || "").replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[ch];
    });
  }

  function pad2(value) {
    value = String(value);
    return value.length < 2 ? "0" + value : value;
  }

  function formatDate(value) {
    var d = new Date(value || "");
    if (isNaN(d.getTime())) return "Sin fecha";
    return pad2(d.getDate()) + "/" + pad2(d.getMonth() + 1) + "/" + d.getFullYear();
  }

  function formatTime(ms) {
    ms = Math.max(0, Math.round((Number(ms) || 0) / 100) * 100);
    var min = Math.floor(ms / 60000);
    var sec = Math.floor((ms % 60000) / 1000);
    var dec = Math.floor((ms % 1000) / 100);
    return pad2(min) + ":" + pad2(sec) + "." + dec;
  }

  function trim(value) { return String(value || "").replace(/^\s+|\s+$/g, ""); }
  function personName(id) { return trim(id === "a" ? $("nameA").value : $("nameB").value) || (id === "a" ? "Persona 1" : "Persona 2"); }
  function shortName(id) { var name = personName(id); return name.length > 10 ? name.slice(0, 9) + "." : name; }
  function assignmentPeople(value) { return value === "both" ? ["a", "b"] : (value === "a" || value === "b" ? [value] : []); }
  function assignmentLabel(value) { return value === "both" ? shortName("a") + " + " + shortName("b") : value === "a" ? shortName("a") : value === "b" ? shortName("b") : "Sin asignar"; }

  function face(id) {
    var cls = id === "b" ? "face b" : "face";
    var photo = state.photos[id] || defaultPhotos[id];
    return '<span class="' + cls + '"><img src="' + photo + '" alt=""></span>';
  }

  function assigneeHtml(value) {
    var people = assignmentPeople(value);
    var html = "";
    var i;
    for (i = 0; i < people.length; i += 1) html += face(people[i]);
    return '<span class="assignee">' + html + escapeHtml(assignmentLabel(value)) + '</span>';
  }

  function setStatus(text, cls) { $("status").className = "status" + (cls ? " " + cls : ""); $("status").textContent = text; }
  function toast(text) { var el = $("toast"); el.textContent = text; el.className = "toast show"; clearTimeout(toast.t); toast.t = setTimeout(function () { el.className = "toast"; }, 2100); }

  function isWorkoutActionLocked() {
    return Date.now() < actionLockedUntil;
  }

  function syncWorkoutControlsLock() {
    var buttons = document.querySelectorAll("#workoutScreen .workout-actions button, #workoutScreen .adjust-actions button, #currentAssignControls button");
    var i, btn;
    if (!isWorkoutActionLocked()) return;
    for (i = 0; i < buttons.length; i += 1) {
      btn = buttons[i];
      if (btn.disabled) continue;
      btn.disabled = true;
      btn.setAttribute("data-touch-lock", "1");
    }
  }

  function lockWorkoutControls(ms) {
    actionLockedUntil = Date.now() + ms;
    syncWorkoutControlsLock();
    setTimeout(function () {
      var locked = document.querySelectorAll('[data-touch-lock="1"]');
      var j;
      if (Date.now() < actionLockedUntil) return;
      for (j = 0; j < locked.length; j += 1) {
        locked[j].disabled = false;
        locked[j].removeAttribute("data-touch-lock");
      }
    }, ms);
  }

  function takeWorkoutActionLock(ms) {
    if (isWorkoutActionLocked()) return false;
    lockWorkoutControls(ms || 700);
    return true;
  }

  function saveActiveSession() {
    if (!state.active) return;
    try {
      localStorage.setItem(activeKey, JSON.stringify({
        savedAt: Date.now(),
        current: state.current,
        paused: state.paused,
        stationStartAt: state.stationStartAt,
        stationOffset: stationElapsed(),
        elapsedBefore: state.elapsedBefore,
        splits: state.splits,
        assignments: state.assignments,
        names: { a: $("nameA").value || "", b: $("nameB").value || "" },
        photos: state.photos
      }));
    } catch (e) {}
  }

  function clearActiveSession() {
    try { localStorage.removeItem(activeKey); } catch (e) {}
    if ($("resumeBtn")) $("resumeBtn").hidden = true;
  }

  function saveSetup() {
    try {
      localStorage.setItem(setupKey, JSON.stringify({
        names: { a: $("nameA") ? $("nameA").value || "" : "", b: $("nameB") ? $("nameB").value || "" : "" },
        photos: state.photos,
        assignments: state.assignments
      }));
    } catch (e) {}
  }

  function loadSetup() {
    try {
      var raw = localStorage.getItem(setupKey);
      var saved = raw ? JSON.parse(raw) : null;
      if (!saved) return;
      if (saved.names) {
        if ($("nameA")) $("nameA").value = saved.names.a || "";
        if ($("nameB")) $("nameB").value = saved.names.b || "";
      }
      if (saved.photos) state.photos = saved.photos;
      if (saved.assignments && saved.assignments.length === stations.length) state.assignments = saved.assignments;
    } catch (e) {}
  }

  function getActiveSession() {
    try {
      var raw = localStorage.getItem(activeKey);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function showResumeIfNeeded() {
    var saved = getActiveSession();
    if ($("resumeBtn")) $("resumeBtn").hidden = !(saved && saved.assignments && saved.assignments.length);
  }

  function applyTheme(theme) {
    document.body.className = theme === "light" ? "theme-light" : "";
    $("themeToggle").textContent = theme === "light" ? "Oscuro" : "Claro";
    try { localStorage.setItem("deka-fit-theme", theme); } catch (e) {}
  }

  function loadTheme() {
    var theme = "";
    try { theme = localStorage.getItem("deka-fit-theme") || ""; } catch (e) {}
    applyTheme(theme === "light" ? "light" : "dark");
  }

  function showScreen(id) {
    var screens = document.querySelectorAll(".screen");
    var i;
    for (i = 0; i < screens.length; i += 1) screens[i].className = screens[i].className.replace(/\s?active/g, "");
    $(id).className += " active";
    window.scrollTo(0, 0);
  }

  function initAssignments() {
    var i;
    state.assignments = [];
    for (i = 0; i < stations.length; i += 1) state.assignments[i] = stations[i].locked ? "both" : "";
  }

  function enforceLockedAssignments() {
    var i;
    for (i = 0; i < stations.length; i += 1) {
      if (stations[i].locked) state.assignments[i] = "both";
    }
  }

  function renderPeople() {
    $("avatarA").innerHTML = '<img src="' + (state.photos.a || defaultPhotos.a) + '" alt="">';
    $("avatarB").innerHTML = '<img src="' + (state.photos.b || defaultPhotos.b) + '" alt="">';
    $("cardA").className = "athlete-card";
    $("cardB").className = "athlete-card";
  }

  function assignButton(index, value, label) {
    var active = state.assignments[index] === value ? " active" : "";
    return '<button class="assign-btn' + active + '" type="button" data-assign="' + index + '" data-value="' + value + '">' + escapeHtml(label) + '</button>';
  }

  function currentAssignButton(value, label) {
    var active = state.assignments[state.current] === value ? " active" : "";
    return '<button class="assign-btn' + active + '" type="button" data-current-assign="' + value + '">' + escapeHtml(label) + '</button>';
  }

  function renderCurrentAssignControls(st) {
    var html = '<p class="assign-title">Persona en esta prueba</p>';
    if (st.locked) {
      html += '<div class="current-assign-row"><button class="assign-btn active" disabled type="button">Ambos obligatorio</button></div>';
    } else {
      html += '<div class="current-assign-row">' + currentAssignButton("a", shortName("a")) + currentAssignButton("b", shortName("b")) + currentAssignButton("both", "Ambos") + currentAssignButton("", "Sin asignar") + '</div>';
    }
    $("currentAssignControls").innerHTML = html;
  }

  function renderRoute() {
    var html = "";
    var i, st, assign;
    for (i = 0; i < stations.length; i += 1) {
      st = stations[i];
      assign = state.assignments[i];
      html += '<article class="station-card"><div class="station-icon station-art-thumb art-' + escapeHtml(st.kind.toLowerCase()) + '"><span>' + escapeHtml(st.kind) + '</span></div><div><div class="station-num">' + (i + 1) + '/' + stations.length + '</div><h3>' + escapeHtml(st.title) + '</h3><p class="muted">' + escapeHtml(st.detail) + '</p><span class="badge">' + escapeHtml(st.standard) + '</span><br>' + assigneeHtml(assign) + '</div><div class="assign-row">';
      if (st.locked) html += '<button class="assign-btn active" disabled type="button">Ambos</button>';
      else html += assignButton(i, "a", shortName("a")) + assignButton(i, "b", shortName("b")) + assignButton(i, "both", "Ambos") + assignButton(i, "", "-");
      html += '</div></article>';
    }
    $("routeList").innerHTML = html;
  }

  function renderStation() {
    var st = stations[state.current];
    $("stationName").textContent = st.title;
    $("stationDetail").textContent = st.detail;
    $("stationStandard").textContent = st.standard;
    $("stationCount").textContent = (state.current + 1) + "/" + stations.length;
    $("currentAssignee").innerHTML = assigneeHtml(state.assignments[state.current]);
    renderCurrentAssignControls(st);
    $("stationArt").innerHTML = '<div class="stage-visual"><div class="stage-picture art-' + escapeHtml(st.kind.toLowerCase()) + '"><span>' + escapeHtml(st.kind) + '</span></div><strong>' + escapeHtml(st.title) + '</strong><p class="muted">' + escapeHtml(st.detail) + '</p></div>';
    renderSplits();
  }

  function stationElapsed() { return state.active && !state.paused ? state.stationOffset + Date.now() - state.stationStartAt : state.stationOffset; }
  function totalElapsed() { return state.elapsedBefore + stationElapsed(); }

  function tick() {
    if (!state.active) return;
    $("stationTimer").textContent = formatTime(stationElapsed());
    $("totalTimer").textContent = formatTime(totalElapsed());
    $("alarm").style.setProperty("--p", ((totalElapsed() / 1000 * 18) % 360) + "deg");
    renderSplits();
    state.tickId = setTimeout(tick, 150);
  }

  function renderSplits() {
    var html = "";
    var i, ms, cls;
    for (i = 0; i < stations.length; i += 1) {
      ms = state.splits[i];
      cls = i === state.current && state.active ? " current" : "";
      html += '<div class="split-row' + cls + '"><span class="idx">' + pad2(i + 1) + '</span><span class="split-name">' + escapeHtml(stations[i].title) + '<small>' + escapeHtml(assignmentLabel(state.assignments[i])) + '</small></span><span class="split-time">' + (ms ? formatTime(ms) : (i === state.current && state.active ? formatTime(stationElapsed()) : "--:--.-")) + '</span></div>';
    }
    $("splitList").innerHTML = html;
  }

  function start() { enforceLockedAssignments(); saveSetup(); clearActiveSession(); state.active = true; state.paused = false; state.current = 0; state.splits = []; state.elapsedBefore = 0; state.stationOffset = 0; state.startAt = Date.now(); state.stationStartAt = Date.now(); actionLockedUntil = 0; setStatus("En marcha", "running"); renderStation(); clearTimeout(state.tickId); saveActiveSession(); if (!isWorkoutPage()) { window.location.href = "workout.html"; return; } showScreen("workoutScreen"); tick(); }
  function resumeSaved() { var saved = getActiveSession(); if (!saved) return; state.active = true; state.paused = !!saved.paused; state.current = Number(saved.current) || 0; state.splits = saved.splits || []; state.assignments = saved.assignments || state.assignments; enforceLockedAssignments(); state.photos = saved.photos || state.photos; state.elapsedBefore = Number(saved.elapsedBefore) || 0; state.stationOffset = Number(saved.stationOffset) || 0; state.stationStartAt = state.paused ? Date.now() : Date.now() - state.stationOffset; if (saved.names) { $("nameA").value = saved.names.a || ""; $("nameB").value = saved.names.b || ""; } renderPeople(); renderRoute(); showScreen("workoutScreen"); $("alarm").className = state.paused ? "alarm paused" : "alarm"; $("pauseBtn").className = state.paused ? "btn paused-btn" : "btn"; $("pauseBtn").textContent = state.paused ? "Reanudar" : "Pausar"; setStatus(state.paused ? "Pausado" : "En marcha", state.paused ? "paused" : "running"); renderStation(); clearTimeout(state.tickId); if (!state.paused) tick(); }
  function next() {
    if (!state.active) return;
    if (!takeWorkoutActionLock(850)) return;
    var ms = stationElapsed();
    state.splits[state.current] = ms;
    state.elapsedBefore += ms;
    if (state.current >= stations.length - 1) { finish(); return; }
    state.current += 1;
    state.stationOffset = 0;
    state.stationStartAt = Date.now();
    state.paused = false;
    $("alarm").className = "alarm";
    $("pauseBtn").className = "btn";
    $("pauseBtn").textContent = "Pausar";
    renderStation();
    syncWorkoutControlsLock();
    saveActiveSession();
    tick();
  }
  function previous() { if (!state.active || state.current === 0) return; if (!takeWorkoutActionLock(700)) return; state.current -= 1; state.elapsedBefore -= state.splits[state.current] || 0; if (state.elapsedBefore < 0) state.elapsedBefore = 0; state.stationOffset = state.splits[state.current] || 0; state.splits.length = state.current; state.paused = true; clearTimeout(state.tickId); $("alarm").className = "alarm paused"; $("pauseBtn").className = "btn paused-btn"; $("pauseBtn").textContent = "Reanudar"; renderStation(); syncWorkoutControlsLock(); setStatus("Pausado", "paused"); saveActiveSession(); }
  function togglePause() { if (!state.active) return; if (!takeWorkoutActionLock(650)) return; if (state.paused) { state.paused = false; state.stationStartAt = Date.now(); $("alarm").className = "alarm"; $("pauseBtn").className = "btn"; $("pauseBtn").textContent = "Pausar"; setStatus("En marcha", "running"); saveActiveSession(); tick(); } else { state.stationOffset = stationElapsed(); state.paused = true; clearTimeout(state.tickId); $("alarm").className = "alarm paused"; $("pauseBtn").className = "btn paused-btn"; $("pauseBtn").textContent = "Reanudar"; setStatus("Pausado", "paused"); saveActiveSession(); } }
  function reset() {
    if (isWorkoutPage() && isWorkoutActionLocked()) return;
    if (isWorkoutPage()) lockWorkoutControls(700);
    if (state.active && !window.confirm("¿Reiniciar la prueba? Se conservarán nombres, fotos y asignaciones.")) return;
    saveSetup();
    state.active = false;
    state.paused = false;
    clearTimeout(state.tickId);
    clearActiveSession();
    setStatus("", "");
    if (isWorkoutPage()) { window.location.href = "index.html"; return; }
    showScreen("setupScreen");
  }

  function recalcElapsed() { var total = 0, i; for (i = 0; i < state.current; i += 1) total += state.splits[i] || 0; state.elapsedBefore = total; }
  function openEdit(index) { if (isWorkoutPage() && !takeWorkoutActionLock(650)) return; var ms = index === state.current && state.active && !state.splits[index] ? stationElapsed() : state.splits[index]; if (ms === undefined || ms === null) ms = 0; state.editIndex = index; $("editTitle").textContent = "Editar: " + stations[index].title; $("editMin").value = Math.floor(ms / 60000); $("editSec").value = Math.floor((ms % 60000) / 1000); $("editDec").value = Math.floor((ms % 1000) / 100); $("editModal").className = "modal-back active"; }
  function closeEdit() { $("editModal").className = "modal-back"; state.editIndex = -1; }
  function saveEdit() { var ms = (Number($("editMin").value) || 0) * 60000 + (Number($("editSec").value) || 0) * 1000 + (Number($("editDec").value) || 0) * 100; var index = state.editIndex; if (index < 0) return; if (index === state.current && state.active && !state.splits[index]) { state.stationOffset = ms; state.stationStartAt = Date.now(); } else { state.splits[index] = ms; recalcElapsed(); } closeEdit(); if (state.active) { renderStation(); saveActiveSession(); } else renderResults(); toast("Tiempo corregido"); }
  function adjust(seconds) { if (!state.active) return; if (!takeWorkoutActionLock(450)) return; state.stationOffset = Math.max(0, stationElapsed() + seconds * 1000); state.stationStartAt = Date.now(); tick(); }

  function buildSession() { var splits = [], i; for (i = 0; i < stations.length; i += 1) splits.push({ title: stations[i].title, detail: stations[i].detail, standard: stations[i].standard, ms: Math.round((state.splits[i] || 0) / 100) * 100 }); return { app: "deka-fit-parejas", version: 3, createdAt: new Date().toISOString(), names: { a: personName("a"), b: personName("b") }, photos: { a: state.photos.a || "", b: state.photos.b || "" }, assignments: state.assignments.slice(0), splits: splits }; }
  function totalOf(session) { var total = 0, i; for (i = 0; i < session.splits.length; i += 1) total += Number(session.splits[i].ms) || 0; return total; }
  function finish() { state.active = false; clearTimeout(state.tickId); clearActiveSession(); saveSetup(); setStatus("Completado", ""); storage.saveLast(buildSession()); renderResults(); showScreen("resultsScreen"); toast("Sesion completada"); }

  function renderResults() { var session = buildSession(); var total = totalOf(session); var previousTotal = state.previous ? totalOf(state.previous) : null; $("resultNames").textContent = session.names.a + " + " + session.names.b; $("resultTotal").textContent = formatTime(total); $("resultDelta").className = "muted"; $("resultDelta").textContent = previousTotal === null ? "Carga un intento anterior para comparar." : (total < previousTotal ? "Mejora total: " + formatTime(previousTotal - total) : "Empeora total: +" + formatTime(total - previousTotal)); if (previousTotal !== null) $("resultDelta").className = total <= previousTotal ? "delta-good" : "delta-bad"; renderResultSplits(session); renderRhythm(session); renderComparison(session); renderEffort(session); renderChart(session); }
  function renderResultSplits(session) { var html = "", i, split, prev, cls; for (i = 0; i < session.splits.length; i += 1) { split = session.splits[i]; prev = state.previous && state.previous.splits && state.previous.splits[i] ? Number(state.previous.splits[i].ms) || 0 : null; cls = prev === null ? "" : (split.ms < prev ? " delta-good" : split.ms > prev ? " delta-bad" : ""); html += '<div class="result-row' + cls + '"><span class="idx">' + pad2(i + 1) + '</span><span class="split-name">' + escapeHtml(split.title) + '<small>' + escapeHtml(assignmentLabel(session.assignments[i])) + '</small></span><span class="result-time">' + formatTime(split.ms) + '</span></div>'; } $("resultSplits").innerHTML = html; }
  function renderEffort(session) { var a = 0, b = 0, i, ms, p; for (i = 0; i < session.splits.length; i += 1) { ms = Number(session.splits[i].ms) || 0; p = assignmentPeople(session.assignments[i]); if (p.length === 2) { a += ms / 2; b += ms / 2; } else if (p[0] === "a") a += ms; else if (p[0] === "b") b += ms; } var total = Math.max(a + b, 1); $("effortBox").innerHTML = chartRow("P1", personName("a"), a, a / total * 100) + chartRow("P2", personName("b"), b, b / total * 100); }
  function chartRow(idx, name, ms, width) { return '<div class="chart-row"><span class="idx">' + idx + '</span><span class="chart-name">' + escapeHtml(name) + '</span><span class="chart-time">' + formatTime(ms) + '</span><span class="bar"><span class="fill" style="--w:' + width + '%"></span></span></div>'; }
  function renderRhythm(session) {
    var max = 0, i, ms, points = "", area = "", labels = "", legend = "", scale = "", x, y, w = 320, h = 150, pad = 24, kind, label, tickMs, tickY;
    for (i = 0; i < session.splits.length; i += 1) { ms = Number(session.splits[i].ms) || 0; if (ms > max) max = ms; }
    if (!max) { $("rhythmBox").innerHTML = '<div class="rhythm-empty">Los tiempos apareceran al finalizar.</div>'; return; }
    for (i = 0; i < 3; i += 1) {
      tickMs = max * (1 - i / 2);
      tickY = pad + (h - pad * 2) * (i / 2);
      scale += '<text class="scale-label" x="4" y="' + (tickY + 4).toFixed(1) + '">' + formatTime(tickMs) + '</text>';
    }
    for (i = 0; i < session.splits.length; i += 1) {
      ms = Number(session.splits[i].ms) || 0;
      x = pad + (w - pad * 2) * (i / Math.max(session.splits.length - 1, 1));
      y = pad + (h - pad * 2) * (1 - ms / max);
      points += (i ? " " : "") + x.toFixed(1) + "," + y.toFixed(1);
      area += '<circle class="dot" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3"><title>' + pad2(i + 1) + " " + escapeHtml(session.splits[i].title) + " - " + formatTime(ms) + '</title></circle>';
      kind = stations[i] ? stations[i].kind : "";
      label = kind === "SACO" ? "SAC" : kind === "REMO" ? "REM" : kind === "CORE" ? "ABS" : kind === "GRIP" ? "GRI" : kind === "BIKE" ? "BIK" : kind === "BALL" ? "BAL" : kind === "PUSH" ? "PUS" : kind === "20" ? "BUR" : kind;
      if (kind && kind !== "RUN") {
        labels += '<circle class="event-dot" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="6"></circle><text class="event-label" x="' + x.toFixed(1) + '" y="' + (y + 3).toFixed(1) + '" text-anchor="middle">' + pad2(i + 1) + '</text>';
        legend += '<span><strong>' + pad2(i + 1) + '</strong> ' + escapeHtml(label) + '</span>';
      }
    }
    $("rhythmBox").innerHTML = '<svg viewBox="0 0 320 150" role="img" aria-label="Grafica de ritmo por prueba"><line class="grid-line" x1="24" y1="24" x2="302" y2="24"></line><line class="grid-line" x1="24" y1="75" x2="302" y2="75"></line><line class="grid-line" x1="24" y1="126" x2="302" y2="126"></line>' + scale + '<polygon class="area" points="24,126 ' + points + ' 302,126"></polygon><polyline class="line" points="' + points + '"></polyline>' + area + labels + '</svg><div class="rhythm-legend">' + legend + '</div>';
  }
  function renderChart(session) { var total = Math.max(totalOf(session), 1), html = "", i, ms, percent, width; for (i = 0; i < session.splits.length; i += 1) { ms = Number(session.splits[i].ms) || 0; percent = Math.round(ms / total * 100); width = ms ? Math.max(1, ms / total * 100) : 0; html += '<div class="chart-row"><span class="idx">' + pad2(i + 1) + '</span><span class="chart-name">' + escapeHtml(session.splits[i].title) + '<small>' + escapeHtml(assignmentLabel(session.assignments[i])) + '</small></span><span class="chart-time">' + formatTime(ms) + ' ' + percent + '%</span><span class="bar"><span class="fill" style="--w:' + width + '%"></span></span></div>'; } $("chartBox").innerHTML = html; }

  function renderComparison(session) {
    var box = $("compareBox"), html = "", i, now, prev, diff, cls, label, max;
    if (!box) return;
    if (!state.previous || !state.previous.splits) { box.innerHTML = '<p class="muted compare-empty">Carga un intento anterior para ver en que pruebas mejoraste o empeoraste.</p>'; return; }
    max = Math.max(totalOf(session), totalOf(state.previous), 1);
    html += renderCompareGraph(session, state.previous);
    html += compareRow("TOT", "Total", totalOf(session), totalOf(state.previous), max);
    for (i = 0; i < session.splits.length; i += 1) {
      now = Number(session.splits[i].ms) || 0;
      prev = state.previous.splits[i] ? Number(state.previous.splits[i].ms) || 0 : 0;
      html += compareRow(pad2(i + 1), session.splits[i].title, now, prev, Math.max(now, prev, 1));
    }
    box.innerHTML = html;
  }

  function renderCompareGraph(session, previous) {
    var max = 0, i, now, prev, x, yNow, yPrev, w = 320, h = 150, pad = 24, nowPts = "", prevPts = "", areas = "", ticks = "", tickY, tickMs, x2, yNow2, yPrev2, now2, prev2, color;
    for (i = 0; i < session.splits.length; i += 1) {
      now = Number(session.splits[i].ms) || 0;
      prev = previous.splits[i] ? Number(previous.splits[i].ms) || 0 : 0;
      if (now > max) max = now;
      if (prev > max) max = prev;
    }
    max = Math.max(max, 1);
    for (i = 0; i < 3; i += 1) {
      tickMs = max * (1 - i / 2);
      tickY = pad + (h - pad * 2) * (i / 2);
      ticks += '<text class="scale-label" x="4" y="' + (tickY + 4).toFixed(1) + '">' + formatTime(tickMs) + '</text>';
    }
    for (i = 0; i < session.splits.length; i += 1) {
      now = Number(session.splits[i].ms) || 0;
      prev = previous.splits[i] ? Number(previous.splits[i].ms) || 0 : 0;
      x = pad + (w - pad * 2) * (i / Math.max(session.splits.length - 1, 1));
      yNow = pad + (h - pad * 2) * (1 - now / max);
      yPrev = pad + (h - pad * 2) * (1 - prev / max);
      nowPts += (i ? " " : "") + x.toFixed(1) + "," + yNow.toFixed(1);
      prevPts += (i ? " " : "") + x.toFixed(1) + "," + yPrev.toFixed(1);
      if (i < session.splits.length - 1) {
        now2 = Number(session.splits[i + 1].ms) || 0;
        prev2 = previous.splits[i + 1] ? Number(previous.splits[i + 1].ms) || 0 : 0;
        x2 = pad + (w - pad * 2) * ((i + 1) / Math.max(session.splits.length - 1, 1));
        yNow2 = pad + (h - pad * 2) * (1 - now2 / max);
        yPrev2 = pad + (h - pad * 2) * (1 - prev2 / max);
        color = now + now2 <= prev + prev2 ? "good-area" : "bad-area";
        areas += '<polygon class="' + color + '" points="' + x.toFixed(1) + ',' + yPrev.toFixed(1) + ' ' + x2.toFixed(1) + ',' + yPrev2.toFixed(1) + ' ' + x2.toFixed(1) + ',' + yNow2.toFixed(1) + ' ' + x.toFixed(1) + ',' + yNow.toFixed(1) + '"></polygon>';
      }
    }
    return '<div class="compare-graph"><svg viewBox="0 0 320 150" role="img" aria-label="Grafica comparativa"><line class="grid-line" x1="24" y1="24" x2="302" y2="24"></line><line class="grid-line" x1="24" y1="75" x2="302" y2="75"></line><line class="grid-line" x1="24" y1="126" x2="302" y2="126"></line>' + ticks + areas + '<polyline class="prev-line" points="' + prevPts + '"></polyline><polyline class="now-line" points="' + nowPts + '"></polyline></svg><div class="compare-legend"><span><i class="prev-key"></i>Anterior</span><span><i class="now-key"></i>Actual</span><span><i class="good-key"></i>Mejora</span><span><i class="bad-key"></i>Empeora</span></div></div>';
  }

  function compareRow(idx, title, now, prev, max) {
    var diff = now - prev;
    var cls = diff <= 0 ? "delta-good" : "delta-bad";
    var label = diff <= 0 ? "-" + formatTime(Math.abs(diff)) : "+" + formatTime(diff);
    return '<div class="compare-row ' + cls + '"><span class="idx">' + idx + '</span><span class="compare-name">' + escapeHtml(title) + '<small>Anterior ' + formatTime(prev) + ' · Actual ' + formatTime(now) + '</small></span><strong>' + label + '</strong><span class="compare-bars"><i class="prev" style="--w:' + (prev / max * 100) + '%"></i><i class="now" style="--w:' + (now / max * 100) + '%"></i></span></div>';
  }

  function renderProgress() {
    var boxes = document.querySelectorAll(".progress-panel");
    var b;
    if (!boxes.length) return;
    if (!state.progress.length) { for (b = 0; b < boxes.length; b += 1) boxes[b].innerHTML = ""; return; }
    var list = state.progress.slice(0).sort(function (a, b) {
      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    });
    var max = 0, min = Infinity, i, total, x, y, points = "", dots = "", rows = "", first, last, diff, cls, label, range;
    for (i = 0; i < list.length; i += 1) {
      total = totalOf(list[i]);
      if (total > max) max = total;
      if (total < min) min = total;
    }
    range = Math.max(max - min, 1);
    for (i = 0; i < list.length; i += 1) {
      total = totalOf(list[i]);
      x = 18 + 284 * (i / Math.max(list.length - 1, 1));
      y = 18 + 104 * ((total - min) / range);
      points += (i ? " " : "") + x.toFixed(1) + "," + y.toFixed(1);
      dots += '<circle class="dot" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="4"><title>' + escapeHtml(formatDate(list[i].createdAt)) + " - " + formatTime(total) + '</title></circle>';
      rows += '<div class="progress-row"><span>' + escapeHtml(formatDate(list[i].createdAt)) + '</span><strong>' + formatTime(total) + '</strong></div>';
    }
    first = totalOf(list[0]);
    last = totalOf(list[list.length - 1]);
    diff = Math.abs(last - first);
    cls = last <= first ? "delta-good" : "delta-bad";
    label = list.length > 1 ? (last <= first ? "Mejora: " : "Empeora: ") + formatTime(diff) : "Un intento cargado";
    var html = '<div class="progress-head"><strong>Progreso guardado</strong><span class="' + cls + '">' + label + '</span></div><div class="progress-chart"><svg viewBox="0 0 320 150" role="img" aria-label="Evolucion del total"><line class="grid-line" x1="18" y1="18" x2="302" y2="18"></line><line class="grid-line" x1="18" y1="70" x2="302" y2="70"></line><line class="grid-line" x1="18" y1="122" x2="302" y2="122"></line><polyline class="line" points="' + points + '"></polyline>' + dots + '</svg></div>' + rows;
    for (b = 0; b < boxes.length; b += 1) boxes[b].innerHTML = html;
  }

  function downloadXml() { exporter.download("deka-fit-" + new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) + ".xml", "application/xml", exporter.toXml(buildSession())); }
  function downloadJson() { exporter.download("deka-fit-" + new Date().toISOString().slice(0, 10) + ".json", "application/json", JSON.stringify(buildSession(), null, 2)); }
  function copySummary() { var session = buildSession(); var text = "Deka Fit Parejas - " + session.names.a + " + " + session.names.b + "\nTotal: " + formatTime(totalOf(session)) + "\n\n"; var i; for (i = 0; i < session.splits.length; i += 1) text += (i + 1) + ". " + session.splits[i].title + ": " + formatTime(session.splits[i].ms) + " - " + assignmentLabel(session.assignments[i]) + "\n"; exporter.copyText(text, function () { toast("Resumen copiado"); }); }
  function downloadPng() { var session = buildSession(); exporter.png(session, totalOf(session), formatTime, assignmentLabel); }
  function downloadComparePng() { var session = buildSession(); if (!state.previous) { toast("Carga un intento anterior"); return; } exporter.pngCompare(session, state.previous, totalOf, formatTime); }
  function loadLast() { var last = storage.loadLast(); if (!last) { toast("No hay sesion guardada"); return; } state.previous = last; toast("Ultima sesion cargada para comparar"); }

  function importPrevious(file) { if (!file) return; var reader = new FileReader(); reader.onload = function () { try { var text = String(reader.result || ""); state.previous = text.replace(/^\s+/, "").charAt(0) === "<" ? exporter.fromXml(text, stations) : JSON.parse(text); if (state.previous.names) { if (!$("nameA").value) $("nameA").value = state.previous.names.a || ""; if (!$("nameB").value) $("nameB").value = state.previous.names.b || ""; } toast("Intento anterior cargado"); renderRoute(); if (getComputedStyle($("resultsScreen")).display !== "none") renderResults(); } catch (e) { toast("No se pudo leer el archivo"); } }; reader.readAsText(file); }
  function importProgress(files) {
    var list = [], left, i;
    if (!files || !files.length) return;
    left = files.length;
    for (i = 0; i < files.length; i += 1) {
      (function (file) {
        var reader = new FileReader();
        reader.onload = function () {
          try {
            var text = String(reader.result || "");
            var session = exporter.fromXml(text, stations);
            list.push(session);
          } catch (e) {}
          left -= 1;
          if (left === 0) {
            if (!list.length) { toast("No se pudieron leer esos intentos"); return; }
            state.progress = list;
            renderProgress();
            toast(list.length + " intentos cargados");
          }
        };
        reader.readAsText(file);
      })(files[i]);
    }
  }
  function readPhoto(id, file) { if (!file) return; var reader = new FileReader(); reader.onload = function () { state.photos[id] = String(reader.result || ""); renderPeople(); renderRoute(); saveSetup(); }; reader.readAsDataURL(file); }

  function handleRouteTap(event) { var node = event.target || event.srcElement; while (node && node !== document && !node.getAttribute("data-assign")) node = node.parentNode; if (!node || node === document) return; var index = Number(node.getAttribute("data-assign")); var value = node.getAttribute("data-value") || ""; if (stations[index].locked) return; state.assignments[index] = value; renderRoute(); saveSetup(); if (state.active) { renderStation(); saveActiveSession(); } }

  function handleCurrentAssignTap(event) {
    var node = event.target || event.srcElement;
    while (node && node !== document && node.getAttribute("data-current-assign") === null) node = node.parentNode;
    if (!node || node === document) return;
    if (!state.active || stations[state.current].locked) return;
    if (!takeWorkoutActionLock(500)) return;
    state.assignments[state.current] = node.getAttribute("data-current-assign") || "";
    renderRoute();
    renderStation();
    syncWorkoutControlsLock();
    saveSetup();
    saveActiveSession();
    toast("Persona actualizada");
  }

  function setupEvents() {
    bind($("themeToggle"), function () { applyTheme(document.body.className === "theme-light" ? "dark" : "light"); });
    bind($("startBtn"), start); bind($("resumeBtn"), resumeSaved); bind($("nextBtn"), next); bind($("prevBtn"), previous); bind($("pauseBtn"), togglePause); bind($("resetBtn"), reset); bind($("newBtn"), reset); bind($("editCurrentBtn"), function () { openEdit(state.current); }); bind($("saveEditBtn"), saveEdit); bind($("cancelEditBtn"), closeEdit); bind($("xmlBtn"), downloadXml); bind($("jsonBtn"), downloadJson); bind($("pngBtn"), downloadPng); bind($("comparePngBtn"), downloadComparePng); bind($("copyBtn"), copySummary); bind($("loadLastBtn"), loadLast);
    $("routeList").addEventListener("click", handleRouteTap, false); $("routeList").addEventListener("touchend", handleRouteTap, false); $("currentAssignControls").addEventListener("click", handleCurrentAssignTap, false); $("currentAssignControls").addEventListener("touchend", handleCurrentAssignTap, false); $("importFile").addEventListener("change", function (e) { importPrevious(e.target.files[0]); }, false); $("resultImportFile").addEventListener("change", function (e) { importPrevious(e.target.files[0]); }, false); $("progressFiles").addEventListener("change", function (e) { importProgress(e.target.files); }, false); $("progressFilesResults").addEventListener("change", function (e) { importProgress(e.target.files); }, false); $("photoA").addEventListener("change", function (e) { readPhoto("a", e.target.files[0]); }, false); $("photoB").addEventListener("change", function (e) { readPhoto("b", e.target.files[0]); }, false); $("nameA").addEventListener("input", function () { renderRoute(); saveSetup(); if (state.active) saveActiveSession(); }, false); $("nameB").addEventListener("input", function () { renderRoute(); saveSetup(); if (state.active) saveActiveSession(); }, false);
    var adjusters = document.querySelectorAll("[data-adjust]"); var i; for (i = 0; i < adjusters.length; i += 1) bind(adjusters[i], function (event) { var target = event.target || event.srcElement; adjust(Number(target.getAttribute("data-adjust")) || 0); });
    window.addEventListener("pagehide", saveActiveSession, false);
    window.addEventListener("beforeunload", saveActiveSession, false);
    document.addEventListener("visibilitychange", function () { if (document.hidden) saveActiveSession(); }, false);
  }

  window.onerror = function () { return false; };
  function boot() {
    var saved = getActiveSession();
    loadTheme();
    initAssignments();
    loadSetup();
    enforceLockedAssignments();
    renderPeople();
    renderRoute();
    setupEvents();
    if (isWorkoutPage()) {
      if (saved) resumeSaved();
      else window.location.href = "index.html";
      return;
    }
    if (saved) window.location.href = "workout.html";
    else showResumeIfNeeded();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, false); else boot();
})();
