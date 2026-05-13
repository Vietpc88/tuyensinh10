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
      } else {
        addLog(`❌ Lỗi: ${data.error}`);
      }
    } catch (e) {
      addLog(`❌ Lỗi kết nối API: ${String(e)}`);
    } finally {
      setUploading(false);
    }
  }

  // Upload logic
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
    } catch (e) { addLog(`❌ Lỗi Firebase: ${String(e)}`); }
    setUploading(false);
  }

  if (authLoading) return <div className="p-10 text-center animate-pulse font-bold text-blue-600">⏳ Đang tải dữ liệu...</div>;

  return (
    <div className="fade-in max-w-6xl mx-auto space-y-6">
      <div className="card p-6 header-gradient text-white flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Quản trị Học bạ Số</h2>
          <p className="opacity-80">Quản lý lớp học và tài khoản giáo viên</p>
        </div>
        <button onClick={() => { signOut(auth); router.push("/login"); }} className="bg-white/20 px-4 py-2 rounded-lg text-sm font-bold hover:bg-white/30 transition">
          Đăng xuất 🚪
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Form Tạo tài khoản */}
        <div className="card p-6">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
            👤 Tạo tài khoản GVCN
          </h3>
          <form onSubmit={createTeacherAccount} className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">CHỌN LỚP (TỪ DATA)</label>
              <select 
                value={newTeacher.managedClass}
                onChange={(e) => setNewTeacher({...newTeacher, managedClass: e.target.value})}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                required
              >
                <option value="">-- Chọn lớp học --</option>
                {availableClasses.map(c => <option key={c} value={c}>Lớp {c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">EMAIL GIÁO VIÊN</label>
              <input 
                type="email"
                placeholder="gvcn9a1@hocba.edu.vn"
                value={newTeacher.email}
                onChange={(e) => setNewTeacher({...newTeacher, email: e.target.value})}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">MẬT KHẨU</label>
              <input 
                type="password"
                placeholder="Mật khẩu ít nhất 6 ký tự"
                value={newTeacher.password}
                onChange={(e) => setNewTeacher({...newTeacher, password: e.target.value})}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={uploading || availableClasses.length === 0}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition shadow-md"
            >
              {uploading ? "⌛ Đang xử lý..." : "➕ Tạo tài khoản"}
            </button>
            {availableClasses.length === 0 && <p className="text-[10px] text-red-500 text-center mt-1 italic">* Cần tải lên dữ liệu học sinh trước để lấy danh sách lớp.</p>}
          </form>
        </div>

        {/* Danh sách GV */}
        <div className="card p-6">
          <h3 className="font-bold text-slate-700 mb-4">👥 Danh sách giáo viên</h3>
          <div className="overflow-auto max-h-[300px] border rounded shadow-inner">
            <table className="w-full text-[11px] text-left">
              <thead className="bg-slate-50 sticky top-0">
                <tr><th className="p-2 border-b">Lớp</th><th className="p-2 border-b">Email</th></tr>
              </thead>
              <tbody className="divide-y">
                {teachers.length === 0 && <tr><td colSpan={2} className="p-4 text-center text-slate-400 italic">Chưa có tài khoản nào</td></tr>}
                {teachers.map(t => (
                  <tr key={t.uid} className="hover:bg-slate-50">
                    <td className="p-2 font-bold text-blue-800">{t.managedClass}</td>
                    <td className="p-2 text-slate-600">{t.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upload Dữ liệu */}
        <div className="card p-6">
          <h3 className="font-bold text-slate-700 mb-4">📊 Tải lên dữ liệu mới</h3>
          <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition group">
             <span className="text-4xl block mb-2 group-hover:scale-110 transition">📊</span>
             <span className="text-sm font-medium text-slate-600">Chọn file Excel (.xlsx)</span>
             <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
          </div>
          {preview.length > 0 && (
            <button onClick={handleUpload} disabled={uploading} className="w-full mt-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg active:scale-95 transition">
              {uploading ? "⏳ Đang tải..." : `⬆️ Tải ${preview.length} HS`}
            </button>
          )}
          <p className="text-[10px] text-slate-400 mt-2 text-center">Hệ thống tự nhận diện các lớp học có trong file Excel.</p>
        </div>
      </div>

      {log.length > 0 && (
        <div className="card p-4 bg-slate-900 text-green-400 font-mono text-[10px] max-h-40 overflow-y-auto">
          {log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </div>
  );
}
