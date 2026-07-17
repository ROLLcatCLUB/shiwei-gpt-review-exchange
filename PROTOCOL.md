# 师维 Codex ↔ GPT GitHub 交换协议 v1.1

```text
current_version = v1.1
v1.0 = 固定仓、双分支、出站与回传指针
v1.1 = 增加 Codex 收件回执与缺件反馈闭环
```

## 一、分支所有权

```text
main
= Codex 出站审核材料

gpt-response
= GPT 回审与任务包
```

- GPT 不修改 `main/outbound/`。
- Codex 不把 `gpt-response/inbound/` 直接当项目决策。
- 双方使用固定 commit SHA 作为不可变读取锚点，不只使用会移动的分支链接。

## 二、Codex 出站目录

```text
outbound/<YYYY-MM-DD>/<task-id>/
├─ README_FOR_GPT_REVIEW.md
├─ GPT_REVIEW_PROMPT.md
├─ REVIEW_SUMMARY.md
├─ ACCEPTANCE_MATRIX.md
├─ PACKAGE_MANIFEST.json
├─ UPLOAD_VERIFICATION.json
├─ <review-package>.zip
├─ <review-package>.zip.sha256.txt
├─ reports/
├─ screenshots/
├─ validators/
├─ source/
└─ governance/
```

上传范围以 `PACKAGE_MANIFEST.json` 和出站 README 为准。所谓“全部审核资料”是全部 manifest payload、审核 ZIP 和外部 SHA256，不是整个活动代码仓。

## 三、GPT 回传目录

GPT 在 `gpt-response` 分支创建：

```text
inbound/gpt/<YYYY-MM-DD>/<response-id>/
├─ ORIGINAL_GPT_REVIEW.md
├─ REVIEW_SUMMARY.md
├─ ADOPTION_RECOMMENDATION.md
├─ ACTION_ITEMS.md
├─ RESPONSE_MANIFEST.json
├─ <task-package>.zip
└─ <task-package>.zip.sha256.txt
```

如果没有新任务包，可以省略 ZIP，但 `RESPONSE_MANIFEST.json` 必须明确 `taskPackage = null`。

GPT 完成回传后更新同一分支根目录：

```text
INBOUND_POINTER.json
```

其中必须包含响应目录、响应 commit、对应的出站 task ID、出站 commit 和出站 ZIP SHA256。

## 四、项目裁决边界

```text
GPT 回审 = 外部审核意见
GPT 任务包 = 外部任务建议
项目决策 = 教师/用户明确授权后，由 Codex 独立复核登记
```

GitHub 中出现回传文件不等于自动授权实施。Codex 只有在用户明确说“读取并处理”“开始执行”或同等授权后才进入实现。

## 五、Codex 本地接收治理

```text
GitHub gpt-response
→ D:\Documents\SmartEdu\review-inbox\gpt\
→ 哈希与 manifest 核验
→ D:\Documents\SmartEdu\review-archive\gpt\<日期>\<任务>\
→ shiwei-project-governance\development-history\external-reviews\gpt\...
→ ADOPTION_DECISION
→ 用户执行授权
```

原始 GPT 回传永久保留，不修改；采纳、部分采纳、拒绝和待讨论必须与原文分离。

## 六、安全和隐私

固定交换仓为公开审核仓，仅允许上传已经通过隐私/秘密扫描的 fixture、源码、报告和审核材料。禁止：

- `.env`、token、密钥、证书；
- 真实学生、教师和课堂可识别数据；
- 真实课堂日志、原始音视频；
- provider 私密 prompt/response；
- `node_modules`、缓存和整个活动工作区；
- 未经授权的研究数据和正式评价。

若审核包包含不能公开的数据，Codex 必须把 `CURRENT_POINTER.status` 设为 `HOLD_SENSITIVE_PACKAGE`，停止上传并报告用户。

## 七、大文件

- 普通文件和 ZIP 使用 Git Data API。
- 单文件接近 90 MB 时不放 Git tree，改用 GitHub Release asset；仓库只保存 manifest、SHA256 和固定 release URL。
- Release asset 同样必须远程下载复算 SHA256。

## 八、远程验证

每次出站必须证明：

1. 远程树与本地上传清单一致；
2. forbidden 文件数为 0；
3. README、prompt、manifest、validator raw 链接返回 HTTP 200；
4. 远程 ZIP SHA256 与本地一致；
5. `CURRENT_POINTER.json` 指向固定 commit；
6. GitHub 上传结果进入本地开发日志和治理账本。

## 九、Codex 收件回执

GPT 更新 `gpt-response:INBOUND_POINTER.json` 后，Codex 不在该分支回写。Codex 在 `main` 分支创建：

```text
receipts/codex/<YYYY-MM-DD>/<response-id>/
├─ CODEX_INTAKE_RECEIPT.json
└─ CODEX_INTAKE_SUMMARY.md
```

并更新根目录：

```text
CODEX_INTAKE_POINTER.json
```

回执状态至少区分：

```text
COMPLETE
PARTIAL_HOLD_MISSING_DECLARED_PAYLOAD
REJECTED_HASH_MISMATCH
REJECTED_POINTER_OR_MANIFEST_INVALID
```

GPT 回传后应读取该指针。Codex 回执必须指向一个已经包含完整回执正文的固定 commit，不得把指针自身提交冒充内容锚点。manifest 声明的 ZIP 或 Release asset 实体缺失时，即使文字文件齐全也只能是 `PARTIAL_HOLD`。
