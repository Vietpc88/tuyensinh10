import { NextResponse } from "next/server";
import admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  } catch (error) {
    console.error("Firebase Admin Error:", error);
  }
}

export async function POST(req: Request) {
  try {
    const { uid } = await req.json();
    if (!uid) return NextResponse.json({ error: "Thiếu UID" }, { status: 400 });

    // 1. Xóa Auth
    await admin.auth().deleteUser(uid);
    // 2. Xóa Firestore
    await admin.firestore().collection("users").doc(uid).delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
