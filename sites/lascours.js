// Adaptateur Maison Lascours (boutique Shopify).
// Stratégie : sélecteurs Shopify standards + fallbacks heuristiques.
(function () {
  if (!/maison-?lascours\.fr$/.test(location.hostname)) return;
  window.BoucherCompareSite = (function () {
  const PRICE_PER_KG_REGEX = /(\d+[.,]?\d*)\s*€?\s*\/\s*kg/i;
  const WEIGHT_REGEX = /(\d+[.,]?\d*)\s*(kg|g|gr|grammes?)\b/i;
  const PRICE_REGEX = /(\d+[.,]?\d*)\s*€/;

  function parseNum(s) {
    return parseFloat(String(s).replace(/\s/g, "").replace(",", "."));
  }

  function findProducts() {
    // Sur Maison Lascours (thème Shopify avec custom element <product-card>),
    // c'est le sélecteur fiable qui exclut les liens du mega-menu.
    const primary = Array.from(document.querySelectorAll("product-card"));
    if (primary.length > 0) return primary;

    // Fallbacks pour autres thèmes Shopify.
    const fallbacks = [
      ".product-card",
      ".card-wrapper",
      ".grid-product",
      ".product-grid-item",
      "[data-product-id]"
    ];
    for (const sel of fallbacks) {
      const found = Array.from(document.querySelectorAll(sel));
      if (found.length > 0) return found;
    }

    // Page produit unique.
    const single = document.querySelector(
      ".product-single, .product__info-wrapper, main .product, [data-product-form]"
    );
    return single ? [single] : [];
  }

  function extractProduct(el) {
    const text = (el.innerText || "").replace(/ /g, " ");

    // Cherche le lien produit (sert au titre ET à l'URL)
    const linkEl = el.querySelector('a[href*="/products/"]');
    const url = linkEl ? new URL(linkEl.getAttribute("href"), location.origin).href : location.href;

    // Stratégie titre, du plus précis au plus permissif
    let title = "";
    const titleSelectors = [
      ".product-card__title",
      ".card__heading",
      ".product__title",
      "h1", "h2", "h3", "h4",
      "[class*='title']",
      "[class*='heading']",
      "[class*='name']"
    ];
    for (const sel of titleSelectors) {
      const t = el.querySelector(sel);
      const v = (t?.innerText || t?.textContent || "").trim();
      if (v && !/^\s*\d/.test(v) && v.length > 2) { title = v; break; }
    }

    // Fallback aria-label / title / alt sur le lien produit
    if (!title && linkEl) {
      title = (linkEl.getAttribute("aria-label") ||
               linkEl.getAttribute("title") ||
               linkEl.querySelector("img")?.getAttribute("alt") ||
               linkEl.innerText || "").trim();
    }

    // Fallback 1ère ligne non-numérique de innerText
    if (!title) {
      const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
      title = lines.find((l) => l.length > 3 && !/€|\bkg\b/i.test(l)) || "";
    }

    // Dernier recours : reconstruction depuis le slug du href
    if (!title && linkEl) {
      const slug = linkEl.getAttribute("href").split("/products/")[1]?.split(/[?#]/)[0];
      if (slug) {
        title = slug.replace(/[-_]/g, " ").trim()
          .replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }

    if (!title) return null;

    let pricePerKg = null;
    let source = null;

    // 1. Mention explicite "X €/kg"
    const ppk = text.match(PRICE_PER_KG_REGEX);
    if (ppk) {
      pricePerKg = parseNum(ppk[1]);
      source = "explicit";
    }

    // 2. Inférence prix + poids dans le titre
    if (!pricePerKg) {
      const weightMatch = title.match(WEIGHT_REGEX) || text.match(WEIGHT_REGEX);
      const priceMatch = text.match(PRICE_REGEX);
      if (weightMatch && priceMatch) {
        const price = parseNum(priceMatch[1]);
        let weight = parseNum(weightMatch[1]);
        const unit = weightMatch[2].toLowerCase();
        if (unit !== "kg") weight = weight / 1000;
        if (weight > 0 && price > 0) {
          pricePerKg = price / weight;
          source = "inferred";
        }
      }
    }

    return { title, url, pricePerKg, source };
  }

  return { id: "lascours", findProducts, extractProduct };
})();
})();
