"use client";

/** Small, plain form controls for the admin panel. Every change saves immediately. */
import { useState } from "react";
import { sb } from "@/lib/supabase/browser";
import { LIVE } from "@/lib/supabase/env";

export type FieldType = "text" | "textarea" | "number" | "bool" | "select" | "lines" | "kv" | "datetime" | "image";

export type Field<T> = {
  key: keyof T & string;
  label: string;
  type: FieldType;
  help?: string;
  options?: { value: string; label: string }[];
  wide?: boolean;
};

const toLocal = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** Live: shrink, then upload to Supabase Storage and return the public link. */
async function upload(file: File): Promise<string> {
  const dataUrl = await shrink(file, 1600);
  const blob = await (await fetch(dataUrl)).blob();
  const path = `uploads/${crypto.randomUUID()}.jpg`;
  const db = sb();
  const { error } = await db.storage.from("public-images").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (error) throw error;
  return db.storage.from("public-images").getPublicUrl(path).data.publicUrl;
}

/** Shrinks uploads so they fit in browser storage (demo) or upload fast (live). */
function shrink(file: File, max = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", 0.82));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export function FieldInput<T>({ field, value, onChange, id }: { field: Field<T>; value: unknown; onChange: (v: unknown) => void; id: string }) {
  const [busy, setBusy] = useState(false);
  switch (field.type) {
    case "bool":
      return (
        <label className="switch">
          <input id={id} type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
          <span aria-hidden="true" />
          <em>{value ? "On" : "Off"}</em>
        </label>
      );
    case "number":
      return (
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step="any"
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );
    case "select":
      return (
        <select id={id} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case "textarea":
      return <textarea id={id} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} rows={3} />;
    case "lines":
      return (
        <textarea
          id={id}
          value={((value as string[]) ?? []).join("\n")}
          onChange={(e) => onChange(e.target.value.split("\n"))}
          onBlur={(e) => onChange(e.target.value.split("\n").map((l) => l.trim()).filter(Boolean))}
          rows={4}
        />
      );
    case "kv": {
      const obj = (value as Record<string, string>) ?? {};
      return (
        <textarea
          id={id}
          defaultValue={Object.entries(obj)
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n")}
          onBlur={(e) => {
            const out: Record<string, string> = {};
            for (const line of e.target.value.split("\n")) {
              const i = line.indexOf(":");
              if (i > 0) out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
            }
            onChange(out);
          }}
          rows={5}
        />
      );
    }
    case "datetime":
      return <input id={id} type="datetime-local" value={toLocal(String(value ?? ""))} onChange={(e) => e.target.value && onChange(new Date(e.target.value).toISOString())} />;
    case "image": {
      const src = (value as string | null) ?? "";
      return (
        <div className="imgfield">
          {src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" />
          )}
          <div className="stack" style={{ gap: 8, flex: 1 }}>
            <label className="file">
              <span className="tag">{busy ? "…" : "Upload"}</span>
              <span>{src ? "Replace image" : "Choose an image"}</span>
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setBusy(true);
                  try {
                    onChange(LIVE ? await upload(f) : await shrink(f));
                  } catch (err) {
                    alert(`Upload failed: ${err instanceof Error ? err.message : err}`);
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </label>
            {src && (
              <button type="button" className="linkish" style={{ textAlign: "left" }} onClick={() => onChange(null)}>
                Remove image
              </button>
            )}
          </div>
        </div>
      );
    }
    default:
      return <input id={id} type="text" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />;
  }
}

export function FieldRow<T>({ field, value, onChange, id }: { field: Field<T>; value: unknown; onChange: (v: unknown) => void; id: string }) {
  return (
    <div className={`f ${field.wide || ["textarea", "lines", "kv", "image"].includes(field.type) ? "full" : ""}`}>
      <label htmlFor={id}>{field.label}</label>
      <FieldInput field={field} value={value} onChange={onChange} id={id} />
      {field.help && <span className="help">{field.help}</span>}
    </div>
  );
}
