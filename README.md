# WAFEO Digital Twin — Backend API

Full server-side backend for the [WAFEO Digital Twin](https://norbertmuzila.github.io/afeo-digital-twin/) platform, providing JWT-authenticated REST API endpoints for all dashboard panels.

## 🚀 Deploy to Railway (Free — 5 Minutes)

Railway is a free cloud platform that connects directly to your GitHub repo and runs the backend automatically.

### Step 1: Go to Railway
Open **[railway.app](https://railway.app)** and click **"Login with GitHub"**.

### Step 2: Create a New Project
Click **"New Project"** → **"Deploy from GitHub repo"** → select **`norbertmuzila/afeo-digital-twin`**.

### Step 3: Add Environment Variable
In your Railway project, click **"Variables"** and add:
```
JWT_SECRET = wafeo-super-secret-your-unique-value-here
```
> **Tip**: Use a long random string for security. Railway sets `PORT` automatically.

### Step 4: Get Your Backend URL
After deploy finishes (< 2 minutes), click **"Settings"** → **"Generate Domain"**.
You'll get a URL like: `https://afeo-digital-twin-production.up.railway.app`

### Step 5: Connect Frontend to Backend
In `app.js`, line 5, change:
```js
// Before:
const API = '/api';

// After:
const API = 'https://YOUR-URL.railway.app/api';
```
Then push to GitHub — your live site now uses real data! ✅

---

## 🔑 Demo Login Accounts

| Username | Password | Role |
|----------|----------|------|
| `admin` | `wafeo2024` | System Admin |
| `farmer` | `wafeo2024` | Farmer |
| `policy` | `wafeo2024` | Policy Maker |
| `researcher` | `wafeo2024` | Researcher |

---

## 📡 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | No | Server health check |
| POST | `/api/auth/login` | No | Login → JWT token |
| POST | `/api/auth/logout` | Yes | Logout |
| GET | `/api/dashboard/stats` | Yes | Dashboard KPIs |
| GET | `/api/alerts` | Yes | Crisis alerts |
| GET | `/api/satellites` | Yes | Satellite passes |
| GET | `/api/analytics/ndvi-by-region` | Yes | NDVI bar chart data |
| GET | `/api/fields` | Yes | Farm fields |
| GET | `/api/water` | Yes | Water bodies |
| GET | `/api/food-security` | Yes | IPC food security |
| GET | `/api/news` | Yes | Live news (ReliefWeb) |

All authenticated endpoints require: `Authorization: Bearer <token>`

---

## 🏃 Run Locally

```bash
git clone https://github.com/norbertmuzila/afeo-digital-twin.git
cd afeo-digital-twin
npm install
cp .env.example .env
node server.js
```

Then open: **http://localhost:3000**

---

## 🏗 Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Auth**: JSON Web Tokens (JWT)
- **News**: ReliefWeb Open API (Water, Agriculture, Food Security)
- **Hosting**: Railway (backend) + GitHub Pages (frontend)
- **Data**: Curated JSON files + live external APIs
