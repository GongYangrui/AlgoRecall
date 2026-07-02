import fs from "node:fs";
import path from "node:path";

const INPUT = path.resolve(process.cwd(), "data", "leetcode_problem_list.json");
const OUTPUT = path.resolve(process.cwd(), "data", "leetcode_details.json");
const FAILED = path.resolve(process.cwd(), "data", "fetch_failed.json");

const GRAPHQL_URL = "https://leetcode.cn/graphql";
const DELAY_MS = 50;
const MAX_RETRIES = 2;
const BATCH_SIZE = 100;

const QUERY = `query questionData($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    questionId
    questionFrontendId
    title
    titleSlug
    difficulty
    content
    translatedContent
    translatedTitle
    topicTags {
      name
      slug
      translatedName
    }
  }
}`;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function difficultyToLevel(diff) {
  const lower = (diff ?? "").toLowerCase();
  if (lower === "easy") return "easy";
  if (lower === "medium") return "medium";
  if (lower === "hard") return "hard";
  if (diff === 1 || diff === "1") return "easy";
  if (diff === 2 || diff === "2") return "medium";
  if (diff === 3 || diff === "3") return "hard";
  return "";
}

async function fetchQuestion(slug) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Referer: "https://leetcode.cn",
        },
        body: JSON.stringify({
          operationName: "questionData",
          variables: { titleSlug: slug },
          query: QUERY,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const body = await response.json();
      const q = body?.data?.question;
      if (!q) {
        throw new Error("empty question data");
      }

      return q;
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        await delay(500 * (attempt + 1));
      } else {
        throw err;
      }
    }
  }
}

function normalize(raw) {
  const questionFrontendId = String(raw.questionFrontendId ?? "");
  const title = (raw.title ?? "").trim();
  const titleSlug = (raw.titleSlug ?? "").trim();
  const difficulty = difficultyToLevel(raw.difficulty);
  const titleCn = raw.translatedTitle?.trim() || null;
  const content = raw.content?.trim() || null;
  const contentCn = raw.translatedContent?.trim() || null;

  if (!questionFrontendId || !title || !titleSlug || !difficulty) {
    return null;
  }

  const tags = (raw.topicTags ?? []).map((t) => t.name).filter(Boolean);
  const tagsCn = (raw.topicTags ?? [])
    .map((t) => t.translatedName)
    .filter(Boolean);

  const urlEn = `https://leetcode.com/problems/${titleSlug}`;
  const urlCn = `https://leetcode.cn/problems/${titleSlug}`;

  return {
    questionFrontendId,
    title,
    titleSlug,
    titleCn,
    difficulty,
    content,
    contentCn,
    tags: tags.length ? tags : null,
    tagsCn: tagsCn.length ? tagsCn : null,
    urlEn,
    urlCn,
  };
}

function readExisting() {
  try {
    const data = JSON.parse(fs.readFileSync(OUTPUT, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function readFailed() {
  try {
    const data = JSON.parse(fs.readFileSync(FAILED, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function main() {
  const raw = JSON.parse(fs.readFileSync(INPUT, "utf8"));
  const pairs = raw.stat_status_pairs ?? [];

  const allSlugs = pairs
    .map((p) => p.stat?.question__title_slug)
    .filter(Boolean);
  const total = allSlugs.length;

  let results = readExisting();
  let failedSlugs = readFailed();

  const doneSlugs = new Set(results.map((r) => r.titleSlug));
  const failedSet = new Set(failedSlugs);

  const pendingSlugs = allSlugs.filter((s) => !doneSlugs.has(s) && !failedSet.has(s));
  const totalPending = pendingSlugs.length;

  console.log(`Total: ${total}, already done: ${results.length}, failed: ${failedSlugs.length}, pending: ${totalPending}`);

  if (totalPending === 0) {
    console.log("All done!");
    return;
  }

  const batchResult = [];

  for (let i = 0; i < pendingSlugs.length; i++) {
    const slug = pendingSlugs[i];

    try {
      const q = await fetchQuestion(slug);
      const normalized = normalize(q);
      if (normalized) {
        batchResult.push(normalized);
      } else {
        failedSlugs.push(slug);
      }
    } catch {
      failedSlugs.push(slug);
    }

    if ((i + 1) % 100 === 0 || i === totalPending - 1) {
      console.log(
        `Progress: ${i + 1}/${totalPending}  (batch: ${batchResult.length})`
      );
    }

    // flush batch
    if (batchResult.length >= BATCH_SIZE || i === totalPending - 1) {
      results = readExisting();
      results.push(...batchResult);
      fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2), "utf8");
      fs.writeFileSync(FAILED, JSON.stringify(failedSlugs, null, 2), "utf8");
      console.log(`  → flushed ${batchResult.length} items to ${OUTPUT}, total: ${results.length}`);
      batchResult.length = 0;
    }

    await delay(DELAY_MS);
  }

  console.log(`\nDone. Saved ${results.length} questions, ${failedSlugs.length} failed.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
