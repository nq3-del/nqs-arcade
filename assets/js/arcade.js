// ═══════════════════════════════════════════════════════
// NQ'S ARCADE — Shared site logic
// ═══════════════════════════════════════════════════════
var ARCADE = (function() {

  var HEADER_TPL = function(opts) {
    var back = opts && opts.backLink
      ? '<a class="nav__back" href="../../index.html">&#8592; Arcade</a>'
      : '';
    return [
      '<header class="site-header">',
      '  <div class="site-header__inner">',
      '    <a class="site-logo" href="' + (opts && opts.backLink ? '../../index.html' : 'index.html') + '">',
      '      <span class="site-logo__nq">NQ\'s</span><span class="site-logo__arcade"> ARCADE</span>',
      '    </a>',
      '    <nav class="site-nav">',
      back,
      '      <a href="' + (opts && opts.backLink ? '../../index.html' : '#games') + '">Games</a>',
      '    </nav>',
      '  </div>',
      '</header>'
    ].join('\n');
  };

  var FOOTER_TPL = [
    '<footer class="site-footer">',
    '  <p>&copy; 2026 NQ\'s Arcade</p>',
    '</footer>'
  ].join('\n');

  function renderHeader(opts) {
    var el = document.getElementById('site-header');
    if (el) el.innerHTML = HEADER_TPL(opts);
  }

  function renderFooter() {
    var el = document.getElementById('site-footer');
    if (el) el.innerHTML = FOOTER_TPL;
  }

  document.addEventListener('DOMContentLoaded', function() {
    // Auto-render if data attributes are present on the placeholder divs
    var h = document.getElementById('site-header');
    var f = document.getElementById('site-footer');
    if (h) renderHeader({ backLink: h.dataset.backLink === 'true' });
    if (f) renderFooter();
  });

  return { renderHeader: renderHeader, renderFooter: renderFooter };
})();
