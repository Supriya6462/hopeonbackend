import test from "node:test";
import assert from "node:assert/strict";
import dns from "node:dns/promises";

import {
  isDisposableEmail,
  validateEmailForOtp,
  validateEmailDomainReachability,
} from "../utils/validation.js";

test("isDisposableEmail blocks known disposable domains", () => {
  assert.equal(isDisposableEmail("person@mailinator.com"), true);
});

test("isDisposableEmail blocks disposable parent domain from subdomain", () => {
  assert.equal(isDisposableEmail("person@sub.mailinator.com"), true);
});

test("isDisposableEmail allows regular domains", () => {
  assert.equal(isDisposableEmail("person@gmail.com"), false);
  assert.equal(isDisposableEmail("person@company.org"), false);
});

test("validateEmailDomainReachability rejects non-existent domain", async () => {
  const originalResolveMx = dns.resolveMx;
  const originalResolve4 = dns.resolve4;
  const originalResolve6 = dns.resolve6;

  dns.resolveMx = async () => {
    const error = new Error("No MX record");
    error.code = "ENODATA";
    throw error;
  };
  dns.resolve4 = async () => {
    const error = new Error("Domain not found");
    error.code = "ENOTFOUND";
    throw error;
  };
  dns.resolve6 = async () => {
    const error = new Error("Domain not found");
    error.code = "ENOTFOUND";
    throw error;
  };

  try {
    const result = await validateEmailDomainReachability(
      "person@this-domain-should-not-exist-1234567890-example.com",
    );

    assert.equal(result.isValid, false);
    assert.equal(result.isUncertain, false);
  } finally {
    dns.resolveMx = originalResolveMx;
    dns.resolve4 = originalResolve4;
    dns.resolve6 = originalResolve6;
  }
});

test("validateEmailDomainReachability accepts common valid domain", async () => {
  const originalResolveMx = dns.resolveMx;

  dns.resolveMx = async () => [{ exchange: "mx.example.com", priority: 10 }];

  try {
    const result = await validateEmailDomainReachability("person@gmail.com");

    assert.equal(result.isValid, true);
    assert.equal(result.isUncertain, false);
  } finally {
    dns.resolveMx = originalResolveMx;
  }
});

test("validateEmailForOtp rejects malformed emails with code", async () => {
  const result = await validateEmailForOtp("not-an-email");

  assert.equal(result.isValid, false);
  assert.equal(result.code, "INVALID_EMAIL_FORMAT");
});

test("validateEmailForOtp rejects disposable domains with code", async () => {
  const result = await validateEmailForOtp("person@mailinator.com");

  assert.equal(result.isValid, false);
  assert.equal(result.code, "DISPOSABLE_EMAIL_BLOCKED");
});
