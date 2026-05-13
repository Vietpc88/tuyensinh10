// src/lib/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Kiểm tra nhanh cấu hình (Log ra console trình duyệt để debug)
if (typeof window !== "undefined") {
  if (!firebaseConfig.apiKey) {
    console.error("❌ Firebase Error: NEXT_PUBLIC_FIREBASE_API_KEY is missing!");
  } else {
    console.log("✅ Firebase Config detected (API Key starts with: " + firebaseConfig.apiKey.substring(0, 5) + "...)");
  }
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
