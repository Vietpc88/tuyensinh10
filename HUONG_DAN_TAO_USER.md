# 🔑 Cấu hình tạo tài khoản tự động (Admin SDK)

Để Admin có thể tạo tài khoản cho giáo viên ngay trên web, bạn cần cấu hình thêm các biến môi trường (Environment Variables) sau trên Vercel:

1. **Lấy thông tin Service Account:**
   - Vào **Firebase Console** -> **Project Settings** -> **Service accounts**.
   - Nhấn nút **Generate new private key**. Một file `.json` sẽ được tải về.

2. **Cấu hình trên Vercel:**
   - **FIREBASE_CLIENT_EMAIL**: Copy giá trị `client_email` từ file JSON.
   - **FIREBASE_PRIVATE_KEY**: Copy TOÀN BỘ giá trị `private_key` từ file JSON (bao gồm cả đoạn `-----BEGIN PRIVATE KEY-----` và `-----END PRIVATE KEY-----`).

3. **Cách sử dụng trang Admin mới:**
   - **B1**: Tải file Excel học sinh lên trước. Hệ thống sẽ tự quét dữ liệu để biết có những lớp nào (vd: 9A1, 9A2...).
   - **B2**: Ở khung "Tạo tài khoản GVCN", bạn chọn lớp từ danh sách xổ xuống.
   - **B3**: Nhập Email và Mật khẩu cho giáo viên đó -> Nhấn **Tạo tài khoản**.
   - **B4**: Hệ thống sẽ tự động tạo User trong mục Authentication và tạo luôn bản ghi phân quyền trong Firestore. Bạn không cần làm thủ công nữa.
