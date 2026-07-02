# QMR Document Delivery — ระบบส่งเอกสารคุณภาพของโรงพยาบาล

ระบบส่งและติดตามการรับทราบเอกสารคุณภาพ (Quality Documents) สำหรับ
**QMR — Quality Management Representative** ของโรงพยาบาล ใช้สำหรับ
ควบคุมเอกสาร (Document Control) ตามมาตรฐาน HA / ISO 9001 โดยรวม
การอัปโหลด, การจ่ายเอกสาร, การลงนามรับทราบ และการรายงานเข้าด้วยกัน
ในระบบเดียว

## ภาพรวมระบบ

```
┌──────────────────────────────┐   อีเมล / ในแอป / LINE
│   QMR (สำนัก/ศูนย์คุณภาพ)    │ ─────────────────────┐
└──────────────┬───────────────┘                      │
               │ อัปโหลด & จ่ายเอกสาร                 ▼
        ┌──────▼──────┐                  ┌────────────────────────┐
        │  คลังเอกสาร │ ─── ติดตาม ──▶  │  หน่วยงานปลายทาง       │
        │  (Firestore │                  │  - OPD / IPD / ER /…   │
        │   + Storage)│ ◀── รับทราบ ─── │  - ลงนามอิเล็กทรอนิกส์│
        └─────────────┘                  └────────────────────────┘
                       ▲
                       │
              ┌────────┴────────┐
              │ รายงาน / Audit  │
              │  (CSV, Charts)  │
              └─────────────────┘
```

## ฟีเจอร์หลัก

| โมดูล | คำอธิบาย |
|---|---|
| **แดชบอร์ด** | สรุปจำนวนเอกสาร, อัตราการรับทราบ, รายการเกินกำหนด, กิจกรรมล่าสุด |
| **คลังเอกสาร** | ตารางเอกสารทั้งหมด พร้อมตัวกรองตามประเภท/แท็ก/คำค้น และ Version Control |
| **อัปโหลด / สร้างใหม่** | ฟอร์มเพิ่มเอกสาร พร้อมสรุปอัตโนมัติด้วย AI (Google Gemini) |
| **การจ่ายเอกสาร** | เลือกหน่วยงานปลายทาง, กำหนดวันครบรับทราบ, ส่งผ่าน Email / In-app / LINE |
| **กล่องรับเอกสาร** | มุมมองของหน่วยงานปลายทาง — เปิดอ่าน, ลงนามรับทราบ, บันทึกหมายเหตุ |
| **รายงาน & ตรวจสอบ** | ตารางรายหน่วยงาน, สัดส่วนเอกสาร, Export CSV สำหรับ Internal Audit |

## โครงสร้างข้อมูล

- `Department` — หน่วยงานในโรงพยาบาล (OPD, IPD, ER, LAB, …)
- `User` — ผู้ใช้ พร้อมบทบาท (`qmr` / `dept_head` / `staff` / `admin`)
- `QualityDocument` — เอกสารคุณภาพ (รหัส, ชื่อ, ประเภท, เวอร์ชัน, สถานะ, ความสำคัญ)
- `Distribution` — ชุดการจ่ายเอกสาร 1 ครั้ง พร้อมรายชื่อ `recipients`
- `DistributionRecipient` — สถานะรับทราบรายหน่วยงาน (`pending` / `opened` / `acknowledged` / `overdue`)
- `Activity` — Audit log

## เทคโนโลยี

- **Frontend**: React 19 + TypeScript + Vite 6 + Tailwind CSS v4
- **UI**: Lucide React (ไอคอน) + Motion (animations)
- **Backend (notification)**: Express 4 + Nodemailer
- **Database / Storage**: Firebase (Firestore + Storage) — เปิดใช้งานเมื่อเซ็ต `VITE_FIREBASE_*`
- **AI (optional)**: Google Gemini (`@google/genai`) สำหรับสรุปเนื้อหาเอกสาร

> ในโหมดสาธิต ระบบใช้ **in-memory mock store** (`src/data/store.ts`) จึงรันได้ทันที
> โดยไม่ต้องตั้งค่า Firebase

## การติดตั้ง

```bash
npm install
cp .env.example .env       # ใส่ค่า SMTP / Firebase ตามต้องการ
npm run dev                # เปิดเว็บ Vite ที่ http://localhost:5173
npm run server             # (อีก terminal) เปิด Express ที่ :8080
```

Vite จะ proxy `/api/*` ไปที่ Express ให้อัตโนมัติ

## โฟลเดอร์

```
src/
├── App.tsx              # router + layout
├── main.tsx
├── components/          # Sidebar, Topbar, Badges, Card
├── pages/               # Dashboard, Documents, Upload, Distribution, Inbox, Reports, Login
├── data/
│   ├── seed.ts          # ข้อมูลตัวอย่าง
│   └── store.ts         # in-memory store + actions
├── lib/
│   ├── firebase.ts      # Firebase init (เมื่อมี env var)
│   └── format.ts        # ฟอร์แมตวันที่/ป้าย
└── types.ts             # TypeScript domain types

server/
└── index.ts             # Express + Nodemailer (/api/notify)
```

## Roadmap

- [ ] เชื่อม Firestore จริง (เปิด/ปิดผ่าน `firebaseEnabled` flag)
- [ ] e-Signature ด้วย OTP จากอีเมลโรงพยาบาล
- [ ] LINE Notify / LINE OA สำหรับช่องทาง `line`
- [ ] เอกสารหมดอายุอัตโนมัติเมื่อถึง `reviewDate`
- [ ] AI ดึงสาระสำคัญจาก PDF ด้วย Gemini multimodal
