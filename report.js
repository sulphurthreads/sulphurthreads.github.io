// Report form (report.html). Posts to the absolute pages.dev URL so the
// GitHub Pages mirror works too; same-origin when served from pages.dev.
(function () {
  var API = location.hostname.endsWith("pages.dev") || location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "/api/report" : "https://sulphur-addons.pages.dev/api/report";
  var form = document.getElementById("rp");
  var status = document.getElementById("rp-status");
  var count = document.getElementById("rp-count");
  var type = "bug";

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  var d = new Date();
  form.issue_time.value = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());

  function setType(t) {
    type = t;
    form.querySelectorAll("[data-type]").forEach(function (b) { b.setAttribute("aria-selected", b.dataset.type === t ? "true" : "false"); });
    form.querySelectorAll("[data-only]").forEach(function (el) { el.hidden = el.dataset.only !== t; });
  }
  form.querySelectorAll("[data-type]").forEach(function (b) { b.addEventListener("click", function () { setType(b.dataset.type); }); });

  form.log.addEventListener("input", function () { count.textContent = form.log.value.length.toLocaleString() + " characters"; });

  function show(ok, msg) { status.hidden = false; status.className = "rp-status " + (ok ? "ok" : "bad"); status.textContent = msg; }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = form.elements, body = { type: type, website: f.website.value };
    ["character", "version", "client", "contact"].forEach(function (k) { body[k] = f[k].value.trim(); });
    if (type === "bug") ["realm", "issue_time", "doing", "issue", "log"].forEach(function (k) { body[k] = f[k].value.trim(); });
    else body.suggestion = f.suggestion.value.trim();
    if (!body.character || !body.version) return show(false, "Character name and version are required.");
    if (type === "bug" && !body.issue) return show(false, "Please describe what went wrong.");
    if (type === "suggestion" && !body.suggestion) return show(false, "Please write your suggestion.");
    var btn = form.querySelector('button[type="submit"]'); btn.disabled = true;
    fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { r: r, j: j }; }); })
      .then(function (x) {
        if (x.r.ok) { show(true, "Sent, thank you. Reference: " + x.j.id); form.reset(); setType(type); count.textContent = "0 characters"; }
        else show(false, "Not sent: " + (x.j.error || ("HTTP " + x.r.status)));
      })
      .catch(function () { show(false, "Not sent: could not reach the server. Try again in a minute."); })
      .then(function () { btn.disabled = false; });
  });
})();
