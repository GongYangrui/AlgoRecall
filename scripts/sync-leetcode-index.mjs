#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const { Pool } = pg;

export const DEFAULT_SOURCE_PATH = path.join("data", "leetcode_details.json");
export const MIN_EXPECTED_QUESTIONS = 3_000;
const BATCH_SIZE = 250;
const DIFFICULTIES = new Set(["easy", "medium", "hard"]);
const SYNC_COLUMNS = [
  "title_slug",
  "question_frontend_id",
  "title",
  "title_cn",
  "difficulty",
  "tags",
  "tags_cn",
  "url_en",
  "url_cn",
];

function requiredString(value, field, index) {
  const text = value === undefined || value === null ? "" : String(value).trim();
  if (!text) throw new Error(`Question at index ${index} is missing ${field}`);
  return text;
}

function nullableString(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizeTags(value, field, index) {
  if (value === undefined || value === null || value === "") return [];
  if (Array.isArray(value)) {
    return value.map((tag, tagIndex) => requiredString(tag, `${field}[${tagIndex}]`, index));
  }
  if (typeof value !== "string") throw new Error(`Question at index ${index} has invalid ${field}`);

  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((tag, tagIndex) => requiredString(tag, `${field}[${tagIndex}]`, index));
    }
  } catch {
    // Accept the legacy comma-separated representation.
  }
  return trimmed.split(",").map((tag) => tag.trim()).filter(Boolean);
}

export function validateAndNormalizeQuestions(rawQuestions, options = {}) {
  const minimumQuestions = options.minimumQuestions ?? MIN_EXPECTED_QUESTIONS;
  if (!Array.isArray(rawQuestions)) throw new Error("LeetCode source must be a JSON array");
  if (rawQuestions.length < minimumQuestions) {
    throw new Error(`LeetCode source contains ${rawQuestions.length} questions; expected at least ${minimumQuestions}`);
  }

  const slugs = new Set();
  const frontendIds = new Set();
  return rawQuestions.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error(`Question at index ${index} must be an object`);
    }

    const titleSlug = requiredString(raw.titleSlug, "titleSlug", index);
    const questionFrontendId = requiredString(raw.questionFrontendId, "questionFrontendId", index);
    const difficulty = requiredString(raw.difficulty, "difficulty", index).toLowerCase();
    if (!DIFFICULTIES.has(difficulty)) {
      throw new Error(`Question ${titleSlug} has invalid difficulty: ${difficulty}`);
    }
    if (slugs.has(titleSlug)) throw new Error(`Duplicate titleSlug: ${titleSlug}`);
    if (frontendIds.has(questionFrontendId)) throw new Error(`Duplicate questionFrontendId: ${questionFrontendId}`);
    slugs.add(titleSlug);
    frontendIds.add(questionFrontendId);

    return {
      titleSlug,
      questionFrontendId,
      title: requiredString(raw.title, "title", index),
      titleCn: nullableString(raw.titleCn),
      difficulty,
      tags: JSON.stringify(normalizeTags(raw.tags, "tags", index)),
      tagsCn: JSON.stringify(normalizeTags(raw.tagsCn, "tagsCn", index)),
      urlEn: requiredString(raw.urlEn, "urlEn", index),
      urlCn: requiredString(raw.urlCn, "urlCn", index),
    };
  });
}

export async function loadAndValidateQuestions(sourcePath = DEFAULT_SOURCE_PATH, options = {}) {
  const resolvedPath = path.resolve(process.cwd(), sourcePath);
  const source = await readFile(resolvedPath, "utf8");
  return validateAndNormalizeQuestions(JSON.parse(source), options);
}

function buildBatchInsert(questions) {
  const values = [];
  const rows = questions.map((question, rowIndex) => {
    const row = [
      question.titleSlug,
      question.questionFrontendId,
      question.title,
      question.titleCn,
      question.difficulty,
      question.tags,
      question.tagsCn,
      question.urlEn,
      question.urlCn,
    ];
    values.push(...row);
    const offset = rowIndex * SYNC_COLUMNS.length;
    return `(${row.map((_, columnIndex) => `$${offset + columnIndex + 1}`).join(", ")})`;
  });
  return {
    text: `INSERT INTO leetcode_questions_sync (${SYNC_COLUMNS.join(", ")}) VALUES ${rows.join(", ")}`,
    values,
  };
}

const MERGE_SQL = `
WITH existing AS MATERIALIZED (
  SELECT
    source.title_slug,
    target.title_slug IS NULL AS is_new,
    ROW(
      target.question_frontend_id,
      target.title,
      target.title_cn,
      target.difficulty,
      target.tags,
      target.tags_cn,
      target.url_en,
      target.url_cn
    ) IS DISTINCT FROM ROW(
      source.question_frontend_id,
      source.title,
      source.title_cn,
      source.difficulty,
      source.tags,
      source.tags_cn,
      source.url_en,
      source.url_cn
    ) AS is_changed
  FROM leetcode_questions_sync source
  LEFT JOIN leetcode_questions target ON target.title_slug = source.title_slug
), upserted AS (
  INSERT INTO leetcode_questions AS target (
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
  SELECT
    title_slug,
    question_frontend_id,
    title,
    title_cn,
    difficulty,
    tags,
    tags_cn,
    url_en,
    url_cn,
    now()
  FROM leetcode_questions_sync
  ON CONFLICT (title_slug) DO UPDATE SET
    question_frontend_id = EXCLUDED.question_frontend_id,
    title = EXCLUDED.title,
    title_cn = EXCLUDED.title_cn,
    difficulty = EXCLUDED.difficulty,
    tags = EXCLUDED.tags,
    tags_cn = EXCLUDED.tags_cn,
    url_en = EXCLUDED.url_en,
    url_cn = EXCLUDED.url_cn,
    updated_at = now()
  WHERE ROW(
    target.question_frontend_id,
    target.title,
    target.title_cn,
    target.difficulty,
    target.tags,
    target.tags_cn,
    target.url_en,
    target.url_cn
  ) IS DISTINCT FROM ROW(
    EXCLUDED.question_frontend_id,
    EXCLUDED.title,
    EXCLUDED.title_cn,
    EXCLUDED.difficulty,
    EXCLUDED.tags,
    EXCLUDED.tags_cn,
    EXCLUDED.url_en,
    EXCLUDED.url_cn
  )
  RETURNING title_slug
)
SELECT
  count(*) FILTER (WHERE is_new)::int AS inserted,
  count(*) FILTER (WHERE NOT is_new AND is_changed)::int AS updated,
  count(*) FILTER (WHERE NOT is_new AND NOT is_changed)::int AS unchanged,
  (SELECT count(*)::int FROM upserted) AS affected
FROM existing
`;

export async function syncLeetcodeQuestions(client, rawQuestions, options = {}) {
  const questions = validateAndNormalizeQuestions(rawQuestions, options);
  let transactionStarted = false;
  try {
    await client.query("BEGIN");
    transactionStarted = true;
    await client.query("LOCK TABLE leetcode_questions IN SHARE ROW EXCLUSIVE MODE");
    await client.query(`
      CREATE TEMP TABLE leetcode_questions_sync (
        title_slug text PRIMARY KEY,
        question_frontend_id text NOT NULL UNIQUE,
        title text NOT NULL,
        title_cn text,
        difficulty text NOT NULL,
        tags text,
        tags_cn text,
        url_en text NOT NULL,
        url_cn text NOT NULL
      ) ON COMMIT DROP
    `);

    for (let start = 0; start < questions.length; start += BATCH_SIZE) {
      const batch = buildBatchInsert(questions.slice(start, start + BATCH_SIZE));
      await client.query(batch.text, batch.values);
    }

    const stagedResult = await client.query("SELECT count(*)::int AS count FROM leetcode_questions_sync");
    const staged = Number(stagedResult.rows[0]?.count ?? 0);
    if (staged !== questions.length) {
      throw new Error(`Staged ${staged} questions, expected ${questions.length}`);
    }

    const mergeResult = await client.query(MERGE_SQL);
    const inserted = Number(mergeResult.rows[0]?.inserted ?? 0);
    const updated = Number(mergeResult.rows[0]?.updated ?? 0);
    const unchanged = Number(mergeResult.rows[0]?.unchanged ?? 0);
    const affected = Number(mergeResult.rows[0]?.affected ?? 0);
    if (inserted + updated + unchanged !== questions.length || affected !== inserted + updated) {
      throw new Error("LeetCode index merge counts are inconsistent");
    }

    const deleteResult = await client.query(`
      DELETE FROM leetcode_questions target
      WHERE NOT EXISTS (
        SELECT 1 FROM leetcode_questions_sync source WHERE source.title_slug = target.title_slug
      )
    `);
    const deleted = Number(deleteResult.rowCount ?? 0);

    const finalResult = await client.query("SELECT count(*)::int AS count FROM leetcode_questions");
    const finalTotal = Number(finalResult.rows[0]?.count ?? 0);
    if (finalTotal !== questions.length) {
      throw new Error(`LeetCode index contains ${finalTotal} questions after sync; expected ${questions.length}`);
    }

    await client.query("COMMIT");
    transactionStarted = false;
    return { sourceTotal: questions.length, inserted, updated, deleted, unchanged, finalTotal };
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        throw new AggregateError([error, rollbackError], "LeetCode index sync and rollback both failed");
      }
    }
    throw error;
  }
}

function readPositiveIntEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const allowedArgs = new Set(["--check-source"]);
  const unknownArgs = [...args].filter((arg) => !allowedArgs.has(arg));
  if (unknownArgs.length > 0) throw new Error(`Unknown argument: ${unknownArgs.join(", ")}`);

  const sourcePath = process.env.LEETCODE_DETAILS_PATH || DEFAULT_SOURCE_PATH;
  const questions = await loadAndValidateQuestions(sourcePath);
  if (args.has("--check-source")) {
    console.log(`[leetcode-index] source valid: ${questions.length} questions`);
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL environment variable is required");
  const pool = new Pool({
    connectionString: databaseUrl,
    max: readPositiveIntEnv("PG_POOL_MAX", 10),
    connectionTimeoutMillis: readPositiveIntEnv("PG_CONNECTION_TIMEOUT_MS", 5_000),
    idleTimeoutMillis: readPositiveIntEnv("PG_IDLE_TIMEOUT_MS", 30_000),
    statement_timeout: readPositiveIntEnv("PG_STATEMENT_TIMEOUT_MS", 15_000),
    query_timeout: readPositiveIntEnv("PG_QUERY_TIMEOUT_MS", 20_000),
  });
  let client;
  try {
    client = await pool.connect();
    const result = await syncLeetcodeQuestions(client, questions);
    console.log(
      `[leetcode-index] source=${result.sourceTotal} inserted=${result.inserted} updated=${result.updated} deleted=${result.deleted} unchanged=${result.unchanged} final=${result.finalTotal}`,
    );
  } finally {
    client?.release();
    await pool.end();
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(`[leetcode-index] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
