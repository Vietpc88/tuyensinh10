// src/lib/types.ts
export interface StudentResult {
  id?: string;
  maHS: string;
  lopTen: string;
  hoTen: string;
  kq_ht_6_hk1?: string; kq_ht_6_hk2?: string; kq_ht_6_cn?: string;
  kq_rl_6_hk1?: string; kq_rl_6_hk2?: string; kq_rl_6_cn?: string;
  kq_ht_7_hk1?: string; kq_ht_7_hk2?: string; kq_ht_7_cn?: string;
  kq_rl_7_hk1?: string; kq_rl_7_hk2?: string; kq_rl_7_cn?: string;
  kq_ht_8_hk1?: string; kq_ht_8_hk2?: string; kq_ht_8_cn?: string;
  kq_rl_8_hk1?: string; kq_rl_8_hk2?: string; kq_rl_8_cn?: string;
  kq_ht_9_hk1?: string; kq_ht_9_hk2?: string; kq_ht_9_cn?: string;
  kq_rl_9_hk1?: string; kq_rl_9_hk2?: string; kq_rl_9_cn?: string;
  diem_toan_9_cn?: string; diem_van_9_cn?: string;
  diem_su_dia_9_cn?: string; diem_khtn_9_cn?: string;
  diem_tin_9_cn?: string; diem_khxh_9_cn?: string;
  diem_cong_nghe_9_cn?: string; diem_gdcd_9_cn?: string;
  diem_nn1_9_cn?: string; ma_nn1_9?: string;
  diem_nn2_9_cn?: string; ma_nn2_9?: string;
  tong_diem_6_cn?: string; tong_diem_7_cn?: string;
  tong_diem_8_cn?: string; tong_diem_9_cn?: string;
  danh_hieu_6?: string; danh_hieu_7?: string;
  danh_hieu_8?: string; danh_hieu_9?: string;
  xep_loai_tot_nghiep?: string;
  updatedAt?: string;
  updatedBy?: string;
  [key: string]: string | undefined;
}

export interface AppUser {
  uid: string;
  username: string;
  email: string;
  role: 'admin' | 'teacher';
  managedClass?: string; 
  password?: string; 
}
