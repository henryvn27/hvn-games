const CONSENT_KEY = "hvn-games:ads-consent:v1";
const GOOGLE_AD_FALLBACK_DELAY = 8000;

function hasFilledGoogleAd() {
  const filledSlot = document.querySelector('ins.adsbygoogle[data-ad-status="filled"], [data-ad-status="filled"]');
  if (filledSlot) return true;

  return [...document.querySelectorAll("iframe")].some((frame) => {
    const source = frame.getAttribute("src") || "";
    if (!/googleadservices\.com|doubleclick\.net|googlesyndication\.com/.test(source)) return false;
    const rect = frame.getBoundingClientRect();
    const style = window.getComputedStyle(frame);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  });
}

function hasGoogleAdResponse() {
  return Boolean(document.querySelector('ins.adsbygoogle[data-ad-status="filled"], ins.adsbygoogle[data-ad-status="unfilled"]'));
}

function hideFallback(preview) {
  preview.hidden = true;
  preview.setAttribute("aria-hidden", "true");
  preview.dataset.adFallback = "hidden";
}

function showFallback(preview) {
  if (hasFilledGoogleAd()) return;
  preview.hidden = false;
  preview.removeAttribute("aria-hidden");
  preview.dataset.adFallback = "shown";
}

export function mountAdPreview() {
  if (readConsent() !== "allow") return;
  if (document.querySelector("[data-ad-preview]")) return;
  const preview = document.createElement("aside");
  preview.className = "ad-preview";
  preview.dataset.adPreview = "true";
  preview.setAttribute("aria-label", "Sponsor message");
  preview.hidden = true;
  preview.setAttribute("aria-hidden", "true");
  preview.innerHTML = `
    <a class="ad-preview-link" href="https://scoutly.one" target="_blank" rel="noreferrer">
      <img src="${import.meta.env.BASE_URL}assets/scoutly-house-ad.png" alt="Scoutly: from lookup to decision">
      <span class="ad-preview-caption"><span class="ad-preview-label">house ad</span><strong>Scoutly</strong><span>From lookup to decision.</span></span>
    </a>
  `;
  document.body.append(preview);

  const settle = () => {
    if (hasFilledGoogleAd()) {
      hideFallback(preview);
      return;
    }
    if (hasGoogleAdResponse()) showFallback(preview);
  };
  const observer = new MutationObserver(settle);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-ad-status", "src"] });
  const timeout = window.setTimeout(() => showFallback(preview), GOOGLE_AD_FALLBACK_DELAY);
  window.__hvnAdFallbackCleanup = () => {
    observer.disconnect();
    window.clearTimeout(timeout);
  };
  settle();
}

function readConsent() {
  try {
    return window.localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
}

function writeConsent(value) {
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Ads stay paused if this browser blocks local storage.
  }
}

function startAds() {
  window.adsbygoogle = window.adsbygoogle || [];
  window.adsbygoogle.requestNonPersonalizedAds = 1;
  window.adsbygoogle.pauseAdRequests = 0;
}

function addSettingsLink() {
  if (document.querySelector("[data-ads-settings]")) return;
  const link = document.createElement("button");
  link.type = "button";
  link.className = "ads-settings-link";
  link.dataset.adsSettings = "true";
  link.textContent = "ad settings";
  link.addEventListener("click", () => {
    try { window.localStorage.removeItem(CONSENT_KEY); } catch { /* keep the banner usable */ }
    window.location.reload();
  });
  document.body.append(link);
}

export function mountAdsConsent() {
  const consent = readConsent();
  if (consent === "allow") {
    startAds();
    addSettingsLink();
    return;
  }
  if (consent === "decline") {
    addSettingsLink();
    return;
  }
  if (document.querySelector(".ads-consent")) return;

  const banner = document.createElement("aside");
  banner.className = "ads-consent";
  banner.setAttribute("aria-label", "Advertising choices");
  banner.innerHTML = `
    <div>
      <strong>Keep the games free</strong>
      <p>HVN games uses occasional Google ads. They are paused until you choose. <a href="./privacy.html">privacy</a></p>
    </div>
    <div class="ads-consent-actions">
      <button type="button" class="button button-primary" data-ads-allow>allow ads</button>
      <button type="button" class="text-button" data-ads-decline>not now</button>
    </div>
  `;
  banner.querySelector("[data-ads-allow]").addEventListener("click", () => {
    writeConsent("allow");
    window.location.reload();
  });
  banner.querySelector("[data-ads-decline]").addEventListener("click", () => {
    writeConsent("decline");
    banner.remove();
    addSettingsLink();
  });
  document.body.append(banner);
}
