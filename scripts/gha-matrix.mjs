import { parseArgs } from "./common.mjs";

const args = parseArgs();
const repetitions = positiveInt(args.repetitions, 3);
const calibrationRuns = positiveInt(args["calibration-runs"], 3);
const shardCounts = parseShardCounts(args["shard-counts"] ?? "4");
const includeFully =
  String(args["include-fully"] ?? "false") === "true" ||
  String(args["include-fully"] ?? "0") === "1";

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseShardCounts(value) {
  return String(value)
    .split(",")
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isFinite(item) && item > 0)
    .sort((a, b) => a - b);
}

function range(length) {
  return Array.from({ length }, (_, index) => index + 1);
}

function shardedMatrix() {
  const include = [];
  for (const repetition of range(repetitions)) {
    for (const shards of shardCounts) {
      for (const shard of range(shards)) {
        include.push({ repetition, shards, shard });
      }
    }
  }
  return { include };
}

const outputs = {
  calibration: {
    include: range(calibrationRuns).map((calibration) => ({ calibration })),
  },
  sequential: {
    include: range(repetitions).map((repetition) => ({ repetition })),
  },
  native: shardedMatrix(),
  balanced: shardedMatrix(),
  fully: includeFully
    ? shardedMatrix()
    : { include: [{ repetition: 1, shards: 1, shard: 1, skipped: true }] },
};

for (const [name, value] of Object.entries(outputs)) {
  console.log(`${name}=${JSON.stringify(value)}`);
}
