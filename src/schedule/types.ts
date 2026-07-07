// โมเดลข้อมูลของแอปจัดตารางเวร + สรุปค่าตอบแทนการปฏิบัติงานนอกเวลาราชการ
// (กลุ่มงานเภสัชกรรม/หน่วยงานอื่นในโรงพยาบาล) — ใช้ร่วมกับคอมโพเนนต์ที่อัปโหลดมา

/** ประเภทวิชาชีพของบุคลากร — ใช้เป็นคีย์ของอัตราค่าตอบแทน (shiftRates) ด้วย */
export type StaffType =
  | 'pharmacist'
  | 'technician'
  | 'aide'
  | 'nurse'
  | 'doctor'
  | 'dentist'
  | 'medicalTech'
  | 'radiologist'
  | 'generalAdmin'
  | 'other'

/** ประเภทกะเวร */
export type ShiftType = 'morning' | 'afternoon' | 'oncall' | 'special'

export interface Staff {
  id: string
  name: string            // รวมคำนำหน้า เช่น "นาย สมชาย ใจดี"
  nickname: string
  type: StaffType
  color: string           // hex ใช้แสดงในปฏิทิน
  oncallOnly: boolean      // จัดได้เฉพาะเวร Oncall (เช่น เภสัชกรเวร)
  defaultDays: number[]    // วันประจำสัปดาห์ (getDay() 0=อา..6=ส) สำหรับจัดเวรอัตโนมัติ
  departmentId: string
  signature?: string       // ลายมือชื่อ (base64 data URL)
}

export interface Duty {
  id: string
  date: string            // yyyy-mm-dd
  staffId: string
  shiftId: ShiftType
  departmentId: string
  oncallStartTime?: string
  oncallEndTime?: string
  specialStartTime?: string
  specialEndTime?: string
}

export interface Holiday {
  date: string            // yyyy-mm-dd
  name: string
  multiplier: number      // ตัวคูณค่าตอบแทน (1, 1.5, 2)
}

export interface Department {
  id: string
  name: string
}

export interface ShiftTime {
  start: string           // "HH:MM"
  end: string
}

export interface AppSettings {
  hospitalInfo: {
    hospitalName: string
    departmentName: string
    bossName?: string      // ชื่อผู้อนุมัติ (ใช้ในไฟล์ Excel)
    bossTitle?: string
  }
  appearance: {
    themeColor: 'sky' | 'emerald' | 'slate'
    fontSize: 'small' | 'medium' | 'large'
  }
  signatures: {
    scheduler: string      // ลายเซ็นผู้จัดทำเวร (base64)
    approver: string       // ลายเซ็นผู้อนุมัติ (base64)
  }
  shiftRates: Record<StaffType, number>  // บาท/ชั่วโมง แยกตามวิชาชีพ
  shiftTimes: {
    morning: ShiftTime
    afternoon: ShiftTime
    oncall: ShiftTime
    special: ShiftTime
  }
  departments: Department[]
}
