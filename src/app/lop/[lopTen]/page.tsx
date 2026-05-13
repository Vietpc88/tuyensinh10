"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import Link from "next/link";
import { StudentResult } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";

export default function LopPage() {
  const params = useParams();
  const router = useRouter();
  const { userData, loading: authLoading } = useAuth();
  const lopTen = decodeURIComponent(params.lopTen as string);
  
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (authLoading) return;
    
    // KIỂM TRA PHÂN QUYỀN
    if (!userData) {
      router.push("/login");
      return;
    }
    
    if (userData.role === 'teacher' && userData.managedClass !== lopTen) {
      setLoading(false);
      return; // Không tải dữ liệu nếu sai lớp
    }

    async function load() {
      try {
        const q = query(collection(db, "students"), where("lopTen", "==", lopTen));
        const snap = await getDocs(q);
        const list: StudentResult[] = [];
        snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as StudentResult));
        list.sort((a, b) => (a.hoTen || "").localeCompare(b.hoTen || "", "vi"));
        setStudents(list);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [lopTen, userData, authLoading, router]);

  if (authLoading) return <div className="text-center py-20 animate-pulse font-bold text-blue-600">Đang kiểm tra quyền...</div>;

  // Giao diện khi không có quyền
  if (userData?.role === 'teacher' && userData.managedClass !== lopTen) {
    return (
      <div className="card p-10 text-center space-y-4 fade-in max-w-lg mx-auto mt-10 border-red-100">
        <div className="text-6xl">🚫</div>
        <h2 className="text-xl font-black text-red-600 uppercase tracking-widest">Không có quyền truy cập</h2>
        <p className="text-slate-500 text-sm font-bold">Bạn chỉ được phân công quản lý lớp <span className="text-blue-600 font-black">{userData.managedClass}</span>. Vui lòng quay lại.</p>
        <Link href="/" className="inline-block px-6 py-2 bg-slate-800 text-white rounded-xl font-bold text-xs">VỀ TRANG CHỦ</Link>
      </div>
    );
  }

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    return (s.hoTen || "").toLowerCase().includes(q) || (s.maHS || "").toLowerCase().includes(q);
  });

  return (
    <div className="fade-in">
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
        <Link href="/" className="hover:text-blue-600">🏠 Trang chủ</Link>
        <span>›</span>
        <span className="text-blue-700 font-semibold">Lớp {lopTen}</span>
      </div>

      <div className="card p-6 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">🏫</span>
          <div>
            <h2 className="text-2xl font-bold text-blue-900">Lớp {lopTen}</h2>
            <p className="text-slate-500 text-sm">{loading ? "Đang tải..." : `${students.length} học sinh`}</p>
          </div>
        </div>
        <input type="text" placeholder="Tìm theo tên hoặc mã HS..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-400 outline-none bg-white text-sm font-bold shadow-inner" />
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">⏳ Đang tải dữ liệu...</div>
      ) : (
        <div className="grid gap-2">
          {filtered.map((s) => (
            <Link key={s.id} href={`/lop/${encodeURIComponent(lopTen)}/hoc-sinh/${s.id}`}>
              <div className="card px-5 py-4 flex items-center justify-between hover:shadow-lg hover:border-blue-400 transition-all cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700 font-black text-xs group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                    {(s.hoTen || "?").split(" ").pop()?.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 uppercase text-[11px] tracking-tight">{s.hoTen}</div>
                    <div className="text-[10px] text-slate-400 font-bold tracking-widest">MS: {s.maHS}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-slate-300 text-lg">›</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
