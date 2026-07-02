#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import Database from "better-sqlite3";

const inputPath = process.argv[2];

if (!inputPath) {
  console.error("Usage: npm run import:leetcode -- <path-to-json-or-csv>");
  process.exit(1);
}

const resolvedInputPath = path.resolve(process.cwd(), inputPath);
const dbPath = process.env.DATABASE_URL || path.join(process.cwd(), "data", "algorecall.db");
const source = fs.readFileSync(resolvedInputPath, "utf8");
const rows = parseInput(source, resolvedInputPath);

if (rows.length === 0) {
  console.log("No LeetCode questions found in input file.");
  process.exit(0);
}

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS leetcode_questions (
    title_slug TEXT PRIMARY KEY,
    question_frontend_id TEXT NOT NULL,
    title TEXT NOT NULL,
    title_cn TEXT,
    difficulty TEXT NOT NULL,
    tags TEXT,
    tags_cn TEXT,
    url_en TEXT NOT NULL,
    url_cn TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_leetcode_questions_frontend_id
    ON leetcode_questions(question_frontend_id);
  CREATE INDEX IF NOT EXISTS idx_leetcode_questions_title
    ON leetcode_questions(title);
  CREATE INDEX IF NOT EXISTS idx_leetcode_questions_title_cn
    ON leetcode_questions(title_cn);
`);

const now = new Date().toISOString();
const upsert = sqlite.prepare(`
  INSERT INTO leetcode_questions (
    title_slug,
    question_frontend_id,
    title,
    title_cn,
    difficulty,
    tags,
    tags_cn,
    url_en,
    url_cn,
    updated_at
  )
  VALUES (
    @titleSlug,
    @questionFrontendId,
    @title,
    @titleCn,
    @difficulty,
    @tags,
    @tagsCn,
    @urlEn,
    @urlCn,
    @updatedAt
  )
  ON CONFLICT(title_slug) DO UPDATE SET
    question_frontend_id = excluded.question_frontend_id,
    title = excluded.title,
    title_cn = excluded.title_cn,
    difficulty = excluded.difficulty,
    tags = excluded.tags,
    tags_cn = excluded.tags_cn,
    url_en = excluded.url_en,
    url_cn = excluded.url_cn,
    updated_at = excluded.updated_at
`);
const removeStaleSlug = sqlite.prepare(`
  DELETE FROM leetcode_questions
  WHERE question_frontend_id = ? AND title_slug <> ?
`);

let imported = 0;
const skipped = [];

const transaction = sqlite.transaction((items) => {
  for (const item of items) {
    const normalized = normalizeQuestion(item, now);
    if (!normalized.ok) {
      skipped.push(normalized.reason);
      continue;
    }

    removeStaleSlug.run(normalized.value.questionFrontendId, normalized.value.titleSlug);
    upsert.run(normalized.value);
    imported += 1;
  }
});

transaction(rows);
sqlite.close();

console.log(`Imported ${imported} LeetCode questions into ${dbPath}.`);
if (skipped.length > 0) {
  console.warn(`Skipped ${skipped.length} invalid rows.`);
  for (const reason of skipped.slice(0, 5)) {
    console.warn(`- ${reason}`);
  }
}

function parseInput(content, filename) {
  if (filename.toLowerCase().endsWith(".csv")) {
    return parseCsv(content);
  }

  const parsed = JSON.parse(content);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.questions)) return parsed.questions;
  if (Array.isArray(parsed.items)) return parsed.items;

  throw new Error("JSON input must be an array or contain a questions/items array.");
}

function normalizeQuestion(raw, updatedAt) {
  const questionFrontendId = stringValue(
    raw.questionFrontendId ?? raw.frontendQuestionId ?? raw.frontendId ?? raw.id
  );
  const title = stringValue(raw.title ?? raw.titleEn);
  const titleCn = nullableString(raw.titleCn ?? raw.translatedTitle ?? raw.titleZh);
  const titleSlug = stringValue(raw.titleSlug ?? raw.slug);
  const difficulty = normalizeDifficulty(raw.difficulty);

  if (!questionFrontendId) return invalid(raw, "missing questionFrontendId");
  if (!title) return invalid(raw, "missing title");
  if (!titleSlug) return invalid(raw, "missing titleSlug");
  if (!difficulty) return invalid(raw, "invalid difficulty");

  const urlEn = stringValue(raw.urlEn) || `https://leetcode.com/problems/${titleSlug}`;
  const urlCn = stringValue(raw.urlCn) || `https://leetcode.cn/problems/${titleSlug}`;

  return {
    ok: true,
    value: {
      questionFrontendId,
      title,
      titleCn,
      titleSlug,
      difficulty,
      tags: JSON.stringify(normalizeTags(raw.tags)),
      tagsCn: JSON.stringify(normalizeTags(raw.tagsCn ?? raw.tagsZh)),
      urlEn,
      urlCn,
      updatedAt,
    },
  };
}

function invalid(raw, reason) {
  const label = raw?.titleSlug ?? raw?.title ?? raw?.questionFrontendId ?? "unknown row";
  return { ok: false, reason: `${label}: ${reason}` };
}

function normalizeDifficulty(value) {
  const difficulty = stringValue(value).toLowerCase();
  if (difficulty === "1" || difficulty === "easy" || difficulty === "简单") return "easy";
  if (difficulty === "2" || difficulty === "medium" || difficulty === "中等") return "medium";
  if (difficulty === "3" || difficulty === "hard" || difficulty === "困难") return "hard";
  return "";
}

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value.map((tag) => stringValue(tag)).filter(Boolean);
  }

  return stringValue(value)
    .split(/[|;,，、]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function nullableString(value) {
  const text = stringValue(value);
  return text || null;
}

function stringValue(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function parseCsv(content) {
  const rows = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map(parseCsvLine);

  if (rows.length === 0) return [];

  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((row) => {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = row[index] ?? "";
    });
    return item;
  });
}

function parseCsvLine(line) {
  const cells = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(cell);
      cell = "";
    } else {
      cell += char;
    }
  }

  cells.push(cell);
  return cells;
}
