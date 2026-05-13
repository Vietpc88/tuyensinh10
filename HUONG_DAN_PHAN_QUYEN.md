# 🔐 Cấu hình Phân quyền Firestore

Dán đoạn này vào tab **Rules** của Firestore để bảo vệ dữ liệu:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Quyền cho bảng học sinh
    match /students/{docId} {
      // Ai cũng có thể xem
      allow read: if true; 
      
      // Chỉ Admin hoặc GVCN quản lý đúng lớp mới được sửa/xóa
      allow write: if request.auth != null && (
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.managedClass == request.resource.data.lopTen
      );
    }
    
    // Quyền cho bảng người dùng
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

# 📋 Quy trình cho Admin:

1. **Đăng nhập** bằng tài khoản Admin (tài khoản bạn tạo thủ công trên Firebase Auth).
2. Vào trang **/admin**, nhấn **Khởi tạo 9 lớp**. 
3. Hệ thống sẽ tạo ra 9 Email và Mật khẩu ngẫu nhiên trong bảng.
4. **Quan trọng:** Bạn copy Email này dán vào phần **Authentication** của Firebase Console để tạo tài khoản thật.
5. Sau đó, trong Firestore, tạo một bản ghi trong collection `users` với ID chính là `UID` của tài khoản vừa tạo, chứa:
   - `username`: "gvcn9a1"
   - `role`: "teacher"
   - `managedClass`: "9A1"
6. Gửi Email và Mật khẩu cho GVCN lớp 9A1. Khi họ đăng nhập, họ chỉ có thể sửa điểm của lớp 9A1.
