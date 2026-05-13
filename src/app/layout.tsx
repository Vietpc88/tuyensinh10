import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Học Bạ Số THCS",
  description: "Hệ thống tra cứu kết quả học tập học sinh THCS",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <header className="header-gradient text-white shadow-lg">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
            <span className="text-3xl">🎓</span>
            <div>
              <h1 className="text-xl font-bold leading-tight">Học Bạ Số THCS</h1>
              <p className="text-blue-200 text-xs">Tra cứu &amp; đối chiếu kết quả học tập</p>
            </div>
            <nav className="ml-auto flex gap-2 text-sm">
              <a href="/" className="px-3 py-1.5 rounded-lg hover:bg-white/20 transition font-medium">🏠 Trang chủ</a>
              <a href="/admin" className="px-3 py-1.5 rounded-lg hover:bg-white/20 transition font-medium">⚙️ Admin</a>
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-6">
          {children}
        </main>
        <footer className="text-center text-xs text-slate-400 py-6 mt-8 border-t border-slate-200">
          Hệ thống Học Bạ Số THCS · {new Date().getFullYear()}
        </footer>
      </body>
    </html>
  );
}
