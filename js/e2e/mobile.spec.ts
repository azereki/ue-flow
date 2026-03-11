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

test.describe('mobile layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
  });

  test('landing page renders at mobile viewport', async ({ page }) => {
    await page.goto('/examples/paste-tool.html');
    await page.waitForSelector('.ueflow-paste-landing', { timeout: 10_000 });

    // The paste card should be visible and fit within mobile viewport
    const card = page.locator('.ueflow-paste-card');
    await expect(card).toBeVisible();

    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(375);
  });

  test('paste textarea is visible and usable at mobile size', async ({ page }) => {
    await page.goto('/examples/paste-tool.html');
    await page.waitForSelector('.ueflow-paste-textarea', { timeout: 10_000 });

    const textarea = page.locator('.ueflow-paste-textarea');
    await expect(textarea).toBeVisible();

    // Should be able to type into it
    await textarea.fill('test input');
    await expect(textarea).toHaveValue('test input');
  });

  test('graph renders at mobile viewport after paste', async ({ page }) => {
    await page.goto('/examples/paste-tool.html');
    await page.waitForSelector('.ueflow-paste-textarea', { timeout: 10_000 });

    await page.locator('.ueflow-paste-textarea').fill(SAMPLE_T3D);
    await page.locator('.ueflow-paste-btn').click();
    await page.waitForSelector('.react-flow__node', { timeout: 15_000 });

    // Nodes should render even at mobile size
    const nodes = page.locator('.react-flow__node');
    const count = await nodes.count();
    expect(count).toBe(2);
  });

  test('mock-render shows hamburger menu at mobile size', async ({ page }) => {
    // mock-render.html uses MultiGraphView which has the hamburger on mobile
    await page.goto('/examples/mock-render.html');
    await page.waitForSelector('.react-flow__nodes', { timeout: 10_000 });

    // The hamburger button should appear at mobile widths
    const hamburger = page.locator('.ueflow-topbar-menu-btn');
    await expect(hamburger).toBeVisible({ timeout: 3_000 });

    // Click hamburger to open mobile drawer
    await hamburger.click();

    // Drawer backdrop should appear
    const backdrop = page.locator('.ueflow-drawer-backdrop');
    await expect(backdrop).toBeVisible({ timeout: 3_000 });
  });
});
