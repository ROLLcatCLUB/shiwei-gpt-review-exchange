# D-20260717：教室 M2.1 产品与状态闭合

## 决策

采纳 M2 外部审核中经独立复核成立的 F1—F10，在既有 M2 feature branch 内完成 fixture-only 产品语义、研究引用状态、层级软归档、教师信息密度和工作动作闭合。不得借此进入真实 Runtime 或 M3。

## 结果

```text
M2_1_TESTS = 33/33 PASS
M2_1_VALIDATOR = 73/73 PASS
M1_REGRESSION = 20/20 PASS
M1_VALIDATOR = 54/54 PASS
FULL_SITE_TESTS = 275/275 PASS
ESLINT = PASS
VINEXT_BUILD = PASS
BROWSER_CONSOLE_ERRORS = 0
VALID_SCREENSHOTS = 27
INVALID_SCREENSHOTS = 0
```

实现仍位于原教室入口，新增页面为 0。研究候选不复制原始课堂事实；归档不改变事实、快照哈希或研究引用；刷新后 fixture 重置。

## 门

M2 稳定合并与 accepted 标签仍需累计审核包通过后另行授权。M3、真实 Session、数据库、模型、语音、学生连接、Electron、WebSocket、研究室页面、正式评价和正式写回继续 HOLD。
