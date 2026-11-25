(() => {
  const DEFAULT_PROFILE = {
    name: "TRADISTER SASU",
    siren: "988318945",
    siret: "98831894500017",
    tva_number: "FR42988318945",
    naf_code: "62.02A",
    address: "11 Rue du Château d'Eau, App 132, 91130 Ris-Orangis, France",
    target_departments: ["91", "75", "92", "93", "94", "77", "78", "95"],
    target_cpv_codes: ["72000000", "72200000", "72300000", "72500000", "72600000", "48000000"],
    target_keywords: [
      "infogérance",
      "cloud",
      "cybersécurité",
      "support informatique",
      "helpdesk",
      "maintenance applicative",
      "TMA",
      "MCO",
      "développement logiciel",
      "systèmes d information",
      "ITSM",
      "managed services",
    ],
    min_target_amount: 10000,
    max_target_amount: 500000,
  };

  const I18N = {
    fr: {
      pageTitle: "TRADISTER SASU — Veille Marchés Publics FR & UE (PWA)",
      installText:
        "<strong>App mobile prête :</strong> installez <strong>TRADISTER AO</strong> sur votre téléphone.",
      installBtn: "Installer",
      iosInstall:
        "Sur iPhone/iPad : appuyez sur <strong>Partager</strong> puis <strong>Sur l'écran d'accueil</strong>.",
      brandTitle: "TRADISTER SASU — Marchés Publics",
      brandSub: "France (BOAMP) &amp; Union Européenne (TED)",
      tabTenders: "Veille FR &amp; UE",
      tabProfile: "Profil Tradister",
      mobTenders: "FR &amp; UE",
      presidentLabel: "Présidente :",
      vatLabel: "TVA",
      refreshBoampBtn: "↻ Actualiser BOAMP (Direct)",
      refreshingBoamp: "Interrogation BOAMP...",
      kpiTotal: "Marchés affichés",
      kpiFr: "France (BOAMP + TED)",
      kpiEu: "Union Européenne (TED)",
      kpiAvg: "Adéquation moy. / Urgents",
      triageUnseen: "🆕 À trier (Non vus)",
      triageFavorites: "⭐ Favoris",
      triageSeen: "👁️ Déjà vus",
      triageAll: "📋 Tous",
      markVisibleSeen: "✓ Marquer la page vue",
      regionAll: "France puis UE",
      regionFr: "France",
      regionEu: "UE",
      searchPlaceholder: "Filtrer par mot-clé, acheteur, CPV, pays...",
      loadingTenders: "Chargement des marchés pertinents France &amp; UE...",
      profileTitle: "Profil Entreprise Enregistré — TRADISTER SASU",
      profileSub:
        "Données vérifiées INSEE / RNE utilisées pour filtrer automatiquement les appels d'offres non pertinents. Vos ajustements sont sauvegardés localement sur votre appareil.",
      lblCompany: "Entreprise",
      lblPresident: "Président(e)",
      lblNaf: "Code NAF / APE",
      lblDepts: "Départements prioritaires (France)",
      lblCpvs: "Codes CPV cibles",
      lblKeywords: "Mots-clés IT / Services Managés (MSP)",
      lblMinAmt: "Montant cible min (€)",
      lblMaxAmt: "Montant cible max (€)",
      saveRecalcBtn: "Enregistrer &amp; Recalculer",
      resetProfileBtn: "Réinitialiser TRADISTER",
      amountUnpublished: "Non publié (MAPA / voir DCE)",
      amountHt: "HT",
      buyer: "Acheteur",
      unspecified: "Non précisé",
      deadline: "Date limite",
      toVerify: "À vérifier",
      targetAmount: "Montant cible",
      suitability: "Adéquation",
      viewNotice: "Voir avis",
      emptyFiltered: "Aucun appel d'offres dans cette vue.",
      emptyUnseenHint:
        "Tous les marchés correspondants ont déjà été triés ! Consultez ⭐ Favoris ou 👁️ Déjà vus, ou actualisez BOAMP.",
      frSectionTitle: "1. Appels d'offres pertinents en France",
      frSectionSub: "Triés par adéquation TRADISTER SASU puis échéance",
      euSectionTitle: "2. Appels d'offres pertinents en Union Européenne",
      euSectionSub: "Source TED Europa • IT / Cloud / Cybersécurité",
      directModeHint:
        "Mode direct : cliquez sur « Actualiser BOAMP (Direct) » pour charger les avis français en direct.",
      profileSavedMsg: "Critères TRADISTER SASU enregistrés et pertinence recalculée.",
      profileResetMsg: "Profil vérifié TRADISTER SASU restauré.",
      daysPrefix: "J-",
      favBtn: "☆ Favori",
      favActiveBtn: "★ Favori",
      markSeenBtn: "→ Déplacer vers Vus",
      unseeBtn: "↺ Remettre non vu",
      seenBadge: "Vu",
      screenToReview: "À screener",
      screenGo: "GO — À préparer",
      screenInProgress: "En préparation",
      screenNoGo: "No-Go",
      prev50: "← 50 précédents",
      next50: "50 suivants →",
      showingLabel: "Affichage",
      ofLabel: "sur",
      pageLabel: "Page",
      postedLabel: "Publié",
      sortFit: "Trier : Adéquation (FR → UE)",
      sortPostDesc: "Trier : Date de publication (récent)",
      sortPostAsc: "Trier : Date de publication (ancien)",
      sortDeadlineAsc: "Trier : Date limite (urgente)",
      sortAmountDesc: "Trier : Montant (élevé → bas)",
      sortAmountAsc: "Trier : Montant (bas → élevé)",
    },
    en: {
      pageTitle: "TRADISTER SASU — FR & EU Public Tenders Watch (PWA)",
      installText:
        "<strong>Mobile app ready:</strong> install <strong>TRADISTER AO</strong> on your phone.",
      installBtn: "Install",
      iosInstall:
        "On iPhone/iPad: tap <strong>Share</strong> then <strong>Add to Home Screen</strong>.",
      brandTitle: "TRADISTER SASU — Public Tenders",
      brandSub: "France (BOAMP) &amp; European Union (TED)",
      tabTenders: "FR &amp; EU Feed",
      tabProfile: "Tradister Profile",
      mobTenders: "FR &amp; EU",
      presidentLabel: "President:",
      vatLabel: "VAT",
      refreshBoampBtn: "↻ Refresh BOAMP (Live)",
      refreshingBoamp: "Querying BOAMP...",
      kpiTotal: "Total in view",
      kpiFr: "France (BOAMP + TED)",
      kpiEu: "European Union (TED)",
      kpiAvg: "Avg. Fit / Urgent",
      triageUnseen: "🆕 Unseen",
      triageFavorites: "⭐ Favorites",
      triageSeen: "👁️ Seen",
      triageAll: "📋 All",
      markVisibleSeen: "✓ Mark page seen",
      regionAll: "France then EU",
      regionFr: "France",
      regionEu: "EU",
      searchPlaceholder: "Filter by keyword, buyer, CPV, country...",
      loadingTenders: "Loading relevant France &amp; EU tenders...",
      profileTitle: "Registered Company Profile — TRADISTER SASU",
      profileSub:
        "Verified INSEE / RNE company data used to automatically filter out irrelevant tenders. Your adjustments are saved locally on your device.",
      lblCompany: "Company",
      lblPresident: "President",
      lblNaf: "NAF / APE Code",
      lblDepts: "Priority Departments (France)",
      lblCpvs: "Target CPV Codes",
      lblKeywords: "IT / Managed Services (MSP) Keywords",
      lblMinAmt: "Min Target Value (€)",
      lblMaxAmt: "Max Target Value (€)",
      saveRecalcBtn: "Save &amp; Recalculate",
      resetProfileBtn: "Reset TRADISTER",
      amountUnpublished: "Unpublished (MAPA / check DCE)",
      amountHt: "excl. VAT",
      buyer: "Buyer",
      unspecified: "Not specified",
      deadline: "Deadline",
      toVerify: "To verify",
      targetAmount: "Target value",
      suitability: "Fit Score",
      viewNotice: "View notice",
      emptyFiltered: "No tenders in this view.",
      emptyUnseenHint:
        "All matching tenders have already been screened! Check ⭐ Favorites or 👁️ Seen, or refresh BOAMP.",
      frSectionTitle: "1. Relevant Tenders in France",
      frSectionSub: "Sorted by TRADISTER SASU fit score then deadline",
      euSectionTitle: "2. Relevant Tenders in the European Union",
      euSectionSub: "Source: TED Europa • IT / Cloud / Cybersecurity",
      directModeHint:
        "Direct mode: click « Refresh BOAMP (Live) » to fetch French tenders live.",
      profileSavedMsg: "TRADISTER SASU criteria saved and suitability recalculated.",
      profileResetMsg: "Verified TRADISTER SASU profile restored.",
      daysPrefix: "D-",
      favBtn: "☆ Favorite",
      favActiveBtn: "★ Favorite",
      markSeenBtn: "→ Move to Seen",
      unseeBtn: "↺ Move to Unseen",
      seenBadge: "Seen",
      screenToReview: "To screen",
      screenGo: "GO — Prepare bid",
      screenInProgress: "In progress",
      screenNoGo: "No-Go",
      prev50: "← Previous 50",
      next50: "Next 50 →",
      showingLabel: "Showing",
      ofLabel: "of",
      pageLabel: "Page",
      postedLabel: "Posted",
      sortFit: "Sort: Fit Score (FR → EU)",
      sortPostDesc: "Sort: Post date (newest)",
      sortPostAsc: "Sort: Post date (oldest)",
      sortDeadlineAsc: "Sort: Deadline date (soonest)",
      sortAmountDesc: "Sort: Amount (high → low)",
      sortAmountAsc: "Sort: Amount (low → high)",
    },
  };

  const STORAGE_KEY = "tradister_ao_profile_v1";
  const LANG_KEY = "tradister_ao_lang_v1";
  const TRIAGE_KEY = "tradister_ao_triage_v2";
  const PAGE_SIZE = 50;

  const CPV_LABELS = {
    "72000000": { fr: "Services IT, conseil & support", en: "IT services, consulting & support" },
    "721": { fr: "Conseil en matériel informatique", en: "Hardware consultancy" },
    "722": { fr: "Programmation & conseil logiciels", en: "Software programming & consulting" },
    "723": { fr: "Services de données & cloud", en: "Data & cloud services" },
    "724": { fr: "Services Internet", en: "Internet services" },
    "725": { fr: "Services informatiques", en: "Computer-related services" },
    "726": { fr: "Appui informatique & conseil", en: "Computer support & consulting" },
    "72": { fr: "Services informatiques (IT)", en: "IT services" },
    "48": { fr: "Logiciels & systèmes d'information", en: "Software & information systems" },
  };

  function getCpvLabel(code) {
    const clean = String(code || "").replace(/\D/g, "");
    if (!clean) return "";
    if (CPV_LABELS[clean]) return CPV_LABELS[clean][lang];
    for (const len of [3, 2]) {
      const prefix = clean.slice(0, len);
      if (CPV_LABELS[prefix]) return CPV_LABELS[prefix][lang];
    }
    return "";
  }

  let lang = loadLang();
  let profile = loadProfile();
  let triageState = loadTriageState();
  let allTenders = [];
  let triageFilter = "UNSEEN"; // UNSEEN (default, all unscreened) | FAVORITES | SEEN | ALL
  let regionFilter = "ALL";
  let sortMode = "fit";
  let minScore = 50;
  let searchQuery = "";
  let currentPage = 1;
  let currentPageIds = [];
  let deferredInstallPrompt = null;

  function loadLang() {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved === "en" || saved === "fr") return saved;
    } catch {}
    return "fr";
  }

  function loadProfile() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...DEFAULT_PROFILE, ...JSON.parse(saved) };
    } catch {}
    return { ...DEFAULT_PROFILE };
  }

  function saveProfile(next) {
    profile = next;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }

  function loadTriageState() {
    try {
      const raw = localStorage.getItem(TRIAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          favorites: parsed.favorites || {},
          seen: parsed.seen || {},
          verdicts: parsed.verdicts || {},
        };
      }
    } catch {}
    return { favorites: {}, seen: {}, verdicts: {} };
  }

  function saveTriageState() {
    try {
      localStorage.setItem(TRIAGE_KEY, JSON.stringify(triageState));
    } catch {}
  }

  function isFavorite(id) {
    return Boolean(triageState.favorites[id]);
  }

  function isSeen(id) {
    return Boolean(triageState.seen[id]);
  }

  function toggleFavorite(id) {
    if (triageState.favorites[id]) {
      delete triageState.favorites[id];
    } else {
      triageState.favorites[id] = true;
      // Moving to favorites also marks as seen so it leaves the Unseen list
      triageState.seen[id] = true;
      if (!triageState.verdicts[id]) {
        triageState.verdicts[id] = "to_review";
      }
    }
    saveTriageState();
    renderTenders();
  }

  function toggleSeen(id, forceVal) {
    const next = forceVal !== undefined ? forceVal : !triageState.seen[id];
    if (next) {
      triageState.seen[id] = true;
    } else {
      delete triageState.seen[id];
      delete triageState.favorites[id];
    }
    saveTriageState();
    renderTenders();
  }

  function setVerdict(id, verdict) {
    triageState.verdicts[id] = verdict;
    saveTriageState();
  }

  function markPageAsSeen() {
    for (const id of currentPageIds) {
      triageState.seen[id] = true;
    }
    saveTriageState();
    renderTenders();
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatAmount(amt, cur = "EUR") {
    const dict = I18N[lang];
    if (amt == null || amt <= 0) return dict.amountUnpublished;
    const locale = lang === "fr" ? "fr-FR" : "en-GB";
    return `${Math.round(amt).toLocaleString(locale)} ${cur} ${dict.amountHt}`;
  }

  function computeSuitability(tender) {
    const blob = `${tender.title || ""} ${tender.description || ""}`.toLowerCase();
    const cpvs = (tender.cpv_codes || []).map((c) => String(c).replace(/\D/g, ""));
    const targetCpvs = (profile.target_cpv_codes || []).map((c) => String(c).replace(/\D/g, ""));
    const cpvDivs = new Set(targetCpvs.map((c) => c.slice(0, 2)).filter((c) => c.length >= 2));

    const matched4 = cpvs.filter((c) => targetCpvs.some((tc) => tc.length >= 4 && c.startsWith(tc.slice(0, 4))));
    const matched2 = cpvs.filter((c) => c.length >= 2 && cpvDivs.has(c.slice(0, 2)));
    const matchedKws = (profile.target_keywords || []).filter((k) => blob.includes(k.toLowerCase()));
    const itTerms = ["informatique", "logiciel", "cloud", "infogérance", "cybersécurité", "software", "managed service", "helpdesk", "saas", "tma", "mco", "itsm"];
    const hasIt = itTerms.some((term) => blob.includes(term));

    if (!matched4.length && !matched2.length && !matchedKws.length && !hasIt) {
      return { relevant: false, score: 0, summary: [] };
    }

    const isEn = lang === "en";
    let score = 30;
    const reasons = [];
    if (matched4.length || matchedKws.length) {
      score += Math.min(40, 18 + 6 * matchedKws.length + 8 * matched4.length);
      const tags = [...new Set([...matchedKws.slice(0, 3), ...matched4.slice(0, 2)])];
      reasons.push(
        isEn
          ? `Strong IT/MSP domain fit (${tags.join(", ")}).`
          : `Forte adéquation métier IT/MSP (${tags.join(", ")}).`
      );
    } else if (matched2.length) {
      score += 22;
      reasons.push(
        isEn
          ? `Sector CPV match (${matched2.slice(0, 3).join(", ")}).`
          : `Adéquation CPV sectorielle (${matched2.slice(0, 3).join(", ")}).`
      );
    } else {
      reasons.push(
        isEn
          ? "General IT scope match — verify technical requirements."
          : "Correspondance IT générale — vérifier le périmètre technique."
      );
    }

    const depts = new Set(profile.target_departments || []);
    if (tender.region === "FR") {
      if (tender.department && depts.has(tender.department)) {
        score += 20;
        reasons.push(
          isEn
            ? `France — Priority area (dept. ${tender.department}, near Ris-Orangis 91).`
            : `France — Zone prioritaire (département ${tender.department}, proche Ris-Orangis 91).`
        );
      } else {
        score += 13;
        reasons.push(
          isEn
            ? `France (dept. ${tender.department || "national"}) — eligible national delivery.`
            : `France (département ${tender.department || "national"}) — éligible prestation nationale.`
        );
      }
    } else {
      if (["BEL", "LUX", "CHE", "MCO"].includes(tender.country)) {
        score += 12;
        reasons.push(
          isEn
            ? `French-speaking EU (${tender.country}) — high accessibility.`
            : `Union Européenne francophone (${tender.country}) — forte accessibilité.`
        );
      } else if (["IRL", "NLD", "DEU", "ESP", "ITA", "PRT", "AUT", "DNK", "SWE", "FIN"].includes(tender.country)) {
        score += 7;
        reasons.push(
          isEn
            ? `European Union (${tender.country}) — cross-border IT/cloud contract.`
            : `Union Européenne (${tender.country}) — marché transfrontalier IT/cloud.`
        );
      } else {
        score += 4;
        reasons.push(
          isEn
            ? `European Union (${tender.country}) — verify language requirements.`
            : `Union Européenne (${tender.country}) — vérifier exigences linguistiques.`
        );
      }
    }

    const minAmt = Number(profile.min_target_amount || 0);
    const maxAmt = Number(profile.max_target_amount || 500000);
    const amt = tender.estimated_amount;
    const cur = tender.currency || "EUR";
    const locale = isEn ? "en-GB" : "fr-FR";
    let amtNote = isEn
      ? "Value unpublished (check MAPA / BPU)"
      : "Montant non publié (vérifier seuil MAPA / BPU)";
    if (typeof amt === "number" && amt > 0) {
      const fmt = `${Math.round(amt).toLocaleString(locale)} ${cur}`;
      if (amt >= minAmt && amt <= maxAmt) {
        score += 10;
        amtNote = isEn ? `Optimal target value (${fmt})` : `Montant cible optimal (${fmt})`;
      } else if (amt < minAmt) {
        score += 3;
        amtNote = isEn ? `Small contract (${fmt})` : `Petit marché (${fmt})`;
      } else if (amt <= maxAmt * 4) {
        score += 4;
        amtNote = isEn
          ? `High value (${fmt} — check lots/consortium)`
          : `Montant élevé (${fmt} — lotissement/GME à vérifier)`;
      } else {
        score -= 8;
        amtNote = isEn
          ? `Large contract (${fmt} — consortium/subcontracting advised)`
          : `Marché d'envergure (${fmt} — groupement/sous-traitance recommandé)`;
      }
    } else {
      score += 4;
    }

    let daysLeft = null;
    if (tender.deadline_date) {
      daysLeft = Math.floor((new Date(tender.deadline_date).getTime() - Date.now()) / 86400000);
      if (daysLeft < 0) return { relevant: false, score: 0, summary: [] };
      if (daysLeft >= 10) {
        score += 8;
        reasons.push(
          isEn
            ? `${amtNote} • Comfortable timeline (D-${daysLeft}).`
            : `${amtNote} • Délai confortable (J-${daysLeft}).`
        );
      } else {
        score += 2;
        reasons.push(
          isEn
            ? `${amtNote} • Tight deadline (D-${daysLeft}).`
            : `${amtNote} • Délai court (J-${daysLeft}).`
        );
      }
    } else {
      reasons.push(
        isEn
          ? `${amtNote} • Deadline to be confirmed.`
          : `${amtNote} • Date limite à confirmer.`
      );
    }

    return {
      relevant: true,
      score: Math.max(0, Math.min(100, score)),
      summary: reasons.slice(0, 3),
      days_remaining: daysLeft,
    };
  }

  function applyTranslations() {
    const dict = I18N[lang] || I18N.fr;
    document.documentElement.lang = lang;
    document.title = dict.pageTitle;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (dict[key]) {
        el.innerHTML = dict[key];
      }
    });
    const searchEl = document.getElementById("search-input");
    if (searchEl) searchEl.placeholder = dict.searchPlaceholder;
    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.lang === lang);
    });
    renderProfileHeader();
    renderTenders();
  }

  function renderProfileHeader() {
    const locale = lang === "fr" ? "fr-FR" : "en-GB";
    document.getElementById("company-name").textContent = profile.name;
    const minStr = Number(profile.min_target_amount || 0).toLocaleString(locale);
    const maxStr = Number(profile.max_target_amount || 500000).toLocaleString(locale);
    document.getElementById("company-target-line").innerHTML =
      lang === "en"
        ? `Target value: <strong>${minStr} € – ${maxStr} €</strong> • France (IDF/91 priority) then European Union`
        : `Cible montant : <strong>${minStr} € – ${maxStr} €</strong> • France (priorité IDF/91) puis Union Européenne`;

    document.getElementById("prof-name").value = profile.name || "";
    document.getElementById("prof-siret").value = profile.siret || "";
    document.getElementById("prof-naf").value = profile.naf_code || "";
    document.getElementById("prof-depts").value = (profile.target_departments || []).join(", ");
    document.getElementById("prof-cpvs").value = (profile.target_cpv_codes || []).join(", ");
    renderCpvLegend(profile.target_cpv_codes || []);
    document.getElementById("prof-keywords").value = (profile.target_keywords || []).join(", ");
    document.getElementById("prof-min-amt").value = profile.min_target_amount ?? 10000;
    document.getElementById("prof-max-amt").value = profile.max_target_amount ?? 500000;
  }

  function renderCpvLegend(codes) {
    const el = document.getElementById("cpv-legend");
    if (!el) return;
    el.innerHTML = (codes || [])
      .map((c) => {
        const lbl = getCpvLabel(c);
        return `<span class="cpv-chip"><strong>${escapeHtml(c)}</strong>${lbl ? ` — ${escapeHtml(lbl)}` : ""}</span>`;
      })
      .join("");
  }

  function renderCard(t) {
    const dict = I18N[lang];
    const locale = lang === "fr" ? "fr-FR" : "en-GB";
    const score = t.suitability_score ?? 0;
    const scoreClass = score >= 75 ? "score-high" : score >= 55 ? "score-mid" : "score-low";
    const isFr = t.region === "FR";
    const dlText = t.deadline_date
      ? new Date(t.deadline_date).toLocaleDateString(locale)
      : dict.toVerify;
    const pubText = t.publication_date
      ? new Date(t.publication_date).toLocaleDateString(locale)
      : dict.toVerify;
    const jBadge = t.days_remaining != null ? ` (${dict.daysPrefix}${t.days_remaining})` : "";
    const urgent = t.days_remaining != null && t.days_remaining <= 10;
    const euLabel = lang === "en" ? "EU" : "UE";
    const fav = isFavorite(t.id);
    const seen = isSeen(t.id);
    const verdict = triageState.verdicts[t.id] || "to_review";

    return `
      <article class="tender-card ${fav ? "is-favorite" : ""} ${seen && !fav ? "is-seen" : ""}">
        <div class="tender-top">
          <div class="tender-main">
            <div class="tender-badges">
              <span class="pill ${isFr ? "pill-blue" : "pill-indigo"}">
                ${isFr ? "🇫🇷 France" : `🇪🇺 ${euLabel} (${escapeHtml(t.country)})`} • ${escapeHtml(t.source)}
              </span>
              <span class="pill pill-gray">${escapeHtml(t.id)}</span>
              ${isFr && t.department ? `<span class="pill pill-blue">Dept. ${escapeHtml(t.department)}</span>` : ""}
              ${(t.cpv_codes || []).slice(0, 2).map((c) => {
                const lbl = getCpvLabel(c);
                return `<span class="pill pill-gray" title="${escapeHtml(lbl)}">CPV ${escapeHtml(c)}${lbl ? ` • ${escapeHtml(lbl)}` : ""}</span>`;
              }).join("")}
              ${seen ? `<span class="pill pill-gray">👁️ ${dict.seenBadge}</span>` : ""}
            </div>
            <h3 class="tender-title">${escapeHtml(t.title)}</h3>
            <p class="tender-buyer">${dict.buyer} : <strong>${escapeHtml(t.buyer_name || dict.unspecified)}</strong></p>
            <div class="tender-metrics">
              <span class="metric-chip">
                🗞️ ${dict.postedLabel} : <strong>${escapeHtml(pubText)}</strong>
              </span>
              <span class="metric-chip ${urgent ? "urgent" : ""}">
                📅 ${dict.deadline} : <strong>${escapeHtml(dlText)}${escapeHtml(jBadge)}</strong>
              </span>
              <span class="metric-chip amount">
                💶 ${dict.targetAmount} : <strong>${escapeHtml(formatAmount(t.estimated_amount, t.currency))}</strong>
              </span>
            </div>
          </div>
          <div class="score-box ${scoreClass}">
            <div class="score-label">${dict.suitability}</div>
            <div class="score-num">${score}/100</div>
          </div>
        </div>
        ${(t.suitability_summary || []).length ? `
          <ul class="summary-list">
            ${t.suitability_summary.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}
          </ul>` : ""}
        <div class="tender-footer">
          <span class="attribution">${escapeHtml(t.attribution || "")}</span>
          <div class="tender-actions">
            ${fav ? `
              <select class="screen-select" data-verdict-id="${escapeHtml(t.id)}" aria-label="Screening verdict">
                <option value="to_review" ${verdict === "to_review" ? "selected" : ""}>${dict.screenToReview}</option>
                <option value="go" ${verdict === "go" ? "selected" : ""}>${dict.screenGo}</option>
                <option value="in_progress" ${verdict === "in_progress" ? "selected" : ""}>${dict.screenInProgress}</option>
                <option value="no_go" ${verdict === "no_go" ? "selected" : ""}>${dict.screenNoGo}</option>
              </select>
            ` : ""}
            <button type="button" class="btn btn-sm btn-fav ${fav ? "active" : ""}" data-fav-id="${escapeHtml(t.id)}">
              ${fav ? dict.favActiveBtn : dict.favBtn}
            </button>
            <button type="button" class="btn btn-sm btn-seen ${seen ? "active" : ""}" data-seen-id="${escapeHtml(t.id)}">
              ${seen ? dict.unseeBtn : dict.markSeenBtn}
            </button>
            ${t.url ? `<a href="${escapeHtml(t.url)}" target="_blank" rel="noreferrer" class="btn btn-secondary btn-sm">${dict.viewNotice} ${escapeHtml(t.source)} ↗</a>` : ""}
          </div>
        </div>
      </article>
    `;
  }

  function renderPagination(total, totalPages) {
    if (total <= PAGE_SIZE) return "";
    const dict = I18N[lang];
    const startIdx = (currentPage - 1) * PAGE_SIZE + 1;
    const endIdx = Math.min(total, currentPage * PAGE_SIZE);
    return `
      <div class="pagination-bar">
        <span>
          ${dict.showingLabel} <strong>${startIdx}–${endIdx}</strong> ${dict.ofLabel} <strong>${total}</strong>
          (${dict.pageLabel} ${currentPage}/${totalPages})
        </span>
        <div class="pagination-actions">
          <button type="button" class="btn btn-secondary btn-sm" data-page-nav="prev" ${currentPage <= 1 ? "disabled" : ""}>${dict.prev50}</button>
          <button type="button" class="btn btn-secondary btn-sm" data-page-nav="next" ${currentPage >= totalPages ? "disabled" : ""}>${dict.next50}</button>
        </div>
      </div>
    `;
  }

  function renderTenders() {
    const dict = I18N[lang];
    const q = searchQuery.trim().toLowerCase();
    const evaluated = allTenders
      .map((t) => {
        const res = computeSuitability(t);
        return {
          ...t,
          suitability_score: res.score,
          suitability_summary: res.summary,
          days_remaining: res.days_remaining,
          _relevant: res.relevant,
        };
      })
      .filter((t) => t._relevant && t.suitability_score >= minScore)
      .filter((t) => {
        if (!q) return true;
        const hay = `${t.title} ${t.buyer_name || ""} ${t.country} ${t.department || ""} ${(t.cpv_codes || []).join(" ")}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        if (sortMode === "post_desc") {
          return (b.publication_date || "").localeCompare(a.publication_date || "");
        }
        if (sortMode === "post_asc") {
          return (a.publication_date || "9999").localeCompare(b.publication_date || "9999");
        }
        if (sortMode === "deadline_asc") {
          return (a.deadline_date || "9999").localeCompare(b.deadline_date || "9999");
        }
        if (sortMode === "amount_desc") {
          return Number(b.estimated_amount || -1) - Number(a.estimated_amount || -1);
        }
        if (sortMode === "amount_asc") {
          const av = typeof a.estimated_amount === "number" && a.estimated_amount > 0 ? a.estimated_amount : Number.MAX_SAFE_INTEGER;
          const bv = typeof b.estimated_amount === "number" && b.estimated_amount > 0 ? b.estimated_amount : Number.MAX_SAFE_INTEGER;
          return av - bv;
        }
        if (a.region !== b.region) return a.region === "FR" ? -1 : 1;
        if (b.suitability_score !== a.suitability_score) return b.suitability_score - a.suitability_score;
        return (a.deadline_date || "9999").localeCompare(b.deadline_date || "9999");
      });

    const unseenPool = evaluated.filter((t) => !isSeen(t.id));
    const favPool = evaluated.filter((t) => isFavorite(t.id));
    const seenPool = evaluated.filter((t) => isSeen(t.id));

    document.getElementById("cnt-unseen").textContent = String(unseenPool.length);
    document.getElementById("cnt-fav").textContent = String(favPool.length);
    document.getElementById("cnt-seen").textContent = String(seenPool.length);
    document.getElementById("cnt-all").textContent = String(evaluated.length);

    const triaged =
      triageFilter === "UNSEEN"
        ? unseenPool
        : triageFilter === "FAVORITES"
          ? favPool
          : triageFilter === "SEEN"
            ? seenPool
            : evaluated;

    const regionScoped =
      regionFilter === "FR"
        ? triaged.filter((t) => t.region === "FR")
        : regionFilter === "EU"
          ? triaged.filter((t) => t.region === "EU")
          : triaged;

    const totalPages = Math.max(1, Math.ceil(regionScoped.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const pageItems = regionScoped.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    currentPageIds = pageItems.map((t) => t.id);

    const fr = pageItems.filter((t) => t.region === "FR");
    const eu = pageItems.filter((t) => t.region === "EU");

    const markAllBtn = document.getElementById("mark-visible-seen-btn");
    if (markAllBtn) {
      markAllBtn.classList.toggle("hidden", triageFilter !== "UNSEEN" || pageItems.length === 0);
    }

    const frTotal = triaged.filter((t) => t.region === "FR").length;
    const euTotal = triaged.filter((t) => t.region === "EU").length;
    const urgentCount = regionScoped.filter((t) => t.days_remaining != null && t.days_remaining <= 14).length;
    const avg = regionScoped.length ? Math.round(regionScoped.reduce((acc, x) => acc + x.suitability_score, 0) / regionScoped.length) : 0;

    document.getElementById("kpi-total").textContent = String(regionScoped.length);
    document.getElementById("kpi-fr").textContent = String(frTotal);
    document.getElementById("kpi-eu").textContent = String(euTotal);
    document.getElementById("kpi-avg").textContent = regionScoped.length ? `${avg}/100 • ${urgentCount}` : "—";

    const container = document.getElementById("tenders-container");
    if (!pageItems.length) {
      const msg = triageFilter === "UNSEEN" && evaluated.length > 0 ? dict.emptyUnseenHint : dict.emptyFiltered;
      container.innerHTML = `<div class="empty-box">${msg}</div>`;
      return;
    }

    const pagerHtml = renderPagination(regionScoped.length, totalPages);
    let html = pagerHtml;
    if (fr.length) {
      html += `
        <div class="section-heading">
          <h2>${dict.frSectionTitle} (${fr.length}/${frTotal})</h2>
          <span class="section-sub">${dict.frSectionSub}</span>
        </div>
        ${fr.map(renderCard).join("")}
      `;
    }
    if (eu.length) {
      html += `
        <div class="section-heading eu">
          <h2>${dict.euSectionTitle} (${eu.length}/${euTotal})</h2>
          <span class="section-sub">${dict.euSectionSub}</span>
        </div>
        ${eu.map(renderCard).join("")}
      `;
    }
    html += pagerHtml;
    container.innerHTML = html;
  }

  async function loadInitialData() {
    try {
      const res = await fetch("./data/tenders.json", { cache: "no-store" });
      if (!res.ok) throw new Error("JSON indisponible");
      const data = await res.json();
      allTenders = data.tenders || [];
      if (data.generated_at) {
        const dt = new Date(data.generated_at).toLocaleString(lang === "fr" ? "fr-FR" : "en-GB");
        setStatus(
          lang === "en"
            ? `FR + EU data synchronized on ${dt}.`
            : `Données FR + UE synchronisées le ${dt}.`
        );
      }
    } catch {
      setStatus(I18N[lang].directModeHint);
    }
    renderTenders();
  }

  function setStatus(msg) {
    const el = document.getElementById("sync-status");
    el.textContent = msg;
    el.classList.remove("hidden");
  }

  async function refreshBoampLive() {
    const btn = document.getElementById("refresh-boamp-btn");
    btn.disabled = true;
    btn.textContent = I18N[lang].refreshingBoamp;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const where =
        `nature='APPEL_OFFRE' AND datelimitereponse >= date'${today}' AND (` +
        `search(descripteur_libelle, 'Informatique') OR search(descripteur_libelle, 'Logiciel') OR ` +
        `search(objet, 'infogérance') OR search(objet, 'cloud') OR search(objet, 'cybersécurité') OR search(objet, 'maintenance applicative'))`;
      const url = `https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records?limit=100&order_by=dateparution%20desc&where=${encodeURIComponent(where)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`BOAMP HTTP ${res.status}`);
      const payload = await res.json();
      const freshFr = (payload.results || []).map((rec) => {
        let amt = null;
        try {
          const d = typeof rec.donnees === "string" ? JSON.parse(rec.donnees) : {};
          const raw = JSON.stringify(d);
          const m = raw.match(/"(?:EstimatedOverallContractAmount|FrameworkMaximumAmount|MaximumValueAmount)"[^}]*?"#text"\s*:\s*"(\d+(?:\.\d+)?)"/);
          if (m && Number(m[1]) > 0) amt = Number(m[1]);
        } catch {}
        return {
          id: rec.idweb,
          source: "BOAMP",
          region: "FR",
          country: "FRA",
          title: rec.objet || `Avis BOAMP ${rec.idweb}`,
          buyer_name: rec.nomacheteur || null,
          department: Array.isArray(rec.code_departement) ? rec.code_departement[0] : rec.code_departement,
          cpv_codes: [],
          publication_date: rec.dateparution,
          deadline_date: rec.datelimitereponse,
          estimated_amount: amt,
          currency: "EUR",
          url: rec.url_avis || `https://www.boamp.fr/pages/avis/?q=idweb:${rec.idweb}`,
          description: (rec.descripteur_libelle || []).join(", ") || rec.objet || "",
          attribution: "source: DILA - BOAMP, Licence Ouverte 2.0",
        };
      });

      const byId = new Map(allTenders.map((t) => [t.id, t]));
      for (const t of freshFr) {
        if (!byId.has(t.id)) byId.set(t.id, t);
      }
      allTenders = Array.from(byId.values());
      currentPage = 1;
      renderTenders();
      setStatus(
        lang === "en"
          ? `Live BOAMP refresh complete (${freshFr.length} French notices fetched).`
          : `Actualisation BOAMP en direct terminée (${freshFr.length} avis français récupérés).`
      );
    } catch (err) {
      setStatus(`BOAMP: ${String(err)}`);
    } finally {
      btn.disabled = false;
      btn.innerHTML = I18N[lang].refreshBoampBtn;
    }
  }

  function switchTab(tabName) {
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === `tab-${tabName}`));
    document.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("active", b.dataset.tab === tabName));
  }

  function setupPwa() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(() => {});
    }
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    if (isStandalone) return;

    const ua = navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    const isSafari = /safari/.test(ua) && !/crios|fxios|edgios/.test(ua);
    const banner = document.getElementById("install-banner");
    const installBtn = document.getElementById("install-btn");
    const installText = document.getElementById("install-text");

    if (isIos && isSafari) {
      installText.innerHTML = I18N[lang].iosInstall;
      banner.classList.remove("hidden");
    }

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      installBtn.classList.remove("hidden");
      banner.classList.remove("hidden");
    });

    installBtn.addEventListener("click", async () => {
      if (!deferredInstallPrompt) return;
      await deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      banner.classList.add("hidden");
    });

    document.getElementById("dismiss-install").addEventListener("click", () => {
      banner.classList.add("hidden");
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    applyTranslations();
    setupPwa();
    loadInitialData();

    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        lang = btn.dataset.lang === "en" ? "en" : "fr";
        try {
          localStorage.setItem(LANG_KEY, lang);
        } catch {}
        applyTranslations();
      });
    });

    document.querySelectorAll("[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });

    document.querySelectorAll(".triage-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        triageFilter = btn.dataset.triage || "UNSEEN";
        currentPage = 1;
        document.querySelectorAll(".triage-btn").forEach((b) => b.classList.toggle("active", b === btn));
        renderTenders();
      });
    });

    document.getElementById("mark-visible-seen-btn").addEventListener("click", markPageAsSeen);

    const tendersContainer = document.getElementById("tenders-container");
    tendersContainer.addEventListener("click", (e) => {
      const navBtn = e.target.closest("[data-page-nav]");
      if (navBtn) {
        const dir = navBtn.getAttribute("data-page-nav");
        currentPage = dir === "prev" ? Math.max(1, currentPage - 1) : currentPage + 1;
        renderTenders();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const favBtn = e.target.closest("[data-fav-id]");
      if (favBtn) {
        toggleFavorite(favBtn.getAttribute("data-fav-id"));
        return;
      }
      const seenBtn = e.target.closest("[data-seen-id]");
      if (seenBtn) {
        toggleSeen(seenBtn.getAttribute("data-seen-id"));
      }
    });

    tendersContainer.addEventListener("change", (e) => {
      const sel = e.target.closest("[data-verdict-id]");
      if (sel) {
        setVerdict(sel.getAttribute("data-verdict-id"), sel.value);
      }
    });

    document.querySelectorAll(".region-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        regionFilter = btn.dataset.region;
        currentPage = 1;
        document.querySelectorAll(".region-btn").forEach((b) => b.classList.toggle("active", b === btn));
        renderTenders();
      });
    });
    document.getElementById("search-input").addEventListener("input", (e) => {
      searchQuery = e.target.value;
      currentPage = 1;
      renderTenders();
    });
    document.getElementById("sort-select").addEventListener("change", (e) => {
      sortMode = e.target.value || "fit";
      currentPage = 1;
      renderTenders();
    });
    document.getElementById("min-score-select").addEventListener("change", (e) => {
      minScore = Number(e.target.value);
      currentPage = 1;
      renderTenders();
    });
    document.getElementById("refresh-boamp-btn").addEventListener("click", refreshBoampLive);

    document.getElementById("prof-cpvs").addEventListener("input", (e) => {
      const codes = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
      renderCpvLegend(codes);
    });

    document.getElementById("profile-form").addEventListener("submit", (e) => {
      e.preventDefault();
      saveProfile({
        ...profile,
        name: document.getElementById("prof-name").value.trim() || DEFAULT_PROFILE.name,
        siret: document.getElementById("prof-siret").value.trim(),
        naf_code: document.getElementById("prof-naf").value.trim(),
        target_departments: document.getElementById("prof-depts").value.split(",").map((s) => s.trim()).filter(Boolean),
        target_cpv_codes: document.getElementById("prof-cpvs").value.split(",").map((s) => s.trim()).filter(Boolean),
        target_keywords: document.getElementById("prof-keywords").value.split(",").map((s) => s.trim()).filter(Boolean),
        min_target_amount: Number(document.getElementById("prof-min-amt").value) || 0,
        max_target_amount: Number(document.getElementById("prof-max-amt").value) || 500000,
      });
      currentPage = 1;
      renderProfileHeader();
      renderTenders();
      const msg = document.getElementById("profile-msg");
      msg.textContent = I18N[lang].profileSavedMsg;
      msg.classList.remove("hidden");
    });

    document.getElementById("reset-profile-btn").addEventListener("click", () => {
      saveProfile({ ...DEFAULT_PROFILE });
      currentPage = 1;
      renderProfileHeader();
      renderTenders();
      const msg = document.getElementById("profile-msg");
      msg.textContent = I18N[lang].profileResetMsg;
      msg.classList.remove("hidden");
    });
  });
})();
