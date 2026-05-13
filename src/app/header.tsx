"use client";
import { useAuth } from "@/lib/auth-context";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AppHeader() {
  const { userData, user, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <header className="bg-slate-900 text-white shadow-xl sticky top-0 z-40 border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-3xl group-hover:scale-110 transition-transform">📝</span>
          <div>
            <h1 className="text-base font-black leading-tight uppercase tracking-tighter">Hồ sơ tuyển sinh 10</h1>
            <p className="text-blue-400 text-[9px] uppercase tracking-widest font-black opacity-80">Hệ thống quản lý</p>
          </div>
        </Link>

        <nav className="flex items-center gap-3">
          {userData?.role === 'admin' && (
            <Link href="/admin" className="px-4 py-2 rounded-xl hover:bg-blue-600 transition text-[11px] font-black uppercase bg-blue-700 shadow-lg">⚙️ Admin</Link>
          )}

          {!loading && user ? (
            <div className="flex items-center gap-3">
              <div className="hidden md:block text-right pr-3 border-r border-white/10">
                <p className="text-[9px] font-black text-blue-400 uppercase tracking-tighter">{userData?.role === 'admin' ? 'Quản trị viên' : `GVCN LỚP ${userData?.managedClass}`}</p>
                <p className="text-[11px] font-bold uppercase">{userData?.username}</p>
              </div>
              
              {/* Nút Đổi mật khẩu hiện rõ */}
              <Link 
                href="/doi-mat-khau" 
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition border border-white/5 shadow-md"
              >
                <span className="text-sm">🔑</span>
                <span className="text-[10px] font-black uppercase tracking-tight">Đổi mật khẩu</span>
              </Link>

              {/* Nút Đăng xuất hiện rõ */}
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-900/50 hover:bg-red-600 transition border border-red-500/30 shadow-md"
              >
                <span className="text-sm">🚪</span>
                <span className="text-[10px] font-black uppercase tracking-tight">Đăng xuất</span>
              </button>
            </div>
          ) : !loading && (
            <Link href="/login" className="px-6 py-2 rounded-full bg-blue-600 text-white font-black text-[10px] uppercase hover:bg-blue-700 transition shadow-lg tracking-widest">Đăng nhập</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
