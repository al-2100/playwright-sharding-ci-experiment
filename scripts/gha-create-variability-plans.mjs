import path from "node:path";
import {
  intArg,
  nodeCommand,
  parseArgs,
  projectRoot,
  readJson,
  runCommand,
  writeJson,
} from "./common.mjs";

const args = parseArgs();
const calibrationRuns = Math.max(1, intArg(args["calibration-runs"], 5));
const testDir = String(args["test-dir"] ?? "tests");
const workloadsArg = String(args.workloads ?? "workloads/variability.json");
const workloadsPath = path.resolve(projectRoot, workloadsArg);
const shardCounts = String(args["shard-counts"] ?? "8,12")
  .split(",")
  .map((value) => Number.parseInt(value.trim(), 10))
  .filter((value) => Number.isFinite(value) && value > 0)
  .sort((a, b) => a - b);

const manifest = await readJson(workloadsPath, { workloads: [] });
const workloads = (manifest.workloads ?? [])
  .map((item) => ({
    id: String(item.id ?? "").trim(),
    label: item.label ?? item.id,
    files: item.files ?? [],
  }))
  .filter((item) => item.id);

if (workloads.length === 0) {
  throw new Error(`No se encontraron workloads en ${workloadsPath}`);
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

const workloadStats = [];
const history = "artifacts/variability/history/history.json";
const extract = await runCommand(
  nodeCommand(),
  [
    "scripts/extract-durations.mjs",
    "--input=downloaded-artifacts",
    `--output=${history}`,
    `--test-dir=${testDir}`,
  ],
  { cwd: projectRoot },
);
if (extract.exitCode !== 0) process.exit(extract.exitCode);

const historyData = await readJson(path.resolve(projectRoot, history), {
  items: {},
});

if (Object.keys(historyData.items ?? {}).length === 0) {
  throw new Error(
    "No se extrajeron duraciones de calibración; no se generarán planes LPT con fallback.",
  );
}

for (const workload of workloads) {
  const durations = workload.files
    .map((file) => Number(historyData.items?.[file]?.medianMs ?? 0))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (durations.length !== workload.files.length) {
    const missing = workload.files.filter(
      (file) => !Number(historyData.items?.[file]?.medianMs ?? 0),
    );
    throw new Error(
      `El workload "${workload.id}" no tiene duración histórica para todos sus archivos. Faltan: ${missing.join(", ")}`,
    );
  }
  const average = mean(durations);
  const stdDev = sampleStdDev(durations);
  workloadStats.push({
    workload: workload.id,
    label: workload.label,
    fileCount: workload.files.length,
    measuredFileCount: durations.length,
    totalMedianMs: Math.round(durations.reduce((sum, value) => sum + value, 0)),
    meanMedianMs: average === null ? null : Math.round(average),
    stdDevMedianMs: stdDev === null ? null : Math.round(stdDev),
    coefficientOfVariation:
      average && stdDev ? Number((stdDev / average).toFixed(4)) : null,
    minMedianMs: durations.length ? Math.min(...durations) : null,
    maxMedianMs: durations.length ? Math.max(...durations) : null,
    maxMinRatio:
      durations.length && Math.min(...durations) > 0
        ? Number((Math.max(...durations) / Math.min(...durations)).toFixed(4))
        : null,
  });

  for (const shards of shardCounts) {
    const runId = `eval-${workload.id}-balanced-m${shards}`;
    const output = `artifacts/variability/${workload.id}/plans/${runId}/plan-${shards}.json`;
    const plan = await runCommand(
      nodeCommand(),
      [
        "scripts/plan-shards.mjs",
        `--run-id=${runId}`,
        `--shards=${shards}`,
        `--test-dir=${testDir}`,
        `--history=${history}`,
        `--workload=${workload.id}`,
        `--workloads=${workloadsArg}`,
        `--output=${output}`,
      ],
      { cwd: projectRoot },
    );
    if (plan.exitCode !== 0) process.exit(plan.exitCode);
  }
}

await writeJson(
  path.resolve(projectRoot, "artifacts/variability/workload-stats.json"),
  {
    generatedAt: new Date().toISOString(),
    calibrationRuns,
    shardCounts,
    workloads: workloadStats,
  },
);
