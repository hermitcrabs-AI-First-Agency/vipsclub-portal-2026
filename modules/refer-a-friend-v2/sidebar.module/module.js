(function () {
  var sidebar = document.getElementById('rfv2-sidebar');
  var close = document.getElementById('rfv2-sidebar-close');
  var button = document.getElementById('rfv2-menu-button');
  if (!sidebar || !close) return;

  function closeMenu() {
    sidebar.classList.remove('rfv2-sidebar--open');
    document.body.classList.remove('rfv2-nav-open');
    if (button) button.setAttribute('aria-expanded', 'false');
    var overlay = document.querySelector('.rfv2-nav-overlay');
    if (overlay) overlay.classList.remove('rfv2-nav-overlay--visible');
  }

  close.addEventListener('click', closeMenu);
  sidebar.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });
})();
