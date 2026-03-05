INONECRM MONOREPO (UPLOAD-READY)
================================

What’s inside
-------------
Apps (Cloudflare Pages)
- /apps/website   -> inonecrm.com         (STATIC marketing site)
- /apps/app       -> app.inonecrm.com     (CRM)
- /apps/admin     -> admin.inonecrm.com   (Superadmin)

Workers (Cloudflare Workers)
- /workers/inonecrm-api          -> api.inonecrm.com         (Auth + CRM API + trial gating)
- /workers/inonecrm-realtime     -> realtime.inonecrm.com    (Durable Objects for realtime inbox)  [optional]
- /workers/inonecrm-automations  -> automations (Cron/Queues)                           [optional]
- /workers/inonecrm-webhooks     -> hooks.inonecrm.com       (Stripe/WhatsApp webhooks) [optional]

Local dev (recommended)
-----------------------
1) Install deps (only needed for app/admin workers)
   pnpm install

2) Run API worker
   cd workers/inonecrm-api
   wrangler dev

3) Run apps (in separate terminals)
   cd apps/app && pnpm dev
   cd apps/admin && pnpm dev

Website is static
-----------------
Open /apps/website/index.html or deploy it to Cloudflare Pages with no build command.

Trial & Paywall flow (MVP)
--------------------------
- Signup creates a tenant with a 7-day trial
- When trial expires, API returns 402 for gated endpoints
- App shows upgrade messaging under /billing

See DEPLOYMENT_NOTES.txt for Cloudflare setup.
