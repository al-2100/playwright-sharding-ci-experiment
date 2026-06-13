import path from "node:path";
import {
  ensureDir,
  findJsonFiles,
  median,
  parseArgs,
  projectRoot,
  readJson,
  relPath,
  writeJson,
} from "./common.mjs";

const args = parseArgs();
const inputValues = String(args.input ?? "artifacts/raw")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const outputPath = path.resolve(
  projectRoot,
  args.output ?? "artifacts/history/history.json",
);
const testDir = String(args["test-dir"] ?? "tests")
  .replaceAll("\\", "/")
  .replace(/^\.?\//, "");

function collectSuiteDurations(suite, acc, fileHint = null) {
  const suiteFile = suite.file ? relPath(suite.file) : fileHint;

  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      const duration = (test.results ?? []).reduce(
        (sum, result) => sum + Number(result.duration ?? 0),
        0,
      );
      if (suiteFile && duration > 0) {
        acc.set(suiteFile, (acc.get(suiteFile) ?? 0) + duration);
      }
    }
  }

  for (const child of suite.suites ?? []) {
    collectSuiteDurations(child, acc, suiteFile);
  }
}

async function collectReportDurations(reportPath) {
  const report = await readJson(reportPath);
  const acc = new Map();
  for (const suite of report?.suites ?? []) {
    collectSuiteDurations(suite, acc);
  }
  return acc;
}

function normalizeSpecFile(file) {
  const normalized = relPath(file);
  if (normalized.startsWith(`${testDir}/`)) return normalized;
  if (normalized.endsWith(".spec.ts")) return `${testDir}/${normalized}`;
  return normalized;
}

const reportFiles = [];
for (const input of inputValues) {
  const absolute = path.resolve(projectRoot, input);
  reportFiles.push(...(await findJsonFiles(absolute)));
}

const samplesByFile = new Map();
for (const reportFile of reportFiles) {
  const durations = await collectReportDurations(reportFile);
  for (const [file, durationMs] of durations.entries()) {
    if (!samplesByFile.has(file)) samplesByFile.set(file, []);
    samplesByFile.get(file).push(durationMs);
  }
}

const items = {};
for (const [file, samples] of [...samplesByFile.entries()].sort(([a], [b]) =>
  a.localeCompare(b),
)) {
  items[normalizeSpecFile(file)] = {
    medianMs: Math.round(median(samples)),
    samplesMs: samples.map((value) => Math.round(value)),
  };
}

await ensureDir(path.dirname(outputPath));
await writeJson(outputPath, {
  generatedAt: new Date().toISOString(),
  testDir,
  sourceReports: reportFiles.map((file) => relPath(file)),
  items,
});

console.log(
  `Historial generado: ${relPath(outputPath)} (${Object.keys(items).length} archivos).`,
);
