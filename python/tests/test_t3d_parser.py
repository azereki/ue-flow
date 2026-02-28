"""Tests for ue_flow.t3d_parser — parse T3D paste text back into model objects."""
from __future__ import annotations

import pytest

from ue_flow.t3d_models import PinCategory, PinDirection
from ue_flow.t3d_parser import parse_single_node, parse_paste_text


# ---------------------------------------------------------------------------
# Inline T3D snippets used across tests
# ---------------------------------------------------------------------------

EVENT_NODE_T3D = """\
Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"
   EventReference=(MemberParent="/Script/Engine.Actor",MemberName="ReceiveBeginPlay")
   bOverrideFunction=True
   NodePosX=100
   NodePosY=200
   NodeGuid=AAAABBBBCCCCDDDDEEEEFFFFAAAABBBB
   CustomProperties Pin (PinId=11112222333344445555666677778888,PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,PinType.bIsUObjectWrapper=False,PinType.bSerializeAsSinglePrecisionFloat=False,LinkedTo=(K2Node_CallFunction_0 AABB112233445566AABB112233445566,),PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
   CustomProperties Pin (PinId=CCCC1111222233334444555566667777,PinName="OutputDelegate",Direction="EGPD_Output",PinType.PinCategory="delegate",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,PinType.bIsUObjectWrapper=False,PinType.bSerializeAsSinglePrecisionFloat=False,PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object"""

CALL_FUNCTION_NODE_T3D = """\
Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_0"
   FunctionReference=(MemberParent="/Script/Engine.KismetSystemLibrary",MemberName="PrintString")
   bIsPureFunc=False
   NodePosX=400
   NodePosY=200
   NodeGuid=BBBB1111222233334444555566667777
   CustomProperties Pin (PinId=AABB112233445566AABB112233445566,PinName="execute",PinType.PinCategory="exec",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,PinType.bIsUObjectWrapper=False,PinType.bSerializeAsSinglePrecisionFloat=False,LinkedTo=(K2Node_Event_0 11112222333344445555666677778888,),PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
   CustomProperties Pin (PinId=DDDD1111222233334444555566667777,PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,PinType.bIsUObjectWrapper=False,PinType.bSerializeAsSinglePrecisionFloat=False,PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
   CustomProperties Pin (PinId=EEEE1111222233334444555566667777,PinName="InString",PinType.PinCategory="string",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,PinType.bIsUObjectWrapper=False,PinType.bSerializeAsSinglePrecisionFloat=False,DefaultValue="Hello from Blueprint!",PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object"""

EXPORT_PATH_NODE_T3D = """\
Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0" ExportPath="/Script/BlueprintGraph.K2Node_Event'/Game/MyBP.MyBP:EventGraph.K2Node_Event_0'"
   EventReference=(MemberParent="/Script/Engine.Actor",MemberName="ReceiveBeginPlay")
   bOverrideFunction=True
   NodePosX=0
   NodePosY=0
   NodeGuid=FFFF1111222233334444555566667777
End Object"""


# ===================================================================
# TestParseSingleNode
# ===================================================================

class TestParseSingleNode:
    """Tests for parse_single_node() with various node types."""

    def test_parse_event_node(self):
        node = parse_single_node(EVENT_NODE_T3D)
        assert node is not None
        assert node.node_class == "/Script/BlueprintGraph.K2Node_Event"
        assert node.node_name == "K2Node_Event_0"
        assert "EventReference" in node.properties
        assert "ReceiveBeginPlay" in node.properties["EventReference"]
        assert node.properties["bOverrideFunction"] == "True"

    def test_parse_call_function_node(self):
        node = parse_single_node(CALL_FUNCTION_NODE_T3D)
        assert node is not None
        assert node.node_class == "/Script/BlueprintGraph.K2Node_CallFunction"
        assert node.node_name == "K2Node_CallFunction_0"
        assert "FunctionReference" in node.properties
        assert "PrintString" in node.properties["FunctionReference"]
        assert node.properties["bIsPureFunc"] == "False"

    def test_parse_node_position(self):
        node = parse_single_node(EVENT_NODE_T3D)
        assert node is not None
        assert node.pos_x == 100
        assert node.pos_y == 200

    def test_parse_node_guid(self):
        node = parse_single_node(EVENT_NODE_T3D)
        assert node is not None
        assert node.node_guid == "AAAABBBBCCCCDDDDEEEEFFFFAAAABBBB"

    def test_parse_node_with_export_path(self):
        node = parse_single_node(EXPORT_PATH_NODE_T3D)
        assert node is not None
        assert node.node_class == "/Script/BlueprintGraph.K2Node_Event"
        assert node.node_name == "K2Node_Event_0"
        assert node.node_guid == "FFFF1111222233334444555566667777"

    def test_parse_empty_input(self):
        result = parse_single_node("")
        assert result is None

    def test_parse_whitespace_only(self):
        result = parse_single_node("   \n\n  ")
        assert result is None


# ===================================================================
# TestParsePins
# ===================================================================

class TestParsePins:
    """Tests for pin parsing within node blocks."""

    def test_parse_exec_pin(self):
        node = parse_single_node(EVENT_NODE_T3D)
        assert node is not None
        then_pin = next((p for p in node.pins if p.pin_name == "then"), None)
        assert then_pin is not None
        assert then_pin.category == PinCategory.EXEC
        assert then_pin.direction == PinDirection.OUTPUT

    def test_parse_data_pin_with_default(self):
        node = parse_single_node(CALL_FUNCTION_NODE_T3D)
        assert node is not None
        in_str_pin = next((p for p in node.pins if p.pin_name == "InString"), None)
        assert in_str_pin is not None
        assert in_str_pin.category == PinCategory.STRING
        assert in_str_pin.default_value == "Hello from Blueprint!"

    def test_parse_pin_with_linked_to(self):
        node = parse_single_node(EVENT_NODE_T3D)
        assert node is not None
        then_pin = next((p for p in node.pins if p.pin_name == "then"), None)
        assert then_pin is not None
        assert len(then_pin.linked_to) == 1
        assert then_pin.linked_to[0] == ("K2Node_CallFunction_0", "AABB112233445566AABB112233445566")

    def test_parse_pin_with_multiple_linked(self):
        t3d = """\
Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"
   NodePosX=0
   NodePosY=0
   NodeGuid=AAAA1111222233334444555566667777
   CustomProperties Pin (PinId=1111AAAA2222BBBB3333CCCC4444DDDD,PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,LinkedTo=(K2Node_CallFunction_0 AABB112233445566AABB112233445566,K2Node_IfThenElse_0 CCDD112233445566CCDD112233445566,),PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object"""
        node = parse_single_node(t3d)
        assert node is not None
        then_pin = next((p for p in node.pins if p.pin_name == "then"), None)
        assert then_pin is not None
        assert len(then_pin.linked_to) == 2
        assert then_pin.linked_to[0] == ("K2Node_CallFunction_0", "AABB112233445566AABB112233445566")
        assert then_pin.linked_to[1] == ("K2Node_IfThenElse_0", "CCDD112233445566CCDD112233445566")

    def test_parse_hidden_pin(self):
        t3d = """\
Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_0"
   NodePosX=0
   NodePosY=0
   NodeGuid=AAAA2222333344445555666677778888
   CustomProperties Pin (PinId=FFFF1111222233334444555566667777,PinName="self",PinType.PinCategory="object",PinType.PinSubCategory="",PinType.PinSubCategoryObject=/Script/Engine.KismetSystemLibrary,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,PersistentGuid=00000000000000000000000000000000,bHidden=True,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object"""
        node = parse_single_node(t3d)
        assert node is not None
        self_pin = next((p for p in node.pins if p.pin_name == "self"), None)
        assert self_pin is not None
        assert self_pin.hidden is True

    def test_parse_advanced_view_pin(self):
        t3d = """\
Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_0"
   NodePosX=0
   NodePosY=0
   NodeGuid=AAAA3333444455556666777788889999
   CustomProperties Pin (PinId=1111AAAA2222BBBB3333CCCC4444DDDD,PinName="bPrintToLog",PinType.PinCategory="bool",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,DefaultValue="true",PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=True,bOrphanedPin=False,)
End Object"""
        node = parse_single_node(t3d)
        assert node is not None
        pin = next((p for p in node.pins if p.pin_name == "bPrintToLog"), None)
        assert pin is not None
        assert pin.advanced_view is True
        assert pin.category == PinCategory.BOOL
        assert pin.default_value == "true"

    def test_parse_pin_subcategory_object(self):
        t3d = """\
Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_0"
   NodePosX=0
   NodePosY=0
   NodeGuid=AAAA4444555566667777888899990000
   CustomProperties Pin (PinId=2222AAAA3333BBBB4444CCCC5555DDDD,PinName="WorldContextObject",PinType.PinCategory="object",PinType.PinSubCategory="",PinType.PinSubCategoryObject=/Script/CoreUObject.Object,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=True,PinType.bIsWeakPointer=False,PersistentGuid=00000000000000000000000000000000,bHidden=True,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object"""
        node = parse_single_node(t3d)
        assert node is not None
        pin = next((p for p in node.pins if p.pin_name == "WorldContextObject"), None)
        assert pin is not None
        assert pin.category == PinCategory.OBJECT
        assert pin.sub_category_object == "/Script/CoreUObject.Object"
        assert pin.hidden is True

    def test_parse_pin_with_friendly_name(self):
        t3d = """\
Begin Object Class=/Script/BlueprintGraph.K2Node_IfThenElse Name="K2Node_IfThenElse_0"
   NodePosX=0
   NodePosY=0
   NodeGuid=AAAA5555666677778888999900001111
   CustomProperties Pin (PinId=3333AAAA4444BBBB5555CCCC6666DDDD,PinName="then",PinFriendlyName="True",Direction="EGPD_Output",PinType.PinCategory="exec",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object"""
        node = parse_single_node(t3d)
        assert node is not None
        pin = next((p for p in node.pins if p.pin_name == "then"), None)
        assert pin is not None
        assert pin.friendly_name == "True"
        assert pin.direction == PinDirection.OUTPUT

    def test_parse_pin_container_type(self):
        t3d = """\
Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_0"
   NodePosX=0
   NodePosY=0
   NodeGuid=AAAA6666777788889999000011112222
   CustomProperties Pin (PinId=4444AAAA5555BBBB6666CCCC7777DDDD,PinName="OutActors",Direction="EGPD_Output",PinType.PinCategory="object",PinType.PinSubCategory="",PinType.PinSubCategoryObject=/Script/Engine.Actor,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=Array,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object"""
        node = parse_single_node(t3d)
        assert node is not None
        pin = next((p for p in node.pins if p.pin_name == "OutActors"), None)
        assert pin is not None
        assert pin.container_type == "Array"
        assert pin.sub_category_object == "/Script/Engine.Actor"
        assert pin.direction == PinDirection.OUTPUT

    def test_parse_pin_reference_const_weak(self):
        t3d = """\
Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_0"
   NodePosX=0
   NodePosY=0
   NodeGuid=AAAA7777888899990000111122223333
   CustomProperties Pin (PinId=5555AAAA6666BBBB7777CCCC8888DDDD,PinName="Target",PinType.PinCategory="object",PinType.PinSubCategory="",PinType.PinSubCategoryObject=/Script/Engine.Actor,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=True,PinType.bIsConst=True,PinType.bIsWeakPointer=True,PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object"""
        node = parse_single_node(t3d)
        assert node is not None
        pin = next((p for p in node.pins if p.pin_name == "Target"), None)
        assert pin is not None
        assert pin.is_reference is True
        assert pin.is_const is True
        assert pin.is_weak is True

    def test_parse_pin_autogen_default(self):
        t3d = """\
Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_0"
   NodePosX=0
   NodePosY=0
   NodeGuid=AAAA8888999900001111222233334444
   CustomProperties Pin (PinId=6666AAAA7777BBBB8888CCCC9999DDDD,PinName="Duration",PinType.PinCategory="real",PinType.PinSubCategory="double",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,DefaultValue="2.0",AutogeneratedDefaultValue="0.0",PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object"""
        node = parse_single_node(t3d)
        assert node is not None
        pin = next((p for p in node.pins if p.pin_name == "Duration"), None)
        assert pin is not None
        assert pin.category == PinCategory.REAL
        assert pin.sub_category == "double"
        assert pin.default_value == "2.0"
        assert pin.autogen_default == "0.0"

    def test_parse_input_pin_direction_defaults(self):
        node = parse_single_node(CALL_FUNCTION_NODE_T3D)
        assert node is not None
        exec_pin = next((p for p in node.pins if p.pin_name == "execute"), None)
        assert exec_pin is not None
        assert exec_pin.direction == PinDirection.INPUT

    def test_parse_pin_id_preserved(self):
        node = parse_single_node(CALL_FUNCTION_NODE_T3D)
        assert node is not None
        exec_pin = next((p for p in node.pins if p.pin_name == "execute"), None)
        assert exec_pin is not None
        assert exec_pin.pin_id == "AABB112233445566AABB112233445566"

    def test_parse_delegate_pin_category(self):
        node = parse_single_node(EVENT_NODE_T3D)
        assert node is not None
        delegate_pin = next((p for p in node.pins if p.pin_name == "OutputDelegate"), None)
        assert delegate_pin is not None
        assert delegate_pin.category == PinCategory.DELEGATE
        assert delegate_pin.direction == PinDirection.OUTPUT


# ===================================================================
# TestParsePasteText
# ===================================================================

class TestParsePasteText:
    """Tests for parse_paste_text() with multi-node graphs."""

    def test_parse_two_node_graph(self):
        two_node_text = EVENT_NODE_T3D + "\n\n" + CALL_FUNCTION_NODE_T3D
        graph = parse_paste_text(two_node_text)
        assert len(graph.nodes) == 2
        names = {n.node_name for n in graph.nodes}
        assert "K2Node_Event_0" in names
        assert "K2Node_CallFunction_0" in names

    def test_parse_empty_graph(self):
        graph = parse_paste_text("")
        assert len(graph.nodes) == 0

    def test_parse_single_node_via_paste(self):
        graph = parse_paste_text(EVENT_NODE_T3D)
        assert len(graph.nodes) == 1
        assert graph.nodes[0].node_name == "K2Node_Event_0"

    def test_parse_preserves_node_order(self):
        two_node_text = CALL_FUNCTION_NODE_T3D + "\n\n" + EVENT_NODE_T3D
        graph = parse_paste_text(two_node_text)
        assert len(graph.nodes) == 2
        assert graph.nodes[0].node_name == "K2Node_CallFunction_0"
        assert graph.nodes[1].node_name == "K2Node_Event_0"


# ===================================================================
# TestRoundTrip (self-contained, no template dependency)
# ===================================================================

from ue_flow.t3d_serializer import serialize_graph


class TestRoundTrip:
    """Serialize to T3D text, parse back, and verify integrity."""

    def test_round_trip_two_node_graph(self):
        """Serialize two-node graph, parse back, compare node counts and names."""
        two_node_text = EVENT_NODE_T3D + "\n\n" + CALL_FUNCTION_NODE_T3D
        graph = parse_paste_text(two_node_text)
        text = serialize_graph(graph)
        parsed = parse_paste_text(text)

        assert len(parsed.nodes) == len(graph.nodes)
        original_names = {n.node_name for n in graph.nodes}
        parsed_names = {n.node_name for n in parsed.nodes}
        assert original_names == parsed_names

    def test_round_trip_preserves_connections(self):
        """Verify LinkedTo references survive serialize -> parse."""
        two_node_text = EVENT_NODE_T3D + "\n\n" + CALL_FUNCTION_NODE_T3D
        graph = parse_paste_text(two_node_text)
        text = serialize_graph(graph)
        parsed = parse_paste_text(text)

        event_node = next(
            (n for n in parsed.nodes if "Event" in n.node_class), None
        )
        assert event_node is not None

        then_pin = next(
            (p for p in event_node.pins if p.pin_name == "then"), None
        )
        assert then_pin is not None
        assert len(then_pin.linked_to) >= 1

    def test_round_trip_preserves_positions(self):
        """Node positions survive serialize -> parse round trip."""
        two_node_text = EVENT_NODE_T3D + "\n\n" + CALL_FUNCTION_NODE_T3D
        graph = parse_paste_text(two_node_text)
        text = serialize_graph(graph)
        parsed = parse_paste_text(text)

        for orig_node in graph.nodes:
            parsed_node = next(
                (n for n in parsed.nodes if n.node_name == orig_node.node_name), None
            )
            assert parsed_node is not None
            assert parsed_node.pos_x == orig_node.pos_x
            assert parsed_node.pos_y == orig_node.pos_y

    def test_round_trip_preserves_node_guid(self):
        """NodeGuid values survive serialize -> parse round trip."""
        two_node_text = EVENT_NODE_T3D + "\n\n" + CALL_FUNCTION_NODE_T3D
        graph = parse_paste_text(two_node_text)
        text = serialize_graph(graph)
        parsed = parse_paste_text(text)

        for orig_node in graph.nodes:
            parsed_node = next(
                (n for n in parsed.nodes if n.node_name == orig_node.node_name), None
            )
            assert parsed_node is not None
            assert parsed_node.node_guid == orig_node.node_guid

    def test_round_trip_preserves_pin_count(self):
        """Pin count per node survives serialize -> parse round trip."""
        two_node_text = EVENT_NODE_T3D + "\n\n" + CALL_FUNCTION_NODE_T3D
        graph = parse_paste_text(two_node_text)
        text = serialize_graph(graph)
        parsed = parse_paste_text(text)

        for orig_node in graph.nodes:
            parsed_node = next(
                (n for n in parsed.nodes if n.node_name == orig_node.node_name), None
            )
            assert parsed_node is not None
            assert len(parsed_node.pins) == len(orig_node.pins)
