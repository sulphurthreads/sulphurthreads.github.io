// Report form (report.html). Posts to the absolute pages.dev URL so the
// GitHub Pages mirror works too; same-origin when served from pages.dev.
(function () {
  var API = location.hostname.endsWith("pages.dev") || location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "/api/report" : "https://sulphur-addons.pages.dev/api/report";
  var LOG_MAX = 250000;
  var form = document.getElementById("rp");
  var status = document.getElementById("rp-status");
  var count = document.getElementById("rp-count");
  var bar = document.getElementById("rp-bar");
  var meter = document.getElementById("rp-meter");
  var type = "bug";

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function stampNow() {
    var d = new Date();
    form.issue_time.value = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }
  stampNow();

  function setType(t) {
    type = t;
    form.querySelectorAll("[data-type]").forEach(function (b) { b.setAttribute("aria-checked", b.dataset.type === t ? "true" : "false"); });
    form.querySelectorAll("[data-only]").forEach(function (el) { el.hidden = el.dataset.only !== t; });
    clearErrors();
  }
  form.querySelectorAll("[data-type]").forEach(function (b) { b.addEventListener("click", function () { setType(b.dataset.type); }); });

  function updateMeter() {
    var n = form.log.value.length, pct = Math.min(100, n / LOG_MAX * 100);
    count.textContent = n.toLocaleString() + " / " + LOG_MAX.toLocaleString() + " characters";
    bar.style.width = pct + "%";
    meter.className = "rp-meter" + (n >= LOG_MAX ? " over" : pct > 80 ? " warn" : "");
  }
  form.log.addEventListener("input", updateMeter);
  updateMeter();

  function fieldOf(el) { return el.closest(".rp-field"); }
  function setError(el, msg) {
    var f = fieldOf(el); f.classList.add("invalid"); el.setAttribute("aria-invalid", "true");
    var m = f.querySelector(".rp-msg");
    if (!m) { m = document.createElement("p"); m.className = "rp-msg"; f.appendChild(m); }
    m.textContent = msg;
  }
  function clearError(el) {
    var f = fieldOf(el); if (!f) return;
    f.classList.remove("invalid"); el.removeAttribute("aria-invalid");
    var m = f.querySelector(".rp-msg"); if (m) m.remove();
  }
  function clearErrors() { form.querySelectorAll(".rp-field.invalid input, .rp-field.invalid textarea").forEach(clearError); }
  ["character", "version", "issue", "suggestion"].forEach(function (k) {
    form[k].addEventListener("input", function () { if (form[k].value.trim()) clearError(form[k]); });
  });

  function show(ok, title, msg) {
    status.hidden = false; status.className = "rp-status " + (ok ? "ok" : "bad");
    status.innerHTML = "";
    var b = document.createElement("b"); b.textContent = title; status.appendChild(b);
    var s = document.createElement("span"); s.textContent = msg; status.appendChild(s);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    clearErrors(); status.hidden = true;
    var f = form.elements, body = { type: type, website: f.website.value };
    ["character", "version", "client", "contact"].forEach(function (k) { body[k] = f[k].value.trim(); });
    if (type === "bug") ["realm", "issue_time", "doing", "issue", "log"].forEach(function (k) { body[k] = f[k].value.trim(); });
    else body.suggestion = f.suggestion.value.trim();
    var bad = [];
    if (!body.character) { setError(f.character, "Enter your character name."); bad.push(f.character); }
    if (!body.version) { setError(f.version, "Enter the SulphurUI version."); bad.push(f.version); }
    if (type === "bug" && !body.issue) { setError(f.issue, "Describe what went wrong."); bad.push(f.issue); }
    if (type === "suggestion" && !body.suggestion) { setError(f.suggestion, "Write your suggestion."); bad.push(f.suggestion); }
    if (bad.length) { bad[0].focus(); return; }
    var btn = form.querySelector('button[type="submit"]'); btn.disabled = true; btn.textContent = "Sending…";
    fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { r: r, j: j }; }); })
      .then(function (x) {
        if (x.r.ok) {
          show(true, "Sent — thank you.", "Reference: " + x.j.id);
          form.reset(); setType(type); stampNow(); updateMeter();
        } else show(false, "Not sent.", x.j.error ? x.j.error.charAt(0).toUpperCase() + x.j.error.slice(1) + "." : "HTTP " + x.r.status);
      })
      .catch(function () { show(false, "Not sent.", "Could not reach the server. Try again in a minute."); })
      .then(function () { btn.disabled = false; btn.textContent = "Send report"; status.scrollIntoView({ block: "nearest", behavior: "smooth" }); });
  });
})();
