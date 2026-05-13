"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import Link from "next/link";
import { StudentResult } from "@/lib/types";

export default function LopPage() {
  const params = useParams();
  const lopTen = decodeURIComponent(params.lopTen as string);
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
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
  }, [lopTen]);

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    return (
      (s.hoTen || "").toLowerCase().includes(q) ||
      (s.maHS || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="fade-in">
      {/* Breadcrumb */}
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
            <p className="text-slate-500 text-sm">
              {loading ? "Đang tải..." : `${students.length} học sinh`}
            </p>
          </div>
        </div>

        <input
          type="text"
          placeholder="Tìm theo tên hoặc mã HS..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-200
                     focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-sm"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">⏳ Đang tải danh sách học sinh...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <div className="text-4xl mb-2">👤</div>
          <p>{students.length === 0 ? "Lớp chưa có học sinh" : "Không tìm thấy học sinh"}</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {filtered.map((s) => (
            <Link key={s.id} href={`/lop/${encodeURIComponent(lopTen)}/hoc-sinh/${s.id}`}>
              <div className="card px-5 py-4 flex items-center justify-between
                              hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center
                                  text-blue-700 font-bold text-sm group-hover:bg-blue-600
                                  group-hover:text-white transition-colors">
                    {(s.hoTen || "?").charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">{s.hoTen || "(Chưa có tên)"}</div>
                    <div className="text-xs text-slate-400">Mã HS: {s.maHS}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {s.xep_loai_tot_nghiep && (
                    <span className={`badge ${
                      s.xep_loai_tot_nghiep === "HTT" ? "badge-green" :
                      s.xep_loai_tot_nghiep === "HTK" ? "badge-blue" :
                      s.xep_loai_tot_nghiep === "HT"  ? "badge-yellow" : "badge-gray"
                    }`}>
                      {s.xep_loai_tot_nghiep}
                    </span>
                  )}
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
