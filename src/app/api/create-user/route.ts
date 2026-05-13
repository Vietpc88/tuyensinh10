// src/app/api/create-user/route.ts
import { NextResponse } from "next/server";
import * as admin from "firebase-admin";

// Khởi tạo Admin SDK (Chỉ chạy trên Server)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Chuyển đổi private key từ env (thay thế \n bằng ký tự xuống dòng thực tế)
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const auth = admin.auth();
const db = admin.firestore();

export async function POST(request: Request) {
  try {
    const { email, password, managedClass, username, role } = await request.json();

    // 1. Tạo user trong Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: username,
    });

    // 2. Lưu quyền vào Firestore users/{uid}
    await db.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      username,
      email,
      role,
      managedClass,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, uid: userRecord.uid });
  } catch (error: any) {
    console.error("Lỗi tạo user:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
