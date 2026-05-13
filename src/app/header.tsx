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
    <header className="header-gradient text-white shadow-lg sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-3xl group-hover:scale-110 transition-transform">📝</span>
          <div>
            <h1 className="text-lg font-black leading-tight uppercase tracking-tighter">Hồ sơ tuyển sinh 10</h1>
            <p className="text-blue-200 text-[9px] uppercase tracking-widest font-black opacity-80">Hệ thống quản lý dữ liệu</p>
          </div>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-4">
          <Link href="/" className="px-3 py-2 rounded-lg hover:bg-white/10 transition text-[11px] font-black uppercase">🏠 Trang chủ</Link>
          
          {userData?.role === 'admin' && (
            <Link href="/admin" className="px-3 py-2 rounded-lg hover:bg-white/10 transition text-[11px] font-black uppercase bg-white/10 shadow-inner">⚙️ Admin</Link>
          )}

          {!loading && user ? (
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-white/20">
              <div className="hidden sm:block text-right">
                <p className="text-[9px] font-black text-blue-200 uppercase tracking-tighter">{userData?.role === 'admin' ? 'Quản trị viên' : `GVCN LỚP ${userData?.managedClass}`}</p>
                <p className="text-[11px] font-bold truncate max-w-[120px] uppercase">{userData?.username}</p>
              </div>
              
              {/* Nút đổi mật khẩu */}
              <Link 
                href="/doi-mat-khau" 
                className="p-2 rounded-xl hover:bg-white/10 transition shadow-lg bg-white/5 group"
                title="Đổi mật khẩu"
              >
                <span className="text-sm inline-block group-hover:rotate-12 transition-transform">🔑</span>
              </Link>

              <button 
                onClick={handleLogout}
                className="p-2 rounded-xl hover:bg-red-500 transition shadow-lg bg-white/10 group"
                title="Đăng xuất"
              >
                <span className="text-sm group-hover:rotate-12 inline-block transition-transform">🚪</span>
              </button>
            </div>
          ) : !loading && (
            <Link href="/login" className="px-4 py-1.5 rounded-full bg-white text-blue-700 font-black text-[10px] uppercase hover:bg-blue-50 transition shadow-lg">Đăng nhập</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
