(() => {
  const DEFAULT_PROFILE = {
    name: "TRADISTER SASU",
    president: "Bisma Kashif",
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
      tabAbout: "Stack &amp; VPS",
      mobTenders: "FR &amp; UE",
      presidentLabel: "Présidente :",
      vatLabel: "TVA",
      refreshBoampBtn: "↻ Actualiser BOAMP (Direct)",
      refreshingBoamp: "Interrogation BOAMP...",
      kpiTotal: "Marchés pertinents",
      kpiFr: "France (BOAMP + TED)",
      kpiEu: "Union Européenne (TED)",
      kpiAvg: "Adéquation moy. / Urgents",
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
      aboutTitle: "Architecture Complète (GitHub Pages PWA + Backend Docker VPS)",
      aboutDesc:
        "Cette interface GitHub Pages est une PWA mobile connectée aux données ouvertes BOAMP (DILA) et TED Europa. Le dépôt complet inclut également la stack Docker Compose (FastAPI, PostgreSQL + pgvector RAG, Celery, analyseur DCE et export Word <code>.docx</code>).",
      aboutGuardrail:
        "<strong>Frontière Human-in-the-Loop :</strong> Aucun chiffrage BPU/DPGF engageant, aucune signature électronique (RGS/eIDAS) et aucun dépôt automatique sur les profils acheteurs (PLACE, Maximilien, AWS) ne sont exécutés automatiquement.",
      amountUnpublished: "Non publié (MAPA / voir DCE)",
      amountHt: "HT",
      buyer: "Acheteur",
      unspecified: "Non précisé",
      deadline: "Date limite",
      toVerify: "À vérifier",
      targetAmount: "Montant cible",
      suitability: "Adéquation",
      viewNotice: "Voir avis",
      emptyFiltered: "Aucun appel d'offres pertinent ne correspond à ces filtres.",
      frSectionTitle: "1. Appels d'offres pertinents en France",
      frSectionSub: "Triés par adéquation TRADISTER SASU puis échéance",
      euSectionTitle: "2. Appels d'offres pertinents en Union Européenne",
      euSectionSub: "Source TED Europa • IT / Cloud / Cybersécurité",
      directModeHint:
        "Mode direct : cliquez sur « Actualiser BOAMP (Direct) » pour charger les avis français en direct.",
      profileSavedMsg: "Critères TRADISTER SASU enregistrés et pertinence recalculée.",
      profileResetMsg: "Profil vérifié TRADISTER SASU restauré.",
      daysPrefix: "J-",
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
      tabAbout: "Stack &amp; VPS",
      mobTenders: "FR &amp; EU",
      presidentLabel: "President:",
      vatLabel: "VAT",
      refreshBoampBtn: "↻ Refresh BOAMP (Live)",
      refreshingBoamp: "Querying BOAMP...",
      kpiTotal: "Relevant tenders",
      kpiFr: "France (BOAMP + TED)",
      kpiEu: "European Union (TED)",
      kpiAvg: "Avg. Fit / Urgent",
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
      aboutTitle: "Full Architecture (GitHub Pages PWA + Docker VPS Backend)",
      aboutDesc:
        "This GitHub Pages interface is a mobile-ready PWA connected to BOAMP (DILA) and TED Europa open data. The full repository also includes the Docker Compose stack (FastAPI, PostgreSQL + pgvector RAG, Celery, DCE analyzer, and Word <code>.docx</code> export).",
      aboutGuardrail:
        "<strong>Human-in-the-Loop Boundary:</strong> No binding BPU/DPGF pricing, no electronic signature (RGS/eIDAS), and no automated submission on buyer portals (PLACE, Maximilien, AWS) are ever executed automatically.",
      amountUnpublished: "Unpublished (MAPA / check DCE)",
      amountHt: "excl. VAT",
      buyer: "Buyer",
      unspecified: "Not specified",
      deadline: "Deadline",
      toVerify: "To verify",
      targetAmount: "Target value",
      suitability: "Fit Score",
      viewNotice: "View notice",
      emptyFiltered: "No relevant tenders match these filters.",
      frSectionTitle: "1. Relevant Tenders in France",
      frSectionSub: "Sorted by TRADISTER SASU fit score then deadline",
      euSectionTitle: "2. Relevant Tenders in the European Union",
      euSectionSub: "Source: TED Europa • IT / Cloud / Cybersecurity",
      directModeHint:
        "Direct mode: click « Refresh BOAMP (Live) » to fetch French tenders live.",
      profileSavedMsg: "TRADISTER SASU criteria saved and suitability recalculated.",
      profileResetMsg: "Verified TRADISTER SASU profile restored.",
      daysPrefix: "D-",
    },
  };

  const STORAGE_KEY = "tradister_ao_profile_v1";
  const LANG_KEY = "tradister_ao_lang_v1";
  let lang = loadLang();
  let profile = loadProfile();
  let allTenders = [];
  let regionFilter = "ALL";
  let minScore = 50;
  let searchQuery = "";
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
    document.getElementById("company-president").textContent = profile.president || "Bisma Kashif";
    const minStr = Number(profile.min_target_amount || 0).toLocaleString(locale);
    const maxStr = Number(profile.max_target_amount || 500000).toLocaleString(locale);
    document.getElementById("company-target-line").innerHTML =
      lang === "en"
        ? `Target value: <strong>${minStr} € – ${maxStr} €</strong> • France (IDF/91 priority) then European Union`
        : `Cible montant : <strong>${minStr} € – ${maxStr} €</strong> • France (priorité IDF/91) puis Union Européenne`;

    document.getElementById("prof-name").value = profile.name || "";
    document.getElementById("prof-president").value = profile.president || "";
    document.getElementById("prof-siret").value = profile.siret || "";
    document.getElementById("prof-naf").value = profile.naf_code || "";
    document.getElementById("prof-depts").value = (profile.target_departments || []).join(", ");
    document.getElementById("prof-cpvs").value = (profile.target_cpv_codes || []).join(", ");
    document.getElementById("prof-keywords").value = (profile.target_keywords || []).join(", ");
    document.getElementById("prof-min-amt").value = profile.min_target_amount ?? 10000;
    document.getElementById("prof-max-amt").value = profile.max_target_amount ?? 500000;
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
    const jBadge = t.days_remaining != null ? ` (${dict.daysPrefix}${t.days_remaining})` : "";
    const urgent = t.days_remaining != null && t.days_remaining <= 10;
    const euLabel = lang === "en" ? "EU" : "UE";

    return `
      <article class="tender-card">
        <div class="tender-top">
          <div class="tender-main">
            <div class="tender-badges">
              <span class="pill ${isFr ? "pill-blue" : "pill-indigo"}">
                ${isFr ? "🇫🇷 France" : `🇪🇺 ${euLabel} (${escapeHtml(t.country)})`} • ${escapeHtml(t.source)}
              </span>
              <span class="pill pill-gray">${escapeHtml(t.id)}</span>
              ${isFr && t.department ? `<span class="pill pill-blue">Dept. ${escapeHtml(t.department)}</span>` : ""}
              ${(t.cpv_codes || []).slice(0, 2).map((c) => `<span class="pill pill-gray">CPV ${escapeHtml(c)}</span>`).join("")}
            </div>
            <h3 class="tender-title">${escapeHtml(t.title)}</h3>
            <p class="tender-buyer">${dict.buyer} : <strong>${escapeHtml(t.buyer_name || dict.unspecified)}</strong></p>
            <div class="tender-metrics">
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
          ${t.url ? `<a href="${escapeHtml(t.url)}" target="_blank" rel="noreferrer" class="btn btn-secondary btn-sm">${dict.viewNotice} ${escapeHtml(t.source)} ↗</a>` : ""}
        </div>
      </article>
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
        if (a.region !== b.region) return a.region === "FR" ? -1 : 1;
        if (b.suitability_score !== a.suitability_score) return b.suitability_score - a.suitability_score;
        return (a.deadline_date || "9999").localeCompare(b.deadline_date || "9999");
      });

    const fr = evaluated.filter((t) => t.region === "FR");
    const eu = evaluated.filter((t) => t.region === "EU");
    const visible = regionFilter === "FR" ? fr : regionFilter === "EU" ? eu : evaluated;
    const urgentCount = visible.filter((t) => t.days_remaining != null && t.days_remaining <= 14).length;
    const avg = visible.length ? Math.round(visible.reduce((acc, x) => acc + x.suitability_score, 0) / visible.length) : 0;

    document.getElementById("kpi-total").textContent = String(visible.length);
    document.getElementById("kpi-fr").textContent = String(fr.length);
    document.getElementById("kpi-eu").textContent = String(eu.length);
    document.getElementById("kpi-avg").textContent = visible.length ? `${avg}/100 • ${urgentCount}` : "—";

    const container = document.getElementById("tenders-container");
    if (!visible.length) {
      container.innerHTML = `<div class="empty-box">${dict.emptyFiltered}</div>`;
      return;
    }

    let html = "";
    if ((regionFilter === "ALL" || regionFilter === "FR") && fr.length) {
      html += `
        <div class="section-heading">
          <h2>${dict.frSectionTitle} (${fr.length})</h2>
          <span class="section-sub">${dict.frSectionSub}</span>
        </div>
        ${fr.map(renderCard).join("")}
      `;
    }
    if ((regionFilter === "ALL" || regionFilter === "EU") && eu.length) {
      html += `
        <div class="section-heading eu">
          <h2>${dict.euSectionTitle} (${eu.length})</h2>
          <span class="section-sub">${dict.euSectionSub}</span>
        </div>
        ${eu.map(renderCard).join("")}
      `;
    }
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
      const url = `https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records?limit=45&order_by=dateparution%20desc&where=${encodeURIComponent(where)}`;
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
    document.querySelectorAll(".region-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        regionFilter = btn.dataset.region;
        document.querySelectorAll(".region-btn").forEach((b) => b.classList.toggle("active", b === btn));
        renderTenders();
      });
    });
    document.getElementById("search-input").addEventListener("input", (e) => {
      searchQuery = e.target.value;
      renderTenders();
    });
    document.getElementById("min-score-select").addEventListener("change", (e) => {
      minScore = Number(e.target.value);
      renderTenders();
    });
    document.getElementById("refresh-boamp-btn").addEventListener("click", refreshBoampLive);

    document.getElementById("profile-form").addEventListener("submit", (e) => {
      e.preventDefault();
      saveProfile({
        ...profile,
        name: document.getElementById("prof-name").value.trim() || DEFAULT_PROFILE.name,
        president: document.getElementById("prof-president").value.trim(),
        siret: document.getElementById("prof-siret").value.trim(),
        naf_code: document.getElementById("prof-naf").value.trim(),
        target_departments: document.getElementById("prof-depts").value.split(",").map((s) => s.trim()).filter(Boolean),
        target_cpv_codes: document.getElementById("prof-cpvs").value.split(",").map((s) => s.trim()).filter(Boolean),
        target_keywords: document.getElementById("prof-keywords").value.split(",").map((s) => s.trim()).filter(Boolean),
        min_target_amount: Number(document.getElementById("prof-min-amt").value) || 0,
        max_target_amount: Number(document.getElementById("prof-max-amt").value) || 500000,
      });
      renderProfileHeader();
      renderTenders();
      const msg = document.getElementById("profile-msg");
      msg.textContent = I18N[lang].profileSavedMsg;
      msg.classList.remove("hidden");
    });

    document.getElementById("reset-profile-btn").addEventListener("click", () => {
      saveProfile({ ...DEFAULT_PROFILE });
      renderProfileHeader();
      renderTenders();
      const msg = document.getElementById("profile-msg");
      msg.textContent = I18N[lang].profileResetMsg;
      msg.classList.remove("hidden");
    });
  });
})();
