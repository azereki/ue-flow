"""Tests for ue_flow.t3d_json — graph JSON serialization."""
from __future__ import annotations

import pytest

from ue_flow.t3d_models import BlueprintGraph, BlueprintNode, BlueprintPin, PinDirection, PinCategory
from ue_flow.t3d_json import serialize_graph_to_json


class TestSerializeGraphToJson:
    def test_empty_graph(self):
        graph = BlueprintGraph()
        result = serialize_graph_to_json(graph)
        assert result["nodes"] == []
        assert result["edges"] == []
        assert "metadata" in result

    def test_node_fields_present(self):
        node = BlueprintNode(
            node_class="K2Node_Event",
            node_name="K2Node_Event_0",
            node_guid="AAAA0000BBBB1111CCCC2222DDDD3333",
            pos_x=100, pos_y=200,
            pins=[],
        )
        graph = BlueprintGraph(nodes=[node])
        result = serialize_graph_to_json(graph)
        n = result["nodes"][0]
        assert n["id"] == "K2Node_Event_0"
        assert n["nodeClass"] == "K2Node_Event"
        assert n["nodeGuid"] == "AAAA0000BBBB1111CCCC2222DDDD3333"
        assert n["position"] == {"x": 100, "y": 200}

    def test_pin_fields_serialized(self):
        pin = BlueprintPin(
            pin_name="InString",
            direction=PinDirection.INPUT,
            category=PinCategory.STRING,
            pin_id="ABCD1234ABCD1234ABCD1234ABCD1234",
            friendly_name="In String",
            default_value="Hello",
        )
        node = BlueprintNode(node_class="K2Node_CallFunction", node_name="N0", pins=[pin])
        graph = BlueprintGraph(nodes=[node])
        result = serialize_graph_to_json(graph)
        p = result["nodes"][0]["pins"][0]
        assert p["id"] == "ABCD1234ABCD1234ABCD1234ABCD1234"
        assert p["name"] == "InString"
        assert p["friendlyName"] == "In String"
        assert p["direction"] == "input"
        assert p["category"] == "string"
        assert p["defaultValue"] == "Hello"

    def test_edges_extracted_from_linked_to(self):
        pin_out = BlueprintPin(
            pin_name="then", direction=PinDirection.OUTPUT, category=PinCategory.EXEC,
            pin_id="PIN_A_00000000000000000000000000",
            linked_to=[("Node_B", "PIN_B_00000000000000000000000000")],
        )
        pin_in = BlueprintPin(
            pin_name="execute", direction=PinDirection.INPUT, category=PinCategory.EXEC,
            pin_id="PIN_B_00000000000000000000000000",
            linked_to=[("Node_A", "PIN_A_00000000000000000000000000")],
        )
        node_a = BlueprintNode(node_class="K2Node_Event", node_name="Node_A", pins=[pin_out])
        node_b = BlueprintNode(node_class="K2Node_CallFunction", node_name="Node_B", pins=[pin_in])
        graph = BlueprintGraph(nodes=[node_a, node_b])
        result = serialize_graph_to_json(graph)
        assert len(result["edges"]) == 1
        edge = result["edges"][0]
        assert edge["source"] == "Node_A"
        assert edge["sourcePin"] == "then"
        assert edge["target"] == "Node_B"
        assert edge["targetPin"] == "execute"
        assert edge["category"] == "exec"

    def test_node_type_inferred_from_class(self):
        cases = [
            ("K2Node_Event", "event"),
            ("K2Node_CallFunction", "call_function"),
            ("K2Node_IfThenElse", "branch"),
            ("K2Node_VariableGet", "variable_get"),
            ("K2Node_VariableSet", "variable_set"),
            ("K2Node_MacroInstance", "macro"),
            ("EdGraphNode_Comment", "comment"),
        ]
        for node_class, expected_type in cases:
            node = BlueprintNode(node_class=node_class, node_name="N0")
            graph = BlueprintGraph(nodes=[node])
            result = serialize_graph_to_json(graph)
            assert result["nodes"][0]["type"] == expected_type, f"Failed for {node_class}"

    def test_node_type_inferred_from_full_path(self):
        """Full class paths like /Script/BlueprintGraph.K2Node_Event should work."""
        node = BlueprintNode(
            node_class="/Script/BlueprintGraph.K2Node_Event",
            node_name="N0",
        )
        graph = BlueprintGraph(nodes=[node])
        result = serialize_graph_to_json(graph)
        assert result["nodes"][0]["type"] == "event"

    def test_title_inferred_from_function_reference(self):
        node = BlueprintNode(
            node_class="K2Node_CallFunction",
            node_name="N0",
            properties={"FunctionReference": '(MemberParent="/Script/Engine.KismetSystemLibrary",MemberName="PrintString")'},
        )
        graph = BlueprintGraph(nodes=[node])
        result = serialize_graph_to_json(graph)
        assert result["nodes"][0]["title"] == "PrintString"

    def test_metadata_includes_graph_name(self):
        graph = BlueprintGraph(graph_name="MyGraph", asset_path="/Game/BP_Test")
        result = serialize_graph_to_json(graph)
        assert result["metadata"]["title"] == "MyGraph"
        assert result["metadata"]["assetPath"] == "/Game/BP_Test"

    def test_deduplicates_edges(self):
        """Only output pin linked_to should generate edges (not input side too)."""
        pin_out = BlueprintPin(
            pin_name="then", direction=PinDirection.OUTPUT, category=PinCategory.EXEC,
            pin_id="PIN_OUT_0000000000000000000000000",
            linked_to=[("B", "PIN_IN_00000000000000000000000000")],
        )
        pin_in = BlueprintPin(
            pin_name="execute", direction=PinDirection.INPUT, category=PinCategory.EXEC,
            pin_id="PIN_IN_00000000000000000000000000",
            linked_to=[("A", "PIN_OUT_0000000000000000000000000")],
        )
        a = BlueprintNode(node_class="K2Node_Event", node_name="A", pins=[pin_out])
        b = BlueprintNode(node_class="K2Node_CallFunction", node_name="B", pins=[pin_in])
        graph = BlueprintGraph(nodes=[a, b])
        result = serialize_graph_to_json(graph)
        assert len(result["edges"]) == 1
