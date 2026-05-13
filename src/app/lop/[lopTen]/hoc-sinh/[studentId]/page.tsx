"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import Link from "next/link";
import { StudentResult } from "@/lib/types";

// ---- Cấu trúc hiển thị kết quả ----
const YEARS = [6, 7, 8, 9] as const;
const YEAR_LABEL: Record<number, string> = { 6: "Lớp 6", 7: "Lớp 7", 8: "Lớp 8", 9: "Lớp 9" };
const XEPLOAI_LABEL: Record<string, string> = {
  T: "Tốt", K: "Khá", Đ: "Đạt", CĐ: "Chưa đạt",
  HTT: "Hoàn thành tốt", HTK: "Hoàn thành khá", HT: "Hoàn thành", KHT: "Không hoàn thành",
};
const XEPLOAI_COLOR = (v: string) => {
  if (["T", "HTT"].includes(v)) return "badge-green";
  if (["K", "HTK"].includes(v)) return "badge-blue";
  if (["Đ", "HT"].includes(v)) return "badge-yellow";
  return "badge-red";
};

const DIEM_MON_9 = [
  { key: "diem_toan_9_cn",      label: "Toán" },
  { key: "diem_van_9_cn",       label: "Ngữ Văn" },
  { key: "diem_su_dia_9_cn",    label: "Lịch sử - Địa lí" },
  { key: "diem_khtn_9_cn",      label: "KHTN" },
  { key: "diem_khxh_9_cn",      label: "KHXH" },
  { key: "diem_tin_9_cn",       label: "Tin học" },
  { key: "diem_cong_nghe_9_cn", label: "Công nghệ" },
  { key: "diem_gdcd_9_cn",      label: "GDCD" },
  { key: "diem_nn1_9_cn",       label: "Ngoại ngữ 1" },
  { key: "diem_nn2_9_cn",       label: "Ngoại ngữ 2" },
];

// ---- Modal xác nhận sửa ----
function ConfirmModal({
  field, oldVal, newVal, onConfirm, onCancel,
}: {
  field: string; oldVal: string; newVal: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="card p-6 max-w-sm w-full mx-4 shadow-2xl fade-in">
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">⚠️</div>
          <h3 className="font-bold text-lg text-slate-800">Xác nhận thay đổi</h3>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 mb-4 text-sm space-y-1">
          <div><span className="text-slate-500">Trường:</span> <b className="text-blue-700">{field}</b></div>
          <div><span className="text-slate-500">Giá trị cũ:</span>{" "}
            <span className="line-through text-red-500">{oldVal || "(trống)"}</span>
          </div>
          <div><span className="text-slate-500">Giá trị mới:</span>{" "}
            <span className="font-bold text-green-600">{newVal || "(trống)"}</span>
          </div>
        </div>
        <p className="text-xs text-orange-600 bg-orange-50 rounded p-2 mb-4">
          ⚠️ Hành động này sẽ cập nhật dữ liệu trên hệ thống. Hãy chắc chắn trước khi xác nhận.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600
                       hover:bg-slate-50 transition font-medium text-sm">
            Hủy
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2 rounded-lg bg-blue-600 text-white
                       hover:bg-blue-700 transition font-bold text-sm">
            ✅ Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Ô chỉnh sửa inline ----
function EditableCell({
  fieldKey, value, label, onSave,
}: {
  fieldKey: string; value: string; label: string;
  onSave: (key: string, oldVal: string, newVal: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const handleEdit = () => { setDraft(value); setEditing(true); };
  const handleSave = () => {
    if (draft.trim() !== value) onSave(fieldKey, value, draft.trim());
    setEditing(false);
  };
  const handleCancel = () => setEditing(false);

  if (editing) {
    return (
      <div className="flex gap-1 items-center">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancel(); }}
          className="w-16 px-1 py-0.5 text-xs border border-blue-400 rounded focus:outline-none text-center"
        />
        <button onClick={handleSave} className="text-green-600 hover:text-green-800 text-xs font-bold">✓</button>
        <button onClick={handleCancel} className="text-red-400 hover:text-red-600 text-xs">✕</button>
      </div>
    );
  }

  return (
    <span className="group inline-flex items-center gap-1 cursor-pointer" onClick={handleEdit} title={`Sửa ${label}`}>
      <span>{value || "—"}</span>
      <span className="opacity-0 group-hover:opacity-60 text-blue-500 text-xs transition-opacity">✏️</span>
    </span>
  );
}

// ---- Trang chính ----
export default function StudentPage() {
  const params = useParams();
  const lopTen = decodeURIComponent(params.lopTen as string);
  const studentId = params.studentId as string;

  const [student, setStudent] = useState<StudentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  // Pending edit state for confirm modal
  const [pending, setPending] = useState<{ key: string; oldVal: string; newVal: string; label: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const ref = doc(db, "students", studentId);
        const snap = await getDoc(ref);
        if (snap.exists()) setStudent({ id: snap.id, ...snap.data() } as StudentResult);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, [studentId]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  function requestEdit(key: string, oldVal: string, newVal: string) {
    // Map key → label
    const label = key.replace(/_/g, " ").toUpperCase();
    if (newVal === oldVal) return;
    setPending({ key, oldVal, newVal, label });
  }

  async function confirmEdit() {
    if (!pending || !student) return;
    setSaving(true);
    try {
      const ref = doc(db, "students", student.id!);
      await updateDoc(ref, {
        [pending.key]: pending.newVal,
        updatedAt: new Date().toISOString(),
      });
      setStudent((prev) => prev ? { ...prev, [pending.key]: pending.newVal } : prev);
      showToast(`✅ Đã cập nhật "${pending.label}" thành công!`);
    } catch (e) {
      showToast("❌ Lỗi khi lưu. Vui lòng thử lại.");
    } finally {
      setSaving(false);
      setPending(null);
    }
  }

  if (loading) return (
    <div className="text-center py-20 text-slate-400">⏳ Đang tải thông tin học sinh...</div>
  );
  if (!student) return (
    <div className="text-center py-20 text-slate-400">
      <div className="text-5xl mb-3">❓</div>
      <p>Không tìm thấy học sinh này.</p>
      <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">← Về trang chủ</Link>
    </div>
  );

  const val = (k: string) => student[k] || "";

  return (
    <div className="fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4 flex-wrap">
        <Link href="/" className="hover:text-blue-600">🏠 Trang chủ</Link>
        <span>›</span>
        <Link href={`/lop/${encodeURIComponent(lopTen)}`} className="hover:text-blue-600">Lớp {lopTen}</Link>
        <span>›</span>
        <span className="text-blue-700 font-semibold">{student.hoTen || student.maHS}</span>
      </div>

      {/* Header học sinh */}
      <div className="card p-6 mb-5">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center
                          text-white font-bold text-2xl shadow-md">
            {(student.hoTen || "?").charAt(0)}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-blue-900">{student.hoTen || "(Chưa có tên)"}</h2>
            <div className="flex gap-3 flex-wrap mt-1 text-sm text-slate-600">
              <span>🆔 Mã HS: <b>{student.maHS}</b></span>
              <span>🏫 Lớp: <b>{student.lopTen}</b></span>
              {student.updatedAt && (
                <span className="text-xs text-slate-400">Cập nhật: {student.updatedAt.substring(0, 10)}</span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {student.xep_loai_tot_nghiep && (
              <span className={`badge text-sm px-4 py-1 ${XEPLOAI_COLOR(student.xep_loai_tot_nghiep)}`}>
                🏆 {XEPLOAI_LABEL[student.xep_loai_tot_nghiep] || student.xep_loai_tot_nghiep}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tip */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-5 text-xs text-amber-700 flex items-center gap-2">
        ✏️ <span>Nhấp vào bất kỳ ô giá trị nào để <b>chỉnh sửa</b>. Sẽ có xác nhận trước khi lưu.</span>
      </div>

      {/* Kết quả từng năm */}
      {YEARS.map((yr) => {
        const ht = (period: string) => val(`kq_ht_${yr}_${period}`);
        const rl = (period: string) => val(`kq_rl_${yr}_${period}`);
        const tong = val(`tong_diem_${yr}_cn`);
        const danh_hieu = val(`danh_hieu_${yr}`);

        return (
          <div key={yr} className="card mb-4 overflow-hidden">
            <div className="px-4 py-3 bg-blue-600 text-white font-bold flex items-center justify-between">
              <span>📖 {YEAR_LABEL[yr]}</span>
              {danh_hieu && <span className="text-xs bg-white/20 px-3 py-0.5 rounded-full">🏅 {danh_hieu}</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="result-table">
                <thead>
                  <tr>
                    <th className="text-left" style={{ width: 160 }}>Kết quả</th>
                    <th>HK1</th>
                    <th>HK2</th>
                    <th>Cả năm</th>
                    {yr === 9 && <th>Tổng ĐTB</th>}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="text-left font-medium text-slate-700">📘 Học tập (HT)</td>
                    {(["hk1","hk2","cn"] as const).map((p) => {
                      const fk = `kq_ht_${yr}_${p}`;
                      const v = ht(p);
                      return (
                        <td key={p}>
                          {v ? <span className={`badge ${XEPLOAI_COLOR(v)}`}>{v}</span> : "—"}
                          <span className="block">
                            <EditableCell fieldKey={fk} value={v} label={`HT ${yr} ${p}`} onSave={requestEdit} />
                          </span>
                        </td>
                      );
                    })}
                    {yr === 9 && <td rowSpan={2} className="align-middle font-bold text-blue-800 text-lg">{tong || "—"}</td>}
                  </tr>
                  <tr>
                    <td className="text-left font-medium text-slate-700">🌟 Rèn luyện (RL)</td>
                    {(["hk1","hk2","cn"] as const).map((p) => {
                      const fk = `kq_rl_${yr}_${p}`;
                      const v = rl(p);
                      return (
                        <td key={p}>
                          {v ? <span className={`badge ${XEPLOAI_COLOR(v)}`}>{v}</span> : "—"}
                          <span className="block">
                            <EditableCell fieldKey={fk} value={v} label={`RL ${yr} ${p}`} onSave={requestEdit} />
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Điểm TBM lớp 9 */}
      <div className="card mb-4 overflow-hidden">
        <div className="px-4 py-3 bg-indigo-600 text-white font-bold">📊 Điểm TBM Lớp 9 (Cả năm)</div>
        <div className="overflow-x-auto">
          <table className="result-table">
            <thead>
              <tr>
                <th className="text-left">Môn học</th>
                <th>Điểm TBM</th>
                <th>Chỉnh sửa</th>
              </tr>
            </thead>
            <tbody>
              {DIEM_MON_9.map(({ key, label }) => (
                <tr key={key}>
                  <td className="text-left">{label}</td>
                  <td className="font-bold text-blue-800">{val(key) || "—"}</td>
                  <td>
                    <EditableCell fieldKey={key} value={val(key)} label={label} onSave={requestEdit} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-800 text-white px-5 py-3 rounded-xl
                        shadow-2xl text-sm fade-in">
          {toast}
        </div>
      )}

      {/* Confirm Modal */}
      {pending && (
        <ConfirmModal
          field={pending.label}
          oldVal={pending.oldVal}
          newVal={pending.newVal}
          onConfirm={confirmEdit}
          onCancel={() => setPending(null)}
        />
      )}

      {saving && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20">
          <div className="bg-white px-6 py-4 rounded-xl shadow-xl text-blue-700 font-medium">
            ⏳ Đang lưu...
          </div>
        </div>
      )}
    </div>
  );
}
