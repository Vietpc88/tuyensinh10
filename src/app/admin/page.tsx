"use client";
import { useState, useRef, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, writeBatch, doc, getDocs, setDoc, query, where, deleteDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
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
  "toán9": "diem_toan_9_cn", "văn9": "diem_van_9_cn",
  "sửđịa9": "diem_su_dia_9_cn", "khtn9": "diem_khtn_9_cn",
  "khxh9": "diem_khxh_9_cn", "tin9": "diem_tin_9_cn",
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
  const [uploading, setUploading] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [teachers, setTeachers] = useState<AppUser[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  
  // Quản lý xóa
  const [selectedClassToDelete, setSelectedClassToDelete] = useState("");
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  // State form tạo teacher
  const [newTeacher, setNewTeacher] = useState({ email: "", password: "", managedClass: "" });

  useEffect(() => {
    if (!authLoading) {
      if (!userData || userData.role !== 'admin') router.push("/login");
      else {
        loadTeachers();
        detectClasses();
      }
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
    if (!newTeacher.email || !newTeacher.password || !newTeacher.managedClass) return;
    setUploading(true);
    addLog(`⏳ Đang tạo tài khoản cho lớp ${newTeacher.managedClass}...`);
    try {
      const res = await fetch("/api/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newTeacher.email,
          password: newTeacher.password,
          managedClass: newTeacher.managedClass,
          username: newTeacher.email.split("@")[0],
          role: "teacher"
        }),
      });
      const data = await res.json();
      if (data.success) {
        addLog(`✅ Thành công! Đã tạo tài khoản ${newTeacher.email}`);
        setNewTeacher({ email: "", password: "", managedClass: "" });
        loadTeachers();
      } else { addLog(`❌ Lỗi: ${data.error}`); }
    } catch (e) { addLog(`❌ Lỗi kết nối API: ${String(e)}`); }
    finally { setUploading(false); }
  }

  async function deleteDataByClass() {
    if (!selectedClassToDelete) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa TOÀN BỘ dữ liệu học sinh của lớp ${selectedClassToDelete}?`)) return;
    
    setUploading(true);
    addLog(`🗑️ Đang xóa dữ liệu lớp ${selectedClassToDelete}...`);
    try {
      const q = query(collection(db, "students"), where("lopTen", "==", selectedClassToDelete));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.forEach(d => batch.delete(d.ref));
      await batch.commit();
      addLog(`✅ Đã xóa xong ${snap.size} học sinh lớp ${selectedClassToDelete}.`);
      detectClasses();
      setSelectedClassToDelete("");
    } catch (e) { addLog(`❌ Lỗi khi xóa: ${String(e)}`); }
    finally { setUploading(false); }
  }

  async function deleteAllData() {
    setConfirmDeleteAll(false);
    setUploading(true);
    addLog("🗑️ Đang xóa TOÀN BỘ dữ liệu học sinh hệ thống...");
    try {
      const snap = await getDocs(collection(db, "students"));
      let count = 0;
      for (let i = 0; i < snap.docs.length; i += 500) {
        const batch = writeBatch(db);
        snap.docs.slice(i, i + 500).forEach(d => batch.delete(d.ref));
        await batch.commit();
        count += Math.min(500, snap.docs.length - count);
        addLog(`🗑️ Đã xóa ${count}/${snap.size}...`);
      }
      addLog("✅ Đã dọn sạch toàn bộ dữ liệu học sinh.");
      detectClasses();
    } catch (e) { addLog(`❌ Lỗi: ${String(e)}`); }
    finally { setUploading(false); }
  }

  // Upload logic giữ nguyên
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLog([]);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        const rawHeaderRow = rows[0].map(String);
        const normalizedHeaderRow = rawHeaderRow.map(normalizeHeader);
        const students: StudentResult[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row.some(c => String(c).trim() !== "")) continue;
          const s: StudentResult = { maHS: "", lopTen: "", hoTen: "" };
          normalizedHeaderRow.forEach((h, idx) => {
            const fieldKey = FIELD_MAP[h];
            if (fieldKey) s[fieldKey] = String(row[idx] ?? "").trim();
          });
          if (s.maHS && s.lopTen) students.push(s);
        }
        setPreview(students);
        addLog(`✅ Nhận diện ${students.length} học sinh.`);
      } catch (err) { addLog(`❌ Lỗi: ${String(err)}`); }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleUpload() {
    setUploading(true);
    try {
      let uploaded = 0;
      for (let i = 0; i < preview.length; i += 400) {
        const batch = writeBatch(db);
        preview.slice(i, i + 400).forEach(s => {
          const ref = doc(collection(db, "students"));
          batch.set(ref, s);
        });
        await batch.commit();
        uploaded += Math.min(400, preview.length - uploaded);
        addLog(`⬆️ Đã tải ${uploaded}/${preview.length}...`);
      }
      addLog("🎉 Tải lên hoàn tất!");
      detectClasses();
      setPreview([]);
    } catch (e) { addLog(`❌ Lỗi Firebase: ${String(e)}`); }
    finally { setUploading(false); }
  }

  if (authLoading) return <div className="p-10 text-center animate-pulse font-bold text-blue-600">⏳ Đang tải dữ liệu quản trị...</div>;

  return (
    <div className="fade-in max-w-6xl mx-auto space-y-6">
      <div className="card p-6 header-gradient text-white flex justify-between items-center shadow-blue-200">
        <div>
          <h2 className="text-2xl font-bold text-white">Quản trị Hệ thống</h2>
          <p className="opacity-80 text-sm">Quản lý lớp học, tài khoản giáo viên và dữ liệu học bạ</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Cột trái: Tài khoản & Lớp */}
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">👤 Cấp tài khoản GVCN</h3>
            <form onSubmit={createTeacherAccount} className="space-y-3">
              <select value={newTeacher.managedClass} onChange={(e) => setNewTeacher({...newTeacher, managedClass: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" required>
                <option value="">-- Chọn lớp quản lý --</option>
                {availableClasses.map(c => <option key={c} value={c}>Lớp {c}</option>)}
              </select>
              <input type="email" placeholder="Email giáo viên" value={newTeacher.email} onChange={(e) => setNewTeacher({...newTeacher, email: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" required />
              <input type="password" placeholder="Mật khẩu đăng nhập" value={newTeacher.password} onChange={(e) => setNewTeacher({...newTeacher, password: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" required />
              <button type="submit" disabled={uploading || availableClasses.length === 0} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition shadow-md shadow-blue-100">➕ Tạo tài khoản</button>
            </form>
          </div>

          <div className="card p-6 border-red-100 bg-red-50/30">
            <h3 className="font-bold text-red-700 mb-4 flex items-center gap-2">🗑️ Quản lý xóa dữ liệu</h3>
            <div className="space-y-4">
              <div className="flex gap-2">
                <select value={selectedClassToDelete} onChange={(e) => setSelectedClassToDelete(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-red-200 text-sm focus:outline-none focus:ring-1 focus:ring-red-400">
                  <option value="">-- Chọn lớp cần xóa --</option>
                  {availableClasses.map(c => <option key={c} value={c}>Lớp {c}</option>)}
                </select>
                <button onClick={deleteDataByClass} disabled={!selectedClassToDelete || uploading} className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-50 shadow-sm">Xóa Lớp</button>
              </div>
              
              <div className="pt-4 border-t border-red-100">
                {!confirmDeleteAll ? (
                  <button onClick={() => setConfirmDeleteAll(true)} className="text-red-500 text-xs font-bold hover:underline">Xóa TOÀN BỘ dữ liệu học sinh</button>
                ) : (
                  <div className="flex gap-2 items-center bg-white p-3 rounded-lg border border-red-200 shadow-sm">
                    <span className="text-xs font-bold text-red-600">Bạn chắc chắn?</span>
                    <button onClick={deleteAllData} className="px-3 py-1 bg-red-600 text-white rounded text-[10px] font-bold">CÓ, XÓA HẾT</button>
                    <button onClick={() => setConfirmDeleteAll(false)} className="px-3 py-1 bg-slate-200 text-slate-600 rounded text-[10px] font-bold">HỦY</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Cột phải: Upload & Danh sách */}
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-bold text-slate-700 mb-4">📊 Tải lên học bạ mới</h3>
            <div onClick={() => !uploading && fileRef.current?.click()} className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition group">
              <span className="text-4xl block mb-2 group-hover:scale-110 transition">📊</span>
              <span className="text-sm font-medium text-slate-600">Kéo thả hoặc nhấn để chọn file Excel</span>
              <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
            </div>
            {preview.length > 0 && (
              <button onClick={handleUpload} disabled={uploading} className="w-full mt-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg active:scale-95 transition">
                {uploading ? "⏳ Đang xử lý..." : `⬆️ Tải lên ${preview.length} học sinh`}
              </button>
            )}
          </div>

          <div className="card p-6">
            <h3 className="font-bold text-slate-700 mb-4">👥 Giáo viên đã cấp quyền</h3>
            <div className="overflow-auto max-h-[300px] border rounded-lg bg-slate-50">
              <table className="w-full text-[11px] text-left">
                <thead className="bg-white sticky top-0 border-b">
                  <tr><th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Lớp</th><th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Tài khoản</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teachers.map(t => (
                    <tr key={t.uid} className="bg-white hover:bg-blue-50/50 transition">
                      <td className="p-3 font-black text-blue-800">Lớp {t.managedClass}</td>
                      <td className="p-3 text-slate-500 font-medium">{t.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {log.length > 0 && (
        <div className="card p-4 bg-slate-900 text-green-400 font-mono text-[10px] max-h-40 overflow-y-auto shadow-inner">
          {log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </div>
  );
}
