import { Link } from "@/components/providers/Transition";

export default function NotFound() {
  return (
    <div className="auth-wrap">
      <div className="panel auth-card">
        <div className="label">404</div>
        <h1 className="h2">Nothing spawned here.</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          That page doesn&apos;t exist. Try one of these instead.
        </p>
        <div className="stack">
          <Link className="btn btn-block" href="/">
            Home
          </Link>
          <Link className="btn ghost btn-block" href="/services">
            Services
          </Link>
        </div>
      </div>
    </div>
  );
}
