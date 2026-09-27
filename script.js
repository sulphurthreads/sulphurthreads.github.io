// Tabbed showcase (index.html): any [data-tabs] root with role=tab buttons
// whose aria-controls names a panel. Arrow keys move between tabs.
document.querySelectorAll("[data-tabs]").forEach(function (root) {
  var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
  function select(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
    });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { select(t); });
    t.addEventListener("keydown", function (e) {
      var step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!step) return;
      var next = tabs[(i + step + tabs.length) % tabs.length];
      select(next);
      next.focus();
    });
  });
});

// Minimal Lua highlighter for the real-code section: comments, strings,
// keywords, numbers. Works on the escaped text, so it never builds markup
// from the source itself.
document.querySelectorAll("pre[data-lua] code").forEach(function (el) {
  var KW = /^(local|function|end|if|then|else|elseif|return|for|do|in|and|or|not|nil|true|false|while)$/;
  var src = el.textContent, out = "", i = 0;
  function esc(t) { return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  var re = /(--[^\n]*)|("(?:[^"\\n]|\.)*")|([A-Za-z_][A-Za-z0-9_]*)|(\d+(?:\.\d+)?)/g, m;
  while ((m = re.exec(src))) {
    out += esc(src.slice(i, m.index));
    if (m[1]) out += '<span class="tk-c">' + esc(m[1]) + "</span>";
    else if (m[2]) out += '<span class="tk-s">' + esc(m[2]) + "</span>";
    else if (m[3]) out += KW.test(m[3]) ? '<span class="tk-k">' + m[3] + "</span>" : m[3];
    else out += '<span class="tk-n">' + m[4] + "</span>";
    i = re.lastIndex;
  }
  el.innerHTML = out + esc(src.slice(i));
});
