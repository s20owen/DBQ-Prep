const STORAGE_KEY = "dbq_prep_workspace_v4";
const catalog = Array.isArray(window.DBQ_CATALOG) ? window.DBQ_CATALOG : [];

const defaultState = {
  selectedIds: [],
  activeId: "",
  query: "",
  openSection: "functional_impact",
  claimOptions: {}
};

let state = loadState();

function loadState() {
  try {
    return { ...structuredClone(defaultState), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return structuredClone(defaultState);
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function renderAndSave() {
  persist();
  render();
}

function byId(id) {
  return catalog.find((item) => item.id === id);
}

function selectedClaims() {
  return state.selectedIds.map(byId).filter(Boolean);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cleanPrompt(value) {
  return String(value || "")
    .replace(/^\d+[A-Z]?\.\s*/i, "")
    .replace(/^Yes No\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isBoilerplate(value) {
  const lower = value.toLowerCase();
  return (
    value.length < 12 ||
    /^section\s/i.test(value) ||
    lower.includes("there are several separate parameters") ||
    lower.startsWith("optimally") ||
    lower.includes("degrees of range of motion") ||
    lower.includes("range of motion would be opined") ||
    lower.includes("initial rom measurements") ||
    lower.includes("unable to test") ||
    lower.includes("for any joint condition") ||
    lower.includes("range of motion testing") ||
    lower.includes("expression or wincing") ||
    lower.includes("unclaimed joint") ||
    lower.includes("active range of motion") ||
    lower.includes("the question") ||
    lower.includes("subsequent questions") ||
    lower.includes("ideally, a claimant") ||
    lower.includes("it is important to understand") ||
    lower.includes("if yes") ||
    lower.includes("if no") ||
    lower.includes("complete item") ||
    lower.includes("complete the following") ||
    lower.includes("icd code") ||
    lower.includes("date of diagnosis") ||
    lower.includes("remarks section") ||
    lower.includes("functional loss that can be ascribed") ||
    lower.includes("observed repetitive use") ||
    lower.includes("documented loss of range of motion") ||
    lower.includes("not always feasible") ||
    lower.includes("medical probability") ||
    lower.includes("repetitive use over time") ||
    lower.includes("three or more repetitions") ||
    lower.includes("global view") ||
    lower.includes("second subset") ||
    lower.includes("provide the impact of only") ||
    lower.includes("regardless of the veteran") ||
    lower.includes("does the veteran") ||
    lower.includes("is the veteran") ||
    lower.includes("was the veteran") ||
    lower.includes("select diagnoses") ||
    lower.includes("list the claimed")
  );
}

function useful(items, limit = 8) {
  const seen = new Set();
  return (items || [])
    .map(cleanPrompt)
    .filter((item) => !isBoilerplate(item))
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

function first(items, fallback) {
  return useful(items, 1)[0] || fallback;
}

function matchesQuery(item, query) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const haystack = [
    item.title,
    item.category,
    item.documentType,
    item.purpose,
    item.searchText,
    ...(item.symptoms || []),
    ...(item.functionalImpact || [])
  ].join(" ").toLowerCase();
  return terms.every((term) => term === "tbi"
    ? /\btbi\b|traumatic brain injury|concussion|head injury|blast injury/.test(haystack)
    : haystack.includes(term));
}

function filteredCatalog() {
  const terms = state.query.toLowerCase().split(/\s+/).filter(Boolean);
  return catalog
    .filter((item) => matchesQuery(item, state.query))
    .map((item) => ({ item, score: scoreItem(item, terms) }))
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .map(({ item }) => item)
    .slice(0, state.query ? 36 : 16);
}

function scoreItem(item, terms) {
  if (!terms.length) return 0;
  const title = item.title.toLowerCase();
  const category = item.category.toLowerCase();
  const symptoms = (item.symptoms || []).join(" ").toLowerCase();
  const impact = (item.functionalImpact || []).join(" ").toLowerCase();
  const searchText = item.searchText || "";
  return terms.reduce((score, term) => {
    if (title.includes(term)) score += 90;
    if (term === "tbi" && /\btbi\b|traumatic brain injury|concussion|head injury|blast injury/.test(searchText)) score += 160;
    if (category.includes(term)) score += 24;
    if (symptoms.includes(term)) score += 14;
    if (impact.includes(term)) score += 10;
    if (searchText.includes(term)) score += 6;
    return score;
  }, 0);
}

function claimKind(item) {
  const titleCategory = `${item?.id || ""} ${item?.title || ""} ${item?.category || ""}`.toLowerCase();
  const full = [
    titleCategory,
    item?.purpose,
    ...(item?.symptoms || []),
    ...(item?.functionalImpact || [])
  ].join(" ").toLowerCase();

  if (/\b(ptsd|mental|anxiety|depression|eating disorder)\b/.test(titleCategory)) return "mental";
  if (/\b(headache|headaches|migraine|migraines)\b/.test(titleCategory)) return "headache";
  if (/\b(hearing|tinnitus)\b/.test(titleCategory)) return "hearing";
  if (/\b(ear|vestibular|vertigo)\b/.test(titleCategory)) return "ear";
  if (/\b(sleep apnea|cpap|hypersomnolence)\b/.test(full)) return "sleep";
  if (/\b(back|spine|knee|ankle|foot|hip|shoulder|elbow|wrist|hand|finger|neck|muscle|arthritis|skeletal|temporomandibular)\b/.test(titleCategory)) return "musculoskeletal";
  if (/\b(skin|scar|scars|dermatological)\b/.test(titleCategory)) return "skin";
  if (/\b(intestinal|stomach|duodenum|esophageal|gallbladder|liver|pancreas|rectum|anus|hernia|gastro)\b/.test(titleCategory)) return "gi";
  if (/\b(urinary|kidney|reproductive|gynecological|breast|prostate)\b/.test(titleCategory)) return "gu";
  if (/\b(respiratory|sinusitis|rhinitis|tuberculosis|asthma)\b/.test(titleCategory)) return "respiratory";
  if (/\b(heart|hypertension|artery|vein|vascular)\b/.test(titleCategory)) return "cardio";
  return "general";
}

function defaultOptions(kind) {
  const shared = {
    severity: "Moderate to severe",
    frequency: "Daily",
    flareUps: "3 times per month",
    triggers: "activity, stress, or repeated use",
    limitation: "trouble working, chores, driving, or daily tasks",
    treatment: "medication, rest, and follow-up care",
    onset: "around [timeframe]",
    serviceEvent: "[specific service event, injury, exposure, aggravation, or secondary condition]",
    duration: "several hours",
    bestPain: "4/10",
    worstPain: "8/10",
    limitBeforeStopping: "20–30 minutes"
  };

  const presets = {
    headache: {
      frequency: "2–4 times per month",
      flareUps: "2–4 severe attacks per month",
      triggers: "light, noise, stress, or poor sleep",
      limitation: "screens, driving, concentration, and work attendance",
      treatment: "prescribed medication, dark-room rest, hydration, and sleep",
      duration: "4–24 hours"
    },
    musculoskeletal: {
      frequency: "Daily",
      triggers: "standing, walking, bending, lifting, stairs, or repeated use",
      limitation: "standing, walking, sitting, lifting, bending, and stairs",
      treatment: "medication, physical therapy, brace/support, ice/heat, stretching, and rest",
      duration: "constant baseline pain with worse periods"
    },
    mental: {
      frequency: "Most days",
      flareUps: "several times per week",
      triggers: "crowds, reminders, stress, noise, or poor sleep",
      limitation: "sleep, concentration, relationships, crowds, and work reliability",
      treatment: "therapy tools, medication, grounding, isolation, and support"
    },
    hearing: {
      frequency: "Constant or daily",
      triggers: "background noise, phone calls, meetings, alarms, or quiet rooms",
      limitation: "hearing instructions, phone calls, alarms, meetings, and conversations",
      treatment: "audiology care, hearing protection, hearing aids if prescribed, and avoiding loud noise"
    },
    sleep: {
      frequency: "Nightly",
      triggers: "poor sleep, mask/device issues, congestion, pain, or stress",
      limitation: "daytime alertness, concentration, driving safety, mood, and work reliability",
      treatment: "CPAP/BiPAP or prescribed sleep treatment, sleep hygiene, and follow-up care"
    },
    skin: {
      triggers: "heat, sweating, friction, shaving, stress, or chemicals",
      limitation: "clothing, sleep, movement, work tasks, or avoiding irritation",
      treatment: "topical medication, oral medication if prescribed, dressings, and avoiding triggers"
    },
    gi: {
      triggers: "food, stress, medication, activity, or flare-ups",
      limitation: "bathroom access, travel, meetings, long drives, and work reliability",
      treatment: "medication, diet changes, hydration, and medical follow-up"
    },
    gu: {
      triggers: "fluid intake, activity, pain, infection, stress, or flare-ups",
      limitation: "bathroom access, travel, sleep, work reliability, and daily planning",
      treatment: "medication, pads/devices if prescribed, procedures, and medical follow-up"
    }
  };

  return { ...shared, ...(presets[kind] || {}) };
}

function optionsFor(item) {
  const kind = claimKind(item);
  const templateDefaults = item?.scriptTemplates?.default_options || {};
  const existing = state.claimOptions[item.id] || {};
  const merged = { ...defaultOptions(kind), ...templateDefaults, ...existing };
  state.claimOptions[item.id] = merged;
  return merged;
}

function addClaim(id) {
  if (!state.selectedIds.includes(id)) state.selectedIds.push(id);
  const item = byId(id);
  if (item) optionsFor(item);
  state.activeId = id;
  state.openSection = "functional_impact";
  renderAndSave();
}

function removeClaim(id) {
  state.selectedIds = state.selectedIds.filter((selectedId) => selectedId !== id);
  delete state.claimOptions[id];
  if (state.activeId === id) state.activeId = state.selectedIds[0] || "";
  renderAndSave();
}

function setActive(id) {
  state.activeId = id;
  state.openSection = "functional_impact";
  renderAndSave();
}

function dbqWording(item, sectionId) {
  const kind = claimKind(item);
  const pools = {
    symptoms: [...(item.symptoms || []), ...(item.frequency || []), ...(item.flareUps || [])],
    functional: [...(item.functionalImpact || []), ...(item.symptoms || [])],
    treatment: [...(item.history || []), ...(item.recommendedInputs || [])],
    diagnosis: [...(item.diagnosis || []), ...(item.history || [])],
    nexus: [...(item.nexus || [])],
    severity: [...(item.severity || []), ...(item.frequency || [])]
  };
  const fromDbq = useful(pools[sectionId] || [], 4);
  const conciseDbq = fromDbq.filter((item) => item.length <= 180);
  if (conciseDbq.length) return conciseDbq;

  const fallback = {
    musculoskeletal: {
      symptoms: ["pain, stiffness, weakness, fatigability, lack of endurance, instability, or reduced range of motion"],
      functional: ["difficulty with prolonged standing, walking, bending, lifting, sitting, stairs, or repeated use over time"],
      treatment: ["medication, physical therapy, imaging, braces/supports, injections, surgery, or activity restrictions"],
      severity: ["pain severity, painful motion, repeated use over time, and additional limitation during flare-ups"]
    },
    headache: {
      symptoms: ["constant head pain, pulsating or throbbing pain, pain worsened by activity, nausea, light sensitivity, or sound sensitivity"],
      functional: ["missed work, need to lie down, inability to concentrate, reduced productivity, and prostrating attacks"],
      severity: ["duration of head pain, frequency of attacks, prostrating attacks, and economic impact"]
    },
    mental: {
      symptoms: ["anxiety, panic attacks, chronic sleep impairment, memory problems, disturbances of motivation and mood, or difficulty adapting to stress"],
      functional: ["occupational and social impairment, work efficiency, relationships, judgment, mood, sleep, and concentration"],
      severity: ["frequency, severity, duration, remissions, and capacity for adjustment"]
    },
    hearing: {
      symptoms: ["difficulty hearing conversations, especially with background noise, and recurrent or constant tinnitus"],
      functional: ["missed instructions, trouble with phone calls, alarms, meetings, speech understanding, and safety signals"]
    },
    sleep: {
      symptoms: ["persistent daytime hypersomnolence, required breathing assistance device, fatigue, or sleep disruption"],
      functional: ["daytime sleepiness, reduced concentration, safety concerns, and work reliability"]
    }
  };
  return fallback[kind]?.[sectionId] || ["frequency, duration, severity, treatment, and functional impact"];
}

function quoteList(items) {
  return items.slice(0, 3).join("; ");
}

function applyTemplate(template, options) {
  return String(template || "").replace(/{{(.*?)}}/g, (_, key) => options[key.trim()] ?? `[${key.trim()}]`);
}

function statementParagraphs(value) {
  return String(value || "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function renderStatement(value) {
  return statementParagraphs(value).map((paragraph) => {
    const labelMatch = paragraph.match(/^([^:]{2,48}):\s+(.*)$/);
    if (!labelMatch) return `<p>${escapeHtml(paragraph)}</p>`;
    return `<p><strong>${escapeHtml(labelMatch[1])}:</strong> ${escapeHtml(labelMatch[2])}</p>`;
  }).join("");
}

function templateMeta(id) {
  return {
    medical_history: ["blue", "◇"],
    symptom_evaluation: ["green", "♟"],
    functional_impact: ["orange", "◎"],
    symptoms: ["green", "♟"],
    functional: ["orange", "◎"],
    treatment: ["purple", "▣"],
    diagnosis: ["blue", "◇"],
    nexus: ["teal", "⌁"],
    severity: ["red", "◷"],
    treatment: ["purple", "▣"]
  }[id] || ["blue", "•"];
}

function scriptSections(item) {
  if (item?.scriptTemplates?.sections?.length) {
    const opts = optionsFor(item);
    return item.scriptTemplates.sections.map((section) => {
      const [color, icon] = templateMeta(section.id);
      return {
        id: section.id,
        number: section.number,
        color,
        title: section.title,
        icon,
        dbq: section.dbq_wording_to_hit,
        say: applyTemplate(section.what_to_say_template, opts),
        example: applyTemplate(section.personalized_example_template, opts),
        bullets: (section.bullet_templates || section.bullets || []).map((bullet) => applyTemplate(bullet, opts)),
        subsections: (section.subsections || []).map((subsection) => ({
          id: subsection.id,
          title: subsection.title,
          dbq: subsection.dbq_wording_to_hit,
          say: applyTemplate(subsection.what_to_say_template, opts),
          example: applyTemplate(subsection.example_template, opts)
        }))
      };
    });
  }

  const kind = claimKind(item);
  const opts = optionsFor(item);
  const wording = (section) => dbqWording(item, section);

  const base = {
    symptoms: {
      id: "symptoms",
      number: 1,
      color: "green",
      title: "Symptoms & Flare-Ups",
      icon: "♟",
      dbq: quoteList(wording("symptoms")),
      say: `My main symptoms are [list only what is true]. They happen ${opts.frequency}, usually last ${opts.duration}, and flare ${opts.flareUps}. They are triggered by ${opts.triggers}.`,
      example: `On a typical bad day, symptoms start after ${opts.triggers}. They build from my baseline and can last ${opts.duration}. During a flare-up, I have to stop or reduce ${opts.limitation} and use ${opts.treatment}.`
    },
    functional: {
      id: "functional",
      number: 2,
      color: "orange",
      title: "Functional Impact",
      icon: "◎",
      dbq: quoteList(wording("functional")),
      say: `I have difficulty with ${opts.limitation}. These limits are worse with ${opts.triggers}. I can usually continue for about ${opts.limitBeforeStopping} before I need to stop, rest, change position, use treatment, or get help.`,
      example: `A real-life example is: at work or home, I can only keep up with ${opts.limitation} for about ${opts.limitBeforeStopping}. After that, symptoms increase and I need breaks or treatment. This affects reliability, chores, driving, or daily tasks.`
    },
    treatment: {
      id: "treatment",
      number: 3,
      color: "purple",
      title: "Treatment History",
      icon: "▣",
      dbq: quoteList(wording("treatment")),
      say: `My treatment has included ${opts.treatment}. I have also had [appointments, testing, imaging, therapy, devices, procedures, ER/urgent care, or specialist care if true].`,
      example: `The treatment helps [a little / temporarily / during flares], but I still have symptoms ${opts.frequency} and still have trouble with ${opts.limitation}.`
    },
    diagnosis: {
      id: "diagnosis",
      number: 4,
      color: "blue",
      title: "Diagnosis / Current Condition",
      icon: "◇",
      dbq: quoteList(wording("diagnosis")),
      say: `I have a current diagnosis or treatment history for ${item.title}. My symptoms began ${opts.onset}. The current condition is still present and affects me through [symptoms that are true].`,
      example: `The condition started ${opts.onset}. Since then, I have continued to deal with symptoms ${opts.frequency}, treatment with ${opts.treatment}, and limits involving ${opts.limitation}.`
    },
    nexus: {
      id: "nexus",
      number: 5,
      color: "teal",
      title: "Service Connection / Nexus",
      icon: "⌁",
      dbq: quoteList(wording("nexus")),
      say: `The service event, injury, illness, exposure, aggravation, or secondary condition I want reviewed is ${opts.serviceEvent}. It happened ${opts.onset}. Supporting evidence may include [service records, treatment records, deployment records, MOS duties, exposure records, or witness statements].`,
      example: `My timeline is: ${opts.serviceEvent}, then symptoms began or worsened ${opts.onset}, and the condition has continued through the present with ${opts.frequency} symptoms and ${opts.limitation}.`
    },
    severity: {
      id: "severity",
      number: 6,
      color: "red",
      title: "Severity / Duration",
      icon: "◷",
      dbq: quoteList(wording("severity")),
      say: `On my best days, symptoms are about ${opts.bestPain}. On my worst days, they reach ${opts.worstPain}. Overall severity is ${opts.severity}. Episodes usually last ${opts.duration}.`,
      example: `A bad episode reaches ${opts.worstPain}, lasts ${opts.duration}, and forces me to stop or reduce ${opts.limitation}. Better days are closer to ${opts.bestPain}, but the condition is still present.`
    }
  };

  if (kind === "headache") {
    base.symptoms.say = `My headaches happen ${opts.frequency}, usually last ${opts.duration}, and severe attacks happen ${opts.flareUps}. During bad attacks, I may have [nausea, light sensitivity, sound sensitivity, vomiting, throbbing pain, or need to lie down if true].`;
    base.functional.say = `During bad headaches, I cannot handle ${opts.limitation}. I often need a dark or quiet room, avoid screens or driving, and use ${opts.treatment}.`;
    base.severity.say = `A normal headache is about ${opts.bestPain}. My worst headaches are ${opts.worstPain}. The worst attacks last ${opts.duration} and can be prostrating if I have to stop activity and lie down.`;
  }

  if (kind === "mental") {
    base.symptoms.say = `My symptoms happen ${opts.frequency}. Examples include [sleep problems, intrusive thoughts, panic, irritability, isolation, concentration problems, mood changes, or memory issues if true]. Flare-ups happen ${opts.flareUps} and are triggered by ${opts.triggers}.`;
    base.functional.say = `This affects ${opts.limitation}. A real example is [missed work, conflict, isolation, panic in crowds, forgetting tasks, poor sleep, or relationship strain].`;
    base.severity.say = `On better days symptoms are around ${opts.bestPain}. On worst days they feel like ${opts.worstPain} and affect [work, school, family, judgment, thinking, mood, hygiene, safety, or ability to leave home if true].`;
  }

  if (kind === "hearing" || kind === "ear") {
    base.symptoms.say = `My hearing, tinnitus, dizziness, or ear symptoms happen ${opts.frequency}. They are worst during ${opts.triggers}. The symptoms that apply to me are [difficulty hearing speech, tinnitus, balance issues, ear pain, infections, or drainage if true].`;
    base.functional.say = `This affects ${opts.limitation}. I may miss instructions, ask people to repeat themselves, struggle with phone/radio conversations, or have safety concerns with alarms or vehicles.`;
  }

  if (kind === "sleep") {
    base.symptoms.say = `Sleep problems happen ${opts.frequency}. The next-day effects last ${opts.duration} and include [daytime sleepiness, fatigue, headaches, or concentration problems if true].`;
    base.functional.say = `This affects ${opts.limitation}. Bad sleep reduces alertness, concentration, reliability, mood, and driving safety if true. Treatment includes ${opts.treatment}.`;
  }

  return Object.values(base);
}

function badgeClass(item) {
  return documentTypeFor(item).includes("Research-derived") ? "warning" : "current";
}

function documentTypeFor(item) {
  return item?.documentType || item?.document_type || "Public VA DBQ";
}

function isResearchDerived(item) {
  return documentTypeFor(item).includes("Research-derived");
}

function renderClaimList() {
  const claims = selectedClaims();
  const container = document.getElementById("claimList");
  document.getElementById("selectedCount").textContent = `${claims.length} selected`;

  if (!claims.length) {
    container.innerHTML = `
      <div class="empty-state">
        <strong>No claims yet</strong>
        <p>Search the DBQ library and add disabilities to build your script list.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = claims.map((claim) => `
    <article class="claim-row ${claim.id === state.activeId ? "active" : ""}">
      <button type="button" data-active="${escapeHtml(claim.id)}">
        <strong>${escapeHtml(shortTitle(claim.title))}</strong>
        <span>${escapeHtml(claim.category)} · ${isResearchDerived(claim) ? "restricted substitute" : "public DBQ"}</span>
      </button>
      <button class="remove-button" type="button" data-remove="${escapeHtml(claim.id)}" aria-label="Remove ${escapeHtml(claim.title)}">×</button>
    </article>
  `).join("");
}

function shortTitle(title) {
  return title.replace(" - Research-Derived Non-Public DBQ Substitute", "").replace(" Conditions", "");
}

function renderSearchResults() {
  const results = filteredCatalog();
  const container = document.getElementById("searchResults");
  document.getElementById("catalogCount").textContent = `${catalog.length} DBQ records`;

  if (!results.length) {
    container.innerHTML = `<div class="empty-state"><strong>No DBQ matches</strong><p>Try a symptom, body part, or plain-language condition name.</p></div>`;
    return;
  }

  container.innerHTML = results.map((item) => {
    const selected = state.selectedIds.includes(item.id);
    return `
      <article class="result-row">
        <button class="result-main" type="button" data-preview="${escapeHtml(item.id)}">
          <span class="badge ${badgeClass(item)}">${isResearchDerived(item) ? "Restricted substitute" : "Public DBQ"}</span>
          <strong>${escapeHtml(shortTitle(item.title))}</strong>
          <span>${escapeHtml(item.category)} · ${escapeHtml(first(item.symptoms, item.purpose || "DBQ prep prompts available"))}</span>
        </button>
        <button class="${selected ? "secondary-button" : "primary-button"}" type="button" data-add="${escapeHtml(item.id)}">${selected ? "Added" : "Add"}</button>
      </article>
    `;
  }).join("");
}

function optionInput(item, key, label) {
  const value = optionsFor(item)[key] || "";
  const multiline = ["mainSymptoms", "limitation", "treatment", "flareCare", "workImpact", "dailyImpact", "serviceEvent", "evidence"].includes(key);
  return `
    <label class="input-row">
      <span>${escapeHtml(label)}</span>
      ${multiline
        ? `<textarea data-option="${escapeHtml(key)}" rows="2">${escapeHtml(value)}</textarea>`
        : `<input data-option="${escapeHtml(key)}" value="${escapeHtml(value)}" />`}
    </label>
  `;
}

const OPTION_LABELS = {
  severity: "Severity",
  frequency: "Frequency",
  duration: "Duration",
  bestPain: "Best Day",
  worstPain: "Worst Day",
  flareUps: "Flare-Ups",
  triggers: "Triggers",
  limitation: "Daily Limitation",
  treatment: "Treatment",
  flareCare: "Flare Care",
  limitBeforeStopping: "Limit Before Stopping",
  onset: "Onset",
  serviceEvent: "Service Event",
  currentDiagnosis: "Diagnosis",
  mainSymptoms: "Main Symptoms",
  workImpact: "Work Impact",
  dailyImpact: "Daily Impact",
  evidence: "Evidence"
};

const OPTION_ORDER = [
  "currentDiagnosis",
  "mainSymptoms",
  "severity",
  "frequency",
  "duration",
  "bestPain",
  "worstPain",
  "flareUps",
  "triggers",
  "limitation",
  "workImpact",
  "dailyImpact",
  "treatment",
  "flareCare",
  "limitBeforeStopping",
  "onset",
  "serviceEvent",
  "evidence"
];

function inputKeysFor(item) {
  const keys = new Set(Object.keys(item?.scriptTemplates?.default_options || {}));
  (item?.scriptTemplates?.sections || []).forEach((section) => {
    (section.blank_fields || []).forEach((key) => keys.add(key));
    (section.subsections || []).forEach((subsection) => {
      (subsection.blank_fields || []).forEach((key) => keys.add(key));
    });
  });
  if (!keys.size) {
    ["severity", "frequency", "flareUps", "triggers", "limitation", "treatment", "bestPain", "worstPain", "limitBeforeStopping", "onset", "serviceEvent"].forEach((key) => keys.add(key));
  }
  keys.delete("aliases");
  return [...keys].sort((a, b) => {
    const aIndex = OPTION_ORDER.indexOf(a);
    const bIndex = OPTION_ORDER.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
}

function optionLabel(key) {
  return OPTION_LABELS[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function renderInputs(item) {
  const keys = inputKeysFor(item);
  return `
    <aside class="input-card">
      <div class="panel-title">
        <h3>Your Inputs</h3>
        <span>Auto-updates</span>
      </div>
      <div class="input-list">
        ${keys.map((key) => optionInput(item, key, optionLabel(key))).join("")}
      </div>
      <p class="input-note">Edit any field and the script updates immediately.</p>
    </aside>

  `;
}

function renderActiveInputs() {
  const container = document.getElementById("activeInputs");
  if (!container) return;
  const active = byId(state.activeId) || selectedClaims()[0] || null;
  if (!active) {
    container.innerHTML = `
      <aside class="input-card empty-input-card">
        <div class="panel-title">
          <h3>Your Inputs</h3>
          <span>Pick a claim</span>
        </div>
        <p class="input-note">Add or preview a DBQ above, then tune the details that personalize the generated script.</p>
      </aside>
    `;
    return;
  }
  optionsFor(active);
  container.innerHTML = renderInputs(active);
}

function scriptSection(section) {
  const open = state.openSection === section.id;
  const statement = section.example ? `${section.say} ${section.example}` : section.say;
  const bullets = (section.bullets || []).filter(Boolean);
  return `
    <section class="script-section ${section.color} ${open ? "open" : ""}">
      <button class="script-summary" type="button" data-section="${escapeHtml(section.id)}">
        <span class="step-badge">${section.number}</span>
        <span class="section-icon">${section.icon}</span>
        <span>
          <strong>${escapeHtml(section.title)}</strong>
          <em>${open ? "Script visible" : "Tap to view script"}</em>
        </span>
        <span class="chevron">${open ? "⌃" : "⌄"}</span>
      </button>
      ${open ? `
        <div class="script-body">
          <article>
            <span>Read-Aloud Statement</span>
            <div class="statement-copy">${renderStatement(statement)}</div>
          </article>
          ${bullets.length ? `
            <article class="quick-specifics">
              <span>Specifics to Mention</span>
              <ul>
                ${bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}
              </ul>
            </article>
          ` : ""}
        </div>
      ` : ""}
    </section>
  `;
}

function renderDetail() {
  const detail = document.getElementById("claimDetail");
  const active = byId(state.activeId) || selectedClaims()[0] || null;

  if (!active) {
    detail.innerHTML = `
      <div class="detail-empty">
        <p class="section-kicker">Script builder</p>
        <h2>Select a claim to generate a read-aloud C&P script.</h2>
        <p>Add a DBQ from the library. Then adjust the inputs and open each examiner question category to see exactly what to say.</p>
      </div>
    `;
    return;
  }

  if (state.activeId !== active.id) {
    state.activeId = active.id;
    persist();
  }

  optionsFor(active);
  const source = active.sourceUrl || active.availability || "Local DBQ JSON dataset";
  const sections = scriptSections(active);

  detail.innerHTML = `
    <div class="script-app">
      <section class="script-main">
        <header class="script-header">
          <div>
            <h2>${escapeHtml(shortTitle(active.title))}</h2>
            <p>C&P Exam Script Builder</p>
          </div>
          <span class="badge ${badgeClass(active)}">${isResearchDerived(active) ? "Not official DBQ" : "Public DBQ-aligned"}</span>
        </header>

        <div class="info-strip">
          <strong>i</strong>
          <span>Use your inputs above, then tap a section to answer the examiner’s medical history, symptom evaluation, and functional impact questions.</span>
        </div>

        <div class="script-list">
          ${sections.map(scriptSection).join("")}
        </div>



    </div>
  `;
}

function render() {
  document.getElementById("searchInput").value = state.query;
  renderClaimList();
  renderSearchResults();
  renderActiveInputs();
  renderDetail();
}

document.getElementById("searchInput").addEventListener("input", (event) => {
  state.query = event.target.value;
  persist();
  renderSearchResults();
});

document.getElementById("clearSearch").addEventListener("click", () => {
  state.query = "";
  renderAndSave();
  document.getElementById("searchInput").focus();
});

document.getElementById("searchResults").addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add]");
  const previewButton = event.target.closest("[data-preview]");
  if (addButton) {
    addClaim(addButton.dataset.add);
    return;
  }
  if (previewButton) {
    state.activeId = previewButton.dataset.preview;
    persist();
    renderActiveInputs();
    renderDetail();
  }
});

document.getElementById("claimList").addEventListener("click", (event) => {
  const activeButton = event.target.closest("[data-active]");
  const removeButton = event.target.closest("[data-remove]");
  if (removeButton) {
    removeClaim(removeButton.dataset.remove);
    return;
  }
  if (activeButton) setActive(activeButton.dataset.active);
});

document.getElementById("claimDetail").addEventListener("click", (event) => {
  const sectionButton = event.target.closest("[data-section]");
  if (!sectionButton) return;
  state.openSection = state.openSection === sectionButton.dataset.section ? "" : sectionButton.dataset.section;
  renderAndSave();
});

function handleOptionInput(event) {
  const input = event.target.closest("[data-option]");
  const active = byId(state.activeId);
  if (!input || !active) return;
  state.claimOptions[active.id] = {
    ...optionsFor(active),
    [input.dataset.option]: input.value
  };
  persist();
  renderDetail();
  const next = document.querySelector(`[data-option="${input.dataset.option}"]`);
  if (next) {
    next.focus();
    next.setSelectionRange?.(input.value.length, input.value.length);
  }
}

document.getElementById("activeInputs")?.addEventListener("input", handleOptionInput);
document.getElementById("claimDetail").addEventListener("input", handleOptionInput);

document.getElementById("exportButton").addEventListener("click", () => {
  const claims = selectedClaims().map((claim) => ({
    id: claim.id,
    title: claim.title,
    category: claim.category,
    documentType: documentTypeFor(claim),
    inputs: optionsFor(claim),
    sections: scriptSections(claim)
  }));
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), claims }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "dbq-exam-script.json";
  link.click();
  URL.revokeObjectURL(url);
});

document.getElementById("resetButton").addEventListener("click", () => {
  if (!confirm("Reset selected claims and scripts in this browser?")) return;
  state = structuredClone(defaultState);
  localStorage.removeItem(STORAGE_KEY);
  render();
});

render();
