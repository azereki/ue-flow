"""Parse UE T3D paste text back into BlueprintGraph model objects.

Inverse of t3d_serializer.py — takes clipboard paste text (Begin Object ...
End Object blocks) and reconstructs BlueprintGraph, BlueprintNode, and
BlueprintPin instances.
"""
from __future__ import annotations

import re

from ue_flow.t3d_models import (
    BlueprintGraph,
    BlueprintNode,
    BlueprintPin,
    PinCategory,
    PinDirection,
)

# ---------------------------------------------------------------------------
# Category lookup — maps lowercase T3D string values to PinCategory enum
# ---------------------------------------------------------------------------

_CATEGORY_MAP: dict[str, PinCategory] = {member.value: member for member in PinCategory}

# ---------------------------------------------------------------------------
# Regex patterns
# ---------------------------------------------------------------------------

# Splits text into Begin Object ... End Object blocks.
# Captures the header line (everything after "Begin Object") and the body.
_OBJECT_BLOCK_RE = re.compile(
    r"Begin Object\s+(.*?)\n(.*?)End Object",
    re.DOTALL,
)

# Header key-value pairs: Class=..., Name="...", ExportPath="..."
# Handles both quoted and unquoted values.
_HEADER_KV_RE = re.compile(
    r'(\w+)="((?:[^"\\]|\\.)*)"|(\w+)=(\S+)'
)

# CustomProperties Pin (...) line — captures everything inside outer parens.
_PIN_LINE_RE = re.compile(
    r"CustomProperties\s+Pin\s+\((.+)\)\s*$"
)

# Property line: leading whitespace, Key=Value
_PROPERTY_LINE_RE = re.compile(
    r"^\s+(\w+)=(.*)"
)


# ---------------------------------------------------------------------------
# Pin parsing helpers
# ---------------------------------------------------------------------------

def _parse_bool(value: str) -> bool:
    """Parse a T3D boolean value (True/False) to Python bool."""
    return value.strip().lower() == "true"


def _parse_linked_to(raw: str) -> list[tuple[str, str]]:
    """Parse LinkedTo=(NodeName PinId,NodeName2 PinId2,) into list of tuples.

    Handles:
    - Single entry: ``(K2Node_CallFunction_0 AABB...)``
    - Multiple entries: ``(Node1 Pin1,Node2 Pin2,)``
    - Trailing comma before closing paren (standard UE format)
    """
    # raw is the content inside the outer parens, e.g.
    # "K2Node_CallFunction_0 AABB112233445566,K2Node_Event_0 CCDD..."
    result: list[tuple[str, str]] = []
    # Split on comma, filter empties (handles trailing comma)
    entries = [e.strip() for e in raw.split(",") if e.strip()]
    for entry in entries:
        parts = entry.split()
        if len(parts) == 2:
            result.append((parts[0], parts[1]))
    return result


def _tokenize_pin_content(content: str) -> list[tuple[str, str]]:
    """Tokenize the comma-separated Key=Value pairs inside a Pin(...) line.

    This is non-trivial because values can contain:
    - Quoted strings with commas: ``PinName="My, Pin"``
    - Nested parentheses with commas: ``LinkedTo=(Node1 Pin1,Node2 Pin2,)``

    Returns a list of (key, value) tuples where value includes quotes/parens.
    """
    tokens: list[tuple[str, str]] = []
    i = 0
    length = len(content)

    while i < length:
        # Skip whitespace and commas
        while i < length and content[i] in (" ", ",", "\t"):
            i += 1
        if i >= length:
            break

        # Read key (up to '=')
        key_start = i
        while i < length and content[i] != "=":
            i += 1
        if i >= length:
            break
        key = content[key_start:i]
        i += 1  # skip '='

        if i >= length:
            tokens.append((key, ""))
            break

        # Read value — depends on first character
        if content[i] == '"':
            # Quoted string — read until closing quote (handle escaped quotes)
            i += 1  # skip opening quote
            val_start = i
            while i < length:
                if content[i] == "\\" and i + 1 < length:
                    i += 2  # skip escape sequence
                elif content[i] == '"':
                    break
                else:
                    i += 1
            value = content[val_start:i]
            if i < length:
                i += 1  # skip closing quote
            tokens.append((key, value))
        elif content[i] == "(":
            # Parenthesized value — match balanced parens
            depth = 1
            i += 1  # skip opening paren
            val_start = i
            while i < length and depth > 0:
                if content[i] == "(":
                    depth += 1
                elif content[i] == ")":
                    depth -= 1
                elif content[i] == '"':
                    # Skip quoted strings inside parens
                    i += 1
                    while i < length and content[i] != '"':
                        if content[i] == "\\" and i + 1 < length:
                            i += 1
                        i += 1
                i += 1
            # val_start..i-1 is the content inside parens (depth hit 0)
            value = content[val_start : i - 1] if depth == 0 else content[val_start:i]
            tokens.append((key, "(" + value + ")"))
        else:
            # Unquoted value — read until comma or end
            val_start = i
            while i < length and content[i] != ",":
                i += 1
            value = content[val_start:i].rstrip()
            tokens.append((key, value))

    return tokens


def _parse_pin(content: str) -> BlueprintPin:
    """Parse the inner content of a CustomProperties Pin (...) line.

    Args:
        content: Everything inside the outer parentheses.

    Returns:
        A fully populated BlueprintPin instance.
    """
    tokens = _tokenize_pin_content(content)

    # Defaults
    pin_id = ""
    pin_name = ""
    friendly_name = ""
    direction = PinDirection.INPUT
    category = PinCategory.EXEC  # fallback; almost always overridden
    sub_category = ""
    sub_category_object = ""
    default_value = ""
    container_type = ""
    is_reference = False
    is_const = False
    is_weak = False
    autogen_default = ""
    linked_to: list[tuple[str, str]] = []
    hidden = False
    advanced_view = False

    for key, value in tokens:
        if key == "PinId":
            pin_id = value
        elif key == "PinName":
            pin_name = value
        elif key == "PinFriendlyName":
            friendly_name = value
        elif key == "Direction":
            # Value is either quoted or unquoted
            dir_str = value.strip('"')
            if dir_str == PinDirection.OUTPUT.value:
                direction = PinDirection.OUTPUT
            else:
                direction = PinDirection.INPUT
        elif key == "PinType.PinCategory":
            cat_str = value.strip('"').lower()
            category = _CATEGORY_MAP.get(cat_str, PinCategory.EXEC)
        elif key == "PinType.PinSubCategory":
            sub_category = value.strip('"')
        elif key == "PinType.PinSubCategoryObject":
            if value in ("None", ""):
                sub_category_object = ""
            else:
                sub_category_object = value
        elif key == "PinType.ContainerType":
            if value in ("None", ""):
                container_type = ""
            else:
                container_type = value
        elif key == "PinType.bIsReference":
            is_reference = _parse_bool(value)
        elif key == "PinType.bIsConst":
            is_const = _parse_bool(value)
        elif key == "PinType.bIsWeakPointer":
            is_weak = _parse_bool(value)
        elif key == "DefaultValue":
            default_value = value
        elif key == "AutogeneratedDefaultValue":
            autogen_default = value
        elif key == "LinkedTo":
            # value is "(Node1 Pin1,Node2 Pin2,)" — strip outer parens
            inner = value
            if inner.startswith("(") and inner.endswith(")"):
                inner = inner[1:-1]
            linked_to = _parse_linked_to(inner)
        elif key == "bHidden":
            hidden = _parse_bool(value)
        elif key == "bAdvancedView":
            advanced_view = _parse_bool(value)
        # All other keys (PersistentGuid, bNotConnectable, etc.) are ignored

    return BlueprintPin(
        pin_name=pin_name,
        direction=direction,
        category=category,
        pin_id=pin_id,
        friendly_name=friendly_name,
        sub_category=sub_category,
        sub_category_object=sub_category_object,
        default_value=default_value,
        container_type=container_type,
        is_reference=is_reference,
        is_const=is_const,
        is_weak=is_weak,
        autogen_default=autogen_default,
        linked_to=linked_to,
        hidden=hidden,
        advanced_view=advanced_view,
    )


# ---------------------------------------------------------------------------
# Node parsing
# ---------------------------------------------------------------------------

def _parse_header(header_line: str) -> dict[str, str]:
    """Extract key-value pairs from a Begin Object header line.

    Example header:
        ``Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0" ExportPath="..."``

    Returns dict with keys like ``Class``, ``Name``, ``ExportPath``.
    """
    result: dict[str, str] = {}
    for m in _HEADER_KV_RE.finditer(header_line):
        if m.group(1) is not None:
            # Quoted value: group(1)=key, group(2)=value
            result[m.group(1)] = m.group(2)
        else:
            # Unquoted value: group(3)=key, group(4)=value
            result[m.group(3)] = m.group(4)
    return result


# Known property keys that map to BlueprintNode fields (not stored in .properties)
_NODE_FIELD_KEYS = {"NodePosX", "NodePosY", "NodeGuid"}


def _parse_node_body(
    header_attrs: dict[str, str],
    body: str,
) -> BlueprintNode:
    """Parse the body of a Begin Object block into a BlueprintNode.

    Args:
        header_attrs: Parsed header key-value pairs (Class, Name, ExportPath).
        body: The text between the header line and ``End Object``.

    Returns:
        Fully populated BlueprintNode.
    """
    node_class = header_attrs.get("Class", "")
    node_name = header_attrs.get("Name", "")

    pos_x = 0
    pos_y = 0
    node_guid = ""
    properties: dict[str, str] = {}
    pins: list[BlueprintPin] = []

    for line in body.split("\n"):
        stripped = line.strip()
        if not stripped:
            continue

        # Check for CustomProperties Pin line
        pin_match = _PIN_LINE_RE.search(stripped)
        if pin_match:
            pins.append(_parse_pin(pin_match.group(1)))
            continue

        # Check for property line
        prop_match = _PROPERTY_LINE_RE.match(line)
        if prop_match:
            key = prop_match.group(1)
            value = prop_match.group(2)

            if key == "NodePosX":
                try:
                    pos_x = int(value)
                except ValueError:
                    pass
            elif key == "NodePosY":
                try:
                    pos_y = int(value)
                except ValueError:
                    pass
            elif key == "NodeGuid":
                node_guid = value.strip()
            else:
                # Everything else goes into properties dict
                properties[key] = value

    # Build kwargs — omit node_guid to let _generate_guid() fill it in
    kwargs: dict = dict(
        node_class=node_class,
        node_name=node_name,
        pos_x=pos_x,
        pos_y=pos_y,
        pins=pins,
        properties=properties,
    )
    if node_guid:
        kwargs["node_guid"] = node_guid

    return BlueprintNode(**kwargs)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def parse_single_node(text: str) -> BlueprintNode | None:
    """Parse a single Begin Object ... End Object block into a BlueprintNode.

    Args:
        text: A string containing exactly one Begin Object block.

    Returns:
        A BlueprintNode if a valid block is found, otherwise None.
    """
    match = _OBJECT_BLOCK_RE.search(text)
    if not match:
        return None
    header_line = match.group(1)
    body = match.group(2)
    header_attrs = _parse_header(header_line)
    return _parse_node_body(header_attrs, body)


def parse_paste_text(text: str) -> BlueprintGraph:
    """Parse UE T3D paste text into a BlueprintGraph with nodes and pins.

    Handles multi-node paste text with multiple Begin Object / End Object
    blocks separated by blank lines.

    Args:
        text: Full T3D clipboard paste text (one or more object blocks).

    Returns:
        BlueprintGraph populated with all parsed nodes.
    """
    nodes: list[BlueprintNode] = []

    for match in _OBJECT_BLOCK_RE.finditer(text):
        header_line = match.group(1)
        body = match.group(2)
        header_attrs = _parse_header(header_line)
        node = _parse_node_body(header_attrs, body)
        nodes.append(node)

    return BlueprintGraph(nodes=nodes)
