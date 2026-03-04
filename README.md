# 💬 How Do I Reply To This?
> AI-powered reply generator for difficult messages.  
> Built with React + Node.js + DeepSeek API.

---

## 📁 Project Structure

```
reply-assistant/
│
├── backend/                 ← Node.js server (deploy on Render)
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
└── frontend/                ← React app (deploy on Vercel)
    ├── src/
    │   └── App.jsx
    └── package.json
```

---

## 🚀 Deploy in 4 Steps (Free, ~45 minutes)

---

### STEP 1 — Get your DeepSeek API Key

1. Go to **https://platform.deepseek.com**
2. Sign up / Log in
3. Click **API Keys** → **Create new key**
4. Copy and save it somewhere safe

---

### STEP 2 — Deploy Backend on Render (Free)

**Render** is a free hosting service for Node.js backends.

1. Go to **https://render.com** and create a free account

2. Click **New** → **Web Service**

3. Connect your GitHub (upload the `backend/` folder as a repo first)
   ```bash
   # In your terminal:
   cd backend
   git init
   git add .
   git commit -m "initial backend"
   # Create a repo on github.com called: reply-assistant-backend
   git remote add origin https://github.com/YOURNAME/reply-assistant-backend.git
   git push -u origin main
   ```

4. In Render, select your repo and set:
   - **Name:** reply-assistant-backend
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`

5. Under **Environment Variables**, add:
   ```
   DEEPSEEK_API_KEY    =  your_key_here
   FRONTEND_URL        =  https://your-app.vercel.app   ← (fill in after Step 3)
   ```

6. Click **Deploy** — wait ~2 minutes

7. Copy your backend URL — looks like:
   ```
   https://reply-assistant-backend.onrender.com
   ```

---

### STEP 3 — Deploy Frontend on Vercel (Free)

**Vercel** is the easiest way to deploy React apps.

1. Go to **https://vercel.com** and create a free account

2. Push the `frontend/` folder to GitHub:
   ```bash
   cd frontend
   git init
   git add .
   git commit -m "initial frontend"
   # Create a repo called: reply-assistant-frontend
   git remote add origin https://github.com/YOURNAME/reply-assistant-frontend.git
   git push -u origin main
   ```

3. In Vercel, click **Add New Project** → Import your frontend repo

4. Under **Environment Variables**, add:
   ```
   REACT_APP_API_URL  =  https://reply-assistant-backend.onrender.com
   ```
   (use the URL from Step 2)

5. Click **Deploy** — wait ~1 minute

6. Your app is live at: `https://reply-assistant-frontend.vercel.app`  
   (or connect your own domain for free in Vercel settings)

---

### STEP 4 — Connect Backend CORS to Frontend

1. Go back to **Render** → your backend service → **Environment**
2. Update:
   ```
   FRONTEND_URL  =  https://reply-assistant-frontend.vercel.app
   ```
3. Click **Save** — Render auto-redeploys

✅ **Done! Your app is fully live and production-ready.**

---

## 🧪 Test It Locally First

```bash
# Terminal 1 — Backend
cd backend
cp .env.example .env
# Add your DEEPSEEK_API_KEY to .env
npm install
npm run dev
# Server running at http://localhost:3001

# Terminal 2 — Frontend
cd frontend
npm install
npm start
# App running at http://localhost:3000
```

---

## 🔒 Security Checklist

| Item | Status |
|------|--------|
| API key stored in environment variable (not in code) | ✅ |
| Rate limiting — 15 requests/hour per IP | ✅ |
| Input validation — max 2000 chars | ✅ |
| CORS — only your frontend can call backend | ✅ |
| Payload size limit — 10kb max | ✅ |
| No user data stored | ✅ |

---

## 💰 Cost

| Service | Cost |
|---------|------|
| Render (backend) | Free (spins down after 15min idle, ~30s cold start) |
| Vercel (frontend) | Free forever |
| DeepSeek API | ~$0.001 per request = ₹0.08 per reply |

**1000 users/day = ~₹80/day in API costs**

---

## 📈 When You Start Growing

If your app gets popular, upgrade:
- **Render Starter** ($7/month) — no cold starts
- Add a database (Supabase free) to log usage analytics
- Add Stripe for paid plans

---

## 🛠 Custom Domain (Optional, Free)

1. Buy a domain on **GoDaddy** or **Namecheap** (~₹800/year)
2. In Vercel → **Domains** → Add your domain
3. Follow Vercel's DNS instructions (takes 10 min)

---

## ❓ Common Issues

**Backend not responding:**
- Check Render logs for errors
- Make sure `DEEPSEEK_API_KEY` is set in Render environment
- Render free tier sleeps — first request takes 30 seconds

**CORS error in browser:**
- Make sure `FRONTEND_URL` in Render matches your exact Vercel URL
- No trailing slash: `https://app.vercel.app` ✅  not `https://app.vercel.app/` ❌

**Replies not generating:**
- Check your DeepSeek account has credits
- Check Render logs — the error message will be there

---

Built with ❤️ — ready to help every difficult conversation.
