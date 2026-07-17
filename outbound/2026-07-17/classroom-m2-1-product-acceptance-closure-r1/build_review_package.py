from __future__ import annotations

import hashlib
import json
import sys
import zipfile
from pathlib import Path


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    root = Path(__file__).resolve().parent
    output = Path(sys.argv[1]).resolve()
    payload_paths = sorted(
        path for path in root.rglob("*")
        if path.is_file() and path.name != "PACKAGE_MANIFEST.json"
    )
    manifest = {
        "package": output.name,
        "task": "CLASSROOM_M2_1_PRODUCT_SEMANTICS_RESEARCH_REFERENCE_STATE_HIERARCHICAL_ARCHIVE_AND_TEACHER_DENSITY_CLOSURE",
        "date": "2026-07-17",
        "siteContentCommit": "9b104a2042e15d3963dde247b80a247e02242d5f",
        "governanceContentCommit": "76bb22aa4f32f2d6add3ccfd14d16ac18ced1bf2",
        "fixedInboundResponseCommit": "d2cfed93c4a5357bc6feab543fd94fd0a7464dca",
        "stableBaseTag": "classroom-dynamic-render-m1-accepted-20260717",
        "payload": [
            {
                "path": path.relative_to(root).as_posix(),
                "sha256": sha256(path),
                "bytes": path.stat().st_size,
            }
            for path in payload_paths
        ],
    }
    manifest_path = root / "PACKAGE_MANIFEST.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in sorted(root.rglob("*")):
            if path.is_file():
                archive.write(path, path.relative_to(root).as_posix())
    print(json.dumps({
        "output": str(output),
        "entries": len(payload_paths) + 1,
        "manifestPayload": len(payload_paths),
        "sha256": sha256(output),
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
