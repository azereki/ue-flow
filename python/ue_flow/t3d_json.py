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
    "K2Node_SwitchName": "switch",
    "K2Node_ExecutionSequence": "sequence",
    "K2Node_ForEachElementInEnum": "foreach",
    "K2Node_ForEachLoop": "foreach",
    "K2Node_MakeStruct": "make_struct",
    "K2Node_BreakStruct": "break_struct",
    "K2Node_Timeline": "function",
    "K2Node_SpawnActorFromClass": "call_function",
    "K2Node_GetArrayItem": "function",
    "K2Node_CommutativeAssociativeBinaryOperator": "function",
    "K2Node_PromotableOperator": "function",
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


_FRIENDLY_TITLES: dict[str, str] = {
    "K2Node_IfThenElse": "Branch",
    "K2Node_Knot": "Reroute",
    "K2Node_MakeArray": "Make Array",
    "K2Node_FunctionResult": "Return Node",
    "K2Node_SwitchEnum": "Switch on Enum",
    "K2Node_SwitchInteger": "Switch on Int",
    "K2Node_SwitchString": "Switch on String",
    "K2Node_SwitchName": "Switch on Name",
    "K2Node_ExecutionSequence": "Sequence",
    "K2Node_MakeStruct": "Make Struct",
    "K2Node_BreakStruct": "Break Struct",
    "K2Node_Timeline": "Timeline",
    "K2Node_GetArrayItem": "Get",
}


def _extract_member_name(ref: object) -> str | None:
    """Extract MemberName from a FunctionReference/EventReference/VariableReference value."""
    if isinstance(ref, dict) and "MemberName" in ref:
        return ref["MemberName"]
    if isinstance(ref, str) and "MemberName=" in ref:
        import re
        m = re.search(r'MemberName="([^"]+)"', ref)
        if m:
            return m.group(1)
    return None


def _infer_title(node: BlueprintNode) -> str:
    """Infer display title from node properties or class name."""
    short_name = node.node_class.rsplit(".", 1)[-1] if "." in node.node_class else node.node_class
    props = node.properties

    # Static friendly name lookup
    if short_name in _FRIENDLY_TITLES:
        return _FRIENDLY_TITLES[short_name]

    # Function calls → extract function name
    if "FunctionReference" in props:
        name = _extract_member_name(props["FunctionReference"])
        if name:
            return name

    # Events → extract event name with prefix
    if "EventReference" in props:
        name = _extract_member_name(props["EventReference"])
        if name:
            return f"Event {name}"

    # Variable get/set → extract variable name
    if "VariableReference" in props:
        name = _extract_member_name(props["VariableReference"])
        if name:
            prefix = "Set " if short_name == "K2Node_VariableSet" else ""
            return f"{prefix}{name}"

    # Comments → use NodeComment text
    if short_name == "EdGraphNode_Comment":
        comment = props.get("NodeComment", "")
        if isinstance(comment, str) and comment:
            return comment[:80]
        return "Comment"

    # Dynamic cast → "Cast To ClassName"
    if short_name == "K2Node_DynamicCast" and "TargetType" in props:
        target = props["TargetType"]
        if isinstance(target, str):
            # Extract class name from path like /Script/Engine.Actor
            cls = target.rsplit(".", 1)[-1] if "." in target else target
            return f"Cast To {cls}"

    # Macro → extract macro name
    if "MacroGraphReference" in props:
        ref = props["MacroGraphReference"]
        name = _extract_member_name(ref)
        if name:
            return name

    # Function entry → use graph name or "Function Entry"
    if short_name == "K2Node_FunctionEntry":
        sig = props.get("SignatureName", "")
        if isinstance(sig, str) and sig:
            return sig
        return "Function Entry"

    # Fallback: clean up class name
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
