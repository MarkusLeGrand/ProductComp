// Orchestrateur : matche les produits, calcule l'écart vs cours du marché,
// injecte les badges, et stocke le résultat pour le popup.
(function () {
  // ⚠️ Sécurité : sur les pages de paiement, l'extension ne fait RIEN.
  // Pas de scan, pas d'observer, pas d'injection DOM — pour éviter d'être
  // confondue avec un script de scraping par les systèmes anti-fraude
  // (Stripe Radar, etc.) ou de casser un script de checkout.
  const CHECKOUT_REGEX = /\/(checkout|checkouts|paiement|payment|order|commande|confirmation|order-status|merci|thank-you|success)(\/|$|\?)/i;
  if (CHECKOUT_REGEX.test(location.pathname + location.search)) {
    console.log("[BoucherCompare] page paiement détectée — extension désactivée");
    return;
  }

  const SCAN_DEBOUNCE_MS = 600;

  let referenceData = null;
  let scanScheduled = false;
  let observer = null;

  // Détecte si le contexte de l'extension est encore valide.
  // Quand l'utilisateur reload l'extension dans chrome://extensions/,
  // les content scripts déjà injectés perdent chrome.runtime.
  function isContextValid() {
    try {
      return !!(chrome && chrome.runtime && chrome.runtime.id);
    } catch (_) {
      return false;
    }
  }

  async function loadReference() {
    if (referenceData) return referenceData;
    const url = chrome.runtime.getURL("data/reference_prices.json");
    referenceData = await fetch(url).then((r) => r.json());
    return referenceData;
  }

  // Sites en mode "accumulateur" : leurs résultats fusionnent dans un
  // catalogue persistant ALL-TIME (pas de TTL — l'utilisateur vide manuellement).
  const ACCUMULATOR_SITES = new Set(["pourdebon"]);

  async function loadCatalog(siteId) {
    const { catalog = {} } = await chrome.storage.local.get("catalog");
    return Object.values(catalog[siteId]?.products || {});
  }

  async function mergeIntoCatalog(siteId, newResults) {
    const { catalog = {} } = await chrome.storage.local.get("catalog");
    if (!catalog[siteId]) catalog[siteId] = { products: {} };

    const now = Date.now();
    for (const r of newResults) {
      const key = r.url || `${r.shop}::${r.title}`;
      const existing = catalog[siteId].products[key];
      // On garde le firstSeen (date de la 1ère apparition) si déjà présent
      catalog[siteId].products[key] = {
        ...r,
        ts: now,
        firstSeen: existing?.firstSeen || now
      };
    }

    catalog[siteId].lastUpdated = now;
    await chrome.storage.local.set({ catalog });
  }

  function isCartPage() {
    return /\/(cart|panier|checkout)(\/|$|\?)/i.test(location.pathname + location.search);
  }

  async function scan() {
    if (!isContextValid()) {
      if (observer) observer.disconnect();
      return;
    }

    // Mode panier : pas de badges, juste un récap (générique, pas d'adapter requis)
    if (isCartPage()) {
      buildCartSummary();
      return;
    }

    const adapter = window.BoucherCompareSite;
    const matcher = window.BoucherCompareMatcher;
    const Classify = window.BoucherCompareClassify;
    if (!adapter || !matcher || !Classify) {
      console.warn("[BoucherCompare] adapter / matcher / classify introuvable");
      return;
    }

    const ref = await loadReference();
    const isAccumulator = ACCUMULATOR_SITES.has(adapter.id);
    const catalogProducts = isAccumulator ? await loadCatalog(adapter.id) : [];

    const nodes = adapter.findProducts();
    console.log(`[BoucherCompare/${adapter.id}] ${nodes.length} cartes produit détectées`);

    // Étape 1 : extraire tous les produits avec titre + prix/kg (cut optionnel)
    const pageProducts = [];
    const debug = [];
    for (const node of nodes) {
      const data = adapter.extractProduct(node);
      if (!data) { debug.push({ ok: false, reason: "no-title" }); continue; }
      if (!data.pricePerKg) { debug.push({ ok: false, reason: "no-price-per-kg", title: data.title }); continue; }
      const m = matcher.match(data.title);
      pageProducts.push({
        node,
        title: data.title,
        url: data.url,
        pricePerKg: data.pricePerKg,
        category: m?.category || null,
        cut: m?.cut || null,
        breed: m?.breed || null,
        shop: data.shop || ""
      });
    }

    // Étape 2 : stats sur les produits qui ONT une catégorie/cut
    const classifiable = [...pageProducts, ...catalogProducts].filter((p) => p.category && p.cut);
    const stats = Classify.computeCutStats(classifiable);

    // Étape 3 : classifier (ou marquer "neutral") + injecter le badge
    const results = [];
    for (const p of pageProducts) {
      let cls = null;
      if (p.category && p.cut) {
        cls = Classify.classify(p, stats, ref);
      }
      if (!cls) {
        cls = { level: "neutral", label: "Sans comparaison", source: "none" };
      }
      window.BoucherCompareBadge.inject(p.node, cls);
      results.push({
        title: p.title,
        url: p.url,
        pricePerKg: p.pricePerKg,
        category: p.category,
        cut: p.cut,
        breed: p.breed,
        shop: p.shop,
        ...cls
      });
      debug.push({
        ok: cls.level !== "neutral",
        title: p.title,
        pricePerKg: p.pricePerKg,
        cut: p.cut ? `${p.category}/${p.cut}` : "—",
        level: cls.level,
        source: cls.source
      });
    }

    console.log(`[BoucherCompare] ${pageProducts.length} reconnus, ${results.length} badgés (catalogue: ${catalogProducts.length})`);
    if (debug.length) console.table(debug);
    window.__BoucherCompareDebug = { nodes, debug, results, stats };

    results.sort((a, b) => a.ratio - b.ratio);

    chrome.storage.local.set({
      lastScan: {
        site: adapter.id,
        url: location.href,
        ts: Date.now(),
        totalProducts: nodes.length,
        recognized: pageProducts.length,
        results
      }
    });

    // Mode accumulateur : fusion dans le catalogue persistant
    if (isAccumulator && results.length > 0) {
      await mergeIntoCatalog(adapter.id, results);
    }
  }

  function scheduleScan() {
    if (scanScheduled) return;
    scanScheduled = true;
    setTimeout(() => {
      scanScheduled = false;
      scan().catch((e) => console.warn("[BoucherCompare]", e));
    }, SCAN_DEBOUNCE_MS);
  }

  // ===== MODE PANIER : récap kg / €/kg / total =====

  function findCartLines() {
    const selectors = [
      "[data-cart-item]",
      "cart-items .cart-item",
      ".cart-item",
      ".cart-line",
      ".line-item",
      "tr.cart-line",
      "tr.line-item",
      "[class*='cart-item']",
      "[class*='line-item']",
      "[class*='panier-item']",
      "[class*='basket-item']"
    ];
    let best = [];
    for (const sel of selectors) {
      const found = Array.from(document.querySelectorAll(sel));
      if (found.length > best.length) best = found;
    }
    return best;
  }

  function parseNum(s) {
    return parseFloat(String(s).replace(/\s/g, "").replace(",", "."));
  }

  function extractCartLine(line) {
    const text = line.innerText || line.textContent || "";

    // Titre : lien produit ou heading
    const linkProd =
      line.querySelector('a[href*="/products/"]') ||
      line.querySelector('a[href*="-p"]') ||
      line.querySelector('a[href*="/p/"]') ||
      line.querySelector('a[href*="/produit/"]') ||
      line.querySelector("a[href]");
    const titleEl =
      line.querySelector("h1, h2, h3, h4, [class*='title'], [class*='name']") || linkProd;
    const title = (titleEl?.innerText || titleEl?.textContent || "").trim();

    // Quantité
    const qtyInput = line.querySelector("input[type='number'], input[name*='quantit' i], input[name*='qty' i]");
    let qty = 1;
    if (qtyInput) qty = parseInt(qtyInput.value, 10) || 1;
    else {
      const qtyText = text.match(/x\s*(\d+)|qt[ée]\.?\s*:?\s*(\d+)|quantité\s*:?\s*(\d+)/i);
      if (qtyText) qty = parseInt(qtyText[1] || qtyText[2] || qtyText[3], 10) || 1;
    }

    // Poids du titre (250g, 1kg, 1.5 kg, …)
    const weightMatch = title.match(/(\d+[.,]?\d*)\s*(kg|g|gr|grammes?)\b/i);
    let weightKg = 0;
    if (weightMatch) {
      const v = parseNum(weightMatch[1]);
      const unit = weightMatch[2].toLowerCase();
      weightKg = unit === "kg" ? v : v / 1000;
    }

    // Prix : on prend le PLUS GROS € de la ligne (souvent le sous-total)
    const all = [...text.matchAll(/(\d+[.,]?\d{1,2})\s*€/g)].map((m) => parseNum(m[1]));
    const linePrice = all.length ? Math.max(...all) : 0;

    // Prix unitaire = prix de ligne / qty (heuristique)
    const unitPrice = qty > 0 ? linePrice / qty : linePrice;

    // €/kg si dispo dans le texte
    const ppkMatch = text.match(/(\d+[.,]?\d*)\s*€\s*\/\s*k(?:g|ilo)/i);
    const pricePerKg = ppkMatch ? parseNum(ppkMatch[1]) : null;

    return { title, qty, weightKg, linePrice, unitPrice, pricePerKg };
  }

  function buildCartSummary() {
    const lines = findCartLines();
    let totalKg = 0;
    let totalPrice = 0;
    let lineCount = 0;
    const items = [];

    for (const line of lines) {
      const it = extractCartLine(line);
      if (!it.title || it.linePrice <= 0) continue;
      lineCount++;
      const lineKg = it.weightKg * it.qty;
      totalKg += lineKg;
      totalPrice += it.linePrice;
      items.push(it);
    }

    const avg = totalKg > 0 ? totalPrice / totalKg : null;
    renderCartPanel({ lineCount, totalKg, totalPrice, avg, items });
  }

  function renderCartPanel({ lineCount, totalKg, totalPrice, avg, items }) {
    let panel = document.getElementById("bc-cart-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "bc-cart-panel";
      panel.className = "bc-cart-panel";
      document.body.appendChild(panel);
    }

    const fmt = (n, d = 2) => (n == null ? "—" : n.toFixed(d));
    panel.innerHTML = `
      <div class="bc-cart-panel__header">
        <span class="bc-cart-panel__logo">🥩 BoucherCompare</span>
        <button class="bc-cart-panel__close" aria-label="Fermer">×</button>
      </div>
      <div class="bc-cart-panel__title">Récap panier</div>
      <div class="bc-cart-panel__stats">
        <div class="bc-cart-panel__stat">
          <span class="bc-cart-panel__num">${lineCount}</span>
          <span class="bc-cart-panel__lab">articles</span>
        </div>
        <div class="bc-cart-panel__stat">
          <span class="bc-cart-panel__num">${totalKg > 0 ? fmt(totalKg, 2) : "—"}</span>
          <span class="bc-cart-panel__lab">kg total</span>
        </div>
        <div class="bc-cart-panel__stat">
          <span class="bc-cart-panel__num">${avg ? fmt(avg, 2) : "—"}</span>
          <span class="bc-cart-panel__lab">€/kg moy.</span>
        </div>
        <div class="bc-cart-panel__stat bc-cart-panel__stat--total">
          <span class="bc-cart-panel__num">${fmt(totalPrice, 2)} €</span>
          <span class="bc-cart-panel__lab">total panier</span>
        </div>
      </div>
      ${totalKg === 0 ? `<div class="bc-cart-panel__warn">Aucun poids détecté dans les titres → moyenne €/kg indispo.</div>` : ""}
    `;
    panel.querySelector(".bc-cart-panel__close").addEventListener("click", () => panel.remove());
  }

  // Applique l'état d'affichage des badges (toggle popup) au chargement
  async function applyBadgeVisibility() {
    if (!isContextValid()) return;
    try {
      const { settings = {} } = await chrome.storage.local.get("settings");
      document.documentElement.classList.toggle("bc-badges-hidden", settings.badgesHidden === true);
    } catch (_) {}
  }
  applyBadgeVisibility();

  // Écoute les changements du toggle depuis le popup
  if (chrome?.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg && msg.type === "bc-toggle-badges") {
        document.documentElement.classList.toggle("bc-badges-hidden", msg.hidden === true);
      }
    });
  }

  scheduleScan();

  // Re-scan en cas de chargement Ajax (filtres, pagination, etc.)
  observer = new MutationObserver(scheduleScan);
  observer.observe(document.body, { childList: true, subtree: true });
})();
