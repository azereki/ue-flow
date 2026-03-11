import { describe, it, expect } from 'vitest';
import { canConnect } from '../connection-validator';
import type { UEPin } from '../../types/ue-graph';

function pin(overrides: Partial<UEPin>): UEPin {
  return {
    id: 'test', name: 'test', friendlyName: 'test',
    direction: 'output', category: 'exec',
    subCategory: '', subCategoryObject: '', containerType: '',
    defaultValue: '', isReference: false, isConst: false,
    isWeak: false, hidden: false, advancedView: false,
    ...overrides,
  };
}

describe('canConnect', () => {
  it('allows output → input of same category', () => {
    const src = pin({ id: 'src', direction: 'output', category: 'exec' });
    const tgt = pin({ id: 'tgt', direction: 'input', category: 'exec' });
    expect(canConnect(src, tgt, 'n1', 'n2').valid).toBe(true);
  });

  it('rejects same direction', () => {
    const src = pin({ id: 'src', direction: 'output', category: 'exec' });
    const tgt = pin({ id: 'tgt', direction: 'output', category: 'exec' });
    expect(canConnect(src, tgt, 'n1', 'n2').valid).toBe(false);
  });

  it('rejects incompatible categories', () => {
    const src = pin({ id: 'src', direction: 'output', category: 'bool' });
    const tgt = pin({ id: 'tgt', direction: 'input', category: 'string' });
    expect(canConnect(src, tgt, 'n1', 'n2').valid).toBe(false);
  });

  it('allows float ↔ real compatibility', () => {
    const src = pin({ id: 'src', direction: 'output', category: 'float' });
    const tgt = pin({ id: 'tgt', direction: 'input', category: 'real' });
    expect(canConnect(src, tgt, 'n1', 'n2').valid).toBe(true);
  });

  it('allows wildcard connections', () => {
    const src = pin({ id: 'src', direction: 'output', category: 'wildcard' });
    const tgt = pin({ id: 'tgt', direction: 'input', category: 'string' });
    expect(canConnect(src, tgt, 'n1', 'n2').valid).toBe(true);
  });

  it('rejects self-connections', () => {
    const src = pin({ id: 'src', direction: 'output', category: 'exec' });
    const tgt = pin({ id: 'tgt', direction: 'input', category: 'exec' });
    expect(canConnect(src, tgt, 'n1', 'n1').valid).toBe(false);
  });

  it('rejects duplicate edges', () => {
    const src = pin({ id: 'src', direction: 'output', category: 'exec' });
    const tgt = pin({ id: 'tgt', direction: 'input', category: 'exec' });
    const existing = [{ source: 'n1', sourceHandle: 'src', target: 'n2', targetHandle: 'tgt' }];
    expect(canConnect(src, tgt, 'n1', 'n2', existing).valid).toBe(false);
  });

  it('replaces existing exec output connection', () => {
    const src = pin({ id: 'execOut', direction: 'output', category: 'exec' });
    const tgt = pin({ id: 'execIn', direction: 'input', category: 'exec' });
    const existing = [{ source: 'n1', sourceHandle: 'execOut', target: 'n2', targetHandle: 'oldIn' }];
    const result = canConnect(src, tgt, 'n1', 'n3', existing);
    expect(result.valid).toBe(true);
    expect(result.replaces).toEqual({ source: 'n1', sourceHandle: 'execOut', target: 'n2', targetHandle: 'oldIn' });
  });

  it('does not replace when exec output has no existing connection', () => {
    const src = pin({ id: 'execOut', direction: 'output', category: 'exec' });
    const tgt = pin({ id: 'execIn', direction: 'input', category: 'exec' });
    const result = canConnect(src, tgt, 'n1', 'n2', []);
    expect(result.valid).toBe(true);
    expect(result.replaces).toBeUndefined();
  });

  // Implicit type conversions (Wave 3A)
  it('allows int → real implicit conversion', () => {
    const src = pin({ id: 'src', direction: 'output', category: 'int' });
    const tgt = pin({ id: 'tgt', direction: 'input', category: 'real' });
    expect(canConnect(src, tgt, 'n1', 'n2').valid).toBe(true);
  });

  it('allows byte → int implicit conversion', () => {
    const src = pin({ id: 'src', direction: 'output', category: 'byte' });
    const tgt = pin({ id: 'tgt', direction: 'input', category: 'int' });
    expect(canConnect(src, tgt, 'n1', 'n2').valid).toBe(true);
  });

  it('allows name → string implicit conversion', () => {
    const src = pin({ id: 'src', direction: 'output', category: 'name' });
    const tgt = pin({ id: 'tgt', direction: 'input', category: 'string' });
    expect(canConnect(src, tgt, 'n1', 'n2').valid).toBe(true);
  });

  // Enum validation (Wave 3B)
  it('rejects mismatched enum types', () => {
    const src = pin({ id: 'src', direction: 'output', category: 'enum', subCategoryObject: 'EMovementMode' });
    const tgt = pin({ id: 'tgt', direction: 'input', category: 'enum', subCategoryObject: 'ECollisionChannel' });
    expect(canConnect(src, tgt, 'n1', 'n2').valid).toBe(false);
  });

  it('allows matching enum types', () => {
    const src = pin({ id: 'src', direction: 'output', category: 'enum', subCategoryObject: 'EMovementMode' });
    const tgt = pin({ id: 'tgt', direction: 'input', category: 'enum', subCategoryObject: 'EMovementMode' });
    expect(canConnect(src, tgt, 'n1', 'n2').valid).toBe(true);
  });

  it('does not replace for data pin connections', () => {
    const src = pin({ id: 'dataOut', direction: 'output', category: 'real' });
    const tgt = pin({ id: 'dataIn', direction: 'input', category: 'real' });
    const existing = [{ source: 'n1', sourceHandle: 'dataOut', target: 'n2', targetHandle: 'oldIn' }];
    const result = canConnect(src, tgt, 'n1', 'n3', existing);
    expect(result.valid).toBe(true);
    expect(result.replaces).toBeUndefined();
  });

  // ─── Additional edge case tests ──────────────────────────────────────────

  it('allows int → float implicit conversion', () => {
    const src = pin({ id: 'src', direction: 'output', category: 'int' });
    const tgt = pin({ id: 'tgt', direction: 'input', category: 'float' });
    expect(canConnect(src, tgt, 'n1', 'n2').valid).toBe(true);
  });

  it('allows int → double implicit conversion', () => {
    const src = pin({ id: 'src', direction: 'output', category: 'int' });
    const tgt = pin({ id: 'tgt', direction: 'input', category: 'double' });
    expect(canConnect(src, tgt, 'n1', 'n2').valid).toBe(true);
  });

  it('allows float → double implicit conversion', () => {
    const src = pin({ id: 'src', direction: 'output', category: 'float' });
    const tgt = pin({ id: 'tgt', direction: 'input', category: 'double' });
    expect(canConnect(src, tgt, 'n1', 'n2').valid).toBe(true);
  });

  it('allows int64 → double implicit conversion', () => {
    const src = pin({ id: 'src', direction: 'output', category: 'int64' });
    const tgt = pin({ id: 'tgt', direction: 'input', category: 'double' });
    expect(canConnect(src, tgt, 'n1', 'n2').valid).toBe(true);
  });

  it('allows wildcard input to connect to any data type', () => {
    const src = pin({ id: 'src', direction: 'output', category: 'int' });
    const tgt = pin({ id: 'tgt', direction: 'input', category: 'wildcard' });
    expect(canConnect(src, tgt, 'n1', 'n2').valid).toBe(true);
  });

  it('rejects mismatched struct subCategoryObject', () => {
    const src = pin({ id: 'src', direction: 'output', category: 'struct', subCategoryObject: '/Script/CoreUObject.Vector' });
    const tgt = pin({ id: 'tgt', direction: 'input', category: 'struct', subCategoryObject: '/Script/CoreUObject.Rotator' });
    expect(canConnect(src, tgt, 'n1', 'n2').valid).toBe(false);
  });

  it('allows matching struct subCategoryObject', () => {
    const src = pin({ id: 'src', direction: 'output', category: 'struct', subCategoryObject: '/Script/CoreUObject.Vector' });
    const tgt = pin({ id: 'tgt', direction: 'input', category: 'struct', subCategoryObject: '/Script/CoreUObject.Vector' });
    expect(canConnect(src, tgt, 'n1', 'n2').valid).toBe(true);
  });

  it('replaces existing data input connection (auto-replace)', () => {
    const src = pin({ id: 'dataOut', direction: 'output', category: 'real' });
    const tgt = pin({ id: 'dataIn', direction: 'input', category: 'real' });
    const existing = [{ source: 'n0', sourceHandle: 'otherOut', target: 'n2', targetHandle: 'dataIn' }];
    const result = canConnect(src, tgt, 'n1', 'n2', existing);
    expect(result.valid).toBe(true);
    expect(result.replaces).toEqual({ source: 'n0', sourceHandle: 'otherOut', target: 'n2', targetHandle: 'dataIn' });
  });
});
