"""Tests for ue_flow.renderer — HTML rendering."""
from __future__ import annotations

import pytest
from pathlib import Path

from ue_flow.renderer import render_html, RenderResult

SAMPLE_PASTE_TEXT = '''\
Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"
   EventReference=(MemberParent="/Script/Engine.Actor",MemberName="ReceiveBeginPlay")
   NodePosX=0
   NodePosY=0
   NodeGuid=AAAA0000BBBB1111CCCC2222DDDD3333
   CustomProperties Pin (PinId=11112222333344445555666677778888,PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec",PinType.PinSubCategory="",PinType.PinSubCategoryObject=None,PinType.PinSubCategoryMemberReference=(),PinType.PinValueType=(),PinType.ContainerType=None,PinType.bIsReference=False,PinType.bIsConst=False,PinType.bIsWeakPointer=False,PersistentGuid=00000000000000000000000000000000,bHidden=False,bNotConnectable=False,bDefaultValueIsReadOnly=False,bDefaultValueIsIgnored=False,bAdvancedView=False,bOrphanedPin=False,)
End Object'''


class TestRenderHtml:
    def test_produces_valid_html(self, tmp_path):
        out = tmp_path / "test.html"
        result = render_html(SAMPLE_PASTE_TEXT, out)
        assert result.rendered is True
        assert result.error is None
        assert result.output_file == out
        assert result.format == "html"
        content = out.read_text(encoding="utf-8")
        assert content.startswith("<!DOCTYPE html>")

    def test_html_contains_graph_json(self, tmp_path):
        out = tmp_path / "test.html"
        render_html(SAMPLE_PASTE_TEXT, out)
        content = out.read_text(encoding="utf-8")
        assert 'id="ue-flow-data"' in content
        assert '"K2Node_Event_0"' in content

    def test_html_contains_original_paste_text(self, tmp_path):
        out = tmp_path / "test.html"
        render_html(SAMPLE_PASTE_TEXT, out)
        content = out.read_text(encoding="utf-8")
        assert "Begin Object" in content
        assert "K2Node_Event" in content

    def test_html_is_self_contained(self, tmp_path):
        out = tmp_path / "test.html"
        render_html(SAMPLE_PASTE_TEXT, out)
        content = out.read_text(encoding="utf-8")
        # No external script/link references
        assert 'src="http' not in content
        assert 'href="http' not in content

    def test_html_escapes_special_chars(self, tmp_path):
        malicious = '<script>alert("xss")</script>'
        out = tmp_path / "test.html"
        render_html(malicious, out)
        content = out.read_text(encoding="utf-8")
        # The paste text in textarea should be escaped
        assert "&lt;script&gt;alert" in content

    def test_missing_bundle_returns_error(self, tmp_path, monkeypatch):
        import ue_flow.renderer as mod
        monkeypatch.setattr(mod, "_ASSETS_DIR", tmp_path / "nonexistent")
        out = tmp_path / "test.html"
        result = render_html(SAMPLE_PASTE_TEXT, out)
        assert result.rendered is False
        assert result.error is not None

    def test_creates_parent_directories(self, tmp_path):
        out = tmp_path / "subdir" / "nested" / "test.html"
        result = render_html(SAMPLE_PASTE_TEXT, out)
        assert result.rendered is True
        assert out.exists()
