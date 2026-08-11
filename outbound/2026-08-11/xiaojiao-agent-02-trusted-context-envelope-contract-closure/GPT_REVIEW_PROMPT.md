# GPT 读取与复核说明：XIAOJIAO_AGENT_02

请从交换仓根目录 CURRENT_POINTER.json 指向的固定 outboundCommit 读取本目录。

先独立核验：

1. ZIP bytes 是否为 75658；
2. ZIP SHA256 是否为 0074C3AC19E153253D9E867EFF365A2D650541104F4180AA2C9986CB613EECF8；
3. ZIP 是否有 26 个 entry 且可完整读取；
4. 包内严格 JSON、UTF-8 no BOM、LF、路径安全、Manifest 与 SHA256SUMS 是否闭合；
5. 24 项 Context 分类、FG-002A 至 FG-002E、E5 live-handle、Client/Server、Provenance、Freshness、Fail-Closed、Prompt Projection 与 Data Minimization 是否一致。

源侧正式裁决已经是 PASS_AND_CLOSE_WITH_OWNER_CLASSIFICATION_ADJUSTMENT。复核时必须保留以下 Owner 调整：

- External blocker 只有 1 项：稳定、非 PREP-specific 的 E0/E1/E4/E5 server consumer surface；
- Formal Agent host ingress 与 Agent adapter 是 Agent 线内部首实现责任，不是第二项外部 blocker。

本次 GitHub 发布不授权 XIAOJIAO_AGENT_03、Agent Runtime、CRDF supplier implementation、Model、Tool、Action、Domain mutation 或 L4+。

若返回意见，请遵循交换仓 PROTOCOL.md；GitHub 回审不自动成为项目实施 Authority。
