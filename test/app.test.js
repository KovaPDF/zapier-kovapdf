"use strict";
// Tests with zapier-platform-core's createAppTester and nock (node:test).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const nock = require("nock").default;
const zapier = require("zapier-platform-core");
const App = require("../index");
const client = require("../lib/client");
const { MESSAGES, TOOLS } = require("../lib/tools.generated");

const appTester = zapier.createAppTester(App);
const API = "https://api.kovapdf.com";
const FILES = "https://files.example.com";
const authData = { api_key: "kova_test_example" };

let now = 1_700_000_000_000;
const sleeps = [];
client.deps.now = () => now;
client.deps.random = () => 0.5;
client.deps.sleep = async (ms) => {
  sleeps.push(ms);
  now += ms;
};

test.beforeEach(() => {
  nock.cleanAll();
  sleeps.length = 0;
  nock.disableNetConnect();
});
test.after(() => nock.enableNetConnect());

test("auth test calls GET /me with the key and the client headers", async () => {
  const scope = nock(API, { reqheaders: { authorization: "Bearer kova_test_example", "x-kovapdf-client": "zapier", "user-agent": /^kovapdf-zapier\/1\.0\.0 \(\+https:\/\/www\.kovapdf\.com\)$/ } })
    .get("/api/v1/me")
    .reply(200, { account: { id: "u1", email: "me@example.com" } });
  const out = await appTester(App.authentication.test, { authData });
  assert.equal(out.account.email, "me@example.com");
  assert.ok(scope.isDone());
});

test("the key is never sent to a file host", async () => {
  nock(FILES, { badheaders: ["authorization", "x-kovapdf-client"] }).get("/a.pdf").reply(200, Buffer.from("%PDF-1.7 a"), { "content-type": "application/pdf" });
  nock(FILES, { badheaders: ["authorization"] }).get("/b.pdf").reply(200, Buffer.from("%PDF-1.7 b"), { "content-type": "application/pdf" });
  let jobBody;
  nock(API).post("/api/v1/files").reply(201, { file: { id: "f1" } }).post("/api/v1/files").reply(201, { file: { id: "f2" } });
  nock(API)
    .post("/api/v1/jobs", (b) => {
      jobBody = b;
      return true;
    })
    .reply(202, { job: { id: "j1", tool: "merge", state: "queued", retryAfter: 3 } });
  nock(API).get("/api/v1/jobs/j1").reply(200, { job: { id: "j1", tool: "merge", state: "done", result: { files: [], report: null }, attribution: { text: "Done with KovaPDF (kovapdf.com).", url: "https://www.kovapdf.com" } } });
  const out = await appTester(App.creates.tool_merge.operation.perform, { authData, inputData: { files: [`${FILES}/a.pdf`, `${FILES}/b.pdf`] } });
  assert.deepEqual(jobBody, { tool: "merge", inputs: ["f1", "f2"], options: {} });
  assert.equal(out.state, "done");
  assert.equal(out.attribution, "Done with KovaPDF (kovapdf.com). https://www.kovapdf.com");
  assert.deepEqual(sleeps, [3000]);
});

test("a tool action uploads multipart, sends options, polls no faster than every 2 s", async () => {
  nock(FILES).get("/scan.pdf").reply(200, Buffer.from("%PDF-1.7 scan"), { "content-type": "application/pdf" });
  nock(API, { reqheaders: { "content-type": /^multipart\/form-data; boundary=/ } })
    .post("/api/v1/files", (body) => String(body).includes('filename="scan.pdf"') && String(body).includes("%PDF-1.7 scan"))
    .reply(201, { file: { id: "f1" } });
  let idem;
  nock(API)
    .post("/api/v1/jobs", (b) => b.tool === "split" && b.options.mode === "range" && b.options.pages === "1-2")
    .matchHeader("idempotency-key", (v) => {
      idem = v;
      return true;
    })
    .reply(202, { job: { id: "j2", tool: "split", state: "queued" } });
  nock(API).get("/api/v1/jobs/j2").times(2).reply(200, { job: { id: "j2", tool: "split", state: "running" } });
  nock(API).get("/api/v1/jobs/j2").reply(200, { job: { id: "j2", tool: "split", state: "done", result: { files: [{ id: "r1", name: "scan-split.pdf", type: "application/pdf", size: 9, download: { url: `${API}/api/v1/downloads/tok`, expiresAt: "x" } }], report: null } } });
  nock(API, { badheaders: ["authorization"] }).get("/api/v1/downloads/tok").reply(200, Buffer.from("%PDF"));
  const out = await appTester(App.creates.tool_split.operation.perform, { authData, inputData: { file: `${FILES}/scan.pdf`, mode: "range", pages: "1-2" } });
  assert.ok(idem);
  assert.equal(out.done, true);
  assert.equal(out.files[0].download_url, `${API}/api/v1/downloads/tok`);
  assert.deepEqual(sleeps, [2000, 3000, 4500]);
});

test("a job longer than the step returns its id for Find Job Result", async () => {
  nock(FILES).get("/big.pdf").reply(200, Buffer.from("%PDF big"));
  nock(API).post("/api/v1/files").reply(201, { file: { id: "f1" } });
  nock(API).post("/api/v1/jobs").reply(202, { job: { id: "j3", tool: "ocr", state: "queued" } });
  nock(API).get("/api/v1/jobs/j3").times(10).reply(200, { job: { id: "j3", tool: "ocr", state: "running" } });
  const out = await appTester(App.creates.tool_ocr.operation.perform, { authData, inputData: { file: `${FILES}/big.pdf` } });
  assert.equal(out.done, false);
  assert.equal(out.job_id, "j3");
  assert.match(out.message, /Find Job Result/);
  assert.ok(sleeps.reduce((a, b) => a + b, 0) <= client.STEP_BUDGET_MS);
  nock.cleanAll();
  nock(API).get("/api/v1/jobs/j3").reply(200, { job: { id: "j3", tool: "ocr", state: "done", result: { files: [], report: { text: "hello" } }, untrusted: { fields: ["result.report"], notice: "data" } } });
  const [found] = await appTester(App.searches.find_job_result.operation.perform, { authData, inputData: { job_id: "j3" } });
  assert.equal(found.done, true);
  assert.deepEqual(found.report, { text: "hello" });
  assert.equal(found.untrusted_notice, "data");
});

test("429 with Retry-After is waited out when it fits, else handed to Zapier as ThrottledError", async () => {
  nock(API).get("/api/v1/jobs/j4").reply(429, { code: "limit_reached", error: "Limit reached." }, { "Retry-After": "4" });
  nock(API).get("/api/v1/jobs/j4").reply(200, { job: { id: "j4", tool: "compress", state: "done", result: { files: [], report: null } } });
  await appTester(App.searches.find_job_result.operation.perform, { authData, inputData: { job_id: "j4" } });
  assert.deepEqual(sleeps, [4000]);
  nock(API).get("/api/v1/jobs/j5").reply(429, { code: "limit_reached", error: "Limit reached." }, { "Retry-After": "600" });
  await assert.rejects(appTester(App.searches.find_job_result.operation.perform, { authData, inputData: { job_id: "j5" } }), (e) => e.name === "ThrottledError" && /Limit reached/.test(e.message));
});

test("paused, tool paused and unavailable answers give the friendly words, with no retry", async () => {
  nock(API).get("/api/v1/jobs/a").reply(403, { code: "integration_paused", error: "off", platform: "zapier" });
  await assert.rejects(appTester(App.searches.find_job_result.operation.perform, { authData, inputData: { job_id: "a" } }), (e) => e.message.includes(MESSAGES.integration_paused));
  nock(API).get("/api/v1/jobs/b").reply(403, { code: "tool_paused", error: "off", tool: "ocr" });
  await assert.rejects(appTester(App.searches.find_job_result.operation.perform, { authData, inputData: { job_id: "b" } }), (e) => e.message.includes(MESSAGES.tool_paused));
  nock(API).get("/api/v1/jobs/c").reply(404, { error: "Not found." });
  await assert.rejects(appTester(App.searches.find_job_result.operation.perform, { authData, inputData: { job_id: "c" } }), (e) => e.message.includes(MESSAGES.unavailable));
  nock(API).get("/api/v1/jobs/d").reply(400, { code: "invalid_request", error: "Bad." });
  await assert.rejects(appTester(App.searches.find_job_result.operation.perform, { authData, inputData: { job_id: "d" } }), (e) => e.message.includes("Bad."));
  assert.deepEqual(sleeps, []);
  assert.ok(nock.isDone());
});

test("polling triggers pick out each signature event, newest first, with ids", async () => {
  const requests = [
    { id: "r1", title: "A", status: "COMPLETED", createdAt: "2026-11-01T00:00:00Z", completedAt: "2026-11-02T00:00:00Z", signers: [{ name: "J", email: "j@x.com", status: "SIGNED", order: 1, signedAt: "2026-11-02T00:00:00Z" }] },
    { id: "r2", title: "B", status: "IN_PROGRESS", createdAt: "2026-11-03T00:00:00Z", signers: [{ name: "K", email: "k@x.com", status: "SIGNED", order: 1, signedAt: "2026-11-04T00:00:00Z" }, { name: "L", email: "l@x.com", status: "SENT", order: 2 }] },
    { id: "r3", title: "C", status: "DECLINED", createdAt: "2026-10-01T00:00:00Z", signers: [{ name: "M", email: "m@x.com", status: "DECLINED", order: 1 }] },
    { id: "r4", title: "D", status: "CANCELLED", createdAt: "2026-10-02T00:00:00Z", signers: [] },
  ];
  nock(API).get("/api/v1/sign-requests").times(4).reply(200, { requests });
  const sent = await appTester(App.triggers.signature_request_sent.operation.perform, { authData });
  assert.deepEqual(sent.map((x) => x.id), ["r2", "r1", "r4", "r3"]);
  assert.equal(sent[0].event, "request.sent");
  const signed = await appTester(App.triggers.signer_signed.operation.perform, { authData });
  assert.deepEqual(signed.map((x) => [x.id, x.event]), [["r2:1:k@x.com", "signer.signed"], ["r1:1:j@x.com", "signer.signed"]]);
  const completed = await appTester(App.triggers.signature_request_completed.operation.perform, { authData });
  assert.deepEqual(completed.map((x) => [x.id, x.event]), [["r1:completed", "request.completed"]]);
  const closed = await appTester(App.triggers.signature_request_declined_or_cancelled.operation.perform, { authData });
  assert.deepEqual(closed.map((x) => [x.id, x.event]), [["r4:CANCELLED", "request.cancelled"], ["r3:DECLINED", "signer.declined"]]);
});

test("there is one action for every manifest tool, and the app definition is valid", () => {
  const manifestPath = path.join(__dirname, "../../../generated/manifest.json");
  const keys = Object.keys(App.creates).filter((k) => k.startsWith("tool_")).sort();
  assert.deepEqual(keys, TOOLS.map((t) => `tool_${t.id}`).sort());
  if (fs.existsSync(manifestPath)) {
    assert.deepEqual(TOOLS.map((t) => t.id).sort(), JSON.parse(fs.readFileSync(manifestPath, "utf8")).tools.map((t) => t.id).sort());
  }
  const schema = require("zapier-platform-core/src/tools/schema");
  assert.deepEqual(schema.validateApp(schema.compileApp(App)), []);
});
