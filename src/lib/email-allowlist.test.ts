import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { isEmailAllowed } from "./email-allowlist";

const ORIGINAL = process.env.ALLOWED_EMAILS;

describe("isEmailAllowed", () => {
  beforeEach(() => {
    delete process.env.ALLOWED_EMAILS;
  });

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.ALLOWED_EMAILS;
    else process.env.ALLOWED_EMAILS = ORIGINAL;
  });

  it("allows any address when no allowlist is configured", () => {
    assert.equal(isEmailAllowed("anyone@example.com"), true);
  });

  it("allows any address when the allowlist is blank or only separators", () => {
    process.env.ALLOWED_EMAILS = "   ";
    assert.equal(isEmailAllowed("anyone@example.com"), true);

    process.env.ALLOWED_EMAILS = " , ,, ";
    assert.equal(isEmailAllowed("anyone@example.com"), true);
  });

  it("allows a listed address and rejects an unlisted one", () => {
    process.env.ALLOWED_EMAILS = "eltern@example.de,freund@example.com";
    assert.equal(isEmailAllowed("eltern@example.de"), true);
    assert.equal(isEmailAllowed("freund@example.com"), true);
    assert.equal(isEmailAllowed("fremder@example.com"), false);
  });

  it("compares case-insensitively and ignores surrounding whitespace", () => {
    process.env.ALLOWED_EMAILS = "  Eltern@Example.DE , freund@example.com ";
    assert.equal(isEmailAllowed("eltern@example.de"), true);
    assert.equal(isEmailAllowed("ELTERN@EXAMPLE.DE"), true);
    assert.equal(isEmailAllowed(" eltern@example.de "), true);
  });

  it("rejects missing addresses once an allowlist is configured", () => {
    process.env.ALLOWED_EMAILS = "eltern@example.de";
    assert.equal(isEmailAllowed(undefined), false);
    assert.equal(isEmailAllowed(null), false);
    assert.equal(isEmailAllowed(""), false);
  });

  it("does not treat a listed address as a prefix match", () => {
    process.env.ALLOWED_EMAILS = "eltern@example.de";
    assert.equal(isEmailAllowed("eltern@example.de.evil.com"), false);
    assert.equal(isEmailAllowed("xeltern@example.de"), false);
  });

  it("reads the environment on every call, not once at import time", () => {
    assert.equal(isEmailAllowed("late@example.com"), true);
    process.env.ALLOWED_EMAILS = "eltern@example.de";
    assert.equal(isEmailAllowed("late@example.com"), false);
  });
});
