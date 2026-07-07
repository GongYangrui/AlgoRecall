import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const OUTPUT = path.resolve(process.cwd(), "data", "study_lists.json");
const LEETCODE_DETAILS = path.resolve(process.cwd(), "data", "leetcode_details.json");

const STUDY_LISTS = [
  {
    slug: "top-100-liked",
    title: "Top 100 Liked",
    description: "LeetCode 中文站热门 100 题，适合系统补齐高频基础题型。",
    sourceUrl: "https://leetcode.cn/studyplan/top-100-liked/",
    locale: "cn",
    kind: "cn-studyplan",
  },
  {
    slug: "top-interview-150",
    title: "Top Interview 150",
    description: "LeetCode 中文站面试 150 题，覆盖数组、链表、树、图、动态规划等核心主题。",
    sourceUrl: "https://leetcode.cn/studyplan/top-interview-150/",
    locale: "cn",
    kind: "cn-studyplan",
  },
  {
    slug: "plakya4j",
    title: "NeetCode 150",
    description: "LeetCode 英文站公开题单，按原题单顺序推进。",
    sourceUrl: "https://leetcode.com/problem-list/plakya4j/",
    locale: "en",
    kind: "en-favorite",
  },
  {
    slug: "a8e0kma7",
    title: "bl75+gl75",
    description: "LeetCode 英文站公开题单，适合按题型模式刷题。",
    sourceUrl: "https://leetcode.com/problem-list/a8e0kma7/",
    locale: "en",
    kind: "en-favorite",
  },
];

function uniqueSlugs(slugs) {
  return [...new Set(slugs.filter(Boolean))];
}

async function fetchCnStudyPlan(url) {
  const html = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0" },
  }).then((response) => {
    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
    return response.text();
  });

  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error(`Missing __NEXT_DATA__ in ${url}`);

  const data = JSON.parse(match[1]);
  const text = JSON.stringify(data);
  const slugs = uniqueSlugs([...text.matchAll(/"titleSlug":"([^"]+)"/g)].map((item) => item[1]));

  if (slugs.length === 0) throw new Error(`No title slugs found in ${url}`);
  return slugs;
}

async function fetchEnFavorite(favoriteSlug) {
  const query = `query favoriteQuestionList($favoriteSlug: String!) {
    favoriteQuestionList(favoriteSlug: $favoriteSlug) {
      questions {
        titleSlug
      }
    }
  }`;

  const response = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "referer": `https://leetcode.com/problem-list/${favoriteSlug}/`,
      "user-agent": "Mozilla/5.0",
    },
    body: JSON.stringify({
      query,
      variables: { favoriteSlug },
      operationName: "favoriteQuestionList",
    }),
  });

  if (!response.ok) throw new Error(`Failed to fetch ${favoriteSlug}: ${response.status}`);
  const body = await response.json();
  if (body.errors?.length) throw new Error(`GraphQL error for ${favoriteSlug}: ${JSON.stringify(body.errors)}`);

  const slugs = uniqueSlugs(body.data?.favoriteQuestionList?.questions?.map((question) => question.titleSlug) ?? []);
  if (slugs.length === 0) throw new Error(`No title slugs found for ${favoriteSlug}`);
  return slugs;
}

async function main() {
  const leetcodeQuestions = JSON.parse(await readFile(LEETCODE_DETAILS, "utf8"));
  const knownSlugs = new Set(leetcodeQuestions.map((question) => question.titleSlug));
  const lists = [];

  for (const list of STUDY_LISTS) {
    const slugs = list.kind === "cn-studyplan" ? await fetchCnStudyPlan(list.sourceUrl) : await fetchEnFavorite(list.slug);
    const missing = slugs.filter((slug) => !knownSlugs.has(slug));
    if (missing.length > 0) {
      throw new Error(`${list.slug} has ${missing.length} unknown slugs: ${missing.slice(0, 10).join(", ")}`);
    }

    lists.push({
      slug: list.slug,
      title: list.title,
      description: list.description,
      sourceUrl: list.sourceUrl,
      locale: list.locale,
      items: slugs.map((titleSlug, index) => ({
        order: index + 1,
        titleSlug,
      })),
    });
  }

  await writeFile(OUTPUT, `${JSON.stringify(lists, null, 2)}\n`);
  for (const list of lists) {
    console.log(`${list.slug}: ${list.items.length} questions`);
  }
  console.log(`Saved ${OUTPUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
