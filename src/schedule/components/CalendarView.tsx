/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Staff, Duty, Holiday, AppSettings } from '../types';
import {
  getDaysInMonth,
  getFirstDayOfMonth,
  formatDateKey,
  THAI_DAYS_SHORT,
  getThaiMonthYear
} from '../utils';
import { Calendar as CalendarIcon, Users, CheckCircle, Sparkles, AlertCircle, Trash2, Printer, ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarViewProps {
  currentDate: Date;
  staff: Staff[];
  duties: Duty[];
  holidays: Holiday[];
  settings: AppSettings;
  selectedDeptId: string;
  onSelectDeptId: (id: string) => void;
  onOpenDayModal: (dateStr: string) => void;
  onAutoSchedule: () => void;
  onClearMonth: () => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export default function CalendarView({
  currentDate,
  staff,
  duties,
  holidays,
  settings,
  selectedDeptId,
  onSelectDeptId,
  onOpenDayModal,
  onAutoSchedule,
  onClearMonth,
  onPrevMonth,
  onNextMonth
}: CalendarViewProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);

  // Group duties by date
  const dutiesByDateObj: Record<string, Duty[]> = {};
  duties.forEach((duty) => {
    if (duty.departmentId === selectedDeptId) {
      if (!dutiesByDateObj[duty.date]) {
        dutiesByDateObj[duty.date] = [];
      }
      dutiesByDateObj[duty.date].push(duty);
    }
  });

  // Convert holidays map
  const holidayMapObj: Record<string, Holiday> = {};
  holidays.forEach((h) => {
    holidayMapObj[h.date] = h;
  });

  const getDayStatus = (dateStr: string) => {
    const isHoliday = !!holidayMapObj[dateStr];
    const dateObj = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    return { isHoliday, isWeekend, holiday: holidayMapObj[dateStr] };
  };

  // Stats calculation
  const totalDutiesRecorded = duties.filter(d => d.departmentId === selectedDeptId).length;
  const totalStaffInDept = staff.filter(s => s.departmentId === selectedDeptId).length;

  // Count holidays in the current month
  const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
  const holidayCountInMonth = holidays.filter(h => h.date.startsWith(currentMonthPrefix)).length;

  const renderCells = () => {
    const cells = [];

    // Empty cells for the start of the week
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<div key={`empty-${i}`} className="bg-slate-50 border-r border-b border-slate-100 min-h-[110px]" />);
    }

    // Days in the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateKey(year, month, day);
      const { isHoliday, isWeekend, holiday } = getDayStatus(dateStr);
      const dayDuties = dutiesByDateObj[dateStr] || [];

      cells.push(
        <button
          key={`day-${day}`}
          onClick={() => onOpenDayModal(dateStr)}
          className={`flex flex-col text-left p-2.5 min-h-[110px] bg-white border-r border-b border-slate-100/80 hover:bg-slate-50 transition-all duration-150 relative outline-hidden group select-none`}
        >
          {/* Day header */}
          <div className="flex justify-between items-center w-full mb-1">
            <span
              className={`text-sm font-bold flex items-center justify-center w-6 h-6 rounded-full ${
                isHoliday
                  ? 'bg-rose-100 text-rose-700'
                  : isWeekend
                  ? 'text-amber-600'
                  : 'text-slate-700'
              }`}
            >
              {day}
            </span>
            {isHoliday && (
              <span className="text-[10px] font-bold text-rose-600 truncate max-w-[70%]">
                {holiday?.name}
              </span>
            )}
          </div>

          {/* Duties indicators */}
          <div className="flex flex-col gap-1 w-full overflow-y-auto max-h-[75px] pr-0.5 mt-0.5 scrollbar-thin">
            {dayDuties.length > 0 ? (
              dayDuties.map((duty) => {
                const assignedStaff = staff.find((s) => s.id === duty.staffId);
                if (!assignedStaff) return null;

                const shiftLabel =
                  duty.shiftId === 'morning'
                    ? 'เช้า'
                    : duty.shiftId === 'afternoon'
                    ? 'บ่าย'
                    : duty.shiftId === 'oncall'
                    ? 'Oncall'
                    : 'พิเศษ';

                return (
                  <div
                    key={duty.id}
                    title={`${assignedStaff.name} - ${shiftLabel}`}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold text-white shadow-xs"
                    style={{ backgroundColor: assignedStaff.color }}
                  >
                    <span className="flex-1 truncate">
                      {assignedStaff.nickname || assignedStaff.name}
                    </span>
                    <span className="text-[9px] bg-black/15 px-1 py-[1.5px] rounded-sm shrink-0">
                      {shiftLabel}
                    </span>
                  </div>
                );
              })
            ) : (
              <span className="text-[10px] text-slate-400 italic px-1 mt-1">ยังไม่มีเวร</span>
            )}
          </div>

          {/* Micro hover indicator */}
          <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-sm font-semibold pointer-events-none">
            + จัดสรร
          </div>
        </button>
      );
    }

    // Remaining empty cells to fill the dynamic grid beautifully
    const totalCells = firstDayIndex + daysInMonth;
    const remainder = totalCells % 7;
    if (remainder > 0) {
      const remainingCount = 7 - remainder;
      for (let i = 0; i < remainingCount; i++) {
        cells.push(<div key={`empty-end-${i}`} className="bg-slate-50 border-r border-b border-slate-100 min-h-[110px]" />);
      }
    }

    return cells;
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Top Banner Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs no-print">
        <div className="col-span-1 flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Quick Month Changer directly in Calendar View top banner */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl shrink-0">
            <button
              onClick={onPrevMonth}
              className="w-8 h-8 hover:bg-slate-200/80 rounded-lg text-slate-600 transition flex items-center justify-center cursor-pointer select-none"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-black px-1 text-center text-slate-750 min-w-[115px] select-none">
              {getThaiMonthYear(year, month)}
            </span>
            <button
              onClick={onNextMonth}
              className="w-8 h-8 hover:bg-slate-200/80 rounded-lg text-slate-600 transition flex items-center justify-center cursor-pointer select-none"
              title="เดือนถัดไป"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="text-left">
            <h2 className="text-lg font-bold text-slate-800 font-display">ปฏิทินจัดตารางเวร</h2>
            <p className="text-xs text-slate-500 mt-0.5">คลิกแต่ละช่องวันเพื่อปรับแต่ง จัดกะงาน และแก้ไขตารางของบุคลากรกลุ่มงานเภสัชกรรม</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Department Filter Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">หน่วยงาน:</span>
            <select
              value={selectedDeptId}
              onChange={(e) => onSelectDeptId(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl outline-hidden group transition cursor-pointer"
            >
              {settings.departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Active Commands */}
          <button
            onClick={onAutoSchedule}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl hover:shadow-md transition active:scale-97 shrink-0 cursor-pointer"
          >
            <Sparkles size={14} />
            จัดตารางอัตโนมัติ
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            <Printer size={14} />
            พิมพ์ / บันทึก PDF
          </button>

          <button
            onClick={onClearMonth}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition cursor-pointer"
          >
            <Trash2 size={13} />
            ล้างตารางเดือนนี้
          </button>
        </div>
      </div>

      {/* Stats Block grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <CalendarIcon size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">วันในเดือนนี้</span>
            <span className="text-lg font-bold text-slate-800">{daysInMonth} วัน</span>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">จัดเวรสะสม</span>
            <span className="text-lg font-bold text-slate-800">{totalDutiesRecorded} รายงาน</span>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center shrink-0 font-bold">
            <Users size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">บุคลากรในตาราง</span>
            <span className="text-lg font-bold text-slate-800">{totalStaffInDept} คน</span>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
            <AlertCircle size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">วันหยุดนักขัตฤกษ์</span>
            <span className="text-lg font-bold text-slate-800">{holidayCountInMonth} วัน</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {/* Printable Title Block */}
        <div className="hidden print-only text-center py-5 border-b border-slate-100">
          <h2 className="text-2xl font-bold text-slate-900">{settings.hospitalInfo?.hospitalName}</h2>
          <h3 className="text-lg font-semibold text-slate-700 mt-1">ตารางปฏิบัติงานนอกเวลาราชการ - กลุ่มงาน: {settings.hospitalInfo?.departmentName}</h3>
          <p className="text-sm font-semibold text-slate-500 mt-0.5">ประจำเดือน {getThaiMonthYear(year, month)} (หน่วยงาน: {settings.departments.find(d => d.id === selectedDeptId)?.name})</p>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-center py-2.5">
          {THAI_DAYS_SHORT.map((dayName, idx) => (
            <span
              key={`day-name-${idx}`}
              className={`text-xs font-bold uppercase tracking-wider ${
                idx === 0 ? 'text-rose-500' : idx === 6 ? 'text-amber-500' : 'text-slate-500'
              }`}
            >
              {dayName}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 border-l border-slate-100">
          {renderCells()}
        </div>
      </div>
    </div>
  );
}
