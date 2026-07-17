# CLASSROOM_M2.1 产品验收闭合交接

```text
M2_ENGINEERING_FOUNDATION = PASS
M2_1_PRODUCT_AND_STATE_CLOSURE = IMPLEMENTED_VERIFIED
M2_STABLE_MERGE = NOT_AUTHORIZED
M2_ACCEPTED_TAG = NOT_AUTHORIZED
M3 = NOT_AUTHORIZED
```

## 固定回审来源

GitHub 审核交换仓 `ROLLcatCLUB/shiwei-gpt-review-exchange` 的 `gpt-response` 分支以固定提交
`d2cfed93c4a5357bc6feab543fd94fd0a7464dca` 提供两个 ZIP。任务包 SHA256 为
`D6AE019D907C8F1A6AFD35111BDB9EDC46F88E93073E3EFC9FCACAED4267CABC`，审核包 SHA256 为
`7EB43F45799222B84108B4CFD922E42ECB16E8C200C1626A56FC416F2F142D6B`。两包 SHA256、Git blob、manifest、CRC、路径安全和干净解压均通过；上次缺件收件状态已关闭。

## 实现结果

- 研究引用候选进入真实 fixture reducer 状态，使用唯一 ID，并把反向引用写回所选课堂包；
- 研究表单改为按需抽屉，支持单班、跨班、新建、查看、编辑和取消；
- 教师默认面隐藏 revision、snapshot、hash 和 URI，技术信息进入折叠详情；
- 学期课架、记录层级、研究抽屉默认折叠；
- 置顶、常用、复用课次和开始课堂均有实际 fixture 状态结果；
- 优先级由 `referenceNow`、时间、就绪状态和课堂包确定性派生，覆盖空工作集；
- 归档当前状态收敛为 `ACTIVE | ARCHIVED`，恢复动作记录为 `RESTORED`；
- 单课堂、子课时和大单元软归档均有教师确认、保护项统计和显式部分归档语义；
- 课前与课堂记录补齐搜索、组合筛选和清除；
- 浏览器实测发现并修复 M2 `grade3-class5` 与 M1 `class_3_5` 的 fixture 身份接缝，开始课堂现可进入既有 M1 当前课堂。
- reducer 与初始状态已抽到 React 无关的 `classroom-workspace-state.ts`；hook controller 保持薄封装，选择性审核包可在无站点依赖目录独立复跑专项测试。

## 验证

```text
M2.1 tests = 33/33 PASS
M2.1 validator = 73/73 PASS
M1 regression = 20/20 PASS
M1 validator = 54/54 PASS
full site tests = 275/275 PASS
ESLint = PASS
vinext production build = PASS
browser click-through = PASS
clean browser console errors = 0
valid screenshots = 27 JPEG
invalid screenshots = 0
responsive viewports = 1366x768 / 1440x900 / 1920x1080
```

直接 `tsc --noEmit` 会把 `review/**/CURRENT_SOURCE` 历史选择性源码和 Worker 环境一并纳入，产生既有缺失依赖及 Cloudflare 类型错误，因此不作为本仓正式门禁；仓库既有生产构建链已通过。

## 入口和边界

唯一体验入口仍为：

```text
http://127.0.0.1:5183/shell-v1?room=classroom
```

新增页面为 0。真实 Session、数据库、模型、语音、学生实时连接、WebSocket、Electron、研究室页面、正式评价、正式写回和磁盘归档继续 HOLD。本轮停止在 M2 稳定合并审核门。
