/*
 * VIPSCLUB Portal 2026 — Service Detail Hero
 *
 * Prefills two fields on the embedded HubSpot service enquiry form:
 *
 * 1) `service_enquiry` — a debug-friendly string in the format
 *       "<Service Name> - <HubDB Row ID> - <Full URL>"
 *    Read by the "Service Requests" workflow trigger and, downstream, by
 *    the portal HubL that counts enquiries per service.
 *
 * 2) `email` — the logged-in portal member's email address. HubSpot's
 *    cookie-based prefill is unreliable on the portal (private browsing,
 *    third-party cookie blocking, aggressive Safari expiration).
 *
 * Two code paths — form editor detected in HubL:
 *   V4 (new editor / multi-step) — uses HubSpotFormsV4 events API. Listener
 *     is registered at module-load time (before the deferred developer
 *     embed script executes), reads prefill data from the wrapper's
 *     data-* attrs, and calls setFieldValue.
 *   V3 (classic legacy)  — MutationObserver watches for the inline form
 *     to be injected into the DOM, then sets inputs directly.
 *
 * Both paths coexist. Non-matching one silently no-ops for its off-path form.
 */

// ─── V4 new-editor forms — prefill via HubSpotFormsV4 events API ───
// Docs: /api-reference/latest/marketing/forms/global-form-events
// Registers ONCE per page load. The developer embed script fires
// `hs-form-event:on-ready` when the form finishes rendering; we look up the
// matching form wrapper by data-form-id and pull prefill from its data-*.
window.addEventListener('hs-form-event:on-ready', function (event) {
  if (!event || !event.detail || !event.detail.formId) return;

  var formEl = document.querySelector(
    '.hs-form-html[data-form-id="' + event.detail.formId + '"]'
  );
  if (!formEl) return;

  var name  = formEl.dataset.vipsServiceName  || '';
  var id    = formEl.dataset.vipsServiceId    || '';
  var email = formEl.dataset.vipsContactEmail || '';
  var url   = formEl.dataset.vipsPageUrl      ||
              (window.location.origin + window.location.pathname);

  var enquiryValue = (name && id) ? (name + ' - ' + id + ' - ' + url) : '';
  var subjectValue = name ? ('Request for Service: "' + name + '"') : '';

  var form;
  try { form = window.HubSpotFormsV4.getFormFromEvent(event); } catch (e) {}
  if (!form) return;

  // Try every combination of object-prefix + field name that a client
  // might use. HubSpot's setFieldValue no-ops on fields the form doesn't
  // have, so blasting these is safe.
  function setSafe(path, value) {
    if (!value) return;
    try { form.setFieldValue(path, value); } catch (e) {}
  }
  // Contact-side names
  setSafe('0-1/email',            email);
  setSafe('0-1/service_enquiry',  enquiryValue);
  // Ticket-side names (auto-create-ticket pattern)
  setSafe('0-5/email',            email);
  setSafe('0-5/subject',          subjectValue);
  setSafe('0-5/content',          enquiryValue);
  setSafe('0-5/related_service_enquiry', enquiryValue);

  // ── Hide-fields DISABLED FOR TESTING ──
  // Once prefill is verified working end-to-end, re-enable by uncommenting
  // the block below. Auto-prefilled routing fields shouldn't be visible
  // to members long-term.
  /*
  ['email', 'service_enquiry', 'subject', 'content', 'related_service_enquiry'].forEach(function (n) {
    var input = formEl.querySelector(
      'input[name="' + n + '"], textarea[name="' + n + '"], ' +
      'input[name$="/' + n + '"], textarea[name$="/' + n + '"]'
    );
    if (!input) return;
    var el = input.parentElement;
    while (el && el !== formEl) {
      var cls = el.className && el.className.toString ? el.className.toString() : '';
      if (cls.indexOf('hs-form-html__field') > -1 ||
          cls.indexOf('hs-form-field')       > -1 ||
          el.hasAttribute('data-field-name')) {
        el.style.display = 'none';
        return;
      }
      el = el.parentElement;
    }
    if (input.parentElement) input.parentElement.style.display = 'none';
  });
  */
});

// ─── V3 classic legacy forms — MutationObserver prefill ───
(function () {
  var configEl = document.getElementById('service-enquiry-config');
  if (!configEl) return;

  var cfg;
  try { cfg = JSON.parse(configEl.textContent || '{}'); } catch (e) { return; }
  if (!cfg.name || !cfg.id) return;

  var url = window.location.origin + window.location.pathname;
  var enquiryValue = cfg.name + ' - ' + cfg.id + ' - ' + url;
  var subjectValue = 'Request for Service: "' + cfg.name + '"';
  var emailValue   = cfg.email || '';

  function fireInputEvent(el) {
    try { el.dispatchEvent(new Event('input',  { bubbles: true })); } catch (e) {}
    try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
  }

  // Fills a form field by property name, matching every DOM shape
  // HubSpot renders:
  //   - <input name="subject">         — V3 classic contact fields (plain)
  //   - <input name="TICKET.subject">  — V3 with ticket fields (V3 dot prefix)
  //   - <input name="0-5/subject">     — V4 new editor (slashed object id prefix)
  //   - textarea variants of all three — for content / multi_line_text
  // Idempotent via data-vipsPrefilled flag.
  function fillField(name, value) {
    var field = document.querySelector(
      'input[name="'    + name + '"], textarea[name="'    + name + '"], ' +
      'input[name$="/' + name + '"], textarea[name$="/' + name + '"], ' +
      'input[name$=".' + name + '"], textarea[name$=".' + name + '"]'
    );
    if (field && !field.dataset.vipsPrefilled && value) {
      field.value = value;
      field.dataset.vipsPrefilled = '1';
      fireInputEvent(field);
      return true;
    }
    return field ? !!field.dataset.vipsPrefilled : false;
  }

  // Handles multiple form variants: older enquiry form (has
  // `service_enquiry`), newer Services Form (has `subject` + `content`
  // + `email` for auto-ticket routing), or both. Returns true only when
  // we've actually filled at least one field — prevents the observer
  // from disconnecting prematurely on the first tick before HubSpot has
  // even rendered the form inputs.
  function tryFill() {
    var fields = [
      { name: 'service_enquiry', value: enquiryValue },  // older enquiry form (contact-side)
      { name: 'subject',         value: subjectValue },  // Services Form (ticket name)
      { name: 'content',         value: enquiryValue },  // Services Form (ticket description)
      { name: 'email',           value: emailValue   }
    ];
    var found  = 0;   // form fields that exist in DOM
    var filled = 0;   // of those, ones we successfully populated
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      if (!f.value) continue;
      var el = document.querySelector(
        'input[name="'    + f.name + '"], textarea[name="'    + f.name + '"], ' +
        'input[name$="/' + f.name + '"], textarea[name$="/' + f.name + '"], ' +
        'input[name$=".' + f.name + '"], textarea[name$=".' + f.name + '"]'
      );
      if (!el) continue;                          // not rendered yet → keep watching
      found++;
      if (fillField(f.name, f.value)) filled++;
    }
    // Only signal "done" when we've had something to fill AND filled it.
    // If nothing's rendered yet (found === 0), stay observing.
    return found > 0 && filled === found;
  }

  if (tryFill()) return;

  var obs = new MutationObserver(function () { if (tryFill()) cleanup(); });
  var timer = setTimeout(cleanup, 10000);
  function cleanup() { obs.disconnect(); clearTimeout(timer); }
  obs.observe(document.body, { childList: true, subtree: true });
})();
