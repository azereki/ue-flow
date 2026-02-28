"""Headless graph manipulation operations on JSON graph format.

All operations are idempotent: they take a graph JSON dict, return
an updated graph JSON dict plus validation results. No hidden state.
"""
from __future__ import annotations

import copy
from typing import Any


def validate_graph(graph_json: dict) -> dict:
    """Check graph JSON for type safety and completeness.

    Returns:
        {"errors": [...], "warnings": [...], "info": [...]}
    """
    errors: list[str] = []
    warnings: list[str] = []
    info: list[str] = []

    nodes = graph_json.get("nodes", [])
    edges = graph_json.get("edges", [])
    node_ids = {n["id"] for n in nodes}

    # Check edges reference valid nodes
    for edge in edges:
        if edge["source"] not in node_ids:
            errors.append(f"Edge {edge['id']} references missing source node: {edge['source']}")
        if edge["target"] not in node_ids:
            errors.append(f"Edge {edge['id']} references missing target node: {edge['target']}")

    # Check for duplicate node IDs
    seen_ids: set[str] = set()
    for node in nodes:
        if node["id"] in seen_ids:
            errors.append(f"Duplicate node ID: {node['id']}")
        seen_ids.add(node["id"])

    # Check for nodes with no pins
    for node in nodes:
        if not node.get("pins") and node.get("type") != "comment":
            warnings.append(f"Node {node['id']} ({node.get('title', '?')}) has no pins")

    # Check for unconnected exec output pins
    connected_exec_out = set()
    for edge in edges:
        if edge.get("category") == "exec":
            connected_exec_out.add(f"{edge['source']}:{edge['sourcePin']}")

    for node in nodes:
        for pin in node.get("pins", []):
            if (pin.get("category") == "exec"
                    and pin.get("direction") == "output"
                    and not pin.get("hidden", False)):
                key = f"{node['id']}:{pin['name']}"
                if key not in connected_exec_out:
                    info.append(f"Unconnected exec output: {node.get('title', node['id'])}.{pin['name']}")

    info.append(f"Graph has {len(nodes)} nodes and {len(edges)} edges")

    return {"errors": errors, "warnings": warnings, "info": info}


def set_pin_values(graph_json: dict, values: dict[str, dict[str, str]]) -> dict:
    """Batch-set pin default values.

    Args:
        graph_json: The graph JSON to modify.
        values: Mapping of node_id -> {pin_name: new_value}.

    Returns:
        Updated graph JSON (deep copy, original unchanged).
    """
    result = copy.deepcopy(graph_json)
    for node in result["nodes"]:
        if node["id"] in values:
            pin_updates = values[node["id"]]
            for pin in node.get("pins", []):
                if pin["name"] in pin_updates:
                    pin["defaultValue"] = pin_updates[pin["name"]]
    return result


def query_graph(
    graph_json: dict,
    node_type: str | None = None,
    node_class: str | None = None,
    has_pin_category: str | None = None,
    title_contains: str | None = None,
) -> list[dict]:
    """Query graph nodes by various filters.

    Args:
        graph_json: The graph JSON to search.
        node_type: Filter by node type (e.g. "event", "call_function").
        node_class: Filter by nodeClass substring.
        has_pin_category: Filter to nodes having a pin of this category.
        title_contains: Filter by title substring (case-insensitive).

    Returns:
        List of matching node dicts.
    """
    results = []
    for node in graph_json.get("nodes", []):
        if node_type and node.get("type") != node_type:
            continue
        if node_class and node_class not in node.get("nodeClass", ""):
            continue
        if title_contains and title_contains.lower() not in node.get("title", "").lower():
            continue
        if has_pin_category:
            if not any(p.get("category") == has_pin_category for p in node.get("pins", [])):
                continue
        results.append(node)
    return results


def diff_graphs(graph_a: dict, graph_b: dict) -> dict:
    """Compute structural diff between two graph JSONs.

    Returns:
        {
            "added_nodes": [...],
            "removed_nodes": [...],
            "modified_nodes": [...],
            "added_edges": [...],
            "removed_edges": [...]
        }
    """
    nodes_a = {n["id"]: n for n in graph_a.get("nodes", [])}
    nodes_b = {n["id"]: n for n in graph_b.get("nodes", [])}

    ids_a = set(nodes_a.keys())
    ids_b = set(nodes_b.keys())

    added_nodes = [
        {"id": nid, "type": nodes_b[nid].get("type"), "title": nodes_b[nid].get("title")}
        for nid in ids_b - ids_a
    ]
    removed_nodes = [
        {"id": nid, "type": nodes_a[nid].get("type"), "title": nodes_a[nid].get("title")}
        for nid in ids_a - ids_b
    ]

    # Modified nodes — check for pin value changes and position changes
    modified_nodes = []
    for nid in ids_a & ids_b:
        na, nb = nodes_a[nid], nodes_b[nid]
        changes: dict[str, Any] = {}

        # Position change
        if na.get("position") != nb.get("position"):
            changes["position"] = {"from": na.get("position"), "to": nb.get("position")}

        # Pin value changes
        pins_a = {p["name"]: p for p in na.get("pins", [])}
        pins_b = {p["name"]: p for p in nb.get("pins", [])}
        pin_changes = []
        for pname in set(pins_a) | set(pins_b):
            pa = pins_a.get(pname, {})
            pb = pins_b.get(pname, {})
            if pa.get("defaultValue", "") != pb.get("defaultValue", ""):
                pin_changes.append({
                    "pin": pname,
                    "field": "defaultValue",
                    "from": pa.get("defaultValue", ""),
                    "to": pb.get("defaultValue", ""),
                })
        if pin_changes:
            changes["pins"] = pin_changes

        if changes:
            modified_nodes.append({"id": nid, "changes": changes})

    # Edge diffs
    edges_a = {(e["source"], e["sourcePin"], e["target"], e["targetPin"]) for e in graph_a.get("edges", [])}
    edges_b = {(e["source"], e["sourcePin"], e["target"], e["targetPin"]) for e in graph_b.get("edges", [])}

    added_edges = [
        {"source": e[0], "sourcePin": e[1], "target": e[2], "targetPin": e[3]}
        for e in edges_b - edges_a
    ]
    removed_edges = [
        {"source": e[0], "sourcePin": e[1], "target": e[2], "targetPin": e[3]}
        for e in edges_a - edges_b
    ]

    return {
        "added_nodes": added_nodes,
        "removed_nodes": removed_nodes,
        "modified_nodes": modified_nodes,
        "added_edges": added_edges,
        "removed_edges": removed_edges,
    }
