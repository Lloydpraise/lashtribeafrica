#!/usr/bin/env node
// Converts a course data file (e.g. src/data/courses/classic-set-essentials.js) into the portable
// course JSON that the admin "Import" screen reads:
//
//   node scripts/course-to-json.mjs src/data/courses/classic-set-essentials.js > classic-set-essentials.json

import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const file = process.argv[2];
if (!file) { console.error("usage: node scripts/course-to-json.mjs <course-file.js>"); process.exit(1); }
const mod = await import(pathToFileURL(resolve(file)).href);
const c = Object.values(mod).find((v) => v && typeof v === "object" && Array.isArray(v.modules));
if (!c) { console.error("No exported course object with a `modules` array found."); process.exit(1); }
process.stdout.write(JSON.stringify({ format: "lashtribe-course@1", ...c }, null, 2) + "\n");
