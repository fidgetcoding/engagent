"use client";
import { useEffect, useState } from "react";
import { applyAction } from "@/lib/reducer";
import type { Action, BrandConfig, State } from "@/lib/types";
import { Board, Briefs, Directions, Finds, Performance, Timeline, TelegramPreview } from "./views";

const TABS = ["Board", "Timeline", "Briefs", "Finds", "Directions", "Performance", "Telegram"] as const;
type Tab = (typeof TABS)[number];
const KEY = "engagent-demo-v1";

export default function App({ config, demo, initial }: { config: BrandConfig; demo: boolean; initial: State }) {
  const [state, setState] = useState(initial);
  const [tab, setTab] = useState<Tab>("Board");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!demo) return;
    try { const saved = localStorage.getItem(`${KEY}-${config.brand.name}`); if (saved) setState(JSON.parse(saved)); } catch { /* the sample data still works */ }
  }, [demo, config.brand.name]);

  async function act(a: Action) {
    setError("");
    if (demo) {
      setState((s) => { const n = applyAction(s, a); try { localStorage.setItem(`${KEY}-${config.brand.name}`, JSON.stringify(n)); } catch { /* keep going in memory */ } return n; });
      return;
    }
    const r = await fetch("/api/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(a) });
    if (r.ok) setState(await r.json()); else setError("That didn't save. Try again.");
  }
  function reset() { try { localStorage.removeItem(`${KEY}-${config.brand.name}`); } catch { /* nothing stored */ } setState(initial); }
  const props = { state, config, act };

  return <>
    {demo && <div className="demo row spread"><span>Sample brand and data. Changes stay in your browser, with no login, keys or paid calls.</span><button onClick={reset}>Reset demo</button></div>}
    <header>
      <h1>{config.brand.name}</h1>
      <p className="tag">{config.brand.tagline}</p>
      <nav>{TABS.map((t) => <button key={t} aria-current={tab === t ? "page" : undefined} onClick={() => setTab(t)}>{t}</button>)}</nav>
    </header>
    <main>
      {error && <p role="alert">{error}</p>}
      {tab === "Board" && <Board {...props} />}
      {tab === "Timeline" && <Timeline {...props} />}
      {tab === "Briefs" && <Briefs {...props} />}
      {tab === "Finds" && <Finds {...props} />}
      {tab === "Directions" && <Directions {...props} />}
      {tab === "Performance" && <Performance {...props} />}
      {tab === "Telegram" && <TelegramPreview config={config} />}
    </main>
  </>;
}
