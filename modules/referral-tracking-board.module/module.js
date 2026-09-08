/* ============================================================
   VIPSCLUB Portal 2026 — Referral Tracking Board
   Client-side date formatting (HubL date formatters are unreliable
   on raw CRM strings — same approach used in my-deals module).
   ============================================================ */

(function () {
  'use strict';

  var MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function formatDate(raw) {
    if (!raw) return '—';
    var d;
    if (/^\d{4}-\d{2}-\d{2}/.test(raw))      d = new Date(raw);
    else if (/^\d{10,}$/.test(raw))          d = new Date(parseInt(raw, 10));
    else                                      d = new Date(raw);
    if (isNaN(d.getTime())) return '—';
    return MONTHS_SHORT[d.getMonth()] + ' ' + pad2(d.getDate()) + ', ' + d.getFullYear();
  }

  document.querySelectorAll('.referral-tracking-board__date[data-date]').forEach(function (el) {
    el.textContent = formatDate(el.getAttribute('data-date'));
  });
}());
