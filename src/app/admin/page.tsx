"use client";
import { useState, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, writeBatch, doc, getDocs, deleteDoc } from "firebase/firestore";
import * as XLSX from "xlsx";
import { StudentResult } from "@/lib/types";

// Header mapping chuẩn hóa (viết thường, bỏ khoảng trắng)
const FIELD_MAP: Record<string, string> = {
  "lớp": "lopTen",
  "mãhọcsinh*": "maHS",
  "họvàtên": "hoTen",
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
  "nn1_9": "diem_nn1_9_cn", "mãnn1_9": "ma_nn1_9",
  "nn2_9": "diem_nn2_9_cn", "mãnn2_9": "ma_nn2_9",
  "tổng6": "tong_diem_6_cn", "tổng7": "tong_diem_7_cn",
  "tổng8": "tong_diem_8_cn", "tổng9": "tong_diem_9_cn",
  "danhhiệu6": "danh_hieu_6", "danhhiệu7": "danh_hieu_7",
  "danhhiệu8": "danh_hieu_8", "danhhiệu9": "danh_hieu_9",
};

function normalizeHeader(h: string) {
  return String(h).toLowerCase().replace(/\s+/g, "").trim();
}

export default function AdminPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<StudentResult[]>([]);
  const [uploading, setUploading] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [step, setStep] = useState<"idle" | "preview" | "done">("idle");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  function addLog(msg: string) {
    setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLog([]);
    setPreview([]);
    addLog(`📂 Đang đọc file: ${file.name}`);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        
        if (rows.length < 2) { 
          addLog("❌ File rỗng hoặc không đúng định dạng."); 
          return; 
        }

        const rawHeaderRow = rows[0].map(String);
        const normalizedHeaderRow = rawHeaderRow.map(normalizeHeader);
        addLog(`📊 Tìm thấy các cột: ${rawHeaderRow.join(", ")}`);

        // Kiểm tra cột bắt buộc
        const hasLop = normalizedHeaderRow.includes("lớp");
        const hasMaHS = normalizedHeaderRow.includes("mãhọcsinh*");

        if (!hasLop || !hasMaHS) {
          addLog("❌ Thiếu cột bắt buộc! Cần cột 'Lớp' và 'Mã học sinh*'.");
          return;
        }

        const students: StudentResult[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row.some((c) => String(c).trim() !== "")) continue;

          const s: StudentResult = { maHS: "", lopTen: "", hoTen: "" };
          normalizedHeaderRow.forEach((h, idx) => {
            const fieldKey = FIELD_MAP[h];
            if (fieldKey) s[fieldKey] = String(row[idx] ?? "").trim();
          });

          if (s.maHS && s.lopTen) {
            s.uploadedAt = new Date().toISOString();
            students.push(s);
          }
        }

        if (students.length === 0) {
          addLog("⚠️ Không tìm thấy dữ liệu học sinh hợp lệ.");
        } else {
          setPreview(students);
          addLog(`✅ Đã nhận diện ${students.length} học sinh.`);
          setStep("preview");
        }
      } catch (err) {
        addLog(`❌ Lỗi phân tích file: ${String(err)}`);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleUpload() {
    if (!preview.length) return;
    setUploading(true);
    addLog("⬆️ Bắt đầu tải lên Firestore...");

    try {
      const lopsInFile = [...new Set(preview.map((s) => s.lopTen).filter(Boolean))];
      addLog(`🗑️ Xóa dữ liệu cũ của lớp: ${lopsInFile.join(", ")}`);

      // Xóa bản ghi cũ theo từng lớp
      const existingSnap = await getDocs(collection(db, "students"));
      const toDelete = existingSnap.docs.filter((d) =>
        lopsInFile.includes(d.data().lopTen)
      );

      for (let i = 0; i < toDelete.length; i += 500) {
        const batch = writeBatch(db);
        toDelete.slice(i, i + 500).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      addLog(`🗑️ Đã xóa ${toDelete.length} bản ghi cũ.`);

      // Ghi bản ghi mới
      let uploaded = 0;
      for (let i = 0; i < preview.length; i += 400) {
        const batch = writeBatch(db);
        const chunk = preview.slice(i, i + 400);
        chunk.forEach((s) => {
          const ref = doc(collection(db, "students"));
          batch.set(ref, s);
        });
        await batch.commit();
        uploaded += chunk.length;
        addLog(`⬆️ Tiến độ: ${uploaded}/${preview.length}...`);
      }
      addLog(`🎉 Thành công! ${preview.length} học sinh đã được lưu.`);
      setStep("done");
    } catch (err) {
      addLog(`❌ Lỗi Firebase: ${String(err)}. Hãy kiểm tra Firestore Rules!`);
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteAll() {
    setDeleteConfirm(false);
    setUploading(true);
    addLog("🗑️ Đang xóa toàn bộ...");
    try {
      const snap = await getDocs(collection(db, "students"));
      for (let i = 0; i < snap.docs.length; i += 500) {
        const batch = writeBatch(db);
        snap.docs.slice(i, i + 500).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      addLog(`✅ Đã xóa ${snap.docs.length} bản ghi.`);
      setPreview([]); setStep("idle");
    } catch (err) {
      addLog(`❌ Lỗi: ${String(err)}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fade-in max-w-5xl mx-auto">
      <div className="card p-6 mb-5">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">⚙️</span>
          <div>
            <h2 className="text-2xl font-bold text-blue-900">Quản trị Hệ thống</h2>
            <p className="text-slate-500 text-sm">Tải dữ liệu lên Firebase</p>
          </div>
        </div>
      </div>

      <div className="card p-6 mb-4">
        <h3 className="font-bold text-slate-700 mb-3">📁 Bước 1: Chọn file Excel (.xlsx)</h3>
        <div
          onClick={() => !uploading && fileRef.current?.click()}
          className={`border-2 border-dashed border-blue-300 rounded-xl p-10 text-center
                     transition-all group ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-500 hover:bg-blue-50'}`}
        >
          <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">📊</div>
          <p className="font-medium text-slate-600">Nhấn để chọn file kết quả từ QUETHB</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} disabled={uploading} />
        </div>
      </div>

      {step === "preview" && preview.length > 0 && (
        <div className="card p-6 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-700">👁️ Bước 2: Xem trước ({preview.length} dòng)</h3>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? "⏳ Đang xử lý..." : "⬆️ Tải lên Firebase"}
            </button>
          </div>
          <div className="max-h-60 overflow-auto border rounded text-xs">
            <table className="result-table">
              <thead>
                <tr><th>Lớp</th><th>Mã HS</th><th>Họ tên</th></tr>
              </thead>
              <tbody>
                {preview.slice(0, 10).map((s, i) => (
                  <tr key={i}><td>{s.lopTen}</td><td>{s.maHS}</td><td>{s.hoTen}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {log.length > 0 && (
        <div className="card p-4 mb-4 bg-slate-900 text-green-400 font-mono text-xs max-h-40 overflow-y-auto">
          {log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}

      {step === "done" && (
        <div className="p-4 mb-4 bg-green-100 text-green-700 rounded-lg text-center font-bold">
          ✅ Đã tải lên thành công! <a href="/" className="underline ml-2">Xem kết quả</a>
        </div>
      )}

      <div className="mt-8 pt-4 border-t">
        <button onClick={() => setDeleteConfirm(true)} className="text-red-500 text-xs hover:underline">
          🗑️ Xóa toàn bộ dữ liệu hệ thống
        </button>
        {deleteConfirm && (
          <div className="mt-2 flex gap-2">
            <button onClick={handleDeleteAll} className="bg-red-600 text-white px-3 py-1 rounded text-xs">Xác nhận xóa</button>
            <button onClick={() => setDeleteConfirm(false)} className="bg-slate-200 px-3 py-1 rounded text-xs">Hủy</button>
          </div>
        )}
      </div>
    </div>
  );
}
