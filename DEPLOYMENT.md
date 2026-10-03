# ParkShare Deployment Guide: GitHub & Render

This guide walks you step-by-step through pushing the ParkShare project to **GitHub** and deploying it live on **Render**.

---

## Part 1: Push Code to GitHub

### 1. Initialize Git in the Project Root
Open PowerShell or your terminal in the project root (`c:\Users\VASANTH A\.gemini\antigravity\scratch\parkshare`):

```bash
git init
git add .
git commit -m "Initial commit: ParkShare full-stack platform"
```

> **Security Note:** The `.gitignore` is pre-configured to exclude all `.env` secret files, SQLite databases, `venv/`, and `node_modules/`.

### 2. Create a New Repository on GitHub
1. Go to [GitHub New Repository](https://github.com/new).
2. Choose a repository name (e.g. `parkshare`).
3. Set visibility to **Public** or **Private**.
4. Leave "Add a README", ".gitignore", and "License" **unchecked** (we already have them).
5. Click **Create repository**.

### 3. Connect and Push
Run the following commands in your local project root (replace `<your-username>` with your GitHub username):

```bash
git branch -M main
git remote add origin https://github.com/<your-username>/parkshare.git
git push -u origin main
```

---

## Part 2: Deploy on Render

### Option A: 1-Click Blueprint (Recommended)
Because this repository contains a [`render.yaml`](./render.yaml), Render can automatically create all 4 services and the PostgreSQL database in one click:

1. Log into your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** > **Blueprint**.
3. Connect your GitHub account and select your `parkshare` repository.
4. Render will detect `render.yaml` and configure:
   - **`parkshare-db`**: Free Managed PostgreSQL database
   - **`parkshare-backend`**: FastAPI Python Web Service
   - **`parkshare-customer`**: Customer React Web App
   - **`parkshare-host`**: Host React Web App
   - **`parkshare-admin`**: Super Admin React Web App
5. Click **Apply**.
6. Once deployed:
   - Copy the live URL of your backend (e.g., `https://parkshare-backend.onrender.com`).
   - In each of the 3 frontend static site settings on Render, add the environment variable:
     - `VITE_API_URL` = `https://parkshare-backend.onrender.com`
   - Trigger a manual redeploy for the frontends so they pick up the backend URL.

---

### Option B: Manual Service Setup on Render

#### 1. Create PostgreSQL Database
1. Click **New +** > **PostgreSQL**.
2. Name: `parkshare-db`.
3. Database: `parkshare`.
4. User: `parkshare`.
5. Plan: **Free**.
6. Click **Create Database**.
7. Copy the **Internal Database URL** (e.g., `postgresql://parkshare:...@.../parkshare`).

#### 2. Create FastAPI Backend Service
1. Click **New +** > **Web Service**.
2. Connect your GitHub repository.
3. Configure settings:
   - **Name**: `parkshare-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/health`
4. Add **Environment Variables**:
   - `ENVIRONMENT`: `production`
   - `DEBUG`: `false`
   - `DATABASE_URL`: *(paste the Internal Database URL from step 1)*
   - `SECRET_KEY`: *(click Generate or enter a 32+ character random string)*
   - `RAZORPAY_MOCK_MODE`: `true`
   - `RAZORPAY_KEY_ID`: `rzp_test_parkshare_mock_key`
   - `RAZORPAY_KEY_SECRET`: `rzp_test_parkshare_mock_secret`
   - `PLATFORM_COMMISSION_PERCENTAGE`: `10.0`
   - `TAX_PERCENTAGE`: `5.0`
5. Click **Create Web Service**.

#### 3. Create Frontend Static Sites (Repeat for Customer, Host, Admin)
For each web app:
1. Click **New +** > **Static Site**.
2. Connect the repository.
3. Configure settings:

| Setting | Customer Web | Host Web | Admin Web |
| :--- | :--- | :--- | :--- |
| **Name** | `parkshare-customer` | `parkshare-host` | `parkshare-admin` |
| **Root Directory** | `customer-web` | `host-web` | `admin-web` |
| **Build Command** | `npm install && npm run build` | `npm install && npm run build` | `npm install && npm run build` |
| **Publish Directory** | `dist` | `dist` | `dist` |

4. Under **Environment Variables**, add:
   - `VITE_API_URL`: `https://parkshare-backend.onrender.com` *(your backend Render URL)*
5. Under **Redirects/Rewrites**, add:
   - **Source**: `/*`
   - **Destination**: `/index.html`
   - **Action**: `Rewrite`
6. Click **Create Static Site**.

---

## Part 3: Seed Clean Admin / Host Accounts on Render

Once your backend is live, open the **Render Shell** tab on `parkshare-backend` and run:

```bash
python scripts/reset_db.py
```

This will initialize the schema and generate the default clean admin account:
- **Admin**: `avasanth081@gmail.com` / `Vasanth@123`
