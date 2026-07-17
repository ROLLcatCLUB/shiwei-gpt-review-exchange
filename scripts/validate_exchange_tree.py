from __future__ import annotations

import json
import re
import sys
from pathlib import Path


REQUIRED = {
    "README.md",
    "PROTOCOL.md",
    "CURRENT_POINTER.json",
    "INBOUND_POINTER.json",
    "SECURITY_AND_PRIVACY.md",
    "outbound/README.md",
    "inbound/gpt/README.md",
    "templates/GPT_RESPONSE_MANIFEST.template.json",
}
FORBIDDEN_PARTS = {".git", "node_modules", "__pycache__"}
FORBIDDEN_NAMES = {".env", ".env.local", "id_rsa"}
SECRET_PATTERNS = (
    re.compile(r"gh[pousr]_[A-Za-z0-9]{20,}"),
    re.compile(r"github_pat_[A-Za-z0-9_]{20,}"),
    re.compile(r"sk-[A-Za-z0-9]{20,}"),
)


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    files = sorted(path for path in root.rglob("*") if path.is_file())
    relative = {path.relative_to(root).as_posix() for path in files}
    failures: list[str] = []

    for required in REQUIRED:
        if required not in relative:
            failures.append(f"missing required file: {required}")

    for path in files:
        rel = path.relative_to(root)
        if any(part in FORBIDDEN_PARTS for part in rel.parts):
            failures.append(f"forbidden directory: {rel.as_posix()}")
        if path.name in FORBIDDEN_NAMES or path.suffix.lower() in {".pem", ".key"}:
            failures.append(f"forbidden file: {rel.as_posix()}")
        if path.suffix.lower() in {".md", ".json", ".py", ".txt", ".gitignore", ".gitattributes"} or path.name.startswith("."):
            text = path.read_text(encoding="utf-8-sig", errors="ignore")
            for pattern in SECRET_PATTERNS:
                if pattern.search(text):
                    failures.append(f"possible secret: {rel.as_posix()}")

    pointer = json.loads((root / "CURRENT_POINTER.json").read_text(encoding="utf-8"))
    if pointer["repository"] != "ROLLcatCLUB/shiwei-gpt-review-exchange":
        failures.append("unexpected repository pointer")
    if pointer["status"] not in {"WAITING_FOR_NEXT_REVIEW_PACKAGE", "REVIEW_READY", "HOLD_SENSITIVE_PACKAGE"}:
        failures.append("invalid pointer status")

    result = {
        "result": "PASS" if not failures else "FAIL",
        "files": len(files),
        "required": len(REQUIRED),
        "failed": len(failures),
        "failures": failures,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
