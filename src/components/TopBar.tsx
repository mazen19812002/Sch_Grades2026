import React, { useRef } from 'react';

interface TopBarProps {
  activeTab: number;
  setActiveTab: (tab: number) => void;
  term: string;
  isEditModeUnlocked: boolean;
  onToggleEditMode: () => void;
  onImportExcel: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportExcel: () => void;
  onForceSaveToFolder: () => void;
  onOpenAppFolder: () => void;
  onCreateDatabaseBackup: () => void;
  onTriggerPrint: () => void;
  onExitApplication: () => void;
  onAdjustZoom: (amount: number) => void;
  onToggleFullScreen: () => void;
  hiddenUI: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  setActiveTab,
  term,
  isEditModeUnlocked,
  onToggleEditMode,
  onImportExcel,
  onExportExcel,
  onForceSaveToFolder,
  onOpenAppFolder,
  onCreateDatabaseBackup,
  onTriggerPrint,
  onExitApplication,
  onAdjustZoom,
  onToggleFullScreen,
  hiddenUI,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const month1Label = term === 'الاول' ? 'شهر أكتوبر' : 'شهر مارس';
  const month2Label = term === 'الاول' ? 'شهر نوفمبر' : 'شهر أبريل';

  return (
    <div className={`top-bar ${hiddenUI ? 'hidden-ui' : ''}`} id="topBar">
      <div className="tabs-container">
        <button
          type="button"
          className={`tab-btn ${activeTab === 0 ? 'active' : ''}`}
          id="btn-tab-0"
          onClick={() => setActiveTab(0)}
        >
          النموذج الأول (المجمل)
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 1 ? 'active' : ''}`}
          id="btn-tab-1"
          onClick={() => setActiveTab(1)}
        >
          {month1Label}
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 2 ? 'active' : ''}`}
          id="btn-tab-2"
          onClick={() => setActiveTab(2)}
        >
          {month2Label}
        </button>
      </div>

      <div className="action-row-top" id="action-buttons-group">
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".xlsx, .xls"
          onChange={onImportExcel}
        />
        <button
          type="button"
          className="btn-action btn-import"
          id="btn-import-act"
          onClick={() => fileInputRef.current?.click()}
          title="استيراد كشف الإكسل للثلاثة نماذج"
        >
          📥 استيراد إكسل
        </button>
        <button
          type="button"
          className="btn-action btn-export"
          id="btn-export-act"
          onClick={onExportExcel}
          title="تصدير كشف إكسل كامل بجميع التبويبات"
        >
          📤 تصدير إكسل
        </button>
        <button
          type="button"
          className="btn-action"
          style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)' }}
          onClick={onForceSaveToFolder}
          title="حفظ فوري في ملف database.json داخل الفولدر"
        >
          💾 حفظ بالفولدر
        </button>
        <button
          type="button"
          className="btn-action"
          style={{ background: 'linear-gradient(135deg, #475569, #334155)' }}
          onClick={onOpenAppFolder}
          title="فتح مجلد البرنامج والبيانات"
        >
          📁 مجلد البرنامج
        </button>
        <button
          type="button"
          className="btn-action"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
          onClick={onCreateDatabaseBackup}
          title="إنشاء نسخة احتياطية من البيانات"
        >
          📦 نسخة احتياطية
        </button>
        <button
          type="button"
          className={`btn-action btn-toggle-edit ${!isEditModeUnlocked ? 'unlocked' : ''}`}
          id="btn-toggle-edit"
          onClick={onToggleEditMode}
          title="قفل أو إتاحة تعديل درجات الشهور"
        >
          {isEditModeUnlocked ? '🔓 تعديل الشهور: متاح' : '🔒 تعديل الشهور: مقفل'}
        </button>
        <button
          type="button"
          className="btn-action btn-print"
          onClick={onTriggerPrint}
          title="طباعة النموذج النشط"
        >
          🖨️ طباعة الكشوف
        </button>
        <button
          type="button"
          className="btn-action btn-clear"
          onClick={onExitApplication}
          title="حفظ البيانات وإغلاق البرنامج"
        >
          🚪 خروج
        </button>
      </div>

      <div className="controls-group">
        <button
          type="button"
          className="control-btn"
          onClick={() => onAdjustZoom(-0.1)}
          title="تصغير حجم العرض"
        >
          -
        </button>
        <button
          type="button"
          className="control-btn"
          onClick={() => onAdjustZoom(0.1)}
          title="تكبير حجم العرض"
        >
          +
        </button>
        <button
          type="button"
          className="control-btn"
          onClick={onToggleFullScreen}
          title="ملء الشاشة"
        >
          ⛶
        </button>
      </div>
    </div>
  );
};
