#!/usr/bin/env node
/**
 * SQLite → PostgreSQL migration script for AlgoRecall.
 *
 * Requirements:
 *   DATABASE_URL (Postgres) and SQLITE_PATH env vars must be set.
 *   A seed admin user is created if one doesn't exist in Postgres.
 *
 * Usage:
 *   SQLITE_PATH=./data/algorecall.db DATABASE_URL=postgresql://... node scripts/migrate-sqlite-to-pg.mjs
 */
import Database from "better-sqlite3";
import pg from "pg";
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";

const { Pool } = pg;

const sqlitePath = process.env.SQLITE_PATH;
const pgUrl = process.env.DATABASE_URL;

if (!sqlitePath || !pgUrl) {
  console.error("Set SQLITE_PATH and DATABASE_URL environment variables.");
  process.exit(1);
}

function parseTagsCn(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.join(", ");
  } catch {}
  return raw;
}

async function main() {
  const sqlite = new Database(sqlitePath);
  const pool = new Pool({ connectionString: pgUrl });

  console.log("Connected to SQLite and PostgreSQL.");

  const problems = sqlite.prepare("SELECT * FROM problems").all();
  const reviews = sqlite.prepare("SELECT * FROM reviews").all();
  const leetcodeQs = sqlite.prepare("SELECT * FROM leetcode_questions").all();

  console.log(`SQLite: ${problems.length} problems, ${reviews.length} reviews, ${leetcodeQs.length} leetcode_questions`);

  // Check if seed admin exists
  const existingUser = await pool.query("SELECT id FROM \"user\" LIMIT 1");
  let adminId;

  if (existingUser.rows.length === 0) {
    adminId = uuidv4();
    const now = new Date().toISOString();
    await pool.query(
      `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [adminId, "管理员", "admin@algorecall.local", true, now, now],
    );
    console.log(`Created seed admin user: ${adminId}`);
  } else {
    adminId = existingUser.rows[0].id;
    console.log(`Using existing admin user: ${adminId}`);
  }

  // Migrate problems
  let problemCount = 0;
  for (const p of problems) {
    try {
      await pool.query(
        `INSERT INTO problems (id, user_id, title, title_cn, frontend_id, tags_cn, url, url_en, url_cn, platform, difficulty, tags, status, stage, last_result, wrong_count, next_review_at, last_reviewed_at, review_count, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
         ON CONFLICT (id) DO NOTHING`,
        [
          p.id, adminId, p.title, p.title_cn || null, p.frontend_id || null,
          parseTagsCn(p.tags_cn), p.url, p.url_en || null, p.url_cn || null,
          p.platform || "leetcode", p.difficulty || "medium", p.tags || null,
          p.status || "new", p.stage || 0, p.last_result || null,
          p.wrong_count || 0, p.next_review_at || null, p.last_reviewed_at || null,
          p.review_count || 0, p.created_at, p.updated_at,
        ],
      );
      problemCount++;
    } catch (err) {
      console.error(`Failed to migrate problem ${p.id}:`, err.message);
    }
  }
  console.log(`Migrated ${problemCount} problems.`);

  // Migrate reviews
  let reviewCount = 0;
  for (const r of reviews) {
    try {
      await pool.query(
        `INSERT INTO reviews (id, user_id, problem_id, reviewed_at, result, previous_stage, next_stage, next_review_at, note)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO NOTHING`,
        [
          r.id, adminId, r.problem_id, r.reviewed_at, r.result,
          r.previous_stage, r.next_stage, r.next_review_at || null, r.note || null,
        ],
      );
      reviewCount++;
    } catch (err) {
      console.error(`Failed to migrate review ${r.id}:`, err.message);
    }
  }
  console.log(`Migrated ${reviewCount} reviews.`);

  // Migrate leetcode questions
  let lcCount = 0;
  for (const q of leetcodeQs) {
    try {
      await pool.query(
        `INSERT INTO leetcode_questions (title_slug, question_frontend_id, title, title_cn, difficulty, tags, tags_cn, url_en, url_cn, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (title_slug) DO NOTHING`,
        [
          q.title_slug, q.question_frontend_id, q.title, q.title_cn || null,
          q.difficulty, q.tags || null, q.tags_cn || null,
          q.url_en, q.url_cn, q.updated_at,
        ],
      );
      lcCount++;
    } catch (err) {
      console.error(`Failed to migrate leetcode question ${q.title_slug}:`, err.message);
    }
  }
  console.log(`Migrated ${lcCount} leetcode_questions.`);

  // Verify
  const pgProblems = await pool.query("SELECT COUNT(*) FROM problems");
  const pgReviews = await pool.query("SELECT COUNT(*) FROM reviews");
  const pgLc = await pool.query("SELECT COUNT(*) FROM leetcode_questions");

  console.log(`\nVerification:`);
  console.log(`  problems: SQLite ${problems.length} → PG ${pgProblems.rows[0].count}`);
  console.log(`  reviews: SQLite ${reviews.length} → PG ${pgReviews.rows[0].count}`);
  console.log(`  leetcode_questions: SQLite ${leetcodeQs.length} → PG ${pgLc.rows[0].count}`);

  if (pgProblems.rows[0].count == problems.length &&
      pgReviews.rows[0].count == reviews.length &&
      pgLc.rows[0].count == leetcodeQs.length) {
    console.log("\n✓ Migration verified successfully.");
  } else {
    console.log("\n✗ Migration counts don't match. Check errors above.");
  }

  sqlite.close();
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
