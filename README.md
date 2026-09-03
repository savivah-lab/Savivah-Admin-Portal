# Savivah admin portal

A standalone admin application, deployed completely separately from the
customer/seller marketplace — per the architecture spec's recommendation
that the admin experience be its own separately deployed app with its own
protected API namespace, not just a role check inside the main app.

It talks only to `/api/admin/*` on the backend (see `src/api/adminAuth.js`
for the exact API_BASE — update that one constant if your backend URL ever
changes), using its own token pair (access + refresh), completely separate
from the customer/seller auth token used by the main marketplace app.

## Local development

```bash
npm install
npm run dev
```

## Admin accounts

There is no registration form here, intentionally — admin accounts are
created directly in the database via the backend's
`scripts/create_admin.py`, or with a plain SQL `INSERT INTO admin_users`
(see the backend README for the exact command). This app only handles
logging in with an account that already exists.

## Deploy to Render (static site)

Push this folder to its own GitHub repo, then in Render click
**New → Blueprint** and select that repo — `render.yaml` here defines it as
a static site build, with a `noindex, nofollow` header set since this is an
internal tool with no reason to appear in search results.
