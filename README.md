# Response Sheet Marks Calculator (React + Vite)

A clean, database-free SSC / RRB / CBT response sheet marks calculator.

## Local Development

```bash
npm install
npm run dev
```

Open **http://localhost:5173** in your browser. Vite proxies `/api/fetch-sheet` to `server.js` on port `3001`.

## Deploy to Vercel (Free, Zero Config)

This project includes `api/fetch-sheet.js` as a **Vercel Serverless Function**, so `/api/fetch-sheet` works automatically in production without running `server.js`.

1. Push this folder to a GitHub repository (or install the Vercel CLI with `npm i -g vercel`).
2. Import the repo on [vercel.com](https://vercel.com) (it auto-detects **Vite**) and click **Deploy**—or run `vercel --prod` from the project folder.
