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
const inputRoot = path.resolve(projectRoot, args.input ?? "artifacts");
const outputDir = path.resolve(projectRoot, args.output ?? "artifacts/metrics");
const measurementScope = "playwright_command_duration";
const measurementNote =
  "Durations are measured around the Playwright command inside each job. They do not include GitHub Actions queue time, dependency installation, browser installation, service startup, artifact upload, or billable workflow duration.";

function repetitionOf(runId) {
  const match = String(runId).match(/-r(\d+)$/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function baselineKey(workload, repetition) {
  return `${workload ?? "default"}|${repetition ?? ""}`;
}

function round(value, digits = 4) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
}

function mean(values) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleStdDev(values) {
  if (values.length < 2) return null;
  const average = mean(values);
  const variance =
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) /
    (values.length - 1);
  return Math.sqrt(variance);
}

function tCritical95(sampleSize) {
  const byDf = {
    1: 12.706,
    2: 4.303,
    3: 3.182,
    4: 2.776,
    5: 2.571,
    6: 2.447,
    7: 2.365,
    8: 2.306,
    9: 2.262,
    10: 2.228,
    11: 2.201,
    12: 2.179,
    13: 2.16,
    14: 2.145,
    15: 2.131,
    16: 2.12,
    17: 2.11,
    18: 2.101,
    19: 2.093,
    20: 2.086,
    21: 2.08,
    22: 2.074,
    23: 2.069,
    24: 2.064,
    25: 2.06,
    26: 2.056,
    27: 2.052,
    28: 2.048,
    29: 2.045,
    30: 2.042,
  };
  if (sampleSize < 2) return null;
  return byDf[Math.min(sampleSize - 1, 30)] ?? 1.96;
}

function numeric(values) {
  return values
    .filter((value) => value !== null && value !== undefined && value !== "")
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
}

function metricStats(values) {
  const clean = numeric(values);
  const average = mean(clean);
  const stdDev = sampleStdDev(clean);
  const critical = tCritical95(clean.length);
  const ci95 =
    stdDev !== null && critical !== null
      ? critical * (stdDev / Math.sqrt(clean.length))
      : null;

  return {
    mean: round(average, 2),
    median: clean.length ? round(median(clean), 2) : null,
    stdDev: round(stdDev, 2),
    ci95: round(ci95, 2),
    min: clean.length ? Math.min(...clean) : null,
    max: clean.length ? Math.max(...clean) : null,
  };
}

function summarize(runId, records, baselineByRepetition) {
  const durations = records.map((record) => Number(record.durationMs ?? 0));
  const makespanMs = Math.max(...durations);
  const testRunnerMs = durations.reduce((sum, value) => sum + value, 0);
  const averageShardMs = testRunnerMs / records.length;
  const strategy = records[0]?.strategy ?? "unknown";
  const workload = records[0]?.workload ?? "default";
  const shards = Math.max(
    ...records.map((record) => Number(record.shards ?? 1)),
  );
  const workers = Math.max(
    ...records.map((record) => Number(record.workers ?? 1)),
  );
  const repetition = repetitionOf(runId);
  const baselineMs =
    strategy === "sequential"
      ? null
      : baselineByRepetition.get(baselineKey(workload, repetition));
  const speedup = baselineMs ? baselineMs / makespanMs : null;
  const effectiveParallelism = shards * workers;
  const effectiveEfficiency = speedup ? speedup / effectiveParallelism : null;
  const idleCapacityMs =
    records.length > 1 ? shards * makespanMs - testRunnerMs : 0;

  return {
    runId,
    repetition,
    strategy,
    workload,
    shards,
    workers,
    shardCountObserved: records.length,
    measurementScope,
    makespanMs,
    testRunnerMs,
    testRunnerMinutes: round(testRunnerMs / 60_000, 4),
    averageShardMs: Math.round(averageShardMs),
    medianShardMs: Math.round(median(durations)),
    lif:
      records.length > 1 && averageShardMs > 0
        ? round(makespanMs / averageShardMs)
        : null,
    baselineMs,
    speedup: speedup ? round(speedup) : null,
    effectiveEfficiency: effectiveEfficiency
      ? round(effectiveEfficiency)
      : null,
    idleCapacityMs,
    idleCapacityMinutes:
      records.length > 1 ? round(idleCapacityMs / 60_000, 4) : 0,
    records: records
      .sort((a, b) => Number(a.shard ?? 1) - Number(b.shard ?? 1))
      .map((record) => ({
        shard: record.shard,
        durationMs: record.durationMs,
        exitCode: record.exitCode,
        files: record.plannedFiles?.length ?? null,
        rawReport: record.rawReport,
      })),
  };
}

function aggregateSummaries(summaries) {
  const byGroup = new Map();
  for (const summary of summaries) {
    const key = `${summary.workload}|${summary.strategy}|${summary.shards}|${summary.workers}`;
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key).push(summary);
  }

  return [...byGroup.values()]
    .map((group) => {
      const first = group[0];
      return {
        strategy: first.strategy,
        workload: first.workload,
        shards: first.shards,
        workers: first.workers,
        repetitions: group.length,
        minShardCountObserved: Math.min(
          ...group.map((summary) => summary.shardCountObserved),
        ),
        maxShardCountObserved: Math.max(
          ...group.map((summary) => summary.shardCountObserved),
        ),
        makespanMs: metricStats(group.map((summary) => summary.makespanMs)),
        testRunnerMs: metricStats(group.map((summary) => summary.testRunnerMs)),
        lif: metricStats(group.map((summary) => summary.lif)),
        speedup: metricStats(group.map((summary) => summary.speedup)),
        effectiveEfficiency: metricStats(
          group.map((summary) => summary.effectiveEfficiency),
        ),
        idleCapacityMs: metricStats(
          group.map((summary) => summary.idleCapacityMs),
        ),
      };
    })
    .sort((a, b) => {
      const workload = a.workload.localeCompare(b.workload);
      if (workload) return workload;
      const strategy = a.strategy.localeCompare(b.strategy);
      if (strategy) return strategy;
      return a.shards - b.shards || a.workers - b.workers;
    });
}

function flattenStats(stats) {
  return [
    stats?.mean ?? "",
    stats?.median ?? "",
    stats?.stdDev ?? "",
    stats?.ci95 ?? "",
    stats?.min ?? "",
    stats?.max ?? "",
  ];
}

const files = await findJsonFiles(inputRoot);
const recordsByRunId = new Map();

for (const file of files.filter((item) => item.endsWith(".meta.json"))) {
  const record = await readJson(file, null);
  if (!record?.runId) continue;
  if (!recordsByRunId.has(record.runId)) recordsByRunId.set(record.runId, []);
  recordsByRunId.get(record.runId).push(record);
}

const baselineByRepetition = new Map();
for (const [runId, records] of recordsByRunId.entries()) {
  if (!runId.startsWith("eval-")) continue;
  if (records[0]?.strategy !== "sequential") continue;
  const repetition = repetitionOf(runId);
  if (!repetition) continue;
  baselineByRepetition.set(
    baselineKey(records[0]?.workload ?? "default", repetition),
    Math.max(...records.map((record) => Number(record.durationMs ?? 0))),
  );
}

const summaries = [...recordsByRunId.entries()]
  .map(([runId, records]) => summarize(runId, records, baselineByRepetition))
  .sort((a, b) => {
    const workload = a.workload.localeCompare(b.workload);
    if (workload) return workload;
    const rep = (a.repetition ?? 0) - (b.repetition ?? 0);
    if (rep) return rep;
    const strategy = a.strategy.localeCompare(b.strategy);
    if (strategy) return strategy;
    return a.shards - b.shards;
  });

const evaluationSummaries = summaries.filter((summary) =>
  summary.runId.startsWith("eval-"),
);
const aggregates = aggregateSummaries(evaluationSummaries);

await ensureDir(outputDir);
await writeJson(path.join(outputDir, "gha-summary.json"), {
  generatedAt: new Date().toISOString(),
  source: relPath(inputRoot),
  measurementScope,
  measurementNote,
  summaries,
});
await writeJson(path.join(outputDir, "gha-aggregate.json"), {
  generatedAt: new Date().toISOString(),
  source: relPath(inputRoot),
  measurementScope,
  measurementNote:
    "Aggregates are computed from per-run Playwright command durations.",
  aggregateScope: "evaluation_runs_only",
  aggregates,
});

const header = [
  "run_id",
  "workload",
  "repetition",
  "strategy",
  "shards",
  "workers",
  "measurement_scope",
  "makespan_ms",
  "test_runner_ms",
  "test_runner_minutes",
  "lif",
  "baseline_ms",
  "speedup",
  "effective_efficiency",
  "idle_capacity_ms",
  "idle_capacity_minutes",
].join(",");

const rows = summaries.map((summary) =>
  [
    summary.runId,
    summary.workload,
    summary.repetition ?? "",
    summary.strategy,
    summary.shards,
    summary.workers,
    summary.measurementScope,
    summary.makespanMs,
    summary.testRunnerMs,
    summary.testRunnerMinutes,
    summary.lif ?? "",
    summary.baselineMs ?? "",
    summary.speedup ?? "",
    summary.effectiveEfficiency ?? "",
    summary.idleCapacityMs,
    summary.idleCapacityMinutes,
  ].join(","),
);

await fs.writeFile(
  path.join(outputDir, "gha-summary.csv"),
  `${header}\n${rows.join("\n")}\n`,
  "utf8",
);

const aggregateHeader = [
  "workload",
  "strategy",
  "shards",
  "workers",
  "repetitions",
  "min_shards_observed",
  "max_shards_observed",
  ...[
    "makespan_ms",
    "test_runner_ms",
    "lif",
    "speedup",
    "effective_efficiency",
    "idle_capacity_ms",
  ].flatMap((metric) => [
    `${metric}_mean`,
    `${metric}_median`,
    `${metric}_stddev`,
    `${metric}_ci95`,
    `${metric}_min`,
    `${metric}_max`,
  ]),
].join(",");

const aggregateRows = aggregates.map((aggregate) =>
  [
    aggregate.workload,
    aggregate.strategy,
    aggregate.shards,
    aggregate.workers,
    aggregate.repetitions,
    aggregate.minShardCountObserved,
    aggregate.maxShardCountObserved,
    ...flattenStats(aggregate.makespanMs),
    ...flattenStats(aggregate.testRunnerMs),
    ...flattenStats(aggregate.lif),
    ...flattenStats(aggregate.speedup),
    ...flattenStats(aggregate.effectiveEfficiency),
    ...flattenStats(aggregate.idleCapacityMs),
  ].join(","),
);

await fs.writeFile(
  path.join(outputDir, "gha-aggregate.csv"),
  `${aggregateHeader}\n${aggregateRows.join("\n")}\n`,
  "utf8",
);

console.log(
  `Resumen generado: ${relPath(path.join(outputDir, "gha-summary.csv"))}`,
);
console.log(
  `Agregado generado: ${relPath(path.join(outputDir, "gha-aggregate.csv"))}`,
);
