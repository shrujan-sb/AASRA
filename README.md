# Aasra (ReliefMesh)

Disaster-control console for matching flood-sector requests, offers, and hazards.

## Run locally

```bash
npm install
cp .env.example .env.local
# fill Firebase web config (Auth Google + Firestore)
npm run dev
```

Without Firebase keys, sign in with **Assume local duty desk**. The agent pipeline still runs and persists to local storage; with keys it dual-writes to Firestore.

## Firebase

Enable Google sign-in. Deploy `firestore.rules`. Collections: `inbox`, `events`, `incidents`, `resources`, `assignments`, `hazards`, `sitrep`, `agentLogs`.

## Deploy

Standard Next.js on Vercel. Set the same `NEXT_PUBLIC_FIREBASE_*` env vars in the project.
