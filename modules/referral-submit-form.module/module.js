/* ============================================================
   VIPSCLUB Portal 2026 — Referral Submit Form JS

   Prefills the "Refer a friend Form" (V4 new editor) on the
   /refer-a-friend page:

     • referral_source_email  ← logged-in member's email
                                (data-refemail on .referral-submit-form)
     • referred_service       ← "<name> - <hubdb_row_id> - <full url>"
                                built from the #referral-service-config
                                data island the HubL emits when the URL
                                carried ?service=<hubdb_row_id> (SD4)

   Uses the HubSpotFormsV4 events API. `hs-form-event:on-ready` fires
   once the developer embed mounts the form; we look up the wrapper by
   data-form-id, pull the prefill values from the surrounding
   .referral-submit-form container, and set them via
   HubSpotFormsV4.setFieldValue. Both fields are safe to no-op if the
   form doesn't have them (setFieldValue ignores unknown fields).
   ============================================================ */

window.addEventListener('hs-form-event:on-ready', function (event) {
  if (!event || !event.detail || !event.detail.formId) return;

  var formEl = document.querySelector(
    '.hs-form-html[data-form-id="' + event.detail.formId + '"]'
  );
  if (!formEl) return;
  var container = formEl.closest('.referral-submit-form');
  if (!container) return;

  var refEmail = (container.getAttribute('data-refemail') || '').trim();

  // Service-context: read the data island the HubL emitted when the
  // page URL carried ?service=<hubdb_row_id>. Build the same
  // "Name - ID - Full URL" string the service_enquiry pattern uses.
  var referredServiceValue = '';
  var svcConfigEl = document.getElementById('referral-service-config');
  if (svcConfigEl) {
    try {
      var svc = JSON.parse(svcConfigEl.textContent || '{}');
      if (svc.name && svc.id) {
        referredServiceValue =
          svc.name + ' - ' + svc.id + ' - ' +
          window.location.origin + window.location.pathname;
      }
    } catch (e) { /* malformed data island → skip */ }
  }

  var form;
  try { form = window.HubSpotFormsV4.getFormFromEvent(event); } catch (e) {}
  if (!form) return;

  function setSafe(path, value) {
    if (!value) return;
    try { form.setFieldValue(path, value); } catch (e) {}
  }

  setSafe('0-1/referral_source_email', refEmail);
  setSafe('0-1/referred_service',      referredServiceValue);

  // ── Hide empty consent placeholder rows ──
  // The V4 form editor requires non-empty "Consent to communicate" and
  // "Consent to process" text. A single space bypasses validation, but
  // the empty rich-text still renders as a .hsfc-Row above/below the
  // "I agree" checkbox with ~20px of margin. Walk
  // .hsfc-DataPrivacyField's direct-child rows: if a row contains only
  // .hsfc-RichText elements and all of them are whitespace-only,
  // display:none the row. Rows containing the checkbox are untouched.
  setTimeout(function hideEmptyConsentRows() {
    var rows = formEl.querySelectorAll('.hsfc-DataPrivacyField > .hsfc-Row');
    rows.forEach(function (row) {
      var kids = row.children;
      if (kids.length === 0) return;
      var allRichText = true;
      var hasText = false;
      for (var i = 0; i < kids.length; i++) {
        if (!kids[i].classList.contains('hsfc-RichText')) { allRichText = false; break; }
        if ((kids[i].textContent || '').trim().length > 0) hasText = true;
      }
      if (allRichText && !hasText) row.style.display = 'none';
    });
  }, 0);

  // ── Wrap the "I agree" checkbox for a crisp custom ✓ ──
  // A background-image SVG on an <input> loses contrast at 16-18px
  // (browser antialiasing washes the ✓ out on a dark fill). Inject a
  // sibling <span>✓</span>, absolutely positioned across the input,
  // toggled via the CSS adjacent-sibling combinator on :checked. See
  // forms.css `.vips-cb-wrap` / `.vips-cb-mark`.
  setTimeout(function wrapCheckboxes() {
    formEl.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
      if (cb.dataset.vipsCbWrapped === '1') return;
      if (cb.parentElement && cb.parentElement.classList.contains('vips-cb-wrap')) return;
      cb.dataset.vipsCbWrapped = '1';
      var wrap = document.createElement('span');
      wrap.className = 'vips-cb-wrap';
      cb.parentNode.insertBefore(wrap, cb);
      wrap.appendChild(cb);
      var mark = document.createElement('span');
      mark.className = 'vips-cb-mark';
      mark.setAttribute('aria-hidden', 'true');
      mark.textContent = '✓';
      wrap.appendChild(mark);
    });
  }, 0);
});
