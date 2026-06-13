import fs from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import {
  ensureDir,
  intArg,
  nodeCommand,
  parseArgs,
  projectRoot,
} from "./common.mjs";

const args = parseArgs();
const strategy = String(args.strategy ?? "native");
const runId = String(args["run-id"] ?? `${strategy}-${Date.now()}`);
const shards = Math.max(1, intArg(args.shards, 4));
const workers = Math.max(1, intArg(args.workers, 1));
const extraArgs = [];

if (args.plan) extraArgs.push(`--plan=${args.plan}`);
if (args["base-url"]) extraArgs.push(`--base-url=${args["base-url"]}`);
if (args["test-dir"]) extraArgs.push(`--test-dir=${args["test-dir"]}`);

const logDir = path.resolve(projectRoot, "artifacts/logs", runId);
await ensureDir(logDir);

function runShard(shard) {
  return new Promise((resolve) => {
    const out = fs.openSync(path.join(logDir, `shard-${shard}.out.log`), "w");
    const err = fs.openSync(path.join(logDir, `shard-${shard}.err.log`), "w");
    const child = spawn(
      nodeCommand(),
      [
        "scripts/run-strategy.mjs",
        `--strategy=${strategy}`,
        `--run-id=${runId}`,
        `--shards=${shards}`,
        `--shard=${shard}`,
        `--workers=${workers}`,
        ...extraArgs,
      ],
      {
        cwd: projectRoot,
        env: process.env,
        stdio: ["ignore", out, err],
        shell: false,
      },
    );

    child.on("close", (code) => {
      fs.closeSync(out);
      fs.closeSync(err);
      resolve({ shard, code: code ?? 0 });
    });

    child.on("error", (error) => {
      fs.closeSync(out);
      fs.closeSync(err);
      console.error(error);
      resolve({ shard, code: 1 });
    });
  });
}

console.log(
  `Ejecutando ${strategy} en paralelo: run=${runId}, shards=${shards}, workers=${workers}`,
);
const results = await Promise.all(
  Array.from({ length: shards }, (_, index) => runShard(index + 1)),
);

for (const result of results) {
  console.log(`Shard ${result.shard}: exitCode=${result.code}`);
}

const failed = results.filter((result) => result.code !== 0);
if (failed.length > 0) {
  console.error(
    `Fallaron ${failed.length} shards. Logs en artifacts/logs/${runId}`,
  );
  process.exit(1);
}

console.log(
  `Todos los shards finalizaron correctamente. Logs en artifacts/logs/${runId}`,
);
