import "server-only";

/**
 * Tiny Discord REST client for the one-click server setup in /admin.
 * Env: DISCORD_BOT_TOKEN (secret). The bot must be in the server with Administrator.
 */
const API = "https://discord.com/api/v10";

export const discordConfigured = () => !!process.env.DISCORD_BOT_TOKEN;

export class DiscordError extends Error {
  constructor(
    public status: number,
    public code: number | undefined,
    message: string,
  ) {
    super(message);
  }
}

export async function dc<T = unknown>(method: string, path: string, body?: unknown, attempt = 0): Promise<T> {
  const res = await fetch(API + path, {
    method,
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "DiscordBot (https://unownvault.vercel.app, 1.0)",
      "X-Audit-Log-Reason": "UnownVault server setup",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (res.status === 429 && attempt < 5) {
    const j = (await res.json().catch(() => ({}))) as { retry_after?: number };
    await new Promise((r) => setTimeout(r, Math.ceil((j.retry_after ?? 1) * 1000) + 100));
    return dc<T>(method, path, body, attempt + 1);
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => ({}))) as { message?: string; code?: number };
  if (!res.ok) throw new DiscordError(res.status, data.code, data.message ?? `Discord error ${res.status}`);
  return data as T;
}

export type DGuild = { id: string; name: string };
export type DChannel = { id: string; name: string; type: number; parent_id: string | null; position: number };
export type DRole = { id: string; name: string; managed: boolean; position: number };

/** The bot's application id is the first part of its token (base64). Used to build the invite link. */
export function botClientId(): string | null {
  const t = process.env.DISCORD_BOT_TOKEN ?? "";
  try {
    return Buffer.from(t.split(".")[0], "base64").toString("utf8").replace(/\D/g, "") || null;
  } catch {
    return null;
  }
}

/** The server to set up: DISCORD_GUILD_ID if given, otherwise the only server the bot is in. */
export async function targetGuild(): Promise<{ guild: DGuild | null; count: number }> {
  const guilds = await dc<DGuild[]>("GET", "/users/@me/guilds");
  const wanted = process.env.DISCORD_GUILD_ID;
  if (wanted) return { guild: guilds.find((g) => g.id === wanted) ?? null, count: guilds.length };
  return { guild: guilds.length === 1 ? guilds[0] : null, count: guilds.length };
}
