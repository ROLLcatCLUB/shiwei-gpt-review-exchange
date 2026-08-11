# XIAOJIAO_AGENT_02 验收矩阵

| 项目 | 状态 | 说明 |
|---|---|---|
| Agent02 只读合同闭合 | PASS_AND_CLOSE | 研究发现 PARTIAL 不代表任务失败 |
| FG-002A Security/Authority Core | PARTIAL | 上游 E0-E5 accepted，Agent consumer surface 未闭合 |
| FG-002B Domain Reference Framework | PARTIAL | Owner 框架成立，多个 Domain fact 尚未成熟 |
| FG-002C Client View Hint Boundary | CONTRACT_ACCEPTED | Client may suggest；Client may not declare Authority |
| FG-002D Provenance/Freshness/Fail-Closed | CONTRACT_ACCEPTED | stale security 与 authority ambiguity fail closed |
| FG-002E Prompt/Data Minimization | CONTRACT_ACCEPTED | Envelope 不等于 Prompt |
| E5 live handle | ACCEPTED | 仅 request-scoped in-process object 可作为 Authority |
| 外部 blocker | 1 | 非 PREP-specific E0/E1/E4/E5 server consumer surface |
| Agent 内部首实现前提 | 1 | formal host ingress 与 Agent adapter |
| XIAOJIAO_AGENT_03 | NOT_AUTHORIZED | 等待 CRDF Authority |
| Agent Runtime | NOT_AUTHORIZED | 本包无实现 |
| CRDF supplier task | NOT_AUTHORIZED_BY_UPLOAD | 需目标线独立裁决 |
