"use strict";
const { version } = require("./package.json");
const { version: platformVersion } = require("zapier-platform-core");
const authentication = require("./authentication");
const { API_BASE } = require("./lib/tools.generated");
const { USER_AGENT } = require("./lib/client");
const triggers = require("./triggers/signatureEvents");
const tools = require("./creates/tools");
const signatureRequest = require("./creates/signatureRequest");
const verify = require("./creates/verify");
const findJobResult = require("./searches/findJobResult");

/** Every call says who is calling; the key goes only to KovaPDF's API, never to download links or file hosts. */
const addHeaders = (request, z, bundle) => {
  request.headers = request.headers || {};
  // Zapier sets "user-agent: Zapier"; replace it rather than add a second value.
  for (const k of Object.keys(request.headers)) if (k.toLowerCase() === "user-agent") delete request.headers[k];
  request.headers["user-agent"] = USER_AGENT;
  const url = String(request.url || "");
  if (url.startsWith(API_BASE)) {
    request.headers["X-KovaPDF-Client"] = "zapier";
    if (!url.startsWith(`${API_BASE}/downloads/`) && bundle.authData && bundle.authData.api_key) {
      request.headers.Authorization = `Bearer ${bundle.authData.api_key}`;
    }
  }
  return request;
};

const byKey = (list) => Object.fromEntries(list.map((x) => [x.key, x]));

module.exports = {
  version,
  platformVersion,
  authentication,
  flags: { cleanInputData: false },
  beforeRequest: [addHeaders],
  triggers: byKey(triggers),
  creates: byKey([...tools, signatureRequest, verify]),
  searches: byKey([findJobResult]),
};
