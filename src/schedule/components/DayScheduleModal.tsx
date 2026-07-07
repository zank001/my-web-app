/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Staff, Duty, ShiftType, AppSettings, Holiday } from '../types';
import { getThaiDateString, THAI_DAYS_FULL, getThaiMonthYear } from '../utils';
import { X, Save, Trash2, Clock, ShieldCheck, HelpCircle } from 'lucide-react';

interface DayScheduleModalProps {
  dateStr: string;
  staff: Staff[];
  duties: Duty[];
  settings: AppSettings;
  holidays: Holiday[];
  selectedDeptId: string;
  onClose: () => void;
  onSave: (assignedStaffIds: string[], shiftId: ShiftType, times?: { oncallStart?: string, oncallEnd?: string, specialStart?: string, specialEnd?: string }) => void;
  onDeleteDuty: (dutyId: string) => void;
}

export default function DayScheduleModal({
  dateStr,
  staff,
  duties,
  settings,
  holidays,
  selectedDeptId,
  onClose,
  onSave,
  onDeleteDuty
}: DayScheduleModalProps) {
  // Find weekday index
  const dateObj = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = dateObj.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isHoliday = holidays.some((h) => h.date === dateStr);
  const isOffDay = isWeekend || isHoliday;

  // Filter existing duties on this day for this department
  const dayDuties = useMemo(() => duties.filter((d) => d.date === dateStr && d.departmentId === selectedDeptId), [duties, dateStr, selectedDeptId]);

  // Filter staff in the selected department
  const deptStaff = useMemo(() => staff.filter((s) => s.departmentId === selectedDeptId), [staff, selectedDeptId]);
  const pharmacists = useMemo(() => deptStaff.filter((s) => s.type === 'pharmacist'), [deptStaff]);
  const assistants = useMemo(() => deptStaff.filter((s) => s.type !== 'pharmacist'), [deptStaff]);

  // Fields state
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [shiftId, setShiftId] = useState<ShiftType>(isOffDay ? 'morning' : 'afternoon');

  // Custom times state
  const [oncallStart, setOncallStart] = useState(settings.shiftTimes.oncall.start);
  const [oncallEnd, setOncallEnd] = useState(settings.shiftTimes.oncall.end);
  const [specialStart, setSpecialStart] = useState(settings.shiftTimes.special.start);
  const [specialEnd, setSpecialEnd] = useState(settings.shiftTimes.special.end);

  // Auto-switch default shift type based on day status (weekend/weekday/holiday)
  useEffect(() => {
    setShiftId(isOffDay ? 'morning' : 'afternoon');
  }, [isOffDay]);

  // Clean non-pharmacists if shift switched to 'oncall'
  useEffect(() => {
    if (shiftId === 'oncall') {
      const pharmacistIds = new Set(pharmacists.map(p => p.id));
      const hasAssistantSelected = selectedStaffIds.some(id => !pharmacistIds.has(id));
      if (hasAssistantSelected) {
        setSelectedStaffIds(prev => prev.filter(id => pharmacistIds.has(id)));
      }
    }
  }, [shiftId, pharmacists, selectedStaffIds]);

  const handleToggleStaff = (id: string, isPharm: boolean) => {
    setSelectedStaffIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        if (shiftId === 'oncall' && !isPharm) {
          alert('กะ Oncall สามารถจัดสรรเฉพาะเภสัชกรเท่านั้นตามระเบียบงาน');
          return prev;
        }
        return [...prev, id];
      }
    });
  };

  const handleSave = () => {
    if (selectedStaffIds.length === 0) return alert('กรุณาเลือกบุคลากรปฏิบัติงานกะนี้');

    // Validation for oncall
    if (shiftId === 'oncall') {
      const pharmacistIds = new Set(pharmacists.map(p => p.id));
      const hasAssistant = selectedStaffIds.some(id => !pharmacistIds.has(id));
      if (hasAssistant) {
        alert('กะ Oncall สามารถจัดสรรเฉพาะเภสัชกรเท่านั้นตามระเบียบงาน');
        return;
      }
    }

    onSave(selectedStaffIds, shiftId, {
      oncallStart,
      oncallEnd,
      specialStart,
      specialEnd
    });

    // Reset selected staff so scheduler can add another one easily
    setSelectedStaffIds([]);
    onClose();
  };

  const currentDayLabel = `${THAI_DAYS_FULL[dayOfWeek]}ที่ ${getThaiDateString(dateStr)}`;

  const shiftOptions = [
    { id: 'morning', label: 'กะเวรเช้า', time: `${settings.shiftTimes.morning.start} - ${settings.shiftTimes.morning.end} น.`, show: isOffDay },
    { id: 'afternoon', label: 'กะเวรบ่าย', time: `${settings.shiftTimes.afternoon.start} - ${settings.shiftTimes.afternoon.end} น.`, show: !isOffDay },
    { id: 'oncall', label: 'กะเวร Oncall', time: `${oncallStart} - ${oncallEnd} น.`, show: true },
    { id: 'special', label: 'กะเวรพิเศษ', time: `${specialStart} - ${specialEnd} น.`, show: true }
  ].filter(opt => opt.show);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
        className="bg-white border border-slate-200 shadow-2xl rounded-3xl w-full max-w-lg overflow-hidden flex flex-col justify-start"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex flex-col text-left">
            <h3 className="text-base font-bold text-slate-800 font-display">จัดสรรเวรประจำวัน</h3>
            <span className="text-xs font-semibold text-indigo-600 mt-0.5">{currentDayLabel}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-xl transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[70vh] text-left">
          {/* Staff selection: Pharmacist */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">เภสัชกรปฏิบัติงาน (Pharmacist)</label>
            <div className="flex flex-wrap gap-1.5">
              {pharmacists.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleToggleStaff(p.id, true)}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                    selectedStaffIds.includes(p.id)
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p.nickname || p.name}
                  {selectedStaffIds.includes(p.id) && <span className="ml-1 text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full font-sans">✓</span>}
                </button>
              ))}
              {pharmacists.length === 0 && (
                <span className="text-xs text-slate-400 italic">ไม่มีวิชาชีพนักเภสัชระบุสังกัดแผนกนี้</span>
              )}
            </div>
          </div>

          {/* Assistants selector (hidden if oncall) */}
          {shiftId !== 'oncall' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">ผู้ช่วยหรือพนักงานห้องยาสังกัดกะกุม (Assistants)</label>
              <div className="flex flex-wrap gap-2">
                {assistants.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => handleToggleStaff(a.id, false)}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                      selectedStaffIds.includes(a.id)
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {a.nickname || a.name}
                    {selectedStaffIds.includes(a.id) && <span className="ml-1 text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full font-sans">✓</span>}
                  </button>
                ))}
                {assistants.length === 0 && (
                  <span className="text-xs text-slate-400 italic">ไม่มีพนักงานจัดสรรระบุแผนกนี้</span>
                )}
              </div>
            </div>
          )}

          {/* Shift selector options */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">เลือกกะงานปฏิบัติราชการ (Shift)</label>
            <div className="grid grid-cols-2 gap-2.5">
              {shiftOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setShiftId(opt.id as ShiftType)}
                  className={`p-3 text-left rounded-2xl border transition flex flex-col gap-0.5 cursor-pointer select-none ${
                    shiftId === opt.id
                      ? 'border-indigo-600 bg-indigo-50/20 text-slate-800 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-800">{opt.label}</span>
                  <span className="text-[10px] font-medium text-slate-400 font-mono">{opt.time}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Shift Time Modifiers */}
          {shiftId === 'oncall' && (
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="col-span-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Clock size={12} />
                กำหนดระยะเวลากะ Oncall
              </span>
              <div className="flex flex-col gap-1 text-left">
                <label className="text-[10px] text-slate-400 font-bold">เวลาสวิตช์เริ่ม</label>
                <input
                  type="time"
                  value={oncallStart}
                  onChange={(e) => setOncallStart(e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <label className="text-[10px] text-slate-400 font-bold">สิ้นสุดเวลา</label>
                <input
                  type="time"
                  value={oncallEnd}
                  onChange={(e) => setOncallEnd(e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                />
              </div>
            </div>
          )}

          {shiftId === 'special' && (
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="col-span-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Clock size={12} />
                กำหนดระยะเวลาเวรพิเศษนอกสิทธิ
              </span>
              <div className="flex flex-col gap-1 text-left">
                <label className="text-[10px] text-slate-400 font-bold">เวลาสวิตช์เริ่ม</label>
                <input
                  type="time"
                  value={specialStart}
                  onChange={(e) => setSpecialStart(e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <label className="text-[10px] text-slate-400 font-bold">สิ้นสุดเวลา</label>
                <input
                  type="time"
                  value={specialEnd}
                  onChange={(e) => setSpecialEnd(e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                />
              </div>
            </div>
          )}

          {/* Save/Add trigger */}
          <button
            type="button"
            onClick={handleSave}
            disabled={selectedStaffIds.length === 0}
            className={`w-full py-2.5 rounded-xl font-bold text-white transition flex items-center justify-center gap-2 shrink-0 ${
              selectedStaffIds.length > 0
                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-md cursor-pointer animate-pulse-subtle'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Save size={15} />
            จัดสรรเติมเข้ารายการวันนี้ {selectedStaffIds.length > 0 && `(${selectedStaffIds.length} คน)`}
          </button>

          {/* List of current active assigned duties on this day */}
          {dayDuties.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">กะเวรที่จัดสรรแล้วในวันนี้</label>
              <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto pr-0.5 scrollbar-thin">
                {dayDuties.map((duty) => {
                  const assigned = staff.find((s) => s.id === duty.staffId);
                  if (!assigned) return null;

                  const shiftLabel =
                    duty.shiftId === 'morning'
                      ? 'เวรเช้า (08:30-16:30 น.)'
                      : duty.shiftId === 'afternoon'
                      ? 'เวรบ่าย (16:30-20:00 น.)'
                      : duty.shiftId === 'oncall'
                      ? `เวร Oncall (${duty.oncallStartTime} - ${duty.oncallEndTime} น.)`
                      : `เวรพิเศษ (${duty.specialStartTime} - ${duty.specialEndTime} น.)`;

                  return (
                    <div
                      key={duty.id}
                      className="p-3 border border-slate-100 rounded-xl bg-slate-50 flex items-center justify-between gap-3 shadow-xs hover:border-slate-200 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0 border border-white"
                          style={{ backgroundColor: assigned.color }}
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800">
                            {assigned.name} ({assigned.nickname})
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5 font-bold">{shiftLabel}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => onDeleteDuty(duty.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition shrink-0 cursor-pointer"
                        title="ถอนเวรออกลบกะนี้"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
