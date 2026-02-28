"""Auto-layout engine for blueprint graphs."""
from __future__ import annotations

from ue_flow.t3d_models import BlueprintGraph, PinCategory, PinDirection

# Spacing constants (UE editor units, approx node widths)
HORIZONTAL_SPACING = 400
VERTICAL_SPACING = 200


def auto_layout(graph: BlueprintGraph) -> None:
    """Assign NodePosX/NodePosY to all nodes in the graph.

    Strategy: topological sort along exec flow (left-to-right),
    then stack unconnected nodes vertically.
    Modifies nodes in-place.
    """
    if not graph.nodes:
        return

    # Build adjacency: exec output -> target node name
    node_map = {n.node_name: n for n in graph.nodes}
    exec_successors: dict[str, list[str]] = {n.node_name: [] for n in graph.nodes}
    exec_predecessors: dict[str, list[str]] = {n.node_name: [] for n in graph.nodes}

    for node in graph.nodes:
        for pin in node.pins:
            if pin.category == PinCategory.EXEC and pin.direction == PinDirection.OUTPUT:
                for target_name, _target_pin in pin.linked_to:
                    if target_name in node_map:
                        exec_successors[node.node_name].append(target_name)
                        exec_predecessors[target_name].append(node.node_name)

    # Find root nodes (no exec predecessors)
    roots = [n.node_name for n in graph.nodes if not exec_predecessors[n.node_name]]
    if not roots:
        roots = [graph.nodes[0].node_name]

    # BFS to assign columns (x positions)
    column: dict[str, int] = {}
    visited: set[str] = set()
    queue = list(roots)
    for r in roots:
        if r not in column:
            column[r] = 0

    while queue:
        name = queue.pop(0)
        if name in visited:
            continue
        visited.add(name)
        col = column.get(name, 0)
        for succ in exec_successors.get(name, []):
            if succ not in column or column[succ] < col + 1:
                column[succ] = col + 1
            queue.append(succ)

    # Assign unvisited nodes to column 0
    for node in graph.nodes:
        if node.node_name not in column:
            column[node.node_name] = 0

    # Group by column, assign rows within each column
    columns: dict[int, list[str]] = {}
    for name, col in column.items():
        columns.setdefault(col, []).append(name)

    for col_idx, names in columns.items():
        for row_idx, name in enumerate(names):
            node_map[name].pos_x = col_idx * HORIZONTAL_SPACING
            node_map[name].pos_y = row_idx * VERTICAL_SPACING
