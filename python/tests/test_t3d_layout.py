"""Tests for ue_flow.t3d_layout -- auto-layout engine."""
from __future__ import annotations

import pytest

from ue_flow.t3d_models import BlueprintNode, BlueprintPin, BlueprintGraph, PinDirection, PinCategory
from ue_flow.t3d_layout import (
    auto_layout,
    _node_height,
    HORIZONTAL_SPACING,
    EVENT_BAND_GAP,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _exec_pin_out(target_node: str, target_pin_id: str = "FAKEPIN0") -> BlueprintPin:
    return BlueprintPin(
        pin_name="then", direction=PinDirection.OUTPUT, category=PinCategory.EXEC,
        linked_to=[(target_node, target_pin_id)],
    )


def _exec_pin_in(pin_id: str = "FAKEPIN0") -> BlueprintPin:
    return BlueprintPin(
        pin_name="execute", direction=PinDirection.INPUT, category=PinCategory.EXEC,
        pin_id=pin_id,
    )


def _data_pin_out(target_node: str, target_pin_id: str = "DATAPIN0", name: str = "ReturnValue") -> BlueprintPin:
    return BlueprintPin(
        pin_name=name, direction=PinDirection.OUTPUT, category=PinCategory.OBJECT,
        linked_to=[(target_node, target_pin_id)],
    )


def _data_pin_in(pin_id: str = "DATAPIN0", name: str = "Target") -> BlueprintPin:
    return BlueprintPin(
        pin_name=name, direction=PinDirection.INPUT, category=PinCategory.OBJECT,
        pin_id=pin_id,
    )


def _make_pins(count: int) -> list[BlueprintPin]:
    """Create N dummy data pins for testing node height."""
    return [
        BlueprintPin(pin_name=f"pin_{i}", direction=PinDirection.INPUT, category=PinCategory.BOOL)
        for i in range(count)
    ]


# ---------------------------------------------------------------------------
# Original tests (preserved)
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# 5A: Data-node placement
# ---------------------------------------------------------------------------

class TestDataNodePlacement:
    def test_pure_function_placed_left_of_consumer(self):
        """A pure function (data-only) feeding an exec node should be at consumer_col - 1."""
        # Event -> PrintString, with a PureFunc feeding data into PrintString
        event = BlueprintNode(
            node_class="K2Node_Event", node_name="Event_0",
            pins=[_exec_pin_out("Print_0", "EXECIN0")],
        )
        print_node = BlueprintNode(
            node_class="K2Node_CallFunction", node_name="Print_0",
            pins=[_exec_pin_in("EXECIN0"), _data_pin_in("DATAIN0", "InString")],
        )
        pure_func = BlueprintNode(
            node_class="K2Node_CallFunction", node_name="Pure_0",
            pins=[_data_pin_out("Print_0", "DATAIN0", "ReturnValue")],
        )
        graph = BlueprintGraph(nodes=[event, print_node, pure_func])
        auto_layout(graph)

        # Event at col 0, Print at col 1 via exec, Pure at col 0 (1 - 1)
        assert event.pos_x == 0
        assert print_node.pos_x == HORIZONTAL_SPACING
        assert pure_func.pos_x == 0  # consumer_col(1) - 1 = 0

    def test_variable_getter_placed_left_of_function_call(self):
        """A variable getter (data-only) feeding a function call should be left of it."""
        event = BlueprintNode(
            node_class="K2Node_Event", node_name="Event_0",
            pins=[_exec_pin_out("Func_0", "EXECIN0")],
        )
        func_call = BlueprintNode(
            node_class="K2Node_CallFunction", node_name="Func_0",
            pins=[_exec_pin_in("EXECIN0"), _data_pin_in("DATAIN0", "Target")],
        )
        var_get = BlueprintNode(
            node_class="K2Node_VariableGet", node_name="VarGet_0",
            pins=[_data_pin_out("Func_0", "DATAIN0", "MyVar")],
        )
        graph = BlueprintGraph(nodes=[event, func_call, var_get])
        auto_layout(graph)

        assert func_call.pos_x == HORIZONTAL_SPACING
        assert var_get.pos_x < func_call.pos_x

    def test_data_node_multiple_consumers_uses_leftmost(self):
        """Data node with multiple consumers should use leftmost consumer's column - 1."""
        # Event -> A (col 1) -> B (col 2), data node feeds both A and B
        event = BlueprintNode(
            node_class="K2Node_Event", node_name="Event_0",
            pins=[_exec_pin_out("A_0", "EXECIN_A")],
        )
        a_node = BlueprintNode(
            node_class="K2Node_CallFunction", node_name="A_0",
            pins=[
                _exec_pin_in("EXECIN_A"),
                _exec_pin_out("B_0", "EXECIN_B"),
                _data_pin_in("DATA_A", "Param"),
            ],
        )
        b_node = BlueprintNode(
            node_class="K2Node_CallFunction", node_name="B_0",
            pins=[
                _exec_pin_in("EXECIN_B"),
                _data_pin_in("DATA_B", "Param"),
            ],
        )
        data_src = BlueprintNode(
            node_class="K2Node_VariableGet", node_name="Data_0",
            pins=[
                _data_pin_out("A_0", "DATA_A", "Val"),
                _data_pin_out("B_0", "DATA_B", "Val"),
            ],
        )
        graph = BlueprintGraph(nodes=[event, a_node, b_node, data_src])
        auto_layout(graph)

        # A is col 1, B is col 2 -> leftmost consumer is col 1 -> data at col 0
        assert a_node.pos_x == HORIZONTAL_SPACING      # col 1
        assert b_node.pos_x == 2 * HORIZONTAL_SPACING   # col 2
        assert data_src.pos_x == 0                       # min(1,2) - 1 = 0

    def test_data_node_no_consumers_at_col_0(self):
        """A data-only node with no linked consumers defaults to column 0."""
        event = BlueprintNode(
            node_class="K2Node_Event", node_name="Event_0",
            pins=[_exec_pin_out("Func_0", "EXECIN0")],
        )
        func_call = BlueprintNode(
            node_class="K2Node_CallFunction", node_name="Func_0",
            pins=[_exec_pin_in("EXECIN0")],
        )
        orphan = BlueprintNode(
            node_class="K2Node_VariableGet", node_name="Orphan_0",
            pins=[],
        )
        graph = BlueprintGraph(nodes=[event, func_call, orphan])
        auto_layout(graph)

        assert orphan.pos_x == 0


# ---------------------------------------------------------------------------
# 5B: Dynamic vertical spacing
# ---------------------------------------------------------------------------

class TestDynamicSpacing:
    def test_node_height_minimum(self):
        """Node with zero pins should use minimum height of 200."""
        node = BlueprintNode(node_class="A", node_name="A_0", pins=[])
        assert _node_height(node) == 200

    def test_node_height_few_pins(self):
        """Node with few pins: max(200, pins*28+80)."""
        node = BlueprintNode(node_class="A", node_name="A_0", pins=_make_pins(3))
        # 3*28 + 80 = 164 < 200, so 200
        assert _node_height(node) == 200

    def test_node_height_many_pins(self):
        """Node with many pins gets larger height."""
        node = BlueprintNode(node_class="A", node_name="A_0", pins=_make_pins(10))
        # 10*28 + 80 = 360 > 200
        assert _node_height(node) == 360

    def test_high_pin_count_node_gets_more_space(self):
        """Stacked nodes with different pin counts should not overlap."""
        small = BlueprintNode(node_class="A", node_name="A_0", pins=_make_pins(2))
        big = BlueprintNode(node_class="B", node_name="B_0", pins=_make_pins(15))
        graph = BlueprintGraph(nodes=[small, big])
        auto_layout(graph)

        # Both at col 0, stacked vertically
        assert small.pos_x == 0
        assert big.pos_x == 0
        # big.pos_y should be >= small.pos_y + small's height
        small_h = _node_height(small)
        assert big.pos_y >= small.pos_y + small_h

    def test_dynamic_spacing_vs_fixed(self):
        """Node with 20 pins followed by another should have more gap than 200."""
        tall = BlueprintNode(node_class="A", node_name="A_0", pins=_make_pins(20))
        short = BlueprintNode(node_class="B", node_name="B_0", pins=_make_pins(1))
        graph = BlueprintGraph(nodes=[tall, short])
        auto_layout(graph)

        # tall height = 20*28+80 = 640, so short.pos_y should be >= 640
        assert short.pos_y >= 640


# ---------------------------------------------------------------------------
# 5C: Event isolation
# ---------------------------------------------------------------------------

class TestEventIsolation:
    def test_two_events_separate_bands(self):
        """Two event roots in EventGraph should be in separate vertical bands."""
        evt1 = BlueprintNode(
            node_class="K2Node_Event", node_name="Event_0",
            pins=[_exec_pin_out("Print_0", "EXECIN0")],
        )
        print1 = BlueprintNode(
            node_class="K2Node_CallFunction", node_name="Print_0",
            pins=[_exec_pin_in("EXECIN0")],
        )
        evt2 = BlueprintNode(
            node_class="K2Node_CustomEvent", node_name="CustomEvent_0",
            pins=[_exec_pin_out("Print_1", "EXECIN1")],
        )
        print2 = BlueprintNode(
            node_class="K2Node_CallFunction", node_name="Print_1",
            pins=[_exec_pin_in("EXECIN1")],
        )
        graph = BlueprintGraph(
            nodes=[evt1, print1, evt2, print2],
            graph_name="EventGraph",
        )
        auto_layout(graph)

        # Event 1 band and Event 2 band should be vertically separated
        band1_max_y = max(evt1.pos_y, print1.pos_y)
        band2_min_y = min(evt2.pos_y, print2.pos_y)
        assert band2_min_y > band1_max_y

    def test_event_isolation_not_applied_to_non_eventgraph(self):
        """Event isolation should not apply to non-EventGraph graphs."""
        evt1 = BlueprintNode(
            node_class="K2Node_Event", node_name="Event_0",
            pins=[_exec_pin_out("Print_0", "EXECIN0")],
        )
        print1 = BlueprintNode(
            node_class="K2Node_CallFunction", node_name="Print_0",
            pins=[_exec_pin_in("EXECIN0")],
        )
        evt2 = BlueprintNode(
            node_class="K2Node_CustomEvent", node_name="CustomEvent_0",
            pins=[_exec_pin_out("Print_1", "EXECIN1")],
        )
        print2 = BlueprintNode(
            node_class="K2Node_CallFunction", node_name="Print_1",
            pins=[_exec_pin_in("EXECIN1")],
        )
        graph = BlueprintGraph(
            nodes=[evt1, print1, evt2, print2],
            graph_name="MyCustomGraph",
        )
        auto_layout(graph)

        # All nodes should still have valid unique positions
        positions = [(n.pos_x, n.pos_y) for n in graph.nodes]
        assert len(set(positions)) == len(positions)

    def test_event_with_data_feeder_in_same_band(self):
        """Data-only nodes feeding an event's exec chain should be in the same band."""
        evt = BlueprintNode(
            node_class="K2Node_Event", node_name="Event_0",
            pins=[_exec_pin_out("Func_0", "EXECIN0")],
        )
        func = BlueprintNode(
            node_class="K2Node_CallFunction", node_name="Func_0",
            pins=[_exec_pin_in("EXECIN0"), _data_pin_in("DATAIN0", "Target")],
        )
        getter = BlueprintNode(
            node_class="K2Node_VariableGet", node_name="Getter_0",
            pins=[_data_pin_out("Func_0", "DATAIN0", "Val")],
        )
        evt2 = BlueprintNode(
            node_class="K2Node_CustomEvent", node_name="CustomEvent_0",
            pins=[_exec_pin_out("Func_1", "EXECIN1")],
        )
        func2 = BlueprintNode(
            node_class="K2Node_CallFunction", node_name="Func_1",
            pins=[_exec_pin_in("EXECIN1")],
        )
        graph = BlueprintGraph(
            nodes=[evt, func, getter, evt2, func2],
            graph_name="EventGraph",
        )
        auto_layout(graph)

        # Getter should be in band 1 (same Y region as evt and func)
        band1_nodes = [evt, func, getter]
        band2_nodes = [evt2, func2]
        band1_max_y = max(n.pos_y for n in band1_nodes)
        band2_min_y = min(n.pos_y for n in band2_nodes)
        assert band2_min_y > band1_max_y

    def test_single_event_no_isolation(self):
        """A single event root should not trigger band isolation."""
        evt = BlueprintNode(
            node_class="K2Node_Event", node_name="Event_0",
            pins=[_exec_pin_out("Func_0", "EXECIN0")],
        )
        func = BlueprintNode(
            node_class="K2Node_CallFunction", node_name="Func_0",
            pins=[_exec_pin_in("EXECIN0")],
        )
        orphan = BlueprintNode(
            node_class="K2Node_VariableGet", node_name="Orphan_0",
            pins=[],
        )
        graph = BlueprintGraph(
            nodes=[evt, func, orphan],
            graph_name="EventGraph",
        )
        auto_layout(graph)
        # Should work without error; all nodes get valid positions
        positions = [(n.pos_x, n.pos_y) for n in graph.nodes]
        assert len(set(positions)) == len(positions)

    def test_empty_graph(self):
        """Empty graph should be a no-op."""
        graph = BlueprintGraph(nodes=[])
        auto_layout(graph)  # should not raise
