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

test.describe('context menu', () => {
  test('right-click on node shows context menu with Delete', async ({ page }) => {
    await pasteAndRender(page);

    const node = page.locator('.react-flow__node').first();
    await node.click({ button: 'right' });

    const menu = page.locator('.ueflow-context-menu');
    await expect(menu).toBeVisible({ timeout: 3_000 });

    // Should have a Delete option
    const deleteItem = menu.locator('.ueflow-context-menu-label', { hasText: 'Delete' });
    await expect(deleteItem).toBeVisible();
  });

  test('right-click on empty canvas opens node palette', async ({ page }) => {
    await pasteAndRender(page);

    // Right-click on the empty pane area
    await page.locator('.react-flow__pane').click({ button: 'right', position: { x: 50, y: 50 } });

    // Should open node palette (not context menu)
    await expect(page.locator('.ueflow-node-palette')).toBeVisible({ timeout: 3_000 });
  });

  test('clicking a context menu action closes the menu', async ({ page }) => {
    await pasteAndRender(page);

    // Right-click a node to open context menu
    const node = page.locator('.react-flow__node').first();
    await node.click({ button: 'right' });
    await expect(page.locator('.ueflow-context-menu')).toBeVisible({ timeout: 3_000 });

    // Click the Delete action
    const deleteItem = page.locator('.ueflow-context-menu-item', { hasText: 'Delete' });
    await deleteItem.click();

    // Context menu should close
    await expect(page.locator('.ueflow-context-menu')).not.toBeVisible();
  });

  test('Escape closes context menu', async ({ page }) => {
    await pasteAndRender(page);

    const node = page.locator('.react-flow__node').first();
    await node.click({ button: 'right' });
    await expect(page.locator('.ueflow-context-menu')).toBeVisible({ timeout: 3_000 });

    await page.keyboard.press('Escape');
    await expect(page.locator('.ueflow-context-menu')).not.toBeVisible();
  });
});
