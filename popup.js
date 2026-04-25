function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function fmtCut(cat, cut, breed) {
  if (!cat || !cut) return "non classé";
  const base = `${cat} · ${cut.replace(/_/g, " ")}`;
  if (breed) return `${base} · ${breed.replace(/_/g, " ")}`;
  return base;
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

function siteIdFromUrl(url) {
  if (!url) return null;
  if (/maison-?lascours\.fr/.test(url)) return "lascours";
  if (/pourdebon\.com/.test(url)) return "pourdebon";
  return null;
}

const state = {
  allProducts: [],
  filter: null,
  query: "",
  showAge: false
};

function renderSummary(summary, products) {
  const goods = products.filter((x) => x.level === "good").length;
  const fairs = products.filter((x) => x.level === "fair").length;
  const highs = products.filter((x) => x.level === "high").length;
  const neuts = products.filter((x) => x.level === "neutral").length;
  summary.hidden = false;
  summary.innerHTML = `
    <button class="bc-summary__cell bc-summary__cell--good" data-filter="good">
      <span class="bc-summary__num">${goods}</span>
      <span class="bc-summary__lab">Bonnes affaires</span>
    </button>
    <button class="bc-summary__cell bc-summary__cell--fair" data-filter="fair">
      <span class="bc-summary__num">${fairs}</span>
      <span class="bc-summary__lab">Prix médian</span>
    </button>
    <button class="bc-summary__cell bc-summary__cell--high" data-filter="high">
      <span class="bc-summary__num">${highs}</span>
      <span class="bc-summary__lab">Chers</span>
    </button>
    <button class="bc-summary__cell bc-summary__cell--neutral" data-filter="neutral">
      <span class="bc-summary__num">${neuts}</span>
      <span class="bc-summary__lab">Sans comp.</span>
    </button>
  `;

  summary.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const f = btn.dataset.filter;
      state.filter = state.filter === f ? null : f;
      updateActiveFilterUI();
      renderList();
    });
  });
}

function updateActiveFilterUI() {
  document.querySelectorAll(".bc-summary__cell").forEach((b) => {
    b.classList.toggle("bc-summary__cell--active", b.dataset.filter === state.filter);
  });
}

function fmtPct(r) {
  if (r == null) return null;
  const p = Math.round((r - 1) * 100);
  return p === 0 ? "=" : p > 0 ? `+${p}%` : `${p}%`;
}

function buildItem(item) {
  const a = document.createElement("a");
  a.className = `bc-item bc-item--${item.level}`;
  a.href = item.url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";

  const subParts = [];
  if (item.shop) subParts.push(escapeHtml(item.shop));
  subParts.push(escapeHtml(fmtCut(item.category, item.cut, item.breed)));
  if (state.showAge && item.ts) subParts.push(timeAgo(item.ts));

  // Deltas combinés : catalogue + marché RNM, empilés verticalement
  const deltaLines = [];
  if (item.catRatio != null) deltaLines.push(`<span>cat ${fmtPct(item.catRatio)}</span>`);
  if (item.rnmRatio != null) deltaLines.push(`<span>marché ${fmtPct(item.rnmRatio)}</span>`);
  const deltaHtml = deltaLines.length
    ? deltaLines.join("")
    : (item.ratio != null ? `<span>${fmtPct(item.ratio)}</span>` : "");

  a.innerHTML = `
    <span class="bc-item__dot"></span>
    <div>
      <div class="bc-item__title">${escapeHtml(item.title)}</div>
      <div class="bc-item__cut">${subParts.join(" · ")}</div>
    </div>
    <div class="bc-item__price">
      ${item.pricePerKg.toFixed(2)} €/kg
      <span class="bc-item__delta">${deltaHtml}</span>
    </div>
  `;
  return a;
}

function renderList() {
  const list = document.getElementById("list");
  const noResults = document.getElementById("no-results");
  list.innerHTML = "";

  let filtered = state.allProducts;
  if (state.filter) {
    filtered = filtered.filter((p) => p.level === state.filter);
  }
  if (state.query) {
    const q = state.query.toLowerCase();
    filtered = filtered.filter((p) => {
      const hay = `${p.title} ${p.shop || ""} ${p.category || ""} ${(p.cut || "").replace(/_/g, " ")} ${(p.breed || "").replace(/_/g, " ")}`.toLowerCase();
      return hay.includes(q);
    });
  }

  if (filtered.length === 0) {
    noResults.hidden = false;
  } else {
    noResults.hidden = true;
    for (const item of filtered) list.appendChild(buildItem(item));
  }
}

function bindSearch() {
  const search = document.getElementById("search");
  search.addEventListener("input", (e) => {
    state.query = e.target.value.trim();
    renderList();
  });
}

async function bindBadgeToggle(tabId) {
  const toggle = document.getElementById("badge-toggle");
  const { settings = {} } = await chrome.storage.local.get("settings");
  toggle.checked = settings.badgesHidden !== true;

  toggle.addEventListener("change", async () => {
    const hidden = !toggle.checked;
    const { settings = {} } = await chrome.storage.local.get("settings");
    settings.badgesHidden = hidden;
    await chrome.storage.local.set({ settings });
    if (tabId) {
      try {
        await chrome.tabs.sendMessage(tabId, { type: "bc-toggle-badges", hidden });
      } catch (_) { /* tab pas un site supporté */ }
    }
  });
}

(async function () {
  const empty = document.getElementById("empty");
  const summary = document.getElementById("summary");
  const footer = document.getElementById("footer-info");
  const actions = document.getElementById("actions");
  const controls = document.getElementById("controls");
  const tagline = document.getElementById("tagline");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  bindBadgeToggle(tab?.id);

  const siteId = siteIdFromUrl(tab?.url);

  if (!siteId) {
    empty.hidden = false;
    empty.textContent = "Ouvre une page d'un site supporté puis reclique sur l'icône.";
    footer.textContent = "Sites supportés : maison-lascours.fr · pourdebon.com";
    return;
  }

  // === MODE ACCUMULATEUR (pourdebon) ===
  if (siteId === "pourdebon") {
    tagline.textContent = "Catalogue accumulé · classement entre vendeurs";
    const { catalog = {} } = await chrome.storage.local.get("catalog");
    const rawProducts = Object.values(catalog.pourdebon?.products || {});

    if (rawProducts.length === 0) {
      empty.hidden = false;
      empty.textContent =
        "Catalogue vide. Navigue sur des pages produits pourdebon (recherche, sous-catégories) pour le remplir.";
      footer.textContent = "Aucun produit mémorisé";
      return;
    }

    // Re-matcher cat/cut/breed pour les anciennes entrées du catalogue
    // (le dictionnaire matcher s'enrichit au fil des versions)
    for (const p of rawProducts) {
      if (!p.title) continue;
      if (!p.category || !p.cut) {
        const m = window.BoucherCompareMatcher.match(p.title);
        if (m) {
          p.category = m.category;
          p.cut = m.cut;
          p.breed = p.breed || m.breed;
        }
      } else if (!p.breed) {
        p.breed = window.BoucherCompareMatcher.detectBreed(p.title);
      }
    }

    // Re-classifier en fonction de TOUT le catalogue actuel
    const ref = await fetch(chrome.runtime.getURL("data/reference_prices.json")).then((r) => r.json());
    const classifiable = rawProducts.filter((p) => p.category && p.cut);
    const stats = window.BoucherCompareClassify.computeCutStats(classifiable);
    const products = rawProducts.map((p) => {
      let cls = null;
      if (p.category && p.cut) cls = window.BoucherCompareClassify.classify(p, stats, ref);
      if (!cls) cls = { level: "neutral", label: "Sans comparaison", source: "none" };
      return { ...p, ...cls };
    });

    // Tri : classés par ratio croissant, neutrals en bas
    products.sort((a, b) => {
      if (a.level === "neutral" && b.level !== "neutral") return 1;
      if (b.level === "neutral" && a.level !== "neutral") return -1;
      return (a.ratio ?? Infinity) - (b.ratio ?? Infinity);
    });
    state.allProducts = products;
    state.showAge = true;

    controls.hidden = false;
    renderSummary(summary, products);
    bindSearch();
    renderList();

    actions.hidden = false;
    document.getElementById("clear-catalog").addEventListener("click", async () => {
      if (!confirm("Vider le catalogue accumulé ?")) return;
      const { catalog = {} } = await chrome.storage.local.get("catalog");
      delete catalog.pourdebon;
      await chrome.storage.local.set({ catalog });
      window.close();
    });

    const lastUpdated = catalog.pourdebon?.lastUpdated;
    footer.textContent = `${products.length} produits · maj ${lastUpdated ? timeAgo(lastUpdated) : "—"}`;
    return;
  }

  // === MODE SCAN COURANT (lascours) ===
  const { lastScan } = await chrome.storage.local.get("lastScan");
  if (!lastScan || !lastScan.results || lastScan.results.length === 0) {
    empty.hidden = false;
    empty.textContent =
      "Aucun produit reconnu sur cette page. Recharge-la, ou navigue sur une collection.";
    footer.textContent = "—";
    return;
  }

  state.allProducts = lastScan.results;
  state.showAge = false;

  controls.hidden = false;
  renderSummary(summary, lastScan.results);
  bindSearch();
  renderList();

  const date = new Date(lastScan.ts).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short"
  });
  footer.textContent = `Analyse du ${date} · ${lastScan.recognized}/${lastScan.totalProducts} reconnus`;
})();
