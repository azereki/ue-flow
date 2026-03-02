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
    "K2Node_ClassDynamicCast": "cast",
    "K2Node_Select": "select",
    "K2Node_MakeArray": "make_array",
    "K2Node_SwitchEnum": "switch",
    "K2Node_SwitchInteger": "switch",
    "K2Node_SwitchString": "switch",
    "K2Node_SwitchName": "switch",
    "K2Node_ExecutionSequence": "sequence",
    "K2Node_ForEachElementInEnum": "foreach",
    "K2Node_ForEachLoop": "foreach",
    "K2Node_ForEachLoopWithBreak": "foreach",
    "K2Node_MakeStruct": "struct_op",
    "K2Node_BreakStruct": "struct_op",
    "K2Node_SetFieldsInStruct": "struct_op",
    "K2Node_Timeline": "timeline",
    "K2Node_SpawnActorFromClass": "call_function",
    "K2Node_GetArrayItem": "function",
    "K2Node_CommutativeAssociativeBinaryOperator": "call_function",
    "K2Node_PromotableOperator": "call_function",
    "K2Node_DoOnce": "branch",
    "K2Node_Gate": "branch",
    "K2Node_FlipFlop": "branch",
    "K2Node_MultiGate": "sequence",
    # Delegate operations
    "K2Node_CallDelegate": "delegate_call",
    "K2Node_AddDelegate": "delegate_add",
    "K2Node_RemoveDelegate": "delegate_remove",
    "K2Node_ClearDelegate": "delegate_clear",
    # Async / Latent
    "K2Node_AsyncAction": "async_action",
    "K2Node_LatentGameplayTaskCall": "latent_task",
    # Construction
    "K2Node_ConstructObjectFromClass": "construct",
    "K2Node_CreateWidget": "construct",
    "K2Node_GenericCreateObject": "construct",
    # Subsystem
    "K2Node_GetSubsystem": "subsystem_get",
    # Input
    "K2Node_InputKey": "input",
    "K2Node_InputTouch": "input",
    "K2Node_InputAction": "input",
    "K2Node_InputAxisEvent": "event",
    "K2Node_InputAxisKeyEvent": "event",
    "K2Node_EnhancedInputAction": "event",
    "K2Node_ComponentBoundEvent": "component_event",
    "K2Node_ActorBoundEvent": "event",
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
    result: dict = {
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
    if pin.description:
        result["description"] = pin.description
    return result


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
                    key = (node.node_name, pin.pin_id, target_node_name, target_pin_id)
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
    "K2Node_SetFieldsInStruct": "Set Fields in Struct",
    "K2Node_Timeline": "Timeline",
    "K2Node_GetArrayItem": "Get",
    "K2Node_DoOnce": "Do Once",
    "K2Node_Gate": "Gate",
    "K2Node_FlipFlop": "FlipFlop",
    "K2Node_MultiGate": "MultiGate",
    "K2Node_ForEachLoopWithBreak": "ForEachLoop With Break",
    "K2Node_CallDelegate": "Call Delegate",
    "K2Node_AddDelegate": "Add Delegate",
    "K2Node_RemoveDelegate": "Remove Delegate",
    "K2Node_ClearDelegate": "Clear Delegate",
    "K2Node_AsyncAction": "Async Action",
    "K2Node_LatentGameplayTaskCall": "Latent Task",
    "K2Node_ConstructObjectFromClass": "Construct Object",
    "K2Node_CreateWidget": "Create Widget",
    "K2Node_GenericCreateObject": "Create Object",
    "K2Node_GetSubsystem": "Get Subsystem",
    "K2Node_ComponentBoundEvent": "Component Event",
    "K2Node_ActorBoundEvent": "Actor Event",
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
    if short_name in ("K2Node_DynamicCast", "K2Node_ClassDynamicCast") and "TargetType" in props:
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

    # InputAction → "InputAction ActionName"
    if short_name == "K2Node_InputAction":
        action_name = props.get("InputActionName", "")
        if isinstance(action_name, str) and action_name:
            return f"InputAction {action_name}"
        return "InputAction"

    # InputAxisEvent → "InputAxis AxisName"
    if short_name == "K2Node_InputAxisEvent":
        axis_name = props.get("InputAxisName", "")
        if isinstance(axis_name, str) and axis_name:
            return f"InputAxis {axis_name}"
        return "InputAxis"

    # InputAxisKeyEvent / InputKey → use InputAxisKey or InputKey property
    if short_name in ("K2Node_InputAxisKeyEvent", "K2Node_InputKey", "K2Node_InputTouch"):
        key_name = props.get("InputAxisKey", props.get("InputKey", props.get("InputKeyName", "")))
        if isinstance(key_name, str) and key_name:
            # Key value may be a plain name like "Gamepad_LeftX" or a struct "(KeyName=...)"
            if key_name.startswith("("):
                import re as _re
                m = _re.search(r'KeyName="?([^",)]+)"?', key_name)
                key_name = m.group(1) if m else key_name
            return key_name
        return short_name.replace("K2Node_", "")

    # EnhancedInputAction → use InputAction asset reference
    if short_name == "K2Node_EnhancedInputAction":
        action = props.get("InputAction", "")
        if isinstance(action, str) and action:
            # Asset path like /Game/Input/IA_Jump.IA_Jump — take last segment before dot
            base = action.rsplit(".", 1)[-1] if "." in action else action.rsplit("/", 1)[-1]
            return f"IA {base}"
        return "Enhanced InputAction"

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
