"""Graph analysis engine for execution tracing, dependency mapping, and context generation.

Operates on graph JSON (from t3d_json.serialize_graph_to_json) or BlueprintGraph models.
Produces LLM-optimized text summaries in multiple formats.
"""
from __future__ import annotations

import re
from typing import Any

from ue_flow.t3d_models import BlueprintGraph, PinDirection, PinCategory
from ue_flow.t3d_json import serialize_graph_to_json


def _get_graph_json(
    graph: BlueprintGraph | None = None,
    graph_json: dict | None = None,
    paste_text: str | None = None,
) -> dict:
    """Resolve graph JSON from any input format."""
    if graph_json is not None:
        return graph_json
    if graph is not None:
        return serialize_graph_to_json(graph)
    if paste_text is not None:
        from ue_flow.t3d_parser import parse_paste_text
        g = parse_paste_text(paste_text)
        return serialize_graph_to_json(g)
    raise ValueError("Provide graph, graph_json, or paste_text")


# ---------------------------------------------------------------------------
# Execution path tracing
# ---------------------------------------------------------------------------

def trace_execution_paths(graph_json: dict) -> list[list[dict]]:
    """Trace all execution paths through the graph via exec pin chains.

    Returns a list of paths, where each path is a list of node dicts
    in execution order.
    """
    nodes_by_id = {n["id"]: n for n in graph_json["nodes"]}
    edges = graph_json["edges"]

    # Build exec edge adjacency: source_node -> [(target_node, source_pin_name)]
    exec_edges: dict[str, list[tuple[str, str]]] = {}
    for edge in edges:
        if edge.get("category") == "exec":
            src = edge["source"]
            tgt = edge["target"]
            pin_name = edge.get("sourcePin", "")
            exec_edges.setdefault(src, []).append((tgt, pin_name))

    # Find exec entry points (event nodes, function entries)
    entry_types = {"event", "function_entry"}
    entry_nodes = [n for n in graph_json["nodes"] if n.get("type") in entry_types]

    # Also find nodes with exec output but no exec input
    nodes_with_exec_input = set()
    for edge in edges:
        if edge.get("category") == "exec":
            nodes_with_exec_input.add(edge["target"])

    for n in graph_json["nodes"]:
        if n["id"] not in nodes_with_exec_input:
            has_exec_out = any(
                p.get("category") == "exec" and p.get("direction") == "output"
                for p in n.get("pins", [])
            )
            if has_exec_out and n not in entry_nodes:
                entry_nodes.append(n)

    paths: list[list[dict]] = []
    for entry in entry_nodes:
        path = _trace_path(entry["id"], exec_edges, nodes_by_id, set())
        if path:
            paths.append(path)
    return paths


def _trace_path(
    node_id: str,
    exec_edges: dict[str, list[tuple[str, str]]],
    nodes_by_id: dict[str, dict],
    visited: set[str],
) -> list[dict]:
    """Trace a single execution path from a starting node."""
    if node_id in visited or node_id not in nodes_by_id:
        return []
    visited.add(node_id)
    node = nodes_by_id[node_id]
    path = [node]

    successors = exec_edges.get(node_id, [])
    if len(successors) == 1:
        # Linear chain
        path.extend(_trace_path(successors[0][0], exec_edges, nodes_by_id, visited))
    elif len(successors) > 1:
        # Branch — record in node data, follow each
        node["_branches"] = []
        for target_id, pin_name in successors:
            branch = _trace_path(target_id, exec_edges, nodes_by_id, visited)
            if branch:
                node["_branches"].append({"pin": pin_name, "path": branch})

    return path


# ---------------------------------------------------------------------------
# Data dependency mapping
# ---------------------------------------------------------------------------

def map_data_dependencies(graph_json: dict) -> list[dict]:
    """Map data pin connections showing which nodes feed data to which.

    Returns list of {source, sourcePin, target, targetPin, category} for data edges.
    """
    return [
        edge for edge in graph_json["edges"]
        if edge.get("category") != "exec"
    ]


# ---------------------------------------------------------------------------
# Dead end detection
# ---------------------------------------------------------------------------

def find_dead_ends(graph_json: dict) -> list[dict]:
    """Find nodes with unconnected exec output pins (dead ends).

    Returns list of {node_id, node_title, pin_name} for each dead end.
    """
    connected_exec_outputs = set()
    for edge in graph_json["edges"]:
        if edge.get("category") == "exec":
            connected_exec_outputs.add(f"{edge['source']}:{edge['sourcePin']}")

    dead_ends = []
    for node in graph_json["nodes"]:
        for pin in node.get("pins", []):
            if (pin.get("category") == "exec"
                    and pin.get("direction") == "output"
                    and not pin.get("hidden", False)):
                key = f"{node['id']}:{pin['name']}"
                if key not in connected_exec_outputs:
                    dead_ends.append({
                        "node_id": node["id"],
                        "node_title": node.get("title", node["id"]),
                        "pin_name": pin.get("friendlyName") or pin["name"],
                    })
    return dead_ends


# ---------------------------------------------------------------------------
# Pin value extraction
# ---------------------------------------------------------------------------

def extract_pin_values(graph_json: dict) -> list[dict]:
    """Extract all non-empty default pin values from the graph.

    Returns list of {node_id, node_title, pin_name, value, category}.
    """
    values = []
    for node in graph_json["nodes"]:
        for pin in node.get("pins", []):
            dv = pin.get("defaultValue", "")
            if dv and pin.get("direction") == "input":
                values.append({
                    "node_id": node["id"],
                    "node_title": node.get("title", node["id"]),
                    "pin_name": pin.get("friendlyName") or pin["name"],
                    "value": dv,
                    "category": pin.get("category", ""),
                })
    return values


# ---------------------------------------------------------------------------
# Context format generators
# ---------------------------------------------------------------------------

def _format_node_call(node: dict) -> str:
    """Format a node as a readable function-call-style string."""
    title = node.get("title", node.get("id", "?"))
    # Collect input pin values
    args = []
    for pin in node.get("pins", []):
        if pin.get("direction") == "input" and pin.get("defaultValue") and pin.get("category") != "exec":
            name = pin.get("friendlyName") or pin["name"]
            args.append(f'{name}={pin["defaultValue"]}')
    if args:
        return f'{title}({", ".join(args)})'
    return title


def generate_context(
    graph: BlueprintGraph | None = None,
    graph_json: dict | None = None,
    paste_text: str | None = None,
    format: str = "context",
    include_pin_values: bool = True,
) -> str:
    """Generate LLM-optimized text summary of a blueprint graph.

    Args:
        graph: BlueprintGraph model (optional).
        graph_json: Pre-serialized graph JSON (optional).
        paste_text: Raw T3D paste text (optional).
        format: One of "context", "markdown", "compact".
        include_pin_values: Whether to include pin default values section.

    Returns:
        Formatted text summary.
    """
    gj = _get_graph_json(graph, graph_json, paste_text)

    if format == "markdown":
        return _generate_markdown(gj)
    elif format == "compact":
        return _generate_compact(gj)
    else:
        return _generate_llm_context(gj, include_pin_values)


def _generate_llm_context(gj: dict, include_pin_values: bool = True) -> str:
    """Generate LLM context format — for pasting into AI conversations."""
    lines = []
    title = gj.get("metadata", {}).get("title", "Graph")
    asset = gj.get("metadata", {}).get("assetPath", "")
    if asset:
        lines.append(f"BLUEPRINT: {asset} / {title}")
    else:
        lines.append(f"BLUEPRINT: {title}")
    lines.append("")

    # Execution flow
    paths = trace_execution_paths(gj)
    if paths:
        lines.append("EXECUTION FLOW:")
        for path in paths:
            if not path:
                continue
            entry = path[0]
            lines.append(f"  {_format_node_call(entry)}")
            for node in path[1:]:
                lines.append(f"    -> {_format_node_call(node)}")
                # Handle branches
                if "_branches" in node:
                    for branch in node["_branches"]:
                        pin = branch.get("pin", "")
                        label = pin.upper() if pin in ("then", "else") else pin
                        branch_nodes = branch.get("path", [])
                        if branch_nodes:
                            flow = " -> ".join(_format_node_call(n) for n in branch_nodes)
                            lines.append(f"      {label}: {flow}")
                        else:
                            lines.append(f"      {label}: [no connection]")
            lines.append("")

    # Data dependencies
    data_deps = map_data_dependencies(gj)
    if data_deps:
        lines.append("DATA DEPENDENCIES:")
        for dep in data_deps[:20]:  # Cap at 20 to avoid overwhelming
            lines.append(f"  {dep['source']}.{dep['sourcePin']} -> {dep['target']}.{dep['targetPin']} ({dep.get('category', '?')})")
        if len(data_deps) > 20:
            lines.append(f"  ... and {len(data_deps) - 20} more")
        lines.append("")

    # Pin values
    if include_pin_values:
        pin_vals = extract_pin_values(gj)
        if pin_vals:
            lines.append("PIN VALUES:")
            for pv in pin_vals:
                lines.append(f'  {pv["node_title"]}.{pv["pin_name"]} = "{pv["value"]}"')
            lines.append("")

    # Dead ends
    dead_ends = find_dead_ends(gj)
    if dead_ends:
        lines.append("DEAD ENDS:")
        for de in dead_ends:
            lines.append(f"  {de['node_title']}.{de['pin_name']} -> [no connection]")
        lines.append("")

    # Stats
    node_count = len(gj.get("nodes", []))
    edge_count = len(gj.get("edges", []))
    exec_edges = sum(1 for e in gj.get("edges", []) if e.get("category") == "exec")
    data_edges = edge_count - exec_edges
    lines.append(f"NODES: {node_count} | CONNECTIONS: {edge_count} ({exec_edges} exec, {data_edges} data)")

    return "\n".join(lines)


def _generate_markdown(gj: dict) -> str:
    """Generate documentation format — for wikis, READMEs."""
    lines = []
    title = gj.get("metadata", {}).get("title", "Graph")
    lines.append(f"### {title}")
    lines.append("")

    # Execution paths as table
    paths = trace_execution_paths(gj)
    if paths:
        lines.append("| Entry | Flow | Nodes |")
        lines.append("|-------|------|-------|")
        for path in paths:
            if not path:
                continue
            entry = _format_node_call(path[0])
            flow = " -> ".join(_format_node_call(n) for n in path[1:4])
            if len(path) > 4:
                flow += " -> ..."
            lines.append(f"| {entry} | {flow} | {len(path)} |")
        lines.append("")

    # Stats
    node_count = len(gj.get("nodes", []))
    edge_count = len(gj.get("edges", []))
    lines.append(f"**Nodes:** {node_count} | **Connections:** {edge_count}")

    return "\n".join(lines)


def _generate_compact(gj: dict) -> str:
    """Generate compact single-line summary."""
    title = gj.get("metadata", {}).get("title", "Graph")
    node_count = len(gj.get("nodes", []))
    edge_count = len(gj.get("edges", []))
    entry_types = {"event", "function_entry"}
    entries = [n.get("title", n["id"]) for n in gj.get("nodes", []) if n.get("type") in entry_types]
    entry_str = ", ".join(entries[:3])
    if len(entries) > 3:
        entry_str += f" +{len(entries) - 3} more"
    return f"{title}: {node_count} nodes, {edge_count} connections. Entries: {entry_str}"


# ---------------------------------------------------------------------------
# Public summarize() API
# ---------------------------------------------------------------------------

def summarize(
    graph: BlueprintGraph | None = None,
    graph_json: dict | None = None,
    paste_text: str | None = None,
    format: str = "context",
    include_pin_values: bool = True,
) -> str:
    """Generate an LLM-optimized text summary of a blueprint graph.

    This is the main public API for context generation.

    Args:
        graph: BlueprintGraph model.
        graph_json: Pre-serialized graph JSON dict.
        paste_text: Raw T3D paste text.
        format: "context" (LLM), "markdown" (docs), "compact" (one-line).
        include_pin_values: Include pin default values in output.

    Returns:
        Formatted text summary string.
    """
    return generate_context(graph, graph_json, paste_text, format, include_pin_values)
