# 🔥 Hướng dẫn cấu hình Firebase

## Bước 1: Tạo Firebase Project

1. Vào [https://console.firebase.google.com](https://console.firebase.google.com)
2. **Add project** → đặt tên (vd: `hocba-thcs`)
3. Tắt Google Analytics nếu không cần → **Create project**

## Bước 2: Bật Firestore Database

1. Menu trái → **Firestore Database** → **Create database**
2. Chọn **Production mode** → chọn vùng `asia-southeast1` (Singapore) → **Enable**
3. Vào tab **Rules** → dán rule sau (cho phép mọi người đọc, chỉ auth mới ghi):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /students/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

> ⚠️ Để đơn giản trong giai đoạn demo, có thể đặt `allow write: if true;`
> Nhớ đổi lại khi production!

## Bước 3: Lấy Firebase Config

1. **Project settings** (⚙️) → **General** → kéo xuống **Your apps**
2. Click **</>** (Web app) → đặt tên → **Register app**
3. Copy `firebaseConfig` object

## Bước 4: Điền vào .env.local

Mở file `.env.local` trong thư mục `hocba-web` và điền:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=hocba-thcs.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=hocba-thcs
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=hocba-thcs.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123...:web:abc...
```

## Bước 5: Deploy lên Vercel

1. Đẩy thư mục `hocba-web` lên GitHub (repo riêng)
2. Vào [https://vercel.com](https://vercel.com) → **Add New Project** → Import repo
3. Vercel tự detect Next.js
4. Vào **Settings → Environment Variables** → thêm đủ 6 biến từ `.env.local`
5. **Deploy** → xong!

## Quy trình sử dụng

```
QUETHB.py (Tab Lọc dữ liệu)
    ↓ Xuất file Excel (ket_qua_loc_du_lieu.xlsx)
    ↓
Web Admin (/admin)
    ↓ Upload Excel → Firestore
    ↓
Giáo viên truy cập web
    → Chọn lớp → Chọn học sinh
    → Xem kết quả học tập
    → Chỉnh sửa nếu cần (có xác nhận)
```

## Cấu trúc Firestore

```
students/
  {auto-id}/
    maHS: "HS001"
    lopTen: "9A1"
    hoTen: "Nguyễn Văn A"
    kq_ht_6_cn: "T"
    kq_rl_6_cn: "T"
    ... (tất cả các trường từ QUETHB)
    uploadedAt: "2026-05-13T..."
    updatedAt: "2026-05-13T..."  (khi GV sửa)
```
