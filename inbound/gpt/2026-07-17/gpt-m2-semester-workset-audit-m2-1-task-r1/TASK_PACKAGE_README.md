# 任务执行说明

1. 读取 `RESPONSE_MANIFEST.json`；
2. 核验任务包 SHA256；
3. 阅读 `ORIGINAL_GPT_REVIEW.md` 与 `ACTION_ITEMS.md`；
4. 本次属于手动引导回传，没有 `main/outbound` 对应项；
5. 任务包只是外部建议，须经用户明确授权；
6. 执行完成后，后续应恢复标准 `CURRENT_POINTER` 出站流程。
