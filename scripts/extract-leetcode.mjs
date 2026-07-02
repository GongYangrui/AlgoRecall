import fs from "node:fs";
import path from "node:path";

const inputPath = path.resolve(process.cwd(), "data", "leetcode.html");
const outputPath = path.resolve(process.cwd(), "data", "leetcode_problem_list.json");

const html = fs.readFileSync(inputPath, "utf8");
const bodyStart = html.indexOf("<body>");
if (bodyStart === -1) {
  console.error("Error: no <body> tag found in the input file.");
  process.exit(1);
}

const afterBody = html.slice(bodyStart + "<body>".length);

let depth = 0;
let jsonEnd = -1;
for (let i = 0; i < afterBody.length; i++) {
  const ch = afterBody[i];
  if (ch === "{") {
    depth++;
  } else if (ch === "}") {
    depth--;
    if (depth === 0) {
      jsonEnd = i + 1;
      break;
    }
  }
}

if (jsonEnd === -1) {
  console.error("Error: unmatched braces in <body> content.");
  process.exit(1);
}

const jsonStr = afterBody.slice(0, jsonEnd);

try {
  const data = JSON.parse(jsonStr);
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), "utf8");
  console.log(`Extracted JSON written to ${outputPath}`);
} catch (err) {
  console.error("Error: failed to parse JSON from <body> content:", err.message);
  process.exit(1);
}
