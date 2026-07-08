import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(scriptsDir, "..");

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (const token of argv) {
    if (!token.startsWith("--")) continue;
    const raw = token.slice(2);
    const equals = raw.indexOf("=");
    if (equals === -1) {
      args[raw] = true;
    } else {
      args[raw.slice(0, equals)] = raw.slice(equals + 1);
    }
  }
  return args;
}

export function intArg(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function readJson(filePath, fallback = null) {
  if (!existsSync(filePath)) return fallback;
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

export async function writeJson(filePath, data) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function relPath(filePath) {
  return path
    .relative(projectRoot, path.resolve(projectRoot, filePath))
    .replaceAll(path.sep, "/");
}

export async function listSpecFiles(dir = path.join(projectRoot, "tests")) {
  const result = [];

  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (/\.spec\.ts$/.test(entry.name)) {
        result.push(relPath(fullPath));
      }
    }
  }

  await walk(dir);
  return result.sort();
}

export async function workloadFiles(args) {
  const explicit = String(args["test-files"] ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (explicit.length > 0) return explicit.map(normalizeSlashes).sort();

  const workload = args.workload ? String(args.workload) : "";
  if (!workload) return [];

  const workloadsPath = path.resolve(
    projectRoot,
    args.workloads ?? "workloads/variability.json",
  );
  const manifest = await readJson(workloadsPath, { workloads: [] });
  const entry = (manifest.workloads ?? []).find((item) => item.id === workload);
  if (!entry) {
    throw new Error(
      `No se encontró workload "${workload}" en ${relPath(workloadsPath)}`,
    );
  }
  return (entry.files ?? []).map(normalizeSlashes).sort();
}

export function normalizeSlashes(value) {
  return String(value).replaceAll("\\", "/");
}

export function median(values) {
  const clean = values
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  if (clean.length === 0) return 0;
  const mid = Math.floor(clean.length / 2);
  return clean.length % 2 ? clean[mid] : (clean[mid - 1] + clean[mid]) / 2;
}

export function nowStamp() {
  return new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
}

export function npxCommand() {
  return process.platform === "win32" ? "npx.cmd" : "npx";
}

export function nodeCommand() {
  return process.execPath;
}

export async function runCommand(command, args, options = {}) {
  const startedAt = new Date();
  const startedMs = Date.now();

  const exitCode = await new Promise((resolve) => {
    const needsShell =
      process.platform === "win32" && command.toLowerCase().endsWith(".cmd");
    const child = spawn(command, args, {
      cwd: options.cwd ?? projectRoot,
      env: options.env ?? process.env,
      stdio: options.stdio ?? "inherit",
      shell: options.shell ?? needsShell,
    });

    child.on("error", (error) => {
      console.error(error);
      resolve(1);
    });

    child.on("close", (code) => {
      resolve(code ?? 0);
    });
  });

  const finishedAt = new Date();
  return {
    exitCode,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: Date.now() - startedMs,
  };
}

export async function findJsonFiles(inputPath) {
  const stat = await fs.stat(inputPath).catch(() => null);
  if (!stat) return [];
  if (stat.isFile() && inputPath.endsWith(".json")) return [inputPath];
  if (!stat.isDirectory()) return [];

  const files = [];
  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.name.endsWith(".json")) {
        files.push(full);
      }
    }
  }
  await walk(inputPath);
  return files.sort();
}
