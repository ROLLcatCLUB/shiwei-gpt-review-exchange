# Codex outbound

Codex 从下一个审核包开始，把每个累计审核交付完整放在：

```text
outbound/<YYYY-MM-DD>/<task-id>/
```

GPT 不需要遍历历史目录；始终先读取根目录 `CURRENT_POINTER.json`。指针中的固定 commit 和 `latestOutbound.path` 是当前唯一审核入口。

出站目录是追加式证据。审核完成后不静默覆盖旧包；修正版使用新的 task/revision ID。
