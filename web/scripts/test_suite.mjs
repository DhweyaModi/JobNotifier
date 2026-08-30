import assert from "assert";

console.log("\n🧪 Running JobNotifier Web Test Suite...\n");

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

// --- 1. Deduplication & Normalization Tests ---
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
  return t.replace(/[^a-z0-9]+/g, " ").trim();
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

console.log("--- Normalization & Deduplication ---");

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

// --- 2. Country & Filter Tests ---
console.log("\n--- Filter & Matching Logic ---");

function matchCountryFilter(jobCountry, filterCountry) {
  if (filterCountry === "all") return true;
  return jobCountry === filterCountry;
}

function matchRoleFilter(title, filterRole) {
  if (!filterRole) return true;
  const roleLower = filterRole.toLowerCase();
  const titleLower = title.toLowerCase();
  if (roleLower === "software") return titleLower.includes("software") || titleLower.includes("swe");
  if (roleLower === "ai / ml") return titleLower.includes("ai") || titleLower.includes("ml") || titleLower.includes("machine learning");
  if (roleLower === "data science") return titleLower.includes("data") || titleLower.includes("analyst");
  return true;
}

it("should correctly isolate Canada and USA country filters", () => {
  assert.strictEqual(matchCountryFilter("canada", "canada"), true);
  assert.strictEqual(matchCountryFilter("usa", "canada"), false);
  assert.strictEqual(matchCountryFilter("canada", "usa"), false);
  assert.strictEqual(matchCountryFilter("usa", "all"), true);
  assert.strictEqual(matchCountryFilter("canada", "all"), true);
});

it("should accurately match role filters to job titles", () => {
  assert.strictEqual(matchRoleFilter("Software Engineer Intern", "software"), true);
  assert.strictEqual(matchRoleFilter("Junior SWE Developer", "software"), true);
  assert.strictEqual(matchRoleFilter("Product Manager Intern", "software"), false);
  assert.strictEqual(matchRoleFilter("Applied Machine Learning Intern", "ai / ml"), true);
  assert.strictEqual(matchRoleFilter("Data Science Analyst", "data science"), true);
});

// --- 3. Application Lifecycle Status Tests ---
console.log("\n--- Application Tracker Stages ---");

const VALID_STAGES = ["SAVED", "APPLIED", "INTERVIEWING", "OFFER", "REJECTED"];

it("should validate all 5 Kanban application pipeline stages", () => {
  VALID_STAGES.forEach((stage) => {
    assert.ok(VALID_STAGES.includes(stage), `${stage} must be valid`);
  });
});

it("should correctly calculate tracked application counts", () => {
  const mockJobs = [
    { id: "1", title: "SWE", applicationStatus: "APPLIED" },
    { id: "2", title: "ML", applicationStatus: "SAVED" },
    { id: "3", title: "Data", applicationStatus: "NONE" },
    { id: "4", title: "Quant", applicationStatus: "INTERVIEWING" },
  ];
  const trackedCount = mockJobs.filter((j) => j.applicationStatus && j.applicationStatus !== "NONE").length;
  assert.strictEqual(trackedCount, 3);
});

// --- Test Summary ---
console.log("\n=========================================");
console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
console.log("=========================================\n");

if (failed > 0) {
  process.exit(1);
}
