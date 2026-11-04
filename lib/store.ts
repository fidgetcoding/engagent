import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import lockfile from "proper-lockfile";
import { isState } from "./validation";
import config from "../engagent.config";
import { applyAction, initialState } from "./reducer";
import type { Action, State } from "./types";

export interface Store {
  read(): Promise<State>;
  apply(action: Action): Promise<State>;
  // Synchronous updater: never hold the disk lock across a network call.
  update(fn: (state: State) => State): Promise<State>;
}

// All web requests and bot processes lock the same path before read/modify/write.
export function fileStore(file = process.env.ENGAGENT_DATA ?? path.join(process.cwd(), "data", "engagent.json")): Store {
  file = path.resolve(file);
  const read = async (): Promise<State> => {
    try {
      const parsed: unknown = JSON.parse(await fs.readFile(file, "utf8"));
      if (!isState(parsed)) throw new Error("Invalid workspace data; restore a valid backup before writing.");
      return parsed;
    }
    catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return initialState(config); throw e; }
  };
  const update: Store["update"] = async (fn) => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const release = await lockfile.lock(file, {
      realpath: false, stale: 10000, update: 2000,
      retries: { retries: 100, minTimeout: 20, maxTimeout: 200, factor: 1.2, randomize: true },
    });
    const tmp = `${file}.${process.pid}.${randomUUID()}.tmp`;
    try {
      const current = await read();
      const next = fn(current);
      if (next === current) return current;
      if (!isState(next)) throw new Error("Invalid workspace update.");
      const handle = await fs.open(tmp, "wx", 0o600);
      try { await handle.writeFile(JSON.stringify(next)); await handle.sync(); }
      finally { await handle.close(); }
      await fs.rename(tmp, file);
      // Make the rename durable before starting a paid run using its reservation.
      const directory = await fs.open(path.dirname(file), "r");
      try { await directory.sync(); } finally { await directory.close(); }
      return next;
    } finally {
      try { await fs.rm(tmp, { force: true }); } finally { await release(); }
    }
  };
  return { read, update, apply: (action) => update(s => applyAction(s, action)) };
}
