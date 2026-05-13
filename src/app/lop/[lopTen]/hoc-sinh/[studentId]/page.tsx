"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";
import Link from "next/link";
import { StudentResult } from "@/lib/types";

const YEARS = [6, 7, 8, 9] as const;
const YEAR_LABEL: Record<number, string> = { 6: "Lớp 6", 7: "Lớp 7", 8: "Lớp 8", 9: "Lớp 9" };

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

const XEPLOAI_STYLE = (v: string) => {
  if (["T", "HTT"].includes(v)) return "bg-green-100 text-green-700 border-green-200";
  if (["K", "HTK"].includes(v)) return "bg-blue-100 text-blue-700 border-blue-200";
  if (["Đ", "HT"].includes(v)) return "bg-yellow-100 text-yellow-700 border-yellow-200";
  return "bg-red-100 text-red-700 border-red-200";
};

// Lấy Tên để sắp xếp (từ cuối cùng trong chuỗi họ tên)
function getSortName(fullName: string) {
  const parts = fullName.trim().split(" ");
  return parts.length > 0 ? parts[parts.length - 1].toLowerCase() : "";
}

function EditableCell({ fieldKey, value, onSave }: { fieldKey: string; value: string; onSave: (k: string, v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const handleBlur = () => {
    if (draft.trim() !== value) onSave(fieldKey, draft.trim());
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center justify-center">
        <input 
          autoFocus 
          value={draft} 
          onChange={e => setDraft(e.target.value)} 
          onBlur={handleBlur}
          onKeyDown={e => { if (e.key === "Enter") handleBlur(); }}
          className="w-14 text-center border border-blue-500 rounded text-xs py-1 bg-white shadow-sm outline-none font-bold" 
        />
      </div>
    );
  }
  return (
    <div onClick={() => setEditing(true)} className="group cursor-pointer flex flex-col items-center justify-center gap-0.5 min-h-[32px]">
      {value ? (
        <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${XEPLOAI_STYLE(value)} shadow-sm`}>{value}</span>
      ) : <span className="text-slate-300">—</span>}
      <span className="opacity-0 group-hover:opacity-100 text-[10px] text-blue-400 transition-opacity">✏️</span>
    </div>
  );
}

export default function StudentDetailPage() {
  const params = useParams();
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
        const uniqueMap = new Map<string, StudentResult>();
        cSnap.forEach(d => {
          const data = { id: d.id, ...d.data() } as StudentResult;
          if (!uniqueMap.has(data.maHS)) uniqueMap.set(data.maHS, data);
        });
        
        // SẮP XẾP THEO TÊN
        const sorted = Array.from(uniqueMap.values()).sort((a, b) => {
          const nameA = getSortName(a.hoTen || "");
          const nameB = getSortName(b.hoTen || "");
          if (nameA !== nameB) return nameA.localeCompare(nameB, "vi");
          return (a.hoTen || "").localeCompare(b.hoTen || "", "vi");
        });
        
        setClassList(sorted);
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
    } catch (e) { alert("Lỗi cập nhật!"); }
  };

  const filteredList = classList.filter(s => 
    (s.hoTen || "").toLowerCase().includes(search.toLowerCase()) || 
    (s.maHS || "").includes(search)
  );

  if (loading && !student) return <div className="p-20 text-center animate-pulse text-blue-600 font-bold">⏳ Đang tải dữ liệu...</div>;

  return (
    <div className="flex flex-col md:flex-row gap-0 h-[calc(100vh-120px)] -mx-4 -mt-6">
      {/* SIDEBAR: DANH SÁCH LỚP (SẮP XẾP THEO TÊN) */}
      <div className="w-full md:w-72 flex flex-col bg-white border-r border-slate-200">
        <div className="p-4 border-b bg-slate-50/50">
          <h3 className="font-black text-slate-800 text-sm flex items-center justify-between mb-3 tracking-tighter">
            <span>👥 LỚP {lopTen}</span>
            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{classList.length} HS</span>
          </h3>
          <div className="relative">
            <input 
              type="text" placeholder="Tìm tên hoặc mã..." 
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
            <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">🔍</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filteredList.map(s => (
            <Link 
              key={s.id} 
              href={`/lop/${encodeURIComponent(lopTen)}/hoc-sinh/${s.id}`}
              className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${s.id === studentId ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'hover:bg-slate-50 text-slate-600'}`}
            >
              <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-[10px] ${s.id === studentId ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'}`}>
                {(s.hoTen || "?").split(" ").pop()?.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-[11px] truncate uppercase tracking-tight">{s.hoTen}</p>
                <p className={`text-[9px] font-medium ${s.id === studentId ? 'text-blue-100' : 'text-slate-400'}`}>{s.maHS}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* CHI TIẾT HỌC SINH */}
      <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-6 custom-scrollbar">
        {student && (
          <div className="max-w-4xl mx-auto space-y-6 fade-in">
            {/* Header học sinh */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-3xl bg-blue-600 text-white flex items-center justify-center font-black text-4xl shadow-xl shadow-blue-200">
                  {getSortName(student.hoTen || "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-none">{student.hoTen}</h2>
                  <p className="text-slate-500 font-bold text-xs mt-2 flex gap-4 uppercase tracking-wider">
                    <span>🆔 {student.maHS}</span>
                    <span className="text-blue-600 font-black">🏫 LỚP {student.lopTen}</span>
                  </p>
                </div>
              </div>
              {student.xep_loai_tot_nghiep && (
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Tốt nghiệp</p>
                  <span className={`px-4 py-1.5 rounded-full font-black text-xs border ${XEPLOAI_STYLE(student.xep_loai_tot_nghiep)} shadow-sm`}>
                    {student.xep_loai_tot_nghiep}
                  </span>
                </div>
              )}
            </div>

            {/* BẢNG ĐIỂM CHUNG */}
            <div className="space-y-6">
              {YEARS.map(yr => (
                <div key={yr} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-slate-50/80 px-6 py-4 border-b flex justify-between items-center">
                    <h4 className="font-black text-slate-800 text-xs uppercase tracking-widest">📖 {YEAR_LABEL[yr]}</h4>
                    {student[`danh_hieu_${yr}`] && <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-4 py-1 rounded-full border border-amber-200">🏅 {student[`danh_hieu_${yr}`]}</span>}
                  </div>
                  <table className="student-table">
                    <thead>
                      <tr>
                        <th className="text-left px-6">Kết quả học tập</th>
                        <th>HK1</th>
                        <th>HK2</th>
                        <th>Cả năm</th>
                        {yr === 9 && <th className="bg-blue-50 text-blue-700">ĐTB CN</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      <tr>
                        <td className="text-left px-6 py-4 text-[11px] font-black text-slate-500 uppercase">📘 Học tập (HT)</td>
                        {["hk1", "hk2", "cn"].map(p => (
                          <td key={p} className="py-4">
                            <EditableCell fieldKey={`kq_ht_${yr}_${p}`} value={student[`kq_ht_${yr}_${p}`] || ""} onSave={handleUpdate} />
                          </td>
                        ))}
                        {yr === 9 && <td className="font-black text-blue-700 bg-blue-50/30 text-lg">{student.tong_diem_9_cn || "—"}</td>}
                      </tr>
                      <tr>
                        <td className="text-left px-6 py-4 text-[11px] font-black text-slate-500 uppercase">🌟 Rèn luyện (RL)</td>
                        {["hk1", "hk2", "cn"].map(p => (
                          <td key={p} className="py-4">
                            <EditableCell fieldKey={`kq_rl_${yr}_${p}`} value={student[`kq_rl_${yr}_${p}`] || ""} onSave={handleUpdate} />
                          </td>
                        ))}
                        {yr === 9 && <td className="bg-blue-50/30"></td>}
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}

              {/* BẢNG ĐIỂM CHI TIẾT LỚP 9 (NẾU CÓ DỮ LIỆU) */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-indigo-50/50 px-6 py-4 border-b">
                   <h4 className="font-black text-indigo-800 text-xs uppercase tracking-widest">📊 Điểm môn học Lớp 9 (Cả năm)</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y divide-slate-100">
                  {DIEM_MON_9.map(({ key, label }) => (
                    <div key={key} className="p-4 flex flex-col items-center justify-center gap-1 group bg-white">
                      <span className="text-[9px] font-bold text-slate-400 uppercase text-center tracking-tighter">{label}</span>
                      <EditableCell fieldKey={key} value={student[key] || ""} onSave={handleUpdate} />
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
