"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";
import Link from "next/link";
import { StudentResult } from "@/lib/types";

const YEARS = [6, 7, 8, 9] as const;
const YEAR_LABEL: Record<number, string> = { 6: "Lớp 6", 7: "Lớp 7", 8: "Lớp 8", 9: "Lớp 9" };
const XEPLOAI_COLOR = (v: string) => {
  if (["T", "HTT"].includes(v)) return "bg-green-100 text-green-700 border-green-200";
  if (["K", "HTK"].includes(v)) return "bg-blue-100 text-blue-700 border-blue-200";
  if (["Đ", "HT"].includes(v)) return "bg-yellow-100 text-yellow-700 border-yellow-200";
  return "bg-red-100 text-red-700 border-red-200";
};

const DIEM_MON_9 = [
  { key: "diem_toan_9_cn", label: "Toán" },
  { key: "diem_van_9_cn", label: "Ngữ Văn" },
  { key: "diem_su_dia_9_cn", label: "Lịch sử - Địa lí" },
  { key: "diem_khtn_9_cn", label: "KHTN" },
  { key: "diem_khxh_9_cn", label: "KHXH" },
  { key: "diem_tin_9_cn", label: "Tin học" },
  { key: "diem_cong_nghe_9_cn", label: "Công nghệ" },
  { key: "diem_gdcd_9_cn", label: "GDCD" },
  { key: "diem_nn1_9_cn", label: "Ngoại ngữ 1" },
  { key: "diem_nn2_9_cn", label: "Ngoại ngữ 2" },
];

function EditableCell({ fieldKey, value, onSave }: { fieldKey: string; value: string; onSave: (k: string, v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  if (editing) {
    return (
      <div className="flex items-center gap-1 min-w-[80px] justify-center">
        <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onBlur={() => { onSave(fieldKey, draft); setEditing(false); }} className="w-12 text-center border rounded text-xs py-0.5" />
      </div>
    );
  }
  return (
    <div onClick={() => setEditing(true)} className="group cursor-pointer flex items-center justify-center gap-1">
      {value ? (
        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border ${XEPLOAI_COLOR(value)}`}>{value}</span>
      ) : <span className="text-slate-300">—</span>}
      <span className="opacity-0 group-hover:opacity-100 text-[10px] text-blue-400 transition">✏️</span>
    </div>
  );
}

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const lopTen = decodeURIComponent(params.lopTen as string);
  const studentId = params.studentId as string;

  const [student, setStudent] = useState<StudentResult | null>(null);
  const [classList, setClassList] = useState<StudentResult[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const sRef = doc(db, "students", studentId);
        const sSnap = await getDoc(sRef);
        if (sSnap.exists()) setStudent({ id: sSnap.id, ...sSnap.data() } as StudentResult);

        const q = query(collection(db, "students"), where("lopTen", "==", lopTen));
        const cSnap = await getDocs(q);
        const list: StudentResult[] = [];
        cSnap.forEach(d => list.push({ id: d.id, ...d.data() } as StudentResult));
        setClassList(list.sort((a,b) => (a.hoTen || "").localeCompare(b.hoTen || "")));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    loadData();
  }, [studentId, lopTen]);

  const handleUpdate = async (key: string, newVal: string) => {
    if (!student || student[key] === newVal) return;
    try {
      await updateDoc(doc(db, "students", student.id!), { [key]: newVal, updatedAt: new Date().toISOString() });
      setStudent({ ...student, [key]: newVal });
    } catch (e) { alert("Lỗi cập nhật dữ liệu!"); }
  };

  const filteredList = classList.filter(s => 
    (s.hoTen || "").toLowerCase().includes(search.toLowerCase()) || 
    (s.maHS || "").includes(search)
  );

  if (loading && !student) return <div className="p-10 text-center animate-pulse text-slate-400">Đang tải...</div>;

  return (
    <div className="flex flex-col md:flex-row gap-6 -mt-4 h-[calc(100vh-140px)]">
      {/* CỘT TRÁI: DANH SÁCH LỚP */}
      <div className="w-full md:w-80 flex flex-col bg-white border-r border-slate-200">
        <div className="p-4 border-b bg-slate-50">
          <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-3">
            <span>👥 Lớp {lopTen}</span>
            <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">{classList.length} HS</span>
          </h3>
          <div className="relative">
            <input 
              type="text" placeholder="Tìm tên hoặc mã HS..." 
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />
            <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">🔍</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filteredList.map(s => (
            <Link 
              key={s.id} 
              href={`/lop/${encodeURIComponent(lopTen)}/hoc-sinh/${s.id}`}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${s.id === studentId ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-100 text-slate-600'}`}
            >
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs ${s.id === studentId ? 'bg-white/20' : 'bg-slate-200'}`}>
                {(s.hoTen || "?").charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs truncate uppercase">{s.hoTen}</p>
                <p className={`text-[10px] ${s.id === studentId ? 'text-blue-100' : 'text-slate-400'}`}>{s.maHS}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* CỘT PHẢI: CHI TIẾT */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {student && (
          <div className="space-y-6 pb-10">
            {/* Header Mini */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-3xl shadow-lg">
                  {student.hoTen?.charAt(0)}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{student.hoTen}</h2>
                  <p className="text-slate-500 font-medium text-sm flex gap-4">
                    <span>🆔 {student.maHS}</span>
                    <span>🏫 Lớp {student.lopTen}</span>
                  </p>
                </div>
              </div>
              {student.xep_loai_tot_nghiep && (
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Xếp loại TN</p>
                  <span className={`px-4 py-1.5 rounded-full font-black text-xs border ${XEPLOAI_COLOR(student.xep_loai_tot_nghiep)} shadow-sm`}>
                    {student.xep_loai_tot_nghiep}
                  </span>
                </div>
              )}
            </div>

            {/* Bảng điểm rút gọn */}
            <div className="grid grid-cols-1 gap-6">
              {YEARS.map(yr => (
                <div key={yr} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-slate-50 px-5 py-3 border-b flex justify-between items-center">
                    <h4 className="font-black text-slate-700 text-sm uppercase tracking-wide">📖 Kết quả {YEAR_LABEL[yr]}</h4>
                    {student[`danh_hieu_${yr}`] && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-3 py-1 rounded-full border border-amber-200">🏅 {student[`danh_hieu_${yr}`]}</span>}
                  </div>
                  <table className="w-full text-center border-collapse">
                    <thead>
                      <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                        <th className="py-3 px-4 text-left font-bold">Nội dung</th>
                        <th className="py-3 px-4">HK1</th>
                        <th className="py-3 px-4">HK2</th>
                        <th className="py-3 px-4">Cả năm</th>
                        {yr === 9 && <th className="py-3 px-4 bg-blue-50 text-blue-700">ĐTB CN</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-4 px-5 text-left text-xs font-bold text-slate-600">📘 Học tập (HT)</td>
                        {["hk1", "hk2", "cn"].map(p => (
                          <td key={p} className="py-4 px-4">
                            <EditableCell fieldKey={`kq_ht_${yr}_${p}`} value={student[`kq_ht_${yr}_${p}`] || ""} onSave={handleUpdate} />
                          </td>
                        ))}
                        {yr === 9 && <td className="font-black text-blue-700 bg-blue-50/50 text-base">{student.tong_diem_9_cn || "—"}</td>}
                      </tr>
                      <tr>
                        <td className="py-4 px-5 text-left text-xs font-bold text-slate-600">🌟 Rèn luyện (RL)</td>
                        {["hk1", "hk2", "cn"].map(p => (
                          <td key={p} className="py-4 px-4">
                            <EditableCell fieldKey={`kq_rl_${yr}_${p}`} value={student[`kq_rl_${yr}_${p}`] || ""} onSave={handleUpdate} />
                          </td>
                        ))}
                        {yr === 9 && <td className="bg-blue-50/50"></td>}
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}

              {/* Bảng điểm môn lớp 9 */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 px-5 py-3 border-b">
                   <h4 className="font-black text-slate-700 text-sm uppercase tracking-wide">📊 Điểm chi tiết lớp 9</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y divide-slate-100">
                  {DIEM_MON_9.map(({ key, label }) => (
                    <div key={key} className="p-4 flex flex-col items-center justify-center gap-1 group cursor-pointer hover:bg-slate-50 transition" onClick={() => {
                       const val = prompt(`Sửa điểm môn ${label}`, student[key] || "");
                       if (val !== null) handleUpdate(key, val);
                    }}>
                      <span className="text-[10px] font-bold text-slate-400 uppercase text-center">{label}</span>
                      <span className="font-black text-blue-700 text-sm">{student[key] || "—"}</span>
                      <span className="opacity-0 group-hover:opacity-100 text-[10px]">✏️</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
