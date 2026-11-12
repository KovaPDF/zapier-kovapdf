"use strict";
/**
 * Signature request triggers. KovaPDF's webhook endpoints are made in the
 * dashboard (a signed in session), not with an API key, so Zapier cannot
 * subscribe a REST hook for itself: these triggers poll GET /sign-requests
 * at Zapier's own polling interval and pick out the steps that happened.
 * Each item carries the real webhook event name (developerApi/webhooks.ts).
 */
const { call } = require("../lib/client");

const time = (v) => (v ? new Date(v).getTime() : 0);

async function requests(z) {
  const out = await call(z, { path: "/sign-requests" });
  return out.requests || [];
}

const requestItem = (r, event, extra = {}) => ({
  event,
  request_id: r.id,
  title: r.title,
  status: r.status,
  file_name: r.fileName,
  created_at: r.createdAt,
  completed_at: r.completedAt || null,
  expires_at: r.expiresAt,
  signers: (r.signers || []).map((s) => ({ name: s.name, email: s.email, status: s.status, role: s.role, order: s.order, signed_at: s.signedAt || null })),
  ...extra,
});

const byTimeDesc = (items) => items.sort((a, b) => b._at - a._at).map(({ _at, ...x }) => x);

const SIGNERS_SAMPLE = [{ name: "Jane Doe", email: "jane@example.com", status: "SIGNED", role: "SIGNER", order: 1, signed_at: "2026-11-10T10:05:00.000Z" }];
const REQUEST_SAMPLE = { request_id: "3f2b8c1e-7d4a-4f6e-9b21-5c8d0e7a1f34", title: "Supply contract", status: "IN_PROGRESS", file_name: "contract.pdf", created_at: "2026-11-10T10:00:00.000Z", completed_at: null, expires_at: "2026-12-10T10:00:00.000Z", signers: SIGNERS_SAMPLE };

const make = ({ key, noun, label, description, perform, sample }) => ({
  key,
  noun,
  display: { label, description },
  operation: { type: "polling", perform, sample },
});

module.exports = [
  make({
    key: "signature_request_sent",
    noun: "Signature Request",
    label: "Signature Request Sent",
    description: "Triggers when a new signature request is sent (event request.sent).",
    perform: async (z) => byTimeDesc((await requests(z)).map((r) => ({ id: r.id, _at: time(r.createdAt), ...requestItem(r, "request.sent") }))),
    sample: { id: REQUEST_SAMPLE.request_id, event: "request.sent", ...REQUEST_SAMPLE },
  }),
  make({
    key: "signer_signed",
    noun: "Signature",
    label: "Signed by a Signer",
    description: "Triggers when one signer of a signature request signs (event signer.signed).",
    perform: async (z) =>
      byTimeDesc(
        (await requests(z)).flatMap((r) =>
          (r.signers || [])
            .filter((s) => s.status === "SIGNED")
            .map((s) => ({ id: `${r.id}:${s.order}:${s.email}`, _at: time(s.signedAt), ...requestItem(r, "signer.signed", { signer: { name: s.name, email: s.email, role: s.role, order: s.order, signed_at: s.signedAt || null } }) })),
        ),
      ),
    sample: { id: `${REQUEST_SAMPLE.request_id}:1:jane@example.com`, event: "signer.signed", ...REQUEST_SAMPLE, signer: { name: "Jane Doe", email: "jane@example.com", role: "SIGNER", order: 1, signed_at: "2026-11-10T10:05:00.000Z" } },
  }),
  make({
    key: "signature_request_completed",
    noun: "Signature Request",
    label: "Signature Request Completed",
    description: "Triggers when everyone has signed a signature request (event request.completed).",
    perform: async (z) =>
      byTimeDesc((await requests(z)).filter((r) => r.status === "COMPLETED").map((r) => ({ id: `${r.id}:completed`, _at: time(r.completedAt || r.createdAt), ...requestItem(r, "request.completed") }))),
    sample: { id: `${REQUEST_SAMPLE.request_id}:completed`, event: "request.completed", ...REQUEST_SAMPLE, status: "COMPLETED", completed_at: "2026-11-10T11:00:00.000Z" },
  }),
  make({
    key: "signature_request_declined_or_cancelled",
    noun: "Signature Request",
    label: "Signature Request Declined or Cancelled",
    description: "Triggers when a signer declines (event signer.declined) or the sender cancels a signature request (event request.cancelled).",
    perform: async (z) =>
      byTimeDesc(
        (await requests(z))
          .filter((r) => r.status === "DECLINED" || r.status === "CANCELLED")
          .map((r) => {
            const declined = (r.signers || []).find((s) => s.status === "DECLINED");
            return { id: `${r.id}:${r.status}`, _at: time(r.createdAt), ...requestItem(r, r.status === "DECLINED" ? "signer.declined" : "request.cancelled", declined ? { signer: { name: declined.name, email: declined.email, role: declined.role, order: declined.order } } : {}) };
          }),
      ),
    sample: { id: `${REQUEST_SAMPLE.request_id}:DECLINED`, event: "signer.declined", ...REQUEST_SAMPLE, status: "DECLINED" },
  }),
];
