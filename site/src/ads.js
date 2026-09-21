const GOOGLE_AD_CLIENT = "ca-pub-1123012671033143";
const GOOGLE_AD_SLOT = "3947449400";
const MAX_AD_SLOTS_PER_PAGE = 2;
const SCOUTLY_FALLBACK_DELAY = 4000;

function hasFilledGoogleAd() {
  return [...document.querySelectorAll('ins.adsbygoogle[data-ad-status="filled"]')].some((slot) => {
    const rect = slot.getBoundingClientRect();
    const style = window.getComputedStyle(slot);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  });
}

function hasGoogleAdResponse() {
  return Boolean(document.querySelector('ins.adsbygoogle[data-ad-status="filled"], ins.adsbygoogle[data-ad-status="unfilled"]'));
}

export function mountScoutlyFallback() {
  if (document.querySelector("[data-scoutly-fallback]")) return;

  const preview = document.createElement("aside");
  preview.className = "ad-preview";
  preview.dataset.scoutlyFallback = "true";
  preview.setAttribute("aria-label", "Scoutly promotion");
  preview.hidden = true;
  preview.innerHTML = `
    <a class="ad-preview-link" href="https://scoutly.one" target="_blank" rel="noreferrer">
      <img src="${import.meta.env.BASE_URL}assets/scoutly-house-ad.png" alt="Scoutly: the only app you need for competitive robotics">
    </a>
  `;

  const anchor = document.querySelector(".google-ad-slot");
  const main = document.querySelector("main");
  if (anchor) anchor.insertAdjacentElement("afterend", preview);
  else if (main) main.append(preview);
  else document.body.append(preview);

  const settle = () => {
    if (hasFilledGoogleAd()) preview.hidden = true;
    else if (hasGoogleAdResponse()) preview.hidden = false;
  };
  const observer = new MutationObserver(settle);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-ad-status", "src"] });
  const timeout = window.setTimeout(() => {
    if (!hasFilledGoogleAd()) preview.hidden = false;
  }, SCOUTLY_FALLBACK_DELAY);
  window.__hvnScoutlyFallbackCleanup = () => {
    observer.disconnect();
    window.clearTimeout(timeout);
  };
  settle();
}

export function mountGoogleAdSlots() {
  const anchors = [...document.querySelectorAll("[data-google-ad-slot]")];
  const main = document.querySelector("main");
  while (main && anchors.length < MAX_AD_SLOTS_PER_PAGE) {
    const anchor = document.createElement("div");
    anchor.className = "google-ad-slot";
    anchor.dataset.googleAdSlot = GOOGLE_AD_SLOT;
    anchor.setAttribute("aria-label", "Advertisement");
    main.append(anchor);
    anchors.push(anchor);
  }

  window.adsbygoogle = window.adsbygoogle || [];
  for (const anchor of anchors) {
    if (anchor.querySelector("ins.adsbygoogle")) continue;
    const ins = document.createElement("ins");
    ins.className = "adsbygoogle";
    ins.style.display = "block";
    ins.dataset.adClient = GOOGLE_AD_CLIENT;
    ins.dataset.adSlot = anchor.dataset.googleAdSlot || GOOGLE_AD_SLOT;
    ins.dataset.adFormat = "auto";
    ins.dataset.fullWidthResponsive = "true";
    anchor.append(ins);
    try {
      window.adsbygoogle.push({});
    } catch {
      // The async AdSense script will process the queued request when available.
    }
  }
}
