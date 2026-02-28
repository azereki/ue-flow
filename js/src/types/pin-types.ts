export type PinCategory =
  | 'exec' | 'bool' | 'real' | 'float' | 'int' | 'byte'
  | 'string' | 'name' | 'text' | 'object' | 'class'
  | 'struct' | 'enum' | 'interface' | 'delegate'
  | 'softclass' | 'softobject' | 'wildcard';

export const PIN_COLORS: Record<PinCategory, string> = {
  exec:       '#b8b8b8',
  bool:       '#8b1a1a',
  real:       '#5b8c3e',
  float:      '#5b8c3e',
  int:        '#1c9e8e',
  byte:       '#006060',
  string:     '#c44dba',
  name:       '#8b6cc4',
  text:       '#c44d7e',
  object:     '#3a6ec4',
  class:      '#6a1ec4',
  struct:     '#1a5c8c',
  enum:       '#006060',
  interface:  '#c4b43a',
  delegate:   '#c4443a',
  softclass:  '#6a1ec4',
  softobject: '#3a6ec4',
  wildcard:   '#808080',
};

export function isExecPin(category: PinCategory): boolean {
  return category === 'exec';
}
