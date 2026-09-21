const CONSENT_KEY = "hvn-games:ads-consent:v1";

export function mountAdPreview() {
  if (document.querySelector("[data-ad-preview]")) return;
  const preview = document.createElement("aside");
  preview.className = "ad-preview";
  preview.dataset.adPreview = "true";
  preview.setAttribute("aria-label", "Ad placement preview");
  preview.innerHTML = `
    <div>
      <span class="ad-preview-label">ad placement preview</span>
      <strong>A small, quiet space for a sponsor</strong>
      <p>Scouting mockup only. This is not a live Google ad.</p>
    </div>
    <span class="ad-preview-size">728 × 90</span>
  `;
  document.body.append(preview);
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
