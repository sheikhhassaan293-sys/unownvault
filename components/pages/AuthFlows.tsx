"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { themes } from "@/lib/themes";
import { usernameProblem } from "@/lib/username";
import { LogoMark } from "../Logo";
import { useSession, type DemoUser } from "../providers/Session";
import { useSettings } from "../providers/Settings";
import { Link } from "../providers/Transition";

const EASE = [0.2, 0.7, 0.2, 1] as const;
const pane = { initial: { opacity: 0, x: 24 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -24 }, transition: { duration: 0.28, ease: EASE } };

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 18, height: 18 }}>
      <path
        fill="currentColor"
        d="M19.6 5.3A16.6 16.6 0 0 0 15.5 4l-.5 1a15.3 15.3 0 0 0-6 0l-.5-1a16.5 16.5 0 0 0-4.1 1.3C1.8 9.2 1.1 13 1.4 16.8a16.7 16.7 0 0 0 5 2.6l1.1-1.7a10.8 10.8 0 0 1-1.7-.8l.4-.3a11.9 11.9 0 0 0 11.6 0l.4.3c-.5.3-1.1.6-1.7.8l1.1 1.7a16.6 16.6 0 0 0 5-2.6c.4-4.4-.7-8.2-3-11.5ZM8.7 14.5c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm6.6 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z"
      />
    </svg>
  );
}

function ProviderButtons({ onPick }: { onPick: (p: DemoUser["provider"]) => void }) {
  const { patreon_enabled } = useSettings();
  return (
    <>
      <button type="button" className="btn discord block" onClick={() => onPick("discord")}>
        <DiscordIcon /> Continue with Discord
      </button>
      {patreon_enabled && (
        <button type="button" className="btn patreon block" onClick={() => onPick("patreon")}>
          Continue with Patreon
        </button>
      )}
    </>
  );
}

/* ─────────────────────────── Sign up → trainer name → welcome ─────────────────────────── */
export function SignupFlow({ taken }: { taken: string[] }) {
  const router = useRouter();
  const { signIn } = useSession();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [provider, setProvider] = useState<DemoUser["provider"]>("email");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [formErr, setFormErr] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [check, setCheck] = useState<{ state: "idle" | "checking" | "ok" | "bad"; msg: string }>({ state: "idle", msg: "3–20 characters · letters, numbers, underscore" });
  const input = useRef<HTMLInputElement>(null);

  // live availability check (debounced, like the real API call will be)
  useEffect(() => {
    const v = name.trim();
    const problem = usernameProblem(v);
    /* eslint-disable react-hooks/set-state-in-effect -- validation status mirrors the input */
    if (!v) return setCheck({ state: "idle", msg: "3–20 characters · letters, numbers, underscore" });
    if (problem) return setCheck({ state: "bad", msg: problem });
    setCheck({ state: "checking", msg: "Checking…" });
    /* eslint-enable react-hooks/set-state-in-effect */
    const id = setTimeout(() => {
      if (taken.includes(v.toLowerCase())) setCheck({ state: "bad", msg: `✕ “${v}” is taken` });
      else setCheck({ state: "ok", msg: `✓ “${v}” is available` });
    }, 380);
    return () => clearTimeout(id);
  }, [name, taken]);

  useEffect(() => {
    if (step === 2) setTimeout(() => input.current?.focus(), 300);
  }, [step]);

  const toStep2 = (p: DemoUser["provider"]) => {
    setProvider(p);
    setStep(2);
  };

  const claim = () => {
    if (check.state !== "ok") return;
    signIn({ username: name.trim(), email: provider === "email" ? email : null, provider });
    setStep(3);
  };

  return (
    <>
      <div className="panel auth-card">
        <AnimatePresence mode="wait" initial={false}>
          {step === 1 && (
            <motion.div key="s1" {...pane}>
              <div className="label">Join the vault</div>
              <h1 className="h2">Create your account</h1>
              <p className="muted" style={{ marginBottom: 24 }}>
                Track orders, manage your plan and get quotes on custom requests.
              </p>
              <div className="stack">
                <ProviderButtons onPick={toStep2} />
                <div className="or">OR</div>
                <form
                  className="stack"
                  noValidate
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!/^\S+@\S+\.\S+$/.test(email)) return setFormErr("Enter a valid email");
                    if (pw.length < 8) return setFormErr("Password needs 8+ characters");
                    setFormErr(null);
                    toStep2("email");
                  }}
                >
                  <div className="f">
                    <label htmlFor="su-email">Email</label>
                    <input id="su-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
                  </div>
                  <div className="f">
                    <label htmlFor="su-pw">Password</label>
                    <input id="su-pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="8+ characters" />
                  </div>
                  {formErr && <span className="ustat bad">{formErr}</span>}
                  <button className="btn block" type="submit">
                    Create account
                  </button>
                </form>
                <p className="mono dim" style={{ fontSize: 12, textAlign: "center", marginTop: 6 }}>
                  Have an account?{" "}
                  <Link href="/login" className="linkish">
                    Log in
                  </Link>
                </p>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" {...pane}>
              <div className="label">Step 2 of 2</div>
              <h1 className="h2">Pick your trainer name</h1>
              <p className="muted" style={{ marginBottom: 24 }}>
                This is how you&apos;ll show up on orders and in Discord. You can&apos;t change it later.
              </p>
              <form
                className="stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  claim();
                }}
              >
                <div className="f">
                  <label htmlFor="su-name">Trainer name</label>
                  <input
                    ref={input}
                    id="su-name"
                    maxLength={20}
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    value={name}
                    onChange={(e) => setName(e.target.value.replace(/\s/g, ""))}
                    placeholder="e.g. NightHunter_7"
                    aria-describedby="su-name-status"
                    aria-invalid={check.state === "bad"}
                  />
                </div>
                <div id="su-name-status" className={`ustat ${check.state === "ok" ? "good" : check.state === "bad" ? "bad" : ""}`} aria-live="polite">
                  {check.msg}
                </div>
                <button className="btn block" type="submit" disabled={check.state !== "ok"}>
                  Claim name
                </button>
              </form>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: "center", padding: "26px 0 6px" }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.6, rotate: -30 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ delay: 0.95, duration: 0.6, ease: [0.2, 0.7, 0.2, 1.3] }}
                style={{ width: 84, height: 84, margin: "0 auto", color: "var(--acc)" }}
              >
                <LogoMark />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3, duration: 0.4 }}>
                <h1 className="h2" style={{ fontSize: 28, marginTop: 18 }}>
                  Welcome, <span className="acc">{name}</span>
                </h1>
                <p className="muted" style={{ margin: "8px 0 24px" }}>
                  The vault is open.
                </p>
                <button className="btn" onClick={() => router.push("/")}>
                  Enter
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {step === 3 && <WelcomeBars />}
    </>
  );
}

/** The five theme colours sweep across the screen, then resolve into the logo. */
function WelcomeBars() {
  const cols = (["abyss", "storm", "magma", "forest", "temple"] as const).map((k) => themes[k].accent);
  return (
    <div className="welcome-bars" aria-hidden="true">
      {cols.map((c, i) => (
        <motion.i
          key={c}
          style={{ top: `${i * 20}%`, background: c }}
          initial={{ x: "-101%" }}
          animate={{ x: ["-101%", "0%", "0%", "101%"] }}
          transition={{ duration: 1.1, times: [0, 0.45, 0.55, 1], ease: [0.7, 0, 0.3, 1], delay: i * 0.05 }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────── Log in ─────────────────────────── */
export function LoginForm() {
  const router = useRouter();
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const go = (provider: DemoUser["provider"]) => {
    signIn({ username: "NightHunter_7", email: provider === "email" ? email : null, provider });
    router.push("/account");
  };
  return (
    <div className="panel auth-card">
      <div className="label">Welcome back</div>
      <h1 className="h2">Log in</h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        Demo: any details work — you&apos;ll be signed in as a sample trainer.
      </p>
      <div className="stack">
        <ProviderButtons onPick={go} />
        <div className="or">OR</div>
        <form
          className="stack"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("Enter a valid email");
            go("email");
          }}
        >
          <div className="f">
            <label htmlFor="li-email">Email</label>
            <input id="li-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
          </div>
          <div className="f">
            <label htmlFor="li-pw">Password</label>
            <input id="li-pw" type="password" autoComplete="current-password" placeholder="••••••••" />
          </div>
          {err && <span className="ustat bad">{err}</span>}
          <button className="btn block" type="submit">
            Log in
          </button>
        </form>
        <p className="mono dim" style={{ fontSize: 12, textAlign: "center", marginTop: 6 }}>
          New here?{" "}
          <Link href="/signup" className="linkish">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
