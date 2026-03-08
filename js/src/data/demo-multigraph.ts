import type { UEMultiGraphJSON } from '../types/ue-graph';

/**
 * Full Blueprint demo data for the landing page "Full Blueprint" showcase.
 * Represents a realistic BP_PlayerCharacter with multiple event graphs,
 * functions, variables, components, and comments.
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
          nodeGuid: 'C000000000000001',
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
          nodeGuid: 'E000000000000001',
          position: { x: 0, y: 0 },
          title: 'Event BeginPlay',
          properties: {},
          pins: [
            { id: 'bp-then', name: 'then', direction: 'output', category: 'exec' },
          ],
        },
        // Set Max Health
        {
          id: 'SetMaxHealth',
          type: 'call_function',
          nodeClass: 'K2Node_CallFunction',
          nodeGuid: 'F000000000000001',
          position: { x: 280, y: 0 },
          title: 'Set Max Health',
          properties: {},
          pins: [
            { id: 'smh-exec', name: 'execute', direction: 'input', category: 'exec' },
            { id: 'smh-then', name: 'then', direction: 'output', category: 'exec' },
            { id: 'smh-val', name: 'New Value', direction: 'input', category: 'real', subType: 'double', defaultValue: '100.0' },
          ],
        },
        // Set Health = Max Health
        {
          id: 'SetHealth',
          type: 'variable_set',
          nodeClass: 'K2Node_VariableSet',
          nodeGuid: 'F000000000000002',
          position: { x: 280, y: 130 },
          title: 'Set Health',
          properties: {},
          pins: [
            { id: 'sh-exec', name: 'execute', direction: 'input', category: 'exec' },
            { id: 'sh-then', name: 'then', direction: 'output', category: 'exec' },
            { id: 'sh-val', name: 'Health', direction: 'input', category: 'real', subType: 'double', defaultValue: '100.0' },
          ],
        },

        // --- Comment: Damage System ---
        {
          id: 'Comment_Damage',
          type: 'comment',
          nodeClass: 'EdGraphNode_Comment',
          nodeGuid: 'C000000000000002',
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
          nodeGuid: 'E000000000000002',
          position: { x: 0, y: 360 },
          title: 'Event AnyDamage',
          properties: {},
          pins: [
            { id: 'ad-then', name: 'then', direction: 'output', category: 'exec' },
            { id: 'ad-damage', name: 'Damage', direction: 'output', category: 'real', subType: 'double' },
            { id: 'ad-type', name: 'Damage Type', direction: 'output', category: 'object', subType: '/Script/Engine.DamageType' },
            { id: 'ad-instigator', name: 'Instigated By', direction: 'output', category: 'object', subType: '/Script/Engine.Controller' },
            { id: 'ad-causer', name: 'Damage Causer', direction: 'output', category: 'object', subType: '/Script/Engine.Actor' },
          ],
        },
        // Get Health (variable get)
        {
          id: 'GetHealth',
          type: 'variable_get',
          nodeClass: 'K2Node_VariableGet',
          nodeGuid: 'V000000000000001',
          position: { x: 200, y: 520 },
          title: 'Get Health',
          properties: {},
          pins: [
            { id: 'gh-out', name: 'Health', direction: 'output', category: 'real', subType: 'double' },
          ],
        },
        // Subtract (Health - Damage)
        {
          id: 'Subtract',
          type: 'call_function',
          nodeClass: 'K2Node_CallFunction',
          nodeGuid: 'F000000000000003',
          position: { x: 300, y: 430 },
          title: 'Float - Float',
          comment: 'Health - Damage',
          properties: {},
          pins: [
            { id: 'sub-a', name: 'A', direction: 'input', category: 'real', subType: 'double' },
            { id: 'sub-b', name: 'B', direction: 'input', category: 'real', subType: 'double' },
            { id: 'sub-out', name: 'ReturnValue', direction: 'output', category: 'real', subType: 'double' },
          ],
        },
        // Clamp
        {
          id: 'Clamp',
          type: 'call_function',
          nodeClass: 'K2Node_CallFunction',
          nodeGuid: 'F000000000000004',
          position: { x: 500, y: 360 },
          title: 'Clamp (float)',
          properties: {},
          pins: [
            { id: 'cl-exec', name: 'execute', direction: 'input', category: 'exec' },
            { id: 'cl-then', name: 'then', direction: 'output', category: 'exec' },
            { id: 'cl-val', name: 'Value', direction: 'input', category: 'real', subType: 'double' },
            { id: 'cl-min', name: 'Min', direction: 'input', category: 'real', subType: 'double', defaultValue: '0.0' },
            { id: 'cl-max', name: 'Max', direction: 'input', category: 'real', subType: 'double', defaultValue: '100.0' },
            { id: 'cl-out', name: 'ReturnValue', direction: 'output', category: 'real', subType: 'double' },
          ],
        },
        // Set Health (from clamped result)
        {
          id: 'SetHealthDmg',
          type: 'variable_set',
          nodeClass: 'K2Node_VariableSet',
          nodeGuid: 'F000000000000005',
          position: { x: 720, y: 360 },
          title: 'Set Health',
          properties: {},
          pins: [
            { id: 'shd-exec', name: 'execute', direction: 'input', category: 'exec' },
            { id: 'shd-then', name: 'then', direction: 'output', category: 'exec' },
            { id: 'shd-val', name: 'Health', direction: 'input', category: 'real', subType: 'double' },
          ],
        },
        // Branch (Health <= 0?)
        {
          id: 'BranchDeath',
          type: 'flow_control',
          nodeClass: 'K2Node_IfThenElse',
          nodeGuid: 'F000000000000006',
          position: { x: 720, y: 500 },
          title: 'Branch',
          properties: {},
          pins: [
            { id: 'bd-exec', name: 'execute', direction: 'input', category: 'exec' },
            { id: 'bd-cond', name: 'Condition', direction: 'input', category: 'bool' },
            { id: 'bd-true', name: 'True', direction: 'output', category: 'exec' },
            { id: 'bd-false', name: 'False', direction: 'output', category: 'exec' },
          ],
        },
        // <= comparison
        {
          id: 'LessEqual',
          type: 'call_function',
          nodeClass: 'K2Node_CallFunction',
          nodeGuid: 'F000000000000007',
          position: { x: 520, y: 560 },
          title: '<= (Less Equal)',
          properties: {},
          pins: [
            { id: 'le-a', name: 'A', direction: 'input', category: 'real', subType: 'double' },
            { id: 'le-b', name: 'B', direction: 'input', category: 'real', subType: 'double', defaultValue: '0.0' },
            { id: 'le-out', name: 'ReturnValue', direction: 'output', category: 'bool' },
          ],
        },
        // Die function call
        {
          id: 'CallDie',
          type: 'call_function',
          nodeClass: 'K2Node_CallFunction',
          nodeGuid: 'F000000000000008',
          position: { x: 940, y: 480 },
          title: 'Handle Death',
          properties: {},
          pins: [
            { id: 'die-exec', name: 'execute', direction: 'input', category: 'exec' },
            { id: 'die-then', name: 'then', direction: 'output', category: 'exec' },
          ],
        },

        // --- Comment: Tick / Movement ---
        {
          id: 'Comment_Tick',
          type: 'comment',
          nodeClass: 'EdGraphNode_Comment',
          nodeGuid: 'C000000000000003',
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
          nodeGuid: 'E000000000000003',
          position: { x: 0, y: 840 },
          title: 'Event Tick',
          properties: {},
          pins: [
            { id: 'et-then', name: 'then', direction: 'output', category: 'exec' },
            { id: 'et-dt', name: 'Delta Seconds', direction: 'output', category: 'real', subType: 'float' },
          ],
        },
        // Get Is Sprinting
        {
          id: 'GetIsSprinting',
          type: 'variable_get',
          nodeClass: 'K2Node_VariableGet',
          nodeGuid: 'V000000000000002',
          position: { x: 200, y: 960 },
          title: 'Get Is Sprinting',
          properties: {},
          pins: [
            { id: 'gis-out', name: 'Is Sprinting', direction: 'output', category: 'bool' },
          ],
        },
        // Branch (sprinting check)
        {
          id: 'BranchSprint',
          type: 'flow_control',
          nodeClass: 'K2Node_IfThenElse',
          nodeGuid: 'F000000000000009',
          position: { x: 280, y: 840 },
          title: 'Branch',
          properties: {},
          pins: [
            { id: 'bs-exec', name: 'execute', direction: 'input', category: 'exec' },
            { id: 'bs-cond', name: 'Condition', direction: 'input', category: 'bool' },
            { id: 'bs-true', name: 'True', direction: 'output', category: 'exec' },
            { id: 'bs-false', name: 'False', direction: 'output', category: 'exec' },
          ],
        },
        // Drain Stamina
        {
          id: 'DrainStamina',
          type: 'call_function',
          nodeClass: 'K2Node_CallFunction',
          nodeGuid: 'F000000000000010',
          position: { x: 540, y: 810 },
          title: 'Drain Stamina',
          properties: {},
          pins: [
            { id: 'ds-exec', name: 'execute', direction: 'input', category: 'exec' },
            { id: 'ds-then', name: 'then', direction: 'output', category: 'exec' },
            { id: 'ds-rate', name: 'Rate', direction: 'input', category: 'real', subType: 'double', defaultValue: '15.0' },
            { id: 'ds-dt', name: 'Delta Time', direction: 'input', category: 'real', subType: 'float' },
          ],
        },
        // Regen Stamina
        {
          id: 'RegenStamina',
          type: 'call_function',
          nodeClass: 'K2Node_CallFunction',
          nodeGuid: 'F000000000000011',
          position: { x: 540, y: 960 },
          title: 'Regen Stamina',
          properties: {},
          pins: [
            { id: 'rs-exec', name: 'execute', direction: 'input', category: 'exec' },
            { id: 'rs-then', name: 'then', direction: 'output', category: 'exec' },
            { id: 'rs-rate', name: 'Rate', direction: 'input', category: 'real', subType: 'double', defaultValue: '8.0' },
            { id: 'rs-dt', name: 'Delta Time', direction: 'input', category: 'real', subType: 'float' },
          ],
        },
      ],
      edges: [
        // Init flow
        { id: 'e01', source: 'BeginPlay', sourcePin: 'then', target: 'SetMaxHealth', targetPin: 'execute', category: 'exec' },
        { id: 'e02', source: 'SetMaxHealth', sourcePin: 'then', target: 'SetHealth', targetPin: 'execute', category: 'exec' },

        // Damage flow
        { id: 'e03', source: 'AnyDamage', sourcePin: 'then', target: 'Clamp', targetPin: 'execute', category: 'exec' },
        { id: 'e04', source: 'AnyDamage', sourcePin: 'Damage', target: 'Subtract', targetPin: 'B', category: 'real' },
        { id: 'e05', source: 'GetHealth', sourcePin: 'Health', target: 'Subtract', targetPin: 'A', category: 'real' },
        { id: 'e06', source: 'Subtract', sourcePin: 'ReturnValue', target: 'Clamp', targetPin: 'Value', category: 'real' },
        { id: 'e07', source: 'Clamp', sourcePin: 'then', target: 'SetHealthDmg', targetPin: 'execute', category: 'exec' },
        { id: 'e08', source: 'Clamp', sourcePin: 'ReturnValue', target: 'SetHealthDmg', targetPin: 'Health', category: 'real' },
        { id: 'e09', source: 'SetHealthDmg', sourcePin: 'then', target: 'BranchDeath', targetPin: 'execute', category: 'exec' },
        { id: 'e10', source: 'Clamp', sourcePin: 'ReturnValue', target: 'LessEqual', targetPin: 'A', category: 'real' },
        { id: 'e11', source: 'LessEqual', sourcePin: 'ReturnValue', target: 'BranchDeath', targetPin: 'Condition', category: 'bool' },
        { id: 'e12', source: 'BranchDeath', sourcePin: 'True', target: 'CallDie', targetPin: 'execute', category: 'exec' },

        // Tick flow
        { id: 'e13', source: 'EventTick', sourcePin: 'then', target: 'BranchSprint', targetPin: 'execute', category: 'exec' },
        { id: 'e14', source: 'GetIsSprinting', sourcePin: 'Is Sprinting', target: 'BranchSprint', targetPin: 'Condition', category: 'bool' },
        { id: 'e15', source: 'BranchSprint', sourcePin: 'True', target: 'DrainStamina', targetPin: 'execute', category: 'exec' },
        { id: 'e16', source: 'BranchSprint', sourcePin: 'False', target: 'RegenStamina', targetPin: 'execute', category: 'exec' },
        { id: 'e17', source: 'EventTick', sourcePin: 'Delta Seconds', target: 'DrainStamina', targetPin: 'Delta Time', category: 'real' },
        { id: 'e18', source: 'EventTick', sourcePin: 'Delta Seconds', target: 'RegenStamina', targetPin: 'Delta Time', category: 'real' },
      ],
    },
    ConstructionScript: {
      metadata: { title: 'ConstructionScript', assetPath: '/Game/Blueprints/BP_PlayerCharacter' },
      nodes: [
        {
          id: 'CS_Entry',
          type: 'event',
          nodeClass: 'K2Node_FunctionEntry',
          nodeGuid: 'E100000000000001',
          position: { x: 0, y: 0 },
          title: 'Construction Script',
          properties: {},
          pins: [
            { id: 'cs-then', name: 'then', direction: 'output', category: 'exec' },
          ],
        },
        {
          id: 'CS_SetMesh',
          type: 'call_function',
          nodeClass: 'K2Node_CallFunction',
          nodeGuid: 'F100000000000001',
          position: { x: 300, y: 0 },
          title: 'Set Static Mesh',
          properties: {},
          pins: [
            { id: 'sm-exec', name: 'execute', direction: 'input', category: 'exec' },
            { id: 'sm-then', name: 'then', direction: 'output', category: 'exec' },
            { id: 'sm-target', name: 'Target', direction: 'input', category: 'object', subType: '/Script/Engine.StaticMeshComponent' },
            { id: 'sm-mesh', name: 'New Mesh', direction: 'input', category: 'object', subType: '/Script/Engine.StaticMesh' },
          ],
        },
        {
          id: 'CS_SetMat',
          type: 'call_function',
          nodeClass: 'K2Node_CallFunction',
          nodeGuid: 'F100000000000002',
          position: { x: 600, y: 0 },
          title: 'Set Material',
          properties: {},
          pins: [
            { id: 'smat-exec', name: 'execute', direction: 'input', category: 'exec' },
            { id: 'smat-then', name: 'then', direction: 'output', category: 'exec' },
            { id: 'smat-target', name: 'Target', direction: 'input', category: 'object', subType: '/Script/Engine.PrimitiveComponent' },
            { id: 'smat-idx', name: 'Element Index', direction: 'input', category: 'int', defaultValue: '0' },
            { id: 'smat-mat', name: 'Material', direction: 'input', category: 'object', subType: '/Script/Engine.MaterialInterface' },
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
          nodeGuid: 'E200000000000001',
          position: { x: 0, y: 0 },
          title: 'Calculate Damage',
          properties: {},
          pins: [
            { id: 'cd-then', name: 'then', direction: 'output', category: 'exec' },
            { id: 'cd-base', name: 'Base Damage', direction: 'output', category: 'real', subType: 'double' },
            { id: 'cd-mult', name: 'Multiplier', direction: 'output', category: 'real', subType: 'double' },
            { id: 'cd-crit', name: 'Is Critical', direction: 'output', category: 'bool' },
          ],
        },
        {
          id: 'CD_Multiply',
          type: 'call_function',
          nodeClass: 'K2Node_CallFunction',
          nodeGuid: 'F200000000000001',
          position: { x: 300, y: 0 },
          title: 'Float * Float',
          properties: {},
          pins: [
            { id: 'mul-a', name: 'A', direction: 'input', category: 'real', subType: 'double' },
            { id: 'mul-b', name: 'B', direction: 'input', category: 'real', subType: 'double' },
            { id: 'mul-out', name: 'ReturnValue', direction: 'output', category: 'real', subType: 'double' },
          ],
        },
        {
          id: 'CD_Branch',
          type: 'flow_control',
          nodeClass: 'K2Node_IfThenElse',
          nodeGuid: 'F200000000000002',
          position: { x: 300, y: 140 },
          title: 'Branch',
          properties: {},
          pins: [
            { id: 'cdb-exec', name: 'execute', direction: 'input', category: 'exec' },
            { id: 'cdb-cond', name: 'Condition', direction: 'input', category: 'bool' },
            { id: 'cdb-true', name: 'True', direction: 'output', category: 'exec' },
            { id: 'cdb-false', name: 'False', direction: 'output', category: 'exec' },
          ],
        },
        {
          id: 'CD_CritMult',
          type: 'call_function',
          nodeClass: 'K2Node_CallFunction',
          nodeGuid: 'F200000000000003',
          position: { x: 560, y: 80 },
          title: 'Float * Float',
          comment: 'Apply crit multiplier',
          properties: {},
          pins: [
            { id: 'cm-a', name: 'A', direction: 'input', category: 'real', subType: 'double' },
            { id: 'cm-b', name: 'B', direction: 'input', category: 'real', subType: 'double', defaultValue: '2.5' },
            { id: 'cm-out', name: 'ReturnValue', direction: 'output', category: 'real', subType: 'double' },
          ],
        },
        {
          id: 'CD_Return',
          type: 'call_function',
          nodeClass: 'K2Node_FunctionResult',
          nodeGuid: 'F200000000000004',
          position: { x: 800, y: 100 },
          title: 'Return Node',
          properties: {},
          pins: [
            { id: 'ret-exec', name: 'execute', direction: 'input', category: 'exec' },
            { id: 'ret-val', name: 'Final Damage', direction: 'input', category: 'real', subType: 'double' },
          ],
        },
      ],
      edges: [
        { id: 'cd-e1', source: 'CD_Entry', sourcePin: 'then', target: 'CD_Branch', targetPin: 'execute', category: 'exec' },
        { id: 'cd-e2', source: 'CD_Entry', sourcePin: 'Base Damage', target: 'CD_Multiply', targetPin: 'A', category: 'real' },
        { id: 'cd-e3', source: 'CD_Entry', sourcePin: 'Multiplier', target: 'CD_Multiply', targetPin: 'B', category: 'real' },
        { id: 'cd-e4', source: 'CD_Entry', sourcePin: 'Is Critical', target: 'CD_Branch', targetPin: 'Condition', category: 'bool' },
        { id: 'cd-e5', source: 'CD_Multiply', sourcePin: 'ReturnValue', target: 'CD_CritMult', targetPin: 'A', category: 'real' },
        { id: 'cd-e6', source: 'CD_Branch', sourcePin: 'True', target: 'CD_CritMult', targetPin: 'execute', category: 'exec' },
        { id: 'cd-e7', source: 'CD_CritMult', sourcePin: 'ReturnValue', target: 'CD_Return', targetPin: 'Final Damage', category: 'real' },
        { id: 'cd-e8', source: 'CD_Branch', sourcePin: 'False', target: 'CD_Return', targetPin: 'execute', category: 'exec' },
        { id: 'cd-e9', source: 'CD_Multiply', sourcePin: 'ReturnValue', target: 'CD_Return', targetPin: 'Final Damage', category: 'real' },
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
