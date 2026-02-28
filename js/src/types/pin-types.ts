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
  name:       '#8b6cc4',
  text:       '#c44d7e',
  object:     '#1296C8',
  class:      '#6a1ec4',
  struct:     '#1a5c8c',
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
