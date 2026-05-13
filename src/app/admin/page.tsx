"use client";
import { useState, useRef, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, writeBatch, doc, getDocs, query, where } from "firebase/firestore";
import * as XLSX from "xlsx";
import { StudentResult, AppUser } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

const FIELD_MAP: Record<string, string> = {
  "lớp": "lopTen", "mãhọcsinh*": "maHS", "họvàtên": "hoTen",
  "ht6_cn": "kq_ht_6_cn", "ht6_hk1": "kq_ht_6_hk1", "ht6_hk2": "kq_ht_6_hk2",
  "rl6_cn": "kq_rl_6_cn", "rl6_hk1": "kq_rl_6_hk1", "rl6_hk2": "kq_rl_6_hk2",
  "ht7_cn": "kq_ht_7_cn", "ht7_hk1": "kq_ht_7_hk1", "ht7_hk2": "kq_ht_7_hk2",
  "rl7_cn": "kq_rl_7_cn", "rl7_hk1": "kq_rl_7_hk1", "rl7_hk2": "kq_rl_7_hk2",
  "ht8_cn": "kq_ht_8_cn", "ht8_hk1": "kq_ht_8_hk1", "ht8_hk2": "kq_ht_8_hk2",
  "rl8_cn": "kq_rl_8_cn", "rl8_hk1": "kq_rl_8_hk1", "rl8_hk2": "kq_rl_8_hk2",
  "ht9_cn": "kq_ht_9_cn", "ht9_hk1": "kq_ht_9_hk1", "ht9_hk2": "kq_ht_9_hk2",
  "rl9_cn": "kq_rl_9_cn", "rl9_hk1": "kq_rl_9_hk1", "rl9_hk2": "kq_rl_9_hk2",
  "toán9": "diem_toan_9_cn", "văn9": "diem_van_9_cn", "sửđịa9": "diem_su_dia_9_cn", 
  "khtn9": "diem_khtn_9_cn", "khxh9": "diem_khxh_9_cn", "tin9": "diem_tin_9_cn",
  "côngnghệ9": "diem_cong_nghe_9_cn", "gdcd9": "diem_gdcd_9_cn",
  "nn1_9": "diem_nn1_9_cn", "mãnn1_9": "ma_nn1_9", "nn2_9": "diem_nn2_9_cn", "mãnn2_9": "ma_nn2_9",
  "tổng6": "tong_diem_6_cn", "tổng7": "tong_diem_7_cn", "tổng8": "tong_diem_8_cn", "tổng9": "tong_diem_9_cn",
  "danhhiệu6": "danh_hieu_6", "danhhiệu7": "danh_hieu_7", "danhhiệu8": "danh_hieu_8", "danhhiệu9": "danh_hieu_9",
};

function normalizeHeader(h: string) { return String(h).toLowerCase().replace(/\s+/g, "").trim(); }

export default function AdminPage() {
  const { userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  
  const [preview, setPreview] = useState<StudentResult[]>([]);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [teachers, setTeachers] = useState<AppUser[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  
  const [newTeacher, setNewTeacher] = useState({ username: "", password: "", managedClass: "" });
  const [classToDelete, setClassToDelete] = useState("");
  const [showDanger, setShowDanger] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!userData || userData.role !== 'admin') router.push("/login");
      else { loadTeachers(); detectClasses(); }
    }
  }, [userData, authLoading]);

  async function loadTeachers() {
    const snap = await getDocs(collection(db, "users"));
    const list: AppUser[] = [];
    snap.forEach(d => list.push(d.data() as AppUser));
    setTeachers(list.filter(u => u.role === 'teacher'));
  }

  async function detectClasses() {
    const snap = await getDocs(collection(db, "students"));
    const classes = new Set<string>();
    snap.forEach(d => { if (d.data().lopTen) classes.add(d.data().lopTen); });
    setAvailableClasses(Array.from(classes).sort());
  }

  function addLog(msg: string) { setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]); }

  async function createTeacherAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!newTeacher.username || !newTeacher.password) return;
    setUploading(true);
    addLog(`⏳ Đang tạo tài khoản ${newTeacher.username}...`);
    try {
      const email = newTeacher.username.includes("@") ? newTeacher.username : `${newTeacher.username}@hocba.local`;
      const res = await fetch("/api/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: newTeacher.password, managedClass: newTeacher.managedClass, username: newTeacher.username, role: "teacher" }),
      });
      if ((await res.json()).success) {
        addLog(`✅ Thành công: ${newTeacher.username}`);
        setNewTeacher({ username: "", password: "", managedClass: "" });
        loadTeachers();
      }
    } catch (e) { addLog("❌ Lỗi API."); }
    finally { setUploading(false); }
  }

  async function deleteTeacher(uid: string, name: string) {
    if (!confirm(`Xóa tài khoản ${name}?`)) return;
    setUploading(true);
    try {
      await fetch("/api/delete-user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uid }) });
      addLog(`🗑️ Đã xóa giáo viên ${name}`);
      loadTeachers();
    } catch (e) { addLog("❌ Lỗi xóa."); }
    finally { setUploading(false); }
  }

  // XÓA DỮ LIỆU (THEO LỚP HOẶC TẤT CẢ)
  async function deleteData(type: 'class' | 'all') {
    const target = type === 'class' ? `lớp ${classToDelete}` : "TOÀN BỘ hệ thống";
    if (!confirm(`Bạn có chắc chắn muốn xóa dữ liệu học sinh của ${target}? Hành động này không thể hoàn tác!`)) return;
    
    setUploading(true);
    addLog(`🗑️ Đang xóa dữ liệu ${target}...`);
    try {
      const q = type === 'class' ? query(collection(db, "students"), where("lopTen", "==", classToDelete)) : collection(db, "students");
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.forEach(d => batch.delete(d.ref));
      await batch.commit();
      addLog(`✅ Đã dọn sạch dữ liệu ${target}.`);
      detectClasses();
      if (type === 'class') setClassToDelete("");
    } catch (e) { addLog("❌ Lỗi khi xóa dữ liệu."); }
    finally { setUploading(false); }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLog([]); setDuplicates([]); setPreview([]);
    addLog("🔍 Đang kiểm tra trùng lặp...");
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        const normalizedHeader = rows[0].map(h => normalizeHeader(String(h)));
        const students: any[] = [];
        const fileMaHSs: string[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i]; if (!row.some(c => String(c).trim() !== "")) continue;
          const s: any = {};
          normalizedHeader.forEach((h, idx) => { const key = FIELD_MAP[h]; if (key) s[key] = String(row[idx] ?? "").trim(); });
          if (s.maHS) { students.push(s); fileMaHSs.push(s.maHS); }
        }
        const foundDuplicates: string[] = [];
        for (let i = 0; i < fileMaHSs.length; i += 30) {
          const chunk = fileMaHSs.slice(i, i + 30);
          const q = query(collection(db, "students"), where("maHS", "in", chunk));
          const snap = await getDocs(q);
          snap.forEach(d => foundDuplicates.push(d.data().maHS));
        }
        if (foundDuplicates.length > 0) { setDuplicates(foundDuplicates); addLog(`❌ TRÙNG ${foundDuplicates.length} MÃ HS. NGĂN CHẶN TẢI LÊN.`); }
        else { setPreview(students); addLog(`✅ File hợp lệ (${students.length} HS).`); }
      } catch (err) { addLog("❌ Lỗi đọc file."); }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleUpload() {
    setUploading(true);
    try {
      let count = 0;
      for (let i = 0; i < preview.length; i += 400) {
        const batch = writeBatch(db);
        preview.slice(i, i + 400).forEach(s => batch.set(doc(collection(db, "students")), s));
        await batch.commit();
        count += Math.min(400, preview.length - count);
        addLog(`⬆️ Đã tải ${count}/${preview.length}...`);
      }
      addLog("🎉 Thành công!"); detectClasses(); setPreview([]);
    } catch (e) { addLog("❌ Lỗi tải lên."); }
    finally { setUploading(false); }
  }

  async function handleExport() {
    addLog("📥 Đang xuất dữ liệu...");
    try {
      const snap = await getDocs(collection(db, "students"));
      const data: any[] = [];
      const header = Object.keys(FIELD_MAP);
      snap.forEach(doc => {
        const s = doc.data(); const row: any = {};
        header.forEach(h => { const key = FIELD_MAP[normalizeHeader(h)]; row[h] = s[key] || ""; });
        data.push(row);
      });
      const ws = XLSX.utils.json_to_sheet(data, { header });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "HocBaSo");
      XLSX.writeFile(wb, `Du_Lieu_Hoc_Ba_${new Date().toLocaleDateString()}.xlsx`);
      addLog("✅ Đã xuất file thành công!");
    } catch (e) { addLog("❌ Lỗi xuất file."); }
  }

  if (authLoading) return <div className="p-20 text-center animate-pulse text-blue-600 font-bold">Đang tải quản trị...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 fade-in pb-20">
      <div className="card p-6 header-gradient text-white flex justify-between items-center shadow-xl">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Hệ thống Quản trị</h2>
          <p className="text-blue-100 text-xs font-bold opacity-80 uppercase tracking-widest mt-1">Quản lý tài khoản & Dữ liệu</p>
        </div>
        <button onClick={handleExport} className="bg-white text-blue-700 px-6 py-2.5 rounded-2xl font-black text-xs hover:bg-blue-50 transition shadow-lg shadow-blue-900/20">
          📥 XUẤT EXCEL DỮ LIỆU
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-6 bg-white">
          <h3 className="font-black text-slate-800 mb-5 text-sm uppercase">👤 Cấp tài khoản GV</h3>
          <form onSubmit={createTeacherAccount} className="space-y-4">
            <input placeholder="Tên đăng nhập" value={newTeacher.username} onChange={e => setNewTeacher({...newTeacher, username: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none" required />
            <input type="password" placeholder="Mật khẩu" value={newTeacher.password} onChange={e => setNewTeacher({...newTeacher, password: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none" required />
            <select value={newTeacher.managedClass} onChange={e => setNewTeacher({...newTeacher, managedClass: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none">
              <option value="">-- Chưa phân lớp --</option>
              {availableClasses.map(c => <option key={c} value={c}>Lớp {c}</option>)}
            </select>
            <button type="submit" disabled={uploading} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95">TẠO TÀI KHOẢN</button>
          </form>
        </div>

        <div className="card p-6 bg-white">
           <h3 className="font-black text-slate-800 mb-5 text-sm uppercase">👥 Tài khoản giáo viên</h3>
           <div className="space-y-2 overflow-y-auto max-h-[300px] custom-scrollbar pr-1">
             {teachers.map(t => (
               <div key={t.uid} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="min-w-0">
                    <p className="font-black text-slate-700 text-[11px] truncate uppercase">{t.username || t.email?.split('@')[0]}</p>
                    <p className="text-[9px] font-bold text-blue-500">{t.managedClass ? `LỚP ${t.managedClass}` : 'CHƯA PHÂN LỚP'}</p>
                  </div>
                  <button onClick={() => deleteTeacher(t.uid, t.username || "")} className="p-2 text-red-400 hover:text-red-600 transition hover:bg-red-50 rounded-lg">🗑️</button>
               </div>
             ))}
           </div>
        </div>

        <div className="card p-6 bg-white">
          <h3 className="font-black text-slate-800 mb-5 text-sm uppercase">📥 Nhập dữ liệu</h3>
          <div onClick={() => !uploading && fileRef.current?.click()} className="border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all group">
            <span className="text-4xl block mb-2 group-hover:scale-110 transition">📥</span>
            <p className="text-xs font-black text-slate-500 uppercase tracking-tighter">Chọn file Excel học sinh</p>
            <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
          </div>
          {duplicates.length > 0 && (
            <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl text-center">
              <p className="text-red-600 font-black text-[10px] uppercase mb-1 tracking-widest">❌ TRÙNG MÃ HS ({duplicates.length})</p>
              <p className="text-[9px] text-red-400 font-bold">Vui lòng kiểm tra lại file hoặc xóa dữ liệu cũ.</p>
            </div>
          )}
          {preview.length > 0 && (
            <button onClick={handleUpload} disabled={uploading} className="w-full mt-4 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all">
               TẢI LÊN {preview.length} HỌC SINH
            </button>
          )}
        </div>
      </div>

      {/* DANGER ZONE (VÙNG NGUY HIỂM) */}
      <div className="mt-10 border-t pt-10">
        <div className="flex justify-center">
          <button 
            onClick={() => setShowDanger(!showDanger)} 
            className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all border ${showDanger ? 'bg-red-50 text-red-600 border-red-200' : 'text-slate-400 border-slate-200 hover:bg-slate-50'}`}
          >
            {showDanger ? "✖ ĐÓNG VÙNG NGUY HIỂM" : "⚠️ CÀI ĐẶT NÂNG CAO (XÓA DỮ LIỆU)"}
          </button>
        </div>

        {showDanger && (
          <div className="grid md:grid-cols-2 gap-6 mt-6 fade-in">
            <div className="card p-6 border-red-100 bg-red-50/20">
              <h4 className="text-red-700 font-black text-xs uppercase mb-4">🗑️ Xóa dữ liệu theo lớp</h4>
              <div className="flex gap-2">
                <select value={classToDelete} onChange={e => setClassToDelete(e.target.value)} className="flex-1 px-4 py-2 rounded-xl border border-red-100 text-xs font-bold outline-none bg-white">
                  <option value="">-- Chọn lớp cần xóa --</option>
                  {availableClasses.map(c => <option key={c} value={c}>Lớp {c}</option>)}
                </select>
                <button onClick={() => deleteData('class')} disabled={!classToDelete || uploading} className="px-6 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black hover:bg-red-700 disabled:opacity-50">XÓA LỚP</button>
              </div>
            </div>
            
            <div className="card p-6 border-red-100 bg-red-50/20">
              <h4 className="text-red-700 font-black text-xs uppercase mb-4">🚫 Dọn sạch hệ thống</h4>
              <button onClick={() => deleteData('all')} disabled={uploading} className="w-full py-3 bg-red-600 text-white rounded-xl text-[10px] font-black hover:bg-red-700">XÓA TOÀN BỘ DỮ LIỆU HỌC SINH</button>
            </div>
          </div>
        )}
      </div>

      {log.length > 0 && (
        <div className="card p-4 bg-slate-900 text-green-400 font-mono text-[10px] max-h-40 overflow-y-auto shadow-2xl">
          {log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </div>
  );
}
