/**
 * ChartGen AI API helper — portable tool for OpenClaw skill.
 *
 * Zero external dependencies — uses only Node.js built-ins.
 * API key and URL are read from environment / config — the skill never
 * needs to know or pass secrets.
 *
 * Usage (skill only passes business data):
 *   npx tsx tools/chartgen_api.ts submit "<query>"
 *   npx tsx tools/chartgen_api.ts poll   <task_id>
 *   npx tsx tools/chartgen_api.ts wait   <task_id>
 *   npx tsx tools/chartgen_api.ts run    "<query>"
 */

import * as https from "https";
import * as http from "http";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { URL } from "url";

const BASE_URL =
  process.env.CHARTGEN_API_URL ?? "https://test-deepanalysis.digitforce.com";
const POLL_INTERVAL_MS = 20_000;
const MAX_POLLS = 30;

// ---------------------------------------------------------------------------
// API key resolution — tool reads it, skill never touches it
// ---------------------------------------------------------------------------

function resolveApiKey(): string | null {
  if (process.env.CHARTGEN_API_KEY) return process.env.CHARTGEN_API_KEY;

  const home = os.homedir();
  const candidates = [
    process.env.OPENCLAW_STATE_DIR
      ? path.join(process.env.OPENCLAW_STATE_DIR, "skills", "chartgen", "config.json")
      : "",
    path.join(home, ".openclaw", "skills", "chartgen", "config.json"),
    path.join(home, ".config", "chartgen", "api_key"),
    path.join(home, ".chartgen", "api_key"),
  ].filter(Boolean);

  for (const file of candidates) {
    try {
      const raw = fs.readFileSync(file, "utf-8").trim();
      if (file.endsWith(".json")) {
        const obj = JSON.parse(raw);
        const key = obj.api_key ?? obj.apiKey ?? obj.token ?? obj.access_token;
        if (key) return String(key);
      } else {
        if (raw.length > 0) return raw;
      }
    } catch {
      // file not found or unreadable — try next
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// OpenClaw media directory resolution
// ---------------------------------------------------------------------------

function getMediaDir(): string {
  const stateDir = process.env.OPENCLAW_STATE_DIR;
  if (stateDir) {
    const media = path.join(stateDir, "media");
    if (ensureDir(media)) return media;
    const workspace = path.join(stateDir, "workspace");
    if (ensureDir(workspace)) return workspace;
  }

  const home = os.homedir();
  const candidates = [
    path.join(home, ".openclaw", "media"),
    path.join(home, ".openclaw", "workspace"),
  ];
  for (const dir of candidates) {
    if (ensureDir(dir)) return dir;
  }

  return os.tmpdir();
}

function ensureDir(dir: string): boolean {
  try {
    fs.mkdirSync(dir, { recursive: true });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

interface RequestOptions {
  url: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

function request(
  opts: RequestOptions,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(opts.url);
    const lib = parsed.protocol === "https:" ? https : http;

    const reqOpts: https.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: opts.method ?? "GET",
      headers: opts.headers ?? {},
      timeout: opts.timeoutMs ?? 30_000,
    };

    const req = lib.request(reqOpts, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        resolve({
          status: res.statusCode ?? 0,
          body: Buffer.concat(chunks).toString("utf-8"),
        });
      });
    });

    req.on("error", (err) => reject(err));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });

    if (opts.body) req.write(opts.body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// API methods
// ---------------------------------------------------------------------------

interface SubmitResult {
  task_id?: string;
  status?: string;
  poll_url?: string;
  error?: string;
}

interface PollResult {
  task_id?: string;
  status?: string;
  text_reply?: string;
  artifacts?: Array<{
    artifact_id?: number;
    type: string;
    title: string;
    image_base64?: string;
    image_path?: string;
    raw_data?: unknown;
    download_url?: string;
  }>;
  progress?: string;
  error?: string;
}

async function submit(apiKey: string, query: string): Promise<SubmitResult> {
  const body = JSON.stringify({ query });

  try {
    const res = await request({
      url: `${BASE_URL}/api/agent/chat`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access-token": apiKey,
      },
      body,
    });

    if (res.status >= 400) {
      return { error: `HTTP ${res.status}`, status: "error" };
    }
    return JSON.parse(res.body);
  } catch (err: unknown) {
    return {
      error: `Connection failed: ${(err as Error).message}`,
      status: "error",
    };
  }
}

async function poll(apiKey: string, taskId: string): Promise<PollResult> {
  try {
    const res = await request({
      url: `${BASE_URL}/api/agent/task/${taskId}`,
      method: "GET",
      headers: { "access-token": apiKey },
      timeoutMs: 15_000,
    });

    if (res.status >= 400) {
      return { error: `HTTP ${res.status}`, status: "error" };
    }
    const result: PollResult = JSON.parse(res.body);
    return saveArtifacts(result);
  } catch (err: unknown) {
    return {
      error: `Poll failed: ${(err as Error).message}`,
      status: "error",
    };
  }
}

// ---------------------------------------------------------------------------
// Image saving
// ---------------------------------------------------------------------------

function saveBase64(dataUri: string, tag?: string): string | null {
  try {
    const marker = "base64,";
    const idx = dataUri.indexOf(marker);
    const raw = idx !== -1 ? dataUri.slice(idx + marker.length) : dataUri;
    const buf = Buffer.from(raw, "base64");
    const mediaDir = getMediaDir();
    const name = `chartgen_${tag ?? Date.now()}.png`;
    const dest = path.join(mediaDir, name);
    fs.writeFileSync(dest, buf);
    return dest;
  } catch {
    return null;
  }
}

function saveArtifacts(result: PollResult): PollResult {
  if (result.status !== "finished" || !result.artifacts) return result;

  for (const art of result.artifacts) {
    if (art.image_base64) {
      const tag = art.artifact_id ? String(art.artifact_id) : String(Date.now());
      const saved = saveBase64(art.image_base64, tag);
      if (saved) {
        art.image_path = saved;
        delete art.image_base64;
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Polling helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForTask(
  apiKey: string,
  taskId: string,
  intervalMs = POLL_INTERVAL_MS,
  maxPolls = MAX_POLLS,
): Promise<PollResult> {
  for (let attempt = 1; attempt <= maxPolls; attempt++) {
    await sleep(intervalMs);
    const result = await poll(apiKey, taskId);
    const st = result.status ?? "";

    if (st === "finished" || st === "error" || st === "not_found") {
      return result;
    }

    if (attempt % 3 === 0) {
      const progress = result.progress ?? "processing";
      process.stderr.write(
        JSON.stringify({ poll: attempt, status: st, progress }) + "\n",
      );
    }
  }

  return {
    error: "Polling timed out",
    task_id: taskId,
    status: "timeout",
  } as PollResult;
}

async function run(apiKey: string, query: string): Promise<PollResult> {
  const submitRes = await submit(apiKey, query);
  if (submitRes.error) return { error: submitRes.error, status: "error" };

  const taskId = submitRes.task_id;
  if (!taskId)
    return { error: "No task_id in submit response", status: "error" };

  return waitForTask(apiKey, taskId);
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

function fail(msg: string): never {
  process.stdout.write(JSON.stringify({ error: msg }) + "\n");
  process.exit(1);
}

async function main(): Promise<void> {
  const [, , cmd, ...args] = process.argv;

  const apiKey = resolveApiKey();
  if (!apiKey && cmd && cmd !== "help") {
    fail(
      "api_key_not_configured. " +
        "Please set your ChartGen API key: " +
        'export CHARTGEN_API_KEY="your-key" ' +
        "or save it to ~/.chartgen/api_key . " +
        "Get a key at https://chartgen.ai/chat → Menu → API",
    );
  }

  let result: unknown;

  switch (cmd) {
    case "submit": {
      const query = args[0];
      if (!query) {
        process.stderr.write('Usage: chartgen_api.ts submit "<query>"\n');
        process.exit(1);
      }
      result = await submit(apiKey!, query);
      break;
    }
    case "poll": {
      const taskId = args[0];
      if (!taskId) {
        process.stderr.write("Usage: chartgen_api.ts poll <task_id>\n");
        process.exit(1);
      }
      result = await poll(apiKey!, taskId);
      break;
    }
    case "wait": {
      const taskId = args[0];
      if (!taskId) {
        process.stderr.write("Usage: chartgen_api.ts wait <task_id>\n");
        process.exit(1);
      }
      result = await waitForTask(apiKey!, taskId);
      break;
    }
    case "run": {
      const query = args[0];
      if (!query) {
        process.stderr.write('Usage: chartgen_api.ts run "<query>"\n');
        process.exit(1);
      }
      result = await run(apiKey!, query);
      break;
    }
    default:
      process.stderr.write(
        `ChartGen AI API Tool  (${BASE_URL})\n\n` +
          "Commands:\n" +
          '  submit  "<query>"   Submit task, returns task_id\n' +
          "  poll    <task_id>   Single status check\n" +
          "  wait    <task_id>   Poll until done (for background exec)\n" +
          '  run     "<query>"   submit + wait in one shot\n\n' +
          "API key is read automatically from:\n" +
          "  1. CHARTGEN_API_KEY environment variable\n" +
          "  2. ~/.openclaw/skills/chartgen/config.json\n" +
          "  3. ~/.chartgen/api_key\n\n" +
          "Get a key: https://chartgen.ai/chat → Menu → API\n",
      );
      process.exit(1);
  }

  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

main().catch((err) => {
  process.stderr.write(JSON.stringify({ error: String(err) }) + "\n");
  process.exit(1);
});
