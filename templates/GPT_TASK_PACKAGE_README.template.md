# GPT 回传说明

```text
response_id = <response-id>
responds_to_task = <outbound-task-id>
responds_to_commit = <outbound-commit>
external_decision = <decision>
task_package = <zip-or-none>
```

本回传是外部 GPT 审核意见和任务建议，不是师维项目的自动决策。Codex 应先核验哈希、归档原始回传、形成独立采纳裁决，并等待用户执行授权。
