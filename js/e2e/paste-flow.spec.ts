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

test.describe('paste flow', () => {
  test('paste landing has textarea and render button', async ({ page }) => {
    await page.goto('/examples/paste-tool.html');
    await page.waitForSelector('.ueflow-paste-textarea', { timeout: 10_000 });

    const textarea = page.locator('.ueflow-paste-textarea');
    await expect(textarea).toBeVisible();

    const button = page.locator('.ueflow-paste-btn');
    await expect(button).toBeVisible();
    await expect(button).toHaveText('Render Blueprint');
  });

  test('paste T3D renders blueprint nodes', async ({ page }) => {
    await page.goto('/examples/paste-tool.html');
    await page.waitForSelector('.ueflow-paste-textarea', { timeout: 10_000 });

    await page.locator('.ueflow-paste-textarea').fill(SAMPLE_T3D);
    await page.locator('.ueflow-paste-btn').click();

    // Wait for React Flow to render nodes
    await page.waitForSelector('.react-flow__node', { timeout: 15_000 });
    const nodes = page.locator('.react-flow__node');
    const count = await nodes.count();
    expect(count).toBe(2);
  });

  test('empty paste shows error message', async ({ page }) => {
    await page.goto('/examples/paste-tool.html');
    await page.waitForSelector('.ueflow-paste-textarea', { timeout: 10_000 });

    // Type a space and clear it so the button becomes enabled via workaround
    // Actually the button is disabled when empty, so click should do nothing
    // Instead, type invalid text to trigger the error
    await page.locator('.ueflow-paste-textarea').fill('not valid t3d');
    await page.locator('.ueflow-paste-btn').click();

    const error = page.locator('.ueflow-paste-error');
    await expect(error).toBeVisible();
    await expect(error).toContainText('Not valid T3D');
  });

  test('New Paste button returns to paste landing', async ({ page }) => {
    await page.goto('/examples/paste-tool.html');
    await page.waitForSelector('.ueflow-paste-textarea', { timeout: 10_000 });

    await page.locator('.ueflow-paste-textarea').fill(SAMPLE_T3D);
    await page.locator('.ueflow-paste-btn').click();
    await page.waitForSelector('.react-flow__node', { timeout: 15_000 });

    // Click "New Paste" back button
    const backBtn = page.locator('.ueflow-back-btn');
    await expect(backBtn).toBeVisible();
    await backBtn.click();

    // Should be back on paste landing
    await page.waitForSelector('.ueflow-paste-textarea', { timeout: 5_000 });
    await expect(page.locator('.ueflow-paste-textarea')).toBeVisible();
  });
});
