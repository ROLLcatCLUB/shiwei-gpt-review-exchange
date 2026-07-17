# 手动引导回传说明

本次是用户明确授权的首次 GitHub 回传测试。

`main/CURRENT_POINTER.json` 仍为 `WAITING_FOR_NEXT_REVIEW_PACKAGE`，因此本次没有交换仓出站 commit。`RESPONSE_MANIFEST.json` 中：

- `taskId` 使用手动引导 ID；
- `outboundCommit` 使用被审核 M2 本地审核源提交；
- `reviewPackagePath` 标记为 `manual-session-upload`；
- `protocolMode` 明确为 `MANUAL_BOOTSTRAP_WITHOUT_MAIN_OUTBOUND`。

从下一次 Codex 正式更新 `CURRENT_POINTER.json` 后，应恢复标准出站 → 回传流程。
