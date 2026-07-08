import path from "node:path";
import { parseArgs, projectRoot, readJson } from "./common.mjs";

const args = parseArgs();
const repetitions = positiveInt(args.repetitions, 5);
const calibrationRuns = positiveInt(args["calibration-runs"], 5);
const workloadsPath = path.resolve(
  projectRoot,
  args.workloads ?? "workloads/variability.json",
);

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function range(length) {
  return Array.from({ length }, (_, index) => index + 1);
}

const manifest = await readJson(workloadsPath, { workloads: [] });
const workloads = (manifest.workloads ?? [])
  .map((item) => String(item.id ?? "").trim())
  .filter(Boolean);

if (workloads.length === 0) {
  throw new Error(`No se encontraron workloads en ${workloadsPath}`);
}

function calibrationMatrix() {
  const include = [];
  for (const workload of workloads) {
    for (const calibration of range(calibrationRuns)) {
      include.push({ workload, calibration });
    }
  }
  return { include };
}

function sequentialMatrix() {
  const include = [];
  for (const workload of workloads) {
    for (const repetition of range(repetitions)) {
      include.push({ workload, repetition });
    }
  }
  return { include };
}

function shardedMatrix(shards) {
  const include = [];
  for (const workload of workloads) {
    for (const repetition of range(repetitions)) {
      for (const shard of range(shards)) {
        include.push({ workload, repetition, shards, shard });
      }
    }
  }
  return { include };
}

const outputs = {
  calibration: calibrationMatrix(),
  sequential: sequentialMatrix(),
  native8: shardedMatrix(8),
  native12: shardedMatrix(12),
  fully8: shardedMatrix(8),
  fully12: shardedMatrix(12),
  balanced8: shardedMatrix(8),
  balanced12: shardedMatrix(12),
};

for (const [name, value] of Object.entries(outputs)) {
  console.log(`${name}=${JSON.stringify(value)}`);
}
