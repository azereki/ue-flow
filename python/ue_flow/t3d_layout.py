"""Auto-layout engine for blueprint graphs."""
from __future__ import annotations

from collections import deque

from ue_flow.t3d_models import BlueprintGraph, BlueprintNode, PinCategory, PinDirection

# Spacing constants (UE editor units, approx node widths)
HORIZONTAL_SPACING = 400
VERTICAL_SPACING = 200
EVENT_BAND_GAP = 300  # vertical gap between event subgraph bands


def _node_height(node: BlueprintNode) -> int:
    """Calculate vertical space for a node based on pin count."""
    return max(200, len(node.pins) * 28 + 80)


def _build_exec_adjacency(
    graph: BlueprintGraph,
) -> tuple[
    dict[str, BlueprintNode],
    dict[str, list[str]],
    dict[str, list[str]],
]:
    """Build exec-flow adjacency maps.

    Returns (node_map, exec_successors, exec_predecessors).
    """
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

    return node_map, exec_successors, exec_predecessors


def _build_data_consumers(
    graph: BlueprintGraph,
    node_map: dict[str, BlueprintNode],
) -> dict[str, list[str]]:
    """Build a map from each node to its data-link consumers.

    For every non-exec output pin linked_to another node, record that target
    as a consumer of this node.
    """
    consumers: dict[str, list[str]] = {n.node_name: [] for n in graph.nodes}
    for node in graph.nodes:
        for pin in node.pins:
            if pin.direction == PinDirection.OUTPUT and pin.category != PinCategory.EXEC:
                for target_name, _target_pin in pin.linked_to:
                    if target_name in node_map and target_name not in consumers[node.node_name]:
                        consumers[node.node_name].append(target_name)
    return consumers


def _exec_bfs(
    roots: list[str],
    exec_successors: dict[str, list[str]],
    scope: set[str] | None = None,
) -> tuple[dict[str, int], set[str]]:
    """BFS along exec flow from roots, assigning column indices.

    If *scope* is provided, only nodes in *scope* are traversed.
    Returns (column_map, visited_set).
    """
    column: dict[str, int] = {}
    visited: set[str] = set()
    queue: deque[str] = deque()

    for r in roots:
        if scope is not None and r not in scope:
            continue
        if r not in column:
            column[r] = 0
        queue.append(r)

    while queue:
        name = queue.popleft()
        if name in visited:
            continue
        visited.add(name)
        col = column.get(name, 0)
        for succ in exec_successors.get(name, []):
            if scope is not None and succ not in scope:
                continue
            if succ not in column or column[succ] < col + 1:
                column[succ] = col + 1
            queue.append(succ)

    return column, visited


def _place_data_nodes(
    graph: BlueprintGraph,
    column: dict[str, int],
    visited: set[str],
    node_map: dict[str, BlueprintNode],
    data_consumers: dict[str, list[str]],
    scope: set[str] | None = None,
) -> None:
    """Place data-only nodes (not visited by exec BFS) relative to their consumers.

    For each unvisited node, find its consumers via data links, pick the
    leftmost consumer column, and place this node at (consumer_col - 1).
    If no consumers are placed yet, default to column 0.
    If *scope* is provided, only process nodes in *scope*.
    """
    for node in graph.nodes:
        name = node.node_name
        if scope is not None and name not in scope:
            continue
        if name in visited:
            continue
        consumers = data_consumers.get(name, [])
        placed_consumers = [c for c in consumers if c in column]
        if placed_consumers:
            min_col = min(column[c] for c in placed_consumers)
            column[name] = min_col - 1
        else:
            column[name] = 0
        visited.add(name)


def _assign_positions_dynamic(
    column: dict[str, int],
    node_map: dict[str, BlueprintNode],
    y_offset: int = 0,
) -> int:
    """Group nodes by column and assign positions with dynamic vertical spacing.

    Returns the total vertical extent (max y + last node height) for band stacking.
    """
    columns: dict[int, list[str]] = {}
    for name, col in column.items():
        columns.setdefault(col, []).append(name)

    max_y_extent = 0
    for col_idx, names in columns.items():
        y = y_offset
        for name in names:
            node = node_map[name]
            node.pos_x = col_idx * HORIZONTAL_SPACING
            node.pos_y = y
            h = _node_height(node)
            y += h
        if y > max_y_extent:
            max_y_extent = y

    return max_y_extent


def _find_event_roots(
    graph: BlueprintGraph,
    exec_predecessors: dict[str, list[str]],
) -> list[str]:
    """Find event root nodes (K2Node_Event, K2Node_CustomEvent, etc.)."""
    event_classes = {"K2Node_Event", "K2Node_CustomEvent"}
    roots = []
    for node in graph.nodes:
        # Check by class name (strip path prefix if present)
        cls = node.node_class.rsplit("/", 1)[-1] if "/" in node.node_class else node.node_class
        if cls in event_classes:
            roots.append(node.node_name)
    # Also include exec roots that aren't events (no exec predecessors, have exec successors)
    return roots


def _collect_subgraph(
    root: str,
    exec_successors: dict[str, list[str]],
    data_consumers: dict[str, list[str]],
    node_map: dict[str, BlueprintNode],
    already_claimed: set[str],
) -> set[str]:
    """BFS from root along exec + reverse-data links to collect a connected subgraph.

    Collects all nodes reachable via exec flow from root, plus any data-only
    nodes that feed into those nodes.
    """
    # First: exec BFS from root
    exec_nodes: set[str] = set()
    queue: deque[str] = deque([root])
    while queue:
        name = queue.popleft()
        if name in exec_nodes or name in already_claimed:
            continue
        exec_nodes.add(name)
        for succ in exec_successors.get(name, []):
            queue.append(succ)

    # Second: find data-only producers that feed into exec_nodes
    # Build reverse data map: consumer -> producers
    reverse_data: dict[str, list[str]] = {}
    for producer, consumers in data_consumers.items():
        for c in consumers:
            reverse_data.setdefault(c, []).append(producer)

    subgraph = set(exec_nodes)
    data_queue: deque[str] = deque()
    for name in exec_nodes:
        for producer in reverse_data.get(name, []):
            if producer not in subgraph and producer not in already_claimed:
                data_queue.append(producer)

    while data_queue:
        name = data_queue.popleft()
        if name in subgraph or name in already_claimed:
            continue
        subgraph.add(name)
        # Also pull in producers of this data node
        for producer in reverse_data.get(name, []):
            if producer not in subgraph and producer not in already_claimed:
                data_queue.append(producer)

    return subgraph


def auto_layout(graph: BlueprintGraph) -> None:
    """Assign NodePosX/NodePosY to all nodes in the graph.

    Strategy:
    1. Build exec-flow adjacency and data-consumer maps.
    2. For EventGraph: isolate each event root's subgraph into a separate
       vertical band with EVENT_BAND_GAP between bands.
    3. Within each band (or the whole graph for non-EventGraph):
       a. BFS along exec flow to assign columns.
       b. Place data-only nodes at (leftmost consumer column - 1).
       c. Dynamic vertical spacing based on pin count.
    Modifies nodes in-place.
    """
    if not graph.nodes:
        return

    node_map, exec_successors, exec_predecessors = _build_exec_adjacency(graph)
    data_consumers = _build_data_consumers(graph, node_map)

    # Detect event roots for EventGraph isolation
    event_roots = _find_event_roots(graph, exec_predecessors)

    if len(event_roots) >= 2 and graph.graph_name == "EventGraph":
        # Event isolation: lay out each event's subgraph in separate bands
        already_claimed: set[str] = set()
        y_offset = 0

        for event_root in event_roots:
            if event_root in already_claimed:
                continue
            subgraph_names = _collect_subgraph(
                event_root, exec_successors, data_consumers, node_map, already_claimed
            )
            if not subgraph_names:
                continue
            already_claimed.update(subgraph_names)

            # Build a sub-column map for this band (scoped to subgraph)
            band_column, band_visited = _exec_bfs(
                [event_root], exec_successors, scope=subgraph_names
            )

            # Place data nodes within this band (scoped)
            sub_data_consumers = {
                k: [c for c in v if c in subgraph_names]
                for k, v in data_consumers.items()
                if k in subgraph_names
            }
            _place_data_nodes(
                graph, band_column, band_visited, node_map, sub_data_consumers,
                scope=subgraph_names,
            )
            # Ensure all subgraph nodes have a column
            for name in subgraph_names:
                if name not in band_column:
                    band_column[name] = 0

            band_extent = _assign_positions_dynamic(band_column, node_map, y_offset)
            y_offset = band_extent + EVENT_BAND_GAP

        # Handle any unclaimed nodes (not reachable from any event root)
        unclaimed = [n for n in graph.nodes if n.node_name not in already_claimed]
        if unclaimed:
            unclaimed_names = {n.node_name for n in unclaimed}
            # Find exec roots among unclaimed
            unclaimed_roots = [
                name for name in unclaimed_names
                if not any(p in unclaimed_names for p in exec_predecessors.get(name, []))
            ]
            if not unclaimed_roots:
                unclaimed_roots = [unclaimed[0].node_name]

            uc_column, uc_visited = _exec_bfs(
                unclaimed_roots, exec_successors, scope=unclaimed_names
            )

            sub_data_consumers = {
                k: [c for c in v if c in unclaimed_names]
                for k, v in data_consumers.items()
                if k in unclaimed_names
            }
            _place_data_nodes(
                graph, uc_column, uc_visited, node_map, sub_data_consumers,
                scope=unclaimed_names,
            )
            for name in unclaimed_names:
                if name not in uc_column:
                    uc_column[name] = 0
            _assign_positions_dynamic(uc_column, node_map, y_offset)
    else:
        # Non-event or single-event graph: standard layout
        roots = [n.node_name for n in graph.nodes if not exec_predecessors[n.node_name]]
        if not roots:
            roots = [graph.nodes[0].node_name]

        column, visited = _exec_bfs(roots, exec_successors)

        # Place data-only nodes relative to consumers
        _place_data_nodes(graph, column, visited, node_map, data_consumers)

        # Ensure all nodes have a column
        for node in graph.nodes:
            if node.node_name not in column:
                column[node.node_name] = 0

        _assign_positions_dynamic(column, node_map)
