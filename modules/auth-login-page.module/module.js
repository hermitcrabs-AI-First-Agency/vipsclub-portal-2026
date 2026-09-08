document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('#hs-membership-form .hs-form-field').forEach(function (field) {
    var label = field.querySelector('label');
    if (!label) return;
    var text = label.textContent || '';
    var clean = text.replace(/\(.*?\)/g, '').replace(/\*/g, '').trim();
    var slug = clean.toLowerCase().split(/\s+/)[0].replace(/[^a-z0-9]/g, '-');
    if (slug) field.classList.add(slug);
  });
});

(function () {
	var tries = 0;
	var interval = setInterval(function () {
		var label = document.getElementById('hs-passwordless-auth-checkbox-consent');
		if (label) {
			label.innerHTML = 'I agree to the <a href="/terms-and-conditions" target="_blank">Terms and Conditions</a>';
			clearInterval(interval);
		}
		if (++tries > 20) clearInterval(interval);
	}, 100);
})();