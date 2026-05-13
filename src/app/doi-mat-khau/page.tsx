"use client";
import { useState } from "react";
import { auth } from "@/lib/firebase";
import { updatePassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function ChangePasswordPage() {
  const { user, loading: authLoading } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const router = useRouter();

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast("❌ Mật khẩu xác nhận không khớp!", 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast("❌ Mật khẩu phải ít nhất 6 ký tự!", 'error');
      return;
    }

    setLoading(true);
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        showToast("✅ Đổi mật khẩu thành công!");
        setTimeout(() => router.push("/"), 2000);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') {
        showToast("⚠️ Vui lòng đăng nhập lại trước khi đổi mật khẩu!", 'error');
      } else {
        showToast("❌ Lỗi: " + err.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <div className="p-20 text-center animate-pulse font-black text-blue-600">Đang tải...</div>;
  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] fade-in">
      {toast && (
        <div className={`fixed top-20 right-6 z-[100] px-6 py-3 rounded-2xl shadow-2xl font-black text-[10px] uppercase fade-in ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      <div className="card p-10 w-full max-w-md bg-white shadow-2xl border-t-4 border-blue-600">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔑</div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Đổi mật khẩu</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Hồ sơ tuyển sinh 10</p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Mật khẩu mới</label>
            <input
              type="password"
              placeholder="Nhập mật khẩu mới"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Xác nhận mật khẩu</label>
            <input
              type="password"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-100 disabled:opacity-50 transition-all active:scale-95"
          >
            {loading ? "⌛ Đang cập nhật..." : "CẬP NHẬT MẬT KHẨU"}
          </button>
        </form>
      </div>
    </div>
  );
}
