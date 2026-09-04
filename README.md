# Aasra (ReliefMesh)

Disaster-control console. Next.js on Vercel. Firebase Auth + Firestore.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

- **Admin portal** — control desk (Google, or local if Auth is not enabled yet)
- **Support team** — field view of open needs
- **Report help** — public request, no login

## What you must do in Firebase

Project is `assra-eff34`. Keys live in `.env.local` (not in git).

1. [Firebase Console](https://console.firebase.google.com/project/assra-eff34) → **Authentication** → **Sign-in method** → enable **Google**. Set a support email.
2. **Authentication** → **Settings** → **Authorized domains**: add `localhost`, your Vercel domain, and `assra-eff34.firebaseapp.com`.
3. **Firestore Database** → create if missing (start in test mode, then paste `firestore.rules`).
4. Deploy rules: `npx firebase-tools login` then `npx firebase-tools deploy --only firestore:rules` from this folder (needs `firebase.json` already here).
5. **Google Cloud** (same project) → APIs: ensure Identity Toolkit is on (Auth enable usually does this).
6. For Vercel: Project → Environment Variables → paste every `NEXT_PUBLIC_FIREBASE_*` from `.env.local`.

Do **not** `firebase deploy` this Next app to Hosting. Hosting wants static files; this app needs Vercel (or similar). Firestore + Auth stay on Firebase.

If Google popup says `unauthorized-domain` or `operation-not-allowed`, step 1 or 2 is incomplete. Until then, Admin / Support fall back only when keys are missing; with keys loaded, Google must succeed.
