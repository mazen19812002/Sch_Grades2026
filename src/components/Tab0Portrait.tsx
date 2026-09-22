import React from 'react';
import { SheetRowDataTab0, SheetRowDataTabMonth } from '../types.ts';
import {
  calculateAttendanceScore,
  calculateHomeworkTotal,
  calculateAssessmentTotal,
  formatCleanScore,
  normalizeArabicDigits,
} from '../utils/calc.ts';

interface Tab0PortraitProps {
  adminSchool: string;
  teacher: string;
  subject: string;
  year: string;
  term: string;
  currentClass: string;
  pageSize: number;
  tab0Rows: SheetRowDataTab0[];
  onUpdateTab0Row: (index: number, field: 'name' | 'notes', val: string) => void;
  onUpdateStudentNameGlobally: (index: number, val: string) => void;
  tab1Rows: SheetRowDataTabMonth[];
  tab2Rows: SheetRowDataTabMonth[];
  tab1Dates: string[];
  tab2Dates: string[];
  onPasteTable: (
    e: React.ClipboardEvent<HTMLInputElement>,
    rowIdx: number,
    colType: 'name' | 'absence' | 'hw' | 'ass' | 'exam' | 'score',
    subIndex?: number
  ) => void;
  onKeyDownNav: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const Tab0Portrait: React.FC<Tab0PortraitProps> = ({
  adminSchool,
  teacher,
  subject,
  year,
  term,
  currentClass,
  pageSize,
  tab0Rows,
  onUpdateTab0Row,
  onUpdateStudentNameGlobally,
  tab1Rows,
  tab2Rows,
  tab1Dates,
  tab2Dates,
  onPasteTable,
  onKeyDownNav,
}) => {
  const test1Name = term === 'الاول' ? 'اختبار شهر أكتوبر' : 'اختبار شهر مارس';
  const test2Name = term === 'الاول' ? 'اختبار شهر نوفمبر' : 'اختبار شهر أبريل';
  const pageSheetTitle = 'كشف درجات أعمال السنة والتقييم الشهري (المجمل)';

  const activeDays1 = tab1Dates.filter((d) => d && d.trim() !== '').length;
  const activeDays2 = tab2Dates.filter((d) => d && d.trim() !== '').length;

  return (
    <div className="tab-portrait">
      {[0, 1].map((page) => {
        const pageStartSeq = page === 0 ? 1 : pageSize + 1;

        return (
          <div key={page} className="print-page">
            {/* Print Sheet Header */}
            <div className="print-sheet-header">
              <div className="print-header-top">
                <div style={{ textAlign: 'right' }}>
                  <div>
                    <span className="ph-admin-school">{adminSchool}</span>
                  </div>
                  <div>
                    المعلم: <strong><span className="ph-teacher">{teacher}</span></strong> | المادة: <strong><span className="ph-subject">{subject}</span></strong>
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span className="print-title-badge">{pageSheetTitle}</span>
                  <div style={{ fontSize: '9.5px', fontWeight: 700, marginTop: '1px' }}>
                    العام الدراسي: <span className="ph-year">{year}</span> | الفصل الدراسي: <span className="ph-term">{term}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div>
                    فصل: <strong><span className="ph-class">{currentClass}</span></strong>
                  </div>
                  <div style={{ fontSize: '8.5px', color: '#475569' }}>
                    كشف رسمي للتقييم والرصد
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th rowSpan={2} style={{ width: '4%' }}>م</th>
                    <th rowSpan={2} style={{ width: '25%' }}>اسم الطالب</th>
                    <th id="tab0-test1-header">{test1Name}</th>
                    <th id="tab0-test2-header">{test2Name}</th>
                    <th>مجموع الاختبارات</th>
                    <th>متوسط المواظبة والسلوك</th>
                    <th>مجموع الواجب<br />10</th>
                    <th>متوسط التقييمات</th>
                    <th>المجموع</th>
                    <th>الدرجة الأصلية للمادة</th>
                    <th>ملاحظات</th>
                  </tr>
                  <tr>
                    <th>15</th>
                    <th>15</th>
                    <th>30</th>
                    <th>10</th>
                    <th>10</th>
                    <th>20</th>
                    <th>70</th>
                    <th></th>
                    <th></th>
                  </tr>
                </thead>
                <tbody className="page-tbody" data-page={page}>
                  {Array.from({ length: pageSize }, (_, rIdx) => {
                    const globalSeq = pageStartSeq + rIdx;
                    const rowIndex = page * pageSize + rIdx;

                    const r0 = tab0Rows[rowIndex] || { name: '', notes: '' };
                    const r1 = tab1Rows[rowIndex] || { name: '', absence: [], hw: [], ass: [], exam: '' };
                    const r2 = tab2Rows[rowIndex] || { name: '', absence: [], hw: [], ass: [], exam: '' };

                    const studentName = r0.name || r1.name || r2.name || '';

                    // Deduce month 1 values
                    const hasScore1 = r1.exam !== '' || r1.hw.some((h) => h !== '') || r1.ass.some((a) => a !== '');
                    const att1Str = calculateAttendanceScore(studentName, r1.absence || [], activeDays1, hasScore1);
                    const hw1Str = calculateHomeworkTotal(r1.hw || []);
                    const ass1Str = calculateAssessmentTotal(r1.ass || []);
                    const exam1 = r1.exam !== '' ? parseFloat(normalizeArabicDigits(r1.exam)) : null;

                    // Deduce month 2 values
                    const hasScore2 = r2.exam !== '' || r2.hw.some((h) => h !== '') || r2.ass.some((a) => a !== '');
                    const att2Str = calculateAttendanceScore(studentName, r2.absence || [], activeDays2, hasScore2);
                    const hw2Str = calculateHomeworkTotal(r2.hw || []);
                    const ass2Str = calculateAssessmentTotal(r2.ass || []);
                    const exam2 = r2.exam !== '' ? parseFloat(normalizeArabicDigits(r2.exam)) : null;

                    // Tab 0 calculations
                    const test1Score = exam1 !== null ? formatCleanScore(Math.min(15, Math.max(0, exam1))) : '';
                    const test2Score = exam2 !== null ? formatCleanScore(Math.min(15, Math.max(0, exam2))) : '';

                    let totalTests = '';
                    if (exam1 !== null || exam2 !== null) {
                      totalTests = formatCleanScore(Math.min(30, Math.max(0, (exam1 || 0) + (exam2 || 0))));
                    }

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

                    let grandTotal = '';
                    const hasAnyRealScore = totalTests !== '' || avgHw !== '' || avgAss !== '';
                    if (hasAnyRealScore) {
                      const sum =
                        (parseFloat(totalTests) || 0) +
                        (parseFloat(avgAtt) || 0) +
                        (parseFloat(avgHw) || 0) +
                        (parseFloat(avgAss) || 0);
                      grandTotal = formatCleanScore(Math.min(70, Math.max(0, sum)));
                    }

                    return (
                      <tr key={rowIndex}>
                        <td className="row-index">{globalSeq}</td>
                        <td>
                          <input
                            type="text"
                            className="student-name"
                            value={r0.name || ''}
                            onChange={(e) => onUpdateStudentNameGlobally(rowIndex, e.target.value)}
                            onKeyDown={onKeyDownNav}
                            onPaste={(e) => onPasteTable(e, rowIndex, 'name')}
                          />
                        </td>
                        <td className="calc-cell calc-test1">{test1Score}</td>
                        <td className="calc-cell calc-test2">{test2Score}</td>
                        <td className="calc-cell calc-total-tests">{totalTests}</td>
                        <td className="calc-cell calc-attendance">{avgAtt}</td>
                        <td className="calc-cell calc-hw">{avgHw}</td>
                        <td className="calc-cell calc-assessments">{avgAss}</td>
                        <td className="calc-cell grand-total-cell">{grandTotal}</td>
                        <td className="orig-score-cell"></td>
                        <td>
                          <input
                            type="text"
                            className="notes-input"
                            value={r0.notes || ''}
                            onChange={(e) => onUpdateTab0Row(rowIndex, 'notes', e.target.value)}
                            onKeyDown={onKeyDownNav}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Signatures */}
            <div className="signatures-grid">
              <div className="signature-box">
                معلم المادة (د. مازن بدوي):<br /><br />...........................
              </div>
              <div className="signature-box">
                الموجه الفني:<br /><br />...........................
              </div>
              <div className="signature-box">
                مدير المدرسة:<br /><br />...........................
              </div>
            </div>

            {/* Footer Pagination */}
            <div className="page-footer-pagination">
              <span>الصفحة {page + 1} من 2</span>
              <span>كشف تقدير درجات مادة اللغة الإنجليزية - مدرسة الشهيد نجيب محي الشناوي للتعليم الأساسي</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
