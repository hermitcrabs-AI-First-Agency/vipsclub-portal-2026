/* ============================================================
   VIPSCLUB Portal 2026 — Services Listing Module JS
   Category filter + Load More (9 per page)
   ============================================================ */

(function () {
  'use strict';

  var PAGE_SIZE = 9;

  var categorySelect = document.getElementById('services-category-filter');
  var grid           = document.getElementById('services-grid');
  var loadMoreBtn    = document.getElementById('services-load-more');
  var countEl        = document.getElementById('services-count');

  if (!categorySelect || !grid) return;

  var allCards   = Array.prototype.slice.call(grid.querySelectorAll('.services-listing__card'));
  var shownCount = PAGE_SIZE;

  function splitAttr(card, attr) {
    return (card.getAttribute(attr) || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  /* NOTE: filter dropdown options are now pre-populated by HubL from the
     Portal Industries HubDB (table 2431597037) — see module.html. The JS
     no longer needs to derive options from card data attributes. */

  /* Returns cards matching the selected category (empty string = all) */
  function getFilteredCards(category) {
    return allCards.filter(function (card) {
      var cats = splitAttr(card, 'data-category');
      return !category || cats.indexOf(category) !== -1;
    });
  }

  /* Show first `shownCount` of filtered, hide the rest, update UI */
  function applyPaging(filteredCards) {
    var total   = filteredCards.length;
    var showing = Math.min(shownCount, total);

    /* Hide all */
    allCards.forEach(function (card) {
      card.hidden = true;
      card.setAttribute('aria-hidden', 'true');
    });

    /* Then show the first `showing` filtered cards */
    filteredCards.forEach(function (card, idx) {
      if (idx < showing) {
        card.hidden = false;
        card.setAttribute('aria-hidden', 'false');
      }
    });

    /* Count text */
    if (countEl) {
      if (total === 0) {
        countEl.textContent = 'No services match the selected filters.';
      } else if (showing >= total) {
        countEl.textContent = 'Showing all ' + total + ' service' + (total !== 1 ? 's' : '');
      } else {
        countEl.textContent = 'Showing ' + showing + ' of ' + total + ' services';
      }
    }

    /* Load More button — hide when nothing more to show */
    if (loadMoreBtn) {
      loadMoreBtn.hidden = showing >= total;
    }
  }

  function filterAndPage(category, resetPage) {
    if (resetPage) shownCount = PAGE_SIZE;
    var filtered = getFilteredCards(category);
    applyPaging(filtered);
  }

  /* ── Init ── */
  filterAndPage('', true);

  /* ── Filter change handler ── */
  categorySelect.addEventListener('change', function () {
    filterAndPage(this.value, true);
  });

  /* ── Load More ── */
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', function () {
      shownCount += PAGE_SIZE;
      filterAndPage(categorySelect.value, false);
      /* Scroll focus to first newly revealed card for accessibility */
      var filtered = getFilteredCards(categorySelect.value);
      var firstNew = filtered[shownCount - PAGE_SIZE];
      if (firstNew) firstNew.focus({ preventScroll: false });
    });
  }

})();
