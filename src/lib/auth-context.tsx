"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import { AppUser } from "./types";

interface AuthContextType {
  user: User | null;
  userData: AppUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, userData: null, loading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // 1. Luôn ưu tiên kiểm tra quyền trong Firestore
        const docRef = doc(db, "users", u.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setUserData(docSnap.data() as AppUser);
        } else {
          // 2. Nếu không có bản ghi, mới kiểm tra mẫu email gvcn...
          const email = u.email || "";
          if (email.toLowerCase().startsWith("gvcn")) {
            const match = email.match(/gvcn(\w+)/);
            const className = match ? match[1].toUpperCase() : "";
            setUserData({
              uid: u.uid,
              username: email.split("@")[0],
              email: email,
              role: 'teacher',
              managedClass: className
            });
          } else {
            setUserData(null);
          }
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
