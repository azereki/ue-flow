"""
Export curated UE function signatures from SQLite DB to static JSON.

Usage:
    python js/scripts/export-signatures.py [db-path]

Default DB path: C:/Users/azere/Documents/Unreal Projects/TestProject/.claude/ue-engine/ue-signatures.db
Output: js/public/data/ue-signatures.json
"""
import json
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_DB = r"C:\Users\azere\Documents\Unreal Projects\TestProject\.claude\ue-engine\ue-signatures.db"

# Core Blueprint classes by class_path suffix (display_name varies)
CORE_CLASS_PATHS = [
    "/Script/Engine.KismetSystemLibrary",
    "/Script/Engine.KismetMathLibrary",
    "/Script/Engine.KismetStringLibrary",
    "/Script/Engine.KismetTextLibrary",
    "/Script/Engine.KismetArrayLibrary",
    "/Script/Engine.GameplayStatics",
    "/Script/Engine.Actor",
    "/Script/Engine.Pawn",
    "/Script/Engine.Character",
    "/Script/Engine.PlayerController",
    "/Script/Engine.GameModeBase",
    "/Script/Engine.ActorComponent",
    "/Script/Engine.SceneComponent",
    "/Script/Engine.PrimitiveComponent",
    "/Script/Engine.StaticMeshComponent",
    "/Script/Engine.SkeletalMeshComponent",
    "/Script/Engine.AudioComponent",
    "/Script/Engine.CameraComponent",
    "/Script/Engine.SpringArmComponent",
    "/Script/Engine.CharacterMovementComponent",
    "/Script/UMG.UserWidget",
    "/Script/UMG.WidgetComponent",
    "/Script/Engine.AnimInstance",
]

# Pins to filter out (UE auto-injects these, not visible in Blueprint editor)
HIDDEN_PIN_NAMES = {"self", "cls", "world_context_object", "__world_context"}


def export_signatures(db_path: str) -> dict:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    functions_map: dict[str, list] = {}
    total_classes = 0
    total_functions = 0
    total_pins = 0

    for class_path in CORE_CLASS_PATHS:
        c.execute(
            "SELECT id, class_path, display_name FROM sig_classes WHERE class_path = ?",
            (class_path,),
        )
        cls_row = c.fetchone()
        if not cls_row:
            print(f"  SKIP (not found): {class_path}")
            continue

        total_classes += 1
        class_id = cls_row["id"]

        c.execute(
            """SELECT id, member_name, member_parent, is_pure, is_latent, is_event
               FROM sig_functions WHERE class_id = ?""",
            (class_id,),
        )
        func_rows = c.fetchall()

        for func in func_rows:
            func_id = func["id"]
            member_name = func["member_name"]

            c.execute(
                """SELECT pin_name, friendly_name, direction, category,
                          sub_category, sub_category_object, container_type,
                          default_value, is_reference, is_const, is_hidden, pin_order
                   FROM sig_pins WHERE function_id = ? ORDER BY pin_order""",
                (func_id,),
            )
            pin_rows = c.fetchall()

            pins = []
            for p in pin_rows:
                pin_name_lower = p["pin_name"].lower()
                # Skip hidden/internal pins
                if pin_name_lower in HIDDEN_PIN_NAMES:
                    continue
                if p["is_hidden"] and pin_name_lower not in ("return_value", "returnvalue"):
                    continue

                pin: dict = {
                    "name": p["friendly_name"] or p["pin_name"],
                    "direction": p["direction"],
                    "category": p["category"],
                }
                # Only include non-empty optional fields
                if p["sub_category"]:
                    pin["subCategory"] = p["sub_category"]
                if p["sub_category_object"]:
                    pin["subCategoryObject"] = p["sub_category_object"]
                if p["container_type"]:
                    pin["containerType"] = p["container_type"]
                if p["default_value"]:
                    pin["defaultValue"] = p["default_value"]
                if p["is_reference"]:
                    pin["isReference"] = True
                if p["is_const"]:
                    pin["isConst"] = True

                pins.append(pin)
                total_pins += 1

            # Skip functions with no visible pins (all hidden)
            if not pins:
                continue

            func_entry = {
                "memberParent": func["member_parent"],
                "memberName": member_name,
                "isPure": bool(func["is_pure"]),
            }
            if func["is_latent"]:
                func_entry["isLatent"] = True
            func_entry["pins"] = pins

            if member_name not in functions_map:
                functions_map[member_name] = []
            functions_map[member_name].append(func_entry)
            total_functions += 1

    conn.close()

    return {
        "version": "1.0.0",
        "extractedAt": datetime.now(timezone.utc).isoformat(),
        "ueVersion": "5.5",
        "stats": {
            "classes": total_classes,
            "functions": total_functions,
            "pins": total_pins,
        },
        "functions": functions_map,
    }


def main():
    db_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DB
    if not Path(db_path).exists():
        print(f"ERROR: DB not found at {db_path}")
        sys.exit(1)

    print(f"Reading signatures from: {db_path}")
    data = export_signatures(db_path)

    output_path = Path(__file__).resolve().parent.parent / "public" / "data" / "ue-signatures.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, separators=(",", ":"))

    size_kb = output_path.stat().st_size / 1024
    stats = data["stats"]
    print(f"Exported: {stats['classes']} classes, {stats['functions']} functions, {stats['pins']} pins")
    print(f"Output: {output_path} ({size_kb:.0f} KB)")


if __name__ == "__main__":
    main()
