// ====================================================================
// SNIPPET DEBUG MAISON LASCOURS
// À coller tel quel dans la console DevTools (F12 -> Console)
// sur https://maisonlascours.fr/collections/all
// puis copie-colle TOUT ce qui s'affiche dans le chat.
// ====================================================================
(() => {
  const SELECTOR_CANDIDATES = [
    ".product-card",
    ".card-wrapper",
    ".grid-product",
    ".product-grid-item",
    ".product-item",
    "[data-product-id]",
    "li.grid__item",
    ".grid__item",
    "product-card",
    "article.product",
    ".card",
    "[class*='product'][class*='card']"
  ];

  console.log("%c=== BoucherCompare DEBUG ===", "background:#8b1a1a;color:#fff;padding:4px 8px;font-weight:bold;");
  console.log("URL :", location.href);
  console.log("Title :", document.title);

  console.log("\n--- 1. Combien de noeuds par sélecteur candidat ? ---");
  const counts = {};
  for (const s of SELECTOR_CANDIDATES) {
    try {
      counts[s] = document.querySelectorAll(s).length;
    } catch (e) {
      counts[s] = "ERREUR " + e.message;
    }
  }
  console.table(counts);

  console.log("\n--- 2. Tous les liens /products/ trouvés ---");
  const productLinks = document.querySelectorAll('a[href*="/products/"]');
  console.log("Total liens produit :", productLinks.length);

  console.log("\n--- 3. Pour les 3 premiers liens produit, on remonte chercher le conteneur 'carte' ---");
  const samples = [];
  Array.from(productLinks).slice(0, 3).forEach((a, i) => {
    const ancestors = [];
    let n = a;
    let depth = 0;
    while (n && n !== document.body && depth < 8) {
      ancestors.push({
        depth,
        tag: n.tagName,
        class: n.className && typeof n.className === "string" ? n.className.slice(0, 120) : "",
        id: n.id || ""
      });
      n = n.parentElement;
      depth++;
    }
    samples.push({ index: i, href: a.getAttribute("href"), text: (a.innerText || "").trim().slice(0, 80) });
    console.log(`\nLien #${i} : ${a.getAttribute("href")}`);
    console.log("Texte :", (a.innerText || "").trim().slice(0, 200));
    console.table(ancestors);
  });

  console.log("\n--- 4. HTML brut du parent le plus probable du 1er produit (carte complète) ---");
  if (productLinks[0]) {
    const card = productLinks[0].closest(
      ".product-card, .card-wrapper, .grid__item, article, li, .card, [class*='product']"
    );
    if (card) {
      console.log("Sélecteur trouvé :", card.tagName + (card.className ? "." + card.className.replace(/\s+/g, ".") : ""));
      console.log("InnerText :\n" + card.innerText);
      console.log("OuterHTML (1500 premiers chars) :\n" + card.outerHTML.slice(0, 1500));
    } else {
      console.warn("Pas de conteneur ancêtre trouvé.");
    }
  }

  console.log("\n--- 5. Toutes les occurrences '€/kg' sur la page ---");
  const all = document.body.innerText;
  const matches = all.match(/[^\n]*€\s*\/\s*kg[^\n]*/gi) || [];
  console.log(`${matches.length} occurrences trouvées :`);
  matches.slice(0, 10).forEach((m, i) => console.log(`  [${i}] ${m.trim().slice(0, 120)}`));

  console.log("\n--- 6. État de l'extension BoucherCompare ---");
  console.log("window.BoucherCompareSite :", !!window.BoucherCompareSite);
  console.log("window.BoucherCompareMatcher :", !!window.BoucherCompareMatcher);
  console.log("window.__BoucherCompareDebug :", window.__BoucherCompareDebug);

  console.log("\n%c=== FIN DEBUG — copie tout ce qui est au-dessus ===", "background:#6b8e23;color:#fff;padding:4px 8px;font-weight:bold;");
})();
