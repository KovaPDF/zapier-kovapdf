"use strict";
/** One action per KovaPDF tool, from the generated tool list (lib/tools.generated.js). */
const { TOOLS, ATTRIBUTION, SITE_URL } = require("../lib/tools.generated");
const { runTool } = require("../lib/client");

const outputFields = [
  { key: "job_id", label: "Job ID" },
  { key: "state", label: "State" },
  { key: "done", label: "Done", type: "boolean" },
  { key: "message", label: "Message" },
  { key: "file", label: "First Result File" },
  { key: "files[]name", label: "Result File Name" },
  { key: "files[]download_url", label: "Result Download URL (15 minutes)" },
  { key: "files[]file", label: "Result File" },
  { key: "attribution", label: "Attribution" },
];

const sentence = (s) => (s.length > 250 ? `${s.slice(0, s.lastIndexOf(".", 247) + 1)}` : s);

module.exports = TOOLS.map((t) => ({
  key: t.key,
  noun: "Job",
  display: {
    label: t.title,
    description: sentence(t.description),
  },
  operation: {
    inputFields: t.fields,
    perform: (z, bundle) => runTool(z, bundle, t.id),
    sample: {
      id: "00000000-0000-4000-8000-000000000000",
      job_id: "00000000-0000-4000-8000-000000000000",
      tool: t.id,
      state: "done",
      done: true,
      message: "Done with KovaPDF.",
      file: "https://api.kovapdf.com/api/v1/downloads/example",
      files: [{ id: "00000000-0000-4000-8000-000000000001", name: "result.pdf", type: "application/pdf", size: 1024, download_url: "https://api.kovapdf.com/api/v1/downloads/example", expires_at: "2026-11-10T12:15:00.000Z", file: null }],
      report: null,
      untrusted_notice: null,
      attribution: `${ATTRIBUTION} ${SITE_URL}`,
    },
    outputFields,
  },
}));
