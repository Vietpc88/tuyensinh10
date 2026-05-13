"use client";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useState } from "react";

export default function Home() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const [classes, setClasses] = useState<string[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (userData?.role === 'teacher' && userData.managedClass) {
        // GIÁO VIÊN: VÀO THẲNG LỚP
        router.replace(`/lop/${encodeURIComponent(userData.managedClass)}`);
      } else {
        // ADMIN: TẢI DANH SÁCH LỚP
        const loadClasses = async () => {
          const snap = await getDocs(collection(db, "students"));
          const set = new Set<string>();
          snap.forEach(d => { if (d.data().lopTen) set.add(d.data().lopTen); });
          setClasses(Array.from(set).sort());
          setLoadingData(false);
        };
        loadClasses();
      }
    }
  }, [user, userData, loading, router]);

  if (loading || (user && userData?.role === 'teacher')) {
    return <div className="text-center py-20 animate-pulse font-black text-blue-600 uppercase text-xs">Đang chuyển hướng...</div>;
  }

  // Giao diện này chỉ dành cho Admin hoặc User chưa phân lớp
  return (
    <div className="max-w-4xl mx-auto space-y-8 fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Danh sách các lớp</h2>
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Chọn lớp để quản lý hồ sơ</p>
      </div>

      {loadingData ? (
        <div className="text-center py-10 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Đang tải dữ liệu lớp...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {classes.map((lop) => (
            <Link key={lop} href={`/lop/${encodeURIComponent(lop)}`} className="card p-6 text-center hover:bg-blue-600 hover:text-white transition-all group shadow-lg hover:shadow-blue-200 border-2 border-transparent hover:border-blue-400">
              <span className="text-3xl block mb-2 group-hover:scale-125 transition-transform">🏫</span>
              <span className="font-black text-xl uppercase tracking-tighter">Lớp {lop}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
