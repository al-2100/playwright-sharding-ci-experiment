import { nodeCommand, parseArgs, projectRoot, runCommand } from "./common.mjs";

const args = parseArgs();
const shardCounts = String(args["shard-counts"] ?? "4")
  .split(",")
  .map((item) => Number.parseInt(item.trim(), 10))
  .filter((item) => Number.isFinite(item) && item > 0)
  .sort((a, b) => a - b);

const history = String(args.history ?? "artifacts/history/history.json");
const testDir = String(args["test-dir"] ?? "tests");

for (const shards of shardCounts) {
  const result = await runCommand(
    nodeCommand(),
    [
      "scripts/plan-shards.mjs",
      `--run-id=eval-balanced-m${shards}`,
      `--shards=${shards}`,
      `--test-dir=${testDir}`,
      `--history=${history}`,
    ],
    { cwd: projectRoot },
  );

  if (result.exitCode !== 0) process.exit(result.exitCode);
}
