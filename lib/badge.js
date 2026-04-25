// Injection de badge mutualisée entre adapters de sites.
window.BoucherCompareBadge = {
  inject(el, info) {
    // Outline sur la carte entière selon le niveau (toujours mis à jour)
    el.classList.remove("bc-product--good", "bc-product--fair", "bc-product--high", "bc-product--neutral");
    el.classList.add(`bc-product--${info.level}`);

    // Si un badge existe déjà, on le supprime pour le re-rendre.
    const existing = el.querySelector(".bc-badge");
    if (existing) existing.remove();

    const badge = document.createElement("div");
    badge.className = `bc-badge bc-badge--${info.level}`;
    const lines = [];
    if (info.catAvg != null) {
      lines.push(`Catalogue (${info.catN} produits) : ${info.catAvg.toFixed(2)} €/kg moy.`);
    }
    if (info.rnmAvg != null) {
      lines.push(`Marché RNM : ${info.rnmAvg.toFixed(2)} €/kg moy.`);
    }
    if (lines.length === 0) lines.push("Pas de référence pour ce produit");
    badge.title = lines.join("\n");

    const main = document.createElement("div");
    main.className = "bc-badge__main";

    const dot = document.createElement("span");
    dot.className = "bc-badge__dot";

    const label = document.createElement("span");
    label.className = "bc-badge__text";
    label.textContent = info.label;

    main.appendChild(dot);
    main.appendChild(label);
    badge.appendChild(main);

    // Deltas (catalogue + marché) empilés verticalement
    if (info.catRatio != null || info.rnmRatio != null) {
      const deltas = document.createElement("div");
      deltas.className = "bc-badge__deltas";
      const fmt = (r) => {
        const p = Math.round((r - 1) * 100);
        return p === 0 ? "=" : p > 0 ? `+${p}%` : `${p}%`;
      };
      if (info.catRatio != null) {
        const s = document.createElement("span");
        s.textContent = `cat ${fmt(info.catRatio)}`;
        deltas.appendChild(s);
      }
      if (info.rnmRatio != null) {
        const s = document.createElement("span");
        s.textContent = `marché ${fmt(info.rnmRatio)}`;
        deltas.appendChild(s);
      }
      badge.appendChild(deltas);
    }

    // Anchor : la carte elle-même. Position fixe top:8/left:8 (CSS).
    // Stratégie volontairement simple : sur tous les e-commerce l'image est
    // au top de la carte, donc le badge sera visuellement sur l'image.
    const cs = getComputedStyle(el);
    if (cs.position === "static") el.style.position = "relative";
    el.appendChild(badge);
  }
};
