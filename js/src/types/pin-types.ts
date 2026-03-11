export type PinCategory =
  | 'exec' | 'bool' | 'real' | 'float' | 'double' | 'int' | 'int64' | 'byte'
  | 'string' | 'name' | 'text' | 'object' | 'class'
  | 'struct' | 'enum' | 'interface' | 'delegate'
  | 'softclass' | 'softobject' | 'wildcard';

export const PIN_COLORS: Record<PinCategory, string> = {
  exec:       '#FFFFFF',
  bool:       '#8b0000',
  real:       '#00B400',
  float:      '#00B400',
  double:     '#a1ff45',
  int:        '#00CBCB',
  int64:      '#1fe3af',
  byte:       '#005f5f',
  string:     '#FF00FF',
  name:       '#9E77C4',
  text:       '#EA8AC3',
  object:     '#1296C8',
  class:      '#6a1ec4',
  struct:     '#005080',
  enum:       '#00858C',
  interface:  '#c4b43a',
  delegate:   '#c4443a',
  softclass:  '#6a1ec4',
  softobject: '#1296C8',
  wildcard:   '#AAAAAA',
};

export function isExecPin(category: PinCategory): boolean {
  return category === 'exec';
}

/** Extended pin colors for struct sub-types and numeric variants (matches UE5 UGraphEditorSettings). */
const EXTENDED_PIN_COLORS: Record<string, string> = {
  // Numeric sub-types
  'int64':              '#1fe3af',
  'uint64':             '#1fe3af',
  'double':             '#a1ff45',
  // Struct sub-types
  'linearcolor':        '#f0c040',
  'color':              '#f06040',
  'vector':             '#f8d040',
  'vector2d':           '#d8b838',
  'vector4':            '#e8c840',
  'rotator':            '#8cb4e8',
  'transform':          '#e87830',
  'gameplaytag':        '#1898a0',
  'gameplaytagcontainer': '#1898a0',
  'fieldpath':          '#a0a0a0',
};

/** Get the display color for a pin, checking sub-type specializations before falling back to base category. */
export function getExtendedPinColor(pin: { category: PinCategory; subCategory: string; subCategoryObject: string }): string {
  if (pin.subCategoryObject) {
    const objName = pin.subCategoryObject.split('.').pop()?.toLowerCase() ?? '';
    if (EXTENDED_PIN_COLORS[objName]) return EXTENDED_PIN_COLORS[objName];
  }
  if (pin.subCategory) {
    const sub = pin.subCategory.toLowerCase();
    if (EXTENDED_PIN_COLORS[sub]) return EXTENDED_PIN_COLORS[sub];
  }
  return PIN_COLORS[pin.category] ?? '#808080';
}

/** Classify a UE type string (e.g. "Boolean", "Float (double-precision)") into a PinCategory. */
export function classifyPinType(type: string | undefined): PinCategory {
  if (!type) return 'wildcard';
  const t = type.toLowerCase().trim();
  // Exact matches (fast path for common types)
  if (t === 'bool' || t === 'boolean') return 'bool';
  if (t === 'int64') return 'int64';
  if (t === 'double') return 'double';
  if (t === 'int' || t === 'integer') return 'int';
  if (t === 'float') return 'float';
  if (t === 'real') return 'real';
  if (t === 'byte' || t === 'uint8') return 'byte';
  if (t === 'string' || t === 'fstring') return 'string';
  if (t === 'text' || t === 'ftext') return 'text';
  if (t === 'name' || t === 'fname') return 'name';
  // Word-boundary patterns for compound type strings
  if (/\bbool(?:ean)?\b/.test(t)) return 'bool';
  if (/\bint64\b/.test(t)) return 'int64';
  if (/\bdouble\b/.test(t)) return 'double';
  if (/\bfloat\b|\breal\b/.test(t)) return 'float';
  if (/\b(?:int|integer)\b/.test(t)) return 'int';
  if (/\bbyte\b/.test(t)) return 'byte';
  if (/\bstring\b/.test(t)) return 'string';
  if (/\btext\b/.test(t)) return 'text';
  if (/\bname\b/.test(t)) return 'name';
  if (/\bstruct\b|\bvector\b|\brotator\b|\btag\b/.test(t)) return 'struct';
  if (/\benum\b/.test(t)) return 'enum';
  if (/\bdelegate\b/.test(t)) return 'delegate';
  if (/\binterface\b/.test(t)) return 'interface';
  if (/\bclass\b/.test(t)) return 'class';
  if (/\bobject\b/.test(t)) return 'object';
  return 'wildcard';
}
