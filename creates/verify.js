"use strict";
const { call, readZapierFile } = require("../lib/client");
const { ATTRIBUTION, SITE_URL } = require("../lib/tools.generated");

const MB = 1024 * 1024;

module.exports = {
  key: "verify_pdf",
  noun: "Signature Check",
  display: {
    label: "Verify Signatures in PDF",
    description: "Checks every digital signature in a PDF right away and returns the report (up to 50 MB).",
  },
  operation: {
    inputFields: [{ key: "file", label: "PDF File", type: "file", required: true }],
    perform: async (z, bundle) => {
      const f = await readZapierFile(z, bundle.inputData.file);
      if (f.data.length > 50 * MB) throw new z.errors.Error("The file is larger than 50 MB. This action accepts PDFs up to 50 MB.", "too_big", 413);
      const key = `zapier-verify-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e12).toString(36)}`;
      const report = await call(z, { method: "POST", path: "/verify", headers: { "Content-Type": "application/json", "Idempotency-Key": key }, body: { file: { name: f.name, contentBase64: f.data.toString("base64") } } });
      return { ...report, signature_count: (report.signatures || []).length, attribution: `${ATTRIBUTION} ${SITE_URL}` };
    },
    sample: { signatures: [], signature_count: 0, attribution: `${ATTRIBUTION} ${SITE_URL}` },
  },
};
