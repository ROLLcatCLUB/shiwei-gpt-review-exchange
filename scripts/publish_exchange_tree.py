from __future__ import annotations

import argparse
import base64
import json
import subprocess
import time
from pathlib import Path


EXCLUDED_PARTS = {".git", "node_modules", "__pycache__"}
EXCLUDED_NAMES = {"UPLOAD_RESULT_LOCAL.json"}


def gh_json(args: list[str], payload: dict | None = None) -> dict:
    command = ["gh", "api", *args]
    last_error = ""
    for attempt in range(1, 4):
        completed = subprocess.run(
            command,
            input=(json.dumps(payload).encode("utf-8") if payload is not None else None),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        if completed.returncode == 0:
            return json.loads(completed.stdout.decode("utf-8"))
        last_error = completed.stderr.decode("utf-8", errors="replace")
        if attempt < 3 and any(marker in last_error.lower() for marker in ("unexpected eof", "timeout", "temporarily unavailable")):
            time.sleep(attempt * 2)
            continue
        break
    raise RuntimeError(last_error)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    parser.add_argument("--repo", default="ROLLcatCLUB/shiwei-gpt-review-exchange")
    parser.add_argument("--branch", default="main")
    parser.add_argument("--message", required=True)
    args = parser.parse_args()

    root = Path(args.root).resolve()
    head = gh_json([f"repos/{args.repo}/commits/{args.branch}"])
    base_commit = head["sha"]
    base_tree = gh_json([f"repos/{args.repo}/git/commits/{base_commit}"])["tree"]["sha"]

    entries = []
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.name in EXCLUDED_NAMES:
            continue
        relative = path.relative_to(root)
        if any(part in EXCLUDED_PARTS for part in relative.parts):
            continue
        blob = gh_json(
            [f"repos/{args.repo}/git/blobs", "--method", "POST", "--input", "-"],
            {
                "content": base64.b64encode(path.read_bytes()).decode("ascii"),
                "encoding": "base64",
            },
        )
        entries.append({
            "path": relative.as_posix(),
            "mode": "100644",
            "type": "blob",
            "sha": blob["sha"],
        })

    tree = gh_json(
        [f"repos/{args.repo}/git/trees", "--method", "POST", "--input", "-"],
        {"base_tree": base_tree, "tree": entries},
    )
    commit = gh_json(
        [f"repos/{args.repo}/git/commits", "--method", "POST", "--input", "-"],
        {"message": args.message, "tree": tree["sha"], "parents": [base_commit]},
    )
    gh_json(
        [f"repos/{args.repo}/git/refs/heads/{args.branch}", "--method", "PATCH", "--input", "-"],
        {"sha": commit["sha"], "force": False},
    )
    print(json.dumps({
        "repository": args.repo,
        "branch": args.branch,
        "baseCommit": base_commit,
        "commit": commit["sha"],
        "files": len(entries),
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
