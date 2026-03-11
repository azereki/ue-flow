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

/** Helper: paste T3D and wait for graph to render */
async function pasteAndRender(page: import('@playwright/test').Page) {
  await page.goto('/examples/paste-tool.html');
  await page.waitForSelector('.ueflow-paste-textarea', { timeout: 10_000 });
  await page.locator('.ueflow-paste-textarea').fill(SAMPLE_T3D);
  await page.locator('.ueflow-paste-btn').click();
  await page.waitForSelector('.react-flow__node', { timeout: 15_000 });
}

test.describe('node interaction', () => {
  test('clicking a node selects it', async ({ page }) => {
    await pasteAndRender(page);

    const node = page.locator('.react-flow__node').first();
    await node.click();

    // React Flow adds "selected" class to selected nodes
    await expect(node).toHaveClass(/selected/);
  });

  test('delete key removes selected node', async ({ page }) => {
    await pasteAndRender(page);

    const initialCount = await page.locator('.react-flow__node').count();
    expect(initialCount).toBe(2);

    // Select and delete a node
    const node = page.locator('.react-flow__node').first();
    await node.click();
    await page.keyboard.press('Delete');

    // Wait for node removal
    await expect(page.locator('.react-flow__node')).toHaveCount(initialCount - 1);
  });

  test('undo restores deleted node', async ({ page }) => {
    await pasteAndRender(page);

    const initialCount = await page.locator('.react-flow__node').count();

    // Select and delete
    await page.locator('.react-flow__node').first().click();
    await page.keyboard.press('Delete');
    await expect(page.locator('.react-flow__node')).toHaveCount(initialCount - 1);

    // Undo with Ctrl+Z
    await page.keyboard.press('Control+z');
    await expect(page.locator('.react-flow__node')).toHaveCount(initialCount);
  });

  test('Tab key opens node palette', async ({ page }) => {
    await pasteAndRender(page);

    // Click on canvas (pane) first to ensure focus
    await page.locator('.react-flow__pane').click();
    await page.keyboard.press('Tab');

    await expect(page.locator('.ueflow-node-palette')).toBeVisible({ timeout: 3_000 });
  });

  test('Escape closes node palette', async ({ page }) => {
    await pasteAndRender(page);

    // Open palette
    await page.locator('.react-flow__pane').click();
    await page.keyboard.press('Tab');
    await expect(page.locator('.ueflow-node-palette')).toBeVisible({ timeout: 3_000 });

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('.ueflow-node-palette')).not.toBeVisible();
  });
});
