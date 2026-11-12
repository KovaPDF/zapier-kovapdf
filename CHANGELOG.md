# Changelog

## 1.0.0 (10 Nov 2026, not yet pushed to Zapier)

- Authentication: API key (Bearer), tested with `GET /api/v1/me`.
- Triggers (polling): Signature Request Sent, Signed by a Signer, Signature Request Completed, Signature Request Declined or Cancelled. Each item carries the KovaPDF webhook event name.
- Actions: one per KovaPDF tool (generated from KovaPDF's tool manifest), Send Document for Signature, Verify Signatures in PDF.
- Search: Find Job Result, for jobs that run longer than one Zapier step.
- Honours Retry-After within the step's time and hands longer waits to Zapier as a throttled retry; checks jobs no more often than every 2 seconds; at most 2 calls at once; plain messages for paused connections and tools.
