/* ============================================================
   VIPSCLUB Portal 2026 — Portal Sidebar
   Active nav item — JS is the authoritative source since nav
   items may be saved as full URLs or bare paths in the editor.
   ============================================================ */

(function () {
  'use strict';

  var sidebar = document.getElementById('portal-sidebar');
  if (!sidebar) return;

  var currentPath = window.location.pathname;
  // Strip trailing slash except for root
  if (currentPath.length > 1 && currentPath.charAt(currentPath.length - 1) === '/') {
    currentPath = currentPath.slice(0, -1);
  }

  var navItems = sidebar.querySelectorAll('.sidebar-nav__item');

  Array.prototype.forEach.call(navItems, function (item) {
    var href = item.getAttribute('href');
    if (!href) return;

    // Parse pathname from href regardless of whether it's absolute or relative
    var itemPath;
    try {
      itemPath = new URL(href, window.location.origin).pathname;
    } catch (e) {
      itemPath = href.split('?')[0].split('#')[0];
    }

    // Strip trailing slash
    if (itemPath.length > 1 && itemPath.charAt(itemPath.length - 1) === '/') {
      itemPath = itemPath.slice(0, -1);
    }

    var isActive = false;

    // Exact match
    if (itemPath === currentPath) {
      isActive = true;
    }
    // Sub-path match: /services is active on /services/ctr-gold
    else if (itemPath !== '/' && currentPath.indexOf(itemPath + '/') === 0) {
      isActive = true;
    }

    if (isActive) {
      item.classList.add('sidebar-nav__item--active');
      item.setAttribute('aria-current', 'page');
    } else {
      item.classList.remove('sidebar-nav__item--active');
      item.removeAttribute('aria-current');
    }
  });

}());
