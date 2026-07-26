/**
 * Lightweight consent UI — no React. Tracking stays blocked until accept.
 * Expects #vdb-cookie-banner in the DOM and optional [data-vdb-open-consent] triggers.
 */
(function () {
  var KEY = "vdb_consent";
  var banner = document.getElementById("vdb-cookie-banner");
  if (!banner) return;

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
  }

  function save(prefs) {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  }

  function hide() {
    banner.hidden = true;
    banner.setAttribute("aria-hidden", "true");
  }

  function show() {
    banner.hidden = false;
    banner.removeAttribute("aria-hidden");
  }

  function acceptAll() {
    save({
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
    });
    hide();
  }

  function rejectAll() {
    save({
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
    });
    hide();
  }

  function saveCustom() {
    var analytics = banner.querySelector('[name="vdb-analytics"]');
    var marketing = banner.querySelector('[name="vdb-marketing"]');
    save({
      necessary: true,
      functional: false,
      analytics: !!(analytics && analytics.checked),
      marketing: !!(marketing && marketing.checked),
      timestamp: new Date().toISOString(),
    });
    hide();
  }

  var stored = load();
  if (!stored) {
    // Defer paint so the banner never becomes LCP.
    var reveal = function () {
      show();
    };
    if ("requestIdleCallback" in window) {
      requestIdleCallback(reveal, { timeout: 2500 });
    } else {
      setTimeout(reveal, 1200);
    }
  } else {
    hide();
  }

  banner.addEventListener("click", function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;
    var action = target.getAttribute("data-vdb-consent");
    if (action === "accept") acceptAll();
    if (action === "reject") rejectAll();
    if (action === "save") saveCustom();
    if (action === "customize") {
      var details = banner.querySelector("[data-vdb-consent-details]");
      if (details) details.hidden = !details.hidden;
    }
  });

  window.addEventListener("vdb:open-consent", function () {
    show();
    var details = banner.querySelector("[data-vdb-consent-details]");
    if (details) details.hidden = false;
  });

  document.addEventListener("click", function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("[data-vdb-open-consent]")) {
      event.preventDefault();
      window.dispatchEvent(new CustomEvent("vdb:open-consent"));
    }
  });
})();
