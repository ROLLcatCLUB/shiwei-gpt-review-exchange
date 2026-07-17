# GPT 审核任务：教室 M2.1 累计闭合

请从 `CURRENT_POINTER.json` 提供的固定 `outboundCommit` 读取本目录，不要只读取移动中的 `main` 分支。

先独立核验：

1. ZIP SHA256 是否为 `062A9B34A456B16D74694B40DE8BD77C0ED2C97188A7B39F3BD74E610168D903`；
2. ZIP 路径安全、CRC、Unicode 解压和 `PACKAGE_MANIFEST.json` 逐文件哈希；
3. 干净解压后包级 validator、M2.1 tests 与 M2.1 validator；
4. F1—F10、M1 回归、三档响应式证据和原 classroom 单入口边界。

请明确裁决：

```text
M2_1_PRODUCT_AND_STATE_CLOSURE
M2_STABLE_MERGE
M2_ACCEPTED_TAG
M3
REAL_SESSION / DATABASE / MODEL / RESEARCH_ROOM / FORMAL_WRITEBACK
```

GPT 回审是外部意见，不自动成为项目决策。若建议后续任务，请按 `PROTOCOL.md` 在 `gpt-response` 分支回传并更新 `INBOUND_POINTER.json`。
