/* ============================================================
   VIPSCLUB Portal 2026 — Referral Banner
   Copy referral link to clipboard
   ============================================================ */

(function () {
  'use strict';

  var btn = document.getElementById('referral-copy-btn');
  if (!btn) return;

  var banner = btn.closest('[data-referral-url]');
  var referralUrl = banner ? banner.dataset.referralUrl : '';

  btn.addEventListener('click', function () {
    if (!referralUrl) return;

    var successText = btn.dataset.successText || 'Copied!';
    var defaultText = btn.dataset.defaultText || 'Copy Link';
    var textEl = btn.querySelector('.referral-copy-btn__text');

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(referralUrl).then(showSuccess).catch(fallbackCopy);
    } else {
      fallbackCopy();
    }

    function fallbackCopy() {
      var ta = document.createElement('textarea');
      ta.value = referralUrl;
      ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { document.execCommand('copy'); } catch (e) { /* silent fail */ }
      document.body.removeChild(ta);
      showSuccess();
    }

    function showSuccess() {
      if (textEl) textEl.textContent = successText;
      btn.setAttribute('aria-label', successText);
      setTimeout(function () {
        if (textEl) textEl.textContent = defaultText;
        btn.setAttribute('aria-label', 'Copy your referral link to clipboard');
      }, 2000);
    }
  });
}());
