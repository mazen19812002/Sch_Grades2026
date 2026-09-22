import * as XLSX from 'xlsx';
import { SheetRowDataTab0, SheetRowDataTabMonth } from '../types.ts';
import {
  calculateAttendanceScore,
  calculateHomeworkTotal,
  calculateAssessmentTotal,
  formatCleanScore,
  normalizeArabicDigits,
} from './calc.ts';

export function exportToExcel(
  currentClass: string,
  term: string,
  tab0Rows: SheetRowDataTab0[],
  tab1Rows: SheetRowDataTabMonth[],
  tab2Rows: SheetRowDataTabMonth[],
  tab1Dates: string[],
  tab2Dates: string[]
) {
  const wb = XLSX.utils.book_new();
  const safeClass = currentClass.replace(/\s+/g, '_');

  const test1Name = term === "الاول" ? "اختبار شهر أكتوبر" : "اختبار شهر مارس";
  const test2Name = term === "الاول" ? "اختبار شهر نوفمبر" : "اختبار شهر أبريل";
  const month1Name = term === "الاول" ? "أكتوبر" : "مارس";
  const month2Name = term === "الاول" ? "نوفمبر" : "أبريل";

  // Tab 0 Data
  const tab0Headers = [
    'م',
    'اسم الطالب',
    `${test1Name} (15)`,
    `${test2Name} (15)`,
    'مجموع الاختبارات (30)',
    'متوسط المواظبة والسلوك (10)',
    'مجموع الواجب (10)',
    'متوسط التقييمات (20)',
    'المجموع (70)',
    'الدرجة الأصلية للمادة',
    'ملاحظات',
  ];

  const maxRows = Math.max(tab0Rows.length, tab1Rows.length, tab2Rows.length, 50);
  const tab0Data: any[][] = [tab0Headers];

  const activeDays1 = tab1Dates.filter((d) => d && d.trim() !== '').length;
  const activeDays2 = tab2Dates.filter((d) => d && d.trim() !== '').length;

  for (let i = 0; i < maxRows; i++) {
    const r0 = tab0Rows[i] || { name: '', notes: '' };
    const r1 = tab1Rows[i] || { name: '', absence: [], hw: [], ass: [], exam: '' };
    const r2 = tab2Rows[i] || { name: '', absence: [], hw: [], ass: [], exam: '' };

    const studentName = r0.name || r1.name || r2.name || '';
    if (!studentName && !r0.notes && (!r1.absence || r1.absence.every(a => !a)) && (!r2.absence || r2.absence.every(a => !a))) {
      // Empty row
      tab0Data.push([i + 1, '', '', '', '', '', '', '', '', '', '']);
      continue;
    }

    // Tab 1 values
    const hasScore1 = r1.exam !== '' || r1.hw.some(h => h !== '') || r1.ass.some(a => a !== '');
    const att1Str = calculateAttendanceScore(studentName, r1.absence || [], activeDays1, hasScore1);
    const hw1Str = calculateHomeworkTotal(r1.hw || []);
    const ass1Str = calculateAssessmentTotal(r1.ass || []);
    const exam1 = r1.exam !== '' ? parseFloat(normalizeArabicDigits(r1.exam)) : null;

    // Tab 2 values
    const hasScore2 = r2.exam !== '' || r2.hw.some(h => h !== '') || r2.ass.some(a => a !== '');
    const att2Str = calculateAttendanceScore(studentName, r2.absence || [], activeDays2, hasScore2);
    const hw2Str = calculateHomeworkTotal(r2.hw || []);
    const ass2Str = calculateAssessmentTotal(r2.ass || []);
    const exam2 = r2.exam !== '' ? parseFloat(normalizeArabicDigits(r2.exam)) : null;

    // Tests
    let totalTests = '';
    if (exam1 !== null || exam2 !== null) {
      totalTests = formatCleanScore((exam1 || 0) + (exam2 || 0));
    }

    // Averages
    const att1 = att1Str !== '' ? parseFloat(att1Str) : null;
    const att2 = att2Str !== '' ? parseFloat(att2Str) : null;
    let avgAtt = '';
    if (att1 !== null && att2 !== null) avgAtt = formatCleanScore((att1 + att2) / 2);
    else if (att1 !== null) avgAtt = formatCleanScore(att1);
    else if (att2 !== null) avgAtt = formatCleanScore(att2);

    const hw1 = hw1Str !== '' ? parseFloat(hw1Str) : null;
    const hw2 = hw2Str !== '' ? parseFloat(hw2Str) : null;
    let avgHw = '';
    if (hw1 !== null && hw2 !== null) avgHw = formatCleanScore((hw1 + hw2) / 2);
    else if (hw1 !== null) avgHw = formatCleanScore(hw1);
    else if (hw2 !== null) avgHw = formatCleanScore(hw2);

    const ass1 = ass1Str !== '' ? parseFloat(ass1Str) : null;
    const ass2 = ass2Str !== '' ? parseFloat(ass2Str) : null;
    let avgAss = '';
    if (ass1 !== null && ass2 !== null) avgAss = formatCleanScore((ass1 + ass2) / 2);
    else if (ass1 !== null) avgAss = formatCleanScore(ass1);
    else if (ass2 !== null) avgAss = formatCleanScore(ass2);

    // Grand total
    let grandTotal = '';
    const hasAnyRealScore = totalTests !== '' || avgHw !== '' || avgAss !== '';
    if (hasAnyRealScore) {
      let sum = (parseFloat(totalTests) || 0) + (parseFloat(avgAtt) || 0) + (parseFloat(avgHw) || 0) + (parseFloat(avgAss) || 0);
      grandTotal = formatCleanScore(Math.min(70, Math.max(0, sum)));
    }

    tab0Data.push([
      i + 1,
      studentName,
      exam1 !== null ? formatCleanScore(exam1) : '',
      exam2 !== null ? formatCleanScore(exam2) : '',
      totalTests,
      avgAtt,
      avgHw,
      avgAss,
      grandTotal,
      '',
      r0.notes || '',
    ]);
  }

  const ws0 = XLSX.utils.aoa_to_sheet(tab0Data);
  XLSX.utils.book_append_sheet(wb, ws0, `النموذج_الأول_${safeClass}`);

  // Month 1 Data
  const generateMonthData = (rows: SheetRowDataTabMonth[], dates: string[], activeDays: number) => {
    const headers = [
      'م',
      'اسم الطالب',
      ...Array.from({ length: 12 }, (_, idx) => dates[idx] || `يوم ${idx + 1}`),
      'مواظبة وسلوك (10)',
      'واجب 1', 'واجب 2', 'واجب 3', 'واجب 4',
      'مجموع الواجب (10)',
      'تقييم 1', 'تقييم 2', 'تقييم 3', 'تقييم 4',
      'مجموع التقييم (20)',
      'اختبار الشهر (15)',
    ];

    const data: any[][] = [headers];
    for (let i = 0; i < maxRows; i++) {
      const r = rows[i] || { name: '', absence: [], hw: [], ass: [], exam: '' };
      const sName = r.name || '';
      const absences = Array.from({ length: 12 }, (_, dIdx) => r.absence?.[dIdx] || '');
      const hw = Array.from({ length: 4 }, (_, hIdx) => r.hw?.[hIdx] || '');
      const ass = Array.from({ length: 4 }, (_, aIdx) => r.ass?.[aIdx] || '');
      const exam = r.exam || '';

      const hasScore = exam !== '' || hw.some(h => h !== '') || ass.some(a => a !== '');
      const att = calculateAttendanceScore(sName, absences, activeDays, hasScore);
      const totalHw = calculateHomeworkTotal(hw);
      const totalAss = calculateAssessmentTotal(ass);

      data.push([
        i + 1,
        sName,
        ...absences,
        att,
        ...hw,
        totalHw,
        ...ass,
        totalAss,
        exam,
      ]);
    }
    return data;
  };

  const ws1 = XLSX.utils.aoa_to_sheet(generateMonthData(tab1Rows, tab1Dates, activeDays1));
  XLSX.utils.book_append_sheet(wb, ws1, `${month1Name}_${safeClass}`);

  const ws2 = XLSX.utils.aoa_to_sheet(generateMonthData(tab2Rows, tab2Dates, activeDays2));
  XLSX.utils.book_append_sheet(wb, ws2, `${month2Name}_${safeClass}`);

  const fileName = `كشوف_درجات_${safeClass}_الترم_${term}.xlsx`;
  XLSX.writeFile(wb, fileName);
  return fileName;
}

export async function parseExcelWorkbook(file: File): Promise<{
  tab0Rows?: SheetRowDataTab0[];
  tab1Rows?: SheetRowDataTabMonth[];
  tab2Rows?: SheetRowDataTabMonth[];
  tab1Dates?: string[];
  tab2Dates?: string[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const result: {
          tab0Rows?: SheetRowDataTab0[];
          tab1Rows?: SheetRowDataTabMonth[];
          tab2Rows?: SheetRowDataTabMonth[];
          tab1Dates?: string[];
          tab2Dates?: string[];
        } = {};

        workbook.SheetNames.forEach((sheetName, sIdx) => {
          if (sIdx > 2) return;
          const worksheet = workbook.Sheets[sheetName];
          const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          if (!json || json.length === 0) return;

          if (sIdx === 0) {
            // Tab 0
            const rows: SheetRowDataTab0[] = [];
            for (let i = 1; i < json.length; i++) {
              const r = json[i] || [];
              rows.push({
                name: r[1] ? String(r[1]).trim() : '',
                notes: r[10] ? String(r[10]).trim() : '',
              });
            }
            result.tab0Rows = rows;
          } else if (sIdx === 1 || sIdx === 2) {
            // Tab 1 or Tab 2
            const headerRow = json[0] || [];
            const dates: string[] = [];
            for (let c = 0; c < 12; c++) {
              const dVal = headerRow[c + 2];
              dates.push(dVal ? String(dVal).trim() : '');
            }

            const rows: SheetRowDataTabMonth[] = [];
            for (let i = 1; i < json.length; i++) {
              const r = json[i] || [];
              const absence: string[] = [];
              for (let a = 0; a < 12; a++) {
                const val = r[a + 2];
                absence.push(val !== undefined && val !== null ? String(val).trim() : '');
              }
              const hw = [
                r[15] !== undefined ? String(r[15]).trim() : '',
                r[16] !== undefined ? String(r[16]).trim() : '',
                r[17] !== undefined ? String(r[17]).trim() : '',
                r[18] !== undefined ? String(r[18]).trim() : '',
              ];
              const ass = [
                r[20] !== undefined ? String(r[20]).trim() : '',
                r[21] !== undefined ? String(r[21]).trim() : '',
                r[22] !== undefined ? String(r[22]).trim() : '',
                r[23] !== undefined ? String(r[23]).trim() : '',
              ];
              const exam = r[25] !== undefined ? String(r[25]).trim() : '';

              rows.push({
                name: r[1] ? String(r[1]).trim() : '',
                absence,
                hw,
                ass,
                exam,
              });
            }

            if (sIdx === 1) {
              result.tab1Dates = dates;
              result.tab1Rows = rows;
            } else {
              result.tab2Dates = dates;
              result.tab2Rows = rows;
            }
          }
        });

        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
