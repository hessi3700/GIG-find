# Deploy Gig Finder Online

This guide gets the app live with **API on Fly.io** (persistent SQLite) and **frontend on Cloudflare Pages**.

---

## Prerequisites

- A [GitHub](https://github.com) account
- A [Fly.io](https://fly.io) account (free tier)
- A [Cloudflare](https://cloudflare.com) account (free)

---

## Step 1: Push to GitHub

1. Create a new repository on GitHub (e.g. `GIG-find`).
2. In your project folder, run:

```bash
cd /path/to/GIG-find
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/GIG-find.git
git push -u origin main
```

---

## Step 2: Deploy the API (Fly.io)

Fly.io gives you a small VM with **persistent storage**, so the SQLite database survives restarts and redeploys.

### 2.1 Install Fly CLI and log in

```bash
# Install (macOS/Linux)
curl -L https://fly.io/install.sh | sh

# Or with npm
npm install -g flyctl

# Log in
fly auth login
```

### 2.2 Create and deploy the API from `apps/api`

```bash
cd apps/api
fly launch --no-deploy
```

When prompted:

- **App name:** e.g. `gig-find-api` (or leave default)
- **Region:** choose one close to you
- **Postgres/Redis:** No for both

### 2.3 Create a volume for the database

Replace `gig-find-api` and `iad` with your app name and region if different:

```bash
fly volumes create data --size 1 --region iad --app gig-find-api
```

Edit `apps/api/fly.toml` and add at the bottom (use the same region as above):

```toml
[mounts]
  source = "data"
  destination = "/data"
```

Set the API to use the volume for the DB:

```toml
[env]
  PORT = '3000'
  DATABASE_PATH = '/data/gigfind.db'
```

### 2.4 Set JWT secret and deploy

```bash
fly secrets set JWT_SECRET="$(openssl rand -base64 32)" --app gig-find-api
fly deploy --app gig-find-api
```

After deploy, note your API URL, e.g. **`https://gig-find-api.fly.dev`**.

Test it:

```bash
curl https://gig-find-api.fly.dev/api/health
```

---

## Step 3: Deploy the frontend (Cloudflare Pages)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select your **GIG-find** repository.
3. Configure the build:
   - **Project name:** e.g. `gig-find`
   - **Production branch:** `main`
   - **Root directory:** `apps/web`
   - **Build command:** `npm install && npm run build`
   - **Build output directory:** `dist`
4. Under **Environment variables**, add:
   - **Variable name:** `VITE_API_URL`
   - **Value:** your API URL, e.g. `https://gig-find-api.fly.dev`
   - **Environment:** Production (and Preview if you want)
5. Click **Save and Deploy**.

When the build finishes, your site will be at **`https://gig-find.pages.dev`** (or the name you chose).

---

## Step 4: Optional — seed data on production

To add example data on the live API, you can run the seed script **locally** and point it at the production DB, or run it once on Fly (no persistent SSH). Easiest: run seed locally with `DATABASE_PATH` pointing at a local file, then **don’t** use that for production. For production, users can register and create gigs manually. If you later add a way to run commands on Fly (e.g. `fly ssh console`), you could run the seed there with `DATABASE_PATH=/data/gigfind.db`.

---

## Summary

| Part      | URL example                          |
|-----------|--------------------------------------|
| Frontend  | `https://gig-find.pages.dev`         |
| API       | `https://gig-find-api.fly.dev`        |

Set **VITE_API_URL** in Cloudflare Pages to your Fly API URL so the frontend talks to your API.

---

## Alternative: Render (API only, no persistent DB)

If you prefer [Render](https://render.com) for the API:

1. **New → Web Service**, connect your GitHub repo.
2. **Root directory:** `apps/api`
3. **Build command:** `npm install && npm run build`
4. **Start command:** `npm start`
5. **Environment:** Add `JWT_SECRET` (e.g. from `openssl rand -base64 32`).

**Note:** On Render’s free tier the filesystem is **ephemeral**, so the SQLite file is reset on each deploy. Use this for quick demos; for real data use Fly.io (above) or add a Render persistent disk (paid).

---

## Custom domains

- **Fly.io:** `fly certs add your-api.yourdomain.com` and point DNS (CNAME or A/AAAA) as Fly instructs.
- **Cloudflare Pages:** In the Pages project, **Custom domains** → Add your domain and follow the DNS steps.

Then set **VITE_API_URL** to your custom API URL and redeploy the frontend.
