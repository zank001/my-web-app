/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppSettings, Holiday, Department, Staff } from '../types';
import SignaturePad from './SignaturePad';
import StaffView from './StaffView';
import {
  Settings,
  Calendar,
  Layers,
  Sparkles,
  Signature,
  FileText,
  Clock,
  Palette,
  Briefcase,
  Plus,
  Trash2,
  Edit,
  Users
} from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  holidays: Holiday[];
  staff: Staff[];
  onSaveSettings: (settings: AppSettings) => void;
  onUpdateHolidays: (holidays: Holiday[]) => void;
  onAddStaff: (newStaff: Omit<Staff, 'id' | 'signature'>) => void;
  onUpdateStaff: (id: string, updatedFields: Partial<Staff>) => void;
  onDeleteStaff: (id: string) => void;
}

export default function SettingsView({
  settings,
  holidays,
  staff,
  onSaveSettings,
  onUpdateHolidays,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff
}: SettingsViewProps) {
  const [subTab, setSubTab] = useState<'info' | 'staff' | 'holidays' | 'departments' | 'rates' | 'appearance' | 'signatures'>('info');

  // Local state copies to hold unsubmitted input changes
  const [hospitalName, setHospitalName] = useState(settings.hospitalInfo.hospitalName);
  const [departmentName, setDepartmentName] = useState(settings.hospitalInfo.departmentName);
  const [themeColor, setThemeColor] = useState(settings.appearance.themeColor);
  const [fontSize, setFontSize] = useState(settings.appearance.fontSize);

  const [ratePharmacist, setRatePharmacist] = useState(settings.shiftRates.pharmacist);
  const [rateTechnician, setRateTechnician] = useState(settings.shiftRates.technician);
  const [rateAide, setRateAide] = useState(settings.shiftRates.aide);
  const [rateNurse, setRateNurse] = useState(settings.shiftRates.nurse ?? 0);
  const [rateDoctor, setRateDoctor] = useState(settings.shiftRates.doctor ?? 0);
  const [rateDentist, setRateDentist] = useState(settings.shiftRates.dentist ?? 0);
  const [rateMedicalTech, setRateMedicalTech] = useState(settings.shiftRates.medicalTech ?? 0);
  const [rateRadiologist, setRateRadiologist] = useState(settings.shiftRates.radiologist ?? 0);
  const [rateGeneralAdmin, setRateGeneralAdmin] = useState(settings.shiftRates.generalAdmin ?? 0);
  const [rateOther, setRateOther] = useState(settings.shiftRates.other ?? 0);

  const [morningStart, setMorningStart] = useState(settings.shiftTimes.morning.start);
  const [morningEnd, setMorningEnd] = useState(settings.shiftTimes.morning.end);
  const [afternoonStart, setAfternoonStart] = useState(settings.shiftTimes.afternoon.start);
  const [afternoonEnd, setAfternoonEnd] = useState(settings.shiftTimes.afternoon.end);
  const [oncallStart, setOncallStart] = useState(settings.shiftTimes.oncall.start);
  const [oncallEnd, setOncallEnd] = useState(settings.shiftTimes.oncall.end);
  const [specialStart, setSpecialStart] = useState(settings.shiftTimes.special.start);
  const [specialEnd, setSpecialEnd] = useState(settings.shiftTimes.special.end);

  const [departments, setDepartments] = useState<Department[]>(settings.departments);
  const [newDeptName, setNewDeptName] = useState('');

  const [schedulerSignature, setSchedulerSignature] = useState(settings.signatures.scheduler);
  const [approverSignature, setApproverSignature] = useState(settings.signatures.approver);

  // New Holiday Form States
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayMultiplier, setNewHolidayMultiplier] = useState<number>(1);
  const [editingHolidayKey, setEditingHolidayKey] = useState<string | null>(null);

  // Handle saving configurations back to Local database
  const handleSaveAll = () => {
    onSaveSettings({
      // คงค่าที่ฟอร์มยังไม่มีช่องกรอก (เช่น ชื่อ/ตำแหน่งผู้อนุมัติ) ไว้ไม่ให้หาย
      hospitalInfo: { ...settings.hospitalInfo, hospitalName, departmentName },
      appearance: { fontSize, themeColor },
      signatures: { scheduler: schedulerSignature, approver: approverSignature },
      shiftRates: {
        pharmacist: ratePharmacist,
        technician: rateTechnician,
        aide: rateAide,
        nurse: rateNurse,
        doctor: rateDoctor,
        dentist: rateDentist,
        medicalTech: rateMedicalTech,
        radiologist: rateRadiologist,
        generalAdmin: rateGeneralAdmin,
        other: rateOther
      },
      shiftTimes: {
        morning: { start: morningStart, end: morningEnd },
        afternoon: { start: afternoonStart, end: afternoonEnd },
        oncall: { start: oncallStart, end: oncallEnd },
        special: { start: specialStart, end: specialEnd }
      },
      departments
    });

    alert('บันทึกความเปลี่ยนแปลงทุกกะระบบประมวลผลเรียบร้อยแล้ว');
  };

  // Add/Remove/Edit Holiday configurations
  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayDate || !newHolidayName.trim()) return alert('กรุณาระบุข้อมูลวันหยุดให้ครบ');

    const added: Holiday = {
      date: newHolidayDate,
      name: newHolidayName.trim(),
      multiplier: Number(newHolidayMultiplier)
    };

    let nextHolidays = [...holidays];
    if (editingHolidayKey) {
      nextHolidays = nextHolidays.filter(h => h.date !== editingHolidayKey);
    } else {
      if (holidays.some(h => h.date === newHolidayDate)) {
        alert('มีประวัติวันหยุด ณ วันที่ระบุอยู่แล้วในระบบ คุณสามารถคลิกแก้ไขเพื่อปรับเปลี่ยนข้อมูลได้');
        return;
      }
    }

    nextHolidays = [...nextHolidays, added].sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    onUpdateHolidays(nextHolidays);
    setNewHolidayDate('');
    setNewHolidayName('');
    setNewHolidayMultiplier(1);
    setEditingHolidayKey(null);
  };

  const handleEditHoliday = (h: Holiday) => {
    setNewHolidayDate(h.date);
    setNewHolidayName(h.name);
    setNewHolidayMultiplier(h.multiplier !== null && h.multiplier !== undefined ? h.multiplier : 1);
    setEditingHolidayKey(h.date);
  };

  const handleCancelEditHoliday = () => {
    setNewHolidayDate('');
    setNewHolidayName('');
    setNewHolidayMultiplier(1);
    setEditingHolidayKey(null);
  };

  const handleRemoveHoliday = (dateKey: string) => {
    if (editingHolidayKey === dateKey) {
      handleCancelEditHoliday();
    }
    onUpdateHolidays(holidays.filter((h) => h.date !== dateKey));
  };

  // Add/Remove Departments
  const handleAddDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;

    const newDept: Department = {
      id: `dept-${Date.now()}`,
      name: newDeptName.trim()
    };
    const nextDepts = [...departments, newDept];
    setDepartments(nextDepts);
    setNewDeptName('');
  };

  const handleRemoveDept = (deptId: string) => {
    if (departments.length <= 1) {
      alert('ต้องมีอย่างน้อยหนึ่งแผนก เพื่อเป็นค่าเริ่มต้นใช้งานระบบ');
      return;
    }
    setDepartments(departments.filter((d) => d.id !== deptId));
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Title Header Panel */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-800 font-display">ระบบควบคุมการตั้งค่า</h2>
          <p className="text-xs text-slate-500 mt-0.5">กําหนดรายละเอียดโรงพยาบาล อัตราสิทธิเบิกจ่าย บัญชีประเภทวันหยุด และตราประทับลายมือชื่อ</p>
        </div>

        <button
          onClick={handleSaveAll}
          className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl hover:shadow-md transition active:scale-97 cursor-pointer"
        >
          <Sparkles size={14} />
          บันทึกการตั้งค่าทั้งหมด
        </button>
      </div>

      {/* Settings Sub-Tab Navigation Bar */}
      <div className="flex bg-slate-100 border border-slate-200 p-1 rounded-2xl w-full max-w-fit overflow-x-auto gap-0.5 no-print select-none">
        <button
          onClick={() => setSubTab('info')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            subTab === 'info' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText size={14} />
          หน่วยงาน
        </button>

        <button
          onClick={() => setSubTab('staff')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            subTab === 'staff' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users size={14} />
          บุคลากร
        </button>

        <button
          onClick={() => setSubTab('holidays')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            subTab === 'holidays' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar size={14} />
          วันหยุดราชการ
        </button>

        <button
          onClick={() => setSubTab('departments')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            subTab === 'departments' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Briefcase size={14} />
          กึ่งหน่วยงาน / แผนก
        </button>

        <button
          onClick={() => setSubTab('rates')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            subTab === 'rates' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock size={14} />
          กะปฏิบัติงาน & เรทเบิกจ่าย
        </button>

        <button
          onClick={() => setSubTab('appearance')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            subTab === 'appearance' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Palette size={14} />
          ตั้งค่าธีม & ฟอนต์
        </button>

        <button
          onClick={() => setSubTab('signatures')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            subTab === 'signatures' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Signature size={14} />
          ลายเซ็นผู้รับผิดชอบ
        </button>
      </div>

      {/* Sub-Tab Layout Content */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs text-left">
        {/* Tab 1: Hospital Info */}
        {subTab === 'info' && (
          <div className="flex flex-col gap-4 max-w-xl">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
              <FileText size={16} className="text-slate-500" />
              รายละเอียดองค์กรกลุ่มงานเวร
            </h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500">ชื่อสถานรักษาพยาบาล</label>
              <input
                type="text"
                value={hospitalName}
                onChange={(e) => setHospitalName(e.target.value)}
                className="px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-indigo-600 focus:bg-white"
                placeholder="โรงพยาบาลปาย / ปายรพ."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500">รายงานชื่อฝ่าย / กลุ่มงาน</label>
              <input
                type="text"
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
                className="px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-indigo-600 focus:bg-white"
                placeholder="ฝ่ายเภสัชกรรม / กลุ่มวิชาชีพ"
              />
            </div>

            <p className="text-[11px] text-slate-400 font-medium">ข้อมูลชื่อโรงพยาบาลและสโมสรฝ่ายวิชานี้ ถูกใช้ตรงหัวรายงานการเบิกเงินของทุกสรุปผลลัพธ์เดือนแบบอัตโนมัติ</p>
          </div>
        )}

        {/* Tab 2: Staff Management */}
        {subTab === 'staff' && (
          <StaffView
            staff={staff}
            departments={departments}
            onAddStaff={onAddStaff}
            onUpdateStaff={onUpdateStaff}
            onDeleteStaff={onDeleteStaff}
          />
        )}

        {/* Tab 2: Holidays List */}
        {subTab === 'holidays' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <form onSubmit={handleAddHoliday} className="lg:col-span-4 flex flex-col gap-4 bg-slate-50/50 p-4 border border-slate-200 rounded-xl">
              <h4 className="text-xs font-bold text-slate-700 border-b border-slate-200 pb-1.5">
                {editingHolidayKey ? 'แก้ไขข้อมูลวันหยุด' : 'เพิ่มสถานะวันหยุดใหม่'}
              </h4>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500">วันที่ประสงค์กําหนด</label>
                <input
                  type="date"
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl outline-hidden focus:border-indigo-600"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500">ชื่อเรียกวันสำคัญ</label>
                <input
                  type="text"
                  placeholder="ตัวอย่าง: วันเฉลิมพระชนมพรรษา"
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl outline-hidden focus:border-indigo-600"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500">ตัวคูณคำนวณเบิกเงิน (เท่า)</label>
                <select
                  value={newHolidayMultiplier}
                  onChange={(e) => setNewHolidayMultiplier(Number(e.target.value))}
                  className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl outline-hidden focus:border-indigo-600"
                >
                  <option value={1}>1.0x (1 เท่า / เรทวันปกติราชการ)</option>
                  <option value={1.5}>1.5x (1.5 เท่า / เรทวันหยุดทั่วไป)</option>
                  <option value={2}>2.0x (2 เท่า / เรทเทศกาลใหญ่)</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition shrink-0 cursor-pointer"
                >
                  {editingHolidayKey ? 'บันทึกการแก้ไข' : 'เพิ่มประวัติวันหยุด'}
                </button>
                {editingHolidayKey && (
                  <button
                    type="button"
                    onClick={handleCancelEditHoliday}
                    className="py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                )}
              </div>
            </form>

            <div className="lg:col-span-8 overflow-x-auto border border-slate-200 rounded-xl max-h-[400px] overflow-y-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-500 text-left">
                    <th className="px-4 py-2.5">ลำดับ</th>
                    <th className="px-4 py-2.5">วันที่</th>
                    <th className="px-4 py-2.5">ชื่อวันหยุดนักขัตฤกษ์</th>
                    <th className="px-4 py-2.5 text-center">ตัวคูณตอบแทน</th>
                    <th className="px-4 py-2.5 text-right">คำสั่ง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {holidays.map((h, index) => {
                    const formattedDate = h.date.split('-').reverse().join('/');
                    const multDisplay = h.multiplier !== null && h.multiplier !== undefined ? `${h.multiplier}x เท่า` : '1.0x เท่า';
                    return (
                      <tr key={h.date} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2 font-bold text-slate-400">{index + 1}</td>
                        <td className="px-4 py-2 font-mono text-slate-700">{formattedDate}</td>
                        <td className="px-4 py-2 font-bold text-slate-800">{h.name}</td>
                        <td className="px-4 py-2 text-center text-slate-600 font-bold">{multDisplay}</td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => handleEditHoliday(h)}
                            className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-lg transition hover:scale-105 inline-block shrink-0 cursor-pointer mr-1.5"
                            title="แก้ไข"
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            onClick={() => handleRemoveHoliday(h.date)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition hover:scale-105 inline-block shrink-0 cursor-pointer"
                            title="ลบ"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {holidays.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400 italic">ไม่มีข้อมูลแสดงค่าประวัติวันหยุดที่บันทึกไว้ในลอคเป้าหมาย</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Departments list */}
        {subTab === 'departments' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <form onSubmit={handleAddDept} className="lg:col-span-4 flex flex-col gap-4 bg-slate-50/50 p-4 border border-slate-200 rounded-xl">
              <h4 className="text-xs font-bold text-slate-700 border-b border-slate-200 pb-1.5">เพิ่มหน่วยงานย่อยใหม่</h4>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500">ชื่อหน่วยงานปฏิบัติการ</label>
                <input
                  type="text"
                  placeholder="ตัวอย่าง: งานจ่ายยาผู้ป่วยนอก"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl outline-hidden focus:border-indigo-600"
                  required
                />
              </div>

              <button
                type="submit"
                className="py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition shrink-0 cursor-pointer"
              >
                บันทึกแผนกหน่วยบริการ
              </button>
            </form>

            <div className="lg:col-span-8 overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-500 text-left">
                    <th className="px-4 py-2.5">ลำดับ</th>
                    <th className="px-4 py-2.5">รหัสอ้างอิงภายใน</th>
                    <th className="px-4 py-2.5">ชื่อแผนก/หน่วยปฏิบัติการคุม</th>
                    <th className="px-4 py-2.5 text-right">คำสั่ง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {departments.map((dept, index) => (
                    <tr key={dept.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-bold text-slate-400">{index + 1}</td>
                      <td className="px-4 py-2 font-mono text-slate-500 text-[10px]">{dept.id}</td>
                      <td className="px-4 py-2 font-bold text-slate-800">{dept.name}</td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => handleRemoveDept(dept.id)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition hover:scale-105 inline-block shrink-0 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Rates & Shift times */}
        {subTab === 'rates' && (
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5 mb-4 flex items-center gap-2">
                <Clock size={16} className="text-slate-500" />
                อัตราการคืนสิทธิเบิกจ่ายวิชาชีพ (บาท/ชั่วโมง)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500">เภสัชกร (Pharmacist)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step={0.01}
                      value={ratePharmacist}
                      onChange={(e) => setRatePharmacist(Number(e.target.value))}
                      className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-indigo-600"
                    />
                    <span className="text-xs font-bold text-slate-500">฿/ชม.</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500">เจ้าพนักงานเภสัชกรรม (Technician)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step={0.01}
                      value={rateTechnician}
                      onChange={(e) => setRateTechnician(Number(e.target.value))}
                      className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-indigo-600"
                    />
                    <span className="text-xs font-bold text-slate-500">฿/ชม.</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500">พนักงานประจำห้องยา / ผู้ช่วยเหลือ (Aide)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step={0.01}
                      value={rateAide}
                      onChange={(e) => setRateAide(Number(e.target.value))}
                      className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-indigo-600"
                    />
                    <span className="text-xs font-bold text-slate-500">฿/ชม.</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500">พยาบาลวิชาชีพ / พนักงานพยาบาล (Nurse)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step={0.01}
                      value={rateNurse}
                      onChange={(e) => setRateNurse(Number(e.target.value))}
                      className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-indigo-600"
                    />
                    <span className="text-xs font-bold text-slate-500">฿/ชม.</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500">แพทย์ / นายแพทย์ (Doctor)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step={0.01}
                      value={rateDoctor}
                      onChange={(e) => setRateDoctor(Number(e.target.value))}
                      className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-indigo-600"
                    />
                    <span className="text-xs font-bold text-slate-500">฿/ชม.</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500">ทันตแพทย์ (Dentist)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step={0.01}
                      value={rateDentist}
                      onChange={(e) => setRateDentist(Number(e.target.value))}
                      className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-indigo-600"
                    />
                    <span className="text-xs font-bold text-slate-500">฿/ชม.</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500">นักเทคนิคการแพทย์ / เจ้าหน้าที่ Lab (Medical Tech)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step={0.01}
                      value={rateMedicalTech}
                      onChange={(e) => setRateMedicalTech(Number(e.target.value))}
                      className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-indigo-600"
                    />
                    <span className="text-xs font-bold text-slate-500">฿/ชม.</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500">นักรังสีการแพทย์ / เจ้าหน้าที่ X-Ray (Radiologist)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step={0.01}
                      value={rateRadiologist}
                      onChange={(e) => setRateRadiologist(Number(e.target.value))}
                      className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-indigo-600"
                    />
                    <span className="text-xs font-bold text-slate-500">฿/ชม.</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500">เจ้าหน้าที่บริหารทั่วไป / แอดมิน (General Admin)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step={0.01}
                      value={rateGeneralAdmin}
                      onChange={(e) => setRateGeneralAdmin(Number(e.target.value))}
                      className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-indigo-600"
                    />
                    <span className="text-xs font-bold text-slate-500">฿/ชม.</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500">วิชาชีพอื่นๆ / เจ้าหน้าที่นอกแผนก (Other)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step={0.01}
                      value={rateOther}
                      onChange={(e) => setRateOther(Number(e.target.value))}
                      className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-indigo-600"
                    />
                    <span className="text-xs font-bold text-slate-500">฿/ชม.</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5 mb-4 flex items-center gap-2">
                <Clock size={16} className="text-slate-500" />
                กำหนดระยะเวลากะสำหรับสรุปประกอบตารางงาน
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {/* morning */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-4 border border-slate-100 rounded-xl">
                  <span className="col-span-2 text-xs font-bold text-slate-700">กะเช้า (Morning Shift - 8 ชั่วโมง)</span>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">เวลาสวิตช์เริ่มต้น</label>
                    <input
                      type="time"
                      value={morningStart}
                      onChange={(e) => setMorningStart(e.target.value)}
                      className="px-3 py-1 bg-white border border-slate-200 text-xs rounded-lg font-bold"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">สิ้นสุดกะเวลา</label>
                    <input
                      type="time"
                      value={morningEnd}
                      onChange={(e) => setMorningEnd(e.target.value)}
                      className="px-3 py-1 bg-white border border-slate-200 text-xs rounded-lg font-bold"
                    />
                  </div>
                </div>

                {/* afternoon */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-4 border border-slate-100 rounded-xl">
                  <span className="col-span-2 text-xs font-bold text-slate-700">กะบ่าย (Afternoon Shift - 4 ชั่วโมง)</span>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">เวลาสวิตช์เริ่มต้น</label>
                    <input
                      type="time"
                      value={afternoonStart}
                      onChange={(e) => setAfternoonStart(e.target.value)}
                      className="px-3 py-1 bg-white border border-slate-200 text-xs rounded-lg font-bold"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">สิ้นสุดกะเวลา</label>
                    <input
                      type="time"
                      value={afternoonEnd}
                      onChange={(e) => setAfternoonEnd(e.target.value)}
                      className="px-3 py-1 bg-white border border-slate-200 text-xs rounded-lg font-bold"
                    />
                  </div>
                </div>

                {/* oncall */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-4 border border-slate-100 rounded-xl">
                  <span className="col-span-2 text-xs font-bold text-slate-700 flex justify-between items-center">
                    <span>กะ Oncall ฉุกเฉิน (Oncall Duty)</span>
                  </span>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">เวลาสวิตช์เริ่มต้น</label>
                    <input
                      type="time"
                      value={oncallStart}
                      onChange={(e) => setOncallStart(e.target.value)}
                      className="px-3 py-1 bg-white border border-slate-200 text-xs rounded-lg font-bold"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">สิ้นสุดกะเวลา</label>
                    <input
                      type="time"
                      value={oncallEnd}
                      onChange={(e) => setOncallEnd(e.target.value)}
                      className="px-3 py-1 bg-white border border-slate-200 text-xs rounded-lg font-bold"
                    />
                  </div>
                </div>

                {/* special */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-4 border border-slate-100 rounded-xl">
                  <span className="col-span-2 text-xs font-bold text-slate-700">กะพิเศษนอกระบบ (Special Shift Target)</span>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">เวลาสวิตช์เริ่มต้น</label>
                    <input
                      type="time"
                      value={specialStart}
                      onChange={(e) => setSpecialStart(e.target.value)}
                      className="px-3 py-1 bg-white border border-slate-200 text-xs rounded-lg font-bold"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">สิ้นสุดกะเวลา</label>
                    <input
                      type="time"
                      value={specialEnd}
                      onChange={(e) => setSpecialEnd(e.target.value)}
                      className="px-3 py-1 bg-white border border-slate-200 text-xs rounded-lg font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Theme appearance layout */}
        {subTab === 'appearance' && (
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5 mb-4 flex items-center gap-2">
                <Palette size={16} className="text-slate-500" />
                กำหนดขนาดตัวอักษรของตารางการทำงาน
              </h3>

              <div className="flex gap-3">
                {(['small', 'medium', 'large'] as const).map((sz) => (
                  <button
                    key={`size-${sz}`}
                    onClick={() => setFontSize(sz)}
                    className={`px-5 py-3 rounded-2xl border text-xs font-bold transition flex flex-col items-start gap-1 cursor-pointer select-none grow ${
                      fontSize === sz
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="capitalize">{sz === 'small' ? 'เล็ก (Compact)' : sz === 'medium' ? 'มาตรฐาน (Medium)' : 'ขยายใหญ่ (Large)'}</span>
                    <span className="text-[10px] text-slate-400 font-medium font-mono text-left">
                      {sz === 'small' ? '14px - เหมาะกับจอมือถือ' : sz === 'medium' ? '16px - คมชัดสายตู้อ่านเหมาะสม' : '18px - ตัวโต สบายสายตาข้าราชการ'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5 mb-4 flex items-center gap-2">
                <Palette size={16} className="text-slate-500" />
                เลือกโทนสีสกินประยุกต์เว็บแอป
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['sky', 'emerald', 'slate'] as const).map((colorMode) => (
                  <button
                    key={`colormode-${colorMode}`}
                    onClick={() => setThemeColor(colorMode)}
                    className={`p-4 border rounded-2xl text-left flex flex-col gap-1 transition cursor-pointer select-none ${
                      themeColor === colorMode
                        ? 'border-indigo-600 bg-indigo-50/20 text-slate-800 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4.5 h-4.5 rounded-full ${
                          colorMode === 'sky'
                            ? 'bg-blue-500'
                            : colorMode === 'emerald'
                            ? 'bg-emerald-500'
                            : 'bg-slate-500'
                        }`}
                      />
                      <span className="text-xs font-bold text-slate-800 capitalize">
                        {colorMode === 'sky' ? 'สไตล์สีฟ้านวลปาย (Sky Blue)' : colorMode === 'emerald' ? 'สไตล์พืชสมุนไพรเขียว (Misty Emerald)' : 'สไตล์เทาครามคลาสสิก (Slate Neutral)'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">เปลี่ยนโครงร่างชุดสีสกินปุ่มและกลิ่นอายรวมแผงความหรูหรา</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Central Signatures */}
        {subTab === 'signatures' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl flex flex-col gap-4">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 border-b border-slate-200/80 pb-2 mb-1">
                <Signature size={15} className="text-blue-500" />
                ลายเซ็นเจ้าพนักงานตารางผู้ส่งมอบงาน (ผู้จัดทำเวร)
              </h4>
              <SignaturePad
                initialValue={schedulerSignature}
                label="ลายเซ็นผู้จัดทำบันทึกตาราง"
                onSave={setSchedulerSignature}
              />
              {schedulerSignature ? (
                <div className="p-2 border border-slate-150 rounded-xl bg-white flex justify-center items-center">
                  <img
                    src={schedulerSignature}
                    alt="ผู้จัดตารางที่จัดสรรสำเร็จ"
                    className="max-h-12 object-contain mix-blend-multiply"
                  />
                </div>
              ) : (
                <div className="py-4 text-center text-[10px] text-slate-400 italic">ยังไม่มีวิชิตเครื่องหมายผู้ส่งลายมือกำกับ</div>
              )}
            </div>

            <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl flex flex-col gap-4">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 border-b border-slate-200/80 pb-2 mb-1">
                <Signature size={15} className="text-emerald-500" />
                ลายเซ็นผู้อนุมัติทำสัญญาสั่งจ่ายเบิกเงิน (หัวหน้ากลุ่มงาน)
              </h4>
              <SignaturePad
                initialValue={approverSignature}
                label="ลายเซ็นผู้อนุมัติตรวจเอกสาร"
                onSave={setApproverSignature}
              />
              {approverSignature ? (
                <div className="p-2 border border-slate-150 rounded-xl bg-white flex justify-center items-center">
                  <img
                    src={approverSignature}
                    alt="ผู้อนุมัติบันทึก"
                    className="max-h-12 object-contain mix-blend-multiply"
                  />
                </div>
              ) : (
                <div className="py-4 text-center text-[10px] text-slate-400 italic">ยังไม่มีวิชิตเครื่องหมายหัวหน้าคุมลายมือกำกับ</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
