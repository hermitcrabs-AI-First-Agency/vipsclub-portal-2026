/* ============================================================
   VIPSCLUB Portal 2026 — Rewards Preview Module JS
   Dashboard "Current Promotions" + "Available Rewards" sections.
   Fires the same `pe442066989_offer_claimed` Custom Behavioral
   Event as the offers-rewards-hub module so a claim from the
   dashboard flows through the same workflow (ticket create +
   contact/ticket → Service associations).
   ============================================================ */

(function () {
  'use strict';

  // A page can render two instances of this module (Promotions + Rewards).
  // Wire click handlers once per instance — no cross-section coupling.
  var sections = document.querySelectorAll('.dashboard-rewards-preview');
  if (!sections.length) return;

  Array.prototype.forEach.call(sections, function (section) {
    var claimButtons = section.querySelectorAll('[data-claim-btn="1"]');
    Array.prototype.forEach.call(claimButtons, function (btn) {
      btn.addEventListener('click', function () {
        var card = btn.closest('.item-card');
        if (!card) return;

        var offerId   = parseInt(card.getAttribute('data-offer-id'), 10) || null;
        var offerName = card.getAttribute('data-offer-name') || '';
        var itemType  = card.getAttribute('data-item-type')  || 'offer';
        var offerLink = card.getAttribute('data-offer-link') || '';

        // Fire the CBE. Property keys must match the event definition
        // exactly — the workflow reads these tokens into the Create Ticket
        // action + the Custom Code that creates associations.
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

        // Optimistic UI — bump the count + swap to the pressed label so the
        // click feels responsive. Server truth reconciles on next page load.
        var count = (parseInt(card.getAttribute('data-claim-count'), 10) || 0) + 1;
        card.setAttribute('data-claim-count', String(count));

        var pressedText = btn.getAttribute('data-btn-pressed-text');
        if (pressedText) {
          var textNodeSet = false;
          Array.prototype.forEach.call(btn.childNodes, function (n) {
            if (!textNodeSet && n.nodeType === 3 /* text node */ && n.textContent.trim()) {
              n.textContent = pressedText;
              textNodeSet = true;
            }
          });
          if (!textNodeSet) { btn.textContent = pressedText; }
        }
        btn.classList.add('item-card__btn--claimed');
      });
    });
  });
})();
