"""Tests for ue_flow.t3d_layout — auto-layout engine."""
from __future__ import annotations

import pytest

from ue_flow.t3d_models import BlueprintNode, BlueprintPin, BlueprintGraph, PinDirection, PinCategory
from ue_flow.t3d_layout import auto_layout


class TestAutoLayout:
    def test_single_node_at_origin(self):
        node = BlueprintNode(node_class="A", node_name="A_0")
        graph = BlueprintGraph(nodes=[node])
        auto_layout(graph)
        assert node.pos_x == 0
        assert node.pos_y == 0

    def test_two_connected_nodes_horizontal(self):
        """Nodes connected by exec flow should be placed left-to-right."""
        pin_out = BlueprintPin(pin_name="then", direction=PinDirection.OUTPUT, category=PinCategory.EXEC,
                               linked_to=[("B_0", "FAKEPINID00000000000000000000000")])
        pin_in = BlueprintPin(pin_name="execute", direction=PinDirection.INPUT, category=PinCategory.EXEC,
                              pin_id="FAKEPINID00000000000000000000000")
        n1 = BlueprintNode(node_class="A", node_name="A_0", pins=[pin_out])
        n2 = BlueprintNode(node_class="B", node_name="B_0", pins=[pin_in])
        graph = BlueprintGraph(nodes=[n1, n2])
        auto_layout(graph)
        assert n2.pos_x > n1.pos_x  # B is to the right of A

    def test_unconnected_nodes_stacked(self):
        """Unconnected nodes should be stacked vertically."""
        n1 = BlueprintNode(node_class="A", node_name="A_0")
        n2 = BlueprintNode(node_class="B", node_name="B_0")
        n3 = BlueprintNode(node_class="C", node_name="C_0")
        graph = BlueprintGraph(nodes=[n1, n2, n3])
        auto_layout(graph)
        # All at x=0, different y values
        assert n1.pos_y != n2.pos_y or n2.pos_y != n3.pos_y

    def test_layout_does_not_overlap(self):
        """No two nodes should occupy the same position."""
        nodes = [BlueprintNode(node_class="N", node_name=f"N_{i}") for i in range(5)]
        graph = BlueprintGraph(nodes=nodes)
        auto_layout(graph)
        positions = [(n.pos_x, n.pos_y) for n in nodes]
        assert len(set(positions)) == len(positions)  # all unique
