import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import AppHeader from "./header";

export const metadata: Metadata = {
  title: "Hồ sơ tuyển sinh 10",
  description: "Hệ thống quản lý và tra cứu hồ sơ tuyển sinh lớp 10",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="bg-[#f8fafc] min-h-screen flex flex-col">
        <AuthProvider>
          <AppHeader />
          <main className="max-w-6xl mx-auto px-4 py-6 flex-1 w-full">
            {children}
          </main>
          <footer className="text-center text-xs text-slate-400 py-8 border-t border-slate-200 bg-white">
            <p className="font-bold text-slate-500 mb-1 uppercase tracking-widest text-[10px]">Hệ thống Hồ sơ tuyển sinh 10</p>
            <p>© {new Date().getFullYear()} · Bình Định</p>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
