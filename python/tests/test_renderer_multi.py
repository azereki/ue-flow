"""Tests for ue_flow.renderer_multi — multi-graph HTML rendering."""
from __future__ import annotations

import json
import pytest
from pathlib import Path

from ue_flow.renderer_multi import BlueprintManifest, render_multi_html

SAMPLE_EVENT_GRAPH = '''\
Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"
   EventReference=(MemberParent="/Script/Engine.Actor",MemberName="ReceiveBeginPlay")
   NodePosX=0
   NodePosY=0
   NodeGuid=AAAA0000BBBB1111CCCC2222DDDD3333
   CustomProperties Pin (PinId=11112222333344445555666677778888,PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object'''

SAMPLE_FUNCTION_GRAPH = '''\
Begin Object Class=/Script/BlueprintGraph.K2Node_FunctionEntry Name="K2Node_FunctionEntry_0"
   NodePosX=0
   NodePosY=0
   NodeGuid=FFFF0000EEEE1111DDDD2222CCCC3333
   CustomProperties Pin (PinId=AAAA1111BBBB2222CCCC3333DDDD4444,PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object'''


class TestRenderMultiHtml:
    def _make_manifest(self) -> BlueprintManifest:
        return BlueprintManifest(
            title="Test Blueprint",
            graphs={
                "EventGraph": SAMPLE_EVENT_GRAPH,
                "GetHealth": SAMPLE_FUNCTION_GRAPH,
            },
            events=[{"name": "BeginPlay"}],
            functions=[{"name": "GetHealth", "category": "State"}],
            variables=[{"name": "Health", "type": "Float", "default": "100"}],
        )

    def test_produces_valid_html(self, tmp_path):
        out = tmp_path / "multi.html"
        manifest = self._make_manifest()
        result = render_multi_html(manifest, out)
        assert result.rendered is True
        assert result.error is None
        content = out.read_text(encoding="utf-8")
        assert content.startswith("<!DOCTYPE html>")

    def test_html_contains_multi_graph_json(self, tmp_path):
        out = tmp_path / "multi.html"
        manifest = self._make_manifest()
        render_multi_html(manifest, out)
        content = out.read_text(encoding="utf-8")
        assert 'id="ue-flow-multi-data"' in content
        assert '"EventGraph"' in content
        assert '"GetHealth"' in content

    def test_html_contains_both_graphs(self, tmp_path):
        out = tmp_path / "multi.html"
        manifest = self._make_manifest()
        render_multi_html(manifest, out)
        content = out.read_text(encoding="utf-8")
        assert '"K2Node_Event_0"' in content
        assert '"K2Node_FunctionEntry_0"' in content

    def test_html_contains_metadata(self, tmp_path):
        out = tmp_path / "multi.html"
        manifest = self._make_manifest()
        render_multi_html(manifest, out)
        content = out.read_text(encoding="utf-8")
        assert '"events"' in content
        assert '"functions"' in content
        assert '"variables"' in content

    def test_html_is_self_contained(self, tmp_path):
        out = tmp_path / "multi.html"
        manifest = self._make_manifest()
        render_multi_html(manifest, out)
        content = out.read_text(encoding="utf-8")
        assert 'src="http' not in content
        assert 'href="http' not in content

    def test_html_contains_paste_texts(self, tmp_path):
        out = tmp_path / "multi.html"
        manifest = self._make_manifest()
        render_multi_html(manifest, out)
        content = out.read_text(encoding="utf-8")
        assert 'id="ue-flow-paste-texts"' in content
        assert "Begin Object" in content

    def test_missing_bundle_returns_error(self, tmp_path, monkeypatch):
        import ue_flow.renderer_multi as mod
        monkeypatch.setattr(mod, "_ASSETS_DIR", tmp_path / "nonexistent")
        out = tmp_path / "multi.html"
        manifest = self._make_manifest()
        result = render_multi_html(manifest, out)
        assert result.rendered is False
        assert result.error is not None

    def test_empty_manifest(self, tmp_path):
        out = tmp_path / "multi.html"
        manifest = BlueprintManifest(title="Empty")
        result = render_multi_html(manifest, out)
        assert result.rendered is True
        content = out.read_text(encoding="utf-8")
        assert '"graphs": {}' in content or '"graphs":{}' in content
