const GOOGLE_AD_CLIENT = "ca-pub-1123012671033143";
const GOOGLE_AD_SLOT = "3947449400";

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
