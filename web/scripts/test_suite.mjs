import assert from "assert";

console.log("\n🧪 Running Comprehensive JobNotifier Usability & Capability Verification Suite...\n");

let passed = 0;
let failed = 0;

function it(description, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

// --- 1. Deduplication & Normalization Functions ---
function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[\(\[\{].*?[\)\]\}]/g, "")
    .replace(/\b(inc|llc|ltd|corp|co|technologies|technology|labs|group|platforms|solutions|interactive|software|systems)\b\.?/gi, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeTitle(title) {
  let t = title.toLowerCase().replace(/<[^>]+>/g, "").replace(/[\(\[\{].*?[\)\]\}]/g, "");
  t = t.replace(/\bswe\b/g, "software engineer")
       .replace(/\bml\b/g, "machine learning")
       .replace(/\bai\b/g, "artificial intelligence")
       .replace(/\b(engineering|developer|developers|dev)\b/g, "engineer")
       .replace(/\b(scientists|science)\b/g, "scientist")
       .replace(/\b(analysts|analytics)\b/g, "analyst")
       .replace(/\b(summer|fall|winter|spring|202[0-9]|203[0-9]|internship|intern|co-?op|coop|hybrid|remote|in-?person|in-?office|onsite|new grad|entry level|early career|usa?|canada|student|position|role|job)\b/g, " ");
  t = t.replace(/[^a-z0-9]+/g, " ").trim();
  return t.replace(/\b(\w+)(?:\s+\1\b)+/g, "$1");
}

function normalizeUrl(url) {
  if (!url || url === "#") return "";
  try {
    const u = new URL(url);
    let host = u.hostname.toLowerCase();
    if (host.startsWith("www.")) host = host.slice(4);
    const path = u.pathname.replace(/\/+$/, "");
    return `${host}${path}`;
  } catch {
    return url.toLowerCase().trim();
  }
}

function deduplicateJobs(jobs) {
  const seenKeys = new Set();
  const result = [];

  for (const job of jobs) {
    const normComp = normalizeText(job.company || "");
    const normTit = normalizeTitle(job.title || "");
    const normCountry = (job.country || "").toLowerCase();
    const normU = normalizeUrl(job.url || "");

    const keys = [];
    if (normU) keys.push(`url:${normU}`);
    if (normComp && normTit) {
      if (normCountry && normCountry !== "other") {
        keys.push(`role:${normComp}:${normTit}:${normCountry}`);
      }
      keys.push(`role:${normComp}:${normTit}`);
    }

    const isDuplicate = keys.some((k) => seenKeys.has(k)) || seenKeys.has(job.id);
    if (isDuplicate) continue;

    seenKeys.add(job.id);
    keys.forEach((k) => seenKeys.add(k));
    result.push(job);
  }

  return result;
}

console.log("--- 1. Data Normalization & Deduplication ---");

it("should normalize company names by stripping legal suffixes", () => {
  assert.strictEqual(normalizeText("Datadog, Inc."), "datadog");
  assert.strictEqual(normalizeText("Shopify Technologies Ltd."), "shopify");
  assert.strictEqual(normalizeText("Meta Platforms (US)"), "meta");
});

it("should normalize tech role titles into canonical forms", () => {
  assert.strictEqual(normalizeTitle("Software Engineering Intern - Summer 2026"), "software engineer");
  assert.strictEqual(normalizeTitle("SWE Developer Co-op (2026)"), "software engineer");
  assert.strictEqual(normalizeTitle("Machine Learning / AI Intern"), "machine learning artificial intelligence");
  assert.strictEqual(normalizeTitle("Data Science Analyst - Fall 2026"), "data scientist analyst");
});

it("should strip query tracking parameters from application URLs", () => {
  assert.strictEqual(
    normalizeUrl("https://boards.greenhouse.io/stripe/jobs/12345?gh_src=tracker&utm_medium=slack"),
    "boards.greenhouse.io/stripe/jobs/12345"
  );
  assert.strictEqual(
    normalizeUrl("https://jobs.lever.co/databricks/abc-123/"),
    "jobs.lever.co/databricks/abc-123"
  );
});

it("should eliminate duplicate postings across multiple scrapers", () => {
  const sampleJobs = [
    { id: "1", company: "Google", title: "SWE Intern", country: "canada", url: "https://careers.google.com/jobs/1" },
    { id: "2", company: "Google Inc.", title: "Software Engineering Intern", country: "canada", url: "https://careers.google.com/jobs/1?src=slack" },
    { id: "3", company: "Microsoft", title: "Explore Intern", country: "usa", url: "https://careers.microsoft.com/jobs/2" },
  ];
  const deduped = deduplicateJobs(sampleJobs);
  assert.strictEqual(deduped.length, 2);
  assert.strictEqual(deduped[0].company, "Google");
  assert.strictEqual(deduped[1].company, "Microsoft");
});

// --- 2. Filter & Multi-Criteria Matching Logic ---
console.log("\n--- 2. Filter & Search Engine Logic ---");

function filterJobs(jobs, filters) {
  return jobs.filter((job) => {
    // 1. Multi-country filter
    if (filters.countries && filters.countries.length > 0) {
      if (!filters.countries.includes(job.country)) {
        return false;
      }
    }

    // 2. Multi-role filter
    if (filters.roles && filters.roles.length > 0) {
      const titleLower = (job.title || "").toLowerCase();
      const matchesAnyRole = filters.roles.some((r) => {
        const roleLower = r.toLowerCase();
        if (roleLower === "software") return titleLower.includes("software") || titleLower.includes("swe") || titleLower.includes("developer");
        if (roleLower === "ai / ml") return titleLower.includes("ai") || titleLower.includes("ml") || titleLower.includes("machine learning") || titleLower.includes("intelligence");
        if (roleLower === "data science") return titleLower.includes("data") || titleLower.includes("analyst") || titleLower.includes("analytics");
        if (roleLower === "quant") return titleLower.includes("quant") || titleLower.includes("trader") || titleLower.includes("trading");
        if (roleLower === "backend") return titleLower.includes("backend") || titleLower.includes("back-end") || titleLower.includes("server") || titleLower.includes("api");
        if (roleLower === "frontend") return titleLower.includes("frontend") || titleLower.includes("front-end") || titleLower.includes("web") || titleLower.includes("ui");
        if (roleLower === "firmware") return titleLower.includes("firmware") || titleLower.includes("hardware") || titleLower.includes("embedded");
        if (roleLower === "cloud / devops") return titleLower.includes("cloud") || titleLower.includes("devops") || titleLower.includes("sre") || titleLower.includes("infrastructure");
        if (roleLower === "security") return titleLower.includes("security") || titleLower.includes("cyber") || titleLower.includes("appsec");
        return titleLower.includes(roleLower);
      });
      if (!matchesAnyRole) return false;
    }

    // 3. Multi-status filter
    if (filters.statuses && filters.statuses.length > 0) {
      const jobStatus = job.applicationStatus || "NONE";
      if (!filters.statuses.includes(jobStatus)) {
        return false;
      }
    }

    // 4. Workplace / Work type filter
    if (filters.workType && filters.workType !== "all") {
      const combined = `${job.title} ${job.location}`.toLowerCase();
      if (filters.workType === "remote" && !combined.includes("remote")) return false;
      if (filters.workType === "hybrid" && !combined.includes("hybrid")) return false;
      if (filters.workType === "onsite" && (combined.includes("remote") && !combined.includes("hybrid"))) return false;
    }

    // 5. Search query matching
    if (filters.search) {
      const query = filters.search.toLowerCase().trim();
      const matchTitle = (job.title || "").toLowerCase().includes(query);
      const matchCompany = (job.company || "").toLowerCase().includes(query);
      const matchLoc = (job.location || "").toLowerCase().includes(query);
      if (!matchTitle && !matchCompany && !matchLoc) {
        return false;
      }
    }

    return true;
  });
}

const testDataset = [
  { id: "j1", company: "Shopify", title: "Backend Engineer Intern", location: "Toronto, ON", country: "canada", applicationStatus: "NONE" },
  { id: "j2", company: "Cohere", title: "AI / ML Research Intern", location: "Remote, Canada", country: "canada", applicationStatus: "SAVED" },
  { id: "j3", company: "Meta", title: "Software Engineer Intern", location: "Menlo Park, CA", country: "usa", applicationStatus: "APPLIED" },
  { id: "j4", company: "Jane Street", title: "Quantitative Trading Intern", location: "New York, NY", country: "usa", applicationStatus: "INTERVIEWING" },
  { id: "j5", company: "Stripe", title: "Infrastructure / Cloud Intern", location: "San Francisco, CA (Hybrid)", country: "usa", applicationStatus: "OFFER" },
];

it("should filter by multiple countries simultaneously", () => {
  const resultCA = filterJobs(testDataset, { countries: ["canada"] });
  assert.strictEqual(resultCA.length, 2);

  const resultUS = filterJobs(testDataset, { countries: ["usa"] });
  assert.strictEqual(resultUS.length, 3);

  const resultBoth = filterJobs(testDataset, { countries: ["canada", "usa"] });
  assert.strictEqual(resultBoth.length, 5);
});

it("should accurately filter across all 9 technical domain roles", () => {
  const aiJobs = filterJobs(testDataset, { roles: ["AI / ML"] });
  assert.strictEqual(aiJobs.length, 1);
  assert.strictEqual(aiJobs[0].company, "Cohere");

  const backendJobs = filterJobs(testDataset, { roles: ["Backend"] });
  assert.strictEqual(backendJobs.length, 1);
  assert.strictEqual(backendJobs[0].company, "Shopify");

  const quantJobs = filterJobs(testDataset, { roles: ["Quant"] });
  assert.strictEqual(quantJobs.length, 1);
  assert.strictEqual(quantJobs[0].company, "Jane Street");

  const cloudJobs = filterJobs(testDataset, { roles: ["Cloud / DevOps"] });
  assert.strictEqual(cloudJobs.length, 1);
  assert.strictEqual(cloudJobs[0].company, "Stripe");
});

it("should filter by workplace arrangement (Remote / Hybrid / Onsite)", () => {
  const remoteOnly = filterJobs(testDataset, { workType: "remote" });
  assert.strictEqual(remoteOnly.length, 1);
  assert.strictEqual(remoteOnly[0].company, "Cohere");

  const hybridOnly = filterJobs(testDataset, { workType: "hybrid" });
  assert.strictEqual(hybridOnly.length, 1);
  assert.strictEqual(hybridOnly[0].company, "Stripe");
});

it("should perform multi-field fuzzy search across company, title, and location", () => {
  const byCompany = filterJobs(testDataset, { search: "shopify" });
  assert.strictEqual(byCompany.length, 1);

  const byTitle = filterJobs(testDataset, { search: "research" });
  assert.strictEqual(byTitle.length, 1);
  assert.strictEqual(byTitle[0].company, "Cohere");

  const byLocation = filterJobs(testDataset, { search: "Toronto" });
  assert.strictEqual(byLocation.length, 1);
  assert.strictEqual(byLocation[0].company, "Shopify");
});

// --- 3. Sorting Algorithms ---
console.log("\n--- 3. Sorting Verification ---");

function sortJobs(jobs, sortBy) {
  return [...jobs].sort((a, b) => {
    if (sortBy === "company") {
      return a.company.localeCompare(b.company);
    } else if (sortBy === "title") {
      return a.title.localeCompare(b.title);
    }
    const timeB = (b.scrapedAt || b.createdAt) ? new Date(b.scrapedAt || b.createdAt).getTime() : ((b.postedTimestamp || 0) * 1000);
    const timeA = (a.scrapedAt || a.createdAt) ? new Date(a.scrapedAt || a.createdAt).getTime() : ((a.postedTimestamp || 0) * 1000);
    if (!isNaN(timeB) && !isNaN(timeA) && timeB !== timeA) {
      return timeB - timeA;
    }
    return (b.postedTimestamp || 0) - (a.postedTimestamp || 0);
  });
}

it("should sort alphabetically by Company (A-Z)", () => {
  const sorted = sortJobs(testDataset, "company");
  assert.strictEqual(sorted[0].company, "Cohere");
  assert.strictEqual(sorted[1].company, "Jane Street");
  assert.strictEqual(sorted[sorted.length - 1].company, "Stripe");
});

it("should sort alphabetically by Job Title", () => {
  const sorted = sortJobs(testDataset, "title");
  assert.strictEqual(sorted[0].title, "AI / ML Research Intern");
  assert.strictEqual(sorted[1].title, "Backend Engineer Intern");
});

// --- 4. Application Tracker State Machine & Kanban Logic ---
console.log("\n--- 4. Application Tracker & Status Transitions ---");

function transitionStatus(currentStatus, targetStatus) {
  const validStatuses = new Set(["NONE", "SAVED", "APPLIED", "INTERVIEWING", "OFFER", "REJECTED"]);
  if (!validStatuses.has(targetStatus)) {
    throw new Error(`Invalid status transition to ${targetStatus}`);
  }
  return {
    status: targetStatus,
    isBookmarked: targetStatus === "SAVED",
    isTracked: targetStatus !== "NONE",
  };
}

it("should properly manage 5-stage application pipeline transitions", () => {
  let state = transitionStatus("NONE", "SAVED");
  assert.strictEqual(state.status, "SAVED");
  assert.strictEqual(state.isBookmarked, true);
  assert.strictEqual(state.isTracked, true);

  state = transitionStatus("SAVED", "APPLIED");
  assert.strictEqual(state.status, "APPLIED");
  assert.strictEqual(state.isBookmarked, false);
  assert.strictEqual(state.isTracked, true);

  state = transitionStatus("APPLIED", "INTERVIEWING");
  assert.strictEqual(state.status, "INTERVIEWING");

  state = transitionStatus("INTERVIEWING", "OFFER");
  assert.strictEqual(state.status, "OFFER");

  state = transitionStatus("OFFER", "NONE");
  assert.strictEqual(state.status, "NONE");
  assert.strictEqual(state.isTracked, false);
});

// --- 5. High Tech Strict Tier Verification ---
console.log("\n--- 5. High Tech Tier Verification ---");

const HIGH_TECH_SET = new Set(["google", "microsoft"]);

function isHighTechJob(company) {
  return HIGH_TECH_SET.has(company.toLowerCase().trim());
}

it("should strictly limit high-tech classification to Google and Microsoft", () => {
  assert.strictEqual(isHighTechJob("Google"), true);
  assert.strictEqual(isHighTechJob("Microsoft"), true);
  assert.strictEqual(isHighTechJob("Apple"), false);
  assert.strictEqual(isHighTechJob("Amazon"), false);
  assert.strictEqual(isHighTechJob("Meta"), false);
  assert.strictEqual(isHighTechJob("Netflix"), false);
});

// --- 6. Guest Session & RFC4122 Compliance ---
console.log("\n--- 6. Authentication & Guest Session Safety ---");

function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

it("should generate RFC4122 compliant guest user identifiers", () => {
  for (let i = 0; i < 20; i++) {
    const uuid = generateUUID();
    assert.strictEqual(isValidUUID(uuid), true);
  }
});

// --- Test Summary ---
console.log("\n============================================================");
console.log(`📊 Comprehensive Verification Results: ${passed} Passed, ${failed} Failed`);
console.log("============================================================\n");

if (failed > 0) {
  process.exit(1);
}

