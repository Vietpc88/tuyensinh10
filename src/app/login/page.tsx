"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function checkLock() {
      const docSnap = await getDoc(doc(db, "settings", "system"));
      if (docSnap.exists()) setIsLocked(docSnap.data().isLocked);
    }
    checkLock();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    const finalEmail = identifier.includes("@") ? identifier : `${identifier}@hocba.local`;

    try {
      const cred = await signInWithEmailAndPassword(auth, finalEmail, password);
      const userDoc = await getDoc(doc(db, "users", cred.user.uid));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        // CHỈ ADMIN MỚI ĐƯỢC VÀO KHI HỆ THỐNG KHÓA
        if (isLocked && data.role !== 'admin') {
          await auth.signOut();
          setError("Hiện tại không có đợt kiểm tra hồ sơ.");
          setLoading(false);
          return;
        }
        
        if (data.role === 'admin') router.push("/admin");
        else router.push("/");
      } else {
        setError("Tài khoản chưa được phân quyền.");
      }
    } catch (err: any) {
      setError("Tài khoản hoặc mật khẩu không đúng.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center fade-in bg-slate-50/50">
      <div className="card p-10 w-full max-w-md shadow-2xl border-t-4 border-blue-600 bg-white">
        {isLocked && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-center">
            <span className="text-2xl block mb-1">🔒</span>
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Hệ thống đang tạm khóa</p>
            <p className="text-[9px] font-bold text-red-400 uppercase mt-1">Chỉ dành cho Admin truy cập</p>
          </div>
        )}

        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔐</div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Đăng nhập</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Hồ sơ tuyển sinh 10</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Tài khoản</label>
            <input type="text" placeholder="Tên đăng nhập" value={identifier} onChange={e => setIdentifier(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-700" required />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Mật khẩu</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-700" required />
          </div>
          
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-[10px] text-center rounded-xl border border-red-100 font-black uppercase tracking-tight">
              ⚠️ {error}
            </div>
          )}
          
          <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-100 disabled:opacity-50 transition-all active:scale-95">
            {loading ? "⌛ Đang xử lý..." : "Đăng nhập ngay"}
          </button>
        </form>
      </div>
    </div>
  );
}
