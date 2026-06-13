import {
  intArg,
  nodeCommand,
  parseArgs,
  projectRoot,
  runCommand,
} from "./common.mjs";

const args = parseArgs();
const shards = Math.max(1, intArg(args.shards, 4));
const workers = Math.max(1, intArg(args.workers, 1));
const calibrationRuns = Math.max(1, intArg(args["calibration-runs"], 1));
const includeFully = String(args["include-fully"] ?? "0") === "1";
const prefix = String(args.prefix ?? `local-${Date.now()}`);
const testDir = String(args["test-dir"] ?? "tests");
const baselineRunId = `${prefix}-seq`;
const nativeRunId = `${prefix}-native-${shards}`;
const balancedRunId = `${prefix}-balanced-${shards}`;
const fullyRunId = `${prefix}-native-fully-${shards}`;

async function step(name, commandArgs) {
  console.log(`\n=== ${name} ===`);
  const result = await runCommand(nodeCommand(), commandArgs, {
    cwd: projectRoot,
  });
  if (result.exitCode !== 0) {
    console.error(`Falló el paso: ${name}`);
    process.exit(result.exitCode);
  }
}

await step("Esperar app", ["scripts/wait-for-app.mjs"]);

await step("Calibrar historial", [
  "scripts/calibrate.mjs",
  `--runs=${calibrationRuns}`,
  `--workers=${workers}`,
  `--batch-id=${prefix}-calibration`,
  `--test-dir=${testDir}`,
]);

await step("Baseline secuencial", [
  "scripts/run-strategy.mjs",
  "--strategy=sequential",
  `--run-id=${baselineRunId}`,
  "--workers=1",
  `--test-dir=${testDir}`,
]);

await step("Métricas baseline", [
  "scripts/collect-metrics.mjs",
  `--run-id=${baselineRunId}`,
]);

await step("Plan LPT", [
  "scripts/plan-shards.mjs",
  `--run-id=${balancedRunId}`,
  `--shards=${shards}`,
  `--test-dir=${testDir}`,
]);

await step("Sharding nativo paralelo", [
  "scripts/run-parallel.mjs",
  "--strategy=native",
  `--run-id=${nativeRunId}`,
  `--shards=${shards}`,
  `--workers=${workers}`,
  `--test-dir=${testDir}`,
]);

await step("Métricas nativo", [
  "scripts/collect-metrics.mjs",
  `--run-id=${nativeRunId}`,
]);

if (includeFully) {
  await step("Sharding nativo fullyParallel", [
    "scripts/run-parallel.mjs",
    "--strategy=native-fully",
    `--run-id=${fullyRunId}`,
    `--shards=${shards}`,
    `--workers=${workers}`,
    `--test-dir=${testDir}`,
  ]);

  await step("Métricas fullyParallel", [
    "scripts/collect-metrics.mjs",
    `--run-id=${fullyRunId}`,
  ]);
}

await step("Sharding balanceado paralelo", [
  "scripts/run-parallel.mjs",
  "--strategy=balanced",
  `--run-id=${balancedRunId}`,
  `--shards=${shards}`,
  `--workers=${workers}`,
  `--test-dir=${testDir}`,
]);

await step("Métricas balanceado", [
  "scripts/collect-metrics.mjs",
  `--run-id=${balancedRunId}`,
]);

console.log("\nExperimento completado.");
