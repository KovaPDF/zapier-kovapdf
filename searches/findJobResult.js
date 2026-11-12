"use strict";
const { call, jobOutput, STEP_BUDGET_MS, deps } = require("../lib/client");

module.exports = {
  key: "find_job_result",
  noun: "Job",
  display: {
    label: "Find Job Result",
    description: "Finds a KovaPDF job by its ID and, when it is done, returns its result files and report.",
  },
  operation: {
    inputFields: [{ key: "job_id", label: "Job ID", required: true, helpText: "The Job ID a KovaPDF tool action returned." }],
    perform: async (z, bundle) => {
      const { job } = await call(z, { path: `/jobs/${encodeURIComponent(bundle.inputData.job_id)}` });
      return [await jobOutput(z, job, deps.now() + STEP_BUDGET_MS)];
    },
    sample: { id: "00000000-0000-4000-8000-000000000000", job_id: "00000000-0000-4000-8000-000000000000", tool: "compress", state: "done", done: true, files: [], report: null, attribution: "Done with KovaPDF (kovapdf.com). https://www.kovapdf.com" },
  },
};
