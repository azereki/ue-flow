"""Edge-case tests for ue_flow.t3d_parser — malformed/unusual T3D inputs."""
from __future__ import annotations

from ue_flow.t3d_parser import parse_single_node, parse_paste_text


# ===================================================================
# Empty / trivial inputs
# ===================================================================


class TestEmptyInputs:
    """Parser behaviour with empty or near-empty inputs."""

    def test_empty_string_returns_empty_graph(self):
        graph = parse_paste_text("")
        assert len(graph.nodes) == 0

    def test_whitespace_only_returns_empty_graph(self):
        graph = parse_paste_text("   \n\n\t\n  ")
        assert len(graph.nodes) == 0

    def test_garbage_text_returns_empty_graph(self):
        graph = parse_paste_text("this is not T3D at all")
        assert len(graph.nodes) == 0

    def test_incomplete_begin_object_returns_empty(self):
        """Begin Object without matching End Object should yield nothing."""
        graph = parse_paste_text("Begin Object Class=Foo Name=\"Bar\"\n   NodePosX=0\n")
        assert len(graph.nodes) == 0


# ===================================================================
# Single node edge cases
# ===================================================================


class TestSingleNodeEdgeCases:
    """Unusual but valid single-node blocks."""

    def test_node_with_no_pins(self):
        t3d = """\
Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"
   NodePosX=0
   NodePosY=0
   NodeGuid=AAAA1111222233334444555566667777
End Object"""
        node = parse_single_node(t3d)
        assert node is not None
        assert node.pins == []
        assert node.node_name == "K2Node_Event_0"

    def test_node_missing_guid_gets_generated(self):
        """When NodeGuid is absent, the dataclass default generates one."""
        t3d = """\
Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"
   NodePosX=100
   NodePosY=200
End Object"""
        node = parse_single_node(t3d)
        assert node is not None
        # Should have a 32-char hex GUID from the default factory
        assert len(node.node_guid) == 32
        assert all(c in "0123456789ABCDEF" for c in node.node_guid)

    def test_node_missing_position_defaults_to_zero(self):
        t3d = """\
Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"
   NodeGuid=BBBB1111222233334444555566667777
End Object"""
        node = parse_single_node(t3d)
        assert node is not None
        assert node.pos_x == 0
        assert node.pos_y == 0

    def test_pin_with_no_linked_to(self):
        """A pin without LinkedTo should have an empty list."""
        t3d = """\
Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"
   NodePosX=0
   NodePosY=0
   NodeGuid=CCCC1111222233334444555566667777
   CustomProperties Pin (PinId=1111AAAA2222BBBB3333CCCC4444DDDD,PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object"""
        node = parse_single_node(t3d)
        assert node is not None
        pin = node.pins[0]
        assert pin.linked_to == []

    def test_extremely_long_property_value(self):
        """Property values with 10K+ characters should parse without error."""
        long_value = "A" * 15000
        t3d = f"""\
Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"
   NodePosX=0
   NodePosY=0
   NodeGuid=DDDD1111222233334444555566667777
   LongProp={long_value}
End Object"""
        node = parse_single_node(t3d)
        assert node is not None
        assert node.properties["LongProp"] == long_value

    def test_unicode_in_property_values(self):
        """Unicode characters in property values should be preserved."""
        t3d = """\
Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"
   NodePosX=0
   NodePosY=0
   NodeGuid=EEEE1111222233334444555566667777
   NodeComment=\u00c9l\u00e8ve \u4e16\u754c \ud83c\udf1f
End Object"""
        node = parse_single_node(t3d)
        assert node is not None
        assert "\u00c9" in node.properties["NodeComment"]
        assert "\u4e16" in node.properties["NodeComment"]

    def test_unicode_in_pin_name(self):
        """Pin names with unicode should round-trip through the tokenizer."""
        t3d = """\
Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_0"
   NodePosX=0
   NodePosY=0
   NodeGuid=FFFF1111222233334444555566667777
   CustomProperties Pin (PinId=AAAA2222333344445555666677778888,PinName="R\u00e9sultat",PinType.PinCategory="string",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object"""
        node = parse_single_node(t3d)
        assert node is not None
        assert node.pins[0].pin_name == "R\u00e9sultat"


# ===================================================================
# Multiple nodes with duplicate / unusual names
# ===================================================================


class TestDuplicateNames:
    """Graphs with multiple nodes sharing the same name or class."""

    def test_duplicate_node_names_both_parsed(self):
        """Two nodes with identical names should both be present in the graph."""
        t3d = """\
Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"
   NodePosX=0
   NodePosY=0
   NodeGuid=AAAA1111222233334444555566667777
End Object

Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"
   NodePosX=200
   NodePosY=0
   NodeGuid=BBBB1111222233334444555566667777
End Object"""
        graph = parse_paste_text(t3d)
        assert len(graph.nodes) == 2
        # Both should parse — duplicates are the user's problem, not the parser's
        assert graph.nodes[0].node_guid != graph.nodes[1].node_guid

    def test_many_nodes_parsed_correctly(self):
        """Parsing 20+ nodes should work without issue."""
        blocks = []
        for i in range(25):
            guid = f"{i:032X}"
            blocks.append(f"""\
Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_{i}"
   NodePosX={i * 200}
   NodePosY=0
   NodeGuid={guid}
End Object""")
        t3d = "\n\n".join(blocks)
        graph = parse_paste_text(t3d)
        assert len(graph.nodes) == 25


# ===================================================================
# Pin default value edge cases
# ===================================================================


class TestPinDefaultEdgeCases:
    """Edge cases in pin default values."""

    def test_pin_default_value_with_commas(self):
        """DefaultValue containing commas inside quotes should be preserved."""
        t3d = """\
Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_0"
   NodePosX=0
   NodePosY=0
   NodeGuid=AAAA3333444455556666777788889999
   CustomProperties Pin (PinId=BBBB3333444455556666777788889999,PinName="InString",PinType.PinCategory="string",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,DefaultValue="Hello, World!",PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object"""
        node = parse_single_node(t3d)
        assert node is not None
        pin = node.pins[0]
        assert pin.default_value == "Hello, World!"

    def test_pin_empty_default_value(self):
        """Pin with DefaultValue="" should parse as empty string."""
        t3d = """\
Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_0"
   NodePosX=0
   NodePosY=0
   NodeGuid=CCCC3333444455556666777788889999
   CustomProperties Pin (PinId=DDDD3333444455556666777788889999,PinName="InString",PinType.PinCategory="string",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,DefaultValue="",PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object"""
        node = parse_single_node(t3d)
        assert node is not None
        pin = node.pins[0]
        assert pin.default_value == ""


# ===================================================================
# Graph metadata edge cases
# ===================================================================


class TestGraphMetadataEdgeCases:
    """Edge cases for asset_path and graph_name extraction."""

    def test_default_graph_name_is_event_graph(self):
        """When no ExportPath is present, graph_name defaults to EventGraph."""
        t3d = """\
Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"
   NodePosX=0
   NodePosY=0
   NodeGuid=AAAA4444555566667777888899990000
End Object"""
        graph = parse_paste_text(t3d)
        assert graph.graph_name == "EventGraph"
        assert graph.asset_path == ""

    def test_nodes_without_begin_end_ignored(self):
        """Stray text between valid blocks should not cause errors."""
        t3d = """\
Some random header text

Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"
   NodePosX=0
   NodePosY=0
   NodeGuid=BBBB4444555566667777888899990000
End Object

More random text in between

Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_1"
   NodePosX=200
   NodePosY=0
   NodeGuid=CCCC4444555566667777888899990000
End Object

Trailing text"""
        graph = parse_paste_text(t3d)
        assert len(graph.nodes) == 2
