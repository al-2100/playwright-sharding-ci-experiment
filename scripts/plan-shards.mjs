import path from "node:path";
import {
  intArg,
  listSpecFiles,
  median,
  parseArgs,
  projectRoot,
  readJson,
  writeJson,
} from "./common.mjs";

const args = parseArgs();
const runId = args["run-id"] ?? `plan-${Date.now()}`;
const shards = Math.max(1, intArg(args.shards, 4));
const testDir = String(args["test-dir"] ?? "tests");
const historyPath = path.resolve(
  projectRoot,
  args.history ?? "artifacts/history/history.json",
);
const outputPath = path.resolve(
  projectRoot,
  args.output ?? `artifacts/plans/${runId}/plan-${shards}.json`,
);

const history = await readJson(historyPath, { items: {} });
const specFiles = await listSpecFiles(path.resolve(projectRoot, testDir));
const knownDurations = Object.values(history.items ?? {})
  .map((item) => Number(item.medianMs))
  .filter(Boolean);
const fallbackMs = Math.round(median(knownDurations)) || 30_000;

const items = specFiles.map((file) => ({
  file,
  estimatedMs: Math.round(
    Number(history.items?.[file]?.medianMs ?? fallbackMs),
  ),
}));

items.sort(
  (a, b) => b.estimatedMs - a.estimatedMs || a.file.localeCompare(b.file),
);

const assignments = Array.from({ length: shards }, (_, index) => ({
  shard: index + 1,
  estimatedMs: 0,
  files: [],
}));

for (const item of items) {
  assignments.sort(
    (a, b) => a.estimatedMs - b.estimatedMs || a.shard - b.shard,
  );
  assignments[0].files.push(item);
  assignments[0].estimatedMs += item.estimatedMs;
}

assignments.sort((a, b) => a.shard - b.shard);

const plan = {
  runId,
  strategy: "balanced",
  shards,
  createdAt: new Date().toISOString(),
  testDir,
  history: path.relative(projectRoot, historyPath).replaceAll(path.sep, "/"),
  fallbackMs,
  totalEstimatedMs: assignments.reduce(
    (sum, shard) => sum + shard.estimatedMs,
    0,
  ),
  assignments,
};

await writeJson(outputPath, plan);
await writeJson(
  path.resolve(projectRoot, `artifacts/plans/latest-plan-${shards}.json`),
  plan,
);

console.log(
  `Plan LPT generado: ${path.relative(projectRoot, outputPath).replaceAll(path.sep, "/")}`,
);
for (const shard of assignments) {
  console.log(
    `Shard ${shard.shard}: ${Math.round(shard.estimatedMs / 1000)}s, ${shard.files.length} archivos`,
  );
}
