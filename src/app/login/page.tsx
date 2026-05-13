"use client";
import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      
      // 1. Kiểm tra quyền trong Database trước
      const userDoc = await getDoc(doc(db, "users", cred.user.uid));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.role === 'admin') {
          router.push("/admin");
        } else {
          router.push("/"); // GVCN đã được cấp quyền trong DB
        }
      } 
      // 2. Nếu không có trong DB, kiểm tra mẫu email gvcn...
      else if (cred.user.email?.toLowerCase().startsWith("gvcn")) {
        router.push("/");
      } 
      else {
        setError("Tài khoản chưa được phân quyền. Vui lòng liên hệ Admin.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Email hoặc mật khẩu không đúng.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center fade-in bg-slate-50/50">
      <div className="card p-10 w-full max-w-md shadow-2xl border-t-4 border-blue-600">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-2xl font-black text-slate-800">Đăng nhập</h2>
          <p className="text-slate-500 text-sm mt-1">Hệ thống Học Bạ Số THCS</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Email tài khoản</label>
            <input
              type="email"
              placeholder="ten@yahoo.com hoặc gvcn..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Mật khẩu</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              required
            />
          </div>
          
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-xs text-center rounded-xl border border-red-100 font-medium">
              ⚠️ {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 disabled:opacity-50 transition-all active:scale-95"
          >
            {loading ? "⌛ Đang đăng nhập..." : "Đăng nhập ngay"}
          </button>
        </form>
      </div>
    </div>
  );
}
