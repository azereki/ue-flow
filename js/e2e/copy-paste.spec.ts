import { test, expect } from '@playwright/test';

const SAMPLE_T3D = `Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"
   EventReference=(MemberParent="/Script/Engine.Actor",MemberName="ReceiveBeginPlay")
   bOverrideFunction=True
   NodePosX=0
   NodePosY=0
   NodeGuid=A0000000000000000000000000000001
   CustomProperties Pin (PinId=A0000000000000000000000000000010,PinName="OutputDelegate",Direction="EGPD_Output",PinType.PinCategory="delegate",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,PinType.bIsUObjectWrapper=False,PinType.bSerializeAsSinglePrecisionFloat=False,PersistentGuid=00000000000000000000000000000000,bHidden=True,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
   CustomProperties Pin (PinId=A0000000000000000000000000000011,PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,PinType.bIsUObjectWrapper=False,PinType.bSerializeAsSinglePrecisionFloat=False,LinkedTo=(K2Node_CallFunction_0 A0000000000000000000000000000020,),PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object

Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_0"
   FunctionReference=(MemberParent="/Script/Engine.KismetSystemLibrary",MemberName="PrintString")
   NodePosX=300
   NodePosY=0
   NodeGuid=A0000000000000000000000000000002
   CustomProperties Pin (PinId=A0000000000000000000000000000020,PinName="execute",PinType.PinCategory="exec",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,PinType.bIsUObjectWrapper=False,PinType.bSerializeAsSinglePrecisionFloat=False,LinkedTo=(K2Node_Event_0 A0000000000000000000000000000011,),PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
   CustomProperties Pin (PinId=A0000000000000000000000000000021,PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,PinType.bIsUObjectWrapper=False,PinType.bSerializeAsSinglePrecisionFloat=False,PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
   CustomProperties Pin (PinId=A0000000000000000000000000000022,PinName="InString",PinType.PinCategory="string",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,PinType.bIsUObjectWrapper=False,PinType.bSerializeAsSinglePrecisionFloat=False,DefaultValue="Hello",PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object`;

async function pasteAndRender(page: import('@playwright/test').Page) {
  await page.goto('/examples/paste-tool.html');
  await page.waitForSelector('.ueflow-paste-textarea', { timeout: 10_000 });
  await page.locator('.ueflow-paste-textarea').fill(SAMPLE_T3D);
  await page.locator('.ueflow-paste-btn').click();
  await page.waitForSelector('.react-flow__node', { timeout: 15_000 });
}

test.describe('copy and paste', () => {
  test('Ctrl+A selects all nodes', async ({ page }) => {
    await pasteAndRender(page);

    // Click canvas first to ensure React Flow has focus
    await page.locator('.react-flow__pane').click();
    await page.keyboard.press('Control+a');

    // All nodes should have the "selected" class
    const nodes = page.locator('.react-flow__node');
    const count = await nodes.count();
    expect(count).toBe(2);

    for (let i = 0; i < count; i++) {
      await expect(nodes.nth(i)).toHaveClass(/selected/);
    }
  });

  test('Ctrl+D duplicates selected nodes', async ({ page }) => {
    await pasteAndRender(page);

    const initialCount = await page.locator('.react-flow__node').count();
    expect(initialCount).toBe(2);

    // Select all nodes
    await page.locator('.react-flow__pane').click();
    await page.keyboard.press('Control+a');

    // Duplicate
    await page.keyboard.press('Control+d');

    // Should have double the nodes
    await expect(page.locator('.react-flow__node')).toHaveCount(initialCount * 2, { timeout: 5_000 });
  });

  test('duplicated nodes have different positions than originals', async ({ page }) => {
    await pasteAndRender(page);

    // Collect original positions
    const getPositions = () =>
      page.locator('.react-flow__node').evaluateAll((nodes) =>
        nodes.map((n) => ({
          transform: n.style.transform || window.getComputedStyle(n).transform,
        })),
      );

    const beforePositions = await getPositions();

    // Select all and duplicate
    await page.locator('.react-flow__pane').click();
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Control+d');
    await expect(page.locator('.react-flow__node')).toHaveCount(4, { timeout: 5_000 });

    const afterPositions = await getPositions();

    // We should have more unique transforms than before (duplicates are offset)
    const beforeTransforms = new Set(beforePositions.map((p) => p.transform));
    const afterTransforms = new Set(afterPositions.map((p) => p.transform));
    expect(afterTransforms.size).toBeGreaterThan(beforeTransforms.size);
  });
});
