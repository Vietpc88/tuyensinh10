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
          <span className="text-3xl group-hover:scale-110 transition-transform">🎓</span>
          <div>
            <h1 className="text-lg font-bold leading-tight">Học Bạ Số THCS</h1>
            <p className="text-blue-200 text-[10px] uppercase tracking-wider font-semibold">Hệ thống quản lý điểm</p>
          </div>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-4">
          <Link href="/" className="px-3 py-2 rounded-lg hover:bg-white/10 transition text-sm font-medium">🏠 Trang chủ</Link>
          
          {userData?.role === 'admin' && (
            <Link href="/admin" className="px-3 py-2 rounded-lg hover:bg-white/10 transition text-sm font-medium bg-white/5">⚙️ Admin</Link>
          )}

          {!loading && user ? (
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-white/20">
              <div className="hidden sm:block text-right">
                <p className="text-[10px] font-bold text-blue-200 uppercase">{userData?.role === 'admin' ? 'Quản trị viên' : `GVCN lớp ${userData?.managedClass}`}</p>
                <p className="text-xs font-medium truncate max-w-[120px]">{userData?.username}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 rounded-full hover:bg-red-500 transition shadow-inner bg-white/10 group"
                title="Đăng xuất"
              >
                <span className="text-sm group-hover:rotate-12 inline-block">🚪</span>
              </button>
            </div>
          ) : !loading && (
            <Link href="/login" className="px-4 py-1.5 rounded-full bg-white text-blue-700 font-bold text-xs hover:bg-blue-50 transition">Đăng nhập</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
