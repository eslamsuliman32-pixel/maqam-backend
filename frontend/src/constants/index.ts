
export const ACADEMY_TOTAL_TECHNIQUES = 42;

export const APP_VERSION = '2.5.0';
export const APP_CODENAME = 'MAQAM OS2';

export const DIALECTS = [
  { id: 'fusha', name: 'الفصحى' },
  { id: 'egyptian', name: 'المصري' },
  { id: 'maghrebi', name: 'المغربي' },
  { id: 'levantine', name: 'الشامي' },
  { id: 'gulf', name: 'الخليجي' },
] as const;

export const WEIGHT_CLASSES = {
  light: 'خفيف',
  medium_light: 'خفيف متوسط',
  medium_heavy: 'ثقيل متوسط',
  heavy: 'ثقيل',
  super_heavy: 'ثقيل جداً'
};

export const FLOW_MODES = {
  pocket: 'بوكيت',
  soft_overflow: 'تجاوز ناعم',
  hard_overflow: 'تجاوز حاد',
  compressed_pocket: 'بوكيت مضغوط',
  mixed: 'مختلط'
};
