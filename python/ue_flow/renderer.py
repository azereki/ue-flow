"""Render UE blueprint paste text to self-contained HTML via ue-flow (React Flow)."""
from __future__ import annotations

import html
import json
import tempfile
from dataclasses import dataclass
from pathlib import Path

from ue_flow.t3d_parser import parse_paste_text
from ue_flow.t3d_json import serialize_graph_to_json

_PACKAGE_DIR = Path(__file__).resolve().parent
_ASSETS_DIR = _PACKAGE_DIR / "assets"
_TEMPLATE_PATH = _PACKAGE_DIR / "template.html"


@dataclass
class RenderResult:
    output_file: Path | None
    format: str
    rendered: bool
    error: str | None = None


def render_html(
    paste_text: str,
    output_path: str | Path,
    title: str = "Blueprint Viewer",
) -> RenderResult:
    """Render T3D paste text to self-contained HTML.

    Args:
        paste_text: Raw T3D clipboard text.
        output_path: Where to write the HTML file.
        title: HTML page title.

    Returns:
        RenderResult with success/error status.
    """
    output_path = Path(output_path)

    try:
        template = _TEMPLATE_PATH.read_text(encoding="utf-8")
    except FileNotFoundError:
        return RenderResult(output_file=None, format="html", rendered=False,
                            error=f"Missing template: {_TEMPLATE_PATH}")

    try:
        js_content = (_ASSETS_DIR / "ue-flow.iife.js").read_text(encoding="utf-8")
    except FileNotFoundError:
        return RenderResult(output_file=None, format="html", rendered=False,
                            error=f"Missing JS bundle: {_ASSETS_DIR / 'ue-flow.iife.js'}")

    # Parse T3D -> JSON
    try:
        graph = parse_paste_text(paste_text)
        graph_json = serialize_graph_to_json(graph)
    except Exception as exc:
        return RenderResult(output_file=None, format="html", rendered=False,
                            error=f"T3D parse failed: {exc}")

    # Escape paste text for textarea (& < > only, NOT quotes)
    escaped_text = paste_text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    result = template.replace("{{TITLE}}", html.escape(title))
    result = result.replace("{{GRAPH_JSON}}", json.dumps(graph_json))
    result = result.replace("{{PASTE_TEXT}}", escaped_text)
    result = result.replace("{{JS_CONTENT}}", js_content)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(result, encoding="utf-8")

    return RenderResult(output_file=output_path, format="html", rendered=True)


def render_png(
    paste_text: str,
    output_path: str | Path,
    title: str = "Blueprint Viewer",
    viewport_width: int = 1920,
    viewport_height: int = 1080,
    wait_ms: int = 3000,
) -> RenderResult:
    """Render T3D paste text to PNG screenshot via Playwright.

    Requires the 'png' extra: pip install ue-flow[png]
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return RenderResult(output_file=None, format="png", rendered=False,
                            error="playwright is not installed. Install with: pip install ue-flow[png]")

    output_path = Path(output_path)

    with tempfile.TemporaryDirectory() as tmp_dir:
        html_path = Path(tmp_dir) / "blueprint.html"
        html_result = render_html(paste_text, html_path, title)
        if not html_result.rendered:
            return RenderResult(output_file=None, format="png", rendered=False,
                                error=f"HTML generation failed: {html_result.error}")

        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page(viewport={"width": viewport_width, "height": viewport_height})
                page.goto(html_path.as_uri())
                page.wait_for_selector('#ue-flow-root .react-flow', timeout=wait_ms)
                page.wait_for_timeout(500)

                output_path.parent.mkdir(parents=True, exist_ok=True)
                page.screenshot(path=str(output_path), full_page=False)
                browser.close()
        except Exception as exc:
            return RenderResult(output_file=None, format="png", rendered=False,
                                error=f"Playwright screenshot failed: {exc}")

    return RenderResult(output_file=output_path, format="png", rendered=True)
