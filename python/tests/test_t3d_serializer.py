"""Tests for ue_flow.t3d_models and t3d_serializer."""
from __future__ import annotations

import pytest

from ue_flow.t3d_models import BlueprintPin, PinDirection, PinCategory


class TestBlueprintPin:
    def test_create_exec_pin(self):
        pin = BlueprintPin(
            pin_name="execute",
            direction=PinDirection.OUTPUT,
            category=PinCategory.EXEC,
        )
        assert pin.pin_name == "execute"
        assert pin.direction == PinDirection.OUTPUT
        assert pin.category == PinCategory.EXEC
        assert len(pin.pin_id) == 32  # auto-generated GUID

    def test_create_data_pin(self):
        pin = BlueprintPin(
            pin_name="ReturnValue",
            direction=PinDirection.OUTPUT,
            category=PinCategory.BOOL,
        )
        assert pin.category == PinCategory.BOOL

    def test_pin_id_is_unique(self):
        p1 = BlueprintPin(pin_name="a", direction=PinDirection.INPUT, category=PinCategory.EXEC)
        p2 = BlueprintPin(pin_name="b", direction=PinDirection.INPUT, category=PinCategory.EXEC)
        assert p1.pin_id != p2.pin_id


from ue_flow.t3d_models import BlueprintNode, BlueprintGraph


class TestBlueprintNode:
    def test_create_event_node(self):
        node = BlueprintNode(
            node_class="/Script/BlueprintGraph.K2Node_Event",
            node_name="K2Node_Event_0",
        )
        assert node.node_class == "/Script/BlueprintGraph.K2Node_Event"
        assert len(node.node_guid) == 32
        assert node.pos_x == 0
        assert node.pos_y == 0
        assert node.pins == []

    def test_create_node_with_pins(self):
        pin = BlueprintPin(pin_name="exec", direction=PinDirection.OUTPUT, category=PinCategory.EXEC)
        node = BlueprintNode(
            node_class="/Script/BlueprintGraph.K2Node_CallFunction",
            node_name="K2Node_CallFunction_0",
            pins=[pin],
        )
        assert len(node.pins) == 1

    def test_node_guid_unique(self):
        n1 = BlueprintNode(node_class="A", node_name="A_0")
        n2 = BlueprintNode(node_class="B", node_name="B_0")
        assert n1.node_guid != n2.node_guid


class TestBlueprintGraph:
    def test_create_empty_graph(self):
        graph = BlueprintGraph()
        assert graph.nodes == []

    def test_add_nodes(self):
        n1 = BlueprintNode(node_class="A", node_name="A_0")
        n2 = BlueprintNode(node_class="B", node_name="B_0")
        graph = BlueprintGraph(nodes=[n1, n2])
        assert len(graph.nodes) == 2


from ue_flow.t3d_serializer import serialize_pin, serialize_node, serialize_graph


class TestSerializePin:
    def test_exec_output_pin(self):
        pin = BlueprintPin(
            pin_name="then",
            direction=PinDirection.OUTPUT,
            category=PinCategory.EXEC,
            pin_id="A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4",
        )
        result = serialize_pin(pin)
        assert 'PinId=A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4' in result
        assert 'PinName="then"' in result
        assert 'Direction="EGPD_Output"' in result
        assert 'PinType.PinCategory="exec"' in result

    def test_input_pin_omits_direction(self):
        pin = BlueprintPin(
            pin_name="execute",
            direction=PinDirection.INPUT,
            category=PinCategory.EXEC,
            pin_id="AAAABBBBCCCCDDDDEEEEFFFFAAAABBBB",
        )
        result = serialize_pin(pin)
        # Input is default — direction string should NOT appear
        assert 'Direction=' not in result

    def test_pin_with_linked_to(self):
        pin = BlueprintPin(
            pin_name="out",
            direction=PinDirection.OUTPUT,
            category=PinCategory.EXEC,
            pin_id="1111222233334444555566667777888899",
            linked_to=[("K2Node_CallFunction_0", "AABB112233445566AABB112233445566")],
        )
        result = serialize_pin(pin)
        assert 'LinkedTo=(K2Node_CallFunction_0 AABB112233445566AABB112233445566,)' in result

    def test_pin_with_default_value(self):
        pin = BlueprintPin(
            pin_name="Value",
            direction=PinDirection.INPUT,
            category=PinCategory.REAL,
            sub_category="double",
            default_value="1.5",
            pin_id="DDDD1111222233334444555566667777",
        )
        result = serialize_pin(pin)
        assert 'PinType.PinSubCategory="double"' in result
        assert 'DefaultValue="1.5"' in result

    def test_hidden_pin(self):
        pin = BlueprintPin(
            pin_name="self",
            direction=PinDirection.INPUT,
            category=PinCategory.OBJECT,
            hidden=True,
            pin_id="HHHH1111222233334444555566667777",
        )
        result = serialize_pin(pin)
        assert 'bHidden=True' in result

    def test_pin_container_type_array(self):
        pin = BlueprintPin(
            pin_name="Items",
            direction=PinDirection.INPUT,
            category=PinCategory.OBJECT,
            container_type="Array",
            pin_id="CCCC1111222233334444555566667777",
        )
        result = serialize_pin(pin)
        assert 'PinType.ContainerType=Array' in result

    def test_pin_is_reference(self):
        pin = BlueprintPin(
            pin_name="OutParam",
            direction=PinDirection.OUTPUT,
            category=PinCategory.BOOL,
            is_reference=True,
            pin_id="RRRR1111222233334444555566667777",
        )
        result = serialize_pin(pin)
        assert 'PinType.bIsReference=True' in result

    def test_pin_is_const(self):
        pin = BlueprintPin(
            pin_name="ConstIn",
            direction=PinDirection.INPUT,
            category=PinCategory.OBJECT,
            is_const=True,
            pin_id="KKKK1111222233334444555566667777",
        )
        result = serialize_pin(pin)
        assert 'PinType.bIsConst=True' in result

    def test_pin_is_weak(self):
        pin = BlueprintPin(
            pin_name="WeakRef",
            direction=PinDirection.INPUT,
            category=PinCategory.OBJECT,
            is_weak=True,
            pin_id="WWWW1111222233334444555566667777",
        )
        result = serialize_pin(pin)
        assert 'PinType.bIsWeakPointer=True' in result

    def test_pin_autogen_default(self):
        pin = BlueprintPin(
            pin_name="Duration",
            direction=PinDirection.INPUT,
            category=PinCategory.REAL,
            autogen_default="2.0",
            pin_id="AAAA9999888877776666555544443333",
        )
        result = serialize_pin(pin)
        assert 'AutogeneratedDefaultValue="2.0"' in result

    def test_pin_defaults_emit_false_and_none(self):
        """Default values for new fields should emit False/None."""
        pin = BlueprintPin(
            pin_name="Normal",
            direction=PinDirection.INPUT,
            category=PinCategory.BOOL,
            pin_id="NNNN1111222233334444555566667777",
        )
        result = serialize_pin(pin)
        assert 'PinType.ContainerType=None' in result
        assert 'PinType.bIsReference=False' in result
        assert 'PinType.bIsConst=False' in result
        assert 'PinType.bIsWeakPointer=False' in result
        assert 'AutogeneratedDefaultValue' not in result


class TestSerializeNode:
    def test_simple_event_node(self):
        node = BlueprintNode(
            node_class="/Script/BlueprintGraph.K2Node_Event",
            node_name="K2Node_Event_0",
            node_guid="AAAABBBBCCCCDDDDEEEEFFFFAAAABBBB",
            pos_x=100,
            pos_y=200,
            properties={"EventReference": '(MemberParent="/Script/Engine.Actor",MemberName="ReceiveBeginPlay")'},
        )
        result = serialize_node(node)
        assert result.startswith('Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"')
        assert "NodePosX=100" in result
        assert "NodePosY=200" in result
        assert "NodeGuid=AAAABBBBCCCCDDDDEEEEFFFFAAAABBBB" in result
        assert result.strip().endswith("End Object")

    def test_node_with_pins(self):
        pin = BlueprintPin(
            pin_name="then",
            direction=PinDirection.OUTPUT,
            category=PinCategory.EXEC,
            pin_id="1111222233334444555566667777888899",
        )
        node = BlueprintNode(
            node_class="/Script/BlueprintGraph.K2Node_Event",
            node_name="K2Node_Event_0",
            pins=[pin],
        )
        result = serialize_node(node)
        assert "CustomProperties Pin" in result

    def test_node_with_custom_properties(self):
        node = BlueprintNode(
            node_class="/Script/BlueprintGraph.K2Node_CallFunction",
            node_name="K2Node_CallFunction_0",
            properties={
                "FunctionReference": '(MemberParent="/Script/Engine.KismetSystemLibrary",MemberName="PrintString")',
                "bIsPureFunc": "False",
            },
        )
        result = serialize_node(node)
        assert "FunctionReference=" in result
        assert "bIsPureFunc=False" in result


class TestSerializeGraph:
    def test_empty_graph(self):
        graph = BlueprintGraph()
        result = serialize_graph(graph)
        assert result == ""

    def test_two_node_graph(self):
        n1 = BlueprintNode(node_class="A", node_name="A_0")
        n2 = BlueprintNode(node_class="B", node_name="B_0")
        graph = BlueprintGraph(nodes=[n1, n2])
        result = serialize_graph(graph)
        assert result.count("Begin Object") == 2
        assert result.count("End Object") == 2

    def test_graph_nodes_separated_by_blank_line(self):
        n1 = BlueprintNode(node_class="A", node_name="A_0")
        n2 = BlueprintNode(node_class="B", node_name="B_0")
        graph = BlueprintGraph(nodes=[n1, n2])
        result = serialize_graph(graph)
        assert "\n\n" in result  # nodes separated by blank line


from ue_flow.t3d_serializer import ensure_bidirectional_links


class TestBidirectionalLinks:
    def test_adds_reverse_link(self):
        """If pin A links to pin B, pin B should also link back to A."""
        pin_a = BlueprintPin(pin_name="out", direction=PinDirection.OUTPUT, category=PinCategory.EXEC,
                             pin_id="AAAA1111222233334444555566667777",
                             linked_to=[("B_0", "BBBB1111222233334444555566667777")])
        pin_b = BlueprintPin(pin_name="in", direction=PinDirection.INPUT, category=PinCategory.EXEC,
                             pin_id="BBBB1111222233334444555566667777")
        n_a = BlueprintNode(node_class="A", node_name="A_0", pins=[pin_a])
        n_b = BlueprintNode(node_class="B", node_name="B_0", pins=[pin_b])
        graph = BlueprintGraph(nodes=[n_a, n_b])

        ensure_bidirectional_links(graph)

        # pin_b should now link back to A_0's pin
        assert ("A_0", "AAAA1111222233334444555566667777") in pin_b.linked_to

    def test_does_not_duplicate_existing_links(self):
        pin_a = BlueprintPin(pin_name="out", direction=PinDirection.OUTPUT, category=PinCategory.EXEC,
                             pin_id="AAAA1111222233334444555566667777",
                             linked_to=[("B_0", "BBBB1111222233334444555566667777")])
        pin_b = BlueprintPin(pin_name="in", direction=PinDirection.INPUT, category=PinCategory.EXEC,
                             pin_id="BBBB1111222233334444555566667777",
                             linked_to=[("A_0", "AAAA1111222233334444555566667777")])  # already set
        n_a = BlueprintNode(node_class="A", node_name="A_0", pins=[pin_a])
        n_b = BlueprintNode(node_class="B", node_name="B_0", pins=[pin_b])
        graph = BlueprintGraph(nodes=[n_a, n_b])

        ensure_bidirectional_links(graph)

        assert len(pin_b.linked_to) == 1  # not duplicated
