# KovaPDF for Zapier

A Zapier Platform CLI app for [KovaPDF](https://www.kovapdf.com): compress, merge, split, convert, read, redact and verify PDF files, convert Bangla and Hindi text, and send PDFs for signature.

Work done by this app is done with KovaPDF ([www.kovapdf.com](https://www.kovapdf.com)). Every tool result carries the line "Done with KovaPDF (kovapdf.com)."

## What it does

**Triggers** (polling, at your Zapier plan's polling interval):

* Signature Request Sent (`request.sent`)
* Signed by a Signer (`signer.signed`)
* Signature Request Completed (`request.completed`)
* Signature Request Declined or Cancelled (`signer.declined`, `request.cancelled`)

KovaPDF's webhook endpoints are created in the KovaPDF dashboard while signed in, not with an API key, so Zapier cannot subscribe to them by itself. The triggers therefore poll `GET /api/v1/sign-requests`. If KovaPDF later lets an API key create webhook endpoints, these can become instant REST hook triggers.

**Actions**: one per KovaPDF tool (Check PDF signatures, Compress PDF, Merge PDFs, Split PDF, Reorder, rotate or delete pages, Convert files, Read text from a scan, Redact a PDF, Bijoy to Unicode, Unicode to Bijoy, Kruti Dev to Unicode), plus Send Document for Signature and Verify Signatures in PDF.

**Search**: Find Job Result.

Each tool action reads the file from the file field, uploads it to KovaPDF, starts a job and waits for it. Zapier gives one step about 30 seconds, so the action waits at most about 22 seconds. A job that is still running then is returned with `done: false` and its `job_id`: add a Delay step and then **Find Job Result** with that ID. Result files are copied into Zapier when there is time; the download links work for 15 minutes either way.

## Setup

1. Make an API key in your KovaPDF dashboard at [www.kovapdf.com/dashboard/api](https://www.kovapdf.com/dashboard/api).
2. In Zapier, connect KovaPDF and paste the key. Zapier checks it with `GET /api/v1/me`.

## Limits and good manners

* Every job uses your KovaPDF account's usual limits.
* When KovaPDF is busy or a limit is reached, the app waits as long as KovaPDF asks (Retry-After) if that fits in the step; otherwise Zapier tries the step again later.
* A running job is checked no more often than every 2 seconds.
* At most 2 calls at once.
* If KovaPDF has paused connections from Zapier, or paused one tool for apps, the step says so in plain words and nothing is changed.

## Development

```
npm ci
npm test                        # createAppTester + nock, node:test
npx zapier-platform-cli validate  # needs the Zapier CLI
```

The tool list (`lib/tools.generated.js`) is generated from KovaPDF's tool manifest by `backend/scripts/automation-generate.ts` in the KovaPDF repository. Do not edit it by hand.

## Publishing (owner)

`zapier login`, `zapier register "KovaPDF"` (this writes `.zapierapprc`, which is not committed), `zapier push`. Then submit the integration for review in the Zapier developer platform. Nothing here does that automatically.

## Licence

MIT for the code (see LICENSE). The KovaPDF name and logo are not licensed under it (see NOTICE).
