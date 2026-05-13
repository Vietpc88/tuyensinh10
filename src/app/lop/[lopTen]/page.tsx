"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { StudentResult } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";

export default function LopPage() {
  const params = useParams();
  const router = useRouter();
  const { userData, loading: authLoading } = useAuth();
  const lopTen = decodeURIComponent(params.lopTen as string);

  useEffect(() => {
    if (authLoading) return;
    if (!userData) { router.push("/login"); return; }
    if (userData.role === 'teacher' && userData.managedClass !== lopTen) return;

    async function autoRedirect() {
      try {
        const q = query(collection(db, "students"), where("lopTen", "==", lopTen));
        const snap = await getDocs(q);
        const list: StudentResult[] = [];
        snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as StudentResult));
        
        if (list.length > 0) {
          // Sắp xếp theo tên để lấy người đầu tiên
          list.sort((a, b) => {
            const nameA = (a.hoTen || "").split(" ").pop() || "";
            const nameB = (b.hoTen || "").split(" ").pop() || "";
            return nameA.localeCompare(nameB, "vi");
          });
          // Tự động chuyển vào học sinh đầu tiên
          router.replace(`/lop/${encodeURIComponent(lopTen)}/hoc-sinh/${list[0].id}`);
        }
      } catch (e) { console.error(e); }
    }
    autoRedirect();
  }, [lopTen, userData, authLoading, router]);

  return (
    <div className="text-center py-20 animate-pulse font-black text-blue-600 uppercase text-xs tracking-widest">
      Đang chuẩn bị hồ sơ lớp {lopTen}...
    </div>
  );
}
