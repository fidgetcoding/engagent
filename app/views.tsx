"use client";
import { useState } from "react";
import { DIRECTION_KINDS, PLATFORMS, type Action, type BrandConfig, type Card, type DirectionKind, type Platform, type State } from "@/lib/types";

export interface P { state: State; config: BrandConfig; act: (a: Action) => Promise<boolean> }
const n = (v: number) => v.toLocaleString("en-US");
const newId = () => `c-${crypto.randomUUID().slice(0, 8)}`;

export function Board({ state, config, act }: P) {
  const [title, setTitle] = useState("");
  const add = async () => { if (!title.trim()) return; const draft = title; if (await act({ type: "card.add", card: { id: newId(), title: title.trim(), type: config.contentTypes[0], stage: config.stages[0], platforms: state.platforms.slice(0, 1), due: null, brief: "", briefStatus: "none", sourceFindId: null, metrics: [] } })) setTitle(current => current === draft ? "" : current); };
  return <>
    <div className="row" style={{ marginBottom: 16 }}>
      <input aria-label="New content idea" maxLength={300} placeholder="New content idea" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
      <button className="primary" onClick={add}>Add idea</button>
    </div>
    <div className="kanban">{config.stages.map((stage) => (
      <section className="col" key={stage} onDragOver={(e) => e.preventDefault()} onDrop={(e) => act({ type: "card.move", id: e.dataTransfer.getData("text"), stage })}>
        <h3>{stage} · {state.cards.filter((c) => c.stage === stage).length}</h3>
        {state.cards.filter((c) => c.stage === stage).map((c) => (
          <article className="card" key={c.id} draggable onDragStart={(e) => e.dataTransfer.setData("text", c.id)}>
            <p>{c.title}</p>
            <div className="meta">{c.type} · {c.platforms.join(", ")}{c.due ? ` · ${c.due}` : ""}</div>
            <select aria-label={`Stage for ${c.title}`} value={c.stage} style={{ marginTop: 8 }} onChange={(e) => act({ type: "card.move", id: c.id, stage: e.target.value })}>{config.stages.map((s) => <option key={s}>{s}</option>)}</select>
          </article>))}
      </section>))}
    </div>
  </>;
}

export function Timeline({ state, act }: P) {
  const dated = state.cards.filter((c) => c.due).sort((a, b) => a.due!.localeCompare(b.due!));
  const undated = state.cards.filter((c) => !c.due);
  return <>
    <h2>Timeline</h2>
    {dated.length === 0 && <p className="meta">No dates yet. Give an idea a date below.</p>}
    <div className="tl">{dated.map((c) => <div style={{ display: "contents" }} key={c.id}><input type="date" aria-label={`Date for ${c.title}`} value={c.due!} onChange={(e) => act({ type: "card.due", id: c.id, due: e.target.value || null })} /><div className="bar">{c.title} <span className="meta">· {c.stage}</span></div></div>)}</div>
    {undated.length > 0 && <><h2 style={{ marginTop: 24 }}>Needs a date</h2>{undated.map((c) => <div className="row" key={c.id} style={{ marginBottom: 8 }}><input type="date" aria-label={`Date for ${c.title}`} value="" onChange={(e) => act({ type: "card.due", id: c.id, due: e.target.value || null })} /><span>{c.title}</span></div>)}</>}
  </>;
}

function BriefCard({ card, config, act }: { card: Card; config: BrandConfig; act: P["act"] }) {
  const [text, setText] = useState(card.brief);
  return <article className="card">
    <p><b>{card.title}</b></p>
    <textarea aria-label={`Brief for ${card.title}`} maxLength={20000} placeholder="Hook, shots, references, call to action" value={text} onChange={(e) => setText(e.target.value)} />
    <div className="row spread" style={{ marginTop: 8 }}>
      <span className="meta">{({ none: "Draft", pending: "Waiting for approval", approved: "Approved", changes: "Changes requested" })[card.briefStatus]}</span>
      <span className="row">
        <button onClick={() => act({ type: "card.brief", id: card.id, brief: text, approvals: config.approvals })}>{config.approvals ? "Send for approval" : "Save"}</button>
        {config.approvals && card.briefStatus === "pending" && <><button onClick={() => act({ type: "card.review", id: card.id, decision: "changes" })}>Request changes</button><button className="primary" onClick={() => act({ type: "card.review", id: card.id, decision: "approved" })}>Approve</button></>}
      </span>
    </div>
  </article>;
}
export function Briefs({ state, config, act }: P) {
  return <><h2>Briefs{config.approvals ? " and approvals" : ""}</h2><div className="grid">{state.cards.map((c) => <BriefCard key={c.id} card={c} config={config} act={act} />)}</div>{state.cards.length === 0 && <p className="meta">Add an idea to the board first.</p>}</>;
}

export function Finds({ state, config, act }: P) {
  const fresh = state.finds.filter((f) => f.status === "new").sort((a, b) => b.views - a.views);
  return <>
    <h2>New finds</h2>
    <p className="meta">Scans run from Telegram with /scan. Each is capped at ${config.caps.perRunUsd} per search and ${config.caps.perMonthUsd} per month.</p>
    {fresh.length === 0 && <p className="meta">Nothing to review.</p>}
    <div className="grid">{fresh.map((f) => <article className="card" key={f.id}>
      <p>{f.caption}</p>
      <div className="meta" style={{ marginBottom: 8 }}>{f.platform} · {f.author} · {n(f.views)} views · {f.matched}</div>
      <div className="row"><button className="primary" onClick={() => act({ type: "find.approve", id: f.id, cardId: newId(), firstStage: config.stages[0], contentType: config.contentTypes[0] })}>Add to board</button><button onClick={() => act({ type: "find.skip", id: f.id })}>Skip</button></div>
    </article>)}</div>
  </>;
}

const LABELS: Record<DirectionKind, string> = { account: "Accounts to watch", hashtag: "Hashtags you like", reference: "Video references", topic: "Topics to engage with", avoid: "Things to avoid" };
export function Directions({ state, act }: P) {
  const [drafts, setDrafts] = useState<Partial<Record<DirectionKind, string>>>({});
  return <>
    <h2>Platforms</h2>
    <div className="row" style={{ marginBottom: 24 }}>{PLATFORMS.map((p: Platform) => <label className="row" key={p}><input type="checkbox" checked={state.platforms.includes(p)} onChange={() => act({ type: "platform.toggle", platform: p })} />{p}</label>)}</div>
    <div className="grid">{DIRECTION_KINDS.map((kind) => {
      const add = async () => { const draft = drafts[kind]; if (!draft?.trim()) return; if (await act({ type: "direction.add", direction: { kind, value: draft } })) setDrafts(current => current[kind] === draft ? { ...current, [kind]: "" } : current); };
      return <section className="card" key={kind}>
        <h2>{LABELS[kind]}</h2>
        <div>{state.directions.filter((d) => d.kind === kind).map((d) => <span className="chip" key={d.value}>{d.value}<button aria-label={`Remove ${d.value}`} onClick={() => act({ type: "direction.remove", direction: d })}>×</button></span>)}</div>
        <div className="row"><input aria-label={`Add to ${LABELS[kind]}`} maxLength={300} value={drafts[kind] ?? ""} onChange={(e) => setDrafts({ ...drafts, [kind]: e.target.value })} onKeyDown={(e) => e.key === "Enter" && add()} /><button onClick={add}>Add</button></div>
      </section>;
    })}</div>
  </>;
}

export function Performance({ state, act }: P) {
  const rows = state.cards.flatMap((c) => c.metrics.map((m) => ({ c, m })));
  const sum = (k: "views" | "likes" | "comments" | "shares") => rows.reduce((t, r) => t + r.m[k], 0);
  const [form, setForm] = useState({ id: "", platform: state.platforms[0] ?? "tiktok", views: "", likes: "", comments: "", shares: "" });
  const cardId = form.id || state.cards[0]?.id;
  const num = (v: string) => v.trim() === "" ? 0 : Number(v.replace(/,/g, ""));
  const save = async () => { if (!cardId) return; const draft = form; if (await act({ type: "metric.log", id: cardId, metric: { platform: form.platform as Platform, views: num(form.views), likes: num(form.likes), comments: num(form.comments), shares: num(form.shares), at: new Date().toISOString() } })) setForm(current => current === draft ? { ...current, views: "", likes: "", comments: "", shares: "" } : current); };
  return <>
    <div className="stats">{(["views", "likes", "comments", "shares"] as const).map((k) => <div className="card stat" key={k}><b>{n(sum(k))}</b><span className="meta">{k}</span></div>)}</div>
    <h2>Log results</h2>
    <div className="row" style={{ marginBottom: 20 }}>
      <select aria-label="Content" value={cardId} onChange={(e) => setForm({ ...form, id: e.target.value })}>{state.cards.map((c) => <option key={c.id} value={c.id}>{c.title.slice(0, 40)}</option>)}</select>
      <select aria-label="Platform" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value as Platform })}>{PLATFORMS.map((p) => <option key={p}>{p}</option>)}</select>
      {(["views", "likes", "comments", "shares"] as const).map((k) => <input key={k} aria-label={k} placeholder={k} inputMode="numeric" size={8} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />)}
      <button className="primary" onClick={save}>Save</button>
    </div>
    <div className="scroll"><table><thead><tr><th>Content</th><th>Platform</th><th className="num">Views</th><th className="num">Likes</th><th className="num">Comments</th><th className="num">Shares</th></tr></thead>
      <tbody>{rows.map(({ c, m }, i) => <tr key={i}><td>{c.title}</td><td>{m.platform}</td><td className="num">{n(m.views)}</td><td className="num">{n(m.likes)}</td><td className="num">{n(m.comments)}</td><td className="num">{n(m.shares)}</td></tr>)}</tbody></table></div>
  </>;
}

export function TelegramPreview({ config }: { config: BrandConfig }) {
  return <><h2>How it works in Telegram</h2><p className="meta">An illustration. The real bot needs your own Telegram token.</p><div className="chat">
    <p className="msg me">/watch hashtag {config.directions.find((d) => d.kind === "hashtag")?.value ?? "yourtag"}</p>
    <p className="msg">Watching that hashtag.</p>
    <p className="msg me">/scan</p>
    <p className="msg">Found 4 new, spent $0.80. Add to board or skip each one.</p>
    <p className="msg me">/log 2 {config.platforms[0]} views=1200 likes=80</p>
    <p className="msg">Logged 1,200 views on {config.platforms[0]}.</p>
  </div></>;
}
