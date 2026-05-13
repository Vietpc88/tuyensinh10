"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, getDocs, query, where, addDoc } from "firebase/firestore";
import Link from "next/link";
import { StudentResult } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";

const SUBJECTS_ORDER = [
  { key: "diem_toan_9_cn", label: "Toán học" },
  { key: "diem_su_dia_9_cn", label: "Lịch sử và Địa lí" },
  { key: "diem_khtn_9_cn", label: "Khoa học tự nhiên" },
  { key: "diem_tin_9_cn", label: "Tin học" },
  { key: "diem_van_9_cn", label: "Ngữ văn" },
  { key: "diem_nn1_9_cn", label: "Ngoại ngữ 1 (Tiếng Anh)" },
  { key: "diem_gdcd_9_cn", label: "GDCD" },
  { key: "diem_cong_nghe_9_cn", label: "Công nghệ" },
];

const GRADES = [6, 7, 8, 9];
const PERIODS = [
  { key: "hk1", label: "Học kì I" },
  { key: "hk2", label: "Học kì II" },
  { key: "cn", label: "Cả năm" },
];

const XEPLOAI_STYLE = (v: string) => {
  if (["T", "HTT", "Tốt"].includes(v)) return "text-green-700 font-black";
  if (["K", "HTK", "Khá"].includes(v)) return "text-blue-700 font-black";
  if (["Đ", "HT", "Đạt"].includes(v)) return "text-amber-700 font-black";
  return "text-red-700 font-black";
};

function EditableCell({ fieldKey, value, onSave, className = "" }: { fieldKey: string; value: string; onSave: (k: string, v: string) => void, className?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const handleBlur = () => {
    if (draft.trim() !== value) onSave(fieldKey, draft.trim());
    setEditing(false);
  };
  if (editing) {
    return (
      <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onBlur={handleBlur} onKeyDown={e => { if (e.key === "Enter") handleBlur(); }} className="w-full text-center border-2 border-blue-500 rounded bg-white outline-none font-bold py-1 text-[10px]" />
    );
  }
  return (
    <div onClick={() => setEditing(true)} className={`cursor-pointer hover:bg-blue-50 min-h-[32px] flex items-center justify-center transition-colors border border-slate-200 ${className}`}>
      <span className={`text-[10px] ${XEPLOAI_STYLE(value)}`}>{value || "—"}</span>
    </div>
  );
}

export default function StudentDetailPage() {
  const params = useParams();
  const { userData } = useAuth();
  const lopTen = decodeURIComponent(params.lopTen as string);
  const studentId = params.studentId as string;

  const [student, setStudent] = useState<StudentResult | null>(null);
  const [classList, setClassList] = useState<StudentResult[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2000);
  };

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
        const sorted = Array.from(uniqueMap.values()).sort((a, b) => {
          const nameA = (a.hoTen || "").split(" ").pop() || "";
          const nameB = (b.hoTen || "").split(" ").pop() || "";
          return nameA.localeCompare(nameB, "vi");
        });
        setClassList(sorted);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    loadData();
  }, [studentId, lopTen]);

  const handleUpdate = async (key: string, newVal: string) => {
    if (!student || student[key] === newVal) return;
    const oldVal = student[key] || "";
    try {
      await updateDoc(doc(db, "students", student.id!), { [key]: newVal });
      await addDoc(collection(db, "edit_logs"), {
        studentId: student.id, studentName: student.hoTen, maHS: student.maHS, lopTen: student.lopTen,
        field: key, oldValue: oldVal, newValue: newVal, editorName: userData?.username || "GV", timestamp: new Date().toISOString()
      });
      setStudent({ ...student, [key]: newVal });
      showToast("✅ Đã lưu!");
    } catch (e) { showToast("❌ Lỗi!", 'error'); }
  };

  if (loading && !student) return <div className="p-20 text-center font-bold text-blue-600 uppercase text-xs">Đang tải...</div>;

  return (
    <div className="flex flex-col md:flex-row gap-0 h-[calc(100vh-100px)] -mx-4 -mt-6 overflow-hidden">
      {toast && (
        <div className="fixed top-4 right-4 z-[100] px-4 py-2 rounded-xl shadow-xl font-black text-[10px] bg-slate-800 text-white fade-in uppercase">
          {toast.msg}
        </div>
      )}

      {/* CỘT 1: DANH SÁCH HS */}
      <div className="w-full md:w-52 flex flex-col bg-white border-r border-slate-200 shadow-sm">
        <div className="p-2 border-b bg-slate-50">
          <input type="text" placeholder="Tìm tên..." value={search} onChange={e => setSearch(e.target.value)} className="w-full px-3 py-1.5 text-[10px] border border-slate-200 rounded-lg outline-none font-bold" />
        </div>
        <div className="flex-1 overflow-y-auto p-1 space-y-0.5 custom-scrollbar">
          {classList.filter(s => (s.hoTen || "").toLowerCase().includes(search.toLowerCase())).map(s => (
            <Link key={s.id} href={`/lop/${encodeURIComponent(lopTen)}/hoc-sinh/${s.id}`} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${s.id === studentId ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-50 text-slate-600'}`}>
              <p className="font-bold text-[10px] truncate uppercase">{s.hoTen}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col md:flex-row bg-[#f8fafc] overflow-hidden">
        {student && (
          <>
            {/* CỘT 2: CÁC Ô KẾT QUẢ 6,7,8,9 (GIỮA) */}
            <div className="flex-1 p-3 overflow-y-auto custom-scrollbar">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 mb-3 flex justify-between items-center">
                <h2 className="text-[11px] font-black uppercase text-slate-800 tracking-tighter">{student.hoTen} - {student.maHS}</h2>
                <div className="flex gap-2">
                  <EditableCell fieldKey="xep_loai_tot_nghiep" value={student.xep_loai_tot_nghiep || ""} onSave={handleUpdate} className="px-4 py-1 rounded-lg bg-amber-50 border-amber-200 text-[10px] font-black" />
                  <EditableCell fieldKey="tong_diem_9_cn" value={student.tong_diem_9_cn || ""} onSave={handleUpdate} className="px-4 py-1 rounded-lg bg-blue-50 border-blue-200 text-[10px] font-black" />
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {GRADES.map(yr => (
                  <div key={yr} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-slate-800 text-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-center">LỚP {yr}</div>
                    <div className="grid grid-cols-3 border-collapse">
                      <div className="border-r border-slate-200">
                        <div className="h-8 bg-slate-50 border-b border-slate-200"></div>
                        {PERIODS.map(p => (
                          <div key={p.key} className="h-8 flex items-center justify-center text-[9px] font-black text-slate-500 uppercase border-b border-slate-200 last:border-0">{p.label}</div>
                        ))}
                      </div>
                      <div className="border-r border-slate-200">
                        <div className="h-8 bg-slate-50 border-b border-slate-200 flex items-center justify-center text-[8px] font-black text-slate-400 text-center uppercase leading-none px-1">Kết quả<br/>rèn luyện</div>
                        {PERIODS.map(p => (
                          <EditableCell key={p.key} fieldKey={`kq_rl_${yr}_${p.key}`} value={student[`kq_rl_${yr}_${p.key}`] || ""} onSave={handleUpdate} className="h-8 border-x-0 border-t-0" />
                        ))}
                      </div>
                      <div>
                        <div className="h-8 bg-slate-50 border-b border-slate-200 flex items-center justify-center text-[8px] font-black text-slate-400 text-center uppercase leading-none px-1">Kết quả<br/>học tập</div>
                        {PERIODS.map(p => (
                          <EditableCell key={p.key} fieldKey={`kq_ht_${yr}_${p.key}`} value={student[`kq_ht_${yr}_${p.key}`] || ""} onSave={handleUpdate} className="h-8 border-x-0 border-t-0" />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CỘT 3: ĐIỂM MÔN HỌC LỚP 9 (PHẢI) */}
            <div className="w-full md:w-64 p-3 overflow-y-auto custom-scrollbar bg-white shadow-inner">
               <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-slate-800 text-white">
                        <th className="p-2 text-left font-black uppercase tracking-tighter">Môn học Lớp 9</th>
                        <th className="p-2 text-center font-black w-16">Cả năm</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold">
                      {SUBJECTS_ORDER.map(({ key, label }) => (
                        <tr key={key} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2 text-slate-500 text-[9px] uppercase font-black tracking-tight">{label}</td>
                          <td className="p-0 text-center">
                            <EditableCell fieldKey={key} value={student[key] || ""} onSave={handleUpdate} className="text-blue-600 font-black border-0" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
