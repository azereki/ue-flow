"""Render multiple UE blueprint graphs into a single interactive HTML viewer.

Creates a self-contained HTML with:
- Tab bar for switching between graphs (EventGraph, functions, etc.)
- Sidebar with events, functions, variables, structs, delegates, data tables
- Double-click navigation between function calls and their graphs
- Breadcrumb trail for navigation history
"""
from __future__ import annotations

import html
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from ue_flow.t3d_parser import parse_paste_text
from ue_flow.t3d_json import serialize_graph_to_json
from ue_flow.renderer import RenderResult

_PACKAGE_DIR = Path(__file__).resolve().parent
_ASSETS_DIR = _PACKAGE_DIR / "assets"
_TEMPLATE_MULTI_PATH = _PACKAGE_DIR / "template_multi.html"


@dataclass
class BlueprintManifest:
    """Complete blueprint specification for multi-graph rendering."""

    title: str = "Blueprint Viewer"

    # Graph name -> T3D paste text
    graphs: dict[str, str] = field(default_factory=dict)

    # Custom events in EventGraph
    events: list[dict[str, Any]] = field(default_factory=list)

    # Functions (may or may not have graphs)
    functions: list[dict[str, Any]] = field(default_factory=list)

    # Variables grouped by category
    variables: list[dict[str, Any]] = field(default_factory=list)

    # Struct definitions
    structs: list[dict[str, Any]] = field(default_factory=list)

    # Delegate signatures
    delegates: list[dict[str, Any]] = field(default_factory=list)

    # Data table previews
    data_tables: dict[str, dict[str, Any]] = field(default_factory=dict)

    # Node count comparison (before/after)
    comparison: dict[str, dict[str, int]] = field(default_factory=dict)


def render_multi_html(
    manifest: BlueprintManifest,
    output_path: str | Path,
) -> RenderResult:
    """Render a multi-graph blueprint to self-contained HTML using ue-flow.

    Each graph's T3D is parsed into JSON and embedded in the HTML.
    The React components handle graph switching, sidebar, and navigation.

    Args:
        manifest: Complete blueprint specification with graphs and metadata.
        output_path: Where to write the HTML file.

    Returns:
        RenderResult with the output file path and status.
    """
    output_path = Path(output_path)

    try:
        template = _TEMPLATE_MULTI_PATH.read_text(encoding="utf-8")
    except FileNotFoundError:
        return RenderResult(
            output_file=None, format="html", rendered=False,
            error=f"Missing template: {_TEMPLATE_MULTI_PATH}",
        )

    try:
        js_content = (_ASSETS_DIR / "ue-flow.iife.js").read_text(encoding="utf-8")
    except FileNotFoundError:
        return RenderResult(
            output_file=None, format="html", rendered=False,
            error=f"Missing JS bundle: {_ASSETS_DIR / 'ue-flow.iife.js'}",
        )

    # Parse each graph's T3D into JSON
    graph_jsons: dict[str, dict] = {}
    for graph_name, paste_text in manifest.graphs.items():
        try:
            graph = parse_paste_text(paste_text)
            graph.graph_name = graph_name
            graph_json = serialize_graph_to_json(graph)
            graph_jsons[graph_name] = graph_json
        except Exception as exc:
            graph_jsons[graph_name] = {
                "metadata": {"title": graph_name, "assetPath": ""},
                "nodes": [],
                "edges": [],
                "error": str(exc),
            }

    # Build multi-graph JSON structure
    multi_graph_json = {
        "metadata": {"title": manifest.title},
        "graphs": graph_jsons,
        "events": manifest.events,
        "functions": manifest.functions,
        "variables": manifest.variables,
        "structs": manifest.structs,
        "delegates": manifest.delegates,
        "dataTables": manifest.data_tables,
        "comparison": manifest.comparison,
    }

    # Also embed original paste texts for T3D export
    paste_texts: dict[str, str] = {}
    for graph_name, paste_text in manifest.graphs.items():
        safe = paste_text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        paste_texts[graph_name] = safe

    # Assemble HTML
    result = template.replace("{{TITLE}}", html.escape(manifest.title))
    result = result.replace("{{MULTI_GRAPH_JSON}}", json.dumps(multi_graph_json, ensure_ascii=False))
    result = result.replace("{{PASTE_TEXTS_JSON}}", json.dumps(paste_texts, ensure_ascii=False))
    result = result.replace("{{JS_CONTENT}}", js_content)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(result, encoding="utf-8")

    return RenderResult(output_file=output_path, format="html", rendered=True)


def load_graphs_from_directory(
    directory: Path,
    prefix: str = "refactored_",
) -> dict[str, str]:
    """Load all T3D .txt files from a directory into a graph dict.

    Args:
        directory: Path to directory containing .txt files.
        prefix: Only load files starting with this prefix.

    Returns:
        Dict of graph_name -> paste_text, ordered with EventGraph first.
    """
    raw = {}
    for txt_file in sorted(directory.glob(f"{prefix}*.txt")):
        name = txt_file.stem.replace(prefix, "")
        display_name = "".join(
            word.capitalize() for word in name.split("_")
        )
        if display_name.lower() == "eventgraph":
            display_name = "EventGraph"
        raw[display_name] = txt_file.read_text(encoding="utf-8")

    # Ensure EventGraph is first, then non-BPFL sorted, then BPFL sorted
    ordered: dict[str, str] = {}
    if "EventGraph" in raw:
        ordered["EventGraph"] = raw.pop("EventGraph")
    component = {k: v for k, v in raw.items() if not k.startswith("Bpfl")}
    bpfl = {k: v for k, v in raw.items() if k.startswith("Bpfl")}
    for k in sorted(component):
        ordered[k] = component[k]
    for k in sorted(bpfl):
        ordered[k] = bpfl[k]
    return ordered
