import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { collection, doc, getDocs, getFirestore, setDoc } from "firebase/firestore";

function apiApp(): FirebaseApp | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!apiKey || !projectId) return null;
  const existing = getApps().find((a) => a.name === "aasra-api");
  if (existing) return existing;
  return initializeApp(
    {
      apiKey,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    },
    "aasra-api",
  );
}

export async function createFirestoreDoc(col: string, id: string, data: Record<string, unknown>): Promise<boolean> {
  const app = apiApp();
  if (!app) return false;
    try {
      const done = Promise.race([
        setDoc(doc(getFirestore(app), col, id), { ...JSON.parse(JSON.stringify({ ...data, id })) }, { merge: true }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("firestore timeout")), 4000)),
      ]);
      await done;
      return true;
  } catch (err) {
    console.error("firestore write", col, id, err);
    return false;
  }
}

export async function listFirestoreCol(col: string): Promise<Record<string, unknown>[]> {
  const app = apiApp();
  if (!app) return [];
  try {
    const snap = await Promise.race([
      getDocs(collection(getFirestore(app), col)),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("firestore timeout")), 4000)),
    ]);
    return snap.docs.map((d) => ({ ...(d.data() as Record<string, unknown>), id: d.id }));
  } catch (err) {
    console.error("firestore list", col, err);
    return [];
  }
}
