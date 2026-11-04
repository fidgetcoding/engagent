"use client";
import { useEffect, useRef, useState } from "react";
import { applyAction } from "@/lib/reducer";
import { isBrowserAction, isState } from "@/lib/validation";
import type { Action, BrandConfig, State } from "@/lib/types";
import { Board, Briefs, Directions, Finds, Performance, Timeline, TelegramPreview } from "./views";

const TABS = ["Board", "Timeline", "Briefs", "Finds", "Directions", "Performance", "Telegram"] as const;
type Tab = (typeof TABS)[number];
const KEY = "engagent-demo-v1";

export default function App({ config, demo, initial }: { config: BrandConfig; demo: boolean; initial: State }) {
  const [state, setState] = useState(initial);
  const [tab, setTab] = useState<Tab>("Board");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(!demo);
  const [revision, setRevision] = useState(0);
  const saveBlocked = useRef(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const demoState = useRef(initial);

  useEffect(() => {
    if (!demo) return;
    try {
      const saved = localStorage.getItem(`${KEY}-${config.brand.name}`);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (isState(parsed)) { demoState.current = parsed; setState(parsed); }
        else setError("Saved demo data is invalid. Showing sample data; Reset demo clears the saved copy.");
      }
    } catch { setError("Saved demo data could not be loaded. Showing sample data."); }
    setReady(true);
  }, [demo, config.brand.name]);

  async function act(a: Action) {
    if (!isBrowserAction(a, config)) { setError("Enter valid values before saving. Metrics must be nonnegative whole numbers."); return false; }
    if (demo) {
      setError("");
      const next = applyAction(demoState.current, a);
      demoState.current = next;
      setState(next);
      try { localStorage.setItem(`${KEY}-${config.brand.name}`, JSON.stringify(next)); }
      catch { setError("Browser storage is unavailable. Changes will last until this page closes."); }
      return true;
    }
    // Serialize requests as well as responses: the server must see user intent in order.
    const save = queue.current.then(async () => {
      if (saveBlocked.current) return false;
      setError("");
      try {
        const r = await fetch("/api/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(a), signal: AbortSignal.timeout(15000) });
        if (!r.ok) throw new Error("Save failed");
        const next: unknown = await r.json();
        if (!isState(next)) throw new Error("Invalid server state");
        setState(next);
        return true;
      } catch { saveBlocked.current = true; setError("That save could not be confirmed. Reload to check before trying again."); return false; }
    });
    queue.current = save;
    return await save;
  }
  function reset() {
    try { localStorage.removeItem(`${KEY}-${config.brand.name}`); setError(""); }
    catch { setError("Browser storage is unavailable. The demo was reset in this tab."); }
    demoState.current = initial;
    setState(initial);
    setRevision(r => r + 1);
  }
  const props = { state, config, act };

  return <>
    {demo && <div className="demo row spread"><span>Sample brand and data. Changes stay in your browser, with no login, keys or paid calls.</span><button onClick={reset} disabled={!ready}>Reset demo</button></div>}
    <header>
      <h1>{config.brand.name}</h1>
      <p className="tag">{config.brand.tagline}</p>
      <nav>{TABS.map((t) => <button key={t} aria-current={tab === t ? "page" : undefined} onClick={() => setTab(t)}>{t}</button>)}</nav>
    </header>
    <main key={revision}>
      {error && <p role="alert">{error}</p>}
      {!ready ? <p role="status">Loading workspace…</p> : <>
        {tab === "Board" && <Board {...props} />}
        {tab === "Timeline" && <Timeline {...props} />}
        {tab === "Briefs" && <Briefs {...props} />}
        {tab === "Finds" && <Finds {...props} />}
        {tab === "Directions" && <Directions {...props} />}
        {tab === "Performance" && <Performance {...props} />}
        {tab === "Telegram" && <TelegramPreview config={config} />}
      </>}
    </main>
  </>;
}
