import assert from "node:assert/strict";
import test from "node:test";
import { apifyRunner } from "../lib/scan";

test("failed Apify dataset requests report failure instead of empty success", async () => {
  let requests = 0;
  const runner = apifyRunner("fake-test-token", async () => {
    requests++;
    return requests === 1
      ? Response.json({ data: { id: "r", status: "SUCCEEDED", usageTotalUsd: 0.2, defaultDatasetId: "d" } })
      : new Response("unavailable", { status: 503 });
  });
  await assert.rejects(runner("fake~actor", { resultsPerPage: 5 }, 1), /dataset.*503/);
});
