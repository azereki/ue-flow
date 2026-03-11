"""Tests for bidirectional link enforcement in t3d_serializer.ensure_bidirectional_links.

Verifies that:
- Unidirectional links get reverse links added
- Already-bidirectional links are not duplicated
- Multiple pins linking to the same target all get reverse links
- Full parse → serialize round-trips produce correct bidirectional links
"""
from __future__ import annotations

from ue_flow.t3d_models import (
    BlueprintGraph,
    BlueprintNode,
    BlueprintPin,
    PinCategory,
    PinDirection,
)
from ue_flow.t3d_parser import parse_paste_text
from ue_flow.t3d_serializer import ensure_bidirectional_links, serialize_graph


# ===================================================================
# Direct ensure_bidirectional_links tests
# ===================================================================


class TestEnsureBidirectionalLinks:
    """Unit tests for ensure_bidirectional_links() on constructed graphs."""

    def test_unidirectional_link_gets_reverse(self):
        """A→B with no B→A should result in B→A being added."""
        pin_a = BlueprintPin(
            pin_name="then",
            direction=PinDirection.OUTPUT,
            category=PinCategory.EXEC,
            pin_id="AAAA1111222233334444555566667777",
            linked_to=[("NodeB", "BBBB1111222233334444555566667777")],
        )
        pin_b = BlueprintPin(
            pin_name="execute",
            direction=PinDirection.INPUT,
            category=PinCategory.EXEC,
            pin_id="BBBB1111222233334444555566667777",
        )
        node_a = BlueprintNode(node_class="A", node_name="NodeA", pins=[pin_a])
        node_b = BlueprintNode(node_class="B", node_name="NodeB", pins=[pin_b])
        graph = BlueprintGraph(nodes=[node_a, node_b])

        ensure_bidirectional_links(graph)

        assert ("NodeA", "AAAA1111222233334444555566667777") in pin_b.linked_to
        assert len(pin_b.linked_to) == 1

    def test_already_bidirectional_no_duplicates(self):
        """When both A→B and B→A already exist, no duplicates should be added."""
        pin_a = BlueprintPin(
            pin_name="then",
            direction=PinDirection.OUTPUT,
            category=PinCategory.EXEC,
            pin_id="AAAA2222333344445555666677778888",
            linked_to=[("NodeB", "BBBB2222333344445555666677778888")],
        )
        pin_b = BlueprintPin(
            pin_name="execute",
            direction=PinDirection.INPUT,
            category=PinCategory.EXEC,
            pin_id="BBBB2222333344445555666677778888",
            linked_to=[("NodeA", "AAAA2222333344445555666677778888")],
        )
        node_a = BlueprintNode(node_class="A", node_name="NodeA", pins=[pin_a])
        node_b = BlueprintNode(node_class="B", node_name="NodeB", pins=[pin_b])
        graph = BlueprintGraph(nodes=[node_a, node_b])

        ensure_bidirectional_links(graph)

        assert len(pin_a.linked_to) == 1
        assert len(pin_b.linked_to) == 1

    def test_multiple_pins_to_same_target(self):
        """Two pins on different nodes both linking to the same target pin."""
        pin_a1 = BlueprintPin(
            pin_name="out1",
            direction=PinDirection.OUTPUT,
            category=PinCategory.EXEC,
            pin_id="AAAA3333444455556666777788889999",
            linked_to=[("NodeC", "CCCC3333444455556666777788889999")],
        )
        pin_a2 = BlueprintPin(
            pin_name="out2",
            direction=PinDirection.OUTPUT,
            category=PinCategory.EXEC,
            pin_id="AAAA4444555566667777888899990000",
            linked_to=[("NodeC", "CCCC3333444455556666777788889999")],
        )
        pin_c = BlueprintPin(
            pin_name="execute",
            direction=PinDirection.INPUT,
            category=PinCategory.EXEC,
            pin_id="CCCC3333444455556666777788889999",
        )
        node_a = BlueprintNode(node_class="A", node_name="NodeA", pins=[pin_a1, pin_a2])
        node_c = BlueprintNode(node_class="C", node_name="NodeC", pins=[pin_c])
        graph = BlueprintGraph(nodes=[node_a, node_c])

        ensure_bidirectional_links(graph)

        # pin_c should have reverse links to both pins on NodeA
        assert ("NodeA", "AAAA3333444455556666777788889999") in pin_c.linked_to
        assert ("NodeA", "AAAA4444555566667777888899990000") in pin_c.linked_to
        assert len(pin_c.linked_to) == 2

    def test_chain_of_three_nodes(self):
        """A→B→C chain: all reverse links should be added."""
        pin_a_out = BlueprintPin(
            pin_name="then",
            direction=PinDirection.OUTPUT,
            category=PinCategory.EXEC,
            pin_id="A000111122223333444455556666AAAA",
            linked_to=[("NodeB", "B000111122223333444455556666AAAA")],
        )
        pin_b_in = BlueprintPin(
            pin_name="execute",
            direction=PinDirection.INPUT,
            category=PinCategory.EXEC,
            pin_id="B000111122223333444455556666AAAA",
        )
        pin_b_out = BlueprintPin(
            pin_name="then",
            direction=PinDirection.OUTPUT,
            category=PinCategory.EXEC,
            pin_id="B000222233334444555566667777BBBB",
            linked_to=[("NodeC", "C000111122223333444455556666AAAA")],
        )
        pin_c_in = BlueprintPin(
            pin_name="execute",
            direction=PinDirection.INPUT,
            category=PinCategory.EXEC,
            pin_id="C000111122223333444455556666AAAA",
        )

        node_a = BlueprintNode(node_class="A", node_name="NodeA", pins=[pin_a_out])
        node_b = BlueprintNode(node_class="B", node_name="NodeB", pins=[pin_b_in, pin_b_out])
        node_c = BlueprintNode(node_class="C", node_name="NodeC", pins=[pin_c_in])
        graph = BlueprintGraph(nodes=[node_a, node_b, node_c])

        ensure_bidirectional_links(graph)

        # B's input should link back to A
        assert ("NodeA", "A000111122223333444455556666AAAA") in pin_b_in.linked_to
        # C's input should link back to B
        assert ("NodeB", "B000222233334444555566667777BBBB") in pin_c_in.linked_to

    def test_data_pin_bidirectional(self):
        """Data (non-exec) pins also get bidirectional enforcement."""
        pin_getter = BlueprintPin(
            pin_name="ReturnValue",
            direction=PinDirection.OUTPUT,
            category=PinCategory.REAL,
            pin_id="D000111122223333444455556666AAAA",
            linked_to=[("NodeFunc", "D000222233334444555566667777BBBB")],
        )
        pin_param = BlueprintPin(
            pin_name="Value",
            direction=PinDirection.INPUT,
            category=PinCategory.REAL,
            pin_id="D000222233334444555566667777BBBB",
        )
        node_get = BlueprintNode(node_class="Get", node_name="NodeGet", pins=[pin_getter])
        node_func = BlueprintNode(node_class="Func", node_name="NodeFunc", pins=[pin_param])
        graph = BlueprintGraph(nodes=[node_get, node_func])

        ensure_bidirectional_links(graph)

        assert ("NodeGet", "D000111122223333444455556666AAAA") in pin_param.linked_to

    def test_idempotent_double_call(self):
        """Calling ensure_bidirectional_links twice should not add duplicates."""
        pin_a = BlueprintPin(
            pin_name="then",
            direction=PinDirection.OUTPUT,
            category=PinCategory.EXEC,
            pin_id="E000111122223333444455556666AAAA",
            linked_to=[("NodeB", "E000222233334444555566667777BBBB")],
        )
        pin_b = BlueprintPin(
            pin_name="execute",
            direction=PinDirection.INPUT,
            category=PinCategory.EXEC,
            pin_id="E000222233334444555566667777BBBB",
        )
        node_a = BlueprintNode(node_class="A", node_name="NodeA", pins=[pin_a])
        node_b = BlueprintNode(node_class="B", node_name="NodeB", pins=[pin_b])
        graph = BlueprintGraph(nodes=[node_a, node_b])

        ensure_bidirectional_links(graph)
        ensure_bidirectional_links(graph)

        assert len(pin_b.linked_to) == 1

    def test_link_to_nonexistent_node_ignored(self):
        """Links pointing to nodes not in the graph should not crash."""
        pin_a = BlueprintPin(
            pin_name="then",
            direction=PinDirection.OUTPUT,
            category=PinCategory.EXEC,
            pin_id="F000111122223333444455556666AAAA",
            linked_to=[("GhostNode", "F000222233334444555566667777BBBB")],
        )
        node_a = BlueprintNode(node_class="A", node_name="NodeA", pins=[pin_a])
        graph = BlueprintGraph(nodes=[node_a])

        # Should not raise
        ensure_bidirectional_links(graph)

        # Original link preserved, no crash
        assert len(pin_a.linked_to) == 1


# ===================================================================
# Round-trip tests: parse T3D → serialize → verify bidirectionality
# ===================================================================


class TestBidirectionalRoundTrip:
    """Parse T3D with unidirectional links, serialize, re-parse, verify."""

    UNIDIRECTIONAL_T3D = """\
Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"
   EventReference=(MemberParent="/Script/Engine.Actor",MemberName="ReceiveBeginPlay")
   bOverrideFunction=True
   NodePosX=0
   NodePosY=0
   NodeGuid=AAAA1111222233334444555566667777
   CustomProperties Pin (PinId=1111AAAA2222BBBB3333CCCC4444DDDD,PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,LinkedTo=(K2Node_CallFunction_0 2222AAAA3333BBBB4444CCCC5555DDDD,),PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object

Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_0"
   FunctionReference=(MemberParent="/Script/Engine.KismetSystemLibrary",MemberName="PrintString")
   NodePosX=300
   NodePosY=0
   NodeGuid=BBBB1111222233334444555566667777
   CustomProperties Pin (PinId=2222AAAA3333BBBB4444CCCC5555DDDD,PinName="execute",PinType.PinCategory="exec",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object"""

    def test_unidirectional_link_becomes_bidirectional_after_serialize(self):
        """Event.then→Function.execute (one-way) → serialize adds reverse link."""
        graph = parse_paste_text(self.UNIDIRECTIONAL_T3D)

        # Before serialize: Function's execute pin has NO linked_to
        func_node = next(n for n in graph.nodes if "CallFunction" in n.node_class)
        exec_pin = next(p for p in func_node.pins if p.pin_name == "execute")
        assert len(exec_pin.linked_to) == 0

        # Serialize triggers ensure_bidirectional_links
        t3d_out = serialize_graph(graph)

        # After serialize: the in-memory model is mutated
        assert len(exec_pin.linked_to) == 1
        assert exec_pin.linked_to[0] == ("K2Node_Event_0", "1111AAAA2222BBBB3333CCCC4444DDDD")

        # Re-parse the serialized output and verify both directions present
        reparsed = parse_paste_text(t3d_out)
        event_node = next(n for n in reparsed.nodes if "Event" in n.node_class)
        then_pin = next(p for p in event_node.pins if p.pin_name == "then")
        assert ("K2Node_CallFunction_0", "2222AAAA3333BBBB4444CCCC5555DDDD") in then_pin.linked_to

        func_node2 = next(n for n in reparsed.nodes if "CallFunction" in n.node_class)
        exec_pin2 = next(p for p in func_node2.pins if p.pin_name == "execute")
        assert ("K2Node_Event_0", "1111AAAA2222BBBB3333CCCC4444DDDD") in exec_pin2.linked_to

    BIDIRECTIONAL_T3D = """\
Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"
   NodePosX=0
   NodePosY=0
   NodeGuid=AAAA5555666677778888999900001111
   CustomProperties Pin (PinId=1111BBBB2222CCCC3333DDDD4444EEEE,PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,LinkedTo=(K2Node_CallFunction_0 2222BBBB3333CCCC4444DDDD5555EEEE,),PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object

Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_0"
   NodePosX=300
   NodePosY=0
   NodeGuid=BBBB5555666677778888999900001111
   CustomProperties Pin (PinId=2222BBBB3333CCCC4444DDDD5555EEEE,PinName="execute",PinType.PinCategory="exec",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,LinkedTo=(K2Node_Event_0 1111BBBB2222CCCC3333DDDD4444EEEE,),PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object"""

    def test_already_bidirectional_no_duplicates_after_serialize(self):
        """Already-bidirectional links should not get duplicate entries."""
        graph = parse_paste_text(self.BIDIRECTIONAL_T3D)
        t3d_out = serialize_graph(graph)
        reparsed = parse_paste_text(t3d_out)

        for node in reparsed.nodes:
            for pin in node.pins:
                if pin.linked_to:
                    # Each link should appear exactly once
                    unique_links = set(pin.linked_to)
                    assert len(unique_links) == len(pin.linked_to), (
                        f"Duplicate linked_to on {node.node_name}.{pin.pin_name}: {pin.linked_to}"
                    )

    def test_fan_out_all_targets_get_reverse(self):
        """One output pin linking to two input pins — both get reverse links."""
        t3d = """\
Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"
   NodePosX=0
   NodePosY=0
   NodeGuid=AAAA6666777788889999000011112222
   CustomProperties Pin (PinId=1111CCCC2222DDDD3333EEEE4444FFFF,PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,LinkedTo=(K2Node_CallFunction_0 2222CCCC3333DDDD4444EEEE5555FFFF,K2Node_CallFunction_1 3333CCCC4444DDDD5555EEEE6666FFFF,),PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object

Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_0"
   NodePosX=300
   NodePosY=0
   NodeGuid=BBBB6666777788889999000011112222
   CustomProperties Pin (PinId=2222CCCC3333DDDD4444EEEE5555FFFF,PinName="execute",PinType.PinCategory="exec",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object

Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_1"
   NodePosX=300
   NodePosY=200
   NodeGuid=CCCC6666777788889999000011112222
   CustomProperties Pin (PinId=3333CCCC4444DDDD5555EEEE6666FFFF,PinName="execute",PinType.PinCategory="exec",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object"""
        graph = parse_paste_text(t3d)
        serialize_graph(graph)  # triggers bidirectional enforcement

        func0 = next(n for n in graph.nodes if n.node_name == "K2Node_CallFunction_0")
        func0_exec = next(p for p in func0.pins if p.pin_name == "execute")
        assert ("K2Node_Event_0", "1111CCCC2222DDDD3333EEEE4444FFFF") in func0_exec.linked_to

        func1 = next(n for n in graph.nodes if n.node_name == "K2Node_CallFunction_1")
        func1_exec = next(p for p in func1.pins if p.pin_name == "execute")
        assert ("K2Node_Event_0", "1111CCCC2222DDDD3333EEEE4444FFFF") in func1_exec.linked_to
