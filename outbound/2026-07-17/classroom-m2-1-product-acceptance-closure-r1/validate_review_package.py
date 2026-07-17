from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path


def jpeg_size(path: Path) -> tuple[int, int]:
    data = path.read_bytes()
    if data[:2] != b"\xff\xd8":
        raise ValueError(f"not a JPEG: {path.name}")
    index = 2
    start_of_frame = {0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF}
    while index + 9 < len(data):
        if data[index] != 0xFF:
            index += 1
            continue
        while index < len(data) and data[index] == 0xFF:
            index += 1
        marker = data[index]
        index += 1
        if marker in {0xD8, 0xD9}:
            continue
        if marker == 0xDA or index + 2 > len(data):
            break
        length = int.from_bytes(data[index:index + 2], "big")
        if marker in start_of_frame:
            height = int.from_bytes(data[index + 3:index + 5], "big")
            width = int.from_bytes(data[index + 5:index + 7], "big")
            return width, height
        index += length
    raise ValueError(f"JPEG size unavailable: {path.name}")


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    manifest = json.loads((root / "PACKAGE_MANIFEST.json").read_text(encoding="utf-8"))
    failures: list[str] = []
    checks = 0

    declared = {entry["path"]: entry for entry in manifest["payload"]}
    actual = {
        path.relative_to(root).as_posix()
        for path in root.rglob("*")
        if path.is_file() and path.name != "PACKAGE_MANIFEST.json"
    }
    checks += 1
    if actual != set(declared):
        failures.append("payload file set differs from manifest")

    for relative, entry in declared.items():
        path = root / relative
        checks += 1
        if not path.is_file():
            failures.append(f"missing: {relative}")
            continue
        if hashlib.sha256(path.read_bytes()).hexdigest() != entry["sha256"]:
            failures.append(f"sha256 mismatch: {relative}")

    required = [
        "README_FOR_GPT_REVIEW.md",
        "ACCEPTANCE_MATRIX.md",
        "VALIDATION_SUMMARY.md",
        "reports/GITHUB_INBOUND_RECEIPT.md",
        "reports/RESPONSIVE_LAYOUT_EVIDENCE.json",
        "reports/2026-07-17_CLASSROOM_M2_1_PRODUCT_ACCEPTANCE_CLOSURE_HANDOFF.md",
        "governance/D-20260717-CLASSROOM-M2-1-PRODUCT-AND-STATE-CLOSURE.md",
        "source/domain/classroom-workset/semester-classroom-workset.ts",
        "source/app/shell-v1/classroom/classroom-surface.tsx",
        "source/app/shell-v1/classroom/classroom-workspace-state.ts",
        "source/app/shell-v1/classroom/use-classroom-workspace-controller.ts",
        "source/app/shell-v1/classroom/components/semester-classroom-workset-panels.tsx",
        "source/tests/classroom-m2-semester-workset.test.mjs",
        "source/tests/classroom-m2-semester-workset-ui.test.mjs",
        "source/scripts/validate-classroom-m2-semester-workset.mjs",
    ]
    for relative in required:
        checks += 1
        if not (root / relative).is_file():
            failures.append(f"required file missing: {relative}")

    screenshots = sorted((root / "screenshots").glob("*.jpg"))
    checks += 1
    if len(screenshots) < 20:
        failures.append(f"expected at least 20 screenshots, got {len(screenshots)}")
    viewport_counts: dict[tuple[int, int], int] = {}
    accepted_sizes = {(1366, 768), (1440, 900), (1920, 1080)}
    for screenshot in screenshots:
        checks += 1
        try:
            size = jpeg_size(screenshot)
            viewport_counts[size] = viewport_counts.get(size, 0) + 1
            if size not in accepted_sizes:
                failures.append(f"unexpected screenshot size: {screenshot.name} = {size}")
            if screenshot.stat().st_size <= 0:
                failures.append(f"empty screenshot: {screenshot.name}")
        except ValueError as error:
            failures.append(str(error))
    for size in sorted(accepted_sizes):
        checks += 1
        if viewport_counts.get(size, 0) == 0:
            failures.append(f"missing responsive screenshot size: {size}")

    responsive = json.loads((root / "reports/RESPONSIVE_LAYOUT_EVIDENCE.json").read_text(encoding="utf-8"))
    checks += 3
    if responsive["validScreenshotCount"] != len(screenshots):
        failures.append("responsive valid screenshot count mismatch")
    if responsive["invalidScreenshotCount"] != 0:
        failures.append("invalid screenshot count is not zero")
    if responsive["cleanBrowserConsoleErrors"] != 0:
        failures.append("clean browser console has errors")

    fixture = json.loads((root / "source/fixtures/classroom-workset/COLORFUL_WORLD_SEMESTER_WORKSET_M2.json").read_text(encoding="utf-8"))
    checks += 2
    if fixture["status"] != "SIMULATED_ONLY" or fixture["runtime"]["realClassroomSession"]:
        failures.append("fixture runtime boundary changed")
    if fixture["runtime"]["persistence"] != "MEMORY_RESET_ON_REFRESH":
        failures.append("fixture persistence boundary changed")

    combined = "\n".join(
        (root / relative).read_text(encoding="utf-8")
        for relative in [
            "source/domain/classroom-workset/semester-classroom-workset.ts",
            "source/app/shell-v1/classroom/classroom-surface.tsx",
            "source/app/shell-v1/classroom/classroom-workspace-state.ts",
            "source/app/shell-v1/classroom/use-classroom-workspace-controller.ts",
            "source/app/shell-v1/classroom/components/semester-classroom-workset-panels.tsx",
        ]
    )
    markers = [
        "researchHandoffCandidates",
        "attachResearchCandidateToSessionPackages",
        "ResearchDrawer",
        "sv1-m2-technical-details",
        "semester: false",
        "recordHierarchyExpanded: false",
        "createFixtureScheduleReuseCandidate",
        "deriveClassroomWorksetPriority",
        "lastTransition",
        "createHierarchyArchivePlan",
        "查找课次",
        "查找课堂记录",
        "item.classLabel === scheduledInstance.classLabel",
    ]
    for marker in markers:
        checks += 1
        if marker not in combined:
            failures.append(f"M2.1 marker missing: {marker}")
    for forbidden in ('href="/research', "router.push", "WebSocket", "localStorage", "indexedDB"):
        checks += 1
        if forbidden in combined:
            failures.append(f"forbidden runtime marker: {forbidden}")

    checks += 1
    if any("node_modules/" in item or item.endswith(".zip") for item in actual):
        failures.append("package contains dependencies or nested ZIP")

    passed = checks - len(failures)
    print(json.dumps({
        "checks": checks,
        "passed": passed,
        "failed": len(failures),
        "screenshots": len(screenshots),
        "viewportCounts": {f"{w}x{h}": count for (w, h), count in sorted(viewport_counts.items())},
        "manifestPayload": len(declared),
        "failures": failures,
    }, ensure_ascii=False, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
