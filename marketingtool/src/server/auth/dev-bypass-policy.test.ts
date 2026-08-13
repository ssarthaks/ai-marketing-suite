import assert from "node:assert/strict";
import test from "node:test";

import {
  canUseDevelopmentAuthBypass,
  getDevelopmentAuthBypassEmail,
  isLoopbackAuthRequest,
} from "./dev-bypass-policy.ts";

const enabledDevelopment = {
  NODE_ENV: "development",
  DEV_AUTH_BYPASS: "true",
  DEV_AUTH_EMAIL: "Developer@Example.com",
};

test("enables bypass only for an explicit development configuration", () => {
  assert.equal(
    getDevelopmentAuthBypassEmail(enabledDevelopment),
    "developer@example.com",
  );
  assert.equal(
    getDevelopmentAuthBypassEmail({
      ...enabledDevelopment,
      NODE_ENV: "production",
    }),
    null,
  );
  assert.equal(
    getDevelopmentAuthBypassEmail({
      ...enabledDevelopment,
      NODE_ENV: "test",
    }),
    null,
  );
  assert.equal(
    getDevelopmentAuthBypassEmail({
      ...enabledDevelopment,
      DEV_AUTH_BYPASS: "TRUE",
    }),
    null,
  );
  assert.equal(
    getDevelopmentAuthBypassEmail({
      ...enabledDevelopment,
      DEV_AUTH_EMAIL: "",
    }),
    null,
  );
});

test("accepts only exact loopback HTTP(S) hostnames", () => {
  for (const url of [
    "http://localhost:3000/login",
    "https://localhost/login",
    "http://127.0.0.1:3000/login",
    "http://[::1]:3000/login",
  ]) {
    assert.equal(isLoopbackAuthRequest(url), true, url);
  }

  for (const url of [
    "https://localhost.evil.example/login",
    "https://example.com/login",
    "ftp://localhost/login",
    "https://user:password@localhost/login",
    "not a url",
  ]) {
    assert.equal(isLoopbackAuthRequest(url), false, url);
  }
});

test("production cannot enable bypass even with every variable set", () => {
  assert.equal(
    canUseDevelopmentAuthBypass("http://localhost:3000/login", {
      ...enabledDevelopment,
      NODE_ENV: "production",
    }),
    false,
  );
  assert.equal(
    canUseDevelopmentAuthBypass("https://marketing.example.com/login", {
      ...enabledDevelopment,
      NODE_ENV: "development",
    }),
    false,
  );
});
