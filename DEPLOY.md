# Going live — step by step

You'll connect four accounts: **GitHub** (stores the code), **Supabase** (database + logins), **Vercel** (hosting) and **Whop** (payments).
Until the Supabase keys are added, the site runs in demo mode, exactly like the preview.

> **Never paste secret keys into a chat, email or Discord.** They only go into Vercel's *Environment Variables* screen (step 4).

---

## 1. Put the code on GitHub
1. On github.com create an **empty, private** repository called `unownvault` (no README).
2. Connect GitHub to Claude at https://claude.ai/connect-github and allow it access to that repository.
3. Tell Claude the repository name (e.g. `yourname/unownvault`) and Claude will push the code.

## 2. Set up the Supabase database
1. In Supabase, open your project → **SQL Editor** → **New query**.
2. Open `supabase/migrations/0001_init.sql` from the code, copy all of it, paste, press **Run**. You should see "Success".
3. New query again: paste all of `supabase/seed.sql` → **Run**. This loads the starter plans, services, offers and text (you can change everything later in /admin).
4. **Authentication → URL Configuration**:
   - *Site URL*: your real domain, e.g. `https://unownvault.com` (use the `…vercel.app` address until you have a domain).
   - *Redirect URLs*: add `https://YOUR-DOMAIN/auth/callback` and `https://*.vercel.app/auth/callback`.
5. **Authentication → Sign In / Providers → Discord** (for "Continue with Discord"):
   1. Go to https://discord.com/developers/applications → **New Application** → name it UnownVault.
   2. **OAuth2** → copy the *Client ID*, click *Reset Secret* and copy the *Client Secret*.
   3. **OAuth2 → Redirects**: add the *Callback URL* that Supabase shows on its Discord provider screen (it looks like `https://xxxx.supabase.co/auth/v1/callback`).
   4. Back in Supabase, switch Discord on, paste the Client ID and Secret, **Save**.
6. **Project Settings → API**: you'll need the *Project URL*, the *anon / publishable* key and the *service_role / secret* key in step 4.

## 3. Set up Whop
1. In your Whop dashboard open **Developer** (or **Settings → API keys**) and create a **company API key**. Give it permission to create checkouts and read payments and memberships.
2. Copy your **company ID** — it starts with `biz_` (shown in the dashboard URL / settings).
3. *(Optional)* Create one product (e.g. "UnownVault services") and copy its ID (`prod_…`). Purchases are grouped under it. Without it, Whop picks a default.
4. **Developer → Webhooks → Create webhook**:
   - URL: `https://YOUR-DOMAIN/api/webhooks/whop`
   - Events: `payment.succeeded`, `refund.created`, `dispute.created`, `dispute.updated`, `membership.activated`, `membership.deactivated`, `membership.updated`, `membership.cancel_at_period_end_changed`
   - Copy the **signing secret** (starts with `ws_`).

You do **not** need to create plans in Whop. When someone pays, the site creates a matching Whop checkout from the price in your admin panel. If you'd rather use a plan you made in Whop, paste its `plan_…` ID into that item's **Whop plan ID** box in /admin.

## 4. Deploy on Vercel
1. Vercel → **Add New → Project** → import the `unownvault` GitHub repository.
2. Before pressing Deploy, open **Environment Variables** and add:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | your domain, e.g. `https://unownvault.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role / secret key — **secret** |
| `ADMIN_EMAILS` | the email(s) you'll log in with as owner, comma-separated |
| `WHOP_API_KEY` | Whop API key — **secret** |
| `WHOP_WEBHOOK_SECRET` | Whop webhook signing secret (`ws_…`) — **secret** |
| `WHOP_COMPANY_ID` | `biz_…` |
| `WHOP_PRODUCT_ID` | `prod_…` (optional) |
| `NEXT_PUBLIC_DEMO_MODE` | `false` |

3. **Deploy**. When it's done, open the site.

## 5. Become the admin
1. On the live site click **Sign up** and create an account with an email from `ADMIN_EMAILS`. Confirm it from your inbox and pick a trainer name.
2. Open **/admin** (link in the footer). You're in; every change now goes live for everyone within a second or two.

## 6. Test a real payment
1. In /admin, set a test service's price to $1 (or make a hidden $1 service).
2. Buy it from a normal account. You should see the success popup with **Pending delivery**, the order in Account, and the order in Admin → Orders.
3. Refund it from the Whop dashboard; the order switches to **Refunded** automatically.

## 7. Custom domain
Vercel → your project → **Settings → Domains** → add your domain and follow the DNS instructions it shows. Then update `NEXT_PUBLIC_SITE_URL`, Supabase *Site URL* and the Whop webhook URL to the new domain.

## 8. Google Search Console
1. https://search.google.com/search-console → **Add property** → *Domain* → enter your domain → add the TXT record it gives you at your domain registrar → **Verify**.
2. **Sitemaps** → submit `https://YOUR-DOMAIN/sitemap.xml`.

---

### Good to know
- **Emails**: Supabase's built-in email sender only allows a few emails per hour. Before launch, add your own email sender under Supabase **Authentication → Emails → SMTP Settings** (e.g. Resend, Postmark or Brevo).
- The **2-day expiry reminder email** and **forgot password** are not built yet; they come next.
- **Backups**: Supabase backs up daily on paid plans. You can also download your content any time from Admin → Backup.
