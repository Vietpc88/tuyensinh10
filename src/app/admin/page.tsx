"use client";
import { useState, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, writeBatch, doc, getDocs, deleteDoc } from "firebase/firestore";
import * as XLSX from "xlsx";
import { StudentResult } from "@/lib/types";

// Header mapping từ file Excel xuất từ QUETHB.py
// Cột 0 = STT (bỏ), Cột 1 = Lớp (chèn thêm), Cột 2 = Mã HS*, Cột 3 = Họ và tên, ...
const FIELD_MAP: Record<string, string> = {
  "Lớp": "lopTen",
  "Mã học sinh*": "maHS",
  "Họ và tên": "hoTen",
  "HT6_CN": "kq_ht_6_cn", "HT6_HK1": "kq_ht_6_hk1", "HT6_HK2": "kq_ht_6_hk2",
  "RL6_CN": "kq_rl_6_cn", "RL6_HK1": "kq_rl_6_hk1", "RL6_HK2": "kq_rl_6_hk2",
  "HT7_CN": "kq_ht_7_cn", "HT7_HK1": "kq_ht_7_hk1", "HT7_HK2": "kq_ht_7_hk2",
  "RL7_CN": "kq_rl_7_cn", "RL7_HK1": "kq_rl_7_hk1", "RL7_HK2": "kq_rl_7_hk2",
  "HT8_CN": "kq_ht_8_cn", "HT8_HK1": "kq_ht_8_hk1", "HT8_HK2": "kq_ht_8_hk2",
  "RL8_CN": "kq_rl_8_cn", "RL8_HK1": "kq_rl_8_hk1", "RL8_HK2": "kq_rl_8_hk2",
  "HT9_CN": "kq_ht_9_cn", "HT9_HK1": "kq_ht_9_hk1", "HT9_HK2": "kq_ht_9_hk2",
  "RL9_CN": "kq_rl_9_cn", "RL9_HK1": "kq_rl_9_hk1", "RL9_HK2": "kq_rl_9_hk2",
  "Toán9": "diem_toan_9_cn", "Văn9": "diem_van_9_cn",
  "SửĐịa9": "diem_su_dia_9_cn", "KHTN9": "diem_khtn_9_cn",
  "KHXH9": "diem_khxh_9_cn", "Tin9": "diem_tin_9_cn",
  "CôngNghệ9": "diem_cong_nghe_9_cn", "GDCD9": "diem_gdcd_9_cn",
  "NN1_9": "diem_nn1_9_cn", "MãNN1_9": "ma_nn1_9",
  "NN2_9": "diem_nn2_9_cn", "MãNN2_9": "ma_nn2_9",
  "Tổng6": "tong_diem_6_cn", "Tổng7": "tong_diem_7_cn",
  "Tổng8": "tong_diem_8_cn", "Tổng9": "tong_diem_9_cn",
  "Danh hiệu 6": "danh_hieu_6", "Danh hiệu 7": "danh_hieu_7",
  "Danh hiệu 8": "danh_hieu_8", "Danh hiệu 9": "danh_hieu_9",
};

export default function AdminPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<StudentResult[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
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
    addLog(`📂 Đọc file: ${file.name}`);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as string[][];
        if (rows.length < 2) { addLog("❌ File không có dữ liệu"); return; }

        const headerRow = rows[0].map(String);
        setRawHeaders(headerRow);

        const students: StudentResult[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row.some((c) => c !== "")) continue; // bỏ dòng trống

          const s: StudentResult = { maHS: "", lopTen: "", hoTen: "" };
          headerRow.forEach((h, idx) => {
            const fieldKey = FIELD_MAP[h.trim()];
            if (fieldKey) s[fieldKey] = String(row[idx] ?? "");
          });
          if (!s.maHS && !s.lopTen) continue;
          s.uploadedAt = new Date().toISOString();
          students.push(s);
        }

        setPreview(students);
        setHeaders(["lopTen", "maHS", "hoTen", "kq_ht_9_cn", "kq_rl_9_cn", "tong_diem_9_cn"]);
        addLog(`✅ Đọc được ${students.length} học sinh từ ${rows.length - 1} dòng`);
        setStep("preview");
      } catch (err) {
        addLog(`❌ Lỗi đọc file: ${String(err)}`);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleUpload() {
    if (!preview.length) return;
    setUploading(true);
    addLog("⬆️ Bắt đầu tải lên Firestore...");

    try {
      // Xóa dữ liệu cũ cùng lớp trước (tuỳ chọn: chỉ xóa lớp có trong file)
      const lopsInFile = [...new Set(preview.map((s) => s.lopTen).filter(Boolean))];
      addLog(`🗑️ Xóa dữ liệu cũ của ${lopsInFile.length} lớp...`);

      const existingSnap = await getDocs(collection(db, "students"));
      const toDelete = existingSnap.docs.filter((d) =>
        lopsInFile.includes(d.data().lopTen)
      );
      for (let i = 0; i < toDelete.length; i += 500) {
        const batch = writeBatch(db);
        toDelete.slice(i, i + 500).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      addLog(`🗑️ Đã xóa ${toDelete.length} bản ghi cũ`);

      // Upload theo batch (max 500/batch)
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
        addLog(`⬆️ Đã tải ${uploaded}/${preview.length}...`);
      }
      addLog(`🎉 Hoàn thành! ${preview.length} học sinh đã được lưu vào Firestore.`);
      setStep("done");
    } catch (err) {
      addLog(`❌ Lỗi: ${String(err)}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteAll() {
    setDeleteConfirm(false);
    setUploading(true);
    addLog("🗑️ Đang xóa toàn bộ dữ liệu...");
    try {
      const snap = await getDocs(collection(db, "students"));
      for (let i = 0; i < snap.docs.length; i += 500) {
        const batch = writeBatch(db);
        snap.docs.slice(i, i + 500).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      addLog(`✅ Đã xóa ${snap.docs.length} bản ghi`);
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
            <h2 className="text-2xl font-bold text-blue-900">Trang Quản trị</h2>
            <p className="text-slate-500 text-sm">Tải lên file Excel từ công cụ QUETHB → lưu vào Firebase</p>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
          📋 File Excel cần là file xuất từ <b>Tab &quot;Lọc dữ liệu&quot;</b> của phần mềm QUETHB.py
          (có cột <b>Lớp</b> và <b>Mã học sinh*</b>)
        </div>
      </div>

      {/* Upload zone */}
      <div className="card p-6 mb-4">
        <h3 className="font-bold text-slate-700 mb-3">📁 Bước 1: Chọn file Excel</h3>
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-blue-300 rounded-xl p-10 text-center
                     cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all group"
        >
          <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">📊</div>
          <p className="font-medium text-slate-600">Nhấp để chọn file Excel (.xlsx)</p>
          <p className="text-xs text-slate-400 mt-1">File kết quả từ chức năng &quot;Lọc dữ liệu&quot; của QUETHB</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
        </div>
      </div>

      {/* Preview */}
      {step === "preview" && preview.length > 0 && (
        <div className="card p-6 mb-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="font-bold text-slate-700">
              👁️ Bước 2: Xem trước — <span className="text-blue-700">{preview.length} học sinh</span>
            </h3>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700
                         disabled:opacity-50 transition text-sm shadow"
            >
              {uploading ? "⏳ Đang tải lên..." : "⬆️ Tải lên Firebase"}
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-100">
            <table className="result-table text-xs">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Lớp</th>
                  <th>Mã HS</th>
                  <th>Họ tên</th>
                  <th>HT9_CN</th>
                  <th>RL9_CN</th>
                  <th>Tổng9</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 20).map((s, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td className="font-medium text-blue-700">{s.lopTen}</td>
                    <td>{s.maHS}</td>
                    <td className="text-left">{s.hoTen}</td>
                    <td>{s.kq_ht_9_cn}</td>
                    <td>{s.kq_rl_9_cn}</td>
                    <td>{s.tong_diem_9_cn}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 20 && (
              <p className="text-center text-xs text-slate-400 py-2">
                ... và {preview.length - 20} học sinh khác
              </p>
            )}
          </div>
        </div>
      )}

      {/* Log */}
      {log.length > 0 && (
        <div className="card p-4 mb-4">
          <h3 className="font-bold text-slate-600 mb-2 text-sm">📋 Nhật ký</h3>
          <div className="bg-slate-900 rounded-lg p-3 max-h-48 overflow-y-auto font-mono text-xs text-green-400 space-y-0.5">
            {log.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="card p-4 mb-4 bg-green-50 border-green-200">
          <div className="text-center">
            <div className="text-4xl mb-2">🎉</div>
            <p className="font-bold text-green-700">Tải lên hoàn tất!</p>
            <a href="/" className="mt-3 inline-block px-5 py-2 bg-green-600 text-white rounded-lg
                                   hover:bg-green-700 transition text-sm font-medium">
              🏠 Về trang chủ xem kết quả
            </a>
          </div>
        </div>
      )}

      {/* Xóa toàn bộ */}
      <div className="card p-4 border-red-100">
        <h3 className="font-bold text-red-600 mb-2 text-sm">⚠️ Vùng nguy hiểm</h3>
        {!deleteConfirm ? (
          <button onClick={() => setDeleteConfirm(true)}
            className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg
                       hover:bg-red-100 transition text-sm font-medium">
            🗑️ Xóa toàn bộ dữ liệu
          </button>
        ) : (
          <div className="flex gap-2 items-center flex-wrap">
            <span className="text-sm text-red-600 font-medium">Xác nhận xóa toàn bộ?</span>
            <button onClick={handleDeleteAll} disabled={uploading}
              className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700">
              ✅ Xác nhận xóa
            </button>
            <button onClick={() => setDeleteConfirm(false)}
              className="px-4 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50">
              Hủy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
