import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";

test("malformed Basic credentials return 401 rather than throwing", () => {
  const oldDemo = process.env.ENGAGENT_DEMO;
  const oldPassword = process.env.ENGAGENT_PASSWORD;
  process.env.ENGAGENT_DEMO = "0"; process.env.ENGAGENT_PASSWORD = "local-test-password";
  try {
    assert.equal(middleware(new NextRequest("http://localhost/", { headers: { authorization: "Basic %%%%" } })).status, 401);
    assert.equal(middleware(new NextRequest("http://localhost/", { headers: { authorization: `Basic ${btoa("local-test-password")}` } })).status, 401);
  } finally {
    if (oldDemo === undefined) delete process.env.ENGAGENT_DEMO; else process.env.ENGAGENT_DEMO = oldDemo;
    if (oldPassword === undefined) delete process.env.ENGAGENT_PASSWORD; else process.env.ENGAGENT_PASSWORD = oldPassword;
  }
});
