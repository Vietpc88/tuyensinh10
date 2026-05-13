"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import Link from "next/link";

interface ClassInfo {
  id: string;
  name: string;
  count: number;
}

export default function HomePage() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(collection(db, "students"));
        const map: Record<string, number> = {};
        snap.forEach((doc) => {
          const d = doc.data();
          const lop = d.lopTen || "Chưa phân lớp";
          map[lop] = (map[lop] || 0) + 1;
        });
        const list: ClassInfo[] = Object.entries(map)
          .map(([name, count]) => ({ id: name, name, count }))
          .sort((a, b) => a.name.localeCompare(b.name, "vi"));
        setClasses(list);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = classes.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fade-in">
      {/* Hero */}
      <div className="card p-8 mb-6 text-center"
           style={{ background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)" }}>
        <div className="text-5xl mb-3">📚</div>
        <h2 className="text-2xl font-bold text-blue-900 mb-1">Tra cứu Kết quả Học tập</h2>
        <p className="text-slate-600 text-sm">Chọn lớp → chọn học sinh → xem kết quả &amp; đối chiếu bản giấy</p>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
        <input
          type="text"
          placeholder="Tìm lớp..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 shadow-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-slate-800"
        />
      </div>

      {/* Class grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-4xl mb-3 animate-spin inline-block">⏳</div>
          <p>Đang tải danh sách lớp...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-3">🏫</div>
          <p className="font-medium">
            {classes.length === 0
              ? "Chưa có dữ liệu. Vào Admin để tải lên file Excel."
              : "Không tìm thấy lớp phù hợp."}
          </p>
          {classes.length === 0 && (
            <Link href="/admin"
              className="mt-4 inline-block px-6 py-2 bg-blue-600 text-white rounded-lg
                         hover:bg-blue-700 transition font-medium text-sm">
              ⚙️ Đi tới Admin
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((cls) => (
            <Link key={cls.id} href={`/lop/${encodeURIComponent(cls.name)}`}>
              <div className="card p-5 text-center hover:shadow-lg hover:-translate-y-0.5
                              transition-all cursor-pointer group">
                <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🏫</div>
                <div className="font-bold text-blue-800 text-lg">Lớp {cls.name}</div>
                <div className="text-xs text-slate-500 mt-1">
                  <span className="badge badge-blue">{cls.count} học sinh</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
