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
