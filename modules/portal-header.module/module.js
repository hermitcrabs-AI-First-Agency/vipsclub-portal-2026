/* ============================================================
   Portal Header — Hamburger Navigation Toggle
   Handles mobile sidebar open/close, overlay backdrop,
   aria-expanded state, Escape key, and scroll lock.
   ============================================================ */

(function () {
  'use strict';

  var btn     = document.getElementById('portal-hamburger-btn');
  var sidebar = document.getElementById('portal-sidebar');

  if (!btn || !sidebar) return;

  // Inject overlay backdrop once
  var overlay = document.createElement('div');
  overlay.className = 'portal-nav-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  document.body.appendChild(overlay);

  function openNav() {
    sidebar.classList.add('portal-sidebar--open');
    overlay.classList.add('portal-nav-overlay--visible');
    btn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('portal-nav-open');
    // Move focus to first interactive element in sidebar
    var first = sidebar.querySelector('a, button');
    if (first) first.focus();
  }

  function closeNav() {
    sidebar.classList.remove('portal-sidebar--open');
    overlay.classList.remove('portal-nav-overlay--visible');
    btn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('portal-nav-open');
    btn.focus();
  }

  btn.addEventListener('click', function () {
    if (sidebar.classList.contains('portal-sidebar--open')) {
      closeNav();
    } else {
      openNav();
    }
  });

  // Tap on overlay closes nav
  overlay.addEventListener('click', closeNav);

  // In-menu close (X) button closes nav
  var closeBtn = document.getElementById('portal-sidebar-close');
  if (closeBtn) closeBtn.addEventListener('click', closeNav);

  // Tapping a nav link closes the menu
  var navLinks = sidebar.querySelectorAll('.sidebar-nav__item');
  Array.prototype.forEach.call(navLinks, function (link) {
    link.addEventListener('click', closeNav);
  });

  // Escape key closes nav
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && sidebar.classList.contains('portal-sidebar--open')) {
      closeNav();
    }
  });

  // Focus trap — keep Tab cycling within sidebar when open
  sidebar.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || !sidebar.classList.contains('portal-sidebar--open')) return;

    var focusable = sidebar.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable.length === 0) return;

    var firstEl = focusable[0];
    var lastEl  = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      }
    } else {
      if (document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }
  });
})();
