import { parseArgs } from "./common.mjs";

const args = parseArgs();
const url = args.url ?? process.env.BASE_URL ?? "http://localhost:3000";
const timeoutMs = Number(args.timeoutMs ?? 120_000);
const started = Date.now();

while (Date.now() - started < timeoutMs) {
  try {
    const response = await fetch(url);
    if (response.ok) {
      console.log(`App disponible en ${url}`);
      process.exit(0);
    }
  } catch {
    // La app todavía puede estar arrancando.
  }
  await new Promise((resolve) => setTimeout(resolve, 2000));
}

console.error(`La app no respondió en ${url} tras ${timeoutMs} ms.`);
process.exit(1);
