"use strict";
/**
 * Calls to KovaPDF from Zapier: files + jobs, with the client rules every
 * KovaPDF app follows (honour Retry-After, back off, never poll faster than
 * every 2 seconds, at most 2 calls at once, say who is calling), fitted to
 * Zapier's time limit for one step: a wait that does not fit becomes
 * Zapier's own ThrottledError (Zapier tries the step again later), and a job
 * that is still running when the budget is spent is returned with its ID,
 * for the "Find Job Result" search.
 */
const { API_BASE, ATTRIBUTION, MESSAGES, SITE_URL, TOOLS } = require("./tools.generated");
const { version } = require("../package.json");

const USER_AGENT = `kovapdf-zapier/${version} (+https://www.kovapdf.com)`;
const RETRY_STATUS = new Set([429, 502, 503, 504]);
const POLL_START_MS = 2000;
const POLL_MAX_MS = 10000;
const MAX_RETRIES = 5;
/** Zapier stops an action after 30 seconds; we stop waiting well before. */
const STEP_BUDGET_MS = 22000;
const MAX_PARALLEL = 2;

const deps = {
  now: () => Date.now(),
  random: () => Math.random(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

let active = 0;
const waiting = [];
async function inSlot(fn) {
  if (active >= MAX_PARALLEL) await new Promise((resolve) => waiting.push(resolve));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    const next = waiting.shift();
    if (next) next();
  }
}

function parseRetryAfter(value, now = deps.now()) {
  if (value === undefined || value === null || value === "") return undefined;
  const s = String(value).trim();
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(Number(s) * 1000);
  const at = Date.parse(s);
  return Number.isNaN(at) ? undefined : Math.max(0, at - now);
}

function friendlyMessage(status, body, path) {
  const data = body && typeof body === "object" ? body : {};
  const code = typeof data.code === "string" ? data.code : "";
  if (status === 403 && code === "integration_paused") return { message: MESSAGES.integration_paused, code };
  if (status === 403 && code === "tool_paused") return { message: MESSAGES.tool_paused, code };
  if (status === 404 && /^\/(files|jobs|tools)(\/|$)/.test(path || "") && (!code || code === "not_found")) return { message: MESSAGES.unavailable, code: "unavailable" };
  return { message: typeof data.error === "string" ? data.error : `KovaPDF answered with status ${status}.`, code: code || `http_${status}` };
}

const backoffMs = (attempt) => {
  const base = Math.min(60000, 2000 * 2 ** attempt);
  return Math.min(60000, Math.round(base + (deps.random() * base) / 2));
};

const parse = (res) => {
  if (res.data !== undefined && res.data !== null && typeof res.data === "object") return res.data;
  try {
    return JSON.parse(res.content);
  } catch {
    return {};
  }
};

/**
 * One call. Retries 429, 502, 503, 504 and network errors while the wait
 * fits in the step's budget; otherwise asks Zapier to try the step later.
 */
async function call(z, { method = "GET", path, url, headers = {}, body, raw = false, deadline }) {
  const end = deadline ?? deps.now() + STEP_BUDGET_MS;
  for (let attempt = 0; ; attempt++) {
    let res;
    let networkError;
    try {
      res = await inSlot(() => z.request({ method, url: url || `${API_BASE}${path}`, headers, body, raw, skipThrowForStatus: true, throwForThrottlingEarly: false }));
    } catch (err) {
      networkError = err;
    }
    if (res && res.status < 400) return raw ? res : parse(res);
    const status = res ? res.status : 0;
    const data = res && !raw ? parse(res) : {};
    if (res && !RETRY_STATUS.has(status)) {
      const { message, code } = friendlyMessage(status, data, path);
      throw new z.errors.Error(message, code, status);
    }
    const retryAfter = res && res.headers && res.headers.get ? parseRetryAfter(res.headers.get("retry-after")) : undefined;
    const wait = retryAfter !== undefined ? Math.max(1000, retryAfter) : backoffMs(attempt);
    if (attempt >= MAX_RETRIES || deps.now() + wait > end) {
      if (!res) throw new z.errors.Error(`KovaPDF could not be reached: ${(networkError && networkError.message) || "network error"}.`, "network", 0);
      const { message } = friendlyMessage(status, data, path);
      // Zapier's own retry, after the time KovaPDF asked for (at least a minute, Zapier's floor).
      throw new z.errors.ThrottledError(message, Math.max(60, Math.ceil(wait / 1000)));
    }
    await deps.sleep(wait);
  }
}

function multipart(field, fileName, mime, data, boundary) {
  const safeName = String(fileName || "file").replace(/["\r\n\\]/g, "_");
  const head = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${field}"; filename="${safeName}"\r\nContent-Type: ${mime || "application/octet-stream"}\r\n\r\n`, "utf8");
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
  return { body: Buffer.concat([head, data, tail]), contentType: `multipart/form-data; boundary=${boundary}` };
}

/** A Zapier file field (a URL) read into memory, with a file name. */
async function readZapierFile(z, ref) {
  const res = await z.request({ url: ref, raw: true, skipThrowForStatus: true });
  if (res.status >= 400) throw new z.errors.Error(`The file could not be read (status ${res.status}).`, "file_unreadable", res.status);
  const data = await res.buffer();
  const cd = res.headers.get("content-disposition") || "";
  const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
  let name = m ? decodeURIComponent(m[1]) : "";
  if (!name) {
    try {
      name = decodeURIComponent(new URL(ref).pathname.split("/").pop() || "");
    } catch {
      name = "";
    }
  }
  return { name: name || "file", mime: (res.headers.get("content-type") || "application/octet-stream").split(";")[0], data };
}

async function uploadFile(z, file, deadline) {
  const boundary = `----kovapdf${deps.now().toString(16)}${Math.floor(deps.random() * 1e12).toString(16)}`;
  const { body, contentType } = multipart("file", file.name, file.mime, file.data, boundary);
  const out = await call(z, { method: "POST", path: "/files", headers: { "Content-Type": contentType }, body, deadline });
  return out.file;
}

function toolOptions(tool, input) {
  const out = {};
  for (const o of tool.options) {
    const v = input[o.name];
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length)) continue;
    if (["numberEnum", "integer", "number"].includes(o.kind)) {
      const n = Number(v);
      if (Number.isNaN(n)) throw new Error(`${o.name} must be a number.`);
      out[o.name] = n;
    } else if (o.kind === "boolean") {
      out[o.name] = v === true || String(v).toLowerCase() === "true" || String(v).toLowerCase() === "yes";
    } else if (o.kind === "json") {
      const s = Array.isArray(v) ? JSON.stringify(v) : String(v).trim();
      if (s.startsWith("[")) {
        let parsed;
        try {
          parsed = JSON.parse(s);
        } catch {
          parsed = null;
        }
        if (!Array.isArray(parsed)) throw new Error(`${o.name} is not a valid JSON list.`);
        out[o.name] = parsed;
      } else {
        out[o.name] = s.split(/[,\s]+/).filter(Boolean).map((x) => {
          const n = Number(x);
          if (!Number.isInteger(n) || n < 1) throw new Error(`${o.name}: "${x}" is not a page number.`);
          return n;
        });
      }
    } else if (o.kind === "stringList" || o.kind === "enumList") {
      out[o.name] = (Array.isArray(v) ? v : String(v).split(/[,\n]/)).map((x) => String(x).trim()).filter(Boolean);
    } else {
      out[o.name] = String(v);
    }
  }
  return out;
}

/** Polls a job within the deadline: first after 2 s (or its retryAfter), then less often, up to every 10 s. */
async function waitForJob(z, job, deadline) {
  let current = job;
  let delay = Math.max(POLL_START_MS, (job.retryAfter || 0) * 1000);
  while (current.state === "queued" || current.state === "running") {
    if (deps.now() + delay > deadline) return current;
    await deps.sleep(delay);
    current = (await call(z, { path: `/jobs/${encodeURIComponent(current.id)}`, deadline })).job;
    delay = Math.min(POLL_MAX_MS, Math.max(POLL_START_MS, Math.round(delay * 1.5), (current.retryAfter || 0) * 1000));
  }
  return current;
}

/** The step's answer: the job, its files (stashed in Zapier when there is time), its report, and the attribution. */
async function jobOutput(z, job, deadline) {
  if (job.state === "failed") {
    throw new z.errors.Error((job.error && job.error.message) || "The job failed.", (job.error && job.error.code) || "failed", 422);
  }
  const done = job.state === "done";
  const files = [];
  for (const f of (job.result && job.result.files) || []) {
    const url = f.download ? f.download.url : null;
    let file = null;
    if (url && deps.now() + 3000 < deadline) {
      // A Zapier file later steps can use; the download link needs no key.
      try {
        file = await z.stashFile(z.request({ url, raw: true }), f.size, f.name, f.type);
      } catch (err) {
        // The link still works for 15 minutes; a failed copy into Zapier must not fail the step.
        z.console.log(`Could not copy ${f.name} into Zapier: ${err.message}`);
      }
    }
    files.push({ id: f.id, name: f.name, type: f.type, size: f.size, download_url: url, expires_at: f.download ? f.download.expiresAt : null, file });
  }
  return {
    id: job.id,
    job_id: job.id,
    tool: job.tool,
    state: job.state,
    done,
    message: done ? "Done with KovaPDF." : `The job is still ${job.state}. Use the Find Job Result search with this job ID in a later step (for example after a Delay).`,
    files,
    file: files.length ? files[0].file || files[0].download_url : null,
    report: (job.result && job.result.report) || null,
    untrusted_notice: job.untrusted ? job.untrusted.notice : null,
    attribution: `${(job.attribution && job.attribution.text) || ATTRIBUTION} ${(job.attribution && job.attribution.url) || SITE_URL}`,
  };
}

/** Upload, start, wait within the budget: the one way every tool runs. */
async function runTool(z, bundle, toolId) {
  const deadline = deps.now() + STEP_BUDGET_MS;
  const tool = TOOLS.find((t) => t.id === toolId);
  const input = bundle.inputData || {};
  const refs = tool.inputs.multi ? [].concat(input.files || []).filter(Boolean) : input.file ? [input.file] : [];
  if (refs.length < tool.inputs.min || refs.length > tool.inputs.max) {
    const want = tool.inputs.min === tool.inputs.max ? `${tool.inputs.min}` : `${tool.inputs.min} to ${tool.inputs.max}`;
    throw new z.errors.Error(`${tool.title} takes ${want} file${tool.inputs.max === 1 ? "" : "s"}; got ${refs.length}.`, "invalid_request", 400);
  }
  let options;
  try {
    options = toolOptions(tool, input);
  } catch (err) {
    throw new z.errors.Error(err.message, "invalid_request", 400);
  }
  const files = await Promise.all(refs.map((ref) => readZapierFile(z, ref)));
  const ids = await Promise.all(files.map((f) => uploadFile(z, f, deadline).then((x) => x.id)));
  const key = `zapier-${deps.now().toString(36)}-${Math.floor(deps.random() * 1e12).toString(36)}`;
  const { job } = await call(z, { method: "POST", path: "/jobs", headers: { "Content-Type": "application/json", "Idempotency-Key": key }, body: { tool: tool.id, inputs: ids, options }, deadline });
  return jobOutput(z, await waitForJob(z, job, deadline), deadline);
}

module.exports = { deps, call, uploadFile, readZapierFile, runTool, waitForJob, jobOutput, toolOptions, multipart, parseRetryAfter, friendlyMessage, USER_AGENT, STEP_BUDGET_MS };
