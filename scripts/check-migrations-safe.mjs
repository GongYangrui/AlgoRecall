#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const migrationsDir = path.resolve(process.cwd(), "drizzle");
const allowDestructive = process.env.ALLOW_DESTRUCTIVE_MIGRATIONS === "true";
const destructivePatterns = [
  /\bTRUNCATE\s+TABLE\b/i,
  /\bDROP\s+TABLE\b/i,
  /\bDROP\s+COLUMN\b/i,
  /\bDELETE\s+FROM\b/i,
];

const files = (await readdir(migrationsDir))
  .filter((file) => file.endsWith(".sql"))
  .sort();

const findings = [];
for (const file of files) {
  const sql = await readFile(path.join(migrationsDir, file), "utf8");
  for (const pattern of destructivePatterns) {
    if (pattern.test(sql)) findings.push(`${file}: ${pattern.source}`);
  }
}

if (findings.length > 0 && !allowDestructive) {
  console.error("Unsafe migration statements found:");
  for (const finding of findings) console.error(`- ${finding}`);
  console.error("Set ALLOW_DESTRUCTIVE_MIGRATIONS=true only for a verified maintenance run with a fresh backup.");
  process.exit(1);
}

console.log("Migration safety check passed");
