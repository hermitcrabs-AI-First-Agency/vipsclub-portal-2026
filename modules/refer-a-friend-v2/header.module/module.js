(function () {
  var button = document.getElementById('rfv2-menu-button');
  var sidebar = document.getElementById('rfv2-sidebar');
  if (!button || !sidebar) return;

  var overlay = document.querySelector('.rfv2-nav-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'rfv2-nav-overlay';
    document.body.appendChild(overlay);
  }

  function setOpen(open) {
    sidebar.classList.toggle('rfv2-sidebar--open', open);
    overlay.classList.toggle('rfv2-nav-overlay--visible', open);
    document.body.classList.toggle('rfv2-nav-open', open);
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  button.addEventListener('click', function () {
    setOpen(!sidebar.classList.contains('rfv2-sidebar--open'));
  });
  overlay.addEventListener('click', function () { setOpen(false); });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') setOpen(false);
  });
})();
