// Reports admin. Auth: bearer key in localStorage; a 403 signs out.
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var STORE = "sulphurAdminKey", adminKey = "";
  try { adminKey = localStorage.getItem(STORE) || ""; } catch (e) {}
  var STATUS_LABEL = { new: "New", seen: "Seen", fixed: "Fixed", wontfix: "Won't fix" };
  var filters = { type: "", status: "" }, rows = [], current = null, lastFocus = null;

  function req(path, opts, key) {
    opts = Object.assign({}, opts || {});
    opts.headers = Object.assign({}, opts.headers || {}, { Authorization: "Bearer " + key });
    return fetch("/api/admin/" + path, opts);
  }
  function api(path, opts) {
    return req(path, opts, adminKey).then(function (r) {
      if (r.status === 403) { signOut(); throw new Error("Signed out: the key was rejected."); }
      if (!r.ok) throw new Error("Request failed (HTTP " + r.status + ").");
      return r.json();
    });
  }

  var toastTimer;
  function toast(msg, bad) {
    var t = $("toast"); t.textContent = msg; t.className = "ad-toast show" + (bad ? " bad" : "");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.className = "ad-toast" + (bad ? " bad" : ""); }, 3200);
  }

  function showPanel(on) { $("panel").hidden = !on; $("signin").hidden = on; if (!on) setTimeout(function () { $("key").focus(); }, 0); }
  function signOut() {
    adminKey = "";
    try { localStorage.removeItem(STORE); } catch (e) {}
    closeDrawer(); $("list").innerHTML = ""; rows = [];
    showPanel(false);
  }

  function parseDate(s) { var d = new Date(s); return isNaN(d) ? null : d; }
  function exact(s) { var d = parseDate(s); return d ? d.toLocaleString() : (s || ""); }
  function rel(s) {
    var d = parseDate(s); if (!d) return s || "";
    var sec = Math.round((Date.now() - d.getTime()) / 1000);
    if (sec < 45) return "just now";
    var m = Math.round(sec / 60); if (m < 60) return m + "m ago";
    var h = Math.round(m / 60); if (h < 24) return h + "h ago";
    var dd = Math.round(h / 24); if (dd < 30) return dd + "d ago";
    return d.toLocaleDateString();
  }
  function firstLine(s) { return String(s || "").split(/\r?\n/).filter(Boolean)[0] || ""; }
  function who(r) { return (r.character || "Unknown") + (r.realm ? "-" + r.realm : ""); }

  function renderStats(counts) {
    var t = { total: 0, new: 0, seen: 0, fixed: 0, bug: 0, suggestion: 0 };
    counts.forEach(function (c) {
      t.total += c.n;
      if (t[c.status] != null) t[c.status] += c.n;
      if (t[c.type] != null) t[c.type] += c.n;
    });
    document.querySelectorAll("[data-stat]").forEach(function (el) { el.textContent = t[el.dataset.stat].toLocaleString(); });
    return t.total;
  }

  function skeleton() { $("list").innerHTML = new Array(5).join('<div class="ad-skel"></div>'); }

  var total = 0;
  function renderList() {
    var q = $("q").value.trim().toLowerCase();
    var shown = rows.filter(function (r) {
      return !q || [r.character, r.realm, r.summary].some(function (v) { return v && String(v).toLowerCase().indexOf(q) !== -1; });
    });
    if (!shown.length) {
      var none = total === 0;
      $("list").innerHTML = '<div class="ad-empty"><img src="../sui-mark-96.png" alt="">' +
        "<h3>" + (none ? "No reports yet" : "Nothing matches") + "</h3>" +
        "<p>" + (none ? "Reports sent from the public report page show up here." : "Try a different filter or search.") + "</p>" +
        (none ? '<a class="ad-btn" href="../report.html">Open the report page</a>' : '<button class="ad-btn" type="button" id="clear-f">Clear filters</button>') + "</div>";
      var cf = $("clear-f"); if (cf) cf.onclick = clearFilters;
      return;
    }
    $("list").innerHTML = shown.map(function (r) {
      return '<button type="button" class="ad-row' + (current === r.id ? " is-active" : "") + '" data-id="' + esc(r.id) + '">' +
        '<div class="top"><span class="ad-badge ' + esc(r.type) + '">' + (r.type === "bug" ? "Bug" : "Suggestion") + "</span>" +
        '<span class="meta"><span class="who">' + esc(who(r)) + "</span>" +
        '<span class="dim">v' + esc(r.version) + "</span>" +
        (r.client ? '<span class="dim">' + esc(r.client) + "</span>" : "") +
        '<span class="dim" title="' + esc(exact(r.created_at)) + '">' + esc(rel(r.created_at)) + "</span></span>" +
        '<span class="ad-pill ' + esc(r.status) + '">' + esc(STATUS_LABEL[r.status] || r.status) + "</span></div>" +
        '<div class="summary">' + esc(firstLine(r.summary) || "(no text)") + "</div></button>";
    }).join("");
  }

  function load() {
    var btn = $("reload"); btn.classList.add("spin"); btn.disabled = true;
    if (!rows.length) skeleton();
    var q = new URLSearchParams();
    if (filters.type) q.set("type", filters.type);
    if (filters.status) q.set("status", filters.status);
    if ($("f-version").value) q.set("version", $("f-version").value);
    return api("reports?" + q).then(function (d) {
      total = renderStats(d.counts);
      var vs = $("f-version"), cur = vs.value;
      vs.innerHTML = '<option value="">All versions</option>' + d.versions.map(function (v) { return '<option value="' + esc(v) + '">v' + esc(v) + "</option>"; }).join("");
      vs.value = d.versions.indexOf(cur) !== -1 ? cur : "";
      rows = d.rows; renderList();
    }).catch(function (e) {
      if (!rows.length) $("list").innerHTML = "";
      if (adminKey) toast(e.message, true);
    }).then(function () { btn.classList.remove("spin"); btn.disabled = false; });
  }

  function clearFilters() {
    filters.type = filters.status = ""; $("q").value = ""; $("f-version").value = "";
    document.querySelectorAll(".ad-seg .ad-chip").forEach(function (c) { c.setAttribute("aria-pressed", c.dataset.v === "" ? "true" : "false"); });
    load();
  }

  // Drawer
  function field(label, v) { return v ? "<div><dt>" + label + "</dt><dd>" + esc(v) + "</dd></div>" : ""; }
  function block(label, v) { return v ? '<div class="ad-sect"><h4>' + label + '</h4><p class="ad-text">' + esc(v) + "</p></div>" : ""; }
  function openDrawer() {
    lastFocus = document.activeElement;
    $("scrim").classList.add("open"); $("drawer").classList.add("open"); document.body.style.overflow = "hidden";
    setTimeout(function () { $("d-close").focus(); }, 50);
  }
  function closeDrawer() {
    $("scrim").classList.remove("open"); $("drawer").classList.remove("open"); document.body.style.overflow = "";
    current = null;
    document.querySelectorAll(".ad-row.is-active").forEach(function (r) { r.classList.remove("is-active"); });
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function renderDetail(r) {
    $("d-title").innerHTML = '<span class="ad-badge ' + esc(r.type) + '">' + (r.type === "bug" ? "Bug" : "Suggestion") + "</span> " + esc(who(r));
    var issueTime = r.issue_time ? (parseDate(r.issue_time) ? parseDate(r.issue_time).toLocaleString() : r.issue_time) : "";
    var html = '<dl class="ad-fields">' +
      field("Status", STATUS_LABEL[r.status] || r.status) + field("Received", exact(r.created_at)) +
      field("Character", r.character) + field("Realm", r.realm) +
      field("Version", r.version && "v" + r.version) + field("Client", r.client) +
      field("Issue time", issueTime) + field("Contact", r.contact) + field("Reference", r.id) + "</dl>" +
      block("What were you doing", r.doing) + block("What went wrong", r.issue) + block("Suggestion", r.suggestion);
    if (r.type === "bug") {
      html += '<div class="ad-sect"><h4><span class="grow">Debugger log' + (r.log ? " · " + r.log.length.toLocaleString() + " chars" : "") + "</span>" +
        (r.log ? '<button class="ad-btn ad-small" type="button" id="d-copy">Copy</button><button class="ad-btn ad-small" type="button" id="d-dl">Download .txt</button>' : "") +
        "</h4>" + (r.log ? '<pre class="ad-log" id="d-log"></pre>' : '<p class="ad-text" style="color:var(--ink-faint)">No log attached.</p>') + "</div>";
    }
    $("d-body").innerHTML = html;
    if (r.log) {
      $("d-log").textContent = r.log;
      $("d-copy").onclick = function () {
        (navigator.clipboard ? navigator.clipboard.writeText(r.log) : Promise.reject()).then(function () { toast("Log copied."); }, function () { toast("Copy failed — select the log manually.", true); });
      };
      $("d-dl").onclick = function () {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([r.log], { type: "text/plain" }));
        a.download = "sulphurui-log-" + (r.character || "report") + "-" + String(r.id).slice(0, 8) + ".txt";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      };
    }
    $("d-status").innerHTML = ["new", "seen", "fixed", "wontfix"].map(function (s) {
      return '<button class="ad-btn ad-small' + (r.status === s ? " is-on" : "") + '" type="button" data-st="' + s + '" aria-pressed="' + (r.status === s) + '">' + STATUS_LABEL[s] + "</button>";
    }).join("");
    $("d-status").querySelectorAll("[data-st]").forEach(function (b) {
      b.onclick = function () {
        if (b.dataset.st === r.status) return;
        api("reports/" + encodeURIComponent(r.id), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: b.dataset.st }) })
          .then(function () { r.status = b.dataset.st; renderDetail(r); toast("Marked " + STATUS_LABEL[r.status].toLowerCase() + "."); load(); })
          .catch(function (e) { toast(e.message, true); });
      };
    });
  }
  function open(id) {
    current = id; renderList();
    $("d-title").textContent = "Loading…"; $("d-body").innerHTML = '<div class="ad-skel"></div><div class="ad-skel"></div>'; $("d-status").innerHTML = "";
    openDrawer();
    api("reports/" + encodeURIComponent(id)).then(renderDetail).catch(function (e) { toast(e.message, true); closeDrawer(); });
  }

  // Delete confirm
  function confirmDelete() {
    var m = $("confirm"); m.hidden = false; $("c-no").focus();
    return new Promise(function (res) {
      function done(v) { m.hidden = true; $("c-yes").onclick = $("c-no").onclick = null; res(v); }
      $("c-yes").onclick = function () { done(true); };
      $("c-no").onclick = function () { done(false); };
      m.onclick = function (e) { if (e.target === m) done(false); };
    });
  }
  $("d-del").onclick = function () {
    var id = current; if (!id) return;
    confirmDelete().then(function (yes) {
      if (!yes) return;
      api("reports/" + encodeURIComponent(id), { method: "DELETE" })
        .then(function () { closeDrawer(); toast("Report deleted."); load(); })
        .catch(function (e) { toast(e.message, true); });
    });
  };

  // Wiring
  $("list").addEventListener("click", function (e) { var it = e.target.closest(".ad-row"); if (it) open(it.dataset.id); });
  document.querySelectorAll(".ad-seg").forEach(function (seg) {
    seg.addEventListener("click", function (e) {
      var c = e.target.closest(".ad-chip"); if (!c) return;
      seg.querySelectorAll(".ad-chip").forEach(function (x) { x.setAttribute("aria-pressed", x === c ? "true" : "false"); });
      filters[seg.dataset.filter] = c.dataset.v; load();
    });
  });
  $("f-version").onchange = load;
  $("q").addEventListener("input", renderList);
  $("reload").onclick = load;
  $("signout").onclick = signOut;
  $("d-close").onclick = closeDrawer;
  $("scrim").onclick = closeDrawer;
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!$("confirm").hidden) { $("c-no").click(); return; }
    if ($("drawer").classList.contains("open")) closeDrawer();
  });

  $("signin-form").onsubmit = function (e) {
    e.preventDefault();
    var k = $("key").value.trim(), err = $("signin-err"), btn = e.target.querySelector("button");
    if (!k) { err.textContent = "Enter the admin key."; err.hidden = false; return; }
    err.hidden = true; btn.disabled = true; btn.textContent = "Signing in…";
    req("reports", null, k).then(function (r) {
      if (r.status === 200) {
        adminKey = k; $("key").value = "";
        try { localStorage.setItem(STORE, k); } catch (x) {}
        showPanel(true); load();
      } else { err.textContent = r.status === 403 ? "Wrong key" : "Sign-in failed (HTTP " + r.status + ")."; err.hidden = false; }
    }).catch(function () { err.textContent = "Could not reach the server."; err.hidden = false; })
      .then(function () { btn.disabled = false; btn.textContent = "Sign in"; });
  };
  if (adminKey) { showPanel(true); load(); } else showPanel(false);
})();
