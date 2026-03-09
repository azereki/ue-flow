export interface PinSig {
  name: string;
  direction: 'input' | 'output';
  category: string;
  subCategory?: string;
  subCategoryObject?: string;
  containerType?: string;
  defaultValue?: string;
  isReference?: boolean;
  isConst?: boolean;
}

export interface FunctionSig {
  memberParent: string;
  memberName: string;
  isPure: boolean;
  isLatent?: boolean;
  pins: PinSig[];
}

export interface SignatureData {
  version: string;
  stats: { classes: number; functions: number; pins: number };
  functions: Record<string, FunctionSig[]>;
}
