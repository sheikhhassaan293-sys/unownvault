"use client";

/** /reset — where the "reset your password" email link lands (already signed in by the link). */
import { useState } from "react";
import { sb } from "@/lib/supabase/browser";
import { LIVE } from "@/lib/supabase/env";
import { useSession } from "../providers/Session";
import { Link, useThemedNavigate } from "../providers/Transition";

export function ResetPassword() {
  const { user, ready } = useSession();
  const navigate = useThemedNavigate();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!LIVE || (ready && !user)) {
    return (
      <div className="panel auth-card">
        <div className="label">Reset password</div>
        <h1 className="h2">That link didn&apos;t work</h1>
        <p className="muted" style={{ marginBottom: 20 }}>
          Reset links expire after a while and only work in the browser you asked from. Ask for a new one on the login page.
        </p>
        <Link className="btn btn-block" href="/login">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <div className="panel auth-card">
      <div className="label">Reset password</div>
      <h1 className="h2">{done ? "Password changed" : "Choose a new password"}</h1>
      {done ? (
        <button className="btn btn-block" style={{ marginTop: 16 }} onClick={() => navigate("/account")}>
          Go to my account
        </button>
      ) : (
        <form
          className="stack"
          style={{ marginTop: 16 }}
          onSubmit={async (e) => {
            e.preventDefault();
            if (pw.length < 8) return setErr("Password needs at least 8 characters");
            setBusy(true);
            const { error } = await sb().auth.updateUser({ password: pw });
            setBusy(false);
            if (error) return setErr(error.message);
            setDone(true);
          }}
        >
          <div className="f">
            <label htmlFor="rp-pw">New password</label>
            <input id="rp-pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 8 characters" />
          </div>
          {err && <span className="ustat bad">{err}</span>}
          <button className="btn btn-block" type="submit" disabled={busy || !ready}>
            {busy ? "Saving…" : "Save new password"}
          </button>
        </form>
      )}
    </div>
  );
}
