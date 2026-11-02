import { promises as fs } from "node:fs";
import path from "node:path";
import config from "../engagent.config";
import { applyAction, initialState } from "./reducer";
import type { Action, State } from "./types";

export interface Store { read(): Promise<State>; apply(action: Action): Promise<State> }

// One JSON file, so a brand needs no database. Writes are queued and swapped in atomically.
export function fileStore(file = process.env.ENGAGENT_DATA ?? path.join(process.cwd(), "data", "engagent.json")): Store {
  let queue: Promise<unknown> = Promise.resolve();
  const read = async (): Promise<State> => {
    try { return JSON.parse(await fs.readFile(file, "utf8")) as State; }
    catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return initialState(config); throw e; }
  };
  const apply = (action: Action) => {
    const run = queue.then(async () => {
      const next = applyAction(await read(), action);
      await fs.mkdir(path.dirname(file), { recursive: true });
      const tmp = `${file}.${process.pid}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(next, null, 2));
      await fs.rename(tmp, file);
      return next;
    });
    queue = run.catch(() => undefined);
    return run;
  };
  return { read, apply };
}
