/* ============================================================
   Terms — Body (Auto-TOC)
   Scroll-spy: highlights the TOC item whose section is currently
   at the top of the viewport (above the activation line).
   Click handler: smooth-scroll to the section + lock the highlight
   to the clicked item until the user manually scrolls.
   ============================================================ */

(function () {
  'use strict';

  function init(root) {
    if (!root || root.dataset.termsInit === '1') return;
    root.dataset.termsInit = '1';

    var tocItems = root.querySelectorAll('.terms-content__toc-item[data-toc-target]');
    var sections = root.querySelectorAll('.terms-content__section[data-terms-section]');
    if (!tocItems.length || !sections.length) return;

    var ACTIVATION_LINE = 120;
    var BOTTOM_TOLERANCE = 4;
    var rafScheduled = false;
    var sectionsArr = Array.prototype.slice.call(sections);

    // ── Click-lock mode ──
    // When the user clicks a TOC item, scroll-spy is PAUSED and the clicked
    // item stays highlighted until the user manually scrolls. This solves the
    // "bottom-of-page" problem: sections near the end of the document can't
    // reach the activation line (not enough scroll runway), so without the
    // lock the highlight would snap back to "Contact information" the moment
    // the smooth scroll completes. With the lock, clicking "Governing law"
    // keeps it highlighted until the user wheels/touches/scroll-keys.
    var clickLocked = false;

    // ── Active class toggle ──
    // Tracks the currently-active id so we can skip work when it hasn't
    // actually changed (scroll-spy fires every frame; we only want to
    // mutate the DOM + auto-scroll the TOC when the highlight moves).
    var currentActiveId = null;
    var tocContainer = root.querySelector('.terms-content__toc');

    function setActive(targetId) {
      if (targetId === currentActiveId) return;
      currentActiveId = targetId;

      var activeLink = null;
      tocItems.forEach(function (link) {
        var isActive = link.getAttribute('data-toc-target') === targetId;
        link.classList.toggle('is-active', isActive);
        if (isActive) {
          link.setAttribute('aria-current', 'true');
          activeLink = link;
        } else {
          link.removeAttribute('aria-current');
        }
      });

      if (activeLink) ensureActiveVisibleInToc(activeLink);
    }

    // ── Keep the active item visible inside the TOC's own scrollable area.
    // On shorter viewports the TOC's `max-height: calc(100vh - 64px)` makes
    // it overflow internally. Without this, items at the top/bottom of the
    // TOC scroll out of view as the page-level scroll-spy advances. We
    // ONLY adjust the TOC's scrollTop — never the page scroll — so the
    // reader's main scroll position is preserved. ──
    function ensureActiveVisibleInToc(link) {
      if (!tocContainer) return;

      // No-op if the TOC isn't overflowing (content fits within its box).
      if (tocContainer.scrollHeight <= tocContainer.clientHeight + 1) return;

      var linkRect = link.getBoundingClientRect();
      var tocRect = tocContainer.getBoundingClientRect();
      var PADDING = 12;

      if (linkRect.top < tocRect.top + PADDING) {
        // Active item is above the TOC's visible area — scroll TOC up
        tocContainer.scrollTop += (linkRect.top - tocRect.top) - PADDING;
      } else if (linkRect.bottom > tocRect.bottom - PADDING) {
        // Active item is below the TOC's visible area — scroll TOC down
        tocContainer.scrollTop += (linkRect.bottom - tocRect.bottom) + PADDING;
      }
    }

    // ── Click → smooth scroll + lock highlight to the clicked item ──
    tocItems.forEach(function (link) {
      link.addEventListener('click', function (e) {
        var id = link.getAttribute('data-toc-target');
        var target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();

        // Lock the highlight FIRST so the smooth-scroll's intermediate
        // positions don't trigger a flicker via scroll-spy.
        clickLocked = true;
        setActive(id);

        var prefersReduced =
          window.matchMedia &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        target.scrollIntoView({
          behavior: prefersReduced ? 'auto' : 'smooth',
          block: 'start'
        });
        if (history.replaceState) {
          history.replaceState(null, '', '#' + id);
        }
      });
    });

    function updateActive() {
      rafScheduled = false;

      // While locked from a click, scroll-spy is silent — the clicked item
      // owns the highlight. User-initiated wheel/touch/keydown events unlock.
      if (clickLocked) return;

      // ── Special case: page is scrolled to its bottom (no more scroll room).
      // Bottom-most sections often can't reach the activation line because
      // there isn't enough scroll runway. When we're at the bottom, force the
      // last section active. ──
      var scrollMax =
        document.documentElement.scrollHeight - window.innerHeight;
      var atBottom = window.scrollY >= scrollMax - BOTTOM_TOLERANCE;
      if (atBottom) {
        setActive(sectionsArr[sectionsArr.length - 1].id);
        return;
      }

      // ── Normal scroll-spy: pick the topmost section whose top is at or
      // above the activation line. ──
      var current = null;
      for (var i = 0; i < sectionsArr.length; i++) {
        var rect = sectionsArr[i].getBoundingClientRect();
        if (rect.top - ACTIVATION_LINE <= 0) {
          current = sectionsArr[i].id;
        } else {
          // Sections are in document order — once we hit one BELOW the line,
          // every subsequent section is also below it. Bail early.
          break;
        }
      }
      if (!current && sectionsArr[0]) current = sectionsArr[0].id;
      if (current) setActive(current);
    }

    function onScroll() {
      if (rafScheduled) return;
      rafScheduled = true;
      window.requestAnimationFrame(updateActive);
    }

    // ── Unlock on user-initiated scrolling.
    // Smooth-scroll programmatically does NOT fire these events, so they're
    // a reliable signal that the user (not the click handler) is moving. ──
    function unlock() {
      if (clickLocked) {
        clickLocked = false;
        // Re-run scroll-spy on the next animation frame so the highlight
        // tracks the user's current scroll position immediately.
        onScroll();
      }
    }

    var SCROLL_KEYS = {
      'PageDown': 1, 'PageUp': 1, 'ArrowDown': 1, 'ArrowUp': 1,
      'Home': 1, 'End': 1, ' ': 1, 'Spacebar': 1
    };

    window.addEventListener('wheel', unlock, { passive: true });
    window.addEventListener('touchmove', unlock, { passive: true });
    window.addEventListener('keydown', function (e) {
      if (SCROLL_KEYS[e.key]) unlock();
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    // ── On load: if URL has a hash, treat it like a click (lock the
    // highlight on that section so navigation-from-link feels intentional).
    // Otherwise compute from current scroll position. ──
    var initialHash = (window.location.hash || '').replace('#', '');
    if (initialHash && document.getElementById(initialHash)) {
      clickLocked = true;
      setActive(initialHash);
    } else {
      updateActive();
    }
  }

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    document
      .querySelectorAll('[data-terms-content]')
      .forEach(init);
  });
})();
