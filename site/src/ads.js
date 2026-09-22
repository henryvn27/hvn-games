const GOOGLE_AD_CLIENT = "ca-pub-1123012671033143";
const GOOGLE_AD_SLOT = "3947449400";
const MAX_AD_SLOTS_PER_PAGE = 2;
const SCOUTLY_FALLBACK_DELAY = 4000;

function hasFilledGoogleAdIn(anchor) {
  const slot = anchor?.querySelector('ins.adsbygoogle[data-ad-status="filled"]');
  if (!slot) return false;
  const rect = slot.getBoundingClientRect();
  const style = window.getComputedStyle(slot);
  return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
}

function hasGoogleAdResponseIn(anchor) {
  return Boolean(anchor?.querySelector('ins.adsbygoogle[data-ad-status="filled"], ins.adsbygoogle[data-ad-status="unfilled"]'));
}

function createAdRail(side) {
  const rail = document.createElement("aside");
  rail.className = "ad-rail ad-rail-" + side;
  rail.setAttribute("aria-label", "Advertisement");
  const slot = document.createElement("div");
  slot.className = "google-ad-slot side-ad-slot";
  slot.dataset.googleAdSlot = GOOGLE_AD_SLOT;
  slot.setAttribute("aria-label", "Advertisement");
  rail.append(slot);
  return rail;
}

function mountGameAdRails() {
  const main = document.querySelector("main.game-main, main#tower-defense-root");
  if (!main || main.parentElement?.classList.contains("game-ad-layout")) return;
  const surface = main.querySelector("#shelf-native-host, .game-frame, .space-wars-frame, #tower-defense-root") || main;
  if (surface === main && !main.matches("#tower-defense-root")) return;

  const layout = document.createElement("div");
  layout.className = "game-ad-layout";
  const leftRail = createAdRail("left");
  const rightRail = createAdRail("right");
  const parent = main.parentElement;
  const existing = [...main.querySelectorAll(".google-ad-slot")];
  existing.slice(0, 2).forEach((slot, index) => {
    const target = index === 0 ? leftRail.querySelector(".google-ad-slot") : rightRail.querySelector(".google-ad-slot");
    target.replaceWith(slot);
    slot.classList.add("side-ad-slot");
  });
  existing.slice(2).forEach((slot) => slot.remove());
  parent.insertBefore(layout, main);
  layout.append(leftRail, main, rightRail);
}

export function mountScoutlyFallback() {
  const anchors = [...document.querySelectorAll(".google-ad-slot")];
  if (!anchors.length || document.querySelectorAll("[data-scoutly-fallback]").length >= anchors.length) return;
  const previews = anchors.map((anchor) => {
    const preview = document.createElement("aside");
    preview.className = "ad-preview";
    preview.dataset.scoutlyFallback = "true";
    preview.setAttribute("aria-label", "Scoutly promotion");
    preview.hidden = true;
    preview.innerHTML = '<a class="ad-preview-link" href="https://scoutly.one" target="_blank" rel="noreferrer"><img src="' + import.meta.env.BASE_URL + 'assets/scoutly-house-ad.png" alt="Scoutly: the only app you need for competitive robotics"></a>';
    anchor.insertAdjacentElement("afterend", preview);
    return preview;
  });

  const settle = () => {
    anchors.forEach((anchor, index) => {
      if (hasFilledGoogleAdIn(anchor)) previews[index].hidden = true;
      else if (hasGoogleAdResponseIn(anchor)) previews[index].hidden = false;
    });
  };
  const observer = new MutationObserver(settle);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-ad-status", "src"] });
  const timeout = window.setTimeout(() => {
    anchors.forEach((anchor, index) => {
      if (!hasFilledGoogleAdIn(anchor)) previews[index].hidden = false;
    });
  }, SCOUTLY_FALLBACK_DELAY);
  window.__hvnScoutlyFallbackCleanup = () => {
    observer.disconnect();
    window.clearTimeout(timeout);
  };
  settle();
}

export function mountGoogleAdSlots() {
  mountGameAdRails();
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
