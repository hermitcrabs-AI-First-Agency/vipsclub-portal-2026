/* ============================================================
   VIPSCLUB Portal 2026 — Referral Submit Form V2 JS

   Prefills the "Refer a friend Form" (V4 new editor) on the
   /refer-a-friend page:

     • referral_source_email  ← logged-in member's email
                                (data-refemail on .referral-submit-form-v2__card)
     • referred_service       ← "<name> - <hubdb_row_id> - <full url>"
                                when the URL carried ?service=<hubdb_row_id>
                                (data-service-id + data-service-name on card)

   Uses the HubSpotFormsV4 events API — the `hs-form-event:on-ready`
   event fires once the developer embed has mounted the form. Listener
   is registered at module-load time so it catches the ready event
   regardless of ordering. Both fields are safe to no-op if the form
   doesn't have them (setFieldValue silently ignores unknown fields).
   ============================================================ */

window.addEventListener('hs-form-event:on-ready', function (event) {
  if (!event || !event.detail || !event.detail.formId) return;

  // Find the wrapper for this form instance. We scope by the specific
  // formId so multiple form instances on the same page don't collide.
  var formEl = document.querySelector(
    '.hs-form-html[data-form-id="' + event.detail.formId + '"]'
  );
  if (!formEl) return;
  var card = formEl.closest('.referral-submit-form-v2__card');
  if (!card) return;

  var refEmail    = (card.getAttribute('data-refemail')      || '').trim();
  var serviceId   = (card.getAttribute('data-service-id')    || '').trim();
  var serviceName = (card.getAttribute('data-service-name')  || '').trim();

  var referredServiceValue = '';
  if (serviceId && serviceName) {
    referredServiceValue =
      serviceName + ' - ' + serviceId + ' - ' +
      window.location.origin + window.location.pathname;
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
});
