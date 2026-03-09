import { describe, it, expect } from 'vitest';
import { getStructFields, getRegisteredStructs, getStructPath } from '../struct-registry';

describe('struct-registry', () => {
  it('returns fields for FVector by name', () => {
    const fields = getStructFields('FVector');
    expect(fields).toHaveLength(3);
    expect(fields.map(f => f.name)).toEqual(['X', 'Y', 'Z']);
    expect(fields[0].category).toBe('real');
  });

  it('returns fields by path lookup', () => {
    const fields = getStructFields('/Script/CoreUObject.Vector');
    expect(fields).toHaveLength(3);
  });

  it('returns fields by short name (without F prefix)', () => {
    const fields = getStructFields('Vector');
    expect(fields).toHaveLength(3);
  });

  it('returns empty for unknown struct', () => {
    expect(getStructFields('FUnknownStruct')).toEqual([]);
  });

  it('getRegisteredStructs returns all entries', () => {
    const structs = getRegisteredStructs();
    expect(structs.length).toBeGreaterThanOrEqual(12);
    expect(structs).toContain('FVector');
    expect(structs).toContain('FRotator');
    expect(structs).toContain('FHitResult');
  });

  it('getStructPath returns correct path', () => {
    expect(getStructPath('FVector')).toBe('/Script/CoreUObject.Vector');
    expect(getStructPath('FLinearColor')).toBe('/Script/CoreUObject.LinearColor');
  });

  it('FHitResult has expected fields', () => {
    const fields = getStructFields('FHitResult');
    expect(fields.length).toBeGreaterThanOrEqual(10);
    const names = fields.map(f => f.name);
    expect(names).toContain('Location');
    expect(names).toContain('ImpactPoint');
    expect(names).toContain('Distance');
    expect(names).toContain('bBlockingHit');
  });
});
