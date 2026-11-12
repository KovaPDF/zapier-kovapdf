"use strict";
const { call, readZapierFile } = require("../lib/client");

const MB = 1024 * 1024;

module.exports = {
  key: "create_signature_request",
  noun: "Signature Request",
  display: {
    label: "Send Document for Signature",
    description: "Sends a PDF to one person to sign, with one signature box on the page you choose. The signer gets an email with a link to sign.",
  },
  operation: {
    inputFields: [
      { key: "file", label: "PDF File", type: "file", required: true, helpText: "The PDF to sign, up to 15 MB." },
      { key: "title", label: "Title", required: true, helpText: "The title the signer sees. It is also the email subject." },
      { key: "signer_name", label: "Signer Name", required: true },
      { key: "signer_email", label: "Signer Email", required: true },
      { key: "message", label: "Message", type: "text", required: false, helpText: "A short message for the signer." },
      { key: "expires_in_days", label: "Expires In Days", type: "integer", required: false, helpText: "1 to 60. Leave empty for the account's usual expiry." },
      { key: "page", label: "Page", type: "integer", required: false, default: "1", helpText: "The page of the signature box, from 1." },
      { key: "x", label: "X", type: "integer", required: false, default: "72", helpText: "Distance of the box from the left edge, in points (72 points = 1 inch)." },
      { key: "y", label: "Y", type: "integer", required: false, default: "72", helpText: "Distance of the box from the bottom edge, in points." },
    ],
    perform: async (z, bundle) => {
      const i = bundle.inputData;
      const f = await readZapierFile(z, i.file);
      if (f.data.length > 15 * MB) throw new z.errors.Error("The file is larger than 15 MB. This action accepts PDFs up to 15 MB.", "too_big", 413);
      const spec = {
        title: i.title,
        ...(i.message ? { message: i.message } : {}),
        ...(i.expires_in_days ? { expiresInDays: Number(i.expires_in_days) } : {}),
        sequential: true,
        signers: [{ name: i.signer_name, email: i.signer_email, order: 1 }],
        fields: [{ signer: 0, kind: "SIGNATURE", page: Number(i.page || 1), x: Number(i.x || 72), y: Number(i.y || 72), width: 180, height: 48 }],
      };
      // An Idempotency-Key: a retried call never sends the request twice.
      const key = `zapier-sign-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e12).toString(36)}`;
      return call(z, { method: "POST", path: "/sign-requests", headers: { "Content-Type": "application/json", "Idempotency-Key": key }, body: { file: { name: f.name, contentBase64: f.data.toString("base64") }, spec } });
    },
    sample: { id: "3f2b8c1e-7d4a-4f6e-9b21-5c8d0e7a1f34", title: "Supply contract", status: "IN_PROGRESS", signers: [{ name: "Jane Doe", email: "jane@example.com", status: "SENT" }] },
  },
};
