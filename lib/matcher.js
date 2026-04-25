// Dictionnaire des pièces de viande -> catégorie + cut canonique
// Ordre important : les patterns plus spécifiques d'abord.
window.BoucherCompareMatcher = (function () {
  const cuts = [
    // ---------- BŒUF ----------
    { cat: "boeuf", cut: "cote_de_boeuf",  patterns: [/c[oô]te\s*(de\s*)?b[oœ]uf/i, /c[oô]te\s+premi[eè]re/i] },
    { cat: "boeuf", cut: "entrecote",      patterns: [/entrec[oô]te/i] },
    { cat: "boeuf", cut: "faux_filet",     patterns: [/faux[\s-]?filet/i, /contre[\s-]?filet/i] },
    { cat: "boeuf", cut: "filet",          patterns: [/\bfilet\s+de\s+b[oœ]uf/i, /tournedos/i, /ch[aâ]teaubriand/i] },
    { cat: "boeuf", cut: "rumsteck",       patterns: [/rumst[ée]ck/i, /rump\s?steak/i] },
    { cat: "boeuf", cut: "bavette",        patterns: [/bavette/i] },
    { cat: "boeuf", cut: "onglet",         patterns: [/onglet/i] },
    { cat: "boeuf", cut: "hampe",          patterns: [/hampe/i] },
    { cat: "boeuf", cut: "araignee",       patterns: [/araign[ée]e/i] },
    { cat: "boeuf", cut: "picanha",        patterns: [/picanha/i] },
    { cat: "boeuf", cut: "paleron",        patterns: [/paleron/i] },
    { cat: "boeuf", cut: "joue",           patterns: [/joue\s+de\s+b[oœ]uf/i] },
    { cat: "boeuf", cut: "bourguignon",    patterns: [/bourguignon/i] },
    { cat: "boeuf", cut: "pot_au_feu",     patterns: [/pot[\s-]?au[\s-]?feu/i] },
    { cat: "boeuf", cut: "plat_de_cotes",  patterns: [/plat\s+de\s+c[oô]tes/i] },
    { cat: "boeuf", cut: "queue",          patterns: [/queue\s+de\s+b[oœ]uf/i] },
    { cat: "boeuf", cut: "langue",         patterns: [/langue\s+de\s+b[oœ]uf/i] },
    { cat: "boeuf", cut: "steak_hache",    patterns: [/steak[\s-]?hach[ée]/i, /hach[ée]\s+(de\s+)?b[oœ]uf/i, /bif?teck\s+hach[ée]/i] },

    // ---------- VEAU ----------
    { cat: "veau", cut: "escalope",   patterns: [/escalope\s+de\s+veau/i] },
    { cat: "veau", cut: "cote",       patterns: [/c[oô]te\s+de\s+veau/i, /c[oô]telette\s+de\s+veau/i] },
    { cat: "veau", cut: "blanquette", patterns: [/blanquette/i] },
    { cat: "veau", cut: "jarret",     patterns: [/jarret\s+de\s+veau/i, /osso[\s-]?bucco/i] },
    { cat: "veau", cut: "tendron",    patterns: [/tendron/i] },
    { cat: "veau", cut: "paupiette",  patterns: [/paupiette/i] },
    { cat: "veau", cut: "roti",       patterns: [/r[oô]ti\s+de\s+veau/i] },
    { cat: "veau", cut: "foie",       patterns: [/foie\s+de\s+veau/i] },
    { cat: "veau", cut: "ris",        patterns: [/ris\s+de\s+veau/i] },

    // ---------- PORC ----------
    { cat: "porc", cut: "cote",         patterns: [/c[oô]te\s+de\s+porc/i, /c[oô]telette\s+de\s+porc/i] },
    { cat: "porc", cut: "filet_mignon", patterns: [/filet\s+mignon/i] },
    { cat: "porc", cut: "echine",       patterns: [/[ée]chine/i] },
    { cat: "porc", cut: "travers",      patterns: [/travers\s+de\s+porc/i, /spare\s?ribs/i] },
    { cat: "porc", cut: "poitrine",     patterns: [/poitrine\s+de\s+porc/i, /lard\s+frais/i] },
    { cat: "porc", cut: "rouelle",      patterns: [/rouelle/i] },
    { cat: "porc", cut: "palette",      patterns: [/palette/i] },
    { cat: "porc", cut: "roti",         patterns: [/r[oô]ti\s+de\s+porc/i] },

    // ---------- AGNEAU ----------
    { cat: "agneau", cut: "gigot",     patterns: [/gigot/i] },
    { cat: "agneau", cut: "epaule",    patterns: [/[ée]paule\s+d['e\s]?\s*agneau/i] },
    { cat: "agneau", cut: "cotelette", patterns: [/c[oô]telette\s+d['e\s]?\s*agneau/i, /carr[ée]\s+d['e\s]?\s*agneau/i, /c[oô]te\s+d['e\s]?\s*agneau/i] },
    { cat: "agneau", cut: "selle",     patterns: [/selle\s+d['e\s]?\s*agneau/i] },
    { cat: "agneau", cut: "collier",   patterns: [/collier\s+d['e\s]?\s*agneau/i, /navarin/i] },
    { cat: "agneau", cut: "souris",    patterns: [/souris\s+d['e\s]?\s*agneau/i] },

    // ---------- VOLAILLE ----------
    { cat: "volaille", cut: "filet_poulet",     patterns: [/filets?\s+de\s+poulet/i, /blanc\s+de\s+poulet/i, /escalope\s+de\s+poulet/i] },
    { cat: "volaille", cut: "cuisse_poulet",    patterns: [/cuisses?\s+de\s+poulet/i, /pilon/i] },
    { cat: "volaille", cut: "poulet_entier",    patterns: [/poulets?\s+(fermiers?|jaunes?|noirs?|entiers?|label\s+rouge)/i, /^poulet\b/i] },
    { cat: "volaille", cut: "aile_poulet",      patterns: [/ailes?\s+de\s+poulet/i, /manchons?/i] },
    { cat: "volaille", cut: "dinde",            patterns: [/escalope\s+de\s+dinde/i, /\bdinde\b/i] },
    { cat: "volaille", cut: "pintade",          patterns: [/pintade/i] },
    { cat: "volaille", cut: "caille",           patterns: [/caille/i] },

    // ---------- CANARD ----------
    { cat: "canard", cut: "magret",         patterns: [/magret/i] },
    { cat: "canard", cut: "cuisse_confite", patterns: [/cuisses?\s+confites?\s+de\s+canard/i, /confit\s+de\s+canard/i] },
    { cat: "canard", cut: "cuisse",         patterns: [/cuisses?\s+de\s+canard/i] },
    { cat: "canard", cut: "filet",          patterns: [/filets?\s+de\s+canard/i, /aiguillettes?\s+de\s+canard/i] },
    { cat: "canard", cut: "foie_gras",      patterns: [/foie\s+gras/i] },

    // ---------- CHARCUTERIE ----------
    { cat: "charcuterie", cut: "chipolata",          patterns: [/chipolata/i] },
    { cat: "charcuterie", cut: "saucisse_toulouse",  patterns: [/saucisses?\s+de\s+toulouse/i] },
    { cat: "charcuterie", cut: "merguez",            patterns: [/merguez/i] },
    { cat: "charcuterie", cut: "chorizo",            patterns: [/chorizo/i] },
    { cat: "charcuterie", cut: "boudin",             patterns: [/boudin/i] },
    { cat: "charcuterie", cut: "lardons",            patterns: [/lardons?/i] },
    { cat: "charcuterie", cut: "jambon_cru",         patterns: [/jambon\s+(cru|sec|de\s+bayonne|serrano|ib[ée]rique|de\s+pays)/i, /coppa/i] },
    { cat: "charcuterie", cut: "jambon_blanc",       patterns: [/jambon\s+(blanc|cuit|[àa]\s+l['a]\s*os)/i] },
    { cat: "charcuterie", cut: "saucisson",          patterns: [/saucisson/i, /rosette/i] },
    { cat: "charcuterie", cut: "andouille",          patterns: [/andouille/i, /andouillette/i] },
    { cat: "charcuterie", cut: "rillettes",          patterns: [/rillettes?/i] },
    { cat: "charcuterie", cut: "pate",               patterns: [/p[âa]t[ée]/i, /terrine/i] },

    // ---------- "Petits Lascours" (signature maison, type saucisse de viande)
    { cat: "charcuterie", cut: "petits_lascours_boeuf",  patterns: [/petits?\s+lascours?\s+de\s+b[oœ]uf/i] },
    { cat: "charcuterie", cut: "petits_lascours_veau",   patterns: [/petits?\s+lascours?\s+de\s+veau/i] },
    { cat: "charcuterie", cut: "petits_lascours_agneau", patterns: [/petits?\s+lascours?\s+d['e\s]?\s*agneau/i] },

    // ---------- LAPIN ----------
    { cat: "lapin", cut: "rable",   patterns: [/r[âa]ble/i] },
    { cat: "lapin", cut: "cuisse",  patterns: [/cuisses?\s+de\s+lapin/i] },
    { cat: "lapin", cut: "foie",    patterns: [/foie\s+de\s+lapin/i] },
    { cat: "lapin", cut: "entier",  patterns: [/lapin\s+entier|\blapin\b(?!\s+(de|noir))/i] },

    // ---------- GIBIER ----------
    { cat: "gibier", cut: "sanglier_filet",    patterns: [/filet.*sanglier|sanglier.*filet/i] },
    { cat: "gibier", cut: "sanglier_cuissot",  patterns: [/cuissot.*sanglier|sanglier.*cuissot|gigot.*sanglier/i] },
    { cat: "gibier", cut: "sanglier_epaule",   patterns: [/[ée]paule.*sanglier|sanglier.*[ée]paule/i] },
    { cat: "gibier", cut: "sanglier",          patterns: [/sanglier/i] },
    { cat: "gibier", cut: "chevreuil_filet",   patterns: [/filet.*chevreuil|chevreuil.*filet/i] },
    { cat: "gibier", cut: "chevreuil_cuissot", patterns: [/cuissot.*chevreuil|chevreuil.*cuissot|gigot.*chevreuil/i] },
    { cat: "gibier", cut: "chevreuil",         patterns: [/chevreuil/i] },
    { cat: "gibier", cut: "biche",             patterns: [/biche/i] },
    { cat: "gibier", cut: "cerf",              patterns: [/\bcerf\b/i] },
    { cat: "gibier", cut: "lievre",            patterns: [/li[èe]vre/i] },
    { cat: "gibier", cut: "faisan",            patterns: [/faisan/i] },
    { cat: "gibier", cut: "perdrix",           patterns: [/perdr[ie]/i] },
    { cat: "gibier", cut: "pigeon",            patterns: [/pigeon/i] },

    // ---------- VOLAILLE — extensions ----------
    { cat: "volaille", cut: "coq",         patterns: [/\bcoq\b/i] },
    { cat: "volaille", cut: "chapon",      patterns: [/chapon/i] },
    { cat: "volaille", cut: "poularde",    patterns: [/poularde/i] },
    { cat: "volaille", cut: "oie",         patterns: [/\boie\b/i] },
    { cat: "volaille", cut: "caneton",     patterns: [/caneton/i] },
    { cat: "volaille", cut: "foie_volaille", patterns: [/foies?\s+de\s+volaille|foies?\s+de\s+poulet/i] },
    { cat: "volaille", cut: "gesier",      patterns: [/g[ée]siers?/i] },

    // ---------- CANARD — extensions ----------
    { cat: "canard", cut: "aiguillette",   patterns: [/aiguillettes?\s+de\s+canard/i] },
    { cat: "canard", cut: "coeur",         patterns: [/c[oœ]urs?\s+de\s+canard/i] },
    { cat: "canard", cut: "manchons",      patterns: [/manchons?\s+de\s+canard/i] },

    // ---------- PORC — extensions (abats / spécifiques) ----------
    { cat: "porc", cut: "pieds",       patterns: [/pieds?\s+de\s+porc/i] },
    { cat: "porc", cut: "oreilles",    patterns: [/oreilles?\s+de\s+porc/i] },
    { cat: "porc", cut: "queue",       patterns: [/queue\s+de\s+porc/i] },
    { cat: "porc", cut: "joue",        patterns: [/joues?\s+de\s+porc/i] },
    { cat: "porc", cut: "ventreche",   patterns: [/ventr[èe]che|pancetta/i] },
    { cat: "porc", cut: "lard",        patterns: [/\blard\s+(fum[ée]|sal[ée]|paysan)/i] },

    // ---------- BŒUF — extensions ----------
    { cat: "boeuf", cut: "t_bone",      patterns: [/t[\s-]?bone/i] },
    { cat: "boeuf", cut: "tomahawk",    patterns: [/tomahawk/i] },
    { cat: "boeuf", cut: "macreuse",    patterns: [/macreuse/i] },
    { cat: "boeuf", cut: "gite",        patterns: [/\bg[îi]te(?:\s+de\s+b[oœ]uf)?\b/i] },
    { cat: "boeuf", cut: "tende",       patterns: [/tende\s+de\s+tranche/i] },
    { cat: "boeuf", cut: "merlan",      patterns: [/\bmerlan\b/i] },
    { cat: "boeuf", cut: "carpaccio",   patterns: [/carpaccio/i] },
    { cat: "boeuf", cut: "tartare",     patterns: [/tartare/i] },
    { cat: "boeuf", cut: "noix",        patterns: [/noix\s+(d['e\s]?\s*entrec[oô]te|p[âa]tissi[èe]re)/i] },

    // ---------- VEAU — extensions ----------
    { cat: "veau", cut: "tete",         patterns: [/t[êe]te\s+de\s+veau/i] },
    { cat: "veau", cut: "rognon",       patterns: [/rognons?\s+de\s+veau/i] },
    { cat: "veau", cut: "cervelle",     patterns: [/cervelle\s+de\s+veau/i] },
    { cat: "veau", cut: "langue",       patterns: [/langue\s+de\s+veau/i] },

    // ---------- CHARCUTERIE — extensions ----------
    { cat: "charcuterie", cut: "morteau",       patterns: [/morteau/i] },
    { cat: "charcuterie", cut: "montbeliard",   patterns: [/montb[ée]liard/i] },
    { cat: "charcuterie", cut: "cervelas",      patterns: [/cervelas/i] },
    { cat: "charcuterie", cut: "knack",         patterns: [/\bknack|francfort|strasbourg(?:eoise)?/i] },
    { cat: "charcuterie", cut: "boudin_blanc",  patterns: [/boudin\s+blanc/i] },
    { cat: "charcuterie", cut: "boudin_noir",   patterns: [/boudin\s+noir/i] },
    { cat: "charcuterie", cut: "saucisson_sec", patterns: [/saucisson\s+(sec|d['e\s]\s*ardennes?|de\s+lyon)/i, /rosette/i, /j[ée]sus\s+de\s+lyon/i] },
    { cat: "charcuterie", cut: "bresaola",      patterns: [/bresaola/i] },
    { cat: "charcuterie", cut: "lonzo",         patterns: [/lonzo|lonzu/i] },
    { cat: "charcuterie", cut: "pate_croute",   patterns: [/p[âa]t[ée]\s+en\s+cro[ûu]te/i] },
    { cat: "charcuterie", cut: "rillons",       patterns: [/rillons/i] },
    { cat: "charcuterie", cut: "fuet",          patterns: [/fuet/i] },
    { cat: "charcuterie", cut: "bacon",         patterns: [/\bbacon\b/i] },

    // ---------- ABATS génériques ----------
    { cat: "abats", cut: "tripes",      patterns: [/tripes/i] },
    { cat: "abats", cut: "rognons",     patterns: [/\brognons?\b/i] },
    { cat: "abats", cut: "foie_genrl",  patterns: [/^foie\s+/i] },

    // ---------- LÉGUMES ----------
    { cat: "legumes", cut: "tomate",        patterns: [/tomate/i] },
    { cat: "legumes", cut: "pomme_terre",   patterns: [/pommes?\s+de\s+terre|patate(?!\s+douce)/i] },
    { cat: "legumes", cut: "patate_douce",  patterns: [/patate\s+douce/i] },
    { cat: "legumes", cut: "carotte",       patterns: [/carotte/i] },
    { cat: "legumes", cut: "oignon",        patterns: [/oignon/i] },
    { cat: "legumes", cut: "ail",           patterns: [/\bail\b(?!\s+des\s+ours)/i] },
    { cat: "legumes", cut: "echalote",      patterns: [/[ée]chalote/i] },
    { cat: "legumes", cut: "courgette",     patterns: [/courgette/i] },
    { cat: "legumes", cut: "aubergine",     patterns: [/aubergine/i] },
    { cat: "legumes", cut: "poivron",       patterns: [/poivron/i] },
    { cat: "legumes", cut: "salade",        patterns: [/\bsalade\b|laitue|m[âa]che|roquette|sucrine|batavia|frisée/i] },
    { cat: "legumes", cut: "epinard",       patterns: [/[ée]pinard/i] },
    { cat: "legumes", cut: "chou",          patterns: [/\bchoux?\b(?!\s*-?\s*fleur)|chou\s+(rouge|blanc|vert|frisé|kale)/i] },
    { cat: "legumes", cut: "chou_fleur",    patterns: [/chou[\s-]?fleur/i] },
    { cat: "legumes", cut: "brocoli",       patterns: [/brocoli/i] },
    { cat: "legumes", cut: "champignon",    patterns: [/champignon|cèpe|girolle|morille|pleurote|shi[i]?take|portobello/i] },
    { cat: "legumes", cut: "courge",        patterns: [/courge|potiron|potimarron|butternut|giraumon/i] },
    { cat: "legumes", cut: "poireau",       patterns: [/poireau/i] },
    { cat: "legumes", cut: "celeri",        patterns: [/c[ée]leri/i] },
    { cat: "legumes", cut: "haricot_vert",  patterns: [/haricots?\s+verts?/i] },
    { cat: "legumes", cut: "haricot_sec",   patterns: [/haricots?\s+(blancs?|coco|tarbais|mogette|rouge)/i] },
    { cat: "legumes", cut: "asperge",       patterns: [/asperge/i] },
    { cat: "legumes", cut: "artichaut",     patterns: [/artichaut/i] },
    { cat: "legumes", cut: "concombre",     patterns: [/concombre/i] },
    { cat: "legumes", cut: "radis",         patterns: [/radis/i] },
    { cat: "legumes", cut: "betterave",     patterns: [/betterave/i] },
    { cat: "legumes", cut: "navet",         patterns: [/navet/i] },
    { cat: "legumes", cut: "fenouil",       patterns: [/fenouil/i] },
    { cat: "legumes", cut: "endive",        patterns: [/endive/i] },
    { cat: "legumes", cut: "petit_pois",    patterns: [/petits?\s+pois/i] },
    { cat: "legumes", cut: "feve",          patterns: [/\bf[èe]ves?\b/i] },
    { cat: "legumes", cut: "mais",          patterns: [/\bma[iï]s\b/i] },
    { cat: "legumes", cut: "topinambour",   patterns: [/topinambour/i] },
    { cat: "legumes", cut: "panais",        patterns: [/panais/i] },
    { cat: "legumes", cut: "rutabaga",      patterns: [/rutabaga/i] }
  ];

  // ============= RACES / ORIGINES =============
  // Détecté en plus du cut. Permet de comparer Wagyu vs Wagyu plutôt que
  // Wagyu vs Limousine. L'ordre compte : races spécifiques avant labels.
  const breeds = [
    // Boeuf — luxe / japonais
    { name: "kobe",   patterns: [/kobe\s+beef|\bkobe\b/i] },
    { name: "wagyu",  patterns: [/wagyu|matsusaka/i] },

    // Boeuf — races françaises
    { name: "aubrac",            patterns: [/aubrac/i] },
    { name: "limousine",         patterns: [/limousin[e]?/i] },
    { name: "charolaise",        patterns: [/charolais/i] },
    { name: "salers",            patterns: [/salers/i] },
    { name: "blonde_aquitaine",  patterns: [/blonde\s+d['e\s]?\s*aquitaine/i] },
    { name: "normande",          patterns: [/normande/i] },
    { name: "parthenaise",       patterns: [/parthenais/i] },
    { name: "rouge_des_pres",    patterns: [/rouge\s+des\s+pr[ée]s|maine[\s-]?anjou/i] },
    { name: "bazadaise",         patterns: [/bazadais/i] },

    // Boeuf — races étrangères
    { name: "angus",      patterns: [/aberdeen\s+angus|black\s+angus|\bangus\b/i] },
    { name: "highland",   patterns: [/highland/i] },
    { name: "hereford",   patterns: [/hereford/i] },
    { name: "simmental",  patterns: [/simmental/i] },
    { name: "galloway",   patterns: [/galloway/i] },
    { name: "wagyu_aus",  patterns: [/wagyu.*australie|australien.*wagyu/i] },

    // Bison (techniquement animal différent, mais traité comme race)
    { name: "bison", patterns: [/bison/i] },

    // Porc
    { name: "porc_noir_bigorre", patterns: [/porc\s+noir\s+(de\s+)?bigorre|noir\s+de\s+bigorre/i] },
    { name: "iberique",          patterns: [/ib[ée]rique|iberico|pata\s+negra|bellota/i] },
    { name: "basque",            patterns: [/\bbasque\b|kintoa/i] },
    { name: "duroc",             patterns: [/duroc/i] },
    { name: "mangalitsa",        patterns: [/mangalit[sz]a/i] },
    { name: "gascon",            patterns: [/porc\s+gascon|gascon\s+(noir|fermier)/i] },

    // Agneau
    { name: "agneau_pyrenees", patterns: [/agneau\s+(des\s+)?pyr[ée]n[ée]es|pyr[ée]n[ée]es?\s+agneau/i] },
    { name: "agneau_sisteron", patterns: [/sisteron/i] },
    { name: "agneau_lozere",   patterns: [/loz[èe]re/i] },
    { name: "agneau_aveyron",  patterns: [/aveyron/i] },

    // Volaille
    { name: "bresse",   patterns: [/bresse/i] },
    { name: "landes",   patterns: [/(?:des\s+)?landes/i] },
    { name: "challans", patterns: [/challans/i] },

    // Labels qualité (en dernier, moins prioritaire que les races)
    { name: "label_rouge", patterns: [/label\s+rouge/i] },
    { name: "bio",         patterns: [/\bbio\b|biologique/i] },
    { name: "aop",         patterns: [/\baop\b|\baoc\b/i] },
    { name: "igp",         patterns: [/\bigp\b/i] }
  ];

  function detectBreed(title) {
    if (!title) return null;
    for (const b of breeds) {
      for (const p of b.patterns) {
        if (p.test(title)) return b.name;
      }
    }
    return null;
  }

  function match(title) {
    if (!title) return null;
    let cutMatch = null;
    for (const c of cuts) {
      for (const p of c.patterns) {
        if (p.test(title)) { cutMatch = { category: c.cat, cut: c.cut }; break; }
      }
      if (cutMatch) break;
    }
    if (!cutMatch) return null;
    return { ...cutMatch, breed: detectBreed(title) };
  }

  return { match, detectBreed };
})();
