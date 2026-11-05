"use client";

import { useCallback, useEffect, useState } from "react";
import { discordRefreshChannel, discordStatus, discordStep, type DiscordStatus } from "@/app/actions";

const REFRESHABLE = [
  { name: "plans", label: "Update #plans", hint: "Weekly & monthly subscriptions" },
  { name: "services", label: "Update #services", hint: "One-off services" },
  { name: "faq", label: "Update #faq", hint: "FAQ answers" },
  { name: "how-to-order", label: "Update #how-to-order", hint: "Steps, payment methods, queue" },
  { name: "queue-status", label: "Update #queue-status", hint: "Open / paused" },
];

/** Re-post a single info channel from the current site content — nothing else in the server changes. */
function RefreshPosts() {
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, string>>({});
  return (
    <section className="panel asec" style={{ gridColumn: "1 / -1" }}>
      <h2 className="label bare">Update a channel&apos;s info posts</h2>
      <p className="muted" style={{ margin: "10px 0 16px", fontSize: 15 }}>
        Changed prices or text on the website? Re-post just that channel. Only the bot&apos;s own posts there are replaced — members&apos; messages and every other channel
        stay as they are. New offers are posted to #limited-offers automatically when you publish them.
      </p>
      <div className="refresh-grid">
        {REFRESHABLE.map((c) => (
          <div key={c.name} className="refresh-item">
            <button
              className={`btn sm ${c.name === "plans" ? "" : "ghost"}`}
              disabled={!!busy}
              onClick={async () => {
                setBusy(c.name);
                const r = await discordRefreshChannel(c.name);
                setBusy(null);
                setResult((x) => ({ ...x, [c.name]: r.ok ? `✓ ${r.done.join(" ")}` : `✕ ${r.message ?? "failed"}` }));
              }}
            >
              {busy === c.name ? "Updating…" : c.label}
            </button>
            <span className="help">{result[c.name] ?? c.hint}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Admin → Discord: preview, then rebuild the whole server in one go. */
export function DiscordSetup() {
  const [status, setStatus] = useState<DiscordStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState("");
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setStatus(await discordStatus());
    setLoading(false);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
    refresh();
  }, [refresh]);

  const add = (line: string) => setLog((l) => [...l, line]);

  async function build() {
    if (!status?.ok || !status.guild) return;
    setRunning(true);
    setFinished(false);
    setLog([]);
    add("Deleting old channels…");
    const del = await discordStep("delete");
    if (!del.ok) return stop(del.message);
    add(`  ✓ deleted ${del.done.length}${del.failed.length ? ` · couldn't delete: ${del.failed.join(", ")}` : ""}`);
    add("Creating roles…");
    const roles = await discordStep("roles");
    if (!roles.ok) return stop(roles.message);
    add(`  ✓ ${roles.done.length ? roles.done.join(", ") : "all roles already there"}${roles.failed.length ? ` · failed: ${roles.failed.join(", ")}` : ""}`);
    for (let i = 0; i < status.plan.length; i++) {
      add(`Building ${status.plan[i].name}…`);
      const r = await discordStep("category", i);
      if (!r.ok) return stop(r.message);
      add(`  ✓ ${r.done.join("  ")}${r.failed.length ? ` · failed: ${r.failed.join(", ")}` : ""}`);
    }
    add("Done.");
    setRunning(false);
    setFinished(true);
    setConfirm("");
    refresh();
  }
  function stop(msg?: string) {
    add(`✕ Stopped: ${msg ?? "unknown error"}`);
    setRunning(false);
  }

  if (loading && !status) return <p className="muted">Checking your Discord bot…</p>;

  if (!status?.ok && status?.reason === "no-token") {
    return (
      <section className="panel asec" style={{ maxWidth: 760 }}>
        <h2 className="label bare">Discord bot not connected yet</h2>
        <p className="muted" style={{ margin: "12px 0" }}>
          Add your bot&apos;s token in Vercel as <code className="mono acc">DISCORD_BOT_TOKEN</code>, redeploy, then come back here.
        </p>
      </section>
    );
  }
  if (!status?.ok) {
    return (
      <section className="panel asec" style={{ maxWidth: 760 }}>
        <h2 className="label bare">Couldn&apos;t reach Discord</h2>
        <p className="err" style={{ margin: "12px 0" }}>{status?.message}</p>
        <button className="btn ghost sm" onClick={refresh}>
          Try again
        </button>
      </section>
    );
  }

  return (
    <div className="agrid">
      <section className="panel asec">
        <h2 className="label bare">1 · Your server</h2>
        {status.guild ? (
          <p style={{ margin: "12px 0" }}>
            Bot is in <b className="acc">{status.guild.name}</b>.
          </p>
        ) : (
          <>
            <p className="muted" style={{ margin: "12px 0" }}>
              {status.guildCount > 1
                ? "The bot is in more than one server — remove it from the others, or tell Claude the server ID to use."
                : "The bot isn't in your server yet. Open this link, pick your server and press Authorize:"}
            </p>
            {status.inviteUrl && (
              <a className="btn btn-block" href={status.inviteUrl} target="_blank" rel="noopener noreferrer">
                Add bot to my server
              </a>
            )}
            <button className="linkish" style={{ marginTop: 12 }} onClick={refresh}>
              I&apos;ve added it — check again
            </button>
          </>
        )}
        {status.guild && (
          <>
            <h3 className="mono dim" style={{ fontSize: 11, letterSpacing: ".14em", margin: "16px 0 8px" }}>
              WILL BE DELETED ({status.channels.length})
            </h3>
            <p className="muted" style={{ fontSize: 14, lineHeight: 1.7 }}>
              {status.channels.length ? status.channels.join("  ·  ") : "Nothing — the server has no channels."}
            </p>
            <h3 className="mono dim" style={{ fontSize: 11, letterSpacing: ".14em", margin: "16px 0 8px" }}>
              ROLES KEPT
            </h3>
            <p className="muted" style={{ fontSize: 14 }}>{status.roles.length ? status.roles.join(", ") : "—"}</p>
          </>
        )}
      </section>

      <section className="panel asec">
        <h2 className="label bare">2 · What gets built</h2>
        {status.plan.map((c) => (
          <p key={c.name} style={{ margin: "10px 0", fontSize: 14 }}>
            <b>{c.name}</b>
            <br />
            <span className="muted">{c.channels.join("  ")}</span>
          </p>
        ))}
        <p className="muted" style={{ fontSize: 14, marginTop: 12 }}>
          New roles: {status.newRoles.length ? status.newRoles.join(", ") : "all already exist"}
        </p>
        <p className="help" style={{ marginTop: 8 }}>
          Plans, services, FAQ and offers are posted from your current site content.
        </p>
      </section>

      {status.guild && <RefreshPosts />}

      {status.guild && (
        <section className="panel asec" style={{ gridColumn: "1 / -1" }}>
          <h2 className="label bare">3 · Build</h2>
          <p style={{ margin: "12px 0" }}>
            This <b>permanently deletes every channel</b> in {status.guild.name} (and their messages), then builds the new layout. Type <b className="acc">DELETE</b> to
            confirm.
          </p>
          <div className="form" style={{ maxWidth: 520 }}>
            <div className="f">
              <label htmlFor="dc-confirm">Type DELETE</label>
              <input id="dc-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" disabled={running} />
            </div>
            <div className="f" style={{ alignSelf: "end" }}>
              <button className="btn btn-block" disabled={confirm !== "DELETE" || running} onClick={build}>
                {running ? "Building…" : "Build server"}
              </button>
            </div>
          </div>
          {log.length > 0 && (
            <pre className="instructions" style={{ marginTop: 18, whiteSpace: "pre-wrap" }} aria-live="polite">
              {log.join("\n")}
            </pre>
          )}
          {finished && (
            <p className="help" style={{ marginTop: 6 }}>
              Next: add Ticket Tool and put its button in #open-a-ticket (Claude will guide you), then give yourself the Owner role.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
