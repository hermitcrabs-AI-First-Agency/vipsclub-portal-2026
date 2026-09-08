/* ============================================================
   VIPSCLUB Portal 2026 — Offers & Rewards Hub Module JS
   Tab switching + filter chip logic
   ============================================================ */

(function () {
  'use strict';

  var section  = document.querySelector('.offers-rewards-hub');
  if (!section) return;

  var tabs     = section.querySelectorAll('.offers-rewards-hub__tab');
  var grid     = section.getElementById ? section.getElementById('offers-rewards-grid') : document.getElementById('offers-rewards-grid');
  if (!grid) grid = section.querySelector('#offers-rewards-grid');
  if (!grid) return;

  var allCards = Array.prototype.slice.call(grid.querySelectorAll('.offers-rewards-hub__card'));

  // ── Build filter chips dynamically from the cards' own data attributes ──
  // Reads data-tier + data-category off every card, dedupes, and renders:
  //   [All]  +  [Bronze+] [Silver+] [Gold+]  +  [Category A] [Category B] …
  // No editor config — chips always reflect what's actually in the CRM.
  function buildChips() {
    var container = section.querySelector('.offers-rewards-hub__chips');
    if (!container) return;

    var tiers = {};
    var categories = {};
    allCards.forEach(function (card) {
      // tier_badge is a MULTISELECT — data-tiers is space-separated (may be empty).
      // Collect each individual tier value so the chip bar shows one chip per tier.
      var tiersAttr = (card.getAttribute('data-tiers') || '').trim().toLowerCase();
      if (tiersAttr) {
        tiersAttr.split(/\s+/).forEach(function (t) { if (t) tiers[t] = true; });
      }
      var c = (card.getAttribute('data-category') || '').trim();
      if (c) categories[c] = true;
    });

    var tierOrder = ['bronze', 'silver', 'gold'];
    var sortedTiers = tierOrder.filter(function (t) { return tiers[t]; });
    var sortedCategories = Object.keys(categories).sort();

    function esc(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
      });
    }
    function title(s) {
      return s.replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    }

    var parts = [];
    parts.push(
      '<button class="offers-rewards-hub__chip is-active" type="button"' +
      ' data-filter-type="all" data-filter-value="" aria-pressed="true">All</button>'
    );
    sortedTiers.forEach(function (tier) {
      parts.push(
        '<button class="offers-rewards-hub__chip" type="button"' +
        ' data-filter-type="tier" data-filter-value="' + esc(tier) + '"' +
        ' aria-pressed="false">' + esc(title(tier)) + '</button>'
      );
    });
    sortedCategories.forEach(function (cat) {
      parts.push(
        '<button class="offers-rewards-hub__chip" type="button"' +
        ' data-filter-type="category" data-filter-value="' + esc(cat) + '"' +
        ' aria-pressed="false">' + esc(title(cat)) + '</button>'
      );
    });

    container.innerHTML = parts.join('');
  }

  buildChips();

  // Query chips AFTER buildChips() has rendered them
  var chips = section.querySelectorAll('.offers-rewards-hub__chip');

  // ── State ──
  var activeTab  = 'offer';  // matches data-item-type
  var activeChip = { type: 'all', value: '' };

  // ── Apply visibility to all cards ──
  function applyFilters() {
    allCards.forEach(function (card) {
      var cardType     = card.getAttribute('data-item-type') || '';
      var cardCategory = card.getAttribute('data-category')  || '';
      // MULTISELECT tier_badge — space-separated list on data-tiers.
      var cardTiers    = (card.getAttribute('data-tiers') || '').trim().toLowerCase().split(/\s+/).filter(Boolean);

      // Tab filter
      var tabPass = (activeTab === 'all') || (cardType === activeTab);

      // Chip filter
      var chipPass = true;
      if (activeChip.type === 'category') {
        chipPass = cardCategory === activeChip.value;
      } else if (activeChip.type === 'tier') {
        // Multi-tier match: card shows when the chip's tier is IN the card's
        // tier_badge list. A card tagged [silver, gold] shows for both the
        // Silver chip AND the Gold chip. Cards with no tiers (open to all)
        // don't surface under any specific tier chip.
        chipPass = cardTiers.indexOf(activeChip.value) !== -1;
      }
      // 'all' chip type → chipPass stays true

      var visible = tabPass && chipPass;
      card.hidden = !visible;
      card.setAttribute('aria-hidden', visible ? 'false' : 'true');
    });
  }

  // ── Tab click handler ──
  Array.prototype.forEach.call(tabs, function (tab) {
    tab.addEventListener('click', function () {
      // Update state
      activeTab = this.getAttribute('data-tab') || 'all';

      // Update ARIA + visual state
      Array.prototype.forEach.call(tabs, function (t) {
        var isActive = t === tab;
        t.classList.toggle('is-active', isActive);
        t.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      // Reset chip to "All" when switching tabs
      activeChip = { type: 'all', value: '' };
      Array.prototype.forEach.call(chips, function (c, i) {
        var isFirst = (i === 0);
        c.classList.toggle('is-active', isFirst);
        c.setAttribute('aria-pressed', isFirst ? 'true' : 'false');
      });

      // Update URL hash for deep-linking
      try {
        var hashMap = { offer: '#offers', reward: '#rewards', all: '#all' };
        history.replaceState(null, '', hashMap[activeTab] || '#offers');
      } catch (e) {}

      applyFilters();
    });
  });

  // ── Chip click handler ──
  Array.prototype.forEach.call(chips, function (chip) {
    chip.addEventListener('click', function () {
      var filterType  = this.getAttribute('data-filter-type')  || 'all';
      var filterValue = this.getAttribute('data-filter-value') || '';

      activeChip = { type: filterType, value: filterValue };

      Array.prototype.forEach.call(chips, function (c) {
        var isActive = c === chip;
        c.classList.toggle('is-active', isActive);
        c.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });

      applyFilters();
    });
  });

  // ── On load: check URL hash and activate matching tab ──
  (function initFromHash() {
    var hash = window.location.hash;
    var hashToTab = { '#offers': 'offer', '#rewards': 'reward', '#all': 'all' };
    var targetTab = hashToTab[hash];
    if (targetTab) {
      Array.prototype.forEach.call(tabs, function (tab) {
        if (tab.getAttribute('data-tab') === targetTab) {
          tab.click();
        }
      });
    } else {
      // Default: run initial filter with offer tab active
      applyFilters();
    }
  }());

  // ────────────────────────────────────────────────────────────────
  // OR1 — Claim click tracking
  //
  // Every active claim button carries `data-claim-btn="1"` and lives inside
  // an <article> that has `data-offer-id`, `data-offer-name`, `data-item-type`
  // (offer/reward), `data-claim-count`, `data-max-claims`, and the pressed
  // label as `data-btn-pressed-text`.
  //
  // On click we:
  //   1. Fire the `pe442066989_offer_claimed` Custom Behavioral Event with
  //      { offer_id, offer_name, type }. HubSpot's tracking script (_hsq) is
  //      already loaded on every portal page and identifies the member via
  //      hubspotutk cookie, so no auth work needed here.
  //   2. Optimistically bump the claim count + swap the button label so the
  //      member gets instant feedback. The workflow catches up server-side
  //      and the next page load reconciles the count.
  //   3. Let the browser continue with the anchor's default behaviour so
  //      the CTA URL still opens.
  // ────────────────────────────────────────────────────────────────
  var claimButtons = section.querySelectorAll('[data-claim-btn="1"]');
  Array.prototype.forEach.call(claimButtons, function (btn) {
    btn.addEventListener('click', function () {
      var card = btn.closest('.offers-rewards-hub__card');
      if (!card) return;

      var offerId   = parseInt(card.getAttribute('data-offer-id'), 10) || null;
      var offerName = card.getAttribute('data-offer-name') || '';
      var itemType  = card.getAttribute('data-item-type')  || 'offer';
      var offerLink = card.getAttribute('data-offer-link') || '';

      // Fire the custom event. Property keys match the HubSpot event
      // definition exactly: `type` (not offer_type), `offer_link` (not
      // cta_link). The workflow reads these tokens directly into the
      // ticket in the Create Ticket action.
      var _hsq = window._hsq = window._hsq || [];
      _hsq.push(['trackCustomBehavioralEvent', {
        name: 'pe442066989_offer_claimed',
        properties: {
          offer_id:   offerId,
          offer_name: offerName,
          type:       itemType,
          offer_link: offerLink
        }
      }]);

      // Optimistic UI — bump the count and swap to the pressed label so the
      // click feels responsive. Server truth reconciles on next page load.
      var count    = (parseInt(card.getAttribute('data-claim-count'), 10) || 0) + 1;
      var maxClaim = parseInt(card.getAttribute('data-max-claims'),  10) || 0;
      card.setAttribute('data-claim-count', String(count));

      var pressedText = btn.getAttribute('data-btn-pressed-text');
      var textNodeSet = false;
      // Update label text without breaking any icon spans if present.
      Array.prototype.forEach.call(btn.childNodes, function (n) {
        if (!textNodeSet && n.nodeType === 3 /* text node */ && n.textContent.trim()) {
          n.textContent = pressedText;
          textNodeSet = true;
        }
      });
      if (!textNodeSet) { btn.textContent = pressedText; }
      btn.classList.add('offers-rewards-hub__btn--claimed');
    });
  });

})();
