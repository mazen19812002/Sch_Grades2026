// Convert Arabic-Indic and Persian digits to English digits
export function normalizeArabicDigits(str: any): string {
  if (str === null || str === undefined) return '';
  const arabicDigits = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
  const persianDigits = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
  let res = str.toString();
  for (let i = 0; i < 10; i++) {
    res = res.replace(new RegExp(arabicDigits[i], 'g'), i.toString());
    res = res.replace(new RegExp(persianDigits[i], 'g'), i.toString());
  }
  res = res.replace(/،/g, '.').replace(/,/g, '.');
  return res;
}

// Format numbers cleanly using standard English numbers without extra decimals
export function formatCleanScore(val: any): string {
  if (val === '' || val === null || val === undefined) return '';
  const num = parseFloat(normalizeArabicDigits(val));
  if (isNaN(num)) return '';
  const rounded = Math.round(num * 10) / 10;
  return rounded.toString();
}

// Automatic System Clock-Driven Term and Academic Year Detection
export function getSystemTermAndYear(): { term: string; academicYear: string; startYear: number; nextYear: number } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1 to 12

  let startYear: number;
  let term: string;

  if (month >= 7) {
    startYear = year;
    term = "الاول";
  } else if (month === 1) {
    startYear = year - 1;
    term = "الاول";
  } else {
    // Months 2, 3, 4, 5, 6
    startYear = year - 1;
    term = "الثاني";
  }

  const academicYear = `${startYear}-${startYear + 1}`;
  return { term, academicYear, startYear, nextYear: startYear + 1 };
}

export function getDateLimitsForTab(term: string, yearStr: string, tabIndex: number): { min: string; max: string } {
  const startYear = parseInt(normalizeArabicDigits(yearStr).split('-')[0]) || new Date().getFullYear();
  const nextYear = startYear + 1;

  if (term === "الاول") {
    // Term 1: October (10) and November (11)
    if (tabIndex === 1) return { min: `${startYear}-10-01`, max: `${startYear}-10-31` };
    if (tabIndex === 2) return { min: `${startYear}-11-01`, max: `${startYear}-11-30` };
  } else {
    // Term 2: March (03) and April (04)
    if (tabIndex === 1) return { min: `${nextYear}-03-01`, max: `${nextYear}-03-31` };
    if (tabIndex === 2) return { min: `${nextYear}-04-01`, max: `${nextYear}-04-30` };
  }
  return { min: "", max: "" };
}

// Calculate attendance for a monthly row
export function calculateAttendanceScore(
  studentName: string,
  absenceMarks: string[],
  activeDaysCount: number,
  hasAnyScore: boolean
): string {
  let hasAnyAbsenceMark = false;
  let studentAbsenceCount = 0;

  for (const mark of absenceMarks) {
    const val = mark ? mark.trim() : '';
    if (val === 'غ' || val.toLowerCase() === 'y') {
      studentAbsenceCount++;
      hasAnyAbsenceMark = true;
    } else if (val !== '') {
      hasAnyAbsenceMark = true;
    }
  }

  // If no name, no marks, and no scores: return blank
  if (!studentName.trim() && !hasAnyAbsenceMark && !hasAnyScore) {
    return '';
  }
  // Even if name is entered, if neither absence mark nor score is entered, leave blank
  if (!hasAnyAbsenceMark && !hasAnyScore) {
    return '';
  }

  const totalDays = activeDaysCount > 0 ? activeDaysCount : 12;
  let ratio = studentAbsenceCount / totalDays;
  if (ratio > 1) ratio = 1;
  let absenceScore = 10 - (ratio * 10);
  absenceScore = Math.min(10, Math.max(0, Math.round(absenceScore * 10) / 10));

  return formatCleanScore(absenceScore);
}

// Calculate total homework for 4 weeks
export function calculateHomeworkTotal(hwScores: string[]): string {
  let hasHw = false;
  let sumHw = 0;
  for (let i = 0; i < 4; i++) {
    const raw = hwScores[i] ? hwScores[i].trim() : '';
    if (raw !== '') {
      hasHw = true;
      const num = parseFloat(normalizeArabicDigits(raw)) || 0;
      sumHw += Math.min(2.5, Math.max(0, num));
    }
  }
  return hasHw ? formatCleanScore(Math.min(10, sumHw)) : '';
}

// Calculate total assessments for 4 weeks
export function calculateAssessmentTotal(assScores: string[]): string {
  let hasAss = false;
  let sumAss = 0;
  for (let i = 0; i < 4; i++) {
    const raw = assScores[i] ? assScores[i].trim() : '';
    if (raw !== '') {
      hasAss = true;
      const num = parseFloat(normalizeArabicDigits(raw)) || 0;
      sumAss += Math.min(5, Math.max(0, num));
    }
  }
  return hasAss ? formatCleanScore(Math.min(20, sumAss)) : '';
}
