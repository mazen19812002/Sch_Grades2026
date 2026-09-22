export interface GlobalSettings {
  adminSchool: string;
  teacher: string;
  subject: string;
  year: string;
  pageSize: number;
  lastTerm: string;
  lastClass: string;
  customClasses: string[];
}

export interface SheetRowDataTab0 {
  name: string;
  notes: string;
}

export interface SheetRowDataTabMonth {
  name: string;
  absence: string[]; // 12 items
  hw: string[];      // 4 items
  ass: string[];     // 4 items
  exam: string;      // 1 item
}

export interface SheetDataPayload {
  tabIndex: number;
  dates: string[];
  rows: (SheetRowDataTab0 | SheetRowDataTabMonth | any)[];
}

export interface ClassDataPayload {
  class: string;
  term: string;
  adminSchool: string;
  teacher: string;
  subject: string;
  year: string;
  sheets: SheetDataPayload[];
}

export interface MasterDatabase {
  globalSettings: GlobalSettings;
  classesData: Record<string, ClassDataPayload>;
}

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}
