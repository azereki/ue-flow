"""Tests for ue_flow.graph_ops — headless graph manipulation."""
from __future__ import annotations

import copy
import pytest

from ue_flow.graph_ops import validate_graph, set_pin_values, query_graph, diff_graphs

SAMPLE_GRAPH = {
    "metadata": {"title": "EventGraph", "assetPath": "/Game/BP_Test"},
    "nodes": [
        {
            "id": "K2Node_Event_0",
            "type": "event",
            "nodeClass": "K2Node_Event",
            "nodeGuid": "AAAA",
            "position": {"x": 0, "y": 0},
            "title": "Event BeginPlay",
            "properties": {},
            "pins": [
                {"id": "pin-1", "name": "then", "friendlyName": "", "direction": "output", "category": "exec", "subCategory": "", "subCategoryObject": "", "containerType": "", "defaultValue": "", "isReference": False, "isConst": False, "isWeak": False, "hidden": False, "advancedView": False},
            ],
        },
        {
            "id": "K2Node_CallFunction_0",
            "type": "call_function",
            "nodeClass": "K2Node_CallFunction",
            "nodeGuid": "BBBB",
            "position": {"x": 400, "y": 0},
            "title": "Print String",
            "properties": {},
            "pins": [
                {"id": "pin-2", "name": "execute", "friendlyName": "", "direction": "input", "category": "exec", "subCategory": "", "subCategoryObject": "", "containerType": "", "defaultValue": "", "isReference": False, "isConst": False, "isWeak": False, "hidden": False, "advancedView": False},
                {"id": "pin-3", "name": "then", "friendlyName": "", "direction": "output", "category": "exec", "subCategory": "", "subCategoryObject": "", "containerType": "", "defaultValue": "", "isReference": False, "isConst": False, "isWeak": False, "hidden": False, "advancedView": False},
                {"id": "pin-4", "name": "InString", "friendlyName": "In String", "direction": "input", "category": "string", "subCategory": "", "subCategoryObject": "", "containerType": "", "defaultValue": "Hello", "isReference": False, "isConst": False, "isWeak": False, "hidden": False, "advancedView": False},
            ],
        },
    ],
    "edges": [
        {"id": "edge-0", "source": "K2Node_Event_0", "sourcePin": "then", "target": "K2Node_CallFunction_0", "targetPin": "execute", "category": "exec"},
    ],
}


class TestValidateGraph:
    def test_valid_graph(self):
        result = validate_graph(SAMPLE_GRAPH)
        assert result["errors"] == []

    def test_detects_missing_source_node(self):
        bad = copy.deepcopy(SAMPLE_GRAPH)
        bad["edges"].append({"id": "bad-1", "source": "Nonexistent", "sourcePin": "x", "target": "K2Node_Event_0", "targetPin": "y", "category": "exec"})
        result = validate_graph(bad)
        assert any("missing source" in e.lower() for e in result["errors"])

    def test_detects_duplicate_node_ids(self):
        bad = copy.deepcopy(SAMPLE_GRAPH)
        bad["nodes"].append(copy.deepcopy(bad["nodes"][0]))
        result = validate_graph(bad)
        assert any("duplicate" in e.lower() for e in result["errors"])

    def test_reports_unconnected_exec(self):
        result = validate_graph(SAMPLE_GRAPH)
        # PrintString's "then" is unconnected
        assert any("unconnected exec" in i.lower() for i in result["info"])

    def test_reports_node_and_edge_count(self):
        result = validate_graph(SAMPLE_GRAPH)
        assert any("2 nodes" in i for i in result["info"])


class TestSetPinValues:
    def test_sets_value(self):
        updated = set_pin_values(SAMPLE_GRAPH, {
            "K2Node_CallFunction_0": {"InString": "New Value"}
        })
        pin = next(
            p for n in updated["nodes"] if n["id"] == "K2Node_CallFunction_0"
            for p in n["pins"] if p["name"] == "InString"
        )
        assert pin["defaultValue"] == "New Value"

    def test_does_not_mutate_original(self):
        original_val = SAMPLE_GRAPH["nodes"][1]["pins"][2]["defaultValue"]
        set_pin_values(SAMPLE_GRAPH, {"K2Node_CallFunction_0": {"InString": "Changed"}})
        assert SAMPLE_GRAPH["nodes"][1]["pins"][2]["defaultValue"] == original_val

    def test_ignores_unknown_node(self):
        updated = set_pin_values(SAMPLE_GRAPH, {"Nonexistent": {"x": "y"}})
        assert updated == SAMPLE_GRAPH


class TestQueryGraph:
    def test_query_by_type(self):
        results = query_graph(SAMPLE_GRAPH, node_type="event")
        assert len(results) == 1
        assert results[0]["id"] == "K2Node_Event_0"

    def test_query_by_title(self):
        results = query_graph(SAMPLE_GRAPH, title_contains="print")
        assert len(results) == 1
        assert results[0]["title"] == "Print String"

    def test_query_by_pin_category(self):
        results = query_graph(SAMPLE_GRAPH, has_pin_category="string")
        assert len(results) == 1
        assert results[0]["id"] == "K2Node_CallFunction_0"

    def test_query_no_matches(self):
        results = query_graph(SAMPLE_GRAPH, node_type="comment")
        assert results == []

    def test_query_multiple_filters(self):
        results = query_graph(SAMPLE_GRAPH, node_type="call_function", title_contains="print")
        assert len(results) == 1


class TestDiffGraphs:
    def test_identical_graphs(self):
        diff = diff_graphs(SAMPLE_GRAPH, SAMPLE_GRAPH)
        assert diff["added_nodes"] == []
        assert diff["removed_nodes"] == []
        assert diff["modified_nodes"] == []
        assert diff["added_edges"] == []
        assert diff["removed_edges"] == []

    def test_detects_added_node(self):
        modified = copy.deepcopy(SAMPLE_GRAPH)
        modified["nodes"].append({
            "id": "NewNode", "type": "call_function", "nodeClass": "K2Node_CallFunction",
            "nodeGuid": "CCCC", "position": {"x": 800, "y": 0}, "title": "New Node",
            "properties": {}, "pins": [],
        })
        diff = diff_graphs(SAMPLE_GRAPH, modified)
        assert len(diff["added_nodes"]) == 1
        assert diff["added_nodes"][0]["id"] == "NewNode"

    def test_detects_removed_node(self):
        modified = copy.deepcopy(SAMPLE_GRAPH)
        modified["nodes"] = [n for n in modified["nodes"] if n["id"] != "K2Node_CallFunction_0"]
        diff = diff_graphs(SAMPLE_GRAPH, modified)
        assert len(diff["removed_nodes"]) == 1

    def test_detects_pin_value_change(self):
        modified = copy.deepcopy(SAMPLE_GRAPH)
        for node in modified["nodes"]:
            if node["id"] == "K2Node_CallFunction_0":
                for pin in node["pins"]:
                    if pin["name"] == "InString":
                        pin["defaultValue"] = "Changed"
        diff = diff_graphs(SAMPLE_GRAPH, modified)
        assert len(diff["modified_nodes"]) == 1
        assert diff["modified_nodes"][0]["changes"]["pins"][0]["to"] == "Changed"

    def test_detects_position_change(self):
        modified = copy.deepcopy(SAMPLE_GRAPH)
        modified["nodes"][0]["position"] = {"x": 100, "y": 200}
        diff = diff_graphs(SAMPLE_GRAPH, modified)
        assert len(diff["modified_nodes"]) == 1
        assert "position" in diff["modified_nodes"][0]["changes"]

    def test_detects_edge_changes(self):
        modified = copy.deepcopy(SAMPLE_GRAPH)
        modified["edges"] = []
        diff = diff_graphs(SAMPLE_GRAPH, modified)
        assert len(diff["removed_edges"]) == 1
