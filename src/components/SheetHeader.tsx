import React from 'react';

interface SheetHeaderProps {
  adminSchool: string;
  onAdminSchoolChange: (val: string) => void;
  teacher: string;
  onTeacherChange: (val: string) => void;
  subject: string;
  onSubjectChange: (val: string) => void;
  year: string;
  onYearChange: (val: string) => void;
  term: string;
  onTermChange: (val: string) => void;
  currentClass: string;
  onClassChange: (val: string) => void;
  customClasses: string[];
  tabIndex: number;
}

export const SheetHeader: React.FC<SheetHeaderProps> = ({
  adminSchool,
  onAdminSchoolChange,
  teacher,
  onTeacherChange,
  subject,
  onSubjectChange,
  year,
  onYearChange,
  term,
  onTermChange,
  currentClass,
  onClassChange,
  customClasses,
  tabIndex,
}) => {
  const defaultClasses = ['اول 1', 'اول 2', 'ثاني 1', 'ثاني 2', 'ثالث 1', 'ثالث 2'];
  const allClasses = Array.from(new Set([...defaultClasses, ...customClasses]));

  const monthName =
    tabIndex === 1
      ? term === 'الاول' ? 'أكتوبر' : 'مارس'
      : tabIndex === 2
      ? term === 'الاول' ? 'نوفمبر' : 'أبريل'
      : '';

  return (
    <div className="sheet-header">
      <div className="header-row">
        <div className="header-item" style={{ flex: 2 }}>
          <label>الإدارة والمدرسة:</label>
          <input
            type="text"
            className="header-admin-school"
            value={adminSchool}
            onChange={(e) => onAdminSchoolChange(e.target.value)}
          />
        </div>
        <div className="header-item">
          <label>المعلم:</label>
          <input
            type="text"
            className="header-teacher"
            value={teacher}
            onChange={(e) => onTeacherChange(e.target.value)}
          />
        </div>
      </div>

      <div className="header-row">
        <div className="header-item">
          <label>المادة:</label>
          <input
            type="text"
            className="header-subject"
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
          />
        </div>
        <div className="header-item">
          <label>العام الدراسي:</label>
          <input
            type="text"
            className="header-year"
            value={year}
            onChange={(e) => onYearChange(e.target.value)}
          />
        </div>
        <div className="header-item">
          <label>الفصل الدراسي:</label>
          <select
            className="header-term"
            value={term}
            onChange={(e) => onTermChange(e.target.value)}
          >
            <option value="الاول">الاول</option>
            <option value="الثاني">الثاني</option>
          </select>
        </div>

        {tabIndex === 0 ? (
          <div className="header-item">
            <label>فصل (تحديد البيانات):</label>
            <select
              className="header-class-name"
              value={currentClass}
              onChange={(e) => onClassChange(e.target.value)}
            >
              {allClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
              <option value="__custom__">+ إضافة فصل جديد...</option>
            </select>
          </div>
        ) : (
          <>
            <div className="header-item">
              <label>الشهر:</label>
              <input
                type="text"
                className="static-header-val"
                value={monthName}
                readOnly
                style={{ background: '#e0f2fe', textAlign: 'center' }}
              />
            </div>
            <div className="header-item">
              <label>الفصل المختار:</label>
              <input
                type="text"
                className="static-header-val"
                value={currentClass}
                readOnly
                style={{ background: '#e0f2fe', textAlign: 'center' }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
