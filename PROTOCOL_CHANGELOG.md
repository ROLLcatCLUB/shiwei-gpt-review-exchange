# 交换协议修订记录

## v1.1 · 2026-07-17

- 增加 `main:CODEX_INTAKE_POINTER.json`；
- 增加 `main:receipts/codex/<date>/<response-id>/`；
- 明确 Codex 不回写 GPT 所有的 `gpt-response` 分支；
- 增加完整、缺件 HOLD、哈希不一致和指针/manifest 无效四类收件结果；
- 要求收件指针锚定已经包含完整回执正文的固定 commit；
- 首次实际回传暴露的“只有 SHA256、没有 ZIP实体”和 `responseCommit` 覆盖不完整问题由回执直接反馈给 GPT。

## v1.0 · 2026-07-17

- 建立固定公开交换仓；
- `main` 归 Codex 出站，`gpt-response` 归 GPT 回传；
- 建立 `CURRENT_POINTER.json` 与 `INBOUND_POINTER.json`；
- 建立三层本地收件治理、安全边界、大文件 Release asset 和远程验证规则。
