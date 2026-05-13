"use client";
import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState(""); // Dùng identifier thay cho email
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    // Tự động thêm @hocba.local nếu người dùng chỉ nhập username
    const finalEmail = identifier.includes("@") ? identifier : `${identifier}@hocba.local`;

    try {
      const cred = await signInWithEmailAndPassword(auth, finalEmail, password);
      const userDoc = await getDoc(doc(db, "users", cred.user.uid));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.role === 'admin') router.push("/admin");
        else router.push("/");
      } 
      else {
        setError("Tài khoản chưa được phân quyền. Vui lòng liên hệ Admin.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Tài khoản hoặc mật khẩu không đúng.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center fade-in bg-slate-50/50">
      <div className="card p-10 w-full max-w-md shadow-2xl border-t-4 border-blue-600 bg-white">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Đăng nhập</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Hồ sơ tuyển sinh 10</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Tài khoản</label>
            <input
              type="text" // Chuyển từ email sang text để không bị trình duyệt chặn
              placeholder="Tên đăng nhập hoặc Email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-700"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Mật khẩu</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-700"
              required
            />
          </div>
          
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-[10px] text-center rounded-xl border border-red-100 font-black uppercase tracking-tight">
              ⚠️ {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-100 disabled:opacity-50 transition-all active:scale-95"
          >
            {loading ? "⌛ Đang xử lý..." : "Đăng nhập ngay"}
          </button>
        </form>
      </div>
    </div>
  );
}
