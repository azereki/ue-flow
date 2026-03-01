"""CLI entry point for ue-flow: render UE Blueprint paste text to HTML/PNG."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="ue-flow",
        description="Render Unreal Engine Blueprint paste text to interactive HTML or PNG.",
    )
    sub = parser.add_subparsers(dest="command")

    # render command
    render_parser = sub.add_parser("render", help="Render a T3D paste text file")
    render_parser.add_argument("input", type=Path, help="Input .txt file (T3D paste text)")
    render_parser.add_argument("output", type=Path, help="Output file (.html or .png)")
    render_parser.add_argument("--title", default="Blueprint Viewer", help="Title for the rendered page")

    args = parser.parse_args(argv)

    if args.command == "render":
        return _cmd_render(args)

    parser.print_help()
    return 0


def _cmd_render(args: argparse.Namespace) -> int:
    input_path: Path = args.input
    output_path: Path = args.output

    if not input_path.exists():
        print(f"Error: input file not found: {input_path}", file=sys.stderr)
        return 1

    paste_text = input_path.read_text(encoding="utf-8")

    suffix = output_path.suffix.lower()

    if suffix == ".html":
        from ue_flow.renderer import render_html

        result = render_html(paste_text, output_path, title=args.title)
        if result.rendered:
            print(f"Rendered HTML: {result.output_file}")
            return 0
        else:
            print(f"Render failed: {result.error}", file=sys.stderr)
            return 1

    elif suffix == ".png":
        from ue_flow.renderer import render_png

        result = render_png(paste_text, output_path, title=args.title)
        if result.rendered:
            print(f"Rendered PNG: {result.output_file}")
            return 0
        else:
            print(f"Render failed: {result.error}", file=sys.stderr)
            return 1

    else:
        print(f"Error: unsupported output format '{suffix}'. Use .html or .png", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
