/* ============================================================
   VIPSCLUB Portal 2026 — Account Profile Form Module JS
   Tab switching + Edit toggle + Form prefill + Avatar uploader with crop modal
   ============================================================ */

/* ── V4 Wealth Hub form — "Add another property / loan" checkbox-as-button ──
   The form's three "add another" fields are checkboxes wired to conditional
   logic: setting them true reveals the next step's fields. CSS reshapes
   them as centred buttons; this listener converts a click into
     1. set checkbox to true (both via DOM and HubSpotFormsV4 setter)
     2. click the form's native "Next" button so the user auto-advances
   Registered at script-load time so it beats the deferred embed script
   firing the ready event.  */
(function () {
  'use strict';

  var WEALTH_FORM_ID = 'ffe43d50-4c2e-4cd4-93f6-7ffaeeedbdb3';

  // "Add another" boolean checkboxes rendered as a single centred button
  // that also advances to the next step on click. `activeLabel` is the
  // copy shown AFTER the toggle is on (click again to revert).
  var ADD_BUTTONS = [
    { name: 'p1_add_another_property', activeLabel: 'Remove Property' },
    { name: 'p2_add_another_property', activeLabel: 'Remove Property' },
    { name: 'add_another_loan',        activeLabel: 'Remove Loan' }
  ];

  // Boolean checkboxes rendered as a Yes / No button pair. No step
  // navigation — the checkbox controls conditional visibility of fields
  // WITHIN the same step, so we just want a clearer yes/no UX.
  var YESNO_BUTTONS = [
    { name: 'do_you_own_a_business' }
  ];

  window.addEventListener('hs-form-event:on-ready', function (readyEvent) {
    if (!readyEvent || !readyEvent.detail) return;
    if (readyEvent.detail.formId !== WEALTH_FORM_ID) return;

    var formEl = document.querySelector('.hs-form-html[data-form-id="' + WEALTH_FORM_ID + '"]');
    if (!formEl) return;

    var formInstance = null;
    try { formInstance = window.HubSpotFormsV4.getFormFromEvent(readyEvent); } catch (e) {}

    // ── Prefill every field the JSON blob has a value for ──
    // The blob is rendered server-side from contact.<property> in HubL.
    // Each key that has a non-empty value becomes a setFieldValue call.
    // Handles types:
    //   - strings & numbers → passed through as-is
    //   - HubSpot boolean strings ("true"/"false") → coerced to real bool
    //   - HubSpot multi-select strings ("A;B;C") → split into array
    // Silent on failures — a form field not present for that key is
    // ignored; the loop continues.
    var prefillEl = document.getElementById('wealth-prefill-data');
    if (prefillEl && formInstance) {
      var prefillData = {};
      try { prefillData = JSON.parse(prefillEl.textContent || '{}'); } catch (e) {}

      Object.keys(prefillData).forEach(function (key) {
        var val = prefillData[key];
        if (val === null || val === undefined || val === '') return;

        // Booleans stored as "true"/"false" strings on the contact
        if (val === 'true')  val = true;
        else if (val === 'false') val = false;

        // Multi-select stored as semicolon-joined string
        else if (typeof val === 'string' && val.indexOf(';') !== -1) {
          val = val.split(';').map(function (s) { return s.trim(); }).filter(Boolean);
        }

        try { formInstance.setFieldValue('0-1/' + key, val); } catch (e) {}
      });
    }

    // ── Edit / Cancel toggle (only present when wealth data exists) ──
    var editBtn = document.getElementById('edit-wealth-btn');
    var formWrap = document.getElementById('wealth-form-wrap');
    var summary  = document.getElementById('wealth-summary');
    if (editBtn && formWrap) {
      editBtn.addEventListener('click', function () {
        var wasPressed = editBtn.getAttribute('aria-pressed') === 'true';
        var editText   = editBtn.dataset.editText   || 'Edit';
        var cancelText = editBtn.dataset.cancelText || 'Cancel';
        if (wasPressed) {
          // Cancel — hide the form, show the summary
          formWrap.classList.add('is-collapsed');
          if (summary) summary.classList.remove('is-hidden');
          editBtn.setAttribute('aria-pressed', 'false');
          editBtn.textContent = editText;
        } else {
          // Edit — reveal the form, hide the summary
          formWrap.classList.remove('is-collapsed');
          if (summary) summary.classList.add('is-hidden');
          editBtn.setAttribute('aria-pressed', 'true');
          editBtn.textContent = cancelText;
        }
      });
    }

    // Find the Next button on the currently VISIBLE step. All steps sit
    // in the DOM at once; hidden ones have `style="display:none"`. HubSpot
    // structures the buttons as:
    //   <div class="hsfc-NavigationRow">
    //     <div class="hsfc-NavigationRow__Buttons">
    //       <button class="hsfc-Button">Previous</button>
    //       <button class="hsfc-Button">Next</button>
    //     </div>
    //   </div>
    // The Next button is always the LAST child .hsfc-Button in the
    // NavigationRow. That's more reliable than scanning all buttons and
    // matching textContent (which loses on tricky whitespace or when
    // React re-renders during navigation).
    function findNextButton(fromEl) {
      // Prefer walking from the clicked field to its enclosing step —
      // that's where the button we want lives.
      var step = fromEl && fromEl.closest ? fromEl.closest('.hsfc-Step') : null;
      var navRow = step ? step.querySelector('.hsfc-NavigationRow') : null;

      // Fallback: if the step's own NavigationRow can't be found (React
      // may have detached the parent during a re-render), scan for the
      // visible step and use its NavigationRow.
      if (!navRow) {
        var allSteps = formEl.querySelectorAll('.hsfc-Step');
        for (var i = 0; i < allSteps.length; i++) {
          var s = allSteps[i];
          if (s.style.display === 'none' || s.hidden) continue;
          navRow = s.querySelector('.hsfc-NavigationRow');
          if (navRow) break;
        }
      }
      if (!navRow) return null;

      var btns = navRow.querySelectorAll('button.hsfc-Button');
      if (!btns.length) return null;

      // Prefer the last Button in the row (Next sits after Previous). If
      // there's only one, that's the Next (first step has no Previous).
      var last = btns[btns.length - 1];
      var txt  = (last.textContent || '').trim().toLowerCase();
      if (txt === 'next') return last;

      // Otherwise scan for any button whose visible text is "Next"
      for (var j = 0; j < btns.length; j++) {
        var t = (btns[j].textContent || '').trim().toLowerCase();
        if (t === 'next') return btns[j];
      }
      return null;
    }

    function getTextSpan(labelEl) {
      // Structure per HubSpot new-editor: <label><input><span><span>TEXT</span></span></label>
      // Innermost <span> holds the visible copy.
      var inner = labelEl.querySelector('span > span');
      return inner || labelEl.querySelector('span');
    }

    function updateLabelState(labelEl, isChecked, defaultLabel, activeLabel) {
      var span = getTextSpan(labelEl);
      if (!span) return;
      if (isChecked) {
        if (!span.dataset.vipsOriginal) span.dataset.vipsOriginal = span.textContent;
        span.textContent = activeLabel;
        labelEl.classList.add('vips-remove-state');
      } else {
        span.textContent = span.dataset.vipsOriginal || defaultLabel || span.textContent;
        labelEl.classList.remove('vips-remove-state');
      }
    }

    // ── Delegated click listener on the form container ──
    // Bind ONCE per form-ready. Any click inside the form is inspected:
    // if it landed on/inside a label containing one of our ADD_BUTTONS
    // checkboxes, we handle it. This survives lazy-rendered steps —
    // HubSpot doesn't put all step DOM in place at form-ready time, so
    // per-checkbox forEach binding at load only catches step-0 fields.
    formEl.addEventListener('click', function (e) {
      var label = e.target.closest && e.target.closest('label.hsfc-FieldLabel');
      if (!label || !formEl.contains(label)) return;

      var checkbox = label.querySelector('input.hsfc-CheckboxInput[type="checkbox"]');
      if (!checkbox) return;

      var name = checkbox.name || '';
      // ADD_BUTTONS names are `p1_add_another_property` etc. HubSpot
      // prefixes with `0-1/`.
      var cfg = null;
      for (var i = 0; i < ADD_BUTTONS.length; i++) {
        if (name === '0-1/' + ADD_BUTTONS[i].name ||
            name.slice(-ADD_BUTTONS[i].name.length - 1) === '/' + ADD_BUTTONS[i].name) {
          cfg = ADD_BUTTONS[i]; break;
        }
      }
      if (!cfg) return;

      // Ignore the synthetic click that native label→input propagation
      // fires on the checkbox (bubbles back to us).
      if (e.target === checkbox) return;

      e.preventDefault();
      e.stopPropagation();

      var willBeChecked = !checkbox.checked;

      // Native click + HubSpot's official setter for React-state parity
      checkbox.click();
      if (formInstance) {
        try { formInstance.setFieldValue('0-1/' + cfg.name, willBeChecked); } catch (err) {}
      }

      updateLabelState(label, willBeChecked, null, cfg.activeLabel);

      if (!willBeChecked) return;

      setTimeout(function () {
        var freshCheckbox = formEl.querySelector(
          'input[type="checkbox"][name$="/' + cfg.name + '"]'
        );
        var next = findNextButton(freshCheckbox || checkbox);
        if (next && !next.disabled) next.click();
      }, 400);
    });

    // Also reflect initial state on any labels that ARE in the DOM at
    // form-ready (usually just step 0's). No-op for others until the
    // delegated handler picks them up on first click.
    ADD_BUTTONS.forEach(function (cfg) {
      var checkbox = formEl.querySelector('input[type="checkbox"][name$="/' + cfg.name + '"]');
      if (!checkbox) return;
      var label = checkbox.closest('label.hsfc-FieldLabel');
      if (label) updateLabelState(label, checkbox.checked, null, cfg.activeLabel);
    });

    // ── Yes / No button pair (Do you own a business?) ──
    YESNO_BUTTONS.forEach(function (cfg) {
      var checkbox = formEl.querySelector('input[type="checkbox"][name$="/' + cfg.name + '"]');
      if (!checkbox) return;

      var container = checkbox.closest('.hsfc-CheckboxField');
      if (!container || container.dataset.vipsYesnoInited) return;
      container.dataset.vipsYesnoInited = '1';

      // Class hook for CSS to restyle the label as plain question text
      container.classList.add('vips-yesno-field');

      // Inject the Yes / No pair below the label
      var wrapper = document.createElement('div');
      wrapper.className = 'vips-yesno';
      wrapper.innerHTML =
        '<button type="button" class="vips-yesno__btn" data-value="yes">Yes</button>' +
        '<button type="button" class="vips-yesno__btn" data-value="no">No</button>';
      container.appendChild(wrapper);

      function refreshState() {
        var isYes = checkbox.checked;
        wrapper.querySelector('[data-value="yes"]').classList.toggle('is-selected', isYes);
        wrapper.querySelector('[data-value="no"]').classList.toggle('is-selected', !isYes);
      }
      refreshState();

      wrapper.addEventListener('click', function (e) {
        var btn = e.target.closest('.vips-yesno__btn');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();

        var wantYes = btn.dataset.value === 'yes';
        if (checkbox.checked === wantYes) return; // already in target state

        // Native click toggles + fires React's onChange for real
        checkbox.click();
        setTimeout(refreshState, 100);
      });
    });
  });

  // ── After a successful wealth-form submission, reload so the summary
  //    picks up the freshly-saved contact properties. Delay to let the
  //    contact update propagate on HubSpot's side before we re-render.
  //    Registered at the outer-IIFE scope (not inside on-ready) so it
  //    binds exactly once per page load.
  window.addEventListener('hs-form-event:on-submission:success', function (event) {
    if (!event || !event.detail) return;
    if (event.detail.formId !== 'ffe43d50-4c2e-4cd4-93f6-7ffaeeedbdb3') return;
    setTimeout(function () { window.location.reload(); }, 1500);
  });
})();

(function () {
  'use strict';

  var module = document.querySelector('.account-profile-form');
  if (!module) return;

  var tabs   = module.querySelectorAll('.account-profile-form__tab');
  var panels = module.querySelectorAll('.account-profile-form__panel');

  // ── Tab switching ──
  Array.prototype.forEach.call(tabs, function (tab) {
    tab.addEventListener('click', function () {
      var target = this.getAttribute('data-tab');
      Array.prototype.forEach.call(tabs, function (t) {
        var isActive = (t === tab);
        t.classList.toggle('is-active', isActive);
        t.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
      Array.prototype.forEach.call(panels, function (panel) {
        var isActive = (panel.id === 'panel-' + target);
        panel.classList.toggle('is-active', isActive);
        if (isActive) {
          panel.removeAttribute('hidden');
        } else {
          panel.setAttribute('hidden', '');
        }
      });
    });
  });

  // ── Prefill data — built from all data-pf-* attributes on the module div ──
  var prefillMap = {};
  Object.keys(module.dataset).forEach(function (key) {
    if (key.length > 2 && key.slice(0, 2) === 'pf') {
      var fieldName = key.charAt(2).toLowerCase() + key.slice(3);
      prefillMap[fieldName] = module.dataset[key] || '';
    }
  });

  // HubSpot forms use React — setting input.value directly does NOT update
  // React's internal state, so it gets overwritten on the next render.
  function setReactValue(input, value) {
    var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    if (nativeSetter && nativeSetter.set) {
      nativeSetter.set.call(input, value);
    } else {
      input.value = value;
    }
    input.dispatchEvent(new Event('input',  { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ── Email lock: visual only — no readonly attr (breaks HubSpot validation) ──
  function lockEmailField(wrap) {
    var emailInput = wrap ? wrap.querySelector('input[name="email"]') : null;
    if (!emailInput) return;
    emailInput.style.pointerEvents = 'none';
    emailInput.style.background    = '#f9f9f9';
    emailInput.style.color         = 'var(--vips-text-secondary)';
    emailInput.setAttribute('tabindex', '-1');

    if (!emailInput._pfLocked) {
      emailInput._pfLocked = true;
      emailInput.addEventListener('input', function () {
        if (emailInput.value !== prefillMap.email) {
          setReactValue(emailInput, prefillMap.email);
        }
      });
    }
  }

  // ── Normalize whatever HubSpot emits for a date into MM/DD/YYYY ──
  // Accepts: "1/07/97", "1/7/1997", "01/07/1997", "1997-01-07", or ms timestamp
  function normalizeDateMMDDYYYY(raw) {
    if (!raw) return '';
    var s = String(raw).trim();

    // ms timestamp (all digits)
    if (/^\d{10,}$/.test(s)) {
      var d = new Date(parseInt(s, 10));
      if (!isNaN(d.getTime())) {
        return pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + '/' + d.getFullYear();
      }
    }

    // Slash- or dash-separated. HubSpot's display order depends on portal locale
    // (en-AU outputs DD/MM/YY, en-US outputs MM/DD/YY). Use a heuristic: if either
    // number is > 12 it MUST be the day; else fall back to MM/DD.
    var m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) {
      var first = parseInt(m[1], 10);
      var second = parseInt(m[2], 10);
      var yr = parseInt(m[3], 10);
      var mo, da;
      if (first > 12)        { da = first;  mo = second; }
      else if (second > 12)  { mo = first;  da = second; }
      else                   { mo = first;  da = second; }  // ambiguous → assume MM/DD
      if (yr < 100) yr += (yr <= (new Date().getFullYear() % 100) ? 2000 : 1900);
      return pad(mo) + '/' + pad(da) + '/' + yr;
    }

    // YYYY-MM-DD
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) return pad(+m[2]) + '/' + pad(+m[3]) + '/' + m[1];

    return s; // fallback — let the picker try to parse
  }

  // ── Apply prefill to text/select/textarea fields ──
  function applyPrefill(wrap) {
    var inputs = wrap.querySelectorAll('input.hs-input, select.hs-input, textarea.hs-input');
    if (inputs.length === 0) return false;

    // Normalize the date value once
    if (prefillMap.date_of_birth) {
      var normalized = normalizeDateMMDDYYYY(prefillMap.date_of_birth);
      console.log('[prefill] dob raw="' + prefillMap.date_of_birth + '" → normalized="' + normalized + '"');
      prefillMap.date_of_birth = normalized;
    } else {
      console.log('[prefill] dob raw is empty — data-pf-date_of_birth attribute was empty');
    }

    Array.prototype.forEach.call(inputs, function (input) {
      var name = input.getAttribute('name');
      if (!name || !(name in prefillMap)) return;
      if (input.type === 'file') return;
      if (!prefillMap[name]) return;

      // Date fields use a Pikaday picker with a hidden input + readonly visible input.
      // Hidden expects ms timestamp; visible needs direct .value assignment without events.
      if (name === 'date_of_birth' && input.type === 'hidden') {
        prefillDateField(input, prefillMap[name]);
        return;
      }

      setReactValue(input, prefillMap[name]);
    });

    lockEmailField(wrap);
    enhanceProfileImageField(wrap);
    return true;
  }

  // ── Replace HubSpot's Pikaday picker with a native HTML5 date input ──
  // HubSpot's date picker has a broken display formatter in this portal that prepends
  // "undefined/undefined/" to dates. Bypass it by hiding the HubSpot visible input + Pikaday
  // calendar and rendering our own <input type="date"> instead. The hidden input still gets
  // the ms timestamp that HubSpot's submit handler requires.
  function prefillDateField(hiddenInput, mmddyyyyValue) {
    if (!mmddyyyyValue) return;
    var parts = mmddyyyyValue.split('/');
    if (parts.length !== 3) return;
    var mo = parseInt(parts[0], 10);
    var da = parseInt(parts[1], 10);
    var yr = parseInt(parts[2], 10);
    var d = new Date(yr, mo - 1, da);
    if (isNaN(d.getTime())) return;

    var fieldWrap = hiddenInput.closest('.hs-form-field');
    if (!fieldWrap) return;

    var maxDate = todayMinusYears(MIN_AGE_YEARS);
    var maxIso  = maxDate.getFullYear() + '-' + pad(maxDate.getMonth() + 1) + '-' + pad(maxDate.getDate());

    var dobWrap = fieldWrap.querySelector('.account-profile-form__dob-wrap');
    var textInp, pickerInp, errEl;

    if (!dobWrap) {
      // Hide HubSpot's broken Pikaday picker
      var hsVisible = fieldWrap.querySelector('.hs-dateinput input[type="text"]');
      var pikaCal   = fieldWrap.querySelector('.hs-datepicker');
      if (hsVisible) hsVisible.style.display = 'none';
      if (pikaCal)   pikaCal.style.display   = 'none';

      dobWrap = document.createElement('div');
      dobWrap.className = 'account-profile-form__dob-wrap';

      // Visible text input — always MM/DD/YYYY, regardless of browser locale
      textInp = document.createElement('input');
      textInp.type = 'text';
      textInp.className = 'hs-input account-profile-form__native-dob';
      textInp.placeholder = 'MM/DD/YYYY';
      textInp.maxLength = 10;
      textInp.setAttribute('inputmode', 'numeric');
      textInp.setAttribute('autocomplete', 'bday');

      // Hidden native date input — only used to power the calendar UI on icon click
      pickerInp = document.createElement('input');
      pickerInp.type = 'date';
      pickerInp.className = 'account-profile-form__dob-picker';
      pickerInp.setAttribute('max', maxIso);

      // Calendar icon button
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'account-profile-form__dob-btn';
      btn.setAttribute('aria-label', 'Open calendar');
      btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';

      errEl = document.createElement('p');
      errEl.className = 'account-profile-form__dob-error';

      dobWrap.appendChild(textInp);
      dobWrap.appendChild(pickerInp);
      dobWrap.appendChild(btn);
      dobWrap.appendChild(errEl);
      (hsVisible && hsVisible.parentNode || fieldWrap).appendChild(dobWrap);

      function syncFromText() {
        var m2 = textInp.value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (!m2) {
          if (textInp.value) {
            errEl.textContent = 'Use format MM/DD/YYYY.';
            errEl.style.display = 'block';
          } else {
            errEl.style.display = 'none';
          }
          setReactValue(hiddenInput, '');
          return;
        }
        var mo2 = +m2[1], da2 = +m2[2], yr2 = +m2[3];
        var dd  = new Date(yr2, mo2 - 1, da2);
        if (isNaN(dd.getTime()) || dd.getMonth() !== mo2 - 1 || dd.getDate() !== da2) {
          errEl.textContent = 'Please enter a valid date.';
          errEl.style.display = 'block';
          setReactValue(hiddenInput, '');
          return;
        }
        var today = new Date(); today.setHours(0,0,0,0);
        if (dd > today) {
          errEl.textContent = 'Date of birth cannot be in the future.';
          errEl.style.display = 'block';
          setReactValue(hiddenInput, '');
          return;
        }
        if (ageInYears(dd, today) < MIN_AGE_YEARS) {
          errEl.textContent = 'You must be at least ' + MIN_AGE_YEARS + ' years old.';
          errEl.style.display = 'block';
          setReactValue(hiddenInput, '');
          return;
        }
        errEl.style.display = 'none';
        var iso2 = yr2 + '-' + pad(mo2) + '-' + pad(da2);
        pickerInp.value = iso2;
        setReactValue(hiddenInput, iso2);
      }

      // Auto-format digits as user types: 01302025 → 01/30/2025
      textInp.addEventListener('input', function () {
        var v = textInp.value.replace(/\D/g, '').slice(0, 8);
        if (v.length > 4)      v = v.slice(0,2) + '/' + v.slice(2,4) + '/' + v.slice(4);
        else if (v.length > 2) v = v.slice(0,2) + '/' + v.slice(2);
        textInp.value = v;
        syncFromText();
      });
      textInp.addEventListener('blur', syncFromText);

      // Calendar icon → open native picker
      btn.addEventListener('click', function () {
        if (typeof pickerInp.showPicker === 'function') {
          try { pickerInp.showPicker(); return; } catch (e) {}
        }
        pickerInp.focus();
        pickerInp.click();
      });

      // Native picker selection → fill text input as MM/DD/YYYY
      pickerInp.addEventListener('change', function () {
        if (!pickerInp.value) return;
        var p = pickerInp.value.split('-');
        textInp.value = p[1] + '/' + p[2] + '/' + p[0];
        syncFromText();
      });
    } else {
      textInp   = dobWrap.querySelector('.account-profile-form__native-dob');
      pickerInp = dobWrap.querySelector('.account-profile-form__dob-picker');
      errEl     = dobWrap.querySelector('.account-profile-form__dob-error');
    }

    // Prefill — visible MM/DD/YYYY, picker ISO YYYY-MM-DD, hidden ISO YYYY-MM-DD
    var displayMMDD = pad(mo) + '/' + pad(da) + '/' + yr;
    var iso = yr + '-' + pad(mo) + '-' + pad(da);
    if (textInp)   textInp.value = displayMMDD;
    if (pickerInp) pickerInp.value = iso;
    setReactValue(hiddenInput, iso);
    if (errEl) errEl.style.display = 'none';
    console.log('[prefill] DOB display="' + displayMMDD + '" hidden="' + iso + '"');
  }

  // ── Date of birth: max date = today; min age = 18yrs ──
  var MIN_AGE_YEARS = 18;

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function todayMinusYears(years) {
    var d = new Date();
    d.setFullYear(d.getFullYear() - years);
    return d;
  }

  // Parse "MM/DD/YYYY" or "YYYY-MM-DD" into a Date (or null)
  function parseDobValue(str) {
    if (!str) return null;
    var m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return new Date(+m[3], +m[1] - 1, +m[2]);
    m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    var d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  function ageInYears(dob, refDate) {
    var ref = refDate || new Date();
    var age = ref.getFullYear() - dob.getFullYear();
    var m = ref.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && ref.getDate() < dob.getDate())) age--;
    return age;
  }

  function setupDateOfBirthField(wrap) {
    var dobInput = wrap.querySelector('input[name="date_of_birth"]');
    if (!dobInput || dobInput._pfDobBound) return;
    dobInput._pfDobBound = true;

    var maxDate = todayMinusYears(MIN_AGE_YEARS);
    // Set max attribute — picked up by HTML5 native date inputs and most custom pickers
    var maxIso = maxDate.getFullYear() + '-' + pad(maxDate.getMonth() + 1) + '-' + pad(maxDate.getDate());
    dobInput.setAttribute('max', maxIso);

    // Inline error element (created once, kept hidden until invalid)
    var errEl = dobInput.parentNode.querySelector('.account-profile-form__dob-error');
    if (!errEl) {
      errEl = document.createElement('p');
      errEl.className = 'account-profile-form__dob-error';
      errEl.style.cssText = 'color: var(--vips-red); font-size: 12px; line-height: 16px; margin: 4px 0 0; display: none;';
      dobInput.parentNode.appendChild(errEl);
    }

    function validate() {
      var raw = dobInput.value;
      if (!raw) { errEl.style.display = 'none'; return true; }
      var d = parseDobValue(raw);
      if (!d) { errEl.textContent = 'Please enter a valid date.'; errEl.style.display = 'block'; return false; }
      var today = new Date();
      today.setHours(0,0,0,0);
      if (d > today) { errEl.textContent = 'Date of birth cannot be in the future.'; errEl.style.display = 'block'; return false; }
      if (ageInYears(d, today) < MIN_AGE_YEARS) {
        errEl.textContent = 'You must be at least ' + MIN_AGE_YEARS + ' years old.';
        errEl.style.display = 'block';
        return false;
      }
      errEl.style.display = 'none';
      return true;
    }

    dobInput.addEventListener('input', validate);
    dobInput.addEventListener('blur',  validate);
    dobInput.addEventListener('change', validate);

    // Block form submission if invalid (capture phase so we run before HubSpot's handler)
    var form = dobInput.closest('form');
    if (form && !form._pfDobSubmitBound) {
      form._pfDobSubmitBound = true;
      form.addEventListener('submit', function (e) {
        if (!validate()) {
          e.preventDefault();
          e.stopPropagation();
          dobInput.focus();
        }
      }, true);
    }
  }

  // ── Edit toggle ──
  var editBtns = module.querySelectorAll('.account-profile-form__edit-btn');
  Array.prototype.forEach.call(editBtns, function (btn) {
    btn.addEventListener('click', function () {
      var targetId = btn.getAttribute('data-controls');
      var wrap = targetId ? document.getElementById(targetId) : null;
      if (!wrap) return;

      var isEditing = wrap.classList.contains('account-profile-form__form-wrap--editing');

      if (isEditing) {
        wrap.classList.remove('account-profile-form__form-wrap--editing');
        wrap.classList.add('account-profile-form__form-wrap--locked');
        btn.setAttribute('aria-pressed', 'false');
        btn.textContent = btn.getAttribute('data-edit-text') || 'Edit';
      } else {
        wrap.classList.remove('account-profile-form__form-wrap--locked');
        wrap.classList.add('account-profile-form__form-wrap--editing');
        btn.setAttribute('aria-pressed', 'true');
        btn.textContent = btn.getAttribute('data-cancel-text') || 'Cancel';
        applyPrefill(wrap);
      }
    });
  });

  // ── Personal form: prefill on load ──
  var personalWrap = document.getElementById('personal-form-wrap');
  if (personalWrap) {
    if (!applyPrefill(personalWrap)) {
      var observer = new MutationObserver(function () {
        if (applyPrefill(personalWrap)) {
          observer.disconnect();
        }
      });
      observer.observe(personalWrap, { childList: true, subtree: true });
    }
  }

  // ============================================================
  //  AVATAR UPLOADER + CROP MODAL
  // ============================================================

  function getInitials() {
    var first = (prefillMap.firstname || '').trim();
    var last  = (prefillMap.lastname  || '').trim();
    var initials = (first.charAt(0) + last.charAt(0)).toUpperCase();
    return initials || (first.charAt(0).toUpperCase() || 'M');
  }

  // Renders the avatar preview content — either the image or initials fallback
  function renderAvatarPreview(previewEl, imgUrl) {
    previewEl.innerHTML = '';
    if (imgUrl) {
      var img = document.createElement('img');
      img.src = imgUrl;
      img.alt = 'Profile photo';
      previewEl.appendChild(img);
    } else {
      previewEl.textContent = getInitials();
    }
  }

  // Build the avatar uploader UI inside the file field wrapper, hide native input
  function enhanceProfileImageField(wrap) {
    var fileInput = wrap.querySelector('input[name="profile_image_file"]');
    if (!fileInput) return;

    var fieldWrap = fileInput.closest('.hs-form-field') || fileInput.parentNode;
    if (!fieldWrap || fieldWrap._pfEnhanced) return;
    fieldWrap._pfEnhanced = true;

    var uploader = document.createElement('div');
    uploader.className = 'account-profile-form__avatar-uploader';

    var preview = document.createElement('div');
    preview.className = 'account-profile-form__avatar-preview';
    renderAvatarPreview(preview, prefillMap.profileimage || '');

    var meta = document.createElement('div');
    meta.className = 'account-profile-form__avatar-meta';

    var hint = document.createElement('span');
    hint.className = 'account-profile-form__avatar-hint';
    hint.textContent = 'JPG or PNG, square crop. Max 5MB.';

    var editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'account-profile-form__avatar-edit';
    editBtn.textContent = 'Change photo';
    editBtn.addEventListener('click', function () {
      openCropModal(fileInput, preview);
    });

    meta.appendChild(hint);
    meta.appendChild(editBtn);

    uploader.appendChild(preview);
    uploader.appendChild(meta);

    // Append after HubSpot's own label — order is: label → avatar block → (hidden input)
    fieldWrap.appendChild(uploader);
  }

  // ── Crop Modal ──
  var modalState = null;

  function buildModal() {
    var overlay = document.createElement('div');
    overlay.className = 'account-profile-form__crop-modal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'crop-modal-title');

    overlay.innerHTML = [
      '<div class="account-profile-form__crop-dialog">',
      '  <h3 class="account-profile-form__crop-title" id="crop-modal-title">Update profile photo</h3>',
      '  <div class="account-profile-form__crop-dropzone" data-role="dropzone">',
      '    <strong>Click or drop an image</strong>',
      '    <span>JPG or PNG, up to 5MB</span>',
      '  </div>',
      '  <div class="account-profile-form__crop-stage" data-role="stage" hidden>',
      '    <canvas data-role="canvas"></canvas>',
      '    <div class="account-profile-form__crop-mask"></div>',
      '  </div>',
      '  <div class="account-profile-form__crop-zoom" data-role="zoom-row" hidden>',
      '    <span class="account-profile-form__crop-zoom-label">Zoom</span>',
      '    <input type="range" min="1" max="3" step="0.01" value="1" data-role="zoom">',
      '  </div>',
      '  <div class="account-profile-form__crop-actions">',
      '    <button type="button" class="account-profile-form__crop-btn account-profile-form__crop-btn--secondary" data-role="cancel">Cancel</button>',
      '    <button type="button" class="account-profile-form__crop-btn account-profile-form__crop-btn--primary" data-role="save" disabled>Save photo</button>',
      '  </div>',
      '</div>'
    ].join('');

    document.body.appendChild(overlay);

    // Hidden file picker (separate from the HubSpot form input — used only for picking, then we inject result into the form input)
    var picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = 'image/jpeg,image/png,image/webp';
    picker.style.display = 'none';
    overlay.appendChild(picker);

    return {
      overlay: overlay,
      dialog:   overlay.querySelector('.account-profile-form__crop-dialog'),
      dropzone: overlay.querySelector('[data-role="dropzone"]'),
      stage:    overlay.querySelector('[data-role="stage"]'),
      canvas:   overlay.querySelector('[data-role="canvas"]'),
      zoomRow:  overlay.querySelector('[data-role="zoom-row"]'),
      zoom:     overlay.querySelector('[data-role="zoom"]'),
      cancel:   overlay.querySelector('[data-role="cancel"]'),
      save:     overlay.querySelector('[data-role="save"]'),
      picker:   picker
    };
  }

  function openCropModal(targetInput, previewEl) {
    if (!modalState) modalState = buildModal();
    var s = modalState;

    // Reset state
    s.targetInput = targetInput;
    s.previewEl = previewEl;
    s.image = null;
    s.scale = 1;
    s.offsetX = 0;
    s.offsetY = 0;
    s.dragging = false;
    s.lastX = 0;
    s.lastY = 0;
    s.zoom.value = '1';
    s.save.disabled = true;
    s.dropzone.hidden = false;
    s.stage.hidden = true;
    s.zoomRow.hidden = true;

    s.overlay.classList.add('is-open');

    // Attach handlers (idempotent)
    if (!s._wired) {
      s._wired = true;

      s.dropzone.addEventListener('click', function () { s.picker.click(); });
      s.dropzone.addEventListener('dragover', function (e) {
        e.preventDefault();
        s.dropzone.classList.add('is-drag');
      });
      s.dropzone.addEventListener('dragleave', function () {
        s.dropzone.classList.remove('is-drag');
      });
      s.dropzone.addEventListener('drop', function (e) {
        e.preventDefault();
        s.dropzone.classList.remove('is-drag');
        var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) loadImageFile(file);
      });

      s.picker.addEventListener('change', function () {
        var file = s.picker.files && s.picker.files[0];
        if (file) loadImageFile(file);
      });

      s.zoom.addEventListener('input', function () {
        s.scale = parseFloat(s.zoom.value) || 1;
        clampOffset();
        drawCrop();
      });

      // Pointer drag
      s.stage.addEventListener('pointerdown', function (e) {
        if (!s.image) return;
        s.dragging = true;
        s.lastX = e.clientX;
        s.lastY = e.clientY;
        try { s.stage.setPointerCapture(e.pointerId); } catch (err) {}
      });
      s.stage.addEventListener('pointermove', function (e) {
        if (!s.dragging) return;
        var dx = e.clientX - s.lastX;
        var dy = e.clientY - s.lastY;
        s.lastX = e.clientX;
        s.lastY = e.clientY;
        s.offsetX += dx;
        s.offsetY += dy;
        clampOffset();
        drawCrop();
      });
      var endDrag = function (e) {
        s.dragging = false;
        try { s.stage.releasePointerCapture(e.pointerId); } catch (err) {}
      };
      s.stage.addEventListener('pointerup',     endDrag);
      s.stage.addEventListener('pointercancel', endDrag);
      s.stage.addEventListener('pointerleave',  endDrag);

      s.cancel.addEventListener('click', closeCropModal);
      s.overlay.addEventListener('click', function (e) {
        if (e.target === s.overlay) closeCropModal();
      });

      s.save.addEventListener('click', saveCrop);

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && s.overlay.classList.contains('is-open')) {
          closeCropModal();
        }
      });
    }
  }

  function loadImageFile(file) {
    var s = modalState;
    if (!file || !/^image\//.test(file.type)) {
      alert('Please choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image is larger than 5MB. Please choose a smaller file.');
      return;
    }

    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      s.image = img;
      s.scale = 1;
      s.offsetX = 0;
      s.offsetY = 0;
      s.zoom.value = '1';

      // Show stage FIRST — getBoundingClientRect returns 0 on hidden elements
      s.dropzone.hidden = true;
      s.stage.hidden = false;
      s.zoomRow.hidden = false;
      s.save.disabled = false;

      // Now measure and size the canvas
      var rect = s.stage.getBoundingClientRect();
      var size = Math.round(rect.width);
      if (!size) {
        size = Math.min(s.dialog.clientWidth - 48, 360);
      }
      var dpr = window.devicePixelRatio || 1;
      s.canvas.width  = size * dpr;
      s.canvas.height = size * dpr;
      s.canvas.style.width  = size + 'px';
      s.canvas.style.height = size + 'px';
      s._dpr = dpr;
      s._stageSize = size;

      drawCrop();
      URL.revokeObjectURL(url);
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      alert('Could not read that image. Please try another file.');
    };
    img.src = url;
  }

  // Compute the cover-fit base scale: the smallest scale that still fully
  // covers the square canvas with the natural image
  function getCoverScale() {
    var s = modalState;
    if (!s.image) return 1;
    return Math.max(s._stageSize / s.image.naturalWidth, s._stageSize / s.image.naturalHeight);
  }

  function clampOffset() {
    var s = modalState;
    if (!s.image) return;
    var draw = getCoverScale() * s.scale;
    var drawW = s.image.naturalWidth * draw;
    var drawH = s.image.naturalHeight * draw;
    var maxX = Math.max(0, (drawW - s._stageSize) / 2);
    var maxY = Math.max(0, (drawH - s._stageSize) / 2);
    if (s.offsetX >  maxX) s.offsetX =  maxX;
    if (s.offsetX < -maxX) s.offsetX = -maxX;
    if (s.offsetY >  maxY) s.offsetY =  maxY;
    if (s.offsetY < -maxY) s.offsetY = -maxY;
  }

  function drawCrop() {
    var s = modalState;
    if (!s.image) return;
    var ctx = s.canvas.getContext('2d');
    var size = s._stageSize;
    var dpr = s._dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    var draw = getCoverScale() * s.scale;
    var drawW = s.image.naturalWidth * draw;
    var drawH = s.image.naturalHeight * draw;
    var x = (size - drawW) / 2 + s.offsetX;
    var y = (size - drawH) / 2 + s.offsetY;
    ctx.drawImage(s.image, x, y, drawW, drawH);
  }

  function saveCrop() {
    var s = modalState;
    if (!s.image) return;

    // Render at 400×400 output regardless of display size
    var out = document.createElement('canvas');
    var outSize = 400;
    out.width = outSize;
    out.height = outSize;
    var ctx = out.getContext('2d');

    var ratio = outSize / s._stageSize;
    var draw = getCoverScale() * s.scale * ratio;
    var drawW = s.image.naturalWidth * draw;
    var drawH = s.image.naturalHeight * draw;
    var x = (outSize - drawW) / 2 + (s.offsetX * ratio);
    var y = (outSize - drawH) / 2 + (s.offsetY * ratio);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, outSize, outSize);
    ctx.drawImage(s.image, x, y, drawW, drawH);

    out.toBlob(function (blob) {
      if (!blob) {
        alert('Could not generate cropped image. Please try again.');
        return;
      }
      var fileName = 'profile-' + Date.now() + '.jpg';
      var croppedFile = new File([blob], fileName, { type: 'image/jpeg' });

      // Inject the cropped File into the (hidden) HubSpot form file input
      try {
        var dt = new DataTransfer();
        dt.items.add(croppedFile);
        s.targetInput.files = dt.files;
      } catch (err) {
        // Older browsers without DataTransfer constructor — file may not attach
      }
      s.targetInput.dispatchEvent(new Event('change', { bubbles: true }));
      s.targetInput.dispatchEvent(new Event('input',  { bubbles: true }));

      // Update preview avatar with the cropped image
      var previewUrl = out.toDataURL('image/jpeg', 0.92);
      renderAvatarPreview(s.previewEl, previewUrl);

      closeCropModal();
    }, 'image/jpeg', 0.9);
  }

  function closeCropModal() {
    if (!modalState) return;
    modalState.overlay.classList.remove('is-open');
    if (modalState.picker) modalState.picker.value = '';
  }

}());
