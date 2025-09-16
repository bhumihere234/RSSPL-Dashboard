// salesdashboard/lib/firebase/client.ts
"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, browserLocalPersistence, setPersistence, type Auth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import { getAnalytics, isSupported as analyticsSupported, type Analytics } from "firebase/analytics";

// Read config from env (set in Vercel Settings → Environment Variables)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // optional
};

// Single app instance
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Create client-only singletons (undefined on server)
let auth: Auth | undefined;
let db: Firestore | undefined;
let analytics: Analytics | undefined;

if (typeof window !== "undefined") {
  auth = getAuth(app);
  // Persist login across tabs and restarts
  setPersistence(auth, browserLocalPersistence);

  // Firestore with offline cache + multi-tab sync
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });

  // Analytics only if supported in browser
  analyticsSupported().then((ok) => {
    if (ok) analytics = getAnalytics(app);
  });
}

export { app, auth, db, analytics };
