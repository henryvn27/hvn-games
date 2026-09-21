const GOOGLE_AD_FALLBACK_DELAY = 8000;
const GOOGLE_AD_CLIENT = "ca-pub-1123012671033143";
const GOOGLE_AD_SLOT = "5915584309";

function hasFilledGoogleAd() {
  const filledSlot = document.querySelector('ins.adsbygoogle[data-ad-status="filled"], [data-ad-status="filled"]');
  if (filledSlot) return true;

  return [...document.querySelectorAll("iframe")].some((frame) => {
    const slot = frame.closest("ins.adsbygoogle");
    if (slot?.dataset.adStatus === "unfilled") return false;
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
  if (document.querySelector("[data-ad-preview]")) return;
  const preview = document.createElement("aside");
  preview.className = "ad-preview";
  preview.dataset.adPreview = "true";
  preview.setAttribute("aria-label", "Sponsor message");
  preview.hidden = true;
  preview.setAttribute("aria-hidden", "true");
  preview.innerHTML = `
    <a class="ad-preview-link" href="https://scoutly.one" target="_blank" rel="noreferrer">
      <img src="${import.meta.env.BASE_URL}assets/scoutly-house-ad.png" alt="Scoutly: the only app you need for competitive robotics">
      <span class="ad-preview-caption"><strong>Scoutly</strong><span>The only app you need for competitive robotics.</span></span>
    </a>
  `;
  const anchor = document.querySelector("[data-ad-anchor]");
  const main = document.querySelector("main");
  if (anchor) {
    anchor.insertAdjacentElement("afterend", preview);
  } else if (main) {
    main.append(preview);
  } else {
    document.body.append(preview);
  }

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
  showFallback(preview);
  settle();
}

export function mountGoogleAdSlots() {
  const anchors = [...document.querySelectorAll("[data-google-ad-slot]")];
  if (!anchors.length) {
    const main = document.querySelector("main");
    if (main) {
      const anchor = document.createElement("div");
      anchor.className = "google-ad-slot";
      anchor.dataset.googleAdSlot = GOOGLE_AD_SLOT;
      main.append(anchor);
      anchors.push(anchor);
    }
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
