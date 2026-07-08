import path from "node:path";
import {
  ensureDir,
  intArg,
  npxCommand,
  parseArgs,
  projectRoot,
  readJson,
  relPath,
  runCommand,
  workloadFiles,
  writeJson,
} from "./common.mjs";

const args = parseArgs();
const strategy = String(args.strategy ?? "sequential");
const runId = String(args["run-id"] ?? `${strategy}-${Date.now()}`);
const shards = Math.max(1, intArg(args.shards, 1));
const shard = Math.max(1, intArg(args.shard, 1));
const workers = Math.max(1, intArg(args.workers, 1));
const baseURL = String(
  args["base-url"] ?? process.env.BASE_URL ?? "http://localhost:3000",
);
const testDir = String(args["test-dir"] ?? process.env.PW_TEST_DIR ?? "tests");
const workload = args.workload ? String(args.workload) : null;
const selectedFiles = await workloadFiles(args);

const runDir = path.resolve(projectRoot, "artifacts/runs", runId);
const rawDir = path.resolve(projectRoot, "artifacts/raw", runId);
await ensureDir(runDir);
await ensureDir(rawDir);

const rawReportPath = path.join(
  rawDir,
  `${strategy}-m${shards}-s${shard}.json`,
);
const metaPath = path.join(
  runDir,
  `${strategy}-m${shards}-s${shard}.meta.json`,
);
const cliArgs = ["playwright", "test", "--reporter=json"];
let plannedFiles = null;
let fullyParallel = false;

if (strategy === "native" || strategy === "native-fully") {
  cliArgs.push(...selectedFiles);
  cliArgs.push(`--shard=${shard}/${shards}`);
  fullyParallel = strategy === "native-fully";
} else if (strategy === "balanced") {
  const planPath = path.resolve(
    projectRoot,
    args.plan ?? `artifacts/plans/${runId}/plan-${shards}.json`,
  );
  const fallbackPlanPath = path.resolve(
    projectRoot,
    `artifacts/plans/latest-plan-${shards}.json`,
  );
  const plan =
    (await readJson(planPath, null)) ??
    (await readJson(fallbackPlanPath, null));
  if (!plan) {
    console.error(
      `No se encontró plan para ${shards} shards. Ejecuta scripts/plan-shards.mjs primero.`,
    );
    process.exit(1);
  }
  const assignment = plan.assignments.find(
    (item) => Number(item.shard) === shard,
  );
  plannedFiles = (assignment?.files ?? []).map((item) => item.file);
  if (plannedFiles.length === 0) {
    const skipped = {
      runId,
      strategy,
      workload,
      shards,
      shard,
      workers,
      baseURL,
      plannedFiles: [],
      selectedFiles,
      skipped: true,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 0,
      exitCode: 0,
      rawReport: relPath(rawReportPath),
    };
    await writeJson(metaPath, skipped);
    console.log(`Shard ${shard}/${shards} sin archivos asignados.`);
    process.exit(0);
  }
  cliArgs.push(...plannedFiles);
} else if (strategy !== "sequential" && strategy !== "local-workers") {
  console.error(`Estrategia no soportada: ${strategy}`);
  process.exit(1);
} else {
  cliArgs.push(...selectedFiles);
}

const env = {
  ...process.env,
  BASE_URL: baseURL,
  PW_WORKERS: String(workers),
  FULLY_PARALLEL: fullyParallel ? "1" : "0",
  PW_TEST_DIR: testDir,
  PLAYWRIGHT_JSON_OUTPUT_NAME: rawReportPath,
};

console.log(
  `Ejecutando ${strategy} run=${runId} shard=${shard}/${shards} workers=${workers}`,
);
if (plannedFiles) console.log(`Archivos asignados: ${plannedFiles.length}`);

const result = await runCommand(npxCommand(), cliArgs, {
  cwd: projectRoot,
  env,
});
const meta = {
  runId,
  strategy,
  workload,
  shards,
  shard,
  workers,
  baseURL,
  testDir,
  fullyParallel,
  plannedFiles,
  selectedFiles,
  skipped: false,
  ...result,
  rawReport: relPath(rawReportPath),
};

await writeJson(metaPath, meta);

if (result.exitCode !== 0) {
  console.error(`Ejecución fallida. Ver metadata en ${relPath(metaPath)}`);
  process.exit(result.exitCode);
}

console.log(
  `Ejecución completada en ${Math.round(result.durationMs / 1000)}s. Metadata: ${relPath(metaPath)}`,
);
