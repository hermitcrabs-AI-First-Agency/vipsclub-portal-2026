/* ============================================================
   VIPSCLUB Portal 2026 — My Deals Module JS
   Handles: stage badge labels, filter tabs (mapped from dealstage),
   search, row → detail toggle, back to list, modal, edit-form toggle,
   deal progress timeline state, days-remaining computation.
   Vanilla JS only — no dependencies.
   ============================================================ */

(function () {
  'use strict';

  var module = document.querySelector('.my-deals');
  if (!module) return;

  /* ── Deal Progress (source of truth) ────────────────────────────────
     `deal_progress` is a custom Deal enum property populated by the
     `Deal — Stage Change` workflow. Each value maps to a portalStage
     (drives CSS + timeline), a display label, and a filterCategory
     (drives the filter tabs). All UI decisions read from this map
     when `data-deal-progress` is set on the element. */
  var DEAL_PROGRESS_INFO = {
    prospecting:            { portalStage: 'prospect',     label: 'PROSPECTING',   shortLabel: 'Prospecting',   filterCategory: 'pending'  },
    in_progress:            { portalStage: 'engagement',   label: 'IN PROGRESS',   shortLabel: 'In Progress',   filterCategory: 'active'   },
    conditional_exchange:   { portalStage: 'conditional',  label: 'CONDITIONAL',   shortLabel: 'Conditional',   filterCategory: 'active'   },
    unconditional_exchange: { portalStage: 'post_exchange',label: 'UNCONDITIONAL', shortLabel: 'Unconditional', filterCategory: 'active'   },
    settled:                { portalStage: 'settled',      label: 'SETTLED',       shortLabel: 'Settled',       filterCategory: 'archived' },
    archived:               { portalStage: 'archived',     label: 'ARCHIVED',      shortLabel: 'Archived',      filterCategory: 'archived' }
  };

  /* ── Legacy fallback: raw HubSpot Sales Pipeline stage → portal stage ──
     Kept so any deal whose `deal_progress` hasn't been stamped yet by
     the workflow (or which lives on a pipeline with no workflow
     coverage) still renders with sensible labels + filter bucketing.
     Once the workflow has enrolled every existing deal this map is
     redundant, but harmless. */
  var STAGE_MAP = {
    appointmentscheduled:    DEAL_PROGRESS_INFO.prospecting,
    qualifiedtobuy:          DEAL_PROGRESS_INFO.in_progress,
    presentationscheduled:   DEAL_PROGRESS_INFO.in_progress,
    decisionmakerboughtin:   DEAL_PROGRESS_INFO.conditional_exchange,
    contractsent:            DEAL_PROGRESS_INFO.unconditional_exchange,
    closedwon:               DEAL_PROGRESS_INFO.settled,
    closedlost:              DEAL_PROGRESS_INFO.archived
  };

  /* Portal stage order for the 5-step Deal Progress timeline */
  var PROGRESS_ORDER = ['prospect', 'engagement', 'conditional', 'post_exchange', 'settled'];

  /* Prefer the workflow-populated `deal_progress` (data-deal-progress).
     Fall back to raw HubSpot stage id (data-stage) via STAGE_MAP.
     Final fallback: prospect / pending with the raw string as label. */
  function resolveStageInfo(el) {
    var progressVal = (el.getAttribute('data-deal-progress') || '').trim();
    if (progressVal && DEAL_PROGRESS_INFO[progressVal]) return DEAL_PROGRESS_INFO[progressVal];
    var raw = el.getAttribute('data-stage') || '';
    return STAGE_MAP[raw] || { portalStage: 'prospect', label: raw.toUpperCase(), shortLabel: raw, filterCategory: 'pending' };
  }

  /* ── Stage badges in the table: replace raw stage ID with friendly label + colour class ── */
  module.querySelectorAll('.my-deals__stage-badge').forEach(function (el) {
    var info = resolveStageInfo(el);
    el.textContent = info.label;
    el.classList.add('my-deals__stage-badge--' + info.portalStage);
  });

  /* ── Status-dot pill (detail view, top-right) ──
     Per client flowchart, this pill must show STATUS — not the granular
     stage name. Mapping (from STAGE_MAP.filterCategory):
       Prospect              → Pending
       Engagement, Conditional, Unconditional → Active
       Settled, Suspended    → Archive
     So we render the filterCategory label (Pending / Active / Archive)
     and class the pill by status, not by stage. */
  var STATUS_LABEL = { pending: 'Pending', active: 'Active', archived: 'Archive' };
  module.querySelectorAll('.my-deals__status-dot-pill--stage').forEach(function (el) {
    var info = resolveStageInfo(el);
    el.classList.add('my-deals__status-dot-pill--' + info.filterCategory);
    var labelEl = el.querySelector('[data-stage-pill-label]');
    if (labelEl) labelEl.textContent = STATUS_LABEL[info.filterCategory] || info.shortLabel;
  });

  /* Rows + cards: stamp a data-filter-category for the filter tabs */
  module.querySelectorAll('[data-stage]').forEach(function (el) {
    var info = resolveStageInfo(el);
    el.setAttribute('data-filter-category', info.filterCategory);
    el.setAttribute('data-portal-stage', info.portalStage);
  });

  /* ── Deal Progress accordion: mark each step's status (complete / current /
       not-started) AND auto-open the CURRENT step so the user sees its
       description by default. Stages before current are complete; stages
       after current are pending. ── */
  module.querySelectorAll('.my-deals__progress[data-stage]').forEach(function (container) {
    var info = resolveStageInfo(container);
    var currentIdx = PROGRESS_ORDER.indexOf(info.portalStage);
    container.querySelectorAll('.my-deals__progress-step').forEach(function (step) {
      var stageKey = step.getAttribute('data-step');
      var stepIdx = PROGRESS_ORDER.indexOf(stageKey);
      var stateEl = step.querySelector('.my-deals__progress-state');
      if (stepIdx < 0 || currentIdx < 0) {
        if (stateEl) stateEl.textContent = '';
        return;
      }
      if (stepIdx < currentIdx) {
        step.classList.add('is-complete');
        if (stateEl) stateEl.textContent = 'Complete';
      } else if (stepIdx === currentIdx) {
        step.classList.add('is-current');
        if (stateEl) stateEl.textContent = 'In Progress';
        /* Auto-open the current step (native <details>.open property) */
        step.open = true;
      } else {
        step.classList.add('is-pending');
        if (stateEl) stateEl.textContent = 'Not Started';
      }
    });
  });

  /* ── Days Remaining (Key Metrics block) ── */
  module.querySelectorAll('.days-remaining[data-closedate]').forEach(function (el) {
    var raw = el.getAttribute('data-closedate');
    if (!raw) { el.textContent = '—'; return; }
    var ms = parseInt(raw, 10);
    if (!ms) { el.textContent = '—'; return; }
    var diff = Math.ceil((ms - Date.now()) / 86400000);
    if (diff < 0)       el.textContent = 'Past due';
    else if (diff === 0) el.textContent = 'Today';
    else                 el.textContent = diff + (diff === 1 ? ' day' : ' days');
  });

  /* ── Filter Tabs ── */
  /* Scope to elements carrying [data-filter] so any other filter UI added
     in this module (date dropdown, etc.) doesn't accidentally trigger the
     stage-tab handler. */
  var filterTabs = module.querySelectorAll('.my-deals__filter-tab[data-filter]');
  var rowsAndCards = module.querySelectorAll('.my-deals__row, .my-deals__card');
  /* Default filter is "active" so the user lands on a focused work list,
     not their full deal history. Tab markup in module.html mirrors this
     with `is-active` on the Active tab. Empty-state messaging below
     handles the case where no deals match the default filter. */
  var currentFilter = 'active';
  var currentSearch = '';
  /* Date-range filter. `null` = All time (the dropdown's first option with
     value=""). Other values: this_month / last_3m / last_12m. Updated on
     the <select> change event. AND-combines with stage + search. */
  var currentDateFilter = null;

  /* Parse a row's data-createdate value into a Date or null.
     HubSpot crm_associations returns dates as epoch MILLISECONDS (per
     project memory feedback_hubl_crm_date_epoch_ms.md). Be defensive:
     handle ISO strings as a secondary path; everything else → null
     (which makes the date filter exclude that row when any period is
     active — fine because createdate is always populated by HubSpot). */
  function parseDealDate(raw) {
    if (!raw) return null;
    var str = String(raw).trim();
    if (!str || str === '—') return null;
    var d;
    if (/^\d{11,}$/.test(str)) {        /* epoch ms (11+ digits) */
      d = new Date(parseInt(str, 10));
    } else if (/^\d{10}$/.test(str)) {  /* epoch seconds */
      d = new Date(parseInt(str, 10) * 1000);
    } else if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      d = new Date(str);
    } else {
      d = new Date(str);
    }
    return isNaN(d.getTime()) ? null : d;
  }

  /* Lower-bound timestamp for a given period key. Rolling-days semantics
     per product decision (Option A). "This month" = 1st of current month
     (visitor's local TZ). All bounds are INCLUSIVE — a deal at exactly
     the bound IS inside the window. Future-dated deals are excluded by
     applyFilters() via an explicit upper bound (now). */
  function getMinTimestampForPeriod(period) {
    var now = new Date();
    if (period === 'this_month') {
      return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
    }
    if (period === 'last_3m') {
      var d3 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      d3.setDate(d3.getDate() - 90);
      return d3.getTime();
    }
    if (period === 'last_12m') {
      var d12 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      d12.setDate(d12.getDate() - 365);
      return d12.getTime();
    }
    return null; /* unknown period → no lower bound */
  }

  function matchesDateFilter(el) {
    if (!currentDateFilter) return true;
    var min = getMinTimestampForPeriod(currentDateFilter);
    if (min === null) return true;
    var d = parseDealDate(el.getAttribute('data-createdate'));
    if (!d) return false;
    var ts = d.getTime();
    /* Inclusive lower bound; future-dated deals excluded via Date.now() upper bound. */
    return ts >= min && ts <= (new Date()).getTime();
  }

  function applyFilters() {
    /* Track row + card counts separately so the pagination text (which lives
       in the desktop table footer) reflects only the table's visible rows. */
    var totalRows = 0;
    var visibleRows = 0;
    var visibleAny = 0;
    rowsAndCards.forEach(function (el) {
      var cat  = el.getAttribute('data-filter-category') || '';
      var text = el.textContent.toLowerCase();
      var matchFilter = (currentFilter === 'all') || (cat === currentFilter);
      var matchSearch = !currentSearch || text.indexOf(currentSearch) !== -1;
      var matchDate   = matchesDateFilter(el);
      var visible = matchFilter && matchSearch && matchDate;
      el.style.display = visible ? '' : 'none';
      if (el.classList.contains('my-deals__row')) {
        totalRows++;
        if (visible) visibleRows++;
      }
      if (visible) visibleAny++;
    });

    /* Recompute the pagination text so it matches what's actually visible.
       Was server-rendered as "Showing 1-N of N" — stale after any filter. */
    var paginationEl = module.querySelector('.my-deals__pagination-info');
    if (paginationEl && totalRows > 0) {
      if (visibleRows === 0) {
        paginationEl.textContent = 'Showing 0 of ' + totalRows;
      } else {
        paginationEl.textContent = 'Showing 1-' + visibleRows + ' of ' + totalRows;
      }
    }

    /* Show / hide an empty-state message when the filter produces zero matches
       but deals DO exist server-side. The element is JS-injected on first run
       so we don't touch the server-rendered empty block (which is gated on
       `deals | length == 0`). */
    var emptyMatch = module.querySelector('.my-deals__empty--no-match');
    if (visibleAny === 0 && totalRows > 0) {
      if (!emptyMatch) {
        emptyMatch = document.createElement('p');
        emptyMatch.className = 'my-deals__empty my-deals__empty--no-match';
        emptyMatch.setAttribute('role', 'status');
        emptyMatch.textContent = 'No deals match this filter. Try a different tab or clear search.';
        var tableWrap = module.querySelector('.my-deals__table-wrap');
        if (tableWrap && tableWrap.parentNode) {
          tableWrap.parentNode.insertBefore(emptyMatch, tableWrap.nextSibling);
        } else {
          module.appendChild(emptyMatch);
        }
      }
      /* Show. Set both hidden attr AND inline style so any CSS rule on
         `.my-deals__empty { display: block }` can't override the toggle. */
      emptyMatch.hidden = false;
      emptyMatch.style.display = '';
    } else if (emptyMatch) {
      emptyMatch.hidden = true;
      emptyMatch.style.display = 'none';
    }
  }

  filterTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      filterTabs.forEach(function (t) {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      currentFilter = tab.getAttribute('data-filter') || 'all';
      applyFilters();
    });
  });

  /* ── Date-range filter (dropdown) ──
     Empty value = "All time" (clears the filter). AND-combines with the
     stage tabs + search in applyFilters(). */
  var dateSelect = module.querySelector('[data-deal-date-filter]');
  if (dateSelect) {
    dateSelect.addEventListener('change', function () {
      var v = dateSelect.value;
      currentDateFilter = v || null;
      applyFilters();
    });
  }

  /* ── Search ── */
  var searchInput = module.querySelector('.my-deals__search-input');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      currentSearch = (searchInput.value || '').toLowerCase().trim();
      applyFilters();
    });
  }

  /* ── List ↔ Detail view toggle ── */
  var listView = module.querySelector('#my-deals-list');
  var detailViews = module.querySelectorAll('.my-deals__detail-view');

  /* List/detail split is now URL-driven, not client-side visibility
     (see module.html header comment for the CRM-call-limit rationale).
     Row click → navigate to ?id=<dealId> → detail-mode HubL renders
     only THAT deal's card. Back link → navigate to the pathname with
     no query → list-mode HubL renders the deals list. Detail hidden
     divs no longer exist client-side; each URL is its own page. */

  function urlWithId(dealId) {
    var u = new URL(window.location.href);
    u.searchParams.set('id', dealId);
    return u.pathname + u.search;
  }
  function urlList() {
    return window.location.pathname;
  }

  rowsAndCards.forEach(function (el) {
    el.addEventListener('click', function () {
      var dealId = el.getAttribute('data-deal-id');
      if (dealId) window.location.href = urlWithId(dealId);
    });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        var dealId = el.getAttribute('data-deal-id');
        if (dealId) window.location.href = urlWithId(dealId);
      }
    });
  });

  module.querySelectorAll('[data-action="back-to-list"]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      window.location.href = urlList();
    });
  });

  /* Prefill the detail view's Key-Metrics form on page load when we're
     in detail mode (i.e. the detail card is already in the DOM at
     document ready — no visibility toggle needed anymore). */
  var initialDetail = module.querySelector('.my-deals__detail-view');
  if (initialDetail) {
    var initialEditForm = initialDetail.querySelector('.my-deals__edit-form');
    if (initialEditForm) prefillEditForm(initialEditForm);
  }

  /* ── Edit Details — lock / unlock the inline Key Metrics form ──
     Locked (default): pointer-events: none via .is-locked class + the
     `inert` attribute for full keyboard / a11y blocking. Submit button
     hidden by CSS. Unlocked: both removed → form becomes fully usable. */
  module.querySelectorAll('[data-action="toggle-edit-lock"]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var targetId = btn.getAttribute('aria-controls');
      if (!targetId) return;
      var formEl = document.getElementById(targetId);
      if (!formEl) return;
      var isLocked = formEl.classList.contains('is-locked');
      if (isLocked) {
        formEl.classList.remove('is-locked');
        formEl.removeAttribute('inert');
        btn.textContent = 'Cancel';
      } else {
        formEl.classList.add('is-locked');
        formEl.setAttribute('inert', '');
        btn.textContent = btn.getAttribute('data-edit-text') || 'Edit Details';
      }
    });
  });

  /* Apply initial inert state to every locked edit-form. HTML's `inert`
     attribute isn't a valid HubL boolean (it's empty string), so we set
     it in JS to keep markup clean. */
  module.querySelectorAll('.my-deals__edit-form.is-locked').forEach(function (f) {
    f.setAttribute('inert', '');
  });

  /* ── Prefill the Key-Metrics HubSpot form with this deal's values ──
     The form is rendered inline (no toggle, no separate save button — it has
     its own submit). Each deal's detail-view contains its own form instance.
     Called from showDetail() whenever a detail view is shown. Field matchers
     use loose `name*=` substrings because the form uses TICKET property
     names which we don't always know exactly. ── */
  function prefillEditForm(formEl) {
    if (!formEl) return;
    var values = {
      email:            formEl.dataset.prefillEmail || '',
      amount:           formEl.dataset.prefillAmount || '',
      industry:         formEl.dataset.prefillIndustry || '',
      commission:       formEl.dataset.prefillCommission || '',
      propertyAddress:  formEl.dataset.prefillPropertyAddress || '',
      dealname:         formEl.dataset.prefillDealname || '',
      pipeline:         formEl.dataset.prefillPipeline || '',
      stage:            formEl.dataset.prefillStage || ''
    };
    var matchers = {
      email:            ['input[name="email"]'],
      amount:           ['input[name*="deal_amount" i]', 'input[name*="amount" i]:not([type="hidden"])'],
      industry:         ['select[name*="industry" i]', 'input[name*="industry" i]:not([type="hidden"])'],
      commission:       ['input[name*="commission" i]:not([type="hidden"])'],
      propertyAddress:  ['input[name*="property_address" i]', 'input[name*="property" i]:not([type="hidden"])'],
      dealname:         ['input[name*="deal_name" i]', 'input[name*="dealname" i]:not([type="hidden"])'],
      pipeline:         ['select[name*="pipeline" i]', 'input[name*="pipeline" i]:not([type="hidden"])'],
      stage:            ['select[name*="status" i]', 'select[name*="stage" i]', 'input[name*="status" i]:not([type="hidden"])']
    };

    /* Poll the form for up to 5s — HubSpot mounts it asynchronously. */
    var attempts = 0;
    var maxAttempts = 50;
    var interval = setInterval(function () {
      attempts++;
      var anyMissing = false;
      Object.keys(values).forEach(function (key) {
        if (!values[key]) return;
        var sels = matchers[key] || [];
        for (var i = 0; i < sels.length; i++) {
          var input = formEl.querySelector(sels[i]);
          if (input) {
            if (input.value !== values[key]) { setReactValue(input, values[key]); anyMissing = true; }
            return;
          }
        }
        anyMissing = true;
      });
      /* Also collapse hidden fields + rewrite the submit label. Both run
         every tick because HubSpot may re-render either after we initially
         applied changes — keep them sticky throughout the form's lifetime. */
      collapseHiddenFields(formEl);
      relabelEditFormSubmit(formEl);
      if (!anyMissing || attempts >= maxAttempts) clearInterval(interval);
    }, 100);
  }

  /* ── Modal — Register a Deal ── */
  var modal = module.querySelector('#my-deals-modal');
  var modalClose = modal ? modal.querySelector('.my-deals__modal-close') : null;
  var addDealBtns = module.querySelectorAll('.my-deals__add-btn');

  /* ── HubSpot forms use React internally — setting input.value directly
       does NOT update React's state and gets overwritten on next render.
       Use the prototype's native setter then dispatch input+change events. ── */
  function setReactValue(input, value) {
    var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    if (setter && setter.set) setter.set.call(input, value);
    else input.value = value;
    input.dispatchEvent(new Event('input',  { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /* ── Multi-pass collapse of any form element that takes vertical space
       but has no visible content. Hidden-only fields, empty richtext,
       empty legal-consent, AND wrappers whose visible children all got
       collapsed in a previous pass (cascading up). Inline `display:none`
       beats any CSS. Takes a root element so it works for the modal OR
       any inline edit-form. ── */
  function collapseHiddenFields(root) {
    if (!root) return;
    var selectors = [
      '.hs-form-field',
      '.hs-richtext',
      '.hs_recaptcha',
      '.legal-consent-container',
      '.hs-form > div',
      '.hs-form fieldset',
      '.hs-form .form-columns-1',
      '.hs-form .form-columns-2',
      '.hs-form .form-columns-3'
    ];

    function hide(el) {
      el.dataset.collapsedHidden = '1';
      el.style.cssText = 'display:none !important;height:0 !important;margin:0 !important;padding:0 !important;border:0 !important;';
    }

    function isVisible(el) {
      if (el.dataset && el.dataset.collapsedHidden === '1') return false;
      var s = (el.style && el.style.cssText || '').toLowerCase();
      if (s.indexOf('display:none') > -1 || s.indexOf('display: none') > -1) return false;
      return true;
    }

    function hasOnlyHiddenContent(el) {
      var inputs = el.querySelectorAll('input, select, textarea');
      if (inputs.length === 0) {
        /* No inputs at all — if there's no visible text either, collapse. */
        return !(el.textContent && el.textContent.trim().length > 0);
      }
      /* If every input is type=hidden, treat as collapsible. */
      for (var i = 0; i < inputs.length; i++) {
        if (inputs[i].type !== 'hidden') return false;
      }
      return true;
    }

    function hasNoVisibleDirectChildren(el) {
      if (el.children.length === 0) return false;
      for (var i = 0; i < el.children.length; i++) {
        if (isVisible(el.children[i])) return false;
      }
      return true;
    }

    /* Multi-pass: after hiding children in pass N, their parents may also
       qualify in pass N+1. Cap at 6 passes — well over what any real form
       needs and stops accidental runaway loops. */
    for (var pass = 0; pass < 6; pass++) {
      var changed = false;
      root.querySelectorAll(selectors.join(', ')).forEach(function (el) {
        if (el.dataset.collapsedHidden === '1') return;
        if (hasOnlyHiddenContent(el) || hasNoVisibleDirectChildren(el)) {
          hide(el);
          changed = true;
        }
      });
      if (!changed) break;
    }
  }

  /* ── Rewrite the inline edit-form submit button's label to "Save details".
       The same HubSpot form is used by both the Register-a-Deal modal AND
       the Key Metrics edit form, so we can't change the label in HubSpot
       (would affect both). Override in JS, in the form's local scope only. */
  function relabelEditFormSubmit(formEl) {
    if (!formEl) return;
    var TEXT = 'Save details';
    var submit = formEl.querySelector('input[type="submit"], button[type="submit"], .hs-button');
    if (!submit) return;
    if (submit.tagName === 'INPUT') {
      if (submit.value !== TEXT) submit.value = TEXT;
    } else {
      if (submit.textContent !== TEXT) submit.textContent = TEXT;
    }
  }

  /* ── Prefill ONLY the top "Email" field with the logged-in contact's
       email (this is the form's contact-email field that ties the submission
       back to the CRM contact). Lead - First Name / Lead - Last Name /
       Lead - Email are about the new lead, not the partner — left blank
       per client spec. ── */
  function prefillModalForm() {
    if (!modal) return;
    var email = modal.dataset.prefillEmail || '';
    if (!email) return;

    /* Strict matcher: ONLY the exact-name "email" field. We deliberately
       avoid `[name*="email" i]` because it would also match a Lead-Email
       custom field (e.g. `lead___email`) which must stay empty. */
    function findEmail() {
      return modal.querySelector('input[name="email"]');
    }

    var attempts = 0;
    var maxAttempts = 50; /* 50 × 100ms = 5s */
    var interval = setInterval(function () {
      attempts++;
      var input = findEmail();
      if (input && input.value !== email) setReactValue(input, email);
      collapseHiddenFields(modal);
      if ((input && input.value === email) || attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 100);
  }

  function openModal() {
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    prefillModalForm();
  }
  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  addDealBtns.forEach(function (b) { b.addEventListener('click', openModal); });
  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal && !modal.hidden) closeModal();
  });

  /* Initial filter run */
  applyFilters();

  /* ── Reload page after any HubSpot form on this module submits ──
     Both the Register-a-Deal modal and the Key Metrics edit form submit to
     a workflow that creates/updates a Deal. Reloading after a short delay
     lets that workflow finish, then the next page render pulls the fresh
     CRM data via crm_associations(). Uses HubSpot's standard form
     postMessage event so it fires only on a SUCCESSFUL submission (errors
     don't trigger 'onFormSubmitted'). Guarded so duplicate clicks don't
     schedule multiple reloads. */
  var reloadScheduled = false;
  window.addEventListener('message', function (event) {
    if (reloadScheduled) return;
    var d = event && event.data;
    if (!d) return;
    if (d.type === 'hsFormCallback' && d.eventName === 'onFormSubmitted') {
      reloadScheduled = true;
      setTimeout(function () { window.location.reload(); }, 4000);
    }
  });

  /* ── Format dates (raw ISO strings from CRM rendered client-side) ── */
  var MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function formatDate(raw, longForm) {
    if (!raw) return '—';
    var d;
    if (/^\d{4}-\d{2}-\d{2}/.test(raw))      d = new Date(raw);
    else if (/^\d{10,}$/.test(raw))          d = new Date(parseInt(raw, 10));
    else                                      d = new Date(raw);
    if (isNaN(d.getTime())) return '—';
    if (longForm) {
      return pad2(d.getDate()) + ' ' + MONTHS_SHORT[d.getMonth()] + ' ' + d.getFullYear();
    }
    return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear();
  }

  module.querySelectorAll('.my-deals__date[data-date]').forEach(function (el) {
    var raw = el.getAttribute('data-date');
    var longForm = el.classList.contains('my-deals__date--long');
    el.textContent = formatDate(raw, longForm);
  });

  /* ── Earnings Breakdown — sum data-amount across rows by payment status ── */
  function fmtMoney(n) {
    // AUD-locale thousands separators, no decimals (referral fees are
    // typically whole-dollar amounts on this account). Prefix "$" —
    // matches the deal-card fee rendering in module.html.
    return '$' + (n || 0).toLocaleString('en-AU', { maximumFractionDigits: 0 });
  }

  (function computeEarnings() {
    /* First stat card (Total No. of Deals) is rendered server-side via
       `{{ deals | length }}` in module.html — no JS hydration needed.
       This block hydrates the two currency cards (Earned / Paid).

       Property model (updated) — the ONLY input to the sum is
       `referral_fee_amount` (number, AUD, on the Deals object). The
       free-text `referral_fee` (Referral Fee Override) is display-only
       and never contributes to the totals, so "TBD", "3%", "1/2", etc.
       naturally get zero'd out — no parser needed.

       MD-M2 Total Fees Earned — sum of referral_fee_amount across all
       fetched deals; empty amounts are skipped.

       MD-M3 Total Fees Paid — same sum, restricted to deals whose
       vc_fee_paid_date is populated. Date is ground truth here; the
       vc_payment_status enum is intentionally NOT used because the two
       can drift when ops updates one but not the other.

       When a total is 0, leave the server-rendered fallback string
       (e.g. "WIP (Contact BDM)") in place AND keep the --fallback
       modifier class so the smaller font CSS rule kicks in. When the
       total is > 0, write the formatted currency and strip the modifier
       so the value renders at the full 28px stat size. */

    var rows = module.querySelectorAll('.my-deals__row[data-amount]');
    var totals = { earned: 0, paid: 0 };
    rows.forEach(function (r) {
      var feeRaw = (r.getAttribute('data-referral-fee-amount') || '').trim();
      if (!feeRaw) return; // no numeric fee → skip
      var fee = parseFloat(feeRaw);
      if (!isFinite(fee) || fee <= 0) return;
      var paidDate = (r.getAttribute('data-fee-paid-date') || '').trim();
      totals.earned += fee;
      if (paidDate) totals.paid += fee;
    });

    function renderStat(el, total) {
      if (!el) return;
      if (total > 0) {
        el.textContent = fmtMoney(total);
        el.classList.remove('my-deals__earnings-value--fallback');
      } else {
        /* Leave the server-rendered fallback textContent in place;
           just ensure the modifier class is on so CSS shrinks the font. */
        el.classList.add('my-deals__earnings-value--fallback');
      }
    }

    renderStat(module.querySelector('[data-earnings="earned"]'), totals.earned);
    renderStat(module.querySelector('[data-earnings="paid"]'),   totals.paid);
  }());

  /* ── Register-a-Deal modal — prefill the logged-in member's email ──
     The modal-overlay carries `data-prefill-email={{ contact.email }}` which
     the server renders when the member is logged in. When the V4 form mounts
     inside the modal, hook `hs-form-event:on-ready`, look up the form via
     HubSpotFormsV4, and set the Contact email field so the submitter is
     identified without them retyping.

     Field path `0-1/email` targets the standard HubSpot Contact.email
     property. The form's other email field is `0-5/deal_email` (Lead
     Email — the person the deal is FOR, usually different from the
     submitter), so we intentionally do NOT prefill that one. */
  window.addEventListener('hs-form-event:on-ready', function (event) {
    if (!event || !event.detail || !event.detail.formId) return;
    var formEl = document.querySelector(
      '.hs-form-html[data-form-id="' + event.detail.formId + '"]'
    );
    if (!formEl) return;
    var modal = formEl.closest('.my-deals__modal-overlay');
    if (!modal) return; // form is somewhere else on the page

    var email = (modal.getAttribute('data-prefill-email') || '').trim();
    if (!email) return;

    var form;
    try { form = window.HubSpotFormsV4.getFormFromEvent(event); } catch (e) {}
    if (!form) return;

    try { form.setFieldValue('0-1/email', email); } catch (e) {}
  });

  /* ── Key Metrics form — prefill deal_id + subject + email ──
     The form on the deal detail page is chosen by HubDB lookup from
     deal.vc_deal_type. Its `deal_id` (hidden ticket field) tells the
     ticket→deal update workflow which deal to write back to. Subject
     defaults to a readable "Key Metrics — <deal name>" so tickets are
     easy to find in HubSpot. Email is the logged-in member's, so the
     submitter is identified.
     Wrapper class `my-deals__key-metrics-form` scopes this listener
     to the Key Metrics form and won't fire for the register-a-deal
     modal (different wrapper) or the referral forms (different
     module). */
  window.addEventListener('hs-form-event:on-ready', function (event) {
    if (!event || !event.detail || !event.detail.formId) return;
    var formEl = document.querySelector(
      '.hs-form-html[data-form-id="' + event.detail.formId + '"]'
    );
    if (!formEl) return;
    var wrap = formEl.closest('.my-deals__key-metrics-form');
    if (!wrap) return;

    var dealId   = (wrap.getAttribute('data-deal-id')       || '').trim();
    var dealName = (wrap.getAttribute('data-deal-name')     || '').trim();
    var email    = (wrap.getAttribute('data-contact-email') || '').trim();

    var form;
    try { form = window.HubSpotFormsV4.getFormFromEvent(event); } catch (e) {}
    if (!form) return;

    function setSafe(path, value) {
      if (!value) return;
      try { form.setFieldValue(path, value); } catch (e) {}
    }

    setSafe('0-5/deal_id', dealId);
    if (dealName) setSafe('0-5/subject', 'Key Metrics — ' + dealName);
    setSafe('0-1/email', email);

    /* MD-V1 read-only lock: if this contact is an IP partner on the
       deal, disable every input + hide the submit button so the form
       is view-only. Runs once on form-ready; the read-only notice
       above the form (rendered by HubL) explains why. */
    if ((wrap.getAttribute('data-role') || '') === 'ip_partner') {
      wrap.classList.add('my-deals__key-metrics-form--readonly');
      var lock = function () {
        formEl.querySelectorAll('input, textarea, select').forEach(function (inp) {
          inp.disabled = true;
        });
        formEl.querySelectorAll('button[type="submit"], .hsfc-Button, .hsfc-NavigationRow').forEach(function (btn) {
          btn.style.display = 'none';
        });
      };
      lock();
      /* HubSpot re-renders parts of the V4 form on internal state
         change (e.g. field validation) — re-apply the lock a moment
         later to catch anything the initial pass missed. */
      setTimeout(lock, 300);
    }
  });

}());
