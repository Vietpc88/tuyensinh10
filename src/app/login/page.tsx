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
      
      // Kiểm tra xem là Admin (trong Firestore) hay GVCN (qua email)
      const userDoc = await getDoc(doc(db, "users", cred.user.uid));
      
      if (userDoc.exists() && userDoc.data().role === 'admin') {
        router.push("/admin");
      } else if (cred.user.email?.startsWith("gvcn")) {
        router.push("/"); // GVCN vào trang chủ
      } else {
        setError("Tài khoản không hợp lệ. Chỉ dành cho Admin và GVCN.");
      }
    } catch (err: any) {
      setError("Email hoặc mật khẩu không đúng.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center fade-in">
      <div className="card p-8 w-full max-w-md shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🔐</div>
          <h2 className="text-2xl font-bold text-blue-900">Đăng nhập</h2>
          <p className="text-slate-500 text-sm">Hệ thống Học Bạ Số</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text"
            placeholder="Email (vd: gvcn9a1@hocba.edu.vn)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
          <input
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
          {error && <div className="text-red-500 text-xs text-center">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "⌛ Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  );
}
