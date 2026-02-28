"""Serialize BlueprintGraph to JSON intermediate format for ue-flow renderer."""
from __future__ import annotations

from ue_flow.t3d_models import BlueprintGraph, BlueprintNode, BlueprintPin, PinDirection

_CLASS_TO_TYPE = {
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
    "K2Node_SwitchInteger": "switch",
    "K2Node_SwitchString": "switch",
}


def _infer_type(node_class: str) -> str:
    """Infer the node type from the node class string.

    Handles both full paths (/Script/BlueprintGraph.K2Node_Event) and
    short names (K2Node_Event).
    """
    # Extract short class name from full path if needed
    short_name = node_class.rsplit(".", 1)[-1] if "." in node_class else node_class
    return _CLASS_TO_TYPE.get(short_name, "function")


def _serialize_pin(pin: BlueprintPin) -> dict:
    return {
        "id": pin.pin_id,
        "name": pin.pin_name,
        "friendlyName": pin.friendly_name,
        "direction": "input" if pin.direction == PinDirection.INPUT else "output",
        "category": pin.category.value if hasattr(pin.category, "value") else str(pin.category),
        "subCategory": pin.sub_category,
        "subCategoryObject": pin.sub_category_object,
        "containerType": pin.container_type,
        "defaultValue": pin.default_value,
        "isReference": pin.is_reference,
        "isConst": pin.is_const,
        "isWeak": pin.is_weak,
        "hidden": pin.hidden,
        "advancedView": pin.advanced_view,
    }


def _extract_edges(nodes: list[BlueprintNode]) -> list[dict]:
    """Extract edges from bidirectional linked_to references, deduplicating."""
    seen: set[tuple[str, str, str, str]] = set()
    edges: list[dict] = []
    edge_id = 0

    # Build pin lookup for resolving pin names from pin IDs
    pin_by_node_and_id: dict[tuple[str, str], BlueprintPin] = {}
    for node in nodes:
        for pin in node.pins:
            pin_by_node_and_id[(node.node_name, pin.pin_id)] = pin

    for node in nodes:
        for pin in node.pins:
            if pin.direction == PinDirection.OUTPUT and pin.linked_to:
                for target_node_name, target_pin_id in pin.linked_to:
                    key = (node.node_name, pin.pin_name, target_node_name, target_pin_id)
                    if key not in seen:
                        seen.add(key)
                        # Resolve target pin name
                        target_pin = pin_by_node_and_id.get((target_node_name, target_pin_id))
                        target_pin_name = target_pin.pin_name if target_pin else target_pin_id
                        edges.append({
                            "id": f"edge-{edge_id}",
                            "source": node.node_name,
                            "sourcePin": pin.pin_name,
                            "target": target_node_name,
                            "targetPin": target_pin_name,
                            "category": pin.category.value if hasattr(pin.category, "value") else str(pin.category),
                        })
                        edge_id += 1
    return edges


def _infer_title(node: BlueprintNode) -> str:
    """Infer display title from node properties or class name."""
    props = node.properties
    if "FunctionReference" in props:
        ref = props["FunctionReference"]
        if isinstance(ref, str) and "MemberName=" in ref:
            # Parse MemberName from string like (MemberParent=...,MemberName="PrintString")
            import re
            m = re.search(r'MemberName="([^"]+)"', ref)
            if m:
                return m.group(1)
        elif isinstance(ref, dict) and "MemberName" in ref:
            return ref["MemberName"]
    if "EventReference" in props:
        ref = props["EventReference"]
        if isinstance(ref, str) and "MemberName=" in ref:
            import re
            m = re.search(r'MemberName="([^"]+)"', ref)
            if m:
                return f"Event {m.group(1)}"
    # Fallback: clean up class name
    short_name = node.node_class.rsplit(".", 1)[-1] if "." in node.node_class else node.node_class
    name = short_name.replace("K2Node_", "").replace("EdGraphNode_", "")
    return name


def serialize_graph_to_json(graph: BlueprintGraph) -> dict:
    """Convert BlueprintGraph to JSON intermediate format for ue-flow."""
    return {
        "metadata": {
            "title": graph.graph_name,
            "assetPath": graph.asset_path,
        },
        "nodes": [
            {
                "id": node.node_name,
                "type": _infer_type(node.node_class),
                "nodeClass": node.node_class,
                "nodeGuid": node.node_guid,
                "position": {"x": node.pos_x, "y": node.pos_y},
                "title": _infer_title(node),
                "properties": node.properties,
                "pins": [_serialize_pin(pin) for pin in node.pins],
            }
            for node in graph.nodes
        ],
        "edges": _extract_edges(graph.nodes),
    }
