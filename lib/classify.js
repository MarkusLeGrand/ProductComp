// Classification des produits :
//  - Priorité au CATALOGUE (comparaison entre produits vus du même cut)
//  - Fallback RNM/FranceAgriMer si moins de 3 produits dans le catalogue
window.BoucherCompareClassify = (function () {
  const CATALOG_MIN_N = 3;

  // Stats indexées par 2 clés :
  //   - breed-spécifique : "boeuf/entrecote/wagyu"
  //   - générique cut    : "boeuf/entrecote"
  // Chaque produit contribue aux deux groupes (race + générique).
  function computeCutStats(products) {
    const byKey = {};
    const push = (key, price) => {
      if (!byKey[key]) byKey[key] = [];
      byKey[key].push(price);
    };
    for (const p of products) {
      if (!p.category || !p.cut || !p.pricePerKg) continue;
      push(`${p.category}/${p.cut}`, p.pricePerKg);
      if (p.breed) push(`${p.category}/${p.cut}/${p.breed}`, p.pricePerKg);
    }
    const stats = {};
    for (const [key, prices] of Object.entries(byKey)) {
      prices.sort((a, b) => a - b);
      const min = prices[0];
      const max = prices[prices.length - 1];
      const avg = prices.reduce((s, x) => s + x, 0) / prices.length;
      stats[key] = { n: prices.length, min, max, avg };
    }
    return stats;
  }

  // Récupère juste le ratio + meta pour le catalogue (cascade breed → générique)
  function getCatalogRatio(product, stats) {
    const tryKeys = [];
    if (product.breed) tryKeys.push(`${product.category}/${product.cut}/${product.breed}`);
    tryKeys.push(`${product.category}/${product.cut}`);
    for (const key of tryKeys) {
      const s = stats[key];
      if (s && s.n >= CATALOG_MIN_N) {
        return {
          ratio: product.pricePerKg / s.avg,
          avg: s.avg, min: s.min, max: s.max, n: s.n,
          breedSpecific: key.split("/").length === 3
        };
      }
    }
    return null;
  }

  function getRnmRatio(product, ref) {
    const refData = ref?.[product.category]?.[product.cut];
    if (!refData) return null;
    return {
      ratio: product.pricePerKg / refData.avg,
      avg: refData.avg, min: refData.min, max: refData.max
    };
  }

  // Classification COMBINÉE : on prend la moyenne des ratios (cat + marché).
  // Les seuils s'appliquent à ce ratio combiné, ce qui donne un verdict cohérent
  // avec les DEUX signaux affichés sous le badge.
  function classify(product, stats, ref) {
    const cat = getCatalogRatio(product, stats);
    const rnm = getRnmRatio(product, ref);
    if (!cat && !rnm) return null;

    const ratios = [];
    if (cat) ratios.push(cat.ratio);
    if (rnm) ratios.push(rnm.ratio);
    const combined = ratios.reduce((s, r) => s + r, 0) / ratios.length;

    let level, label;
    if (combined <= 0.95) { level = "good"; label = "Pas cher"; }
    else if (combined <= 1.20) { level = "fair"; label = "Prix médian"; }
    else { level = "high"; label = "Cher"; }

    return {
      level, label,
      ratio: combined,
      catRatio: cat?.ratio ?? null,
      catAvg:   cat?.avg ?? null,
      catN:     cat?.n ?? null,
      rnmRatio: rnm?.ratio ?? null,
      rnmAvg:   rnm?.avg ?? null,
      refAvg:   cat?.avg ?? rnm?.avg,
      refMin:   cat?.min ?? rnm?.min,
      refMax:   cat?.max ?? rnm?.max,
      source:   cat && rnm ? "combined" : (cat ? "catalog" : "rnm")
    };
  }

  return { computeCutStats, classify, getCatalogRatio, getRnmRatio };
})();
