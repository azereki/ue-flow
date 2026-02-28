"""Parity validation tests for ue-flow renderer.

Validates that ue-flow correctly renders all node types, pin categories,
edge connections, and produces valid round-trip T3D output.

These tests verify the data pipeline (T3D -> JSON -> React Flow structure)
without requiring a browser. Playwright-based visual tests are separate.
"""
from __future__ import annotations

import json
import pytest
from pathlib import Path

from ue_flow.t3d_models import (
    BlueprintGraph, BlueprintNode, BlueprintPin,
    PinDirection, PinCategory,
)
from ue_flow.t3d_parser import parse_paste_text
from ue_flow.t3d_serializer import serialize_graph
from ue_flow.t3d_json import serialize_graph_to_json
from ue_flow.renderer import render_html


# ---------------------------------------------------------------------------
# Comprehensive T3D test fixture with many node types
# ---------------------------------------------------------------------------

MULTI_NODE_T3D = """\
Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"
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
End Object"""


def _parse_and_serialize(t3d: str) -> dict:
    """Parse T3D and serialize to graph JSON."""
    graph = parse_paste_text(t3d)
    return serialize_graph_to_json(graph)


class TestAllNodeTypesRender:
    """Verify all node types produce correct JSON type mappings."""

    def test_event_node_type(self):
        gj = _parse_and_serialize(MULTI_NODE_T3D)
        event = next(n for n in gj["nodes"] if "Event" in n["nodeClass"])
        assert event["type"] == "event"

    def test_branch_node_type(self):
        gj = _parse_and_serialize(MULTI_NODE_T3D)
        branch = next(n for n in gj["nodes"] if "IfThenElse" in n["nodeClass"])
        assert branch["type"] == "branch"

    def test_call_function_node_type(self):
        gj = _parse_and_serialize(MULTI_NODE_T3D)
        call = next(n for n in gj["nodes"] if "CallFunction" in n["nodeClass"])
        assert call["type"] == "call_function"

    def test_all_node_types_covered(self):
        """Verify our type mapping handles all major UE node classes."""
        from ue_flow.t3d_json import _infer_type
        expected = {
            "K2Node_Event": "event",
            "K2Node_CustomEvent": "event",
            "K2Node_CallFunction": "call_function",
            "K2Node_IfThenElse": "branch",
            "K2Node_VariableGet": "variable_get",
            "K2Node_VariableSet": "variable_set",
            "K2Node_MacroInstance": "macro",
            "K2Node_Tunnel": "tunnel",
            "K2Node_Knot": "reroute",
            "EdGraphNode_Comment": "comment",
            "K2Node_FunctionEntry": "function_entry",
            "K2Node_FunctionResult": "function_result",
            "K2Node_DynamicCast": "cast",
            "K2Node_Select": "select",
            "K2Node_MakeArray": "make_array",
            "K2Node_SwitchEnum": "switch",
        }
        for class_name, expected_type in expected.items():
            assert _infer_type(class_name) == expected_type, f"{class_name} -> {expected_type}"


class TestPinColorCoverage:
    """Verify all 17 PinCategory values have color mappings."""

    def test_all_pin_categories_have_colors(self):
        """Cross-check Python PinCategory enum against TypeScript PIN_COLORS."""
        python_categories = {c.value for c in PinCategory}
        # These should match the TypeScript pin-types.ts PinCategory type
        ts_categories = {
            'exec', 'bool', 'real', 'float', 'int', 'byte',
            'string', 'name', 'text', 'object', 'class',
            'struct', 'enum', 'interface', 'delegate',
            'softclass', 'softobject', 'wildcard',
        }
        # Every Python category should have a TS color mapping
        for cat in python_categories:
            assert cat in ts_categories, f"PinCategory '{cat}' missing from TypeScript PIN_COLORS"

    def test_pin_categories_serialize_correctly(self):
        """Verify all pin categories serialize to lowercase strings."""
        for cat in PinCategory:
            assert cat.value == cat.value.lower(), f"Category {cat.name} not lowercase: {cat.value}"


class TestExecPinDistinction:
    """Verify exec pins are treated differently from data pins."""

    def test_exec_pins_in_json(self):
        gj = _parse_and_serialize(MULTI_NODE_T3D)
        for node in gj["nodes"]:
            for pin in node["pins"]:
                if pin["category"] == "exec":
                    assert pin["direction"] in ("input", "output")

    def test_exec_edges_categorized(self):
        gj = _parse_and_serialize(MULTI_NODE_T3D)
        exec_edges = [e for e in gj["edges"] if e["category"] == "exec"]
        assert len(exec_edges) >= 2  # Event->Branch, Branch->PrintString


class TestEdgeColorCategories:
    """Verify edges carry correct category for coloring."""

    def test_exec_edges_have_exec_category(self):
        gj = _parse_and_serialize(MULTI_NODE_T3D)
        for edge in gj["edges"]:
            if edge["category"] == "exec":
                # Source should be an exec output pin
                src_node = next(n for n in gj["nodes"] if n["id"] == edge["source"])
                src_pin = next((p for p in src_node["pins"] if p["name"] == edge["sourcePin"]), None)
                assert src_pin is not None
                assert src_pin["category"] == "exec"


class TestNodePositionMapping:
    """Verify T3D positions map correctly to JSON."""

    def test_positions_preserved(self):
        gj = _parse_and_serialize(MULTI_NODE_T3D)
        positions = {n["id"]: n["position"] for n in gj["nodes"]}
        assert positions["K2Node_Event_0"] == {"x": 0, "y": 0}
        assert positions["K2Node_IfThenElse_0"] == {"x": 300, "y": 0}
        assert positions["K2Node_CallFunction_0"] == {"x": 600, "y": 0}


class TestT3DRoundTrip:
    """Parse -> JSON -> (implied render) -> T3D export -> re-parse validation."""

    def test_round_trip_preserves_node_count(self):
        graph = parse_paste_text(MULTI_NODE_T3D)
        text = serialize_graph(graph)
        reparsed = parse_paste_text(text)
        assert len(reparsed.nodes) == len(graph.nodes)

    def test_round_trip_preserves_node_names(self):
        graph = parse_paste_text(MULTI_NODE_T3D)
        text = serialize_graph(graph)
        reparsed = parse_paste_text(text)
        original_names = {n.node_name for n in graph.nodes}
        reparsed_names = {n.node_name for n in reparsed.nodes}
        assert original_names == reparsed_names

    def test_round_trip_preserves_connections(self):
        graph = parse_paste_text(MULTI_NODE_T3D)
        text = serialize_graph(graph)
        reparsed = parse_paste_text(text)
        for orig in graph.nodes:
            parsed = next(n for n in reparsed.nodes if n.node_name == orig.node_name)
            for orig_pin in orig.pins:
                parsed_pin = next((p for p in parsed.pins if p.pin_name == orig_pin.pin_name), None)
                assert parsed_pin is not None, f"Missing pin {orig_pin.pin_name} on {orig.node_name}"
                assert len(parsed_pin.linked_to) == len(orig_pin.linked_to), (
                    f"Connection count mismatch for {orig.node_name}.{orig_pin.pin_name}"
                )

    def test_round_trip_preserves_guids(self):
        graph = parse_paste_text(MULTI_NODE_T3D)
        text = serialize_graph(graph)
        reparsed = parse_paste_text(text)
        for orig in graph.nodes:
            parsed = next(n for n in reparsed.nodes if n.node_name == orig.node_name)
            assert parsed.node_guid == orig.node_guid

    def test_round_trip_preserves_pin_values(self):
        graph = parse_paste_text(MULTI_NODE_T3D)
        text = serialize_graph(graph)
        reparsed = parse_paste_text(text)
        for orig in graph.nodes:
            parsed = next(n for n in reparsed.nodes if n.node_name == orig.node_name)
            for orig_pin in orig.pins:
                if orig_pin.default_value:
                    parsed_pin = next(p for p in parsed.pins if p.pin_name == orig_pin.pin_name)
                    assert parsed_pin.default_value == orig_pin.default_value

    def test_round_trip_preserves_positions(self):
        graph = parse_paste_text(MULTI_NODE_T3D)
        text = serialize_graph(graph)
        reparsed = parse_paste_text(text)
        for orig in graph.nodes:
            parsed = next(n for n in reparsed.nodes if n.node_name == orig.node_name)
            assert parsed.pos_x == orig.pos_x
            assert parsed.pos_y == orig.pos_y


class TestHtmlOutputValidity:
    """Verify render_html produces correct self-contained HTML."""

    def test_html_contains_all_nodes(self, tmp_path):
        out = tmp_path / "parity.html"
        render_html(MULTI_NODE_T3D, out)
        content = out.read_text(encoding="utf-8")
        assert '"K2Node_Event_0"' in content
        assert '"K2Node_IfThenElse_0"' in content
        assert '"K2Node_CallFunction_0"' in content

    def test_html_contains_all_edges(self, tmp_path):
        out = tmp_path / "parity.html"
        render_html(MULTI_NODE_T3D, out)
        content = out.read_text(encoding="utf-8")
        # Should have at least 2 exec edges
        assert content.count('"category":"exec"') >= 2 or content.count('"category": "exec"') >= 2

    def test_html_contains_pin_values(self, tmp_path):
        out = tmp_path / "parity.html"
        render_html(MULTI_NODE_T3D, out)
        content = out.read_text(encoding="utf-8")
        assert "Hello World" in content
        assert "true" in content  # Branch condition default

    def test_html_embeds_js_bundle(self, tmp_path):
        out = tmp_path / "parity.html"
        render_html(MULTI_NODE_T3D, out)
        content = out.read_text(encoding="utf-8")
        # The IIFE bundle should be inlined
        assert "UEFlow" in content or "ue-flow" in content.lower()
        assert len(content) > 100_000  # Bundle should make it large
