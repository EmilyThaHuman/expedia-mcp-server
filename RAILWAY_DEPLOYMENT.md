# Railway Deployment Guide - Expedia MCP Server

## Prerequisites
- Railway CLI installed: `npm install -g @railway/cli`
- Railway account connected: `railway login`

## Deployment Steps

1. **Initialize Railway Project**
```bash
cd /Users/reedvogt/Documents/GitHub/expedia-mcp-server
railway init
```

2. **Set Environment Variables**
```bash
railway variables set RAPIDAPI_KEY="f0d7b8c160msh4d04dcfbd482a79p10a9c6jsn81bcee4691d1"
railway variables set BASE_URL="https://expedia-mcp-server-production.up.railway.app"
railway variables set PORT="8003"
```

3. **Deploy**
```bash
railway up
```

4. **Get Deployment URL**
```bash
railway status
```

## Environment Variables Required
- `RAPIDAPI_KEY` - RapidAPI key for Expedia API
- `BASE_URL` - Your Railway deployment URL
- `PORT` - Port to run on (default: 8003)

## Verification
Once deployed, test the server:
```bash
curl https://your-railway-url.up.railway.app/health
```

## Notes
- The server uses `server.ts` (Node.js) instead of `worker.ts` (Cloudflare Workers)
- Built assets are included in the Docker image
- Server runs on port 8003 by default

