#!/usr/bin/env node
import { Client } from "pg";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/promote-admin.mjs <email>");
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const client = new Client({ connectionString: databaseUrl });

try {
  await client.connect();
  const result = await client.query(
    "UPDATE \"user\" SET role = $1, updated_at = $2 WHERE email = $3 RETURNING id, email, name",
    ["admin", new Date().toISOString(), email],
  );

  if (result.rows.length === 0) {
    console.error(`User with email "${email}" not found`);
    process.exit(1);
  }

  const user = result.rows[0];
  console.log(`Promoted to admin: ${user.name} (${user.email}) [id: ${user.id}]`);
} catch (error) {
  console.error("Failed to promote admin:", error.message);
  process.exit(1);
} finally {
  await client.end();
}
