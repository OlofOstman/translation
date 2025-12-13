# Deployment Guide

This app requires a platform that supports **persistent WebSocket connections**. Vercel's serverless functions do NOT support this, so you need to use one of the platforms below.

## Recommended Platforms

### 1. Railway (Recommended) ⭐

**Why:** Easiest setup, great for WebSockets, free tier available

**Steps:**
1. Sign up at [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `translation` repository
4. Railway will auto-detect the backend folder
5. Add environment variables:
   - `OPENAI_API_KEY` = your OpenAI API key
   - `PORT` = 3001 (usually auto-set)
6. Deploy!

**View Logs:**
```bash
railway logs
```

Or use Railway dashboard → your service → Logs tab

---

### 2. Render

**Why:** Free tier, good WebSocket support, simple setup

**Steps:**
1. Sign up at [render.com](https://render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repo
4. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `cd .. && npm install && cd backend && npm run build`
   - **Start Command:** `npm start`
   - **Environment:** Node
5. Add environment variables:
   - `OPENAI_API_KEY`
   - `PORT` = 3001
6. Deploy!

**View Logs:**
- Dashboard → your service → Logs tab
- Or use Render CLI: `render logs`

---

### 3. Fly.io

**Why:** Global edge network, great for real-time apps

**Steps:**
1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Sign up: `fly auth signup`
3. In the `backend/` directory:
   ```bash
   fly launch
   ```
4. Follow prompts, then add secrets:
   ```bash
   fly secrets set OPENAI_API_KEY=your-key-here
   ```
5. Deploy: `fly deploy`

**View Logs:**
```bash
fly logs
```

---

## Environment Variables

All platforms need:
- `OPENAI_API_KEY` - Your OpenAI API key
- `PORT` - Usually auto-set by platform (default: 3001)

## Frontend Configuration

After deploying the backend, update your frontend to connect to the deployed backend:

1. Update `frontend/src/hooks/useWebSocket.ts`:
   ```typescript
   const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
   ```

2. Create `frontend/.env.production`:
   ```
   VITE_WS_URL=wss://your-backend-url.railway.app
   ```

3. Deploy frontend to Vercel (frontend can stay on Vercel, only backend needs to move)

## Testing Deployment

1. Check health endpoint: `https://your-backend-url/health`
2. Should return: `{"status":"ok","service":"translation-backend"}`
3. Test WebSocket connection from frontend

## Troubleshooting

**WebSocket connection fails:**
- Make sure you're using `wss://` (secure WebSocket) for production
- Check that the platform supports WebSocket (not just HTTP)
- Verify environment variables are set correctly

**Build fails:**
- Make sure all dependencies are in `package.json` (not just devDependencies)
- Check that TypeScript compiles: `npm run build` works locally

**Connection timeouts:**
- Check platform logs for errors
- Verify OpenAI API key is valid
- Check that port is correctly configured

