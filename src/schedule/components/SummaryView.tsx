/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Staff, Duty, Holiday, AppSettings } from '../types';
import { calculateDutyHoursByShift, getThaiMonthYear } from '../utils';
import { DollarSign, Printer, ShieldCheck, Signature as SignatureIcon, FileSpreadsheet } from 'lucide-react';
import ExcelJS from 'exceljs';

interface SummaryViewProps {
  currentDate: Date;
  staff: Staff[];
  duties: Duty[];
  holidays: Holiday[];
  settings: AppSettings;
  selectedDeptId: string;
}

export default function SummaryView({
  currentDate,
  staff,
  duties,
  holidays,
  settings,
  selectedDeptId
}: SummaryViewProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}-`;

  // Filter staff and duties belonging to the selected department
  const visibleStaff = staff.filter((s) => s.departmentId === selectedDeptId);
  const monthlyDuties = duties.filter(
    (d) => d.date.startsWith(currentMonthPrefix) && d.departmentId === selectedDeptId
  );

  // Convert holidays map for multipliers
  const holidayMultiplierMap: Record<string, number> = {};
  holidays.forEach((h) => {
    const defaultMult = 1;
    const m = h.multiplier !== null && h.multiplier !== undefined ? h.multiplier : defaultMult;
    holidayMultiplierMap[h.date] = (m === 1.5 || m === 2) ? 1 : m;
  });

  const getDutyMultiplier = (dateStr: string) => {
    return holidayMultiplierMap[dateStr] || 1;
  };

  const handleExportToExcel = async () => {
    const thaiMonthYear = getThaiMonthYear(year, month);
    const hospitalName = settings.hospitalInfo?.hospitalName || 'โรงพยาบาลปาย';
    const deptName = settings.hospitalInfo?.departmentName || 'ฝ่ายเภสัชกรรม';
    const currentDeptName = settings.departments.find(d => d.id === selectedDeptId)?.name || 'ฝ่ายเภสัชกรรม';

    // ----------------------------------------------------
    // helper to format cash numbers into standard word format
    // ----------------------------------------------------
    const thaiBahtText = (num: number): string => {
      if (!num || isNaN(num)) return 'ศูนย์บาทถ้วน';
      const rounded = Math.round(num * 100) / 100;
      const parts = String(rounded).split('.');
      const bahtStr = parts[0];
      const satangStr = parts[1] || '';

      const thaiNum = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
      const thaiUnit = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

      const toThaiWords = (nStr: string): string => {
        let text = "";
        const len = nStr.length;
        for (let i = 0; i < len; i++) {
          const digit = parseInt(nStr[i], 10);
          const pos = len - 1 - i;
          if (digit !== 0) {
            if (pos === 1 && digit === 1) {
              text += "สิบ";
            } else if (pos === 1 && digit === 2) {
              text += "ยี่สิบ";
            } else if (pos === 0 && digit === 1 && len > 1) {
              text += "เอ็ด";
            } else {
              text += thaiNum[digit] + thaiUnit[pos];
            }
          }
        }
        return text;
      };

      const bahtText = toThaiWords(bahtStr);
      let satangText = '';
      if (satangStr && parseInt(satangStr, 10) > 0) {
        const rawSatang = satangStr.length === 1 ? satangStr + '0' : satangStr;
        satangText = toThaiWords(rawSatang) + 'สตางค์';
      }

      let out = bahtText ? bahtText + 'บาท' : '';
      if (satangText) {
        out += satangText;
      } else {
        out += 'ถ้วน';
      }
      return out || 'ศูนย์บาทถ้วน';
    };

    const formatTimeThai = (timeStr: string | undefined, defaultTime: string) => {
      const time = timeStr || defaultTime;
      return `${time.replace(':', '.')} น.`;
    };

    // Instantiate workbook
    const workbook = new ExcelJS.Workbook();

    const font18Bold = { name: 'TH Sarabun New', size: 18, bold: true };
    const font16Bold = { name: 'TH Sarabun New', size: 16, bold: true };
    const font16Normal = { name: 'TH Sarabun New', size: 16 };
    const font14Bold = { name: 'TH Sarabun New', size: 14, bold: true };
    const font14Normal = { name: 'TH Sarabun New', size: 14 };

    const thinBorder = {
      top: { style: 'thin' as any, color: { argb: 'FF000000' } },
      left: { style: 'thin' as any, color: { argb: 'FF000000' } },
      bottom: { style: 'thin' as any, color: { argb: 'FF000000' } },
      right: { style: 'thin' as any, color: { argb: 'FF000000' } }
    };

    const typeLabelMap: Record<string, string> = {
      pharmacist: 'เภสัชกร',
      technician: 'เจ้าพนักงานเภสัชกรรม',
      aide: 'พนักงานประจำห้องยา'
    };

    const sortedStaff = [...visibleStaff]
      .filter(employee => monthlyDuties.some(duty => duty.staffId === employee.id))
      .sort((a, b) => {
        const parsedA = parseInt(a.id, 10);
        const parsedB = parseInt(b.id, 10);
        return (isNaN(parsedA) ? 999999 : parsedA) - (isNaN(parsedB) ? 999999 : parsedB);
      });

    // ----------------------------------------------------
    // SHEET 1: สรุปเวร
    // ----------------------------------------------------
    const ws1 = workbook.addWorksheet('สรุปเวร', {
      pageSetup: {
        orientation: 'landscape',
        paperSize: 9, // A4
        scale: 82,
        margins: {
          left: 0.25,
          right: 0.25,
          top: 0.75,
          bottom: 0.75,
          header: 0.3,
          footer: 0.3
        }
      },
      views: [{ showGridLines: true, zoomScale: 115 }]
    });

    // Column widths
    ws1.getColumn(1).width = 3.8867; // A
    ws1.getColumn(2).width = 24.0;    // B
    ws1.getColumn(3).width = 24.0;    // C
    for (let col = 4; col <= 34; col++) {
      ws1.getColumn(col).width = 2.7773; // D:AH
    }
    ws1.getColumn(35).width = 5.7773; // AI (Oncall)
    ws1.getColumn(36).width = 4.7773; // AJ (เช้า)
    ws1.getColumn(37).width = 4.7773; // AK (บ่าย)
    ws1.getColumn(38).width = 8.0;      // AL

    // Row heights S1
    for (let r = 1; r <= 22; r++) {
      const row = ws1.getRow(r);
      if (r === 1 || r === 2) row.height = 27;
      else if (r === 4) row.height = 24;
      else if (r === 5) row.height = 21.75;
      else if (r >= 6 && r <= 14) row.height = 24;
      else if (r >= 15 && r <= 17) row.height = 21.75;
      else if (r >= 18 && r <= 20) row.height = 24;
      else if (r >= 21) row.height = 21.75;
    }

    // Merges
    ws1.mergeCells('A1:AL1');
    ws1.mergeCells('A2:AL2');
    ws1.mergeCells('A4:AL4');
    ws1.mergeCells('L18:N18');
    ws1.mergeCells('O18:AD18');
    ws1.mergeCells('O19:AD19');
    ws1.mergeCells('O20:AD20');

    // Values & styles
    const cellA1 = ws1.getCell('A1');
    cellA1.value = 'หลักฐานการเบิกจ่ายเงินค่าตอบแทนการปฏิบัติงานนอกเวลาราชการและในวันหยุดราชการ ฝ่ายเภสัชกรรม';
    cellA1.font = font18Bold;
    cellA1.alignment = { horizontal: 'center', vertical: 'middle' };

    const cellA2 = ws1.getCell('A2');
    cellA2.value = `ส่วนราชการ ${hospitalName} ${deptName} ประจำเดือน ${thaiMonthYear}`;
    cellA2.font = font18Bold;
    cellA2.alignment = { horizontal: 'center', vertical: 'middle' };

    const cellA4 = ws1.getCell('A4');
    cellA4.value = 'ผู้จัดตารางเวร...................................................... ผู้อนุมัติตารางเวร ......................................................';
    cellA4.font = font16Normal;
    cellA4.alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 6 Header
    const headersS1 = ['ลำดับ', 'ชื่อ-สกุล', 'ตำแหน่ง'];
    for (let d = 1; d <= 31; d++) headersS1.push(String(d));
    headersS1.push('Oncall', 'เช้า', 'บ่าย');

    const r6 = ws1.getRow(6);
    headersS1.forEach((val, index) => {
      const cell = r6.getCell(index + 1);
      cell.value = val;
      cell.font = font16Bold;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = thinBorder;
    });

    // Populate actual staff rows
    sortedStaff.forEach((employee, index) => {
      const rStaffIdx = 7 + index;
      const row = ws1.getRow(rStaffIdx);

      let oncallShiftsCount = 0;
      let morningShiftsCount = 0;
      let afternoonShiftsCount = 0;

      row.getCell(1).value = index + 1;
      row.getCell(2).value = employee.name;
      row.getCell(3).value = typeLabelMap[employee.type] || employee.type;

      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };

      for (let d = 1; d <= 31; d++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayDuties = monthlyDuties.filter(duty => duty.staffId === employee.id && duty.date === dateKey);

        if (dayDuties.length > 0) {
          const shiftCodes = dayDuties.map(duty => {
            if (duty.shiftId === 'morning') {
              morningShiftsCount++;
              return 'ช';
            }
            if (duty.shiftId === 'afternoon') {
              afternoonShiftsCount++;
              return 'บ';
            }
            if (duty.shiftId === 'special') {
              morningShiftsCount++;
              return 'ช*';
            }
            if (duty.shiftId === 'oncall') {
              oncallShiftsCount++;
              return 'O';
            }
            return '';
          }).filter(Boolean);

          row.getCell(3 + d).value = shiftCodes.join('/');
        }
        row.getCell(3 + d).alignment = { horizontal: 'center', vertical: 'middle' };
      }

      row.getCell(35).value = oncallShiftsCount > 0 ? oncallShiftsCount : '';
      row.getCell(36).value = morningShiftsCount > 0 ? morningShiftsCount : '';
      row.getCell(37).value = afternoonShiftsCount > 0 ? afternoonShiftsCount : '';

      row.getCell(35).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(36).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(37).alignment = { horizontal: 'center', vertical: 'middle' };

      // Formatting
      for (let col = 1; col <= 37; col++) {
        const cell = row.getCell(col);
        cell.font = font16Normal;
        cell.border = thinBorder;
      }
    });

    // Notes at the bottom S1 (absolute cells 18 to 22)
    ws1.getCell('L18').value = 'หมายเหตุ';
    ws1.getCell('L18').font = font16Bold;
    ws1.getCell('L18').alignment = { horizontal: 'center', vertical: 'middle' };

    ws1.getCell('O18').value = 'บ คือ เวรบ่าย ตั้งแต่เวลา 16.30 น.- 20.00 น.';
    ws1.getCell('O18').font = font16Normal;
    ws1.getCell('O18').alignment = { horizontal: 'left', vertical: 'middle' };

    ws1.getCell('O19').value = 'O=เวรปฏิบัติงานนอกเวลาราชการรายชั่วโมง';
    ws1.getCell('O19').font = font16Normal;
    ws1.getCell('O19').alignment = { horizontal: 'left', vertical: 'middle' };

    ws1.getCell('O20').value = 'ช* = เวรพิเศษเช้า 8.30 - 12.00 น.';
    ws1.getCell('O20').font = font16Normal;
    ws1.getCell('O20').alignment = { horizontal: 'left', vertical: 'middle' };


    // ----------------------------------------------------
    // SHEET 2: ค่าตอบแทน
    // ----------------------------------------------------
    const ws2 = workbook.addWorksheet('ค่าตอบแทน', {
      pageSetup: {
        orientation: 'landscape',
        paperSize: 9, // A4
        scale: 63,
        margins: {
          left: 0.25,
          right: 0.25,
          top: 0.75,
          bottom: 0.75,
          header: 0.3,
          footer: 0.3
        }
      },
      views: [{ showGridLines: true, zoomScale: 115 }]
    });

    // Calculate which shifts actually have any duties for visible staff
    let morningTotalCount = 0;
    let afternoonTotalCount = 0;
    let specialTotalCount = 0;
    let oncallTotalHours = 0;

    sortedStaff.forEach(employee => {
      for (let d = 1; d <= 31; d++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayDuties = monthlyDuties.filter(duty => duty.staffId === employee.id && duty.date === dateKey);
        dayDuties.forEach(duty => {
          if (duty.shiftId === 'morning') morningTotalCount++;
          if (duty.shiftId === 'afternoon') afternoonTotalCount++;
          if (duty.shiftId === 'special') specialTotalCount++;
          if (duty.shiftId === 'oncall') {
            oncallTotalHours += calculateDutyHoursByShift(duty);
          }
        });
      }
    });

    // Column widths
    ws2.getColumn(1).width = 4.3320; // A
    ws2.getColumn(2).width = 24.0;    // B
    ws2.getColumn(3).width = 24.0;    // C
    for (let c = 4; c <= 34; c++) {
      ws2.getColumn(c).width = 2.7773; // D:AH
    }

    // AI & AJ: Oncall
    if (oncallTotalHours === 0) {
      ws2.getColumn(35).width = 0.1094;
      ws2.getColumn(35).hidden = true;
      ws2.getColumn(36).width = 0.1094;
      ws2.getColumn(36).hidden = true;
    } else {
      ws2.getColumn(35).width = 4.5;   // AI (Oncall ชม.)
      ws2.getColumn(36).width = 11.0;  // AJ (Oncall อัตรา)
    }

    // AK & AL: เข้า
    if (morningTotalCount === 0) {
      ws2.getColumn(37).width = 0.1094;
      ws2.getColumn(37).hidden = true;
      ws2.getColumn(38).width = 0.1094;
      ws2.getColumn(38).hidden = true;
    } else {
      ws2.getColumn(37).width = 4.5;   // AK (เข้า วัน)
      ws2.getColumn(38).width = 10.0;  // AL (เข้า อัตรา)
    }

    // AM & AN: เข้า*
    if (specialTotalCount === 0) {
      ws2.getColumn(39).width = 0.1094;
      ws2.getColumn(39).hidden = true;
      ws2.getColumn(40).width = 0.1094;
      ws2.getColumn(40).hidden = true;
    } else {
      ws2.getColumn(39).width = 5.0;   // AM (เข้า* วัน)
      ws2.getColumn(40).width = 10.0;  // AN (เข้า* อัตรา)
    }

    // AO & AP: บ่าย
    if (afternoonTotalCount === 0) {
      ws2.getColumn(41).width = 0.1094;
      ws2.getColumn(41).hidden = true;
      ws2.getColumn(42).width = 0.1094;
      ws2.getColumn(42).hidden = true;
    } else {
      ws2.getColumn(41).width = 4.5;   // AO (บ่าย วัน)
      ws2.getColumn(42).width = 10.0;  // AP (บ่าย อัตรา)
    }

    ws2.getColumn(43).width = 0.1094;
    ws2.getColumn(43).hidden = true;
    ws2.getColumn(44).width = 0.1094;
    ws2.getColumn(44).hidden = true;

    ws2.getColumn(45).width = 14.0;  // AS (รวม)
    ws2.getColumn(46).width = 16.0;  // AT (ลายมือชื่อ)

    // Row heights ws2
    ws2.getRow(1).height = 27;
    ws2.getRow(2).height = 27;
    ws2.getRow(3).height = 15; // Gap row
    ws2.getRow(4).height = 24.75; // Table header top
    ws2.getRow(5).height = 24; // Table header bottom

    // Dynamically set heights of rows starting at 6
    const startBodyRow = 6;
    for (let r = startBodyRow; r <= startBodyRow + sortedStaff.length + 15; r++) {
      ws2.getRow(r).height = 24;
    }

    // Merges for titles
    ws2.mergeCells('A1:AT1');
    ws2.mergeCells('A2:AT2');

    // Merge table headers
    ws2.mergeCells('A4:A5');
    ws2.mergeCells('B4:B5');
    ws2.mergeCells('C4:C5');
    ws2.mergeCells('D4:AH4');
    ws2.mergeCells('AI4:AJ4');
    ws2.mergeCells('AK4:AL4');
    ws2.mergeCells('AM4:AN4');
    ws2.mergeCells('AO4:AP4');
    ws2.mergeCells('AS4:AS5');
    ws2.mergeCells('AT4:AT5');

    ws2.getCell('A1').value = 'หลักฐานการเบิกจ่ายเงินค่าตอบแทนการปฏิบัติงานนอกเวลาราชการและในวันหยุดราชการ ฝ่ายเภสัชกรรม';
    ws2.getCell('A1').font = font18Bold;
    ws2.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

    ws2.getCell('A2').value = `ส่วนราชการ ${hospitalName} ฝ่าย/กลุ่มงาน ${currentDeptName} ประจำเดือน ${thaiMonthYear}`;
    ws2.getCell('A2').font = font18Bold;
    ws2.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

    ws2.getCell('A4').value = 'ลำดับ';
    ws2.getCell('B4').value = 'ชื่อ-สกุล';
    ws2.getCell('C4').value = 'ตำแหน่ง';
    ws2.getCell('D4').value = 'วันที่ปฏิบัติงานนอกเวลาราชการ';

    ws2.getCell('AI4').value = 'Oncall';
    ws2.getCell('AK4').value = 'เข้า';
    ws2.getCell('AM4').value = 'เข้า*';
    ws2.getCell('AO4').value = 'บ่าย';

    ws2.getCell('AS4').value = 'รวม';
    ws2.getCell('AT4').value = 'ลายมือชื่อ';

    for (let d = 1; d <= 31; d++) {
      ws2.getCell(5, 3 + d).value = d;
    }

    ws2.getCell('AI5').value = 'ชม.';
    ws2.getCell('AJ5').value = 'อัตรา';

    ws2.getCell('AK5').value = 'วัน';
    ws2.getCell('AL5').value = 'อัตรา';

    ws2.getCell('AM5').value = 'วัน';
    ws2.getCell('AN5').value = 'อัตรา';

    ws2.getCell('AO5').value = 'วัน';
    ws2.getCell('AP5').value = 'อัตรา';

    for (let r = 4; r <= 5; r++) {
      for (let c = 1; c <= 46; c++) {
        if (c >= 43 && c <= 44) continue;
        const cell = ws2.getCell(r, c);
        cell.font = font14Bold;
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = thinBorder;
      }
    }

    let totalOncallHoursSum = 0;
    let totalOncallPayoutSum = 0;
    let totalMorningDaysSum = 0;
    let totalMorningPayoutSum = 0;
    let totalSpecialDaysSum = 0;
    let totalSpecialPayoutSum = 0;
    let totalAfternoonDaysSum = 0;
    let totalAfternoonPayoutSum = 0;
    let grandTotalSum = 0;

    // Body rows
    sortedStaff.forEach((employee, index) => {
      const rIdx = startBodyRow + index;
      const row = ws2.getRow(rIdx);

      row.getCell(1).value = index + 1;
      row.getCell(2).value = employee.name;
      row.getCell(3).value = typeLabelMap[employee.type] || employee.type;

      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };

      const employeeHourlyRate = settings.shiftRates[employee.type] || 0;
      let ownOncallHours = 0;
      let ownMorningCount = 0;
      let ownSpecialCount = 0;
      let ownAfternoonCount = 0;

      let ownOncallAmount = 0;
      let ownMorningAmount = 0;
      let ownSpecialAmount = 0;
      let ownAfternoonAmount = 0;

      for (let d = 1; d <= 31; d++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayDuties = monthlyDuties.filter(duty => duty.staffId === employee.id && duty.date === dateKey);

        if (dayDuties.length > 0) {
          const shiftCodes = dayDuties.map(duty => {
            if (duty.shiftId === 'morning') {
              ownMorningCount++;
              ownMorningAmount += 8 * employeeHourlyRate;
              return 'ช';
            }
            if (duty.shiftId === 'afternoon') {
              ownAfternoonCount++;
              ownAfternoonAmount += 4 * employeeHourlyRate;
              return 'บ';
            }
            if (duty.shiftId === 'special') {
              ownSpecialCount++;
              ownSpecialAmount += 3.5 * employeeHourlyRate;
              return 'ช*';
            }
            if (duty.shiftId === 'oncall') {
              const hrs = calculateDutyHoursByShift(duty);
              ownOncallHours += hrs;
              const pharmacistOncallRate = settings.shiftRates.pharmacist || 97.5;
              ownOncallAmount += hrs * pharmacistOncallRate;
              return 'O';
            }
            return '';
          }).filter(Boolean);

          row.getCell(3 + d).value = shiftCodes.join('/');
        }
        row.getCell(3 + d).alignment = { horizontal: 'center', vertical: 'middle' };
      }

      const ownTotal = ownOncallAmount + ownMorningAmount + ownSpecialAmount + ownAfternoonAmount;

      const pharmacistOncallRate = settings.shiftRates.pharmacist || 97.5;
      row.getCell(35).value = ownOncallHours > 0 ? ownOncallHours : '';
      row.getCell(36).value = ownOncallHours > 0 ? pharmacistOncallRate : ''; // AJ
      row.getCell(37).value = ownMorningCount > 0 ? ownMorningCount : ''; // AK
      row.getCell(38).value = ownMorningCount > 0 ? (8 * employeeHourlyRate) : ''; // AL
      row.getCell(39).value = ownSpecialCount > 0 ? ownSpecialCount : '';  // AM
      row.getCell(40).value = ownSpecialCount > 0 ? (3.5 * employeeHourlyRate) : ''; // AN
      row.getCell(41).value = ownAfternoonCount > 0 ? ownAfternoonCount : ''; // AO
      row.getCell(42).value = ownAfternoonCount > 0 ? (4 * employeeHourlyRate) : ''; // AP

      row.getCell(45).value = ownTotal > 0 ? ownTotal : ''; // AS
      row.getCell(46).value = employee.signature ? 'ลงชื่อผ่านระบบดิจิทัล' : ''; // AT

      for (let sC = 35; sC <= 46; sC++) {
        if (sC >= 43 && sC <= 44) continue;
        if (sC === 46) {
          row.getCell(sC).alignment = { horizontal: 'left', vertical: 'middle' };
        } else {
          row.getCell(sC).alignment = { horizontal: 'center', vertical: 'middle' };
        }
      }

      for (let c = 1; c <= 46; c++) {
        if (c >= 43 && c <= 44) continue;
        const cell = row.getCell(c);
        cell.font = font14Normal;
        cell.border = thinBorder;
        if (c === 36 || c === 38 || c === 40 || c === 42) {
          if (typeof cell.value === 'number') {
            // Rates are usually integers, so we format without decimals if they are whole numbers
            cell.numFmt = Number.isInteger(cell.value) ? '#,##0' : '#,##0.00';
          }
        } else if (c === 45) {
          if (typeof cell.value === 'number') {
            cell.numFmt = '#,##0.00';
          }
        }
      }

      totalOncallHoursSum += ownOncallHours;
      totalOncallPayoutSum += ownOncallAmount;
      totalMorningDaysSum += ownMorningCount;
      totalMorningPayoutSum += ownMorningAmount;
      totalSpecialDaysSum += ownSpecialCount;
      totalSpecialPayoutSum += ownSpecialAmount;
      totalAfternoonDaysSum += ownAfternoonCount;
      totalAfternoonPayoutSum += ownAfternoonAmount;
      grandTotalSum += ownTotal;
    });

    // Totals row (totalsRowIdx)
    const totalsRowIdx = startBodyRow + sortedStaff.length;
    ws2.mergeCells(`AG${totalsRowIdx}:AH${totalsRowIdx}`);
    ws2.getCell(`AG${totalsRowIdx}`).value = 'รวม';
    ws2.getCell(`AG${totalsRowIdx}`).font = font14Bold;
    ws2.getCell(`AG${totalsRowIdx}`).alignment = { horizontal: 'center', vertical: 'middle' };

    ws2.getCell(`AI${totalsRowIdx}`).value = totalOncallHoursSum > 0 ? totalOncallHoursSum : '';
    ws2.getCell(`AJ${totalsRowIdx}`).value = '';
    ws2.getCell(`AK${totalsRowIdx}`).value = totalMorningDaysSum > 0 ? totalMorningDaysSum : '';
    ws2.getCell(`AL${totalsRowIdx}`).value = '';
    ws2.getCell(`AM${totalsRowIdx}`).value = totalSpecialDaysSum > 0 ? totalSpecialDaysSum : '';
    ws2.getCell(`AN${totalsRowIdx}`).value = '';
    ws2.getCell(`AO${totalsRowIdx}`).value = totalAfternoonDaysSum > 0 ? totalAfternoonDaysSum : '';
    ws2.getCell(`AP${totalsRowIdx}`).value = '';
    ws2.getCell(`AS${totalsRowIdx}`).value = grandTotalSum > 0 ? grandTotalSum : '';
    ws2.getCell(`AT${totalsRowIdx}`).value = '';

    const totalsRow = ws2.getRow(totalsRowIdx);
    for (let c = 1; c <= 46; c++) {
      if (c >= 43 && c <= 44) continue;
      const cell = totalsRow.getCell(c);
      cell.font = font14Bold;
      cell.border = thinBorder;
      if (c >= 35 && c <= 45) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
      if (c === 36 || c === 38 || c === 40 || c === 42 || c === 45) {
        if (typeof cell.value === 'number') {
          cell.numFmt = '#,##0.00';
        }
      }
    }

    // Grand total words row
    const wordsRowIdx = totalsRowIdx + 2;
    ws2.mergeCells(`F${wordsRowIdx}:O${wordsRowIdx}`);
    ws2.mergeCells(`P${wordsRowIdx}:Z${wordsRowIdx}`);

    ws2.getCell(`F${wordsRowIdx}`).value = 'รวมเงินจ่ายทั้งสิ้น ( ตัวอักษร )';
    ws2.getCell(`F${wordsRowIdx}`).font = font14Bold;
    ws2.getCell(`F${wordsRowIdx}`).alignment = { horizontal: 'right', vertical: 'middle' };

    ws2.getCell(`P${wordsRowIdx}`).value = thaiBahtText(grandTotalSum);
    ws2.getCell(`P${wordsRowIdx}`).font = font14Bold;
    ws2.getCell(`P${wordsRowIdx}`).alignment = { horizontal: 'left', vertical: 'middle' };

    // Signatures
    const sigRow1 = totalsRowIdx + 5;
    const sigRow2 = totalsRowIdx + 6;
    const sigRow3 = totalsRowIdx + 7;
    const sigRow4 = totalsRowIdx + 8;

    ws2.mergeCells(`C${sigRow1}:K${sigRow1}`);
    ws2.mergeCells(`C${sigRow2}:L${sigRow2}`);
    ws2.mergeCells(`C${sigRow3}:H${sigRow3}`);
    ws2.mergeCells(`C${sigRow4}:H${sigRow4}`);

    ws2.getCell(`C${sigRow1}`).value = 'ขอรับรองว่าผู้มีรายชื่อข้างต้นปฏิบัติงานจริงและถูกต้องตามระเบียบ';
    ws2.getCell(`C${sigRow1}`).font = font14Normal;
    ws2.getCell(`C${sigRow1}`).alignment = { horizontal: 'left', vertical: 'middle' };

    ws2.getCell(`C${sigRow2}`).value = 'ลงชื่อ....................................................ผู้รับรองการปฏิบัติงาน';
    ws2.getCell('C' + sigRow2).font = font14Normal;
    ws2.getCell('C' + sigRow2).alignment = { horizontal: 'left', vertical: 'middle' };

    const bossNameStr = settings.hospitalInfo?.bossName || 'นายดิถี เหลืองธนะโภค';
    ws2.getCell('C' + sigRow3).value = `(${bossNameStr})`;
    ws2.getCell('C' + sigRow3).font = font14Normal;
    ws2.getCell('C' + sigRow3).alignment = { horizontal: 'left', vertical: 'middle' };

    ws2.getCell('C' + sigRow4).value = `ตำแหน่ง ${settings.hospitalInfo?.bossTitle || 'หัวหน้าฝ่ายเภสัชกรรม'}`;
    ws2.getCell('C' + sigRow4).font = font14Normal;
    ws2.getCell('C' + sigRow4).alignment = { horizontal: 'left', vertical: 'middle' };

    // Right reviewer (payer)
    ws2.mergeCells(`Q${sigRow2}:AF${sigRow2}`);
    ws2.getCell(`Q${sigRow2}`).value = 'ลงชื่อ....................................................ผู้จ่ายเงิน';
    ws2.getCell(`Q${sigRow2}`).font = font14Normal;
    ws2.getCell(`Q${sigRow2}`).alignment = { horizontal: 'left', vertical: 'middle' };

    // Adjust the signature height dynamically for boss name row
    ws2.getRow(sigRow3).height = 24.75;

    // Notes
    const notesStartRowIdx = totalsRowIdx + 9;
    let currentNoteRow = notesStartRowIdx;

    if (afternoonTotalCount > 0) {
      ws2.mergeCells(`Q${currentNoteRow}:AF${currentNoteRow}`);
      ws2.getCell(`Q${currentNoteRow}`).value = 'หมายเหตุ บ คือ เวรบ่าย ตั้งแต่เวลา 16.30 น.- 20.00 น.';
      ws2.getCell(`Q${currentNoteRow}`).font = font14Normal;
      ws2.getCell(`Q${currentNoteRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
      currentNoteRow++;
    }

    if (oncallTotalHours > 0) {
      ws2.mergeCells(`Q${currentNoteRow}:AF${currentNoteRow}`);
      ws2.getCell(`Q${currentNoteRow}`).value = 'O=เวรปฏิบัติงานนอกเวลาราชการรายชั่วโมง';
      ws2.getCell(`Q${currentNoteRow}`).font = font14Normal;
      ws2.getCell(`Q${currentNoteRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
      currentNoteRow++;
    }

    if (specialTotalCount > 0) {
      ws2.mergeCells(`Q${currentNoteRow}:AF${currentNoteRow}`);
      ws2.getCell(`Q${currentNoteRow}`).value = 'ช* = เวรพิเศษเช้า 8.30 - 12.00 น.';
      ws2.getCell(`Q${currentNoteRow}`).font = font14Normal;
      ws2.getCell(`Q${currentNoteRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
      currentNoteRow++;
    }


    // ----------------------------------------------------
    // SHEET 3: ลงเวลาปฏิบัติงาน
    // ----------------------------------------------------
    const ws3 = workbook.addWorksheet('ลงเวลาปฏิบัติงาน', {
      pageSetup: {
        orientation: 'portrait',
        paperSize: 9, // A4
        scale: 69,
        margins: {
          left: 0.75,
          right: 0.75,
          top: 1.0,
          bottom: 1.0,
          header: 0.5,
          footer: 0.5
        }
      },
      views: [{ showGridLines: true, zoomScale: 115 }]
    });

    // Column widths
    ws3.getColumn(1).width = 8.7773;  // A
    ws3.getColumn(2).width = 5.7773;  // B
    ws3.getColumn(3).width = 18.5547; // C
    ws3.getColumn(4).width = 15.7773; // D
    ws3.getColumn(5).width = 12.7773; // E
    ws3.getColumn(6).width = 15.7773; // F
    ws3.getColumn(7).width = 12.7773; // G
    ws3.getColumn(8).width = 15.1094; // H

    // Header heights & title formatting
    ws3.getRow(1).height = 27;
    ws3.getRow(2).height = 27;
    ws3.getRow(3).height = 27;
    ws3.getRow(4).height = 24; // spacer

    ws3.mergeCells('A1:H1');
    ws3.mergeCells('A2:H2');
    ws3.mergeCells('A3:H3');

    ws3.getCell('A1').value = 'บัญชีลงเวลาปฏิบัติงานล่วงเวลา';
    ws3.getCell('A1').font = font18Bold;
    ws3.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

    ws3.getCell('A2').value = 'งานที่ปฏิบัติ ปฏิบัติงานนอกเวลาราชการและในวันหยุดราชการ';
    ws3.getCell('A2').font = font18Bold;
    ws3.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

    ws3.getCell('A3').value = `ประจำเดือน ${thaiMonthYear}`;
    ws3.getCell('A3').font = font18Bold;
    ws3.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };

    // Subheader row 5
    const headersS3 = ['วันที่', 'ลำดับ', 'ชื่อ-สกุล', 'ลายเซ็นต์', 'เวลามา', 'ลายเซ็นต์', 'เวลากลับ', 'ผู้ควบคุมการปฏิบัติ'];
    const r5S3 = ws3.getRow(5);
    r5S3.height = 24;
    headersS3.forEach((val, idx) => {
      const cell = r5S3.getCell(idx + 1);
      cell.value = val;
      cell.font = font16Bold;
      cell.border = thinBorder;
      if (idx === 2) {
        cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      } else {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });

    const thaiShortMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    let s3RowIdx = 6;
    for (let d = 1; d <= 31; d++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayDuties = monthlyDuties.filter(duty => duty.date === dateKey);

      if (dayDuties.length === 0) continue;

      const daySortedDuties = [...dayDuties].sort((a, b) => a.staffId.localeCompare(b.staffId));
      const N = daySortedDuties.length;
      // Default to minimum 2 rows/day, but expand if there are more than 2 duties.
      const numRows = Math.max(2, N);

      const shortYear = (year + 543) % 100;
      const dateLabel = `${d} ${thaiShortMonths[month]} ${shortYear}`;

      ws3.getCell(s3RowIdx, 1).value = dateLabel;

      if (numRows > 1) {
        ws3.mergeCells(s3RowIdx, 1, s3RowIdx + numRows - 1, 1);
      }

      for (let dIdx = 0; dIdx < numRows; dIdx++) {
        const curRowIdx = s3RowIdx + dIdx;
        const row = ws3.getRow(curRowIdx);
        row.height = 24;

        if (dIdx < N) {
          const duty = daySortedDuties[dIdx];
          const employee = visibleStaff.find(s => s.id === duty.staffId);
          const nameText = employee ? employee.name : '';

          let timeInStr = '';
          let timeOutStr = '';

          if (duty.shiftId === 'morning') {
            timeInStr = '08.30 น.';
            timeOutStr = '16.30 น.';
          } else if (duty.shiftId === 'afternoon') {
            timeInStr = '16.30 น.';
            timeOutStr = '20.00 น.';
          } else if (duty.shiftId === 'special') {
            timeInStr = formatTimeThai(duty.specialStartTime, '08:30');
            timeOutStr = formatTimeThai(duty.specialEndTime, '12:00');
          } else if (duty.shiftId === 'oncall') {
            timeInStr = formatTimeThai(duty.oncallStartTime, '16:30');
            timeOutStr = formatTimeThai(duty.oncallEndTime, '08:30');
          }

          row.getCell(2).value = dIdx + 1;
          row.getCell(3).value = nameText;
          row.getCell(4).value = '';
          row.getCell(5).value = timeInStr;
          row.getCell(6).value = '';
          row.getCell(7).value = timeOutStr;
          row.getCell(8).value = '';
        } else {
          // Fallback row(s) to guarantee minimum 2 rows per day
          row.getCell(2).value = dIdx + 1;
          row.getCell(3).value = '';
          row.getCell(4).value = '';
          row.getCell(5).value = '';
          row.getCell(6).value = '';
          row.getCell(7).value = '';
          row.getCell(8).value = '';
        }

        row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
        row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };

        for (let col = 1; col <= 8; col++) {
          const cell = row.getCell(col);
          cell.font = font16Normal;
          cell.border = thinBorder;
        }
      }

      s3RowIdx += numRows;

      ws3.getRow(s3RowIdx).height = 24;
      ws3.mergeCells(s3RowIdx, 1, s3RowIdx, 8);

      const spacerRow = ws3.getRow(s3RowIdx);
      for (let col = 1; col <= 8; col++) {
        spacerRow.getCell(col).border = thinBorder;
      }

      s3RowIdx++;
    }

    // Write buffer & save
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ใบเบิกค่าตอบแทนเวร_${currentDeptName}_${thaiMonthYear}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Staff summary computation
  const summaryList = visibleStaff.map((employee) => {
    const employeeDuties = monthlyDuties.filter((d) => d.staffId === employee.id);
    const morningCount = employeeDuties.filter((d) => d.shiftId === 'morning').length;
    const afternoonCount = employeeDuties.filter((d) => d.shiftId === 'afternoon').length;
    const specialCount = employeeDuties.filter((d) => d.shiftId === 'special').length;

    // Calculate total layout hours for oncall duties
    let oncallHours = 0;
    employeeDuties
      .filter((d) => d.shiftId === 'oncall')
      .forEach((d) => {
        oncallHours += calculateDutyHoursByShift(d);
      });

    // Payout calculation
    const rate = settings.shiftRates[employee.type] || 0;
    const oncallRate = settings.shiftRates.pharmacist || rate; // oncall uses pharmacist base rate per instructions

    let totalAmount = 0;
    employeeDuties.forEach((duty) => {
      const multiplier = getDutyMultiplier(duty.date);
      if (duty.shiftId === 'morning') {
        totalAmount += rate * 8 * multiplier;
      } else if (duty.shiftId === 'afternoon') {
        totalAmount += rate * 4 * multiplier;
      } else if (duty.shiftId === 'oncall') {
        const hours = calculateDutyHoursByShift(duty);
        totalAmount += hours * oncallRate * multiplier;
      } else if (duty.shiftId === 'special') {
        const hours = calculateDutyHoursByShift(duty);
        totalAmount += hours * rate * multiplier;
      }
    });

    return {
      staff: employee,
      morningCount,
      afternoonCount,
      specialCount,
      oncallHours,
      totalAmount
    };
  });

  // Calculate cumulative net payout
  const totalAmountSum = summaryList.reduce((sum, item) => sum + item.totalAmount, 0);

  // Dynamic Special shift times legend
  const morningSpecialSet = new Set<string>();
  const afternoonSpecialSet = new Set<string>();

  monthlyDuties
    .filter((d) => d.shiftId === 'special')
    .forEach((d) => {
      const start = d.specialStartTime || '';
      const end = d.specialEndTime || '';
      if (!start || !end) return;

      const formatted = `${start.replace(':', '.')}-${end.replace(':', '.')} น.`;
      const [sh] = start.split(':').map(Number);

      if (sh < 12) {
        morningSpecialSet.add(formatted);
      } else {
        afternoonSpecialSet.add(formatted);
      }
    });

  const specialLegends: string[] = [];
  if (morningSpecialSet.size > 0) {
    specialLegends.push(`ช* = เวรพิเศษเช้า ${Array.from(morningSpecialSet).join(', ')}`);
  }
  if (afternoonSpecialSet.size > 0) {
    specialLegends.push(`บ* = เวรพิเศษบ่าย ${Array.from(afternoonSpecialSet).join(', ')}`);
  }

  const staffSortKey = (employee: Staff) => {
    const parsedId = parseInt(employee.id, 10);
    return isNaN(parsedId) ? 999999 : parsedId;
  };

  const sortedSummaryList = [...summaryList].sort((a, b) => {
    return staffSortKey(a.staff) - staffSortKey(b.staff);
  });

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Title Header toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs no-print">
        <div>
          <h2 className="text-lg font-bold text-slate-800 font-display">สรุปเบิกจ่ายค่ากะงานเวร</h2>
          <p className="text-xs text-slate-500 mt-0.5">รายงานแจกแจงชั่วโมงผลงานและยอดรวมเงินค่าตอบแทนของบุคลากรรายบุคคล ประจำเดือนปัจจุบัน</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportToExcel}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl hover:shadow-xs transition active:scale-97 cursor-pointer"
          >
            <FileSpreadsheet size={14} />
            ส่งออกสรุป Excel (CSV)
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            <Printer size={14} />
            พิมพ์รายงานการเบิกเงิน
          </button>
        </div>
      </div>

      {/* Cumulative payout Card */}
      <div className="p-5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-3xl shadow-sm flex justify-between items-center gap-4 no-print select-none">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
            <DollarSign size={24} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-blue-100 font-semibold uppercase tracking-wider">งบเบิกจ่ายผลรวมเวรทั้งหมด</span>
            <span className="text-2xl font-bold mt-0.5">
              {totalAmountSum.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
            </span>
          </div>
        </div>
        <div className="text-right text-xs text-blue-100/80 font-medium">
          ฝ่ายกลุ่มงาน: {settings.hospitalInfo?.departmentName} <br />
          โรงพยาบาลปาย
        </div>
      </div>

      {/* Main Table layout */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {/* Printable Title Block */}
        <div className="hidden print-only text-center py-5 border-b border-slate-100">
          <h2 className="text-2xl font-bold text-slate-900">{settings.hospitalInfo?.hospitalName}</h2>
          <h3 className="text-lg font-semibold text-slate-700 mt-1">รายงานสรุปหลักฐานเบิกจ่ายเงินตอบแทนการปฏิบัติงานเวรนอกเวลาราชการ</h3>
          <p className="text-sm font-semibold text-slate-400 mt-0.5">ประจำกะเดือน {getThaiMonthYear(year, month)} (หน่วยงาน: {settings.departments.find(d => d.id === selectedDeptId)?.name})</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase">ลำดับ</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase">บทบาท / ชื่อนามสกุล</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase">ตำแหน่งวิชาชีพ</th>
                <th className="px-5 py-3.5 text-center text-xs font-bold text-slate-500 uppercase">เรท/ชม.</th>
                <th className="px-5 py-3.5 text-center text-xs font-bold text-slate-500 uppercase">เวรเช้า (8 ชม.)</th>
                <th className="px-5 py-3.5 text-center text-xs font-bold text-slate-500 uppercase">เวรบ่าย (4 ชม.)</th>
                <th className="px-5 py-3.5 text-center text-xs font-bold text-slate-500 uppercase">เวรพิเศษ (ชม.)</th>
                <th className="px-5 py-3.5 text-center text-xs font-bold text-slate-500 uppercase">Oncall (ชม.)</th>
                <th className="px-5 py-3.5 text-center text-xs font-bold text-slate-500 uppercase">ลายมือชื่อ</th>
                <th className="px-5 py-3.5 text-right text-xs font-bold text-slate-500 uppercase">รวมเงินเบิกจ่าย</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
              {sortedSummaryList.map((item, index) => {
                const baseRate = settings.shiftRates[item.staff.type] || 0;
                const typeLabels: Record<string, string> = {
                  pharmacist: 'เภสัชกร',
                  technician: 'จพ. เภสัชกรรม',
                  aide: 'พนักงานห้องยา'
                };

                return (
                  <tr key={item.staff.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-5 py-4 font-bold text-slate-400">{index + 1}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col text-left">
                        <span className="font-bold text-slate-800">{item.staff.name}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">ชื่อเล่น: {item.staff.nickname}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">{typeLabels[item.staff.type] || item.staff.type}</td>
                    <td className="px-5 py-4 text-center font-bold text-slate-600">{baseRate.toFixed(2)} ฿</td>
                    <td className="px-5 py-4 text-center font-bold">{item.morningCount} กะ</td>
                    <td className="px-5 py-4 text-center font-bold">{item.afternoonCount} กะ</td>
                    <td className="px-5 py-4 text-center font-bold">{item.specialCount} กะ</td>
                    <td className="px-5 py-4 text-center font-bold text-slate-600">{item.oncallHours.toFixed(1)} ชม.</td>
                    <td className="px-5 py-4 text-center">
                      {item.staff.signature ? (
                        <div className="flex justify-center items-center">
                          <img
                            src={item.staff.signature}
                            alt="ลายเซ็น"
                            className="max-h-7 max-w-20 object-contain mix-blend-multiply"
                          />
                        </div>
                      ) : (
                        <span className="text-slate-300 italic text-[10px]">ยังไม่ได้เซ็น</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-slate-900 text-sm">
                      {item.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                    </td>
                  </tr>
                );
              })}
              {/* Grand Total Row */}
              <tr className="bg-slate-50/80 font-bold text-slate-800 border-t-2 border-slate-200">
                <td colSpan={9} className="px-5 py-5 text-left text-sm">ยอดรวมส่งสรุปเบิกจ่ายทั้งกลุ่มงาน:</td>
                <td className="px-5 py-5 text-right text-base text-indigo-700">
                  {totalAmountSum.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Legend notes block */}
        <div className="p-5 bg-slate-50/60 border-t border-slate-100 text-[11px] text-slate-500 font-medium flex flex-col gap-1 text-left select-none">
          <span className="text-xs font-bold text-slate-600 mb-1">หมายเหตุหลักเกณฑ์ประกอบรายงานเวร:</span>
          <div>• บ คือ เวรบ่ายนอกเวลาปฏิบัติงานราชการ ตั้งแต่เวลา 16.30 น. - 20.00 น. (ระยะเวลาเวรละ 4 ชั่วโมง)</div>
          <div>• O คือ เวรปฏิบัติงานนอกเวลาราชการเสริมพิเศษรายชั่วโมง</div>
          {specialLegends.map((legendLine, idx) => (
            <div key={`special-legend-${idx}`}>• {legendLine}</div>
          ))}
          {!specialLegends.length && (
            <div>• ไม่มีเวรพิเศษที่ถูกบันทึกในเดือนนี้</div>
          )}
        </div>

        {/* Dynamic signature lines for reports (Highly aesthetic print asset!) */}
        <div className="hidden print-only mt-16 px-10 grid grid-cols-2 gap-20">
          <div className="flex flex-col items-center justify-center text-center">
            <span className="text-xs font-semibold text-slate-500">ลงชื่อ ............................................................ ผู้รายงานตาราง</span>
            <div className="h-10 my-1 flex items-center justify-center">
              {settings.signatures?.scheduler && (
                <img
                  src={settings.signatures.scheduler}
                  alt="ลายเซ็นผู้รายงานเวร"
                  className="max-h-10 object-contain mix-blend-multiply"
                />
              )}
            </div>
            <span className="text-xs font-bold text-slate-700">ตำแหน่ง เจ้าหน้าที่ผู้รวบรวมปฏิบัติราชการ</span>
          </div>

          <div className="flex flex-col items-center justify-center text-center">
            <span className="text-xs font-semibold text-slate-500">ลงชื่อ ............................................................ ผู้อนุมัติเบิกเงิน</span>
            <div className="h-10 my-1 flex items-center justify-center">
              {settings.signatures?.approver && (
                <img
                  src={settings.signatures.approver}
                  alt="ลายเซ็นผู้อนุมัติเวร"
                  className="max-h-10 object-contain mix-blend-multiply"
                />
              )}
            </div>
            <span className="text-xs font-bold text-slate-700">ตำแหน่ง หัวหน้าฝ่ายกลุ่มงานสาธารณสุข</span>
          </div>
        </div>
      </div>
    </div>
  );
}
