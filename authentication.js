"use strict";
const { call } = require("./lib/client");

module.exports = {
  type: "custom",
  fields: [
    {
      key: "api_key",
      label: "API Key",
      type: "password",
      required: true,
      helpText: "Your KovaPDF API key. Make one in your KovaPDF dashboard at [www.kovapdf.com/dashboard/api](https://www.kovapdf.com/dashboard/api). It starts with kova_test_ or kova_live_.",
    },
  ],
  // GET /me: the account the key belongs to.
  test: async (z) => call(z, { path: "/me" }),
  connectionLabel: (z, bundle) => {
    const a = (bundle.inputData && bundle.inputData.account) || {};
    return a.email || a.name || "KovaPDF";
  },
};
