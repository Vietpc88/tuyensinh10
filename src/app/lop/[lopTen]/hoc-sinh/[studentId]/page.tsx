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
  const val = String(v || "").trim();
  if (["T", "HTT", "Tốt"].includes(val)) return "text-green-700 font-black";
  if (["K", "HTK", "Khá"].includes(val)) return "text-blue-700 font-black";
  if (["Đ", "HT", "Đạt"].includes(val)) return "text-amber-700 font-black";
  return "text-red-700 font-black";
};

export default function StudentDetailPage() {
  const params = useParams();
  const { userData } = useAuth();
  const lopTen = decodeURIComponent(params.lopTen as string);
  const studentId = params.studentId as string;

  const [student, setStudent] = useState<StudentResult | null>(null);
  const [classList, setClassList] = useState<StudentResult[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [draftData, setDraftData] = useState<any>({});
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const sRef = doc(db, "students", studentId);
        const sSnap = await getDoc(sRef);
        if (sSnap.exists()) {
          const data = sSnap.data() as StudentResult;
          setStudent({ id: sSnap.id, ...data });
          setDraftData(data);
        }

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
    setIsEditing(false);
  }, [studentId, lopTen]);

  const handleSaveAll = async () => {
    if (!student) return;
    setLoading(true);
    try {
      const sRef = doc(db, "students", studentId);
      const updates: any = {};
      const changes: any[] = [];

      for (const key in draftData) {
        if (draftData[key] !== student[key as keyof StudentResult]) {
          updates[key] = draftData[key];
          changes.push({
            field: key,
            old: String(student[key as keyof StudentResult] || "trống"),
            new: String(draftData[key] || "trống")
          });
        }
      }

      if (Object.keys(updates).length > 0) {
        // 1. LƯU DỮ LIỆU CHÍNH (ĐIỂM)
        await updateDoc(sRef, updates);
        setStudent({ ...student, ...updates });
        showToast("✅ Đã lưu thay đổi thành công!");

        // 2. GHI LOG (Cố gắng ghi, nếu lỗi phân quyền thì bỏ qua không báo lỗi cho người dùng)
        try {
          for (const change of changes) {
            await addDoc(collection(db, "edit_logs"), {
              studentId, studentName: student.hoTen, maHS: student.maHS, lopTen,
              field: change.field, oldValue: change.old, newValue: change.new,
              editorName: userData?.username || "GV", timestamp: new Date().toISOString()
            });
          }
        } catch (logErr) {
          console.warn("Log failed (possibly permission issue), but data was saved.", logErr);
        }
      }
      setIsEditing(false);
    } catch (e) { 
      console.error("Save error:", e);
      showToast("❌ Lỗi kết nối khi lưu!", 'error'); 
    }
    finally { setLoading(false); }
  };

  if (loading && !student) return <div className="p-20 text-center font-black text-blue-600 uppercase">Đang xử lý...</div>;

  return (
    <div className="flex flex-col md:flex-row gap-0 h-[calc(100vh-100px)] -mx-4 -mt-6 overflow-hidden bg-white text-slate-800">
      {toast && (
        <div className="fixed top-20 right-6 z-[100] px-6 py-3 rounded-2xl shadow-2xl font-black text-xs bg-slate-800 text-white fade-in uppercase tracking-widest">
          {toast.msg}
        </div>
      )}

      {/* SIDEBAR HS */}
      <div className="w-full md:w-56 flex flex-col border-r border-slate-200">
        <div className="p-3 border-b bg-slate-50">
          <input type="text" placeholder="Tìm tên..." value={search} onChange={e => setSearch(e.target.value)} className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none font-bold shadow-inner" />
        </div>
        <div className="flex-1 overflow-y-auto p-1 space-y-0.5 custom-scrollbar">
          {classList.filter(s => (s.hoTen || "").toLowerCase().includes(search.toLowerCase())).map(s => (
            <Link key={s.id} href={`/lop/${encodeURIComponent(lopTen)}/hoc-sinh/${s.id}`} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all ${s.id === studentId ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-50 text-slate-600'}`}>
              <p className="font-bold text-[12px] truncate uppercase">{s.hoTen}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col bg-[#f1f5f9] overflow-hidden">
        {student && (
          <>
            <div className="bg-white p-4 border-b border-slate-200 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-4 text-slate-800">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-blue-100">{student.hoTen?.charAt(0)}</div>
                <div>
                  <h2 className="text-lg font-black uppercase tracking-tight">{student.hoTen}</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã HS: {student.maHS} • Lớp: {student.lopTen}</p>
                </div>
              </div>

              <div className="flex gap-2">
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} className="px-6 py-2.5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
                    ✏️ BẬT CHẾ ĐỘ SỬA
                  </button>
                ) : (
                  <>
                    <button onClick={() => { setIsEditing(false); setDraftData(student); }} className="px-6 py-2.5 bg-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-300 transition-all">
                      HỦY
                    </button>
                    <button onClick={handleSaveAll} className="px-6 py-2.5 bg-green-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-green-700 shadow-lg shadow-green-100 transition-all">
                      💾 LƯU THAY ĐỔI
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {GRADES.map(yr => (
                    <div key={yr} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="bg-slate-800 text-white px-3 py-2 text-[12px] font-black uppercase tracking-widest text-center">LỚP {yr}</div>
                      <div className="grid grid-cols-3 border-collapse">
                        <div className="border-r border-slate-100">
                          <div className="h-10 bg-slate-50 border-b border-slate-200"></div>
                          {PERIODS.map(p => (
                            <div key={p.key} className="h-10 flex items-center justify-center text-[11px] font-black text-slate-500 uppercase border-b border-slate-100 last:border-0">{p.label}</div>
                          ))}
                        </div>
                        <div className="border-r border-slate-100">
                          <div className="h-10 bg-slate-50 border-b border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400 text-center uppercase leading-none px-1">Kết quả<br/>rèn luyện</div>
                          {PERIODS.map(p => {
                            const fieldKey = `kq_rl_${yr}_${p.key}` as keyof StudentResult;
                            return (
                              <div key={p.key} className="h-10 border-b border-slate-100 last:border-0 flex items-center justify-center px-1">
                                {isEditing ? (
                                  <input value={draftData[fieldKey] || ""} onChange={e => setDraftData({...draftData, [fieldKey]: e.target.value})} className="w-full text-center py-1 bg-blue-50 border border-blue-200 rounded font-black text-sm outline-none" />
                                ) : (
                                  <span className={`text-sm ${XEPLOAI_STYLE(String(student[fieldKey] || ""))}`}>{student[fieldKey] || "—"}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div>
                          <div className="h-10 bg-slate-50 border-b border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400 text-center uppercase leading-none px-1">Kết quả<br/>học tập</div>
                          {PERIODS.map(p => {
                            const fieldKey = `kq_ht_${yr}_${p.key}` as keyof StudentResult;
                            return (
                              <div key={p.key} className="h-10 border-b border-slate-100 last:border-0 flex items-center justify-center px-1">
                                {isEditing ? (
                                  <input value={draftData[fieldKey] || ""} onChange={e => setDraftData({...draftData, [fieldKey]: e.target.value})} className="w-full text-center py-1 bg-blue-50 border border-blue-200 rounded font-black text-sm outline-none" />
                                ) : (
                                  <span className={`text-sm ${XEPLOAI_STYLE(String(student[fieldKey] || ""))}`}>{student[fieldKey] || "—"}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Xếp loại tốt nghiệp</span>
                    {isEditing ? (
                      <input value={draftData.xep_loai_tot_nghiep || ""} onChange={e => setDraftData({...draftData, xep_loai_tot_nghiep: e.target.value})} className="w-24 text-center py-1.5 bg-blue-50 border border-blue-200 rounded-xl font-black text-sm outline-none" />
                    ) : (
                      <span className="text-sm font-black text-blue-600 uppercase">{student.xep_loai_tot_nghiep || "—"}</span>
                    )}
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">ĐTB Lớp 9</span>
                    {isEditing ? (
                      <input value={draftData.tong_diem_9_cn || ""} onChange={e => setDraftData({...draftData, tong_diem_9_cn: e.target.value})} className="w-24 text-center py-1.5 bg-blue-50 border border-blue-200 rounded-xl font-black text-sm outline-none" />
                    ) : (
                      <span className="text-sm font-black text-blue-600 uppercase">{student.tong_diem_9_cn || "—"}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="w-full md:w-72 bg-white border-l border-slate-200 p-4 overflow-y-auto custom-scrollbar">
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-800 text-white font-black uppercase text-[11px]">
                        <th className="p-3 text-left tracking-tighter">Môn học Lớp 9</th>
                        <th className="p-3 text-center w-20">Điểm CN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {SUBJECTS_ORDER.map(({ key, label }) => {
                        const fieldKey = key as keyof StudentResult;
                        return (
                          <tr key={key} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 text-slate-500 font-black uppercase text-[10px] tracking-tight">{label}</td>
                            <td className="p-2 text-center">
                              {isEditing ? (
                                <input value={draftData[key] || ""} onChange={e => setDraftData({...draftData, [key]: e.target.value})} className="w-full text-center py-1 bg-blue-50 border border-blue-200 rounded font-black text-sm outline-none" />
                              ) : (
                                <span className="font-black text-blue-600 text-sm">{student[fieldKey] || "—"}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
