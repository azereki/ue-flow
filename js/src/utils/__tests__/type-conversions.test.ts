import { describe, it, expect } from 'vitest';
import { canImplicitlyConvert, isObjectSubclass } from '../type-conversions';

describe('canImplicitlyConvert', () => {
  it('allows int → real', () => {
    expect(canImplicitlyConvert('int', '', 'real', '')).toBe(true);
  });
  it('allows int → float', () => {
    expect(canImplicitlyConvert('int', '', 'float', '')).toBe(true);
  });
  it('allows byte → int', () => {
    expect(canImplicitlyConvert('byte', '', 'int', '')).toBe(true);
  });
  it('allows name → string', () => {
    expect(canImplicitlyConvert('name', '', 'string', '')).toBe(true);
  });
  it('allows text → string', () => {
    expect(canImplicitlyConvert('text', '', 'string', '')).toBe(true);
  });
  it('rejects string → int', () => {
    expect(canImplicitlyConvert('string', '', 'int', '')).toBe(false);
  });
  it('rejects real → int (no demotion)', () => {
    expect(canImplicitlyConvert('real', '', 'int', '')).toBe(false);
  });
  it('allows object subclass compatibility', () => {
    expect(canImplicitlyConvert('object', 'Character', 'object', 'Actor')).toBe(true);
  });
  it('rejects unrelated object types', () => {
    expect(canImplicitlyConvert('object', 'Actor', 'object', 'Widget')).toBe(false);
  });
});

describe('isObjectSubclass', () => {
  it('Character is subclass of Pawn', () => {
    expect(isObjectSubclass('Character', 'Pawn')).toBe(true);
  });
  it('Character is subclass of Actor', () => {
    expect(isObjectSubclass('Character', 'Actor')).toBe(true);
  });
  it('Actor is not subclass of Character', () => {
    expect(isObjectSubclass('Actor', 'Character')).toBe(false);
  });
  it('same class is compatible', () => {
    expect(isObjectSubclass('Actor', 'Actor')).toBe(true);
  });
  it('handles full paths', () => {
    expect(isObjectSubclass('/Script/Engine.Character', '/Script/Engine.Actor')).toBe(true);
  });
});
