"""Tests for ue_flow.graph_analysis — execution tracing and context generation."""
from __future__ import annotations

import pytest

from ue_flow.t3d_parser import parse_paste_text
from ue_flow.t3d_json import serialize_graph_to_json
from ue_flow.graph_analysis import (
    trace_execution_paths,
    map_data_dependencies,
    find_dead_ends,
    extract_pin_values,
    summarize,
)


# Two-node graph: Event BeginPlay -> Print String with default value
TWO_NODE_T3D = """\
Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"
   EventReference=(MemberParent="/Script/Engine.Actor",MemberName="ReceiveBeginPlay")
   NodePosX=0
   NodePosY=0
   NodeGuid=AAAA0000BBBB1111CCCC2222DDDD3333
   CustomProperties Pin (PinId=11112222333344445555666677778888,PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,LinkedTo=(K2Node_CallFunction_0 AABB112233445566AABB112233445566,),PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object

Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_0"
   FunctionReference=(MemberParent="/Script/Engine.KismetSystemLibrary",MemberName="PrintString")
   NodePosX=400
   NodePosY=0
   NodeGuid=BBBB1111222233334444555566667777
   CustomProperties Pin (PinId=AABB112233445566AABB112233445566,PinName="execute",PinType.PinCategory="exec",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,LinkedTo=(K2Node_Event_0 11112222333344445555666677778888,),PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
   CustomProperties Pin (PinId=DDDD1111222233334444555566667777,PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
   CustomProperties Pin (PinId=EEEE1111222233334444555566667777,PinName="InString",PinFriendlyName="In String",PinType.PinCategory="string",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,DefaultValue="Hello World",PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object"""


def _make_graph_json():
    graph = parse_paste_text(TWO_NODE_T3D)
    return serialize_graph_to_json(graph)


class TestTraceExecutionPaths:
    def test_finds_event_entry(self):
        gj = _make_graph_json()
        paths = trace_execution_paths(gj)
        assert len(paths) >= 1
        assert paths[0][0]["type"] == "event"

    def test_traces_linear_chain(self):
        gj = _make_graph_json()
        paths = trace_execution_paths(gj)
        assert len(paths[0]) == 2
        assert paths[0][0]["type"] == "event"
        assert paths[0][1]["type"] == "call_function"

    def test_empty_graph(self):
        gj = {"metadata": {"title": "Empty"}, "nodes": [], "edges": []}
        paths = trace_execution_paths(gj)
        assert paths == []


class TestMapDataDependencies:
    def test_returns_non_exec_edges(self):
        gj = _make_graph_json()
        deps = map_data_dependencies(gj)
        # Only exec edges exist in this graph, so data deps should be empty
        for dep in deps:
            assert dep["category"] != "exec"


class TestFindDeadEnds:
    def test_finds_unconnected_exec_output(self):
        gj = _make_graph_json()
        dead_ends = find_dead_ends(gj)
        # PrintString's "then" output pin is not connected
        assert any(de["pin_name"] == "then" and "PrintString" in de["node_title"] for de in dead_ends)

    def test_empty_graph(self):
        gj = {"metadata": {"title": "Empty"}, "nodes": [], "edges": []}
        dead_ends = find_dead_ends(gj)
        assert dead_ends == []


class TestExtractPinValues:
    def test_extracts_default_values(self):
        gj = _make_graph_json()
        values = extract_pin_values(gj)
        assert any(v["value"] == "Hello World" for v in values)

    def test_includes_pin_name(self):
        gj = _make_graph_json()
        values = extract_pin_values(gj)
        hello = next((v for v in values if v["value"] == "Hello World"), None)
        assert hello is not None
        assert hello["pin_name"] == "In String"


class TestSummarize:
    def test_context_format(self):
        result = summarize(paste_text=TWO_NODE_T3D, format="context")
        assert "BLUEPRINT:" in result
        assert "EXECUTION FLOW:" in result
        assert "NODES:" in result
        assert "PrintString" in result

    def test_markdown_format(self):
        result = summarize(paste_text=TWO_NODE_T3D, format="markdown")
        assert "###" in result
        assert "Nodes:" in result or "**Nodes:**" in result

    def test_compact_format(self):
        result = summarize(paste_text=TWO_NODE_T3D, format="compact")
        assert "nodes" in result
        assert "connections" in result

    def test_includes_pin_values(self):
        result = summarize(paste_text=TWO_NODE_T3D, format="context", include_pin_values=True)
        assert "PIN VALUES:" in result
        assert "Hello World" in result

    def test_context_from_graph_json(self):
        gj = _make_graph_json()
        result = summarize(graph_json=gj, format="context")
        assert "BLUEPRINT:" in result

    def test_context_from_graph_model(self):
        graph = parse_paste_text(TWO_NODE_T3D)
        result = summarize(graph=graph, format="context")
        assert "BLUEPRINT:" in result

    def test_dead_ends_reported(self):
        result = summarize(paste_text=TWO_NODE_T3D, format="context")
        assert "DEAD ENDS:" in result
