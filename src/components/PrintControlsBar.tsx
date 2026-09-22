import React from 'react';

interface PrintControlsBarProps {
  tabIndex: number;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  isFolderServerMode: boolean;
  autosaveStatus: string;
  onClearClassData: () => void;
}

export const PrintControlsBar: React.FC<PrintControlsBarProps> = ({
  tabIndex,
  pageSize,
  onPageSizeChange,
  isFolderServerMode,
  autosaveStatus,
  onClearClassData,
}) => {
  const p1End = pageSize;
  const p2Start = pageSize + 1;
  const p2End = pageSize * 2;

  return (
    <div className="print-controls-bar">
      <div className="controls-subgroup">
        <span>إعدادات ترقيم وطباعة الصفحات:</span>
        <label>
          عدد الطلاب بالصفحة:{' '}
          <input
            type="number"
            value={pageSize}
            min={5}
            max={60}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 25;
              onPageSizeChange(val);
            }}
          />
        </label>
        <span style={{ color: '#0369a1', fontWeight: 700 }}>
          {`(ص1: 1 إلى ${p1End} | ص2: ${p2Start} إلى ${p2End})`}
        </span>
      </div>

      <div className="controls-subgroup">
        {tabIndex === 0 ? (
          <>
            <span
              className="autosave-badge"
              id="storage-mode-badge"
              style={{
                background: isFolderServerMode ? '#d1fae5' : '#fef3c7',
                color: isFolderServerMode ? '#065f46' : '#92400e',
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '12px',
                fontWeight: 700,
              }}
            >
              {isFolderServerMode
                ? '🟢 حفظ دائم بالفولدر (database.json)'
                : '🟡 وضع المتصفح المباشر'}
            </span>
            <span className="autosave-badge" id="autosave-status">
              {autosaveStatus}
            </span>
            <button
              type="button"
              className="btn-action btn-clear"
              style={{ padding: '3px 8px', fontSize: '11px' }}
              onClick={onClearClassData}
            >
              مسح بيانات الفصل
            </button>
          </>
        ) : (
          <span style={{ color: '#0369a1', fontWeight: 700 }}>
            * انقر على زر 📅 لاختيار التاريخ ليظهر بدلاً منه. أدخل (غ) أو (y) للغياب. تُحسب المجاميع وتنتقل للنموذج الأول تلقائياً.
          </span>
        )}
      </div>
    </div>
  );
};
