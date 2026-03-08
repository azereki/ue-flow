/**
 * Build examples/embed-demo.html with the IIFE bundle inlined.
 * Showcases the embed API: auto-discovery + programmatic UEFlow.render().
 * Run: node js/scripts/build-embed-demo.cjs
 */
const fs = require('fs');
const path = require('path');

const iifePath = path.join(__dirname, '..', 'dist', 'ue-flow.iife.js');
const outPath = path.join(__dirname, '..', '..', 'examples', 'embed-demo.html');

if (!fs.existsSync(iifePath)) {
  console.error('IIFE bundle not found. Run "npm run build" first.');
  process.exit(1);
}

const jsContent = fs.readFileSync(iifePath, 'utf-8');

// Two-node sample: Event BeginPlay -> Print String (connected)
const SAMPLE_T3D_1 = `Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"
   EventReference=(MemberParent="/Script/Engine.Actor",MemberName="ReceiveBeginPlay")
   bOverrideFunction=True
   NodePosX=100
   NodePosY=200
   NodeGuid=AAAABBBBCCCCDDDDEEEEFFFFAAAABBBB
   CustomProperties Pin (PinId=11112222333344445555666677778888,PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,PinType.bIsUObjectWrapper=False,PinType.bSerializeAsSinglePrecisionFloat=False,LinkedTo=(K2Node_CallFunction_0 AABB112233445566AABB112233445566,),PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
   CustomProperties Pin (PinId=CCCC1111222233334444555566667777,PinName="OutputDelegate",Direction="EGPD_Output",PinType.PinCategory="delegate",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,PinType.bIsUObjectWrapper=False,PinType.bSerializeAsSinglePrecisionFloat=False,PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object

Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_0"
   FunctionReference=(MemberParent="/Script/Engine.KismetSystemLibrary",MemberName="PrintString")
   bIsPureFunc=False
   NodePosX=400
   NodePosY=200
   NodeGuid=BBBB1111222233334444555566667777
   CustomProperties Pin (PinId=AABB112233445566AABB112233445566,PinName="execute",PinType.PinCategory="exec",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,PinType.bIsUObjectWrapper=False,PinType.bSerializeAsSinglePrecisionFloat=False,LinkedTo=(K2Node_Event_0 11112222333344445555666677778888,),PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
   CustomProperties Pin (PinId=DDDD1111222233334444555566667777,PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,PinType.bIsUObjectWrapper=False,PinType.bSerializeAsSinglePrecisionFloat=False,PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
   CustomProperties Pin (PinId=EEEE1111222233334444555566667777,PinName="InString",PinType.PinCategory="string",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,PinType.bIsUObjectWrapper=False,PinType.bSerializeAsSinglePrecisionFloat=False,DefaultValue="Hello from Blueprint!",PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object`;

// Three-node sample: Event -> Branch -> PrintString
const SAMPLE_T3D_2 = `Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"
   EventReference=(MemberParent="/Script/Engine.Actor",MemberName="ReceiveBeginPlay")
   NodePosX=0
   NodePosY=0
   NodeGuid=AAAA0000BBBB1111CCCC2222DDDD3333
   CustomProperties Pin (PinId=11112222333344445555666677778888,PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,LinkedTo=(K2Node_IfThenElse_0 BBBB0000CCCC1111DDDD2222EEEE3333,),PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object

Begin Object Class=/Script/BlueprintGraph.K2Node_IfThenElse Name="K2Node_IfThenElse_0"
   NodePosX=300
   NodePosY=0
   NodeGuid=BBBB0000CCCC1111DDDD2222EEEE3333
   CustomProperties Pin (PinId=BBBB0000CCCC1111DDDD2222EEEE3333,PinName="execute",PinType.PinCategory="exec",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,LinkedTo=(K2Node_Event_0 11112222333344445555666677778888,),PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
   CustomProperties Pin (PinId=CCCC0000DDDD1111EEEE2222FFFF3333,PinName="Condition",PinType.PinCategory="bool",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,DefaultValue="true",PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
   CustomProperties Pin (PinId=DDDD0000EEEE1111FFFF2222AAAA3333,PinName="then",PinFriendlyName="True",Direction="EGPD_Output",PinType.PinCategory="exec",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,LinkedTo=(K2Node_CallFunction_0 EEEE0000FFFF1111AAAA2222BBBB3333,),PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
   CustomProperties Pin (PinId=EEEE0000FFFF1111AAAA2222BBBB4444,PinName="else",PinFriendlyName="False",Direction="EGPD_Output",PinType.PinCategory="exec",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object

Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_0"
   FunctionReference=(MemberParent="/Script/Engine.KismetSystemLibrary",MemberName="PrintString")
   NodePosX=600
   NodePosY=0
   NodeGuid=FFFF0000AAAA1111BBBB2222CCCC3333
   CustomProperties Pin (PinId=EEEE0000FFFF1111AAAA2222BBBB3333,PinName="execute",PinType.PinCategory="exec",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,LinkedTo=(K2Node_IfThenElse_0 DDDD0000EEEE1111FFFF2222AAAA3333,),PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
   CustomProperties Pin (PinId=FFFF0000AAAA1111BBBB2222CCCC4444,PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
   CustomProperties Pin (PinId=AAAA0000BBBB1111CCCC2222DDDD4444,PinName="InString",PinFriendlyName="In String",PinType.PinCategory="string",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,DefaultValue="Hello World",PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object`;

// Escape T3D for embedding in HTML attributes
function escapeAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Escape for embedding in JS string literals
function escapeJS(s) {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ue-flow Embed Demo</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #18181b; color: #d4d4d8; font-family: system-ui, -apple-system, sans-serif; padding: 40px 24px; }
    h1 { font-size: 28px; font-weight: 700; color: #f4f4f5; margin-bottom: 8px; }
    .subtitle { color: #71717a; font-size: 14px; margin-bottom: 40px; }
    .section { margin-bottom: 48px; }
    .section h2 { font-size: 18px; font-weight: 600; color: #a1a1aa; margin-bottom: 12px; }
    .section p { font-size: 14px; color: #71717a; margin-bottom: 16px; line-height: 1.5; }
    pre { background: #09090b; border: 1px solid #27272a; border-radius: 8px; padding: 16px; font-size: 13px; color: #a1a1aa; overflow-x: auto; margin-bottom: 16px; line-height: 1.5; }
    code { font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', monospace; }
    .ueflow-embed, #programmatic-graph { border-radius: 12px; border: 1px solid #27272a; margin-bottom: 16px; }
  </style>
</head>
<body>
  <h1>ue-flow Embed API</h1>
  <p class="subtitle">Embed interactive UE Blueprint graphs on any webpage.</p>

  <!-- ================================================================== -->
  <!-- Example 1: Auto-discovery with data-t3d -->
  <!-- ================================================================== -->
  <div class="section">
    <h2>1. Auto-Discovery (data-t3d)</h2>
    <p>Add <code>class="ueflow-embed"</code> and a <code>data-t3d</code> attribute to any div. The IIFE auto-renders it on load.</p>
    <pre><code>&lt;div class="ueflow-embed" data-t3d="Begin Object ..." style="height:400px;"&gt;&lt;/div&gt;
&lt;script src="ue-flow.iife.js"&gt;&lt;/script&gt;</code></pre>
    <div class="ueflow-embed" data-t3d="${escapeAttr(SAMPLE_T3D_1)}" style="height:400px;"></div>
  </div>

  <!-- ================================================================== -->
  <!-- Example 2: Auto-discovery with a different graph -->
  <!-- ================================================================== -->
  <div class="section">
    <h2>2. Auto-Discovery (Event &rarr; Branch &rarr; PrintString)</h2>
    <p>Multiple embeds on the same page work independently.</p>
    <div class="ueflow-embed" data-t3d="${escapeAttr(SAMPLE_T3D_2)}" style="height:400px;"></div>
  </div>

  <!-- ================================================================== -->
  <!-- Example 3: Programmatic API -->
  <!-- ================================================================== -->
  <div class="section">
    <h2>3. Minimal Embed (No Chrome)</h2>
    <p>Hide controls, minimap, toolbar, and zoom indicator with <code>data-show-*="false"</code> attributes.</p>
    <pre><code>&lt;div class="ueflow-embed" data-t3d="..."
     data-show-controls="false" data-show-minimap="false"
     data-show-export-toolbar="false" data-show-zoom-indicator="false"&gt;&lt;/div&gt;</code></pre>
    <div class="ueflow-embed" data-t3d="${escapeAttr(SAMPLE_T3D_1)}" data-show-controls="false" data-show-minimap="false" data-show-export-toolbar="false" data-show-zoom-indicator="false" style="height:350px;"></div>
  </div>

  <!-- ================================================================== -->
  <!-- Example 4: Custom Theme -->
  <!-- ================================================================== -->
  <div class="section">
    <h2>4. Custom Theme</h2>
    <p>Override background and accent colors with <code>data-background-color</code> and <code>data-accent-color</code>.</p>
    <pre><code>&lt;div class="ueflow-embed" data-t3d="..."
     data-background-color="#1a1a2e" data-accent-color="#e94560"&gt;&lt;/div&gt;</code></pre>
    <div class="ueflow-embed" data-t3d="${escapeAttr(SAMPLE_T3D_2)}" data-background-color="#1a1a2e" data-accent-color="#e94560" style="height:400px;"></div>
  </div>

  <!-- ================================================================== -->
  <!-- Example 5: Lazy Loading -->
  <!-- ================================================================== -->
  <div class="section">
    <h2>5. Lazy Loading</h2>
    <p>Use <code>data-lazy="true"</code> to defer rendering until the embed scrolls into view. Scroll down to see it load.</p>
    <pre><code>&lt;div class="ueflow-embed" data-t3d="..." data-lazy="true"&gt;&lt;/div&gt;</code></pre>
    <div class="ueflow-embed" data-t3d="${escapeAttr(SAMPLE_T3D_2)}" data-lazy="true" style="height:400px;"></div>
  </div>

  <!-- ================================================================== -->
  <!-- Example 6: Programmatic API with Callbacks -->
  <!-- ================================================================== -->
  <div class="section">
    <h2>6. Programmatic API with Callbacks</h2>
    <p>Use <code>UEFlow.renderT3D(container, t3dText, options)</code> with event callbacks. Open the browser console to see callback logs.</p>
    <pre><code>UEFlow.renderT3D(el, t3dText, {
  height: '400px',
  showMiniMap: false,
  onLoad: (inst) =&gt; console.log('Loaded!', inst),
  onSelectionChange: (title) =&gt; console.log('Selected:', title),
  onError: (err) =&gt; console.error('Error:', err),
});</code></pre>
    <div id="programmatic-graph"></div>
  </div>

  <!-- IIFE bundle (inlined) -->
  <script>${jsContent}</script>

  <!-- Programmatic render after IIFE loads -->
  <script>
    var t3d = \`${escapeJS(SAMPLE_T3D_1)}\`;
    UEFlow.renderT3D(
      document.getElementById('programmatic-graph'),
      t3d,
      {
        height: '400px',
        title: 'Programmatic Render',
        showMiniMap: false,
        onLoad: function(inst) { console.log('[ue-flow] onLoad fired', inst); },
        onSelectionChange: function(title) { console.log('[ue-flow] onSelectionChange:', title); },
        onError: function(err) { console.error('[ue-flow] onError:', err); },
      }
    );
  </script>
</body>
</html>
`;

fs.writeFileSync(outPath, html, 'utf-8');
const sizeMB = (fs.statSync(outPath).size / 1024 / 1024).toFixed(1);
console.log(`Built ${outPath} (${sizeMB} MB)`);
