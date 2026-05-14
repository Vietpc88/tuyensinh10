"use client";
import { useState, useRef, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, writeBatch, doc, getDocs, query, where, orderBy, limit, updateDoc, getDoc, setDoc } from "firebase/firestore";
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
  const [teachers, setTeachers] = useState<AppUser[]>([]);
  const [editLogs, setEditLogs] = useState<any[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [isSystemLocked, setIsSystemLocked] = useState(false);
  
  const [newTeacher, setNewTeacher] = useState({ username: "", password: "", managedClass: "" });
  const [classToDelete, setClassToDelete] = useState("");
  const [showDanger, setShowDanger] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!authLoading) {
      if (!userData || userData.role !== 'admin') router.push("/login");
      else { loadTeachers(); detectClasses(); loadEditLogs(); loadSettings(); }
    }
  }, [userData, authLoading, router]);

  async function loadSettings() {
    const docSnap = await getDoc(doc(db, "settings", "system"));
    if (docSnap.exists()) setIsSystemLocked(docSnap.data().isLocked);
  }

  async function toggleSystemLock() {
    const newState = !isSystemLocked;
    setUploading(true);
    try {
      await setDoc(doc(db, "settings", "system"), { isLocked: newState });
      setIsSystemLocked(newState);
      showToast(newState ? "🔒 Đã KHÓA toàn hệ thống!" : "🔓 Đã MỞ hệ thống!");
    } catch (e) { showToast("❌ Lỗi cập nhật trạng thái", 'error'); }
    finally { setUploading(false); }
  }

  async function loadTeachers() {
    const snap = await getDocs(collection(db, "users"));
    const list: AppUser[] = [];
    snap.forEach(d => list.push(d.data() as AppUser));
    setTeachers(list.filter(u => u.role === 'teacher').sort((a,b) => (a.username || "").localeCompare(b.username || "")));
  }

  async function loadEditLogs() {
    try {
      const q = query(collection(db, "edit_logs"), orderBy("timestamp", "desc"), limit(20));
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setEditLogs(list);
    } catch (e) { console.error("Logs load error:", e); }
  }

  async function detectClasses() {
    const snap = await getDocs(collection(db, "students"));
    const classes = new Set<string>();
    snap.forEach(d => { if (d.data().lopTen) classes.add(d.data().lopTen); });
    setAvailableClasses(Array.from(classes).sort());
  }

  async function updateTeacherClass(uid: string, newClass: string) {
    setUploading(true);
    try {
      await updateDoc(doc(db, "users", uid), { managedClass: newClass });
      showToast("✅ Đã cập nhật phân lớp!");
      loadTeachers();
    } catch (e) { showToast("❌ Lỗi cập nhật", 'error'); }
    finally { setUploading(false); }
  }

  async function createTeacherAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!newTeacher.username || !newTeacher.password) return;
    setUploading(true);
    try {
      const email = newTeacher.username.includes("@") ? newTeacher.username : `${newTeacher.username}@hocba.local`;
      const res = await fetch("/api/create-user", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: newTeacher.password, managedClass: newTeacher.managedClass, username: newTeacher.username, role: "teacher" }),
      });
      if ((await res.json()).success) {
        showToast(`✅ Đã tạo tài khoản ${newTeacher.username}`);
        setNewTeacher({ username: "", password: "", managedClass: "" });
        loadTeachers();
      }
    } catch (e) { showToast("❌ Lỗi tạo tài khoản", 'error'); }
    finally { setUploading(false); }
  }

  async function deleteTeacher(uid: string, name: string) {
    if (!confirm(`Xóa vĩnh viễn tài khoản ${name}?`)) return;
    setUploading(true);
    try {
      await fetch("/api/delete-user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uid }) });
      showToast(`🗑️ Đã xóa giáo viên ${name}`);
      loadTeachers();
    } catch (e) { showToast("❌ Lỗi xóa giáo viên", 'error'); }
    finally { setUploading(false); }
  }

  async function deleteData(type: 'class' | 'all') {
    const target = type === 'class' ? `lớp ${classToDelete}` : "TOÀN BỘ hệ thống";
    if (!confirm(`Xác nhận xóa dữ liệu học sinh của ${target}?`)) return;
    setUploading(true);
    try {
      const q = type === 'class' ? query(collection(db, "students"), where("lopTen", "==", classToDelete)) : collection(db, "students");
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.forEach(d => batch.delete(d.ref));
      await batch.commit();
      showToast(`✅ Đã xóa dữ liệu ${target}`);
      detectClasses();
    } catch (e) { showToast("❌ Lỗi khi xóa", 'error'); }
    finally { setUploading(false); }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDuplicates([]); setPreview([]);
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
        if (foundDuplicates.length > 0) { setDuplicates(foundDuplicates); showToast("❌ Có mã HS trùng!", 'error'); }
        else { setPreview(students); showToast(`✅ Hợp lệ (${students.length} HS)`); }
      } catch (err) { showToast("❌ Lỗi đọc file", 'error'); }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleUpload() {
    setUploading(true);
    try {
      for (let i = 0; i < preview.length; i += 400) {
        const batch = writeBatch(db);
        preview.slice(i, i + 400).forEach(s => batch.set(doc(collection(db, "students")), s));
        await batch.commit();
      }
      showToast(`✅ Đã tải lên ${preview.length} HS thành công!`);
      detectClasses(); setPreview([]);
    } catch (e) { showToast("❌ Lỗi tải lên", 'error'); }
    finally { setUploading(false); }
  }

  async function handleExport() {
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
      XLSX.writeFile(wb, `Ho_So_Tuyen_Sinh_10_${new Date().toLocaleDateString()}.xlsx`);
      showToast("✅ Đã xuất Excel thành công!");
    } catch (e) { showToast("❌ Lỗi xuất file", 'error'); }
  }

  if (authLoading) return <div className="p-20 text-center animate-pulse text-blue-600 font-black uppercase text-xs tracking-widest">Đang tải...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 fade-in pb-20">
      {toast && (
        <div className={`fixed top-20 right-6 z-[100] px-6 py-3 rounded-2xl shadow-2xl font-black text-[10px] uppercase fade-in ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* CÔNG TẮC KHÓA HỆ THỐNG */}
      <div className={`card p-6 border-2 transition-all flex flex-col md:flex-row justify-between items-center gap-4 ${isSystemLocked ? 'bg-red-50 border-red-200 shadow-red-100' : 'bg-blue-50 border-blue-200 shadow-blue-100'}`}>
        <div className="flex items-center gap-4 text-center md:text-left">
          <span className="text-4xl">{isSystemLocked ? '🔒' : '🔓'}</span>
          <div>
            <h3 className={`text-lg font-black uppercase ${isSystemLocked ? 'text-red-700' : 'text-blue-700'}`}>
              Trạng thái hệ thống: {isSystemLocked ? 'ĐANG KHÓA' : 'ĐANG MỞ'}
            </h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
              {isSystemLocked ? 'Giáo viên không thể đăng nhập hoặc xem hồ sơ.' : 'Giáo viên có thể truy cập và chỉnh sửa dữ liệu bình thường.'}
            </p>
          </div>
        </div>
        <button 
          onClick={toggleSystemLock} 
          disabled={uploading}
          className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 ${isSystemLocked ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-600 text-white hover:bg-red-700'}`}
        >
          {isSystemLocked ? 'MỞ HỆ THỐNG NGAY' : 'KHÓA TOÀN HỆ THỐNG'}
        </button>
      </div>

      <div className="card p-6 bg-slate-900 text-white flex justify-between items-center shadow-xl">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Hồ sơ tuyển sinh 10</h2>
          <p className="text-blue-400 text-[10px] font-black opacity-80 uppercase tracking-widest mt-1">Bảng quản trị Admin</p>
        </div>
        <button onClick={handleExport} className="bg-blue-600 text-white px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase hover:bg-blue-700 transition shadow-lg">📥 XUẤT EXCEL TỔNG</button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-6 bg-white border border-slate-100 shadow-sm">
          <h3 className="font-black text-slate-800 mb-5 text-[10px] uppercase tracking-widest">👤 Cấp tài khoản GV</h3>
          <form onSubmit={createTeacherAccount} className="space-y-4">
            <input placeholder="Tên đăng nhập" value={newTeacher.username} onChange={e => setNewTeacher({...newTeacher, username: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none" required />
            <input type="password" placeholder="Mật khẩu" value={newTeacher.password} onChange={e => setNewTeacher({...newTeacher, password: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none" required />
            <select value={newTeacher.managedClass} onChange={e => setNewTeacher({...newTeacher, managedClass: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none">
              <option value="">-- Chưa phân lớp --</option>
              {availableClasses.map(c => <option key={c} value={c}>Lớp {c}</option>)}
            </select>
            <button type="submit" disabled={uploading} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs hover:bg-blue-700 transition-all uppercase tracking-widest">TẠO TÀI KHOẢN</button>
          </form>
        </div>

        <div className="card p-6 bg-white border border-slate-100 shadow-sm">
           <h3 className="font-black text-slate-800 mb-5 text-[10px] uppercase tracking-widest">👥 Phân quyền giáo viên</h3>
           <div className="space-y-3 overflow-y-auto max-h-[400px] custom-scrollbar pr-1">
             {teachers.map(t => (
               <div key={t.uid} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-black text-slate-700 text-[11px] truncate uppercase tracking-tight">{t.username}</p>
                    <button onClick={() => deleteTeacher(t.uid, t.username || "")} className="text-red-400 hover:text-red-600 transition p-1">🗑️</button>
                  </div>
                  <select 
                    value={t.managedClass || ""} 
                    onChange={(e) => updateTeacherClass(t.uid, e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold text-blue-600 outline-none"
                  >
                    <option value="">Chưa phân lớp</option>
                    {availableClasses.map(c => <option key={c} value={c}>Lớp {c}</option>)}
                  </select>
               </div>
             ))}
           </div>
        </div>

        <div className="card p-6 bg-white border border-slate-100 shadow-sm">
          <h3 className="font-black text-slate-800 mb-5 text-[10px] uppercase tracking-widest">📥 Nhập dữ liệu</h3>
          <div onClick={() => !uploading && fileRef.current?.click()} className="border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all group">
            <span className="text-4xl block mb-2 group-hover:scale-110 transition">📥</span>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Chọn file Excel học sinh</p>
            <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
          </div>
          {duplicates.length > 0 && ( <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl text-center"><p className="text-red-600 font-black text-[9px] uppercase">❌ TRÙNG MÃ HS ({duplicates.length})</p></div> )}
          {preview.length > 0 && ( <button onClick={handleUpload} disabled={uploading} className="w-full mt-4 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs hover:bg-blue-700 transition-all uppercase tracking-widest">TẢI LÊN {preview.length} HS</button> )}
        </div>
      </div>

      <div className="card p-6 bg-white shadow-sm border border-slate-100">
        <h3 className="font-black text-slate-800 mb-5 text-[10px] uppercase tracking-widest flex items-center gap-2">🕒 Nhật ký hệ thống</h3>
        <div className="overflow-x-auto border rounded-2xl">
          <table className="w-full text-left border-collapse text-[10px]">
            <thead className="bg-slate-50 border-b">
              <tr className="text-slate-400 uppercase font-black tracking-widest">
                <th className="p-4">Thời gian</th><th className="p-4">Người sửa</th><th className="p-4">Học sinh</th><th className="p-4">Nội dung thay đổi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {editLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 transition font-bold">
                  <td className="p-4 text-slate-400">{new Date(log.timestamp).toLocaleString('vi-VN')}</td>
                  <td className="p-4 text-blue-600 uppercase">{log.editorName}</td>
                  <td className="p-4 uppercase text-slate-800">{log.studentName} ({log.maHS})</td>
                  <td className="p-4 text-slate-500 uppercase tracking-tight">{log.field.replace(/_/g, ' ')}: <span className="line-through text-red-400">{log.oldValue}</span> ➔ <span className="text-green-600 font-black">{log.newValue}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-10 border-t pt-10 text-center">
          <button onClick={() => setShowDanger(!showDanger)} className={`px-6 py-2 rounded-xl text-[9px] font-black transition-all border ${showDanger ? 'bg-red-50 text-red-600 border-red-200 shadow-inner' : 'text-slate-400 border-slate-200 hover:bg-slate-50'}`}>
            {showDanger ? "✖ ĐÓNG VÙNG NGUY HIỂM" : "⚠️ CÀI ĐẶT NÂNG CAO (XÓA DỮ LIỆU)"}
          </button>
        {showDanger && (
          <div className="grid md:grid-cols-2 gap-6 mt-6 fade-in text-left">
            <div className="card p-6 border-red-100 bg-red-50/20"><h4 className="text-red-700 font-black text-[10px] uppercase mb-4 tracking-widest">🗑️ Xóa theo lớp</h4><div className="flex gap-2"><select value={classToDelete} onChange={e => setClassToDelete(e.target.value)} className="flex-1 px-4 py-2 rounded-xl border border-red-100 text-xs font-bold bg-white"><option value="">-- Chọn lớp cần xóa --</option>{availableClasses.map(c => <option key={c} value={c}>Lớp {c}</option>)}</select><button onClick={() => deleteData('class')} disabled={!classToDelete || uploading} className="px-6 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black hover:bg-red-700 uppercase tracking-widest">XÓA</button></div></div>
            <div className="card p-6 border-red-100 bg-red-50/20"><h4 className="text-red-700 font-black text-[10px] uppercase mb-4 tracking-widest">🚫 Dọn sạch</h4><button onClick={() => deleteData('all')} disabled={uploading} className="w-full py-3 bg-red-600 text-white rounded-xl text-[10px] font-black hover:bg-red-700 uppercase tracking-widest">XÓA TOÀN BỘ DỮ LIỆU HS</button></div>
          </div>
        )}
      </div>
    </div>
  );
}
