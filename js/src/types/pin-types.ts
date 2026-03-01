export type PinCategory =
  | 'exec' | 'bool' | 'real' | 'float' | 'int' | 'byte'
  | 'string' | 'name' | 'text' | 'object' | 'class'
  | 'struct' | 'enum' | 'interface' | 'delegate'
  | 'softclass' | 'softobject' | 'wildcard';

export const PIN_COLORS: Record<PinCategory, string> = {
  exec:       '#FFFFFF',
  bool:       '#8b0000',
  real:       '#00B400',
  float:      '#00B400',
  int:        '#00CBCB',
  byte:       '#006060',
  string:     '#FF00FF',
  name:       '#9E77C4',
  text:       '#EA8AC3',
  object:     '#1296C8',
  class:      '#6a1ec4',
  struct:     '#003259',
  enum:       '#006060',
  interface:  '#c4b43a',
  delegate:   '#c4443a',
  softclass:  '#6a1ec4',
  softobject: '#1296C8',
  wildcard:   '#AAAAAA',
};

export function isExecPin(category: PinCategory): boolean {
  return category === 'exec';
}

/** Classify a UE type string (e.g. "Boolean", "Float (double-precision)") into a PinCategory. */
export function classifyPinType(type: string | undefined): PinCategory {
  if (!type) return 'wildcard';
  const t = type.toLowerCase();
  if (t.includes('bool')) return 'bool';
  if (t.includes('float') || t.includes('real') || t.includes('double')) return 'float';
  if (t.includes('int') && !t.includes('interface')) return 'int';
  if (t.includes('byte')) return 'byte';
  if (t.includes('string') || t.includes('text')) return 'string';
  if (t.includes('name')) return 'name';
  if (t.includes('struct') || t.includes('vector') || t.includes('rotator') || t.includes('tag')) return 'struct';
  if (t.includes('enum')) return 'enum';
  if (t.includes('delegate')) return 'delegate';
  if (t.includes('class')) return 'class';
  if (t.includes('interface')) return 'interface';
  if (t.includes('object')) return 'object';
  return 'wildcard';
}
