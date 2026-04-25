// Adaptateur pourdebon.com — marketplace multi-vendeurs.
// Stratégie heuristique : on ne connaît pas le sélecteur exact des cartes,
// donc on remonte depuis chaque texte "X € / Kg" jusqu'au plus petit
// ancêtre qui contient un lien + une image (= la carte produit).
(function () {
  if (!/pourdebon\.com$/.test(location.hostname)) return;

  const PRICE_PER_KG_REGEX = /(\d+[.,]?\d*)\s*€\s*\/\s*k(?:g|ilo)/i;
  // pourdebon : URLs produit du type "entrecote-d-aubrac-p45226"
  const PRODUCT_URL_REGEX = /-p\d+(?:[/?#]|$)/i;

  function findProductLink(el) {
    const links = el.querySelectorAll("a[href]");
    for (const a of links) {
      if (PRODUCT_URL_REGEX.test(a.getAttribute("href") || "")) return a;
    }
    return null;
  }

  function parseNum(s) {
    return parseFloat(String(s).replace(/\s/g, "").replace(",", "."));
  }

  function findProducts() {
    const candidates = new Set();

    // Walker sur tous les noeuds texte contenant "€ / Kg"
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let textNode;
    while ((textNode = walker.nextNode())) {
      if (!PRICE_PER_KG_REGEX.test(textNode.textContent)) continue;

      // Remonte jusqu'à un ancêtre "carte" : a + img dans le sous-arbre,
      // mais sans contenir d'autres "€/kg" (sinon on a remonté trop haut).
      let n = textNode.parentElement;
      let depth = 0;
      while (n && n !== document.body && depth < 8) {
        const hasLink = !!n.querySelector("a[href]");
        const hasMedia = !!n.querySelector("img, picture, [style*='background-image']");
        const ppkCount = (n.textContent.match(/€\s*\/\s*k(?:g|ilo)/gi) || []).length;
        if (hasLink && hasMedia && ppkCount === 1) {
          candidates.add(n);
          break;
        }
        n = n.parentElement;
        depth++;
      }
    }

    // Dédupe : si une "carte" en contient une autre, garder la plus petite
    const arr = Array.from(candidates);
    return arr.filter((a) => !arr.some((b) => b !== a && b.contains(a)));
  }

  function extractProduct(el) {
    const text = el.textContent;

    // --- Lien produit : URL pourdebon = "{slug}-p{id}" ---
    const productLink = findProductLink(el);
    let url = location.href;
    if (productLink) {
      try {
        url = new URL(productLink.getAttribute("href"), location.origin).href;
      } catch (_) {}
    }

    // --- Titre : on PRIORISE les sources dédiées au produit
    //     (aria-label / alt / classes 'product-name'), parce que sur pourdebon
    //     le h2/h3 contient souvent le nom du SHOP, pas du produit. ---
    let title = "";

    // 1. aria-label / title du lien produit
    if (productLink) {
      title = (productLink.getAttribute("aria-label") || productLink.getAttribute("title") || "").trim();
    }

    // 2. alt de l'image principale (souvent = titre produit complet)
    if (!title) {
      const img = el.querySelector("img[alt]");
      const alt = (img?.getAttribute("alt") || "").trim();
      if (alt && alt.length > 3 && !/logo|avatar/i.test(alt)) title = alt;
    }

    // 3. Élément avec classe 'product-*' (mais pas 'shop' / 'vendor' / 'seller')
    if (!title) {
      const candidates = el.querySelectorAll(
        "[class*='product-name'], [class*='product-title'], [class*='productName'], [class*='productTitle'], [class*='item-name'], [class*='item-title']"
      );
      for (const c of candidates) {
        const v = (c.textContent || "").trim();
        if (v && v.length > 3 && !/€/.test(v)) { title = v; break; }
      }
    }

    // 4. Texte direct du lien produit (pas d'enfants imbriqués)
    if (!title && productLink) {
      const v = (productLink.textContent || "").trim();
      if (v && v.length > 3 && !/€/.test(v)) title = v;
    }

    // 5. Dernier recours : h1-h4 (peut être le shop, mais mieux que rien)
    if (!title) {
      const h = el.querySelector("h1, h2, h3, h4");
      title = (h?.textContent || "").trim();
    }

    // 6. Reconstruction depuis le slug du href produit (ex: entrecote-d-aubrac-p45226)
    if (!title && productLink) {
      const href = productLink.getAttribute("href") || "";
      const slug = href.split(/[?#]/)[0].split("/").pop();
      if (slug) {
        // Vire le suffixe "-p12345" pour récupérer juste le nom
        const cleanSlug = slug.replace(/-p\d+$/i, "");
        title = cleanSlug.replace(/[-_]/g, " ").trim()
          .replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }

    // Si le "titre" trouvé ressemble à un nom de shop (Boucherie X, Maison Y, Ferme Z…)
    // ET qu'on a un slug produit dispo, on préfère le slug.
    const looksLikeShop = /^(boucherie|maison|ferme|domaine|triperie|charcuterie|le\s+lavandier)\b/i.test(title);
    if (looksLikeShop && productLink) {
      const href = productLink.getAttribute("href") || "";
      const slug = href.split(/[?#]/)[0].split("/").pop().replace(/-p\d+$/i, "");
      if (slug) {
        title = slug.replace(/[-_]/g, " ").trim()
          .replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }

    // --- Prix au kg ---
    const m = text.match(PRICE_PER_KG_REGEX);
    const pricePerKg = m ? parseNum(m[1]) : null;

    // --- Nom du shop (heuristique pourdebon) ---
    let shop = "";
    const shopLink = el.querySelector(
      'a[href*="/boutique"], a[href*="/vendeur"], a[href*="/shop"], [class*="shop"], [class*="vendor"], [class*="seller"], [class*="producer"]'
    );
    if (shopLink) {
      const v = shopLink.textContent.trim();
      if (v && v.length < 60) shop = v;
    }

    if (!title || !pricePerKg) return null;

    // Garde-fou : sous 6 €/kg ce n'est pas un produit boucherie réel
    // (probablement une carte de shop ou un nombre capturé par hasard).
    if (pricePerKg < 6) return null;

    // Garde-fou : un produit a une URL produit pas une URL shop.
    if (url && /\/(boutique|vendeur|shop|seller)\b/.test(url) && !/\/(p|produit|product)\b/.test(url)) {
      return null;
    }

    return { title, url, pricePerKg, shop };
  }

  window.BoucherCompareSite = {
    id: "pourdebon",
    findProducts,
    extractProduct
  };
})();
