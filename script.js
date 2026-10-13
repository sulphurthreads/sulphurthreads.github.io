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

// Screenshot gallery (click-through, keyboard, swipe, lightbox)
document.querySelectorAll('[data-gallery]').forEach(function (g) {
  var slides = g.querySelectorAll('.gal-slide'), thumbs = g.querySelectorAll('.gal-thumb'), i = 0;
  var box = g.parentNode.querySelector('.gal-lightbox');
  function show(n) {
    i = (n + slides.length) % slides.length;
    slides.forEach(function (s, k) { s.hidden = k !== i; });
    thumbs.forEach(function (t, k) { if (k === i) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current'); });
  }
  g.querySelector('.gal-prev').addEventListener('click', function () { show(i - 1); });
  g.querySelector('.gal-next').addEventListener('click', function () { show(i + 1); });
  thumbs.forEach(function (t, k) { t.addEventListener('click', function () { show(k); }); });
  g.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { show(i - 1); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { show(i + 1); e.preventDefault(); }
  });
  var x0 = null;
  g.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  g.addEventListener('touchend', function (e) {
    if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 40) show(dx < 0 ? i + 1 : i - 1);
  });
  if (box && box.showModal) {
    slides.forEach(function (s) { s.querySelector('img').addEventListener('click', function () {
      var im = box.querySelector('img'); im.src = this.src; im.alt = this.alt; box.showModal();
    }); });
    box.querySelector('.gal-close').addEventListener('click', function () { box.close(); });
    box.addEventListener('click', function (e) { if (e.target === box) box.close(); });
  }
});
