import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GlobalSettings,
  SheetRowDataTab0,
  SheetRowDataTabMonth,
  ClassDataPayload,
  MasterDatabase,
  ToastMessage,
} from './types.ts';
import {
  getSystemTermAndYear,
  normalizeArabicDigits,
} from './utils/calc.ts';
import { exportToExcel, parseExcelWorkbook } from './utils/excel.ts';
import { TopBar } from './components/TopBar.tsx';
import { SheetHeader } from './components/SheetHeader.tsx';
import { PrintControlsBar } from './components/PrintControlsBar.tsx';
import { Tab0Portrait } from './components/Tab0Portrait.tsx';
import { TabMonthLandscape } from './components/TabMonthLandscape.tsx';
import { ToastContainer } from './components/ToastContainer.tsx';
import { FloatingToggle } from './components/FloatingToggle.tsx';
import { Footer } from './components/Footer.tsx';

const createEmptyTab0Rows = (count: number): SheetRowDataTab0[] =>
  Array.from({ length: count }, () => ({ name: '', notes: '' }));

const createEmptyMonthRows = (count: number): SheetRowDataTabMonth[] =>
  Array.from({ length: count }, () => ({
    name: '',
    absence: Array(12).fill(''),
    hw: Array(4).fill(''),
    ass: Array(4).fill(''),
    exam: '',
  }));

export default function App() {
  const sysInit = getSystemTermAndYear();

  // Application Settings
  const [adminSchool, setAdminSchool] = useState<string>(
    'إدارة شرق كفر الشيخ التعليمية - مدرسة الشهيد نجيب محي الشناوي للتعليم الأساسي بدقميرة'
  );
  const [teacher, setTeacher] = useState<string>('مازن فوزي محمد على بدوي');
  const [subject, setSubject] = useState<string>('لغة انجليزية');
  const [academicYear, setAcademicYear] = useState<string>(sysInit.academicYear);
  const [term, setTerm] = useState<string>(sysInit.term);
  const [currentClass, setCurrentClass] = useState<string>('اول 1');
  const [customClasses, setCustomClasses] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState<number>(25);

  // Tab & View Controls
  const [activeTab, setActiveTab] = useState<number>(0);
  const [isEditModeUnlocked, setIsEditModeUnlocked] = useState<boolean>(true);
  const [hiddenUI, setHiddenUI] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);

  // Storage & Autosave
  const [isFolderServerMode, setIsFolderServerMode] = useState<boolean>(false);
  const [autosaveStatus, setAutosaveStatus] = useState<string>('✓ حفظ تلقائي نشط');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Tables Data for current active class & term
  const rowCount = pageSize * 2;
  const [tab0Rows, setTab0Rows] = useState<SheetRowDataTab0[]>(() => createEmptyTab0Rows(rowCount));
  const [tab1Rows, setTab1Rows] = useState<SheetRowDataTabMonth[]>(() => createEmptyMonthRows(rowCount));
  const [tab2Rows, setTab2Rows] = useState<SheetRowDataTabMonth[]>(() => createEmptyMonthRows(rowCount));
  const [tab1Dates, setTab1Dates] = useState<string[]>(() => Array(12).fill(''));
  const [tab2Dates, setTab2Dates] = useState<string[]>(() => Array(12).fill(''));

  // Master Database in-memory ref to hold all classes and terms
  const masterDbRef = useRef<MasterDatabase>({
    globalSettings: {
      adminSchool: 'إدارة شرق كفر الشيخ التعليمية - مدرسة الشهيد نجيب محي الشناوي للتعليم الأساسي بدقميرة',
      teacher: 'مازن فوزي محمد على بدوي',
      subject: 'لغة انجليزية',
      year: sysInit.academicYear,
      pageSize: 25,
      lastTerm: sysInit.term,
      lastClass: 'اول 1',
      customClasses: [],
    },
    classesData: {},
  });

  const isPopulatingRef = useRef<boolean>(false);
  const autoSaveTimerRef = useRef<any>(null);

  // Toast Helper
  const showToast = useCallback((message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const getStorageKey = (t = term, c = currentClass) => `grading_app_data_${t}_${c}`;

  // Extract payload for current active class
  const extractCurrentPayload = useCallback(
    (t = term, c = currentClass): ClassDataPayload => {
      return {
        class: c,
        term: t,
        adminSchool,
        teacher,
        subject,
        year: academicYear,
        sheets: [
          { tabIndex: 0, dates: [], rows: tab0Rows },
          { tabIndex: 1, dates: tab1Dates, rows: tab1Rows },
          { tabIndex: 2, dates: tab2Dates, rows: tab2Rows },
        ],
      };
    },
    [adminSchool, teacher, subject, academicYear, tab0Rows, tab1Rows, tab2Rows, tab1Dates, tab2Dates, term, currentClass]
  );

  // Populate state from payload
  const populateFromPayload = useCallback(
    (payload: ClassDataPayload, desiredPageSize = pageSize) => {
      isPopulatingRef.current = true;
      try {
        if (payload.adminSchool) setAdminSchool(payload.adminSchool);
        if (payload.teacher) setTeacher(payload.teacher);
        if (payload.subject) setSubject(payload.subject);
        if (payload.year) setAcademicYear(payload.year);

        const targetCount = desiredPageSize * 2;
        let t0 = createEmptyTab0Rows(targetCount);
        let t1 = createEmptyMonthRows(targetCount);
        let t2 = createEmptyMonthRows(targetCount);
        let d1 = Array(12).fill('');
        let d2 = Array(12).fill('');

        if (payload.sheets) {
          payload.sheets.forEach((sheet) => {
            if (sheet.tabIndex === 0) {
              t0 = Array.from({ length: targetCount }, (_, i) => {
                const r = sheet.rows?.[i];
                return {
                  name: r?.name || '',
                  notes: r?.notes || '',
                };
              });
            } else if (sheet.tabIndex === 1) {
              if (sheet.dates) d1 = Array.from({ length: 12 }, (_, i) => sheet.dates[i] || '');
              t1 = Array.from({ length: targetCount }, (_, i) => {
                const r = sheet.rows?.[i];
                return {
                  name: r?.name || '',
                  absence: Array.from({ length: 12 }, (_, a) => r?.absence?.[a] || ''),
                  hw: Array.from({ length: 4 }, (_, h) => r?.hw?.[h] || ''),
                  ass: Array.from({ length: 4 }, (_, a) => r?.ass?.[a] || ''),
                  exam: r?.exam || '',
                };
              });
            } else if (sheet.tabIndex === 2) {
              if (sheet.dates) d2 = Array.from({ length: 12 }, (_, i) => sheet.dates[i] || '');
              t2 = Array.from({ length: targetCount }, (_, i) => {
                const r = sheet.rows?.[i];
                return {
                  name: r?.name || '',
                  absence: Array.from({ length: 12 }, (_, a) => r?.absence?.[a] || ''),
                  hw: Array.from({ length: 4 }, (_, h) => r?.hw?.[h] || ''),
                  ass: Array.from({ length: 4 }, (_, a) => r?.ass?.[a] || ''),
                  exam: r?.exam || '',
                };
              });
            }
          });
        }

        // Sync names in case one has name and others don't
        for (let i = 0; i < targetCount; i++) {
          const name = t0[i].name || t1[i].name || t2[i].name || '';
          t0[i].name = name;
          t1[i].name = name;
          t2[i].name = name;
        }

        setTab0Rows(t0);
        setTab1Rows(t1);
        setTab2Rows(t2);
        setTab1Dates(d1);
        setTab2Dates(d2);
      } finally {
        setTimeout(() => {
          isPopulatingRef.current = false;
        }, 50);
      }
    },
    [pageSize]
  );

  // Load class data
  const loadClassData = useCallback(
    (t: string, c: string, targetSize = pageSize) => {
      const key = `grading_app_data_${t}_${c}`;
      if (masterDbRef.current.classesData && masterDbRef.current.classesData[key]) {
        populateFromPayload(masterDbRef.current.classesData[key], targetSize);
        return true;
      }
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          populateFromPayload(parsed, targetSize);
          return true;
        }
      } catch (e) {
        console.warn('LocalStorage load failed:', e);
      }

      // If no data, reset to clean rows
      const targetCount = targetSize * 2;
      setTab0Rows(createEmptyTab0Rows(targetCount));
      setTab1Rows(createEmptyMonthRows(targetCount));
      setTab2Rows(createEmptyMonthRows(targetCount));
      setTab1Dates(Array(12).fill(''));
      setTab2Dates(Array(12).fill(''));
      return false;
    },
    [pageSize, populateFromPayload]
  );

  // Save master database to disk or localStorage
  const saveMasterDatabase = useCallback(
    async (currentPayload?: ClassDataPayload) => {
      const activeKey = getStorageKey(term, currentClass);
      const payloadToSave = currentPayload || extractCurrentPayload(term, currentClass);

      if (!masterDbRef.current.classesData) masterDbRef.current.classesData = {};
      masterDbRef.current.classesData[activeKey] = payloadToSave;

      masterDbRef.current.globalSettings = {
        adminSchool,
        teacher,
        subject,
        year: academicYear,
        pageSize,
        lastTerm: term,
        lastClass: currentClass,
        customClasses,
      };

      // 1. LocalStorage
      try {
        localStorage.setItem(activeKey, JSON.stringify(payloadToSave));
      } catch (e) {
        console.warn('LocalStorage save failed:', e);
      }

      // 2. Folder server if available
      if (isFolderServerMode) {
        try {
          const resp = await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify(masterDbRef.current, null, 2),
          });
          if (resp.ok) {
            return true;
          }
        } catch (e) {
          console.warn('Folder server save failed:', e);
        }
      }
      return false;
    },
    [adminSchool, teacher, subject, academicYear, pageSize, term, currentClass, customClasses, isFolderServerMode, extractCurrentPayload]
  );

  // Schedule auto-save
  const scheduleAutoSave = useCallback(() => {
    if (isPopulatingRef.current) return;
    setAutosaveStatus('⏳ جاري الحفظ...');
    clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      const savedToDisk = await saveMasterDatabase();
      setAutosaveStatus(savedToDisk ? '✓ تم الحفظ الدائم في الفولدر' : '✓ تم الحفظ محلياً');
    }, 400);
  }, [saveMasterDatabase]);

  // Initial Load & Server Folder Check
  useEffect(() => {
    let isMounted = true;
    async function initApp() {
      try {
        const resp = await fetch('/api/data', { cache: 'no-store' });
        if (resp.ok) {
          const data = await resp.json();
          if (isMounted) {
            setIsFolderServerMode(true);
            if (data && (data.classesData || data.globalSettings)) {
              masterDbRef.current = data;
              const g = data.globalSettings;
              if (g) {
                if (g.adminSchool) setAdminSchool(g.adminSchool);
                if (g.teacher) setTeacher(g.teacher);
                if (g.subject) setSubject(g.subject);
                if (g.year) setAcademicYear(g.year);
                if (g.pageSize) setPageSize(g.pageSize);
                if (g.customClasses) setCustomClasses(g.customClasses);
                const initTerm = g.lastTerm || sysInit.term;
                const initClass = g.lastClass || 'اول 1';
                setTerm(initTerm);
                setCurrentClass(initClass);
                loadClassData(initTerm, initClass, g.pageSize || 25);
                showToast('تم الاتصال بمجلد البرنامج بنجاح! يتم الحفظ تلقائياً في ملف database.json', 'success');
                return;
              }
            }
          }
        }
      } catch (e) {
        console.warn('Folder API check:', e);
      }

      if (isMounted) {
        setIsFolderServerMode(false);
        loadClassData(sysInit.term, 'اول 1', 25);
      }
    }

    initApp();
    return () => {
      isMounted = false;
    };
  }, []);

  // Update dynamic print orientation style
  const updatePrintOrientation = useCallback((isLandscape: boolean) => {
    let styleEl = document.getElementById('print-orientation-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'print-orientation-style';
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `@page { size: A4 ${isLandscape ? 'landscape' : 'portrait'}; margin: 5mm; }`;
  }, []);

  // Switch Tab
  const handleTabSwitch = (tab: number) => {
    setActiveTab(tab);
    updatePrintOrientation(tab !== 0);
  };

  // Class Change
  const handleClassChange = async (selectedVal: string) => {
    if (!selectedVal) return;

    let targetClass = selectedVal;
    if (selectedVal === '__custom__') {
      const newClass = prompt('أدخل اسم الفصل الجديد (مثال: اول 3 أو ثالث 2):');
      if (newClass && newClass.trim()) {
        const trimmed = newClass.trim();
        targetClass = trimmed;
        setCustomClasses((prev) => Array.from(new Set([...prev, trimmed])));
      } else {
        return;
      }
    }

    // Save current on-screen data for old class
    await saveMasterDatabase();

    // Switch class
    setCurrentClass(targetClass);

    // Load data for the new class
    loadClassData(term, targetClass, pageSize);
  };

  // Term Change
  const handleTermChange = async (newTerm: string) => {
    if (newTerm === term) return;

    // Save current on-screen data for old term
    await saveMasterDatabase();

    // Switch term
    setTerm(newTerm);

    // Load data for new term
    loadClassData(newTerm, currentClass, pageSize);
  };

  // Page Size Change
  const handlePageSizeChange = (newSize: number) => {
    const size = Math.min(60, Math.max(5, newSize));
    setPageSize(size);
    const targetCount = size * 2;

    setTab0Rows((prev) => {
      const res = createEmptyTab0Rows(targetCount);
      for (let i = 0; i < Math.min(prev.length, targetCount); i++) res[i] = prev[i];
      return res;
    });
    setTab1Rows((prev) => {
      const res = createEmptyMonthRows(targetCount);
      for (let i = 0; i < Math.min(prev.length, targetCount); i++) res[i] = prev[i];
      return res;
    });
    setTab2Rows((prev) => {
      const res = createEmptyMonthRows(targetCount);
      for (let i = 0; i < Math.min(prev.length, targetCount); i++) res[i] = prev[i];
      return res;
    });

    scheduleAutoSave();
  };

  // Clear Class Data
  const handleClearClassData = () => {
    if (
      confirm(
        `هل أنت متأكد من مسح جميع بيانات الفصل الحالي (${currentClass}) بالكامل؟ سيتم تفريغ الأسماء وكافة الدرجات وحسابات الخلايا.`
      )
    ) {
      const key = getStorageKey(term, currentClass);
      try {
        localStorage.removeItem(key);
      } catch (e) {}

      if (masterDbRef.current.classesData) {
        delete masterDbRef.current.classesData[key];
        saveMasterDatabase();
      }

      const targetCount = pageSize * 2;
      setTab0Rows(createEmptyTab0Rows(targetCount));
      setTab1Rows(createEmptyMonthRows(targetCount));
      setTab2Rows(createEmptyMonthRows(targetCount));
      setTab1Dates(Array(12).fill(''));
      setTab2Dates(Array(12).fill(''));

      showToast(`تم مسح بيانات الفصل (${currentClass}) بالكامل وتفريغ الخانات.`, 'info');
    }
  };

  // Student name synced globally across all 3 tabs
  const handleUpdateStudentNameGlobally = (index: number, val: string) => {
    setTab0Rows((prev) => {
      const updated = [...prev];
      if (updated[index]) updated[index] = { ...updated[index], name: val };
      return updated;
    });
    setTab1Rows((prev) => {
      const updated = [...prev];
      if (updated[index]) updated[index] = { ...updated[index], name: val };
      return updated;
    });
    setTab2Rows((prev) => {
      const updated = [...prev];
      if (updated[index]) updated[index] = { ...updated[index], name: val };
      return updated;
    });
    scheduleAutoSave();
  };

  // Tab 0 Row Update
  const handleUpdateTab0Row = (index: number, field: 'name' | 'notes', val: string) => {
    if (field === 'name') {
      handleUpdateStudentNameGlobally(index, val);
    } else {
      setTab0Rows((prev) => {
        const updated = [...prev];
        if (updated[index]) updated[index] = { ...updated[index], notes: val };
        return updated;
      });
      scheduleAutoSave();
    }
  };

  // Tab Month Row Update
  const handleUpdateMonthRow = (tabIdx: 1 | 2, index: number, updatedRow: SheetRowDataTabMonth) => {
    if (tabIdx === 1) {
      setTab1Rows((prev) => {
        const u = [...prev];
        u[index] = updatedRow;
        return u;
      });
    } else {
      setTab2Rows((prev) => {
        const u = [...prev];
        u[index] = updatedRow;
        return u;
      });
    }
    scheduleAutoSave();
  };

  // Date Change
  const handleDateChange = (tabIdx: 1 | 2, colIdx: number, val: string) => {
    if (tabIdx === 1) {
      setTab1Dates((prev) => {
        const next = [...prev];
        next[colIdx] = val;
        return next;
      });
    } else {
      setTab2Dates((prev) => {
        const next = [...prev];
        next[colIdx] = val;
        return next;
      });
    }
    scheduleAutoSave();
  };

  // Arrow Key Navigation
  const handleKeyDownNav = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;

    const currentInput = e.currentTarget;
    const cell = currentInput.closest('td, th');
    const row = currentInput.closest('tr');
    if (!cell || !row) return;

    const cellIndex = Array.from(row.children).indexOf(cell);
    let targetRow: Element | null = null;

    if (e.key === 'ArrowUp') {
      targetRow = row.previousElementSibling;
      if (!targetRow) {
        const prevPage = row.closest('.print-page')?.previousElementSibling;
        if (prevPage) {
          const rows = prevPage.querySelectorAll('tbody tr');
          targetRow = rows[rows.length - 1] || null;
        }
      }
    } else if (e.key === 'ArrowDown') {
      targetRow = row.nextElementSibling;
      if (!targetRow) {
        const nextPage = row.closest('.print-page')?.nextElementSibling;
        if (nextPage) {
          const rows = nextPage.querySelectorAll('tbody tr');
          targetRow = rows[0] || null;
        }
      }
    } else if (e.key === 'ArrowLeft') {
      const nextCell = cell.nextElementSibling;
      if (nextCell) {
        const nextInput = nextCell.querySelector('input');
        if (nextInput) {
          e.preventDefault();
          nextInput.focus();
          if (nextInput.type === 'text') nextInput.select();
        }
      }
      return;
    } else if (e.key === 'ArrowRight') {
      const prevCell = cell.previousElementSibling;
      if (prevCell) {
        const prevInput = prevCell.querySelector('input');
        if (prevInput) {
          e.preventDefault();
          prevInput.focus();
          if (prevInput.type === 'text') prevInput.select();
        }
      }
      return;
    }

    if (targetRow) {
      const targetCell = targetRow.children[cellIndex];
      if (targetCell) {
        const targetInput = targetCell.querySelector('input');
        if (targetInput) {
          e.preventDefault();
          targetInput.focus();
          if (targetInput.type === 'text') targetInput.select();
        }
      }
    }
  };

  // Multi-cell Clipboard Paste Handler
  const handlePasteTable = (
    e: React.ClipboardEvent<HTMLInputElement>,
    startRowIndex: number,
    colType: 'name' | 'absence' | 'hw' | 'ass' | 'exam' | 'score',
    subIndex: number = 0
  ) => {
    const text = e.clipboardData.getData('text');
    if (!text) return;

    const hasMultipleLines = text.includes('\n') || text.includes('\r');
    const hasTabs = text.includes('\t');

    if (colType === 'absence' && !hasMultipleLines && !hasTabs) {
      e.preventDefault();
      const clean = text.trim();
      const val = clean === 'غ' || clean.toLowerCase() === 'y' ? 'غ' : '';
      if (activeTab === 1) {
        setTab1Rows((prev) => {
          const u = [...prev];
          const curr = u[startRowIndex] || { name: '', absence: [], hw: [], ass: [], exam: '' };
          const abs = [...curr.absence];
          abs[subIndex] = val;
          u[startRowIndex] = { ...curr, absence: abs };
          return u;
        });
      } else if (activeTab === 2) {
        setTab2Rows((prev) => {
          const u = [...prev];
          const curr = u[startRowIndex] || { name: '', absence: [], hw: [], ass: [], exam: '' };
          const abs = [...curr.absence];
          abs[subIndex] = val;
          u[startRowIndex] = { ...curr, absence: abs };
          return u;
        });
      }
      scheduleAutoSave();
      return;
    }

    if (!hasMultipleLines && !hasTabs) return;

    e.preventDefault();
    const lines = text.split(/\r\n|\n|\r/).filter((l, idx, arr) => idx < arr.length - 1 || l.trim() !== '');
    if (lines.length === 0) return;

    const totalRowsCount = pageSize * 2;

    if (colType === 'name') {
      const newNames: { [idx: number]: string } = {};
      lines.forEach((line, rOffset) => {
        const targetIdx = startRowIndex + rOffset;
        if (targetIdx < totalRowsCount) {
          const cells = line.split('\t');
          newNames[targetIdx] = cells[0]?.trim() || '';
        }
      });

      setTab0Rows((prev) =>
        prev.map((r, i) => (newNames[i] !== undefined ? { ...r, name: newNames[i] } : r))
      );
      setTab1Rows((prev) =>
        prev.map((r, i) => (newNames[i] !== undefined ? { ...r, name: newNames[i] } : r))
      );
      setTab2Rows((prev) =>
        prev.map((r, i) => (newNames[i] !== undefined ? { ...r, name: newNames[i] } : r))
      );
    } else if (colType === 'absence') {
      const targetStateUpdater = activeTab === 1 ? setTab1Rows : setTab2Rows;
      targetStateUpdater((prev) => {
        const u = [...prev];
        lines.forEach((line, rOffset) => {
          const targetIdx = startRowIndex + rOffset;
          if (targetIdx < totalRowsCount) {
            const cells = line.split('\t');
            const curr = u[targetIdx] || { name: '', absence: [], hw: [], ass: [], exam: '' };
            const abs = [...curr.absence];
            cells.forEach((val, cOffset) => {
              const targetCol = subIndex + cOffset;
              if (targetCol < 12) {
                const trimmed = val.trim();
                abs[targetCol] = trimmed === 'غ' || trimmed.toLowerCase() === 'y' ? 'غ' : '';
              }
            });
            u[targetIdx] = { ...curr, absence: abs };
          }
        });
        return u;
      });
    } else if (colType === 'hw' || colType === 'ass' || colType === 'exam') {
      const targetStateUpdater = activeTab === 1 ? setTab1Rows : setTab2Rows;
      targetStateUpdater((prev) => {
        const u = [...prev];
        lines.forEach((line, rOffset) => {
          const targetIdx = startRowIndex + rOffset;
          if (targetIdx < totalRowsCount) {
            const cells = line.split('\t');
            const curr = u[targetIdx] || { name: '', absence: [], hw: [], ass: [], exam: '' };
            const hw = [...curr.hw];
            const ass = [...curr.ass];
            let exam = curr.exam;

            cells.forEach((val, cOffset) => {
              const cleanNum = normalizeArabicDigits(val.trim()).replace(/[^0-9.]/g, '');
              if (colType === 'hw') {
                const targetCol = subIndex + cOffset;
                if (targetCol < 4) hw[targetCol] = cleanNum;
              } else if (colType === 'ass') {
                const targetCol = subIndex + cOffset;
                if (targetCol < 4) ass[targetCol] = cleanNum;
              } else if (colType === 'exam') {
                exam = cleanNum;
              }
            });

            u[targetIdx] = { ...curr, hw, ass, exam };
          }
        });
        return u;
      });
    }

    scheduleAutoSave();
    showToast(`تم لصق وتوزيع ${lines.length} صفاً من بيانات الإكسل بنجاح!`, 'success');
  };

  // Top Bar Actions
  const handleExportExcel = () => {
    const filename = exportToExcel(
      currentClass,
      term,
      tab0Rows,
      tab1Rows,
      tab2Rows,
      tab1Dates,
      tab2Dates
    );
    showToast(`تم تصدير ملف الإكسل (${filename}) بنجاح!`, 'success');
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await parseExcelWorkbook(file);
      if (parsed.tab0Rows) {
        setTab0Rows(parsed.tab0Rows);
      }
      if (parsed.tab1Rows) {
        setTab1Rows(parsed.tab1Rows);
      }
      if (parsed.tab2Rows) {
        setTab2Rows(parsed.tab2Rows);
      }
      if (parsed.tab1Dates) {
        setTab1Dates(parsed.tab1Dates);
      }
      if (parsed.tab2Dates) {
        setTab2Dates(parsed.tab2Dates);
      }

      scheduleAutoSave();
      showToast('تم استيراد كافة البيانات بنجاح واستعادتها كاملة!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('حدث خطأ أثناء قراءة ملف الإكسل: ' + err.message, 'error');
    }
    e.target.value = '';
  };

  const handleForceSaveToFolder = async () => {
    const saved = await saveMasterDatabase();
    if (saved) {
      showToast('✓ تم حفظ جميع البيانات بنجاح في ملف database.json داخل الفولدر!', 'success');
    } else {
      showToast('تم الحفظ في الذاكرة المحلية (localStorage). للحفظ الدائم داخل الفولدر، يرجى تشغيل الخادم.', 'info');
    }
  };

  const handleOpenAppFolder = async () => {
    if (isFolderServerMode) {
      try {
        await fetch('/api/open-folder', { method: 'POST' });
        showToast('مجلد البرنامج مفتوح وقيد التشغيل على الخادم المحلي.', 'info');
      } catch (e) {
        showToast('تعذر فتح المجلد.', 'error');
      }
    } else {
      showToast('أنت تعمل في وضع المتصفح المباشر. البيانات محفوظة في المتصفح.', 'info');
    }
  };

  const handleCreateDatabaseBackup = async () => {
    await saveMasterDatabase();
    if (isFolderServerMode) {
      try {
        const r = await fetch('/api/backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(masterDbRef.current),
        });
        const res = await r.json();
        showToast(`تم إنشاء نسخة احتياطية جديدة بنجاح: ${res.filename || ''}`, 'success');
        return;
      } catch (e) {}
    }

    // Client-side download fallback
    const blob = new Blob([JSON.stringify(masterDbRef.current, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `EnglishGradingBackup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    showToast('تم تنزيل نسخة احتياطية من ملف قاعدة البيانات (database.json)', 'success');
  };

  const handleRestoreDatabaseBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed && (parsed.classesData || parsed.globalSettings)) {
          masterDbRef.current = parsed;
          const g = parsed.globalSettings;
          if (g) {
            if (g.adminSchool) setAdminSchool(g.adminSchool);
            if (g.teacher) setTeacher(g.teacher);
            if (g.subject) setSubject(g.subject);
            if (g.year) setAcademicYear(g.year);
            if (g.pageSize) setPageSize(g.pageSize);
            if (g.customClasses) setCustomClasses(g.customClasses);
            const targetTerm = g.lastTerm || term;
            const targetClass = g.lastClass || currentClass;
            setTerm(targetTerm);
            setCurrentClass(targetClass);
            loadClassData(targetTerm, targetClass, g.pageSize || pageSize);
          }
          await saveMasterDatabase();
          showToast('✓ تم استعادة النسخة الاحتياطية بنجاح وتحديث كافة الكشوف والصفوف!', 'success');
        } else {
          showToast('ملف النسخة الاحتياطية غير صالح أو غير متطابق.', 'error');
        }
      } catch (err: any) {
        showToast('تعذر قراءة ملف النسخة الاحتياطية: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleTriggerPrint = () => {
    updatePrintOrientation(activeTab !== 0);
    setTimeout(() => {
      window.print();
    }, 120);
  };

  const handleExitApplication = () => {
    if (confirm('هل تريد حفظ البيانات وإغلاق البرنامج؟')) {
      saveMasterDatabase().then(() => {
        if (isFolderServerMode) {
          fetch('/api/exit', { method: 'POST' });
          setTimeout(() => {
            window.close();
          }, 300);
        } else {
          window.close();
        }
      });
    }
  };

  const handleAdjustZoom = (amount: number) => {
    setZoom((prev) => {
      let next = prev + amount;
      if (next < 0.6) next = 0.6;
      if (next > 1.4) next = 1.4;
      next = Math.round(next * 10) / 10;
      showToast(`مستوى التكبير: ${Math.round(next * 100)}%`, 'info');
      return next;
    });
  };

  const handleToggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  return (
    <div>
      <ToastContainer toasts={toasts} />

      {/* Top Bar */}
      <TopBar
        activeTab={activeTab}
        setActiveTab={handleTabSwitch}
        term={term}
        isEditModeUnlocked={isEditModeUnlocked}
        onToggleEditMode={() => {
          setIsEditModeUnlocked((prev) => {
            const next = !prev;
            showToast(
              next ? 'تم إتاحة تعديل كشوف الشهور الآن.' : 'تم قفل كشوف الشهور لحماية البيانات من التعديل.',
              next ? 'info' : 'warning'
            );
            return next;
          });
        }}
        onImportExcel={handleImportExcel}
        onExportExcel={handleExportExcel}
        onForceSaveToFolder={handleForceSaveToFolder}
        onOpenAppFolder={handleOpenAppFolder}
        onCreateDatabaseBackup={handleCreateDatabaseBackup}
        onRestoreDatabaseBackup={handleRestoreDatabaseBackup}
        onTriggerPrint={handleTriggerPrint}
        onExitApplication={handleExitApplication}
        onAdjustZoom={handleAdjustZoom}
        onToggleFullScreen={handleToggleFullScreen}
        hiddenUI={hiddenUI}
      />

      {/* Main Wrapper */}
      <div
        className="main-wrapper"
        id="mainWrapper"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
      >
        {/* TAB 0: Portrait First Model (المجمل) */}
        {activeTab === 0 && (
          <div className="tab-content" id="tab-0" data-tab="0">
            <SheetHeader
              adminSchool={adminSchool}
              onAdminSchoolChange={(val) => {
                setAdminSchool(val);
                scheduleAutoSave();
              }}
              teacher={teacher}
              onTeacherChange={(val) => {
                setTeacher(val);
                scheduleAutoSave();
              }}
              subject={subject}
              onSubjectChange={(val) => {
                setSubject(val);
                scheduleAutoSave();
              }}
              year={academicYear}
              onYearChange={(val) => {
                setAcademicYear(val);
                scheduleAutoSave();
              }}
              term={term}
              onTermChange={handleTermChange}
              currentClass={currentClass}
              onClassChange={handleClassChange}
              customClasses={customClasses}
              tabIndex={0}
            />

            <PrintControlsBar
              tabIndex={0}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              isFolderServerMode={isFolderServerMode}
              autosaveStatus={autosaveStatus}
              onClearClassData={handleClearClassData}
            />

            <div className="table-container" id="container-0">
              <Tab0Portrait
                adminSchool={adminSchool}
                teacher={teacher}
                subject={subject}
                year={academicYear}
                term={term}
                currentClass={currentClass}
                pageSize={pageSize}
                tab0Rows={tab0Rows}
                onUpdateTab0Row={handleUpdateTab0Row}
                onUpdateStudentNameGlobally={handleUpdateStudentNameGlobally}
                tab1Rows={tab1Rows}
                tab2Rows={tab2Rows}
                tab1Dates={tab1Dates}
                tab2Dates={tab2Dates}
                onPasteTable={handlePasteTable}
                onKeyDownNav={handleKeyDownNav}
              />
            </div>
          </div>
        )}

        {/* TAB 1: Landscape Month 1 (October / March) */}
        {activeTab === 1 && (
          <div className="tab-content" id="tab-1" data-tab="1">
            <SheetHeader
              adminSchool={adminSchool}
              onAdminSchoolChange={(val) => {
                setAdminSchool(val);
                scheduleAutoSave();
              }}
              teacher={teacher}
              onTeacherChange={(val) => {
                setTeacher(val);
                scheduleAutoSave();
              }}
              subject={subject}
              onSubjectChange={(val) => {
                setSubject(val);
                scheduleAutoSave();
              }}
              year={academicYear}
              onYearChange={(val) => {
                setAcademicYear(val);
                scheduleAutoSave();
              }}
              term={term}
              onTermChange={handleTermChange}
              currentClass={currentClass}
              onClassChange={handleClassChange}
              customClasses={customClasses}
              tabIndex={1}
            />

            <PrintControlsBar
              tabIndex={1}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              isFolderServerMode={isFolderServerMode}
              autosaveStatus={autosaveStatus}
              onClearClassData={handleClearClassData}
            />

            <div className="table-container" id="container-1">
              <TabMonthLandscape
                tabIndex={1}
                adminSchool={adminSchool}
                teacher={teacher}
                subject={subject}
                year={academicYear}
                term={term}
                currentClass={currentClass}
                pageSize={pageSize}
                dates={tab1Dates}
                onDateChange={(colIdx, val) => handleDateChange(1, colIdx, val)}
                rows={tab1Rows}
                onUpdateRow={(idx, updated) => handleUpdateMonthRow(1, idx, updated)}
                onUpdateStudentNameGlobally={handleUpdateStudentNameGlobally}
                onPasteTable={handlePasteTable}
                onKeyDownNav={handleKeyDownNav}
                isEditModeUnlocked={isEditModeUnlocked}
              />
            </div>
          </div>
        )}

        {/* TAB 2: Landscape Month 2 (November / April) */}
        {activeTab === 2 && (
          <div className="tab-content" id="tab-2" data-tab="2">
            <SheetHeader
              adminSchool={adminSchool}
              onAdminSchoolChange={(val) => {
                setAdminSchool(val);
                scheduleAutoSave();
              }}
              teacher={teacher}
              onTeacherChange={(val) => {
                setTeacher(val);
                scheduleAutoSave();
              }}
              subject={subject}
              onSubjectChange={(val) => {
                setSubject(val);
                scheduleAutoSave();
              }}
              year={academicYear}
              onYearChange={(val) => {
                setAcademicYear(val);
                scheduleAutoSave();
              }}
              term={term}
              onTermChange={handleTermChange}
              currentClass={currentClass}
              onClassChange={handleClassChange}
              customClasses={customClasses}
              tabIndex={2}
            />

            <PrintControlsBar
              tabIndex={2}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              isFolderServerMode={isFolderServerMode}
              autosaveStatus={autosaveStatus}
              onClearClassData={handleClearClassData}
            />

            <div className="table-container" id="container-2">
              <TabMonthLandscape
                tabIndex={2}
                adminSchool={adminSchool}
                teacher={teacher}
                subject={subject}
                year={academicYear}
                term={term}
                currentClass={currentClass}
                pageSize={pageSize}
                dates={tab2Dates}
                onDateChange={(colIdx, val) => handleDateChange(2, colIdx, val)}
                rows={tab2Rows}
                onUpdateRow={(idx, updated) => handleUpdateMonthRow(2, idx, updated)}
                onUpdateStudentNameGlobally={handleUpdateStudentNameGlobally}
                onPasteTable={handlePasteTable}
                onKeyDownNav={handleKeyDownNav}
                isEditModeUnlocked={isEditModeUnlocked}
              />
            </div>
          </div>
        )}
      </div>

      {/* Floating Toggle & Footer */}
      <FloatingToggle onToggle={() => setHiddenUI((prev) => !prev)} />
      <Footer />
    </div>
  );
}
