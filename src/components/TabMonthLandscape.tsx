import React, { useRef } from 'react';
import { SheetRowDataTabMonth } from '../types.ts';
import {
  calculateAttendanceScore,
  calculateHomeworkTotal,
  calculateAssessmentTotal,
  getDateLimitsForTab,
  normalizeArabicDigits,
} from '../utils/calc.ts';

interface TabMonthLandscapeProps {
  tabIndex: 1 | 2;
  adminSchool: string;
  teacher: string;
  subject: string;
  year: string;
  term: string;
  currentClass: string;
  pageSize: number;
  dates: string[];
  onDateChange: (colIndex: number, dateVal: string) => void;
  rows: SheetRowDataTabMonth[];
  onUpdateRow: (rowIndex: number, updated: SheetRowDataTabMonth) => void;
  onUpdateStudentNameGlobally: (rowIndex: number, val: string) => void;
  onPasteTable: (
    e: React.ClipboardEvent<HTMLInputElement>,
    rowIndex: number,
    colType: 'name' | 'absence' | 'hw' | 'ass' | 'exam',
    subIndex?: number
  ) => void;
  onKeyDownNav: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  isEditModeUnlocked: boolean;
}

export const TabMonthLandscape: React.FC<TabMonthLandscapeProps> = ({
  tabIndex,
  adminSchool,
  teacher,
  subject,
  year,
  term,
  currentClass,
  pageSize,
  dates,
  onDateChange,
  rows,
  onUpdateRow,
  onUpdateStudentNameGlobally,
  onPasteTable,
  onKeyDownNav,
  isEditModeUnlocked,
}) => {
  const monthTitle =
    tabIndex === 1
      ? term === 'الاول' ? 'شهر أكتوبر' : 'شهر مارس'
      : term === 'الاول' ? 'شهر نوفمبر' : 'شهر أبريل';

  const pageSheetTitle = `كشف رصد درجات أعمال السنة والغياب - تقييم ${monthTitle}`;
  const dateLimits = getDateLimitsForTab(term, year, tabIndex);

  const activeDaysCount = dates.filter((d) => d && d.trim() !== '').length;

  const datePickerRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleAbsenceKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    colIndex: number
  ) => {
    onKeyDownNav(e);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;

    const allowed = ['Backspace', 'Tab', 'Enter', 'Delete', 'Escape'];
    if (allowed.includes(e.key)) {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        const target = e.currentTarget;
        setTimeout(() => {
          const currentRow = rows[rowIndex] || { name: '', absence: [], hw: [], ass: [], exam: '' };
          const newAbsence = [...(currentRow.absence || [])];
          newAbsence[colIndex] = '';
          onUpdateRow(rowIndex, { ...currentRow, absence: newAbsence });
        }, 10);
      }
      return;
    }

    if (e.ctrlKey || e.metaKey) return;

    if (e.key === 'y' || e.key === 'Y' || e.key === 'غ') {
      e.preventDefault();
      const currentRow = rows[rowIndex] || { name: '', absence: [], hw: [], ass: [], exam: '' };
      const newAbsence = [...(currentRow.absence || [])];
      newAbsence[colIndex] = 'غ';
      onUpdateRow(rowIndex, { ...currentRow, absence: newAbsence });

      // Automatically advance to the next absence day
      const nextInput = e.currentTarget
        .closest('td')
        ?.nextElementSibling?.querySelector('.absence-input') as HTMLInputElement | null;
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
      return;
    }

    if (e.key === ' ') {
      e.preventDefault();
      const currentRow = rows[rowIndex] || { name: '', absence: [], hw: [], ass: [], exam: '' };
      const newAbsence = [...(currentRow.absence || [])];
      newAbsence[colIndex] = '';
      onUpdateRow(rowIndex, { ...currentRow, absence: newAbsence });
      return;
    }

    e.preventDefault();
  };

  const handleScoreKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    onKeyDownNav(e);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;

    const allowed = ['Backspace', 'Tab', 'Enter', 'Delete', 'Escape'];
    if (allowed.includes(e.key)) return;
    if (e.ctrlKey || e.metaKey) return;

    const isDigit = /^[0-9٠-٩]$/.test(e.key);
    const isDecimal = ['.', ',', '،'].includes(e.key);

    if (isDecimal) {
      if (e.currentTarget.value.includes('.') || e.currentTarget.value.includes(',') || e.currentTarget.value.includes('،')) {
        e.preventDefault();
      }
      return;
    }

    if (!isDigit) {
      e.preventDefault();
    }
  };

  const handleScoreChange = (
    rowIndex: number,
    type: 'hw' | 'ass' | 'exam',
    subIndex: number,
    rawVal: string
  ) => {
    let val = normalizeArabicDigits(rawVal).replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) {
      val = parts[0] + '.' + parts.slice(1).join('');
    }

    const num = parseFloat(val);
    const maxVal = type === 'hw' ? 2.5 : type === 'ass' ? 5 : 15;
    if (!isNaN(num)) {
      if (num > maxVal) val = maxVal.toString();
      else if (num < 0) val = '0';
    }

    const currentRow = rows[rowIndex] || { name: '', absence: [], hw: [], ass: [], exam: '' };
    if (type === 'hw') {
      const newHw = [...(currentRow.hw || [])];
      newHw[subIndex] = val;
      onUpdateRow(rowIndex, { ...currentRow, hw: newHw });
    } else if (type === 'ass') {
      const newAss = [...(currentRow.ass || [])];
      newAss[subIndex] = val;
      onUpdateRow(rowIndex, { ...currentRow, ass: newAss });
    } else {
      onUpdateRow(rowIndex, { ...currentRow, exam: val });
    }
  };

  return (
    <div className={`tab-landscape ${!isEditModeUnlocked ? 'locked-tab' : ''}`}>
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
                    <th rowSpan={2} style={{ width: '3%' }}>م</th>
                    <th rowSpan={2} style={{ width: '18%' }}>اسم الطالب</th>
                    <th colSpan={12} className="absence-header-group">
                      غياب الشهر (12 يوماً)
                    </th>
                    <th rowSpan={2} style={{ width: '6%' }}>
                      مواظبة وسلوك<br />10
                    </th>
                    <th colSpan={4}>كراسة الواجب<br />2.5</th>
                    <th rowSpan={2} style={{ width: '6%' }}>
                      مجموع الواجب<br />10
                    </th>
                    <th colSpan={4}>التقييم الاسبوعي<br />5</th>
                    <th rowSpan={2} style={{ width: '6%' }}>
                      مجموع التقييم<br />20
                    </th>
                    <th rowSpan={2} style={{ width: '6%' }}>
                      اختبار الشهر<br />15
                    </th>
                  </tr>
                  <tr>
                    {/* 12 date columns */}
                    {Array.from({ length: 12 }, (_, colIdx) => {
                      const dateVal = dates[colIdx] || '';
                      let displayDate = '';
                      if (dateVal) {
                        const parts = dateVal.split('-');
                        if (parts.length === 3) {
                          displayDate = `${parts[2]}/${parts[1]}`;
                        }
                      }

                      return (
                        <th key={colIdx} className="absence-date-header" style={{ width: '3%' }}>
                          <div className="date-picker-wrapper" data-col={colIdx}>
                            {!displayDate ? (
                              <button
                                type="button"
                                className="btn-pick-date"
                                onClick={() => {
                                  const input = datePickerRefs.current[colIdx];
                                  if (input) {
                                    if (typeof (input as any).showPicker === 'function') {
                                      (input as any).showPicker();
                                    } else {
                                      input.focus();
                                      input.click();
                                    }
                                  }
                                }}
                                title={`اختر تاريخ اليوم ${colIdx + 1}`}
                              >
                                📅
                              </button>
                            ) : (
                              <span
                                className="date-display-text"
                                onClick={() => {
                                  const input = datePickerRefs.current[colIdx];
                                  if (input) {
                                    if (typeof (input as any).showPicker === 'function') {
                                      (input as any).showPicker();
                                    } else {
                                      input.focus();
                                      input.click();
                                    }
                                  }
                                }}
                                title="انقر لتعديل التاريخ"
                              >
                                {displayDate}
                              </span>
                            )}
                            <input
                              type="date"
                              ref={(el) => {
                                datePickerRefs.current[colIdx] = el;
                              }}
                              className="absence-date-picker"
                              min={dateLimits.min}
                              max={dateLimits.max}
                              value={dateVal}
                              style={{
                                position: 'absolute',
                                opacity: 0,
                                pointerEvents: 'none',
                                width: 0,
                                height: 0,
                              }}
                              onChange={(e) => onDateChange(colIdx, e.target.value)}
                            />
                          </div>
                        </th>
                      );
                    })}

                    {/* HW headers */}
                    <th>الأول</th><th>الثاني</th><th>الثالث</th><th>الرابع</th>

                    {/* Assessment headers */}
                    <th>الأول</th><th>الثاني</th><th>الثالث</th><th>الرابع</th>
                  </tr>
                </thead>
                <tbody className="page-tbody" data-page={page}>
                  {Array.from({ length: pageSize }, (_, rIdx) => {
                    const globalSeq = pageStartSeq + rIdx;
                    const rowIndex = page * pageSize + rIdx;
                    const r = rows[rowIndex] || { name: '', absence: [], hw: [], ass: [], exam: '' };

                    const studentName = r.name || '';
                    const absences = r.absence || [];
                    const hw = r.hw || [];
                    const ass = r.ass || [];
                    const exam = r.exam || '';

                    const hasScore = exam !== '' || hw.some((h) => h !== '') || ass.some((a) => a !== '');
                    const attScore = calculateAttendanceScore(studentName, absences, activeDaysCount, hasScore);
                    const totalHw = calculateHomeworkTotal(hw);
                    const totalAss = calculateAssessmentTotal(ass);

                    return (
                      <tr key={rowIndex}>
                        <td className="row-index">{globalSeq}</td>
                        <td>
                          <input
                            type="text"
                            className="student-name"
                            value={studentName}
                            onChange={(e) => onUpdateStudentNameGlobally(rowIndex, e.target.value)}
                            onKeyDown={onKeyDownNav}
                            onPaste={(e) => onPasteTable(e, rowIndex, 'name')}
                          />
                        </td>

                        {/* 12 Absence Inputs */}
                        {Array.from({ length: 12 }, (_, aIdx) => (
                          <td key={aIdx} className="absence-cell">
                            <input
                              type="text"
                              className="absence-input"
                              maxLength={1}
                              value={absences[aIdx] || ''}
                              onChange={(e) => {
                                const val = e.target.value.trim();
                                const newAbsence = [...absences];
                                newAbsence[aIdx] = val === 'غ' || val.toLowerCase() === 'y' ? 'غ' : '';
                                onUpdateRow(rowIndex, { ...r, absence: newAbsence });
                              }}
                              onKeyDown={(e) => handleAbsenceKeyDown(e, rowIndex, aIdx)}
                              onPaste={(e) => onPasteTable(e, rowIndex, 'absence', aIdx)}
                            />
                          </td>
                        ))}

                        {/* Calculated Attendance Score */}
                        <td className="calc-cell calc-attendance-score">{attScore}</td>

                        {/* 4 Homework Inputs */}
                        {Array.from({ length: 4 }, (_, hIdx) => (
                          <td key={hIdx}>
                            <input
                              type="text"
                              inputMode="decimal"
                              className="score-input"
                              value={hw[hIdx] || ''}
                              onChange={(e) => handleScoreChange(rowIndex, 'hw', hIdx, e.target.value)}
                              onKeyDown={handleScoreKeyDown}
                              onPaste={(e) => onPasteTable(e, rowIndex, 'hw', hIdx)}
                            />
                          </td>
                        ))}

                        {/* Total Homework */}
                        <td className="calc-cell calc-total-hw">{totalHw}</td>

                        {/* 4 Assessment Inputs */}
                        {Array.from({ length: 4 }, (_, asIdx) => (
                          <td key={asIdx}>
                            <input
                              type="text"
                              inputMode="decimal"
                              className="score-input"
                              value={ass[asIdx] || ''}
                              onChange={(e) => handleScoreChange(rowIndex, 'ass', asIdx, e.target.value)}
                              onKeyDown={handleScoreKeyDown}
                              onPaste={(e) => onPasteTable(e, rowIndex, 'ass', asIdx)}
                            />
                          </td>
                        ))}

                        {/* Total Assessment */}
                        <td className="calc-cell calc-total-assessments">{totalAss}</td>

                        {/* Monthly Exam Input */}
                        <td>
                          <input
                            type="text"
                            inputMode="decimal"
                            className="score-input"
                            value={exam}
                            onChange={(e) => handleScoreChange(rowIndex, 'exam', 0, e.target.value)}
                            onKeyDown={handleScoreKeyDown}
                            onPaste={(e) => onPasteTable(e, rowIndex, 'exam', 0)}
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
