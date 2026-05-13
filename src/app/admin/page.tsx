"use client";
import { useState, useRef, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, writeBatch, doc, getDocs, setDoc, query, where } from "firebase/firestore";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
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
function generatePassword() { return Math.random().toString(36).slice(-8); }

export default function AdminPage() {
  const { userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<StudentResult[]>([]);
  const [uploading, setUploading] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [teachers, setTeachers] = useState<AppUser[]>([]);

  useEffect(() => {
    if (!authLoading && (!userData || userData.role !== 'admin')) {
      router.push("/login");
    }
    if (userData?.role === 'admin') loadTeachers();
  }, [userData, authLoading]);

  async function loadTeachers() {
    const snap = await getDocs(collection(db, "users"));
    const list: AppUser[] = [];
    snap.forEach(d => list.push(d.data() as AppUser));
    setTeachers(list.filter(u => u.role === 'teacher'));
  }

  function addLog(msg: string) { setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]); }

  async function initAccounts() {
    setUploading(true);
    addLog("🚀 Đang khởi tạo danh sách tài khoản GVCN...");
    const classes = ["9A1", "9A2", "9A3", "9A4", "9A5", "9A6", "9A7", "9A8", "9A9"];
    
    for (const cls of classes) {
      const username = `gvcn${cls.toLowerCase()}`;
      const email = `${username}@hocba.edu.vn`;
      const password = generatePassword();
      
      try {
        // Lưu thông tin vào Firestore trước (vì Admin không thể tạo User Auth hàng loạt dễ dàng trên client mà không bị logout)
        // Trong thực tế, bạn nên dùng Firebase Admin SDK hoặc tạo thủ công.
        // Ở đây tôi sẽ tạo bản ghi User trong Firestore để Admin cấp pass.
        const userRef = doc(db, "users_temp", username); 
        await setDoc(userRef, {
          username, email, password, managedClass: cls, role: 'teacher'
        });
        addLog(`✅ Đã chuẩn bị tài khoản: ${username} | Pass: ${password}`);
      } catch (e) {
        addLog(`❌ Lỗi tạo ${username}: ${String(e)}`);
      }
    }
    setUploading(false);
    addLog("✨ Hoàn tất. Hãy đăng ký các email này trong Firebase Auth Console.");
  }

  // Logic upload Excel giữ nguyên nhưng bổ sung kiểm tra quyền
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview([]);
    addLog(`📂 Đang đọc file: ${file.name}`);
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
    } catch (e) { addLog(`❌ Lỗi Firebase: ${String(e)}`); }
    setUploading(false);
  }

  if (authLoading) return <div className="p-10 text-center">Đang kiểm tra quyền...</div>;

  return (
    <div className="fade-in max-w-6xl mx-auto space-y-6">
      <div className="card p-6 header-gradient text-white">
        <h2 className="text-2xl font-bold">Quản trị Hệ thống (ADMIN)</h2>
        <p className="opacity-80">Quản lý tài khoản GVCN và dữ liệu học bạ</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Tài khoản GVCN */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-700">👥 Tài khoản GVCN</h3>
            <button onClick={initAccounts} disabled={uploading} className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold hover:bg-blue-200">
              Khởi tạo 9 lớp
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-4 italic">* Admin copy email/pass này để tạo trong mục Authentication của Firebase Console.</p>
          <div className="overflow-auto max-h-60 border rounded">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 uppercase">
                <tr><th className="p-2">Lớp</th><th className="p-2">Tên đăng nhập / Email</th><th className="p-2">Mật khẩu</th></tr>
              </thead>
              <tbody className="divide-y">
                {/* Giả sử load từ users_temp */}
                {teachers.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-slate-400">Chưa có tài khoản nào</td></tr>}
                {teachers.map(t => (
                  <tr key={t.managedClass}>
                    <td className="p-2 font-bold">{t.managedClass}</td>
                    <td className="p-2">{t.email}</td>
                    <td className="p-2 font-mono text-blue-600">{t.password || "********"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upload Dữ liệu */}
        <div className="card p-6">
          <h3 className="font-bold text-slate-700 mb-4">📊 Tải lên dữ liệu học bạ</h3>
          <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center cursor-pointer hover:bg-slate-50 transition">
             <span className="text-3xl block mb-2">📁</span>
             <span className="text-sm font-medium text-slate-600">Chọn file Excel (.xlsx)</span>
             <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
          </div>
          {preview.length > 0 && (
            <button onClick={handleUpload} disabled={uploading} className="w-full mt-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 shadow-lg">
              {uploading ? "⏳ Đang tải..." : `⬆️ Tải lên ${preview.length} dòng`}
            </button>
          )}
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
