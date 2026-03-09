/**
 * Post-generation graph validator.
 *
 * Uses the signature DB to auto-correct AI-generated Blueprint graphs:
 * - Fixes wrong memberParent in properties
 * - Corrects pin categories/types
 * - Fills missing pin defaults and subCategoryObject
 * - Adds missing required pins from the known signature
 * - Preserves extra AI-added pins (dynamic pins are valid in UE)
 */
import type { UEGraphJSON, UENode, UEPin } from '../types/ue-graph';
import type { PinCategory } from '../types/pin-types';
import { lookupFunction } from './signature-db';

/** Generate a random 32-char uppercase hex GUID for synthesized pins. */
function generatePinGuid(): string {
  const hex = '0123456789ABCDEF';
  let guid = '';
  for (let i = 0; i < 32; i++) guid += hex[Math.floor(Math.random() * 16)];
  return guid;
}

// Category aliases the AI commonly gets wrong
const CATEGORY_ALIASES: Record<string, string> = {
  float: 'real',
  double: 'real',
  boolean: 'bool',
  integer: 'int',
  str: 'string',
};

function normalizeCategory(cat: string): string {
  return CATEGORY_ALIASES[cat.toLowerCase()] ?? cat;
}

/** Extract memberName from a FunctionReference or EventReference property string. */
function extractMemberRef(props: Record<string, unknown>): {
  memberName?: string;
  memberParent?: string;
  refKey?: string;
} {
  for (const key of ['FunctionReference', 'EventReference']) {
    const val = String(props[key] ?? '');
    if (!val || val === 'undefined') continue;
    const nameMatch = val.match(/MemberName="([^"]+)"/);
    const parentMatch = val.match(/MemberParent="([^"]+)"/);
    return {
      memberName: nameMatch?.[1],
      memberParent: parentMatch?.[1],
      refKey: key,
    };
  }
  return {};
}

export interface ValidationResult {
  graph: UEGraphJSON;
  corrections: string[];
  warnings: string[];
}

export function validateGeneratedGraph(graph: UEGraphJSON): ValidationResult {
  const corrections: string[] = [];
  const warnings: string[] = [];
  const validatedNodes: UENode[] = [];

  for (const node of graph.nodes) {
    const { memberName, memberParent, refKey } = extractMemberRef(node.properties);

    if (!memberName) {
      validatedNodes.push(node);
      continue;
    }

    const sig = lookupFunction(memberName, memberParent);
    if (!sig) {
      // Try without parent (may be wrong parent)
      const sigAny = lookupFunction(memberName);
      if (!sigAny) {
        warnings.push(`Unknown function: ${memberName} (node "${node.title}")`);
        validatedNodes.push(node);
        continue;
      }
      // Found with different parent — use it
      corrections.push(
        `Fixed memberParent for ${memberName}: ${memberParent} → ${sigAny.memberParent}`,
      );
      const newProps = { ...node.properties };
      if (refKey) {
        newProps[refKey] = `(MemberParent="${sigAny.memberParent}",MemberName="${sigAny.memberName}")`;
      }
      let validated = validatePins({ ...node, properties: newProps }, sigAny.pins, corrections);
      validated = ensureExecPins(validated, sigAny.isPure, corrections);
      validatedNodes.push(validated);
      continue;
    }

    // memberParent may be wrong even if function was found
    if (memberParent && memberParent !== sig.memberParent) {
      corrections.push(
        `Fixed memberParent for ${memberName}: ${memberParent} → ${sig.memberParent}`,
      );
      const newProps = { ...node.properties };
      if (refKey) {
        newProps[refKey] = `(MemberParent="${sig.memberParent}",MemberName="${sig.memberName}")`;
      }
      let validated = validatePins({ ...node, properties: newProps }, sig.pins, corrections);
      validated = ensureExecPins(validated, sig.isPure, corrections);
      validatedNodes.push(validated);
    } else {
      let validated = validatePins(node, sig.pins, corrections);
      validated = ensureExecPins(validated, sig.isPure, corrections);
      validatedNodes.push(validated);
    }
  }

  return {
    graph: { ...graph, nodes: validatedNodes },
    corrections,
    warnings,
  };
}

/** Validate and correct pins against the known signature. */
function validatePins(
  node: UENode,
  sigPins: Array<{ name: string; direction: string; category: string; subCategory?: string; subCategoryObject?: string; defaultValue?: string }>,
  corrections: string[],
): UENode {
  const correctedPins = [...node.pins];
  const existingPinNames = new Set(correctedPins.map((p) => p.name.toLowerCase()));

  for (let i = 0; i < correctedPins.length; i++) {
    const pin = correctedPins[i];
    // Find matching signature pin by name
    const sigPin = sigPins.find(
      (sp) => sp.name.toLowerCase() === pin.name.toLowerCase() && sp.direction === pin.direction,
    );
    if (!sigPin) continue;

    let modified = false;
    const updates: Partial<UEPin> = {};

    // Fix category
    const normalizedCat = normalizeCategory(pin.category);
    if (normalizedCat !== pin.category) {
      updates.category = normalizedCat as PinCategory;
      corrections.push(`Fixed pin "${pin.name}" category: ${pin.category} → ${normalizedCat} (node "${node.title}")`);
      modified = true;
    }
    if (sigPin.category && normalizeCategory(sigPin.category) !== normalizedCat) {
      const sigCat = normalizeCategory(sigPin.category);
      updates.category = sigCat as PinCategory;
      corrections.push(`Fixed pin "${pin.name}" category: ${pin.category} → ${sigCat} (node "${node.title}")`);
      modified = true;
    }

    // Fill missing subCategoryObject
    if (!pin.subCategoryObject && sigPin.subCategoryObject) {
      updates.subCategoryObject = sigPin.subCategoryObject;
      modified = true;
    }

    // Fill missing defaultValue
    if (!pin.defaultValue && sigPin.defaultValue) {
      updates.defaultValue = sigPin.defaultValue;
      modified = true;
    }

    // Fill missing subCategory
    if (!pin.subCategory && sigPin.subCategory) {
      updates.subCategory = sigPin.subCategory;
      modified = true;
    }

    if (modified) {
      correctedPins[i] = { ...pin, ...updates };
    }
  }

  // Add missing required pins from signature (non-exec pins only)
  for (const sigPin of sigPins) {
    if (existingPinNames.has(sigPin.name.toLowerCase())) continue;
    // Don't add exec pins (they're structural, AI should have them)
    if (sigPin.category === 'exec') continue;

    corrections.push(`Added missing pin "${sigPin.name}" to node "${node.title}"`);
    correctedPins.push({
      id: generatePinGuid(),
      name: sigPin.name,
      friendlyName: sigPin.name,
      direction: sigPin.direction as 'input' | 'output',
      category: normalizeCategory(sigPin.category) as PinCategory,
      subCategory: sigPin.subCategory ?? '',
      subCategoryObject: sigPin.subCategoryObject ?? '',
      containerType: '' as const,
      defaultValue: sigPin.defaultValue ?? '',
      isReference: false,
      isConst: false,
      isWeak: false,
      hidden: false,
      advancedView: false,
    });
  }

  return { ...node, pins: correctedPins };
}

/** Ensure impure functions have exec input/output pins. */
function ensureExecPins(
  node: UENode,
  isPure: boolean,
  corrections: string[],
): UENode {
  if (isPure) return node;
  const pins = [...node.pins];
  const hasExecIn = pins.some((p) => p.category === 'exec' && p.direction === 'input');
  const hasExecOut = pins.some((p) => p.category === 'exec' && p.direction === 'output');

  if (hasExecIn && hasExecOut) return node;

  if (!hasExecIn) {
    pins.unshift({
      id: generatePinGuid(),
      name: 'execute',
      friendlyName: 'execute',
      direction: 'input',
      category: 'exec' as PinCategory,
      subCategory: '',
      subCategoryObject: '',
      containerType: '' as const,
      defaultValue: '',
      isReference: false,
      isConst: false,
      isWeak: false,
      hidden: false,
      advancedView: false,
    });
    corrections.push(`Added missing exec input pin to node "${node.title}"`);
  }

  if (!hasExecOut) {
    // Insert after the exec input pin
    const execInIdx = pins.findIndex((p) => p.category === 'exec' && p.direction === 'input');
    pins.splice(execInIdx + 1, 0, {
      id: generatePinGuid(),
      name: 'then',
      friendlyName: 'then',
      direction: 'output',
      category: 'exec' as PinCategory,
      subCategory: '',
      subCategoryObject: '',
      containerType: '' as const,
      defaultValue: '',
      isReference: false,
      isConst: false,
      isWeak: false,
      hidden: false,
      advancedView: false,
    });
    corrections.push(`Added missing exec output pin to node "${node.title}"`);
  }

  return { ...node, pins };
}
