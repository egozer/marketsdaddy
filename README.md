# marketsdaddy.lol

AI-powered market analysis platform built with Next.js + TypeScript + Firebase Auth + Firebase Realtime Database.

## Features

- Landing page with bold product messaging and free pricing section
- Firebase authentication
- Continue with Google
- Email/password register + login (no email verification gate)
- Live stock list with quote polling
- Server-side quote endpoint (`/api/stock/quote`) for ticker data
- Public per-stock community forum (Realtime Database)
- `/daddy ...` command in comments: Daddy AI posts public analysis reply
- OpenRouter-powered AI analyst persona ("Daddy")

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Firebase Auth + Realtime Database
- OpenRouter API

## 1) Install

```bash
npm install
```

## 2) Environment setup

Copy `.env.example` to `.env.local` and fill values.

```bash
cp .env.example .env.local
```

Use your provided credentials:

- Firebase web config keys under `NEXT_PUBLIC_FIREBASE_*`
- OpenRouter key under `OPENROUTER_API_KEY`

## 3) Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## 4) Firebase Console checklist

1. Enable Authentication providers:
   - Email/Password
   - Google
2. Realtime Database: create database and set region.
3. (Recommended for MVP) use development rules while iterating, then harden rules before production.

Example starter Realtime Database rules:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    "watchlists": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    "alerts": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    "notifications": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    "forums": {
      "$stockId": {
        "comments": {
          ".read": "auth != null",
          "$commentId": {
            ".write": "auth != null"
          }
        }
      }
    }
  }
}
```

## 5) Production deploy

### Vercel

1. Push repo to GitHub.
2. Import project in Vercel.
3. Add all env vars from `.env.local` to Vercel Project Settings.
4. Deploy.

## Important Notes

- This project provides informational market analysis, not investment advice.
- Keep `OPENROUTER_API_KEY` server-side only (not `NEXT_PUBLIC`).
