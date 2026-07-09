# ชุดเอกสารออกแบบ: ระบบจัดการร้านยาครบวงจร (Pharmacy Management System)

เอกสารออกแบบระบบจัดการร้านยาสำหรับร้านขายยาแผนปัจจุบัน (ขย.1) ในประเทศไทย
ครอบคลุมทั้งด้านปฏิบัติงานตามมาตรฐาน **GPP ของสภาเภสัชกรรม / กฎหมายยาไทย** และด้านเทคนิค
ที่รองรับการขยายจากร้านเดียวไปเป็น **SaaS multi-tenant** — เขียนสำหรับเภสัชกรที่มีพื้นฐาน
software development (React/TypeScript, Python, ML/AMR) ให้ลึกพอที่จะลงมือสร้างได้จริง

## สารบัญ

| # | เอกสาร | เนื้อหา |
|---|---|---|
| 01 | [สถาปัตยกรรมระบบและ Deployment](./01-architecture.md) | Modular Monolith (FastAPI) 4 ชั้น, โครง module ภายใน backend, multi-tenant ด้วย PostgreSQL RLS, deployment 2 ระยะ (Docker Compose บน VPS → SaaS), CI/CD + Alembic zero-downtime, offline-tolerant POS (IndexedDB outbox + เลขใบเสร็จแบบ range allocation), Security/PDPA, integration adapters (FHIR e-Rx, PromptPay, LINE), observability |
| 02 | [Database Schema](./02-database-schema.md) | **แหล่งอ้างอิงกลาง (canonical)** ของชื่อตาราง/enum ทั้งหมด — DDL PostgreSQL 16 ครบ 40 ตาราง + enum 26 ตัว, RLS policy, FEFO pick query (`FOR UPDATE SKIP LOCKED`), index strategy, ตัวอย่าง query สำคัญ, retention/partitioning |
| 03 | [โมดูลและ API Specification](./03-modules-api.md) | User story + flow หน้างานจริง + REST API ครบ 8 โมดูล (POS, Inventory, Patient+CDS, e-Prescription/e-Referral, Compliance, CRM, Dashboard), กติการ่วม (cursor pagination, RFC 7807, Idempotency-Key), hotkey/UI หลัก, ฉลากยาตาม GPP, domain events |
| 04 | [DDI Engine & Clinical Decision Support](./04-ddi-engine.md) | สถาปัตยกรรม CDS แบบ **rule-engine-first** (ML เป็น advisory เท่านั้น — ห้ามตัดสิน safety), โครงกฎ generic/ATC-class + ruleset versioning, allergy cross-reactivity, drug-disease/pregnancy/lactation, real-time POS integration (< 100ms), ML 3 งาน (alert ranking, OCR/NER, anomaly), **antibiogram-based decision support + antibiotic stewardship (AMR)** |
| 05 | [GPP, กฎหมายยา และรายงาน ขย.](./05-gpp-compliance.md) | ภูมิทัศน์กฎหมาย 5 กลุ่ม, กติกาการขายต่อ `legal_category`, บัญชี ข.ย.9–13 + รายงานวัตถุออกฤทธิ์/ยาเสพติด ปท.3 → mapping ตารางในระบบ, ตาราง GPP → feature (รวมสื่อโฆษณาในร้าน), วงจรใบอนุญาต + บันได alert, PDPA (consent, สิทธิเจ้าของข้อมูล, DPA/DPO) |
| 06 | [แผนการพัฒนา (Roadmap)](./06-roadmap.md) | 5 เฟส: Phase 0 prototype `/pharmacy/` ใน repo นี้ (localStorage แบบเดียวกับ `/drugai/`, `/schedule/`) → MVP ร้านเดียว → Clinical & Compliance → Growth → SaaS + antibiogram/ML — พร้อม effort (part-time), Definition of Done, สิ่งที่ไม่ทำ, decision gates G0–G3 |

## การตัดสินใจหลักที่ทุกเอกสารใช้ร่วมกัน

- **Stack**: React 19 + TypeScript + Vite + Tailwind CSS v4 · Python 3.12 + FastAPI +
  SQLAlchemy 2.x + Alembic · PostgreSQL 16 · Redis 7 + Celery
- **สถาปัตยกรรม**: Modular Monolith (แตก service ภายหลังได้) · multi-tenant แบบ single DB
  + `tenant_id`/`branch_id` + Row-Level Security
- **ความถูกต้องของสต็อก**: ตัดแบบ FEFO ระดับ lot, ทุกการเคลื่อนไหวผ่าน `inventory_movements`
  (append-only), ตารางหลักฐานทางกฎหมายทั้งหมดมี trigger ห้าม UPDATE/DELETE
- **ความปลอดภัยคลินิก**: deterministic rule engine เป็นผู้ตัดสิน DDI/allergy เสมอ —
  ML ช่วยจัดลำดับ/กรอกข้อมูลเท่านั้น และทุก alert + การ override ถูกบันทึกเพื่อ GPP audit
- **ลำดับการอ่าน**: เริ่มจาก 01 → 02 → 03 ตามลำดับ; 04/05 อ่านแยกตามความสนใจ; 06 คือแผนลงมือทำ

> ⚠️ ข้อเท็จจริงด้านกฎหมาย (เลขแบบฟอร์ม ข.ย., รอบรายงาน, ระยะเวลาเก็บเอกสาร ฯลฯ)
> ที่ยังยืนยันกับประกาศฉบับล่าสุดไม่ได้ 100% ติดธง ⚠️ ไว้ในเอกสารทุกจุด —
> รายการที่ต้อง resolve ก่อน implement จริงรวมอยู่ที่ [05 §9](./05-gpp-compliance.md)
