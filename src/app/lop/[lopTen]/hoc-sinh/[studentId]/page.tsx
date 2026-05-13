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
      <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onBlur={handleBlur} onKeyDown={e => { if (e.key === "Enter") handleBlur(); }} className="w-full text-center border-2 border-blue-500 rounded bg-white outline-none font-bold py-1" />
    );
  }
  return (
    <div onClick={() => setEditing(true)} className={`cursor-pointer hover:bg-blue-50 min-h-[35px] flex items-center justify-center transition-colors px-2 ${className}`}>
      <span className={XEPLOAI_STYLE(value)}>{value || "—"}</span>
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

      {/* CỘT 1: SIDEBAR (DANH SÁCH HS) */}
      <div className="w-full md:w-64 flex flex-col bg-white border-r border-slate-200 shadow-sm">
        <div className="p-3 border-b bg-slate-50">
          <input type="text" placeholder="Tìm tên..." value={search} onChange={e => setSearch(e.target.value)} className="w-full px-3 py-2 text-[11px] border border-slate-200 rounded-lg outline-none font-bold" />
        </div>
        <div className="flex-1 overflow-y-auto p-1 space-y-0.5 custom-scrollbar">
          {classList.filter(s => (s.hoTen || "").toLowerCase().includes(search.toLowerCase())).map(s => (
            <Link key={s.id} href={`/lop/${encodeURIComponent(lopTen)}/hoc-sinh/${s.id}`} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${s.id === studentId ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-50 text-slate-600'}`}>
              <span className={`w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center font-black text-[9px] ${s.id === studentId ? 'bg-white/20' : 'bg-slate-100 text-slate-400'}`}>{(s.hoTen || "?").split(" ").pop()?.charAt(0)}</span>
              <p className="font-bold text-[10px] truncate uppercase">{s.hoTen}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* CỘT 2 & 3: MAIN CONTENT */}
      <div className="flex-1 flex flex-col md:flex-row bg-[#f1f5f9] overflow-hidden">
        {student && (
          <>
            {/* CỘT 2: KẾT QUẢ RÈN LUYỆN & HỌC TẬP (GIỮA) */}
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar border-r border-slate-200">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-800 text-white px-4 py-3">
                  <h2 className="text-sm font-black uppercase tracking-tight">{student.hoTen} - {student.maHS}</h2>
                </div>
                
                <div className="p-4 space-y-6">
                  <table className="w-full border-collapse border border-slate-300 text-[11px]">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="border border-slate-300 p-2 w-24"></th>
                        <th className="border border-slate-300 p-2 font-black text-slate-700">Kết quả rèn luyện</th>
                        <th className="border border-slate-300 p-2 font-black text-slate-700">Kết quả học tập</th>
                      </tr>
                    </thead>
                    <tbody className="text-center font-bold">
                      <tr>
                        <td className="border border-slate-300 p-2 bg-slate-50">Học kì I</td>
                        <td className="border border-slate-300 p-0"><EditableCell fieldKey="kq_rl_9_hk1" value={student.kq_rl_9_hk1 || ""} onSave={handleUpdate} /></td>
                        <td className="border border-slate-300 p-0"><EditableCell fieldKey="kq_ht_9_hk1" value={student.kq_ht_9_hk1 || ""} onSave={handleUpdate} /></td>
                      </tr>
                      <tr>
                        <td className="border border-slate-300 p-2 bg-slate-50">Học kì II</td>
                        <td className="border border-slate-300 p-0"><EditableCell fieldKey="kq_rl_9_hk2" value={student.kq_rl_9_hk2 || ""} onSave={handleUpdate} /></td>
                        <td className="border border-slate-300 p-0"><EditableCell fieldKey="kq_ht_9_hk2" value={student.kq_ht_9_hk2 || ""} onSave={handleUpdate} /></td>
                      </tr>
                      <tr className="bg-blue-50/30">
                        <td className="border border-slate-300 p-2 bg-slate-50 font-black">Cả năm</td>
                        <td className="border border-slate-300 p-0"><EditableCell fieldKey="kq_rl_9_cn" value={student.kq_rl_9_cn || ""} onSave={handleUpdate} /></td>
                        <td className="border border-slate-300 p-0"><EditableCell fieldKey="kq_ht_9_cn" value={student.kq_ht_9_cn || ""} onSave={handleUpdate} /></td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ĐTB Cả năm:</span>
                    <span className="text-2xl font-black text-blue-600">{student.tong_diem_9_cn || "—"}</span>
                  </div>
                  
                  {student.xep_loai_tot_nghiep && (
                    <div className="flex justify-between items-center bg-amber-50 p-4 rounded-xl border border-amber-100">
                      <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Xếp loại tốt nghiệp:</span>
                      <span className="text-lg font-black text-amber-700">{student.xep_loai_tot_nghiep}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CỘT 3: ĐIỂM TRUNG BÌNH MÔN LỚP 9 (PHẢI) */}
            <div className="w-full md:w-80 p-4 overflow-y-auto custom-scrollbar bg-white shadow-inner">
               <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-800 text-white">
                        <th className="p-3 text-left font-black uppercase tracking-tighter">Môn học (Lớp 9)</th>
                        <th className="p-3 text-center font-black w-20">Điểm CN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold">
                      {SUBJECTS_ORDER.map(({ key, label }) => (
                        <tr key={key} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 text-slate-600 text-[10px] uppercase font-black tracking-tight">{label}</td>
                          <td className="p-0 text-center">
                            <EditableCell fieldKey={key} value={student[key] || ""} onSave={handleUpdate} className="text-blue-600 font-black" />
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
