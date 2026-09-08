/* ============================================================
   VIPSCLUB Portal 2026 — Refer Landing Form Module JS

   Prefills the "Refer a friend Form" (V4 new editor) on the
   /refer-landing/* dynamic page. Data source is the wrapper's
   data-* attrs stamped by module.html:

     • data-refhash    — hs_course_id (legacy — the old V3 form had a
                          hidden `referral_id` / `referred_by_hash`
                          field; the V4 form doesn't. Retained so the
                          workflow can add it back as a hidden field
                          without touching this module.)
     • data-refname    — referrer's display name (not on the new form)
     • data-refemail   → 0-1/referral_source_email
     • (data island `referral-service-config` → name+id) → 0-1/referred_service

   Uses the HubSpotFormsV4 events API — replaces the earlier V3
   MutationObserver + React setter approach. `hs-form-event:on-ready`
   fires once the developer embed has mounted the form; we look up
   the wrapper by data-form-id, pull the prefill values from the
   surrounding card, and set them via HubSpotFormsV4.setFieldValue.

   Both fields are safe to no-op if the form doesn't have them
   (setFieldValue silently ignores unknown fields).
   ============================================================ */

window.addEventListener('hs-form-event:on-ready', function (event) {
  if (!event || !event.detail || !event.detail.formId) return;

  var formEl = document.querySelector(
    '.hs-form-html[data-form-id="' + event.detail.formId + '"]'
  );
  if (!formEl) return;
  var formWrap = formEl.closest('.refer-landing-form__form-wrap');
  if (!formWrap) return;

  var refEmail = (formWrap.getAttribute('data-refemail') || '').trim();

  // Service-context: read the data island the HubL emitted when the
  // shareable link carried ?service=<hubdb_row_id>. Build the same
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
    } catch (e) { /* malformed config → skip */ }
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
  // HubSpot's V4 form editor requires a non-empty "Consent to communicate"
  // and "Consent to process" text — bypassed here by entering a single
  // space so validation passes without visible copy. But the empty text
  // still renders as a .hsfc-Row above/below the checkbox with ~20px of
  // margin, leaving a big gap around "I agree to the Terms and Conditions".
  // Walk .hsfc-DataPrivacyField's direct-child rows: if a row contains
  // only .hsfc-RichText elements AND all of them are whitespace-only,
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
      mark.textContent = '✓'; // ✓
      wrap.appendChild(mark);
    });
  }, 0);
});
