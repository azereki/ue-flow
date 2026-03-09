import type { UEMultiGraphJSON } from '../types/ue-graph';

/**
 * Full Blueprint demo data for the landing page "Full Blueprint" showcase.
 * Represents a realistic BP_PlayerCharacter with multiple event graphs,
 * functions, variables, components, and comments.
 *
 * All data uses real UE properties for 100% paste-back accuracy:
 * - 32-char hex nodeGuids and pin IDs
 * - subCategory for primitive sub-types, subCategoryObject for object refs
 * - Pure functions (math ops, FClamp) have no exec pins
 * - Correct FunctionReference/EventReference on all nodes
 */
export const DEMO_MULTIGRAPH: UEMultiGraphJSON = {
  metadata: {
    title: 'BP_PlayerCharacter',
    blueprintName: 'BP_PlayerCharacter',
    assetPath: '/Game/Blueprints/BP_PlayerCharacter',
  },
  graphs: {
    EventGraph: {
      metadata: { title: 'EventGraph', assetPath: '/Game/Blueprints/BP_PlayerCharacter' },
      nodes: [
        // --- Comment: Initialization ---
        {
          id: 'Comment_Init',
          type: 'comment',
          nodeClass: 'EdGraphNode_Comment',
          nodeGuid: 'C0000000000000010000000000000001',
          position: { x: -40, y: -60 },
          title: 'Initialization',
          properties: { sizeX: 620, sizeY: 280 },
          pins: [],
        },
        // Event BeginPlay
        {
          id: 'BeginPlay',
          type: 'event',
          nodeClass: 'K2Node_Event',
          nodeGuid: 'E0000000000000010000000000000001',
          position: { x: 0, y: 0 },
          title: 'Event BeginPlay',
          properties: {
            EventReference: '(MemberParent="/Script/Engine.Actor",MemberName="ReceiveBeginPlay")',
            bOverrideFunction: 'True',
          },
          pins: [
            { id: 'B0000000000000010000000000000001', name: 'then', direction: 'output', category: 'exec' },
            { id: 'B0000000000000010000000000000002', name: 'OutputDelegate', direction: 'output', category: 'delegate', hidden: true },
          ],
        },
        // Set Max Health
        {
          id: 'SetMaxHealth',
          type: 'call_function',
          nodeClass: 'K2Node_CallFunction',
          nodeGuid: 'F0000000000000010000000000000001',
          position: { x: 280, y: 0 },
          title: 'Set Max Health',
          properties: {
            FunctionReference: '(MemberParent="Self",MemberName="SetMaxHealth")',
          },
          pins: [
            { id: 'B1000000000000010000000000000001', name: 'execute', direction: 'input', category: 'exec' },
            { id: 'B1000000000000010000000000000002', name: 'then', direction: 'output', category: 'exec' },
            { id: 'B1000000000000010000000000000003', name: 'New Value', direction: 'input', category: 'real', subCategory: 'double', defaultValue: '100.0' },
          ],
        },
        // Set Health = Max Health
        {
          id: 'SetHealth',
          type: 'variable_set',
          nodeClass: 'K2Node_VariableSet',
          nodeGuid: 'F0000000000000020000000000000001',
          position: { x: 280, y: 130 },
          title: 'Set Health',
          properties: {
            VariableReference: '(MemberName="Health",bSelfContext=True)',
          },
          pins: [
            { id: 'B2000000000000010000000000000001', name: 'execute', direction: 'input', category: 'exec' },
            { id: 'B2000000000000010000000000000002', name: 'then', direction: 'output', category: 'exec' },
            { id: 'B2000000000000010000000000000003', name: 'Health', direction: 'input', category: 'real', subCategory: 'double', defaultValue: '100.0' },
          ],
        },

        // --- Comment: Damage System ---
        {
          id: 'Comment_Damage',
          type: 'comment',
          nodeClass: 'EdGraphNode_Comment',
          nodeGuid: 'C0000000000000020000000000000001',
          position: { x: -40, y: 300 },
          title: 'Damage Handling',
          properties: { sizeX: 1100, sizeY: 400 },
          pins: [],
        },
        // Event AnyDamage
        {
          id: 'AnyDamage',
          type: 'event',
          nodeClass: 'K2Node_Event',
          nodeGuid: 'E0000000000000020000000000000001',
          position: { x: 0, y: 360 },
          title: 'Event AnyDamage',
          properties: {
            EventReference: '(MemberParent="/Script/Engine.Actor",MemberName="ReceiveAnyDamage")',
            bOverrideFunction: 'True',
          },
          pins: [
            { id: 'B3000000000000010000000000000001', name: 'then', direction: 'output', category: 'exec' },
            { id: 'B3000000000000010000000000000002', name: 'Damage', direction: 'output', category: 'real', subCategory: 'double' },
            { id: 'B3000000000000010000000000000003', name: 'Damage Type', direction: 'output', category: 'object', subCategoryObject: '/Script/Engine.DamageType' },
            { id: 'B3000000000000010000000000000004', name: 'Instigated By', direction: 'output', category: 'object', subCategoryObject: '/Script/Engine.Controller' },
            { id: 'B3000000000000010000000000000005', name: 'Damage Causer', direction: 'output', category: 'object', subCategoryObject: '/Script/Engine.Actor' },
            { id: 'B3000000000000010000000000000006', name: 'OutputDelegate', direction: 'output', category: 'delegate', hidden: true },
          ],
        },
        // Get Health (variable get)
        {
          id: 'GetHealth',
          type: 'variable_get',
          nodeClass: 'K2Node_VariableGet',
          nodeGuid: 'V0000000000000010000000000000001',
          position: { x: 200, y: 520 },
          title: 'Health',
          properties: {
            VariableReference: '(MemberName="Health",bSelfContext=True)',
          },
          pins: [
            { id: 'B4000000000000010000000000000001', name: 'Health', direction: 'output', category: 'real', subCategory: 'double' },
            { id: 'B4000000000000010000000000000002', name: 'self', direction: 'input', category: 'object', hidden: true },
          ],
        },
        // Subtract (Health - Damage) — pure function, no exec pins
        {
          id: 'Subtract',
          type: 'call_function',
          nodeClass: 'K2Node_CallFunction',
          nodeGuid: 'F0000000000000030000000000000001',
          position: { x: 300, y: 430 },
          title: 'Float - Float',
          comment: 'Health - Damage',
          properties: {
            FunctionReference: '(MemberParent="/Script/Engine.KismetMathLibrary",MemberName="Subtract_FloatFloat")',
          },
          pins: [
            { id: 'B5000000000000010000000000000001', name: 'A', direction: 'input', category: 'real', subCategory: 'double' },
            { id: 'B5000000000000010000000000000002', name: 'B', direction: 'input', category: 'real', subCategory: 'double' },
            { id: 'B5000000000000010000000000000003', name: 'ReturnValue', direction: 'output', category: 'real', subCategory: 'double' },
          ],
        },
        // FClamp — pure function, no exec pins
        {
          id: 'Clamp',
          type: 'call_function',
          nodeClass: 'K2Node_CallFunction',
          nodeGuid: 'F0000000000000040000000000000001',
          position: { x: 500, y: 430 },
          title: 'Clamp (float)',
          properties: {
            FunctionReference: '(MemberParent="/Script/Engine.KismetMathLibrary",MemberName="FClamp")',
          },
          pins: [
            { id: 'B6000000000000010000000000000001', name: 'Value', direction: 'input', category: 'real', subCategory: 'double' },
            { id: 'B6000000000000010000000000000002', name: 'Min', direction: 'input', category: 'real', subCategory: 'double', defaultValue: '0.0' },
            { id: 'B6000000000000010000000000000003', name: 'Max', direction: 'input', category: 'real', subCategory: 'double', defaultValue: '100.0' },
            { id: 'B6000000000000010000000000000004', name: 'ReturnValue', direction: 'output', category: 'real', subCategory: 'double' },
          ],
        },
        // Set Health (from clamped result) — exec flows directly from AnyDamage
        {
          id: 'SetHealthDmg',
          type: 'variable_set',
          nodeClass: 'K2Node_VariableSet',
          nodeGuid: 'F0000000000000050000000000000001',
          position: { x: 720, y: 360 },
          title: 'Set Health',
          properties: {
            VariableReference: '(MemberName="Health",bSelfContext=True)',
          },
          pins: [
            { id: 'B7000000000000010000000000000001', name: 'execute', direction: 'input', category: 'exec' },
            { id: 'B7000000000000010000000000000002', name: 'then', direction: 'output', category: 'exec' },
            { id: 'B7000000000000010000000000000003', name: 'Health', direction: 'input', category: 'real', subCategory: 'double' },
          ],
        },
        // Branch (Health <= 0?)
        {
          id: 'BranchDeath',
          type: 'flow_control',
          nodeClass: 'K2Node_IfThenElse',
          nodeGuid: 'F0000000000000060000000000000001',
          position: { x: 720, y: 500 },
          title: 'Branch',
          properties: {},
          pins: [
            { id: 'B8000000000000010000000000000001', name: 'execute', direction: 'input', category: 'exec' },
            { id: 'B8000000000000010000000000000002', name: 'Condition', direction: 'input', category: 'bool' },
            { id: 'B8000000000000010000000000000003', name: 'True', direction: 'output', category: 'exec' },
            { id: 'B8000000000000010000000000000004', name: 'False', direction: 'output', category: 'exec' },
          ],
        },
        // <= comparison — pure function, no exec pins
        {
          id: 'LessEqual',
          type: 'call_function',
          nodeClass: 'K2Node_CallFunction',
          nodeGuid: 'F0000000000000070000000000000001',
          position: { x: 520, y: 560 },
          title: '<= (Less Equal)',
          properties: {
            FunctionReference: '(MemberParent="/Script/Engine.KismetMathLibrary",MemberName="LessEqual_FloatFloat")',
          },
          pins: [
            { id: 'B9000000000000010000000000000001', name: 'A', direction: 'input', category: 'real', subCategory: 'double' },
            { id: 'B9000000000000010000000000000002', name: 'B', direction: 'input', category: 'real', subCategory: 'double', defaultValue: '0.0' },
            { id: 'B9000000000000010000000000000003', name: 'ReturnValue', direction: 'output', category: 'bool' },
          ],
        },
        // Die function call
        {
          id: 'CallDie',
          type: 'call_function',
          nodeClass: 'K2Node_CallFunction',
          nodeGuid: 'F0000000000000080000000000000001',
          position: { x: 940, y: 480 },
          title: 'Handle Death',
          properties: {
            FunctionReference: '(MemberParent="Self",MemberName="HandleDeath")',
          },
          pins: [
            { id: 'BA000000000000010000000000000001', name: 'execute', direction: 'input', category: 'exec' },
            { id: 'BA000000000000010000000000000002', name: 'then', direction: 'output', category: 'exec' },
          ],
        },

        // --- Comment: Tick / Movement ---
        {
          id: 'Comment_Tick',
          type: 'comment',
          nodeClass: 'EdGraphNode_Comment',
          nodeGuid: 'C0000000000000030000000000000001',
          position: { x: -40, y: 780 },
          title: 'Movement & Stamina Regen',
          properties: { sizeX: 940, sizeY: 340 },
          pins: [],
        },
        // Event Tick
        {
          id: 'EventTick',
          type: 'event',
          nodeClass: 'K2Node_Event',
          nodeGuid: 'E0000000000000030000000000000001',
          position: { x: 0, y: 840 },
          title: 'Event Tick',
          properties: {
            EventReference: '(MemberParent="/Script/Engine.Actor",MemberName="ReceiveTick")',
            bOverrideFunction: 'True',
          },
          pins: [
            { id: 'BB000000000000010000000000000001', name: 'then', direction: 'output', category: 'exec' },
            { id: 'BB000000000000010000000000000002', name: 'Delta Seconds', direction: 'output', category: 'real', subCategory: 'float' },
            { id: 'BB000000000000010000000000000003', name: 'OutputDelegate', direction: 'output', category: 'delegate', hidden: true },
          ],
        },
        // Get Is Sprinting
        {
          id: 'GetIsSprinting',
          type: 'variable_get',
          nodeClass: 'K2Node_VariableGet',
          nodeGuid: 'V0000000000000020000000000000001',
          position: { x: 200, y: 960 },
          title: 'IsSprinting',
          properties: {
            VariableReference: '(MemberName="IsSprinting",bSelfContext=True)',
          },
          pins: [
            { id: 'BC000000000000010000000000000001', name: 'Is Sprinting', direction: 'output', category: 'bool' },
            { id: 'BC000000000000010000000000000002', name: 'self', direction: 'input', category: 'object', hidden: true },
          ],
        },
        // Branch (sprinting check)
        {
          id: 'BranchSprint',
          type: 'flow_control',
          nodeClass: 'K2Node_IfThenElse',
          nodeGuid: 'F0000000000000090000000000000001',
          position: { x: 280, y: 840 },
          title: 'Branch',
          properties: {},
          pins: [
            { id: 'BD000000000000010000000000000001', name: 'execute', direction: 'input', category: 'exec' },
            { id: 'BD000000000000010000000000000002', name: 'Condition', direction: 'input', category: 'bool' },
            { id: 'BD000000000000010000000000000003', name: 'True', direction: 'output', category: 'exec' },
            { id: 'BD000000000000010000000000000004', name: 'False', direction: 'output', category: 'exec' },
          ],
        },
        // Drain Stamina
        {
          id: 'DrainStamina',
          type: 'call_function',
          nodeClass: 'K2Node_CallFunction',
          nodeGuid: 'F0000000000000100000000000000001',
          position: { x: 540, y: 810 },
          title: 'Drain Stamina',
          properties: {
            FunctionReference: '(MemberParent="Self",MemberName="DrainStamina")',
          },
          pins: [
            { id: 'BE000000000000010000000000000001', name: 'execute', direction: 'input', category: 'exec' },
            { id: 'BE000000000000010000000000000002', name: 'then', direction: 'output', category: 'exec' },
            { id: 'BE000000000000010000000000000003', name: 'Rate', direction: 'input', category: 'real', subCategory: 'double', defaultValue: '15.0' },
            { id: 'BE000000000000010000000000000004', name: 'Delta Time', direction: 'input', category: 'real', subCategory: 'float' },
          ],
        },
        // Regen Stamina
        {
          id: 'RegenStamina',
          type: 'call_function',
          nodeClass: 'K2Node_CallFunction',
          nodeGuid: 'F0000000000000110000000000000001',
          position: { x: 540, y: 960 },
          title: 'Regen Stamina',
          properties: {
            FunctionReference: '(MemberParent="Self",MemberName="RegenStamina")',
          },
          pins: [
            { id: 'BF000000000000010000000000000001', name: 'execute', direction: 'input', category: 'exec' },
            { id: 'BF000000000000010000000000000002', name: 'then', direction: 'output', category: 'exec' },
            { id: 'BF000000000000010000000000000003', name: 'Rate', direction: 'input', category: 'real', subCategory: 'double', defaultValue: '8.0' },
            { id: 'BF000000000000010000000000000004', name: 'Delta Time', direction: 'input', category: 'real', subCategory: 'float' },
          ],
        },
      ],
      edges: [
        // Init flow
        { id: 'e01', source: 'BeginPlay', sourcePin: 'then', target: 'SetMaxHealth', targetPin: 'execute', category: 'exec' },
        { id: 'e02', source: 'SetMaxHealth', sourcePin: 'then', target: 'SetHealth', targetPin: 'execute', category: 'exec' },

        // Damage flow — exec goes AnyDamage → SetHealthDmg (FClamp is pure, no exec)
        { id: 'e03', source: 'AnyDamage', sourcePin: 'then', target: 'SetHealthDmg', targetPin: 'execute', category: 'exec' },
        { id: 'e04', source: 'AnyDamage', sourcePin: 'Damage', target: 'Subtract', targetPin: 'B', category: 'real' },
        { id: 'e05', source: 'GetHealth', sourcePin: 'Health', target: 'Subtract', targetPin: 'A', category: 'real' },
        { id: 'e06', source: 'Subtract', sourcePin: 'ReturnValue', target: 'Clamp', targetPin: 'Value', category: 'real' },
        { id: 'e07', source: 'Clamp', sourcePin: 'ReturnValue', target: 'SetHealthDmg', targetPin: 'Health', category: 'real' },
        { id: 'e08', source: 'SetHealthDmg', sourcePin: 'then', target: 'BranchDeath', targetPin: 'execute', category: 'exec' },
        { id: 'e09', source: 'Clamp', sourcePin: 'ReturnValue', target: 'LessEqual', targetPin: 'A', category: 'real' },
        { id: 'e10', source: 'LessEqual', sourcePin: 'ReturnValue', target: 'BranchDeath', targetPin: 'Condition', category: 'bool' },
        { id: 'e11', source: 'BranchDeath', sourcePin: 'True', target: 'CallDie', targetPin: 'execute', category: 'exec' },

        // Tick flow
        { id: 'e12', source: 'EventTick', sourcePin: 'then', target: 'BranchSprint', targetPin: 'execute', category: 'exec' },
        { id: 'e13', source: 'GetIsSprinting', sourcePin: 'Is Sprinting', target: 'BranchSprint', targetPin: 'Condition', category: 'bool' },
        { id: 'e14', source: 'BranchSprint', sourcePin: 'True', target: 'DrainStamina', targetPin: 'execute', category: 'exec' },
        { id: 'e15', source: 'BranchSprint', sourcePin: 'False', target: 'RegenStamina', targetPin: 'execute', category: 'exec' },
        { id: 'e16', source: 'EventTick', sourcePin: 'Delta Seconds', target: 'DrainStamina', targetPin: 'Delta Time', category: 'real' },
        { id: 'e17', source: 'EventTick', sourcePin: 'Delta Seconds', target: 'RegenStamina', targetPin: 'Delta Time', category: 'real' },
      ],
    },
    ConstructionScript: {
      metadata: { title: 'ConstructionScript', assetPath: '/Game/Blueprints/BP_PlayerCharacter' },
      nodes: [
        {
          id: 'CS_Entry',
          type: 'event',
          nodeClass: 'K2Node_FunctionEntry',
          nodeGuid: 'E1000000000000010000000000000001',
          position: { x: 0, y: 0 },
          title: 'Construction Script',
          properties: {
            SignatureName: 'ConstructionScript',
          },
          pins: [
            { id: 'C1000000000000010000000000000001', name: 'then', direction: 'output', category: 'exec' },
          ],
        },
        {
          id: 'CS_SetMesh',
          type: 'call_function',
          nodeClass: 'K2Node_CallFunction',
          nodeGuid: 'F1000000000000010000000000000001',
          position: { x: 300, y: 0 },
          title: 'Set Static Mesh',
          properties: {
            FunctionReference: '(MemberParent="/Script/Engine.StaticMeshComponent",MemberName="SetStaticMesh")',
          },
          pins: [
            { id: 'C2000000000000010000000000000001', name: 'execute', direction: 'input', category: 'exec' },
            { id: 'C2000000000000010000000000000002', name: 'then', direction: 'output', category: 'exec' },
            { id: 'C2000000000000010000000000000003', name: 'Target', direction: 'input', category: 'object', subCategoryObject: '/Script/Engine.StaticMeshComponent' },
            { id: 'C2000000000000010000000000000004', name: 'New Mesh', direction: 'input', category: 'object', subCategoryObject: '/Script/Engine.StaticMesh' },
          ],
        },
        {
          id: 'CS_SetMat',
          type: 'call_function',
          nodeClass: 'K2Node_CallFunction',
          nodeGuid: 'F1000000000000020000000000000001',
          position: { x: 600, y: 0 },
          title: 'Set Material',
          properties: {
            FunctionReference: '(MemberParent="/Script/Engine.PrimitiveComponent",MemberName="SetMaterial")',
          },
          pins: [
            { id: 'C3000000000000010000000000000001', name: 'execute', direction: 'input', category: 'exec' },
            { id: 'C3000000000000010000000000000002', name: 'then', direction: 'output', category: 'exec' },
            { id: 'C3000000000000010000000000000003', name: 'Target', direction: 'input', category: 'object', subCategoryObject: '/Script/Engine.PrimitiveComponent' },
            { id: 'C3000000000000010000000000000004', name: 'Element Index', direction: 'input', category: 'int', defaultValue: '0' },
            { id: 'C3000000000000010000000000000005', name: 'Material', direction: 'input', category: 'object', subCategoryObject: '/Script/Engine.MaterialInterface' },
          ],
        },
      ],
      edges: [
        { id: 'cs-e1', source: 'CS_Entry', sourcePin: 'then', target: 'CS_SetMesh', targetPin: 'execute', category: 'exec' },
        { id: 'cs-e2', source: 'CS_SetMesh', sourcePin: 'then', target: 'CS_SetMat', targetPin: 'execute', category: 'exec' },
      ],
    },
    CalculateDamage: {
      metadata: { title: 'Calculate Damage', assetPath: '/Game/Blueprints/BP_PlayerCharacter' },
      nodes: [
        {
          id: 'CD_Entry',
          type: 'event',
          nodeClass: 'K2Node_FunctionEntry',
          nodeGuid: 'E2000000000000010000000000000001',
          position: { x: 0, y: 0 },
          title: 'Calculate Damage',
          properties: {
            SignatureName: 'CalculateDamage',
          },
          pins: [
            { id: 'D1000000000000010000000000000001', name: 'then', direction: 'output', category: 'exec' },
            { id: 'D1000000000000010000000000000002', name: 'Base Damage', direction: 'output', category: 'real', subCategory: 'double' },
            { id: 'D1000000000000010000000000000003', name: 'Multiplier', direction: 'output', category: 'real', subCategory: 'double' },
            { id: 'D1000000000000010000000000000004', name: 'Is Critical', direction: 'output', category: 'bool' },
          ],
        },
        // Base * Multiplier — pure function, no exec pins
        {
          id: 'CD_Multiply',
          type: 'call_function',
          nodeClass: 'K2Node_CallFunction',
          nodeGuid: 'F2000000000000010000000000000001',
          position: { x: 300, y: 0 },
          title: 'Float * Float',
          properties: {
            FunctionReference: '(MemberParent="/Script/Engine.KismetMathLibrary",MemberName="Multiply_FloatFloat")',
          },
          pins: [
            { id: 'D2000000000000010000000000000001', name: 'A', direction: 'input', category: 'real', subCategory: 'double' },
            { id: 'D2000000000000010000000000000002', name: 'B', direction: 'input', category: 'real', subCategory: 'double' },
            { id: 'D2000000000000010000000000000003', name: 'ReturnValue', direction: 'output', category: 'real', subCategory: 'double' },
          ],
        },
        {
          id: 'CD_Branch',
          type: 'flow_control',
          nodeClass: 'K2Node_IfThenElse',
          nodeGuid: 'F2000000000000020000000000000001',
          position: { x: 300, y: 140 },
          title: 'Branch',
          properties: {},
          pins: [
            { id: 'D3000000000000010000000000000001', name: 'execute', direction: 'input', category: 'exec' },
            { id: 'D3000000000000010000000000000002', name: 'Condition', direction: 'input', category: 'bool' },
            { id: 'D3000000000000010000000000000003', name: 'True', direction: 'output', category: 'exec' },
            { id: 'D3000000000000010000000000000004', name: 'False', direction: 'output', category: 'exec' },
          ],
        },
        // Apply crit multiplier — pure function, no exec pins
        {
          id: 'CD_CritMult',
          type: 'call_function',
          nodeClass: 'K2Node_CallFunction',
          nodeGuid: 'F2000000000000030000000000000001',
          position: { x: 560, y: 80 },
          title: 'Float * Float',
          comment: 'Apply crit multiplier',
          properties: {
            FunctionReference: '(MemberParent="/Script/Engine.KismetMathLibrary",MemberName="Multiply_FloatFloat")',
          },
          pins: [
            { id: 'D4000000000000010000000000000001', name: 'A', direction: 'input', category: 'real', subCategory: 'double' },
            { id: 'D4000000000000010000000000000002', name: 'B', direction: 'input', category: 'real', subCategory: 'double', defaultValue: '2.5' },
            { id: 'D4000000000000010000000000000003', name: 'ReturnValue', direction: 'output', category: 'real', subCategory: 'double' },
          ],
        },
        // Return node (critical hit path)
        {
          id: 'CD_ReturnCrit',
          type: 'call_function',
          nodeClass: 'K2Node_FunctionResult',
          nodeGuid: 'F2000000000000040000000000000001',
          position: { x: 800, y: 60 },
          title: 'Return Node',
          properties: {
            SignatureName: 'CalculateDamage',
          },
          pins: [
            { id: 'D5000000000000010000000000000001', name: 'execute', direction: 'input', category: 'exec' },
            { id: 'D5000000000000010000000000000002', name: 'Final Damage', direction: 'input', category: 'real', subCategory: 'double' },
          ],
        },
        // Return node (normal path)
        {
          id: 'CD_ReturnNormal',
          type: 'call_function',
          nodeClass: 'K2Node_FunctionResult',
          nodeGuid: 'F2000000000000050000000000000001',
          position: { x: 800, y: 200 },
          title: 'Return Node',
          properties: {
            SignatureName: 'CalculateDamage',
          },
          pins: [
            { id: 'D6000000000000010000000000000001', name: 'execute', direction: 'input', category: 'exec' },
            { id: 'D6000000000000010000000000000002', name: 'Final Damage', direction: 'input', category: 'real', subCategory: 'double' },
          ],
        },
      ],
      edges: [
        // Exec flow
        { id: 'cd-e1', source: 'CD_Entry', sourcePin: 'then', target: 'CD_Branch', targetPin: 'execute', category: 'exec' },
        { id: 'cd-e2', source: 'CD_Branch', sourcePin: 'True', target: 'CD_ReturnCrit', targetPin: 'execute', category: 'exec' },
        { id: 'cd-e3', source: 'CD_Branch', sourcePin: 'False', target: 'CD_ReturnNormal', targetPin: 'execute', category: 'exec' },
        // Data flow
        { id: 'cd-e4', source: 'CD_Entry', sourcePin: 'Base Damage', target: 'CD_Multiply', targetPin: 'A', category: 'real' },
        { id: 'cd-e5', source: 'CD_Entry', sourcePin: 'Multiplier', target: 'CD_Multiply', targetPin: 'B', category: 'real' },
        { id: 'cd-e6', source: 'CD_Entry', sourcePin: 'Is Critical', target: 'CD_Branch', targetPin: 'Condition', category: 'bool' },
        // Crit path: base*mult → crit*2.5 → return crit
        { id: 'cd-e7', source: 'CD_Multiply', sourcePin: 'ReturnValue', target: 'CD_CritMult', targetPin: 'A', category: 'real' },
        { id: 'cd-e8', source: 'CD_CritMult', sourcePin: 'ReturnValue', target: 'CD_ReturnCrit', targetPin: 'Final Damage', category: 'real' },
        // Normal path: base*mult → return normal
        { id: 'cd-e9', source: 'CD_Multiply', sourcePin: 'ReturnValue', target: 'CD_ReturnNormal', targetPin: 'Final Damage', category: 'real' },
      ],
    },
  },
  events: [
    { name: 'BeginPlay', replicates: 'NotReplicated' },
    { name: 'AnyDamage', params: ['Damage: Float', 'DamageType: DamageType', 'InstigatedBy: Controller', 'DamageCauser: Actor'] },
    { name: 'Tick', params: ['DeltaSeconds: Float'] },
  ],
  functions: [
    {
      name: 'CalculateDamage',
      inputs: ['BaseDamage: Float', 'Multiplier: Float', 'IsCritical: Boolean'],
      outputs: ['FinalDamage: Float'],
      pure: false,
      description: 'Calculates final damage with optional crit multiplier',
      accessSpecifier: 'Public',
    },
    {
      name: 'HandleDeath',
      pure: false,
      description: 'Handles player death — ragdoll, disable input, respawn timer',
      accessSpecifier: 'Protected',
    },
    {
      name: 'DrainStamina',
      inputs: ['Rate: Float', 'DeltaTime: Float'],
      pure: false,
      accessSpecifier: 'Private',
    },
    {
      name: 'RegenStamina',
      inputs: ['Rate: Float', 'DeltaTime: Float'],
      pure: false,
      accessSpecifier: 'Private',
    },
  ],
  variables: [
    { name: 'Health', type: 'Float', default: '100.0', replicated: true, replicationMode: 'RepNotify', category: 'Stats' },
    { name: 'MaxHealth', type: 'Float', default: '100.0', category: 'Stats' },
    { name: 'Stamina', type: 'Float', default: '100.0', replicated: true, category: 'Stats' },
    { name: 'MaxStamina', type: 'Float', default: '100.0', category: 'Stats' },
    { name: 'IsSprinting', type: 'Boolean', default: 'false', category: 'Movement' },
    { name: 'MoveSpeed', type: 'Float', default: '600.0', category: 'Movement' },
    { name: 'SprintMultiplier', type: 'Float', default: '1.5', category: 'Movement' },
    { name: 'IsDead', type: 'Boolean', default: 'false', category: 'State' },
    { name: 'Inventory', type: 'Object', containerType: 'Array', category: 'Inventory' },
    { name: 'TeamID', type: 'Integer', default: '0', replicated: true, category: 'Multiplayer' },
  ],
  components: [
    { name: 'CapsuleComponent', class: 'CapsuleComponent' },
    { name: 'CharacterMesh', class: 'SkeletalMeshComponent', parent: 'CapsuleComponent' },
    { name: 'CameraBoom', class: 'SpringArmComponent', parent: 'CapsuleComponent' },
    { name: 'FollowCamera', class: 'CameraComponent', parent: 'CameraBoom' },
    { name: 'CharacterMovement', class: 'CharacterMovementComponent' },
  ],
  macros: [],
  structs: [
    {
      name: 'DamageEvent',
      fields: [
        { name: 'Damage', type: 'Float' },
        { name: 'DamageType', type: 'Name' },
        { name: 'Source', type: 'Actor' },
        { name: 'HitLocation', type: 'Vector' },
        { name: 'IsCritical', type: 'Boolean' },
      ],
    },
  ],
  delegates: [
    { name: 'OnHealthChanged', params: ['NewHealth: Float', 'OldHealth: Float'] },
    { name: 'OnDeath', params: ['KilledBy: Controller'] },
  ],
  dataTables: {},
  comparison: {},
};
