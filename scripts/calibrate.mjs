import path from "node:path";
import {
  intArg,
  nodeCommand,
  parseArgs,
  projectRoot,
  runCommand,
} from "./common.mjs";

const args = parseArgs();
const runs = intArg(args.runs, 3);
const workers = intArg(args.workers, 1);
const batchId = args["batch-id"] ?? `calibration-${Date.now()}`;
const testDir = String(args["test-dir"] ?? "tests");
const generatedRawDirs = [];

for (let index = 1; index <= runs; index += 1) {
  const runId = `${batchId}-${index}`;
  console.log(`Calibración ${index}/${runs}: ${runId}`);
  const result = await runCommand(
    nodeCommand(),
    [
      "scripts/run-strategy.mjs",
      "--strategy=sequential",
      `--run-id=${runId}`,
      `--workers=${workers}`,
      `--test-dir=${testDir}`,
    ],
    { cwd: projectRoot },
  );
  if (result.exitCode !== 0) process.exit(result.exitCode);
  generatedRawDirs.push(path.join("artifacts/raw", runId));
}

const extract = await runCommand(
  nodeCommand(),
  [
    "scripts/extract-durations.mjs",
    `--input=${generatedRawDirs.join(",")}`,
    "--output=artifacts/history/history.json",
    `--test-dir=${testDir}`,
  ],
  { cwd: projectRoot },
);

process.exit(extract.exitCode);
