# 师维 GPT 审核交换仓

这是师维项目中 Codex 与外部 GPT 交换审核材料和任务包的固定仓库。

固定地址：

```text
https://github.com/ROLLcatCLUB/shiwei-gpt-review-exchange
```

## 给 GPT：只从这里开始

1. 读取根目录 `CURRENT_POINTER.json`。
2. 如果 `latestOutbound` 不为空，按其中 `readOrder` 和固定 commit 链接审核最新 Codex 交付。
3. 不修改 `main` 分支的 `outbound/`。
4. 在 `gpt-response` 分支写入：

```text
inbound/gpt/<日期>/<response-id>/
```

5. 更新 `gpt-response` 分支根目录的 `INBOUND_POINTER.json`。
6. 回传文件和字段必须符合 `PROTOCOL.md` 与 `templates/`。

## 给 Codex

1. 完成本地实现、测试、manifest、ZIP、SHA256 和干净解压复跑。
2. 将本轮全部审核材料放入：

```text
outbound/<日期>/<task-id>/
```

3. 更新 `main` 分支根目录的 `CURRENT_POINTER.json`。
4. 通过 GitHub Git Data API 发布；不依赖本机损坏的 HTTPS git helper。
5. 验证远程文件树、固定 commit raw 链接和远程 ZIP SHA256。
6. 读取 GPT 回传时只查询 `gpt-response` 分支的 `INBOUND_POINTER.json`。

## 给卷猫先生的最简口令

以后无需粘贴审核正文或 ZIP：

```text
对 GPT：
去师维审核交换仓读取 CURRENT_POINTER.json，审核最新任务，并按 PROTOCOL.md 回传。

对 Codex：
读取师维审核交换仓 gpt-response 分支的 INBOUND_POINTER.json，核验并处理最新回传。
```

## 当前状态

仓库仅完成协议初始化。按用户要求，当前 M2 不补传；从下一个审核包开始使用。
