/**
 * Shared UE reference maps for property synthesis.
 *
 * Used by both flow-to-t3d.ts (export-time synthesis) and ai-generate.ts
 * (generation-time normalization) to ensure nodes carry correct UE properties.
 */
import { lookupFunction } from './signature-db';

// ---------------------------------------------------------------------------
// nodeClass full-path prefix map — UE requires the full /Script/... path
// ---------------------------------------------------------------------------

export const CLASS_PREFIX_MAP: Record<string, string> = {
  K2Node_Event: '/Script/BlueprintGraph.K2Node_Event',
  K2Node_CustomEvent: '/Script/BlueprintGraph.K2Node_CustomEvent',
  K2Node_CallFunction: '/Script/BlueprintGraph.K2Node_CallFunction',
  K2Node_IfThenElse: '/Script/BlueprintGraph.K2Node_IfThenElse',
  K2Node_VariableGet: '/Script/BlueprintGraph.K2Node_VariableGet',
  K2Node_VariableSet: '/Script/BlueprintGraph.K2Node_VariableSet',
  K2Node_MacroInstance: '/Script/BlueprintGraph.K2Node_MacroInstance',
  K2Node_Tunnel: '/Script/BlueprintGraph.K2Node_Tunnel',
  K2Node_Knot: '/Script/BlueprintGraph.K2Node_Knot',
  K2Node_FunctionEntry: '/Script/BlueprintGraph.K2Node_FunctionEntry',
  K2Node_FunctionResult: '/Script/BlueprintGraph.K2Node_FunctionResult',
  K2Node_DynamicCast: '/Script/BlueprintGraph.K2Node_DynamicCast',
  K2Node_ClassDynamicCast: '/Script/BlueprintGraph.K2Node_ClassDynamicCast',
  K2Node_Select: '/Script/BlueprintGraph.K2Node_Select',
  K2Node_MakeArray: '/Script/BlueprintGraph.K2Node_MakeArray',
  K2Node_SwitchEnum: '/Script/BlueprintGraph.K2Node_SwitchEnum',
  K2Node_SwitchInteger: '/Script/BlueprintGraph.K2Node_SwitchInteger',
  K2Node_SwitchString: '/Script/BlueprintGraph.K2Node_SwitchString',
  K2Node_ExecutionSequence: '/Script/BlueprintGraph.K2Node_ExecutionSequence',
  K2Node_ForEachLoop: '/Script/BlueprintGraph.K2Node_ForEachLoop',
  K2Node_Timeline: '/Script/BlueprintGraph.K2Node_Timeline',
  K2Node_SpawnActorFromClass: '/Script/BlueprintGraph.K2Node_SpawnActorFromClass',
  K2Node_PromotableOperator: '/Script/BlueprintGraph.K2Node_PromotableOperator',
  K2Node_CommutativeAssociativeBinaryOperator: '/Script/BlueprintGraph.K2Node_CommutativeAssociativeBinaryOperator',
  K2Node_DoOnce: '/Script/BlueprintGraph.K2Node_DoOnce',
  K2Node_Gate: '/Script/BlueprintGraph.K2Node_Gate',
  K2Node_FlipFlop: '/Script/BlueprintGraph.K2Node_FlipFlop',
  K2Node_MultiGate: '/Script/BlueprintGraph.K2Node_MultiGate',
  K2Node_Delay: '/Script/BlueprintGraph.K2Node_Delay',
  K2Node_Self: '/Script/BlueprintGraph.K2Node_Self',
  K2Node_CallDelegate: '/Script/BlueprintGraph.K2Node_CallDelegate',
  K2Node_AddDelegate: '/Script/BlueprintGraph.K2Node_AddDelegate',
  K2Node_RemoveDelegate: '/Script/BlueprintGraph.K2Node_RemoveDelegate',
  K2Node_ComponentBoundEvent: '/Script/BlueprintGraph.K2Node_ComponentBoundEvent',
  K2Node_EnhancedInputAction: '/Script/EnhancedInput.K2Node_EnhancedInputAction',
  EdGraphNode_Comment: '/Script/UnrealEd.EdGraphNode_Comment',
};

// ---------------------------------------------------------------------------
// Event title → EventReference mapping for engine events
// ---------------------------------------------------------------------------

interface MemberRef { memberParent: string; memberName: string }

export const EVENT_REFERENCE_MAP: Record<string, MemberRef> = {
  'Event BeginPlay': { memberParent: '/Script/Engine.Actor', memberName: 'ReceiveBeginPlay' },
  'Event ReceiveBeginPlay': { memberParent: '/Script/Engine.Actor', memberName: 'ReceiveBeginPlay' },
  'Event Tick': { memberParent: '/Script/Engine.Actor', memberName: 'ReceiveTick' },
  'Event ReceiveTick': { memberParent: '/Script/Engine.Actor', memberName: 'ReceiveTick' },
  'Event ActorBeginOverlap': { memberParent: '/Script/Engine.Actor', memberName: 'ReceiveActorBeginOverlap' },
  'Event ReceiveActorBeginOverlap': { memberParent: '/Script/Engine.Actor', memberName: 'ReceiveActorBeginOverlap' },
  'Event ActorEndOverlap': { memberParent: '/Script/Engine.Actor', memberName: 'ReceiveActorEndOverlap' },
  'Event ReceiveActorEndOverlap': { memberParent: '/Script/Engine.Actor', memberName: 'ReceiveActorEndOverlap' },
  'Event AnyDamage': { memberParent: '/Script/Engine.Actor', memberName: 'ReceiveAnyDamage' },
  'Event ReceiveAnyDamage': { memberParent: '/Script/Engine.Actor', memberName: 'ReceiveAnyDamage' },
  'Event Hit': { memberParent: '/Script/Engine.Actor', memberName: 'ReceiveHit' },
  'Event ReceiveHit': { memberParent: '/Script/Engine.Actor', memberName: 'ReceiveHit' },
  'Event Destroyed': { memberParent: '/Script/Engine.Actor', memberName: 'ReceiveDestroyed' },
  'Event ReceiveDestroyed': { memberParent: '/Script/Engine.Actor', memberName: 'ReceiveDestroyed' },
  'Event EndPlay': { memberParent: '/Script/Engine.Actor', memberName: 'ReceiveEndPlay' },
  'Event ReceiveEndPlay': { memberParent: '/Script/Engine.Actor', memberName: 'ReceiveEndPlay' },
  'Event Construct': { memberParent: '/Script/Engine.UserWidget', memberName: 'Construct' },
  'Event Destruct': { memberParent: '/Script/Engine.UserWidget', memberName: 'Destruct' },
  'Event OnReset': { memberParent: '/Script/Engine.Actor', memberName: 'ReceiveOnReset' },
};

// ---------------------------------------------------------------------------
// Known function title → FunctionReference mapping
// ---------------------------------------------------------------------------

export const FUNCTION_REFERENCE_MAP: Record<string, MemberRef> = {
  // Engine functions
  'Print String': { memberParent: '/Script/Engine.KismetSystemLibrary', memberName: 'PrintString' },
  'PrintString': { memberParent: '/Script/Engine.KismetSystemLibrary', memberName: 'PrintString' },
  'Delay': { memberParent: '/Script/Engine.KismetSystemLibrary', memberName: 'Delay' },
  'DestroyActor': { memberParent: '/Script/Engine.Actor', memberName: 'K2_DestroyActor' },
  'Destroy Actor': { memberParent: '/Script/Engine.Actor', memberName: 'K2_DestroyActor' },
  'SetActorLocation': { memberParent: '/Script/Engine.Actor', memberName: 'K2_SetActorLocation' },
  'GetActorLocation': { memberParent: '/Script/Engine.Actor', memberName: 'K2_GetActorLocation' },
  'SetActorRotation': { memberParent: '/Script/Engine.Actor', memberName: 'K2_SetActorRotation' },
  'GetActorRotation': { memberParent: '/Script/Engine.Actor', memberName: 'K2_GetActorRotation' },
  'SpawnActor': { memberParent: '/Script/Engine.GameplayStatics', memberName: 'BeginDeferredActorSpawnFromClass' },
  'SetTimer': { memberParent: '/Script/Engine.KismetSystemLibrary', memberName: 'K2_SetTimer' },
  'SetTimerByEvent': { memberParent: '/Script/Engine.KismetSystemLibrary', memberName: 'K2_SetTimerByEvent' },
  'ClearTimer': { memberParent: '/Script/Engine.KismetSystemLibrary', memberName: 'K2_ClearTimer' },
  'IsValid': { memberParent: '/Script/Engine.KismetSystemLibrary', memberName: 'IsValid' },
  'GetPlayerController': { memberParent: '/Script/Engine.GameplayStatics', memberName: 'GetPlayerController' },
  'GetPlayerCharacter': { memberParent: '/Script/Engine.GameplayStatics', memberName: 'GetPlayerCharacter' },
  'GetGameMode': { memberParent: '/Script/Engine.GameplayStatics', memberName: 'GetGameMode' },
  'GetWorldDeltaSeconds': { memberParent: '/Script/Engine.GameplayStatics', memberName: 'GetWorldDeltaSeconds' },
  // Component functions
  'Set Static Mesh': { memberParent: '/Script/Engine.StaticMeshComponent', memberName: 'SetStaticMesh' },
  'Set Material': { memberParent: '/Script/Engine.PrimitiveComponent', memberName: 'SetMaterial' },
};

// ---------------------------------------------------------------------------
// Math operator title → FunctionReference mapping
// ---------------------------------------------------------------------------

export const MATH_FUNCTION_MAP: Record<string, MemberRef> = {
  // Integer math
  'Add': { memberParent: '/Script/Engine.KismetMathLibrary', memberName: 'Add_IntInt' },
  'Subtract': { memberParent: '/Script/Engine.KismetMathLibrary', memberName: 'Subtract_IntInt' },
  'Multiply': { memberParent: '/Script/Engine.KismetMathLibrary', memberName: 'Multiply_IntInt' },
  'Divide': { memberParent: '/Script/Engine.KismetMathLibrary', memberName: 'Divide_IntInt' },
  // Float math
  'float + float': { memberParent: '/Script/Engine.KismetMathLibrary', memberName: 'Add_FloatFloat' },
  'float - float': { memberParent: '/Script/Engine.KismetMathLibrary', memberName: 'Subtract_FloatFloat' },
  'float * float': { memberParent: '/Script/Engine.KismetMathLibrary', memberName: 'Multiply_FloatFloat' },
  'float / float': { memberParent: '/Script/Engine.KismetMathLibrary', memberName: 'Divide_FloatFloat' },
  'Float + Float': { memberParent: '/Script/Engine.KismetMathLibrary', memberName: 'Add_FloatFloat' },
  'Float - Float': { memberParent: '/Script/Engine.KismetMathLibrary', memberName: 'Subtract_FloatFloat' },
  'Float * Float': { memberParent: '/Script/Engine.KismetMathLibrary', memberName: 'Multiply_FloatFloat' },
  'Float / Float': { memberParent: '/Script/Engine.KismetMathLibrary', memberName: 'Divide_FloatFloat' },
  // Comparison (with operator symbols)
  '> (Greater Than)': { memberParent: '/Script/Engine.KismetMathLibrary', memberName: 'Greater_FloatFloat' },
  '< (Less Than)': { memberParent: '/Script/Engine.KismetMathLibrary', memberName: 'Less_FloatFloat' },
  '>= (Greater Equal)': { memberParent: '/Script/Engine.KismetMathLibrary', memberName: 'GreaterEqual_FloatFloat' },
  '<= (Less Equal)': { memberParent: '/Script/Engine.KismetMathLibrary', memberName: 'LessEqual_FloatFloat' },
  '== (Equal)': { memberParent: '/Script/Engine.KismetMathLibrary', memberName: 'EqualEqual_FloatFloat' },
  '!= (Not Equal)': { memberParent: '/Script/Engine.KismetMathLibrary', memberName: 'NotEqual_FloatFloat' },
  // Comparison (short names)
  'Greater': { memberParent: '/Script/Engine.KismetMathLibrary', memberName: 'Greater_FloatFloat' },
  'Less': { memberParent: '/Script/Engine.KismetMathLibrary', memberName: 'Less_FloatFloat' },
  'Greater Equal': { memberParent: '/Script/Engine.KismetMathLibrary', memberName: 'GreaterEqual_FloatFloat' },
  'Less Equal': { memberParent: '/Script/Engine.KismetMathLibrary', memberName: 'LessEqual_FloatFloat' },
  'Equal': { memberParent: '/Script/Engine.KismetMathLibrary', memberName: 'EqualEqual_FloatFloat' },
  'Not Equal': { memberParent: '/Script/Engine.KismetMathLibrary', memberName: 'NotEqual_FloatFloat' },
  // Vector math
  'Vector + Vector': { memberParent: '/Script/Engine.KismetMathLibrary', memberName: 'Add_VectorVector' },
  'Vector - Vector': { memberParent: '/Script/Engine.KismetMathLibrary', memberName: 'Subtract_VectorVector' },
  'Vector * float': { memberParent: '/Script/Engine.KismetMathLibrary', memberName: 'Multiply_VectorFloat' },
  // Common math functions
  'Clamp': { memberParent: '/Script/Engine.KismetMathLibrary', memberName: 'Clamp' },
  'Clamp (float)': { memberParent: '/Script/Engine.KismetMathLibrary', memberName: 'FClamp' },
  'Abs': { memberParent: '/Script/Engine.KismetMathLibrary', memberName: 'Abs' },
  'Min': { memberParent: '/Script/Engine.KismetMathLibrary', memberName: 'Min' },
  'Max': { memberParent: '/Script/Engine.KismetMathLibrary', memberName: 'Max' },
  'FClamp': { memberParent: '/Script/Engine.KismetMathLibrary', memberName: 'FClamp' },
  'Lerp': { memberParent: '/Script/Engine.KismetMathLibrary', memberName: 'Lerp' },
  'Normalize': { memberParent: '/Script/Engine.KismetMathLibrary', memberName: 'Normal' },
};

// ---------------------------------------------------------------------------
// Synthesis helpers
// ---------------------------------------------------------------------------

/**
 * Synthesize missing UE properties for a node based on its class and title.
 * Used by both T3D export (flow-to-t3d.ts) and AI generation normalization.
 */
export function synthesizeNodeProperties(
  nodeClass: string,
  title: string,
  existingProps: Record<string, unknown>,
): Record<string, unknown> {
  const props = { ...existingProps };
  const shortClass = nodeClass.includes('.')
    ? nodeClass.split('.').pop()!
    : nodeClass;

  // Events need EventReference + bOverrideFunction
  if (shortClass === 'K2Node_Event' && !props['EventReference']) {
    const eventRef = EVENT_REFERENCE_MAP[title];
    if (eventRef) {
      props['EventReference'] = `(MemberParent="${eventRef.memberParent}",MemberName="${eventRef.memberName}")`;
      if (!props['bOverrideFunction']) {
        props['bOverrideFunction'] = 'True';
      }
    }
  }

  // Function calls need FunctionReference
  if (shortClass === 'K2Node_CallFunction' && !props['FunctionReference']) {
    const funcRef = FUNCTION_REFERENCE_MAP[title];
    if (funcRef) {
      props['FunctionReference'] = `(MemberParent="${funcRef.memberParent}",MemberName="${funcRef.memberName}")`;
    }
  }

  // Variable get/set need VariableReference
  if ((shortClass === 'K2Node_VariableGet' || shortClass === 'K2Node_VariableSet') && !props['VariableReference']) {
    const varName = shortClass === 'K2Node_VariableSet'
      ? title.replace(/^Set\s+/, '')
      : title;
    if (varName) {
      props['VariableReference'] = `(MemberName="${varName}",bSelfContext=True)`;
    }
  }

  // Promotable operators (math) need FunctionReference
  if ((shortClass === 'K2Node_PromotableOperator' || shortClass === 'K2Node_CommutativeAssociativeBinaryOperator')
      && !props['FunctionReference']) {
    const mathRef = MATH_FUNCTION_MAP[title];
    if (mathRef) {
      props['FunctionReference'] = `(MemberParent="${mathRef.memberParent}",MemberName="${mathRef.memberName}")`;
    }
  }

  // MacroInstance needs MacroGraphReference
  if (shortClass === 'K2Node_MacroInstance' && !props['MacroGraphReference']) {
    const macroMap: Record<string, string> = {
      'For Loop': 'ForLoop',
      'ForLoop': 'ForLoop',
      'For Loop With Break': 'ForLoopWithBreak',
      'ForLoopWithBreak': 'ForLoopWithBreak',
      'While Loop': 'WhileLoop',
      'WhileLoop': 'WhileLoop',
      'Do N': 'DoN',
      'Do Once': 'DoOnce',
      'IsValid': 'IsValid',
    };
    const macroName = macroMap[title] ?? title;
    props['MacroGraphReference'] = `(MacroGraph="/Script/Engine.EdGraph'/Engine/EditorBlueprintResources/StandardMacros.StandardMacros:${macroName}'")`;
  }

  // Timeline needs TimelineName
  if (shortClass === 'K2Node_Timeline' && !props['TimelineName']) {
    props['TimelineName'] = title.replace(/^Timeline\s*[-:]?\s*/, '') || 'Timeline_0';
  }

  // ComponentBoundEvent needs DelegatePropertyName
  if (shortClass === 'K2Node_ComponentBoundEvent' && !props['DelegatePropertyName']) {
    const delegateMap: Record<string, string> = {
      'Component Begin Overlap': 'OnComponentBeginOverlap',
      'OnComponentBeginOverlap': 'OnComponentBeginOverlap',
      'Component End Overlap': 'OnComponentEndOverlap',
      'OnComponentEndOverlap': 'OnComponentEndOverlap',
      'Component Hit': 'OnComponentHit',
      'OnComponentHit': 'OnComponentHit',
    };
    const delegateName = delegateMap[title];
    if (delegateName) {
      props['DelegatePropertyName'] = delegateName;
    }
  }

  // FunctionEntry needs SignatureName
  if (shortClass === 'K2Node_FunctionEntry' && !props['SignatureName']) {
    if (title && title !== 'Function Entry') {
      props['SignatureName'] = title;
    }
  }

  return props;
}

/**
 * Enhanced synthesis using the signature DB as fallback.
 * First tries hardcoded maps (fast, always available), then falls back
 * to the lazy-loaded signature DB for ~2,700+ additional functions.
 */
export function synthesizeNodePropertiesWithDB(
  nodeClass: string,
  title: string,
  existingProps: Record<string, unknown>,
): Record<string, unknown> {
  // First: try hardcoded maps
  const props = synthesizeNodeProperties(nodeClass, title, existingProps);
  const shortClass = nodeClass.includes('.') ? nodeClass.split('.').pop()! : nodeClass;

  // If hardcoded synthesis already filled the reference, we're done
  if (shortClass === 'K2Node_CallFunction' && props['FunctionReference']) return props;
  if (shortClass === 'K2Node_Event' && props['EventReference']) return props;

  // Second: try signature DB
  if (shortClass === 'K2Node_CallFunction' && !props['FunctionReference']) {
    const sig = lookupFunction(title);
    if (sig) {
      props['FunctionReference'] = `(MemberParent="${sig.memberParent}",MemberName="${sig.memberName}")`;
    }
  }

  if (shortClass === 'K2Node_Event' && !props['EventReference']) {
    // Try stripping "Event " prefix and looking for Receive* variant
    const eventName = title.replace(/^Event\s+/, '');
    const sig = lookupFunction(`Receive${eventName}`) ?? lookupFunction(eventName);
    if (sig) {
      props['EventReference'] = `(MemberParent="${sig.memberParent}",MemberName="${sig.memberName}")`;
      if (!props['bOverrideFunction']) {
        props['bOverrideFunction'] = 'True';
      }
    }
  }

  // Promotable operators — try DB for math functions
  if ((shortClass === 'K2Node_PromotableOperator' || shortClass === 'K2Node_CommutativeAssociativeBinaryOperator')
      && !props['FunctionReference']) {
    const sig = lookupFunction(title);
    if (sig) {
      props['FunctionReference'] = `(MemberParent="${sig.memberParent}",MemberName="${sig.memberName}")`;
    }
  }

  return props;
}

/**
 * Ensure nodeClass has the full /Script/... path prefix.
 */
export function qualifyNodeClass(nodeClass: string): string {
  if (nodeClass.includes('/')) return nodeClass;
  return CLASS_PREFIX_MAP[nodeClass] ?? `/Script/BlueprintGraph.${nodeClass}`;
}
