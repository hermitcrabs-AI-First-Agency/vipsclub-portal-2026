(function () {
  document.querySelectorAll('.rfv2-referral-banner').forEach(function (banner) {
    var button = banner.querySelector('.rfv2-referral-banner__copy');
    var input = banner.querySelector('.rfv2-referral-banner__input');
    if (!button || !input) return;

    var text = button.querySelector('.rfv2-referral-banner__copy-text');
    var defaultText = button.getAttribute('data-default-text') || 'Copy link';
    var successText = button.getAttribute('data-success-text') || 'Copied';

    function flash() {
      if (!text) return;
      text.textContent = successText;
      window.setTimeout(function () {
        text.textContent = defaultText;
      }, 1600);
    }

    button.addEventListener('click', function () {
      var value = input.value;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(flash).catch(function () {
          input.select();
          document.execCommand('copy');
          flash();
        });
      } else {
        input.select();
        document.execCommand('copy');
        flash();
      }
    });
  });
})();
