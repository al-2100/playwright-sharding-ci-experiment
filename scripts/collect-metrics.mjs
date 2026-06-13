import fs from "node:fs/promises";
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
const runId = args["run-id"];
if (!runId) {
  console.error(
    "Uso: node scripts/collect-metrics.mjs --run-id=<id> [--baseline-ms=<ms>]",
  );
  process.exit(1);
}

const runDir = path.resolve(projectRoot, "artifacts/runs", runId);
const metaFiles = (await findJsonFiles(runDir)).filter((file) =>
  file.endsWith(".meta.json"),
);
const records = [];
for (const file of metaFiles) {
  const record = await readJson(file);
  if (record) records.push(record);
}

if (records.length === 0) {
  console.error(`No se encontraron metadatos para run-id=${runId}`);
  process.exit(1);
}

const durations = records.map((record) => Number(record.durationMs ?? 0));
const makespanMs = Math.max(...durations);
const testRunnerMs = durations.reduce((sum, value) => sum + value, 0);
const averageMs = testRunnerMs / records.length;
const lif = averageMs > 0 ? makespanMs / averageMs : 0;
const strategy = records[0].strategy;
const shards = Math.max(...records.map((record) => Number(record.shards ?? 1)));
const workers = Math.max(
  ...records.map((record) => Number(record.workers ?? 1)),
);
const effectiveParallelism = shards * workers;
let baselineMs =
  strategy === "sequential" ? 0 : Number(args["baseline-ms"] ?? 0);

const baselinePath = path.resolve(
  projectRoot,
  "artifacts/history/baseline.json",
);
if (strategy !== "sequential" && !baselineMs) {
  const baseline = await readJson(baselinePath, null);
  baselineMs = Number(baseline?.durationMs ?? 0);
}

const speedup = baselineMs > 0 ? baselineMs / makespanMs : null;
const effectiveEfficiency = speedup ? speedup / effectiveParallelism : null;
const runnerEfficiency = speedup ? speedup / shards : null;
const idleCapacityMs = shards * makespanMs - testRunnerMs;

const summary = {
  runId,
  strategy,
  shards,
  workers,
  shardCountObserved: records.length,
  measurementScope: "playwright_command_duration",
  makespanMs,
  testRunnerMs,
  testRunnerMinutes: Number((testRunnerMs / 60_000).toFixed(4)),
  averageShardMs: Math.round(averageMs),
  medianShardMs: Math.round(median(durations)),
  lif: Number(lif.toFixed(4)),
  baselineMs: baselineMs || null,
  speedup: speedup ? Number(speedup.toFixed(4)) : null,
  effectiveEfficiency: effectiveEfficiency
    ? Number(effectiveEfficiency.toFixed(4))
    : null,
  runnerEfficiency: runnerEfficiency
    ? Number(runnerEfficiency.toFixed(4))
    : null,
  idleCapacityMs,
  idleCapacityMinutes: Number((idleCapacityMs / 60_000).toFixed(4)),
  records: records.map((record) => ({
    shard: record.shard,
    durationMs: record.durationMs,
    exitCode: record.exitCode,
    files: record.plannedFiles?.length ?? null,
    rawReport: record.rawReport,
  })),
};

const metricsDir = path.resolve(projectRoot, "artifacts/metrics");
await ensureDir(metricsDir);
await writeJson(path.join(metricsDir, `${runId}.summary.json`), summary);

if (strategy === "sequential") {
  await writeJson(baselinePath, {
    runId,
    durationMs: makespanMs,
    capturedAt: new Date().toISOString(),
  });
}

const csvPath = path.join(metricsDir, "metrics.csv");
const header =
  "run_id,strategy,shards,workers,measurement_scope,makespan_ms,test_runner_ms,test_runner_minutes,lif,baseline_ms,speedup,effective_efficiency,runner_efficiency,idle_capacity_ms,idle_capacity_minutes\n";
const row =
  [
    runId,
    strategy,
    shards,
    workers,
    summary.measurementScope,
    makespanMs,
    testRunnerMs,
    summary.testRunnerMinutes,
    summary.lif,
    baselineMs || "",
    summary.speedup ?? "",
    summary.effectiveEfficiency ?? "",
    summary.runnerEfficiency ?? "",
    idleCapacityMs,
    summary.idleCapacityMinutes,
  ].join(",") + "\n";

try {
  await fs.access(csvPath);
} catch {
  await fs.writeFile(csvPath, header, "utf8");
}
await fs.appendFile(csvPath, row, "utf8");

console.log(
  `Métricas generadas: ${relPath(path.join(metricsDir, `${runId}.summary.json`))}`,
);
console.log(JSON.stringify(summary, null, 2));
