/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Staff, StaffType, Department } from '../types';
import SignaturePad from './SignaturePad';
import { Plus, Trash2, Calendar, ShieldAlert, Award, FileSpreadsheet, Sparkles, Signature, Edit } from 'lucide-react';

interface StaffViewProps {
  staff: Staff[];
  departments: Department[];
  onAddStaff: (newStaff: Omit<Staff, 'id' | 'signature'>) => void;
  onUpdateStaff: (id: string, updatedFields: Partial<Staff>) => void;
  onDeleteStaff: (id: string) => void;
}

export default function StaffView({
  staff,
  departments,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff
}: StaffViewProps) {
  // Local state for new staff form
  const [prefix, setPrefix] = useState('นาย');
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [type, setType] = useState<StaffType>('pharmacist');
  const [color, setColor] = useState('#2563eb');
  const [oncallOnly, setOncallOnly] = useState(false);
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || 'dept-pharmacy');

  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

  // Track which staff ID is currently drawing a signature
  const [activeSignatureStaffId, setActiveSignatureStaffId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !nickname.trim()) return alert('กรุณาระบุชื่อและชื่อเล่น');

    if (editingStaffId) {
      onUpdateStaff(editingStaffId, {
        name: `${prefix} ${name.trim()}`,
        nickname: nickname.trim(),
        type,
        color,
        oncallOnly,
        departmentId
      });
      setEditingStaffId(null);
    } else {
      onAddStaff({
        name: `${prefix} ${name.trim()}`,
        nickname: nickname.trim(),
        type,
        color,
        oncallOnly,
        defaultDays: [],
        departmentId
      });
    }

    // Reset inputs
    setName('');
    setNickname('');
    setPrefix('นาย');
    setType('pharmacist');
    setOncallOnly(false);
    // Put random neon/vibrant color to keep UI beautiful
    const dynamicColors = ['#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#14b8a6', '#6366f1'];
    const randomColor = dynamicColors[Math.floor(Math.random() * dynamicColors.length)];
    setColor(randomColor);
  };

  const handleEditStaff = (employee: Staff) => {
    setEditingStaffId(employee.id);

    // Parse prefix and name
    const prefixes = ['นาย', 'นาง', 'น.ส.'];
    let foundPrefix = 'นาย';
    let rawName = employee.name;

    for (const p of prefixes) {
      if (employee.name.startsWith(p + ' ')) {
        foundPrefix = p;
        rawName = employee.name.slice(p.length + 1);
        break;
      } else if (employee.name.startsWith(p)) {
        foundPrefix = p;
        rawName = employee.name.slice(p.length);
        break;
      }
    }

    setPrefix(foundPrefix);
    setName(rawName);
    setNickname(employee.nickname);
    setType(employee.type);
    setColor(employee.color);
    setOncallOnly(employee.oncallOnly);
    setDepartmentId(employee.departmentId || departments[0]?.id || 'dept-pharmacy');
  };

  const STAFF_TYPES_LABELS: Record<StaffType, string> = {
    pharmacist: 'เภสัชกร',
    technician: 'เจ้าพนักงานเภสัชกรรม',
    aide: 'พนักงานประจำห้องยา / ผู้ช่วยเหลือ',
    nurse: 'พยาบาลวิชาชีพ / พนักงานพยาบาล',
    doctor: 'แพทย์ / นายแพทย์ / แพทย์วิชาชีพ',
    dentist: 'ทันตแพทย์ / วิชาชีพทันตกรรม',
    medicalTech: 'นักเทคนิคการแพทย์ / เจ้าหน้าที่ Lab',
    radiologist: 'นักรังสีการแพทย์ / เจ้าหน้าที่ X-Ray',
    generalAdmin: 'เจ้าหน้าที่บริหารทั่วไป / แอดมิน / ธุรการ',
    other: 'วิชาชีพอื่นๆ / เจ้าหน้าที่นอกแผนก'
  };

  const getPositionIcon = (type: StaffType) => {
    switch (type) {
      case 'pharmacist':
        return <Award className="text-blue-600" size={16} />;
      case 'technician':
        return <FileSpreadsheet className="text-emerald-600" size={16} />;
      case 'aide':
        return <Plus className="text-purple-600" size={16} />;
      case 'nurse':
        return <Plus className="text-pink-600" size={16} />;
      case 'doctor':
        return <Award className="text-rose-600" size={16} />;
      case 'dentist':
        return <Award className="text-red-500" size={16} />;
      case 'medicalTech':
        return <FileSpreadsheet className="text-indigo-600" size={16} />;
      case 'radiologist':
        return <FileSpreadsheet className="text-cyan-600" size={16} />;
      case 'generalAdmin':
        return <Plus className="text-slate-500" size={16} />;
      default:
        return <Plus className="text-slate-400" size={16} />;
    }
  };

  const handleDefaultDayToggle = (id: string, dayNum: number) => {
    const employee = staff.find((s) => s.id === id);
    if (!employee) return;

    let nextDays = [...employee.defaultDays];
    if (nextDays.includes(dayNum)) {
      nextDays = nextDays.filter((d) => d !== dayNum);
    } else {
      nextDays.push(dayNum);
    }

    onUpdateStaff(id, { defaultDays: nextDays.sort((a, b) => a - b) });
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Title Header Card inline */}
      <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
        <h2 className="text-lg font-bold text-slate-800 font-display">ทะเบียนรายชื่อบุคลากร</h2>
        <p className="text-xs text-slate-500 mt-0.5">เพิ่มพนักงานจัดสรร กำหนดตำแหน่ง กลุ่มเวร ล็อกวันปฏิบัติราชการประจำสัปดาห์ และลงลายมือชื่อพนักงาน</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Registration Form Panel */}
        <form onSubmit={handleSubmit} className="lg:col-span-4 p-5 bg-white border border-slate-200 rounded-2xl flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
            {editingStaffId ? <Edit size={15} className="text-indigo-600" /> : <Plus size={15} />}
            {editingStaffId ? 'แก้ไขข้อมูลบุคลากร' : 'ลงทะเบียนบุคลากรใหม่'}
          </h3>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase">คำนำหน้า และชื่อ-นามสกุล</label>
            <div className="flex gap-2">
              <select
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                className="w-1/3 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-indigo-500"
              >
                <option value="นาย">นาย</option>
                <option value="นาง">นาง</option>
                <option value="น.ส.">น.ส.</option>
              </select>
              <input
                type="text"
                placeholder="ชื่อ พนักงาน"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-indigo-500"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase">ชื่อเล่น</label>
            <input
              type="text"
              placeholder="ตัวอย่าง: Mint / Sin"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-indigo-500"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase">ตำแหน่งวิชาชีพ</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as StaffType)}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-indigo-500"
            >
              {Object.entries(STAFF_TYPES_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase">สังกัดหน่วยงาน</label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-indigo-500"
            >
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase">ชุดระบุสีประจําตัว</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-10 h-10 border border-slate-200 rounded-xl overflow-hidden cursor-pointer shrink-0"
                />
                <span className="text-xs font-bold font-mono text-slate-500 uppercase">{color}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase">ภารกิจพิเศษ</label>
              <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer select-none transition">
                <input
                  type="checkbox"
                  checked={oncallOnly}
                  onChange={(e) => setOncallOnly(e.target.checked)}
                  className="rounded-sm border-slate-300 text-indigo-600 outline-hidden"
                />
                <span className="text-xs font-bold text-slate-700">Oncall Only</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2.5 mt-2 w-full">
            <button
              type="submit"
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs text-xs"
            >
              {editingStaffId ? <Edit size={14} /> : <Plus size={14} />}
              {editingStaffId ? 'บันทึกการแก้ไข' : 'ลงทะเบียนพนักงาน'}
            </button>
            {editingStaffId && (
              <button
                type="button"
                onClick={() => {
                  setEditingStaffId(null);
                  setName('');
                  setNickname('');
                  setPrefix('นาย');
                  setType('pharmacist');
                  setOncallOnly(false);
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition cursor-pointer text-xs"
              >
                ยกเลิก
              </button>
            )}
          </div>
        </form>

        {/* List of Registered Staff Panel */}
        <div className="lg:col-span-8 p-5 bg-white border border-slate-200 rounded-2xl flex flex-col gap-3">
          <h3 className="text-sm font-bold text-slate-700 flex items-center justify-between gap-1.5 border-b border-slate-100 pb-2.5 mb-1">
            <span className="flex items-center gap-1.5">
              <Sparkles size={15} className="text-indigo-500" />
              ทะเบียนบุคลากร ({staff.length} คน)
            </span>
          </h3>

          <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1">
            {staff.length > 0 ? (
              staff.map((employee) => {
                const isSignaturePadActive = activeSignatureStaffId === employee.id;

                return (
                  <div key={employee.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)] transition-all duration-200 bg-white min-h-[88px] flex flex-col justify-center">
                    <div className="p-4 grid grid-cols-1 md:grid-cols-[1fr_auto] xl:grid-cols-[minmax(0,1.8fr)_auto_auto] gap-x-6 gap-y-4 items-center">
                      {/* Left: Metadata */}
                      <div className="flex items-center gap-4 min-w-0 md:col-span-2 xl:col-span-1">
                        <div
                          className="w-10 h-10 rounded-full shadow-sm shrink-0 flex items-center justify-center text-white font-bold text-sm tracking-widest relative"
                          style={{ backgroundColor: employee.color }}
                        >
                          {employee.nickname?.[0]?.toUpperCase() || employee.name?.[0]?.toUpperCase() || ''}
                          <div className="absolute inset-0 border border-black/10 rounded-full" />
                        </div>
                        <div className="flex flex-col text-left min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                            <span
                              className="text-sm font-bold text-slate-800 truncate"
                              title={`${employee.name} (${employee.nickname})`}
                            >
                              {employee.name} <span className="text-slate-500 font-normal">({employee.nickname})</span>
                            </span>
                            {employee.oncallOnly && (
                              <span className="shrink-0 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-1.5 py-0.5 uppercase tracking-wide">
                                Oncall Only
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium truncate">
                            <span className="shrink-0 flex items-center opacity-80">{getPositionIcon(employee.type)}</span>
                            <span className="truncate">{STAFF_TYPES_LABELS[employee.type]}</span>
                            <span className="text-slate-300 shrink-0">•</span>
                            <span className="text-slate-600 font-semibold truncate">
                              {departments.find((d) => d.id === employee.departmentId)?.name || 'ฝ่ายเภสัชกรรม'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Weekday quick locks */}
                      <div className="flex flex-col gap-1.5 shrink-0 mt-1 md:mt-0 xl:mt-0 md:col-span-1 xl:col-auto">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">วันเวรประจำสัปดาห์</span>
                        <div className="flex gap-1.5 flex-wrap">
                          {[1, 2, 3, 4, 5, 6, 0].map((dayNum) => {
                            const isLocked = employee.defaultDays.includes(dayNum);
                            const dayLetter = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'][dayNum === 0 ? 6 : dayNum - 1];
                            return (
                              <button
                                key={`lock-${employee.id}-${dayNum}`}
                                onClick={() => handleDefaultDayToggle(employee.id, dayNum)}
                                title={`กำหนดส่งเวรอัตโนมัติทุกๆ${dayNum === 0 ? 'วันอาทิตย์' : `วัน${['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'][dayNum - 1]}`}`}
                                className={`text-xs font-bold w-8 h-8 rounded-lg border flex items-center justify-center transition cursor-pointer shrink-0 ${
                                  isLocked
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm hover:bg-indigo-700'
                                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 shadow-[0_1px_2px_rgba(0,0,0,0.02)]'
                                }`}
                              >
                                {dayLetter}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 justify-end shrink-0 md:col-start-2 xl:col-auto mt-2 md:mt-0 xl:mt-0">
                        <button
                          type="button"
                          onClick={() => setActiveSignatureStaffId(isSignaturePadActive ? null : employee.id)}
                          className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition cursor-pointer h-9 ${
                            employee.signature
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/80 shadow-[0_1px_2px_rgba(16,185,129,0.05)]'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-[0_1px_2px_rgba(0,0,0,0.02)]'
                          }`}
                        >
                          <Signature size={14} />
                          {employee.signature ? 'มีลายเซ็นแล้ว' : 'เซ็นชื่อ'}
                        </button>

                        <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>

                        <button
                          onClick={() => handleEditStaff(employee)}
                          className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition shrink-0 cursor-pointer w-9 h-9 flex items-center justify-center border border-transparent shadow-none"
                          title="แก้ไขข้อมูลบุคลากร"
                          aria-label="Edit staff"
                        >
                          <Edit size={16} />
                        </button>

                        <button
                          onClick={() => onDeleteStaff(employee.id)}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0 cursor-pointer w-9 h-9 flex items-center justify-center border border-transparent shadow-none"
                          title="ลบพนักงานและตารางเวรที่เกี่ยวข้องประสานงานทั้งหมด"
                          aria-label="Delete staff"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Inline Expandable Signature Drawing Area */}
                    {isSignaturePadActive && (
                      <div className="border-t border-slate-100 p-4 bg-slate-50/20">
                        <SignaturePad
                          initialValue={employee.signature}
                          label={`ลายมือชื่อของ คุณ${employee.nickname || employee.name}`}
                          onSave={(newBase64) => onUpdateStaff(employee.id, { signature: newBase64 })}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <ShieldAlert size={36} className="text-slate-300" />
                <span className="text-xs">ยังไม่มีวิชาชีพหรือบุคลากรในทะเบียนหน่วยงาน</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
