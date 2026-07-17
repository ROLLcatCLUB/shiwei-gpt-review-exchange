# 师维教室 M2 累计审核 · GPT 原始回审

> 回传模式：`MANUAL_BOOTSTRAP_AUTHORIZED_BY_USER`
>
> 本次 `main/CURRENT_POINTER.json` 尚未登记出站包。用户明确要求用当前会话中的 M2 累计审核包测试 GitHub 回传流程。下面的审核对应本地上传包：
>
> `SHIWEI_CLASSROOM_M2_SEMESTER_WORKSET_CUMULATIVE_PRIVATE_REVIEW_20260717.zip`
>
> SHA256：`C883BF8B67AB5ABADF2FB60C21C5B74FC5FCFFDF856D45EF539B246016A8557B`
>
> 审核源代码提交：`46e034019aa494a17f0a5dd4a977dee17e22e752`

# GPT 审核裁决

```text
decision =
PASS_M2_ENGINEERING_FOUNDATION
_WITH_REQUIRED_M2_1_PRODUCT_AND_STATE_CLOSURE

M2_STABLE_MERGE = HOLD
M2_ACCEPTED_TAG = NOT_AUTHORIZED
M3_EXECUTION = NOT_AUTHORIZED_YET
```

## 独立验证

```text
SOURCE_SHA256 =
C883BF8B67AB5ABADF2FB60C21C5B74FC5FCFFDF856D45EF539B246016A8557B

HASH_MATCH = PASS
ZIP_ENTRIES = 97
MANIFEST_PAYLOAD = 96
CLEAN_EXTRACT_VALIDATOR = 174/174 PASS
```

包内 validator 在干净解压目录真实复跑：

- M2 tests：27/27 PASS；
- M2 validator：100/100 PASS；
- M1/R1/Agent/Component/R2 回归全部通过；
- 截图数量和 manifest 完整性通过。

全站 269/269、ESLint、生产构建、浏览器点击和控制台错误 0 有报告证据；选择性源码包不包含完整依赖工作区，因此未再次安装并重建整个站点。

## 已接受的核心成果

1. M1 已正确通过 Git merge 合入稳定线并建立 accepted 标签。
2. M2 直接进入原教室入口，没有新增页面和旁路静态站。
3. `ClassroomSurface` 已从分散 `useState` 迁移到统一 reducer/controller。
4. 大单元 → 子课时 → 班级课堂实例 → 逻辑课堂包的领域方向成立。
5. 课前准备已经形成“下一节 / 今天 / 本周 / 最近完成 / 本学期课架”。
6. 课堂记录优先显示待整理和待教师决定，并支持班级实例和跨班汇总。
7. 跨班汇总明确为派生对象，研究室方向明确为引用而非搬移。
8. 单课堂软归档需要教师确认，可恢复，不删除课堂事实。
9. M1 动态课堂、六 Host、工具链和 Student Display 安全合同保持回归。
10. 真实 Session、数据库、模型、研究室页面、Electron 和正式写回仍保持 HOLD。

## M2.1 必须关闭的问题

### F1. 研究引用候选实际上没有进入状态

当前 `confirmResearchCandidate()` 调用了 `createResearchHandoffCandidate(...)`，但丢弃返回对象，只把：

```text
researchCandidateConfirmed = true
```

写入状态。

结果：

- 页面显示“引用候选已确认”，但没有实际候选对象；
- `researchReferenceIds` 没有回写到所选课堂包的 fixture 状态；
- 后续归档检查无法识别本次新建立的引用；
- 刷新前也不能重新打开、查看、撤销或编辑该候选；
- 固定 ID `research-ref:teacher-fixture-draft` 无法支持多个候选。

必须建立真实的 fixture `researchHandoffCandidates` 状态和唯一 ID，并更新选中课堂包的引用关系。

### F2. 研究入口在课堂记录页永久展开，造成新的信息堆积

当前完整研究表单位于课堂记录页底部并始终渲染。它会让“课堂记录”再次成为长页面，也与“研究室按需引用而不是在教室堆积研究工作”的原则冲突。

应改为：

```text
单班课堂包 / 跨班汇总
→ 建立研究引用
→ 右侧抽屉或确认面
```

默认课堂记录首屏不显示完整研究表单。已经建立的候选只显示轻量状态和入口。

### F3. 教师默认界面暴露工程 ID 和引用 URI

当前默认班级课堂包直接显示：

- `lesson-revision:...`
- `snapshot:...`
- 快照哈希；
- `evidence:session-package:...`；
- `reflection:session-package:...`。

这些信息是追溯证据，不应占据教师主视图。

默认教师模式应显示：

- “使用版本 V0.5-P1”；
- “课堂快照已锁定”；
- “证据 2 条”；
- “课后反思已形成/待补充”。

技术 ID、哈希和 URI 进入折叠的“版本与来源详情”或 debug 模式。

### F4. 本学期课架默认展开，与已确认的降压原则不一致

`createInitialClassroomWorkspaceState()` 当前：

```text
semester = true
```

本学期课架应默认折叠；教师主动展开后再显示大单元和子课时。

课堂记录中的“按层级回看”和研究引用入口也应默认折叠或按操作打开，避免在一页中连续堆叠。

### F5. “置顶 / 常用 / 复用 / 开始课堂”部分仍停留在标签或缺失动作

当前：

- “置顶”和“常用”只改变按钮选中态，没有改变排序或形成专门入口；
- 没有实际“复用本课”动作；
- 下一节课主卡只有“课前预览”，没有明确的“开始课堂”fixture 动作。

必须让产品语义与状态结果一致，或明确降级为“标记置顶/标记常用”的纯标记功能。

### F6. 自动优先级仍由 fixture 手工填写，缺少确定性派生

`NEXT / TODAY / WEEK / LOWERED` 主要直接写入 fixture。系统尚未证明会依据：

```text
referenceNow
scheduledAt
readiness
actual record
```

自动计算下一节、今天、本周和最近完成。

应建立 `deriveClassroomWorksetPriority()` 或等价解析器；fixture 中可保留预期值用于断言，但不作为唯一真源。

同时必须处理：

- 没有下一节课；
- 今天没有课；
- 学期课程全部完成；
- 空工作集。

不得继续使用 `find(... )!` 假设下一节必然存在。

### F7. 软归档恢复后的稳定状态语义不清

当前恢复后长期保持：

```text
archiveState.status = RESTORED
```

这把“发生过恢复动作”和“当前是否在活动工作集”混在一起。

建议：

```text
currentStatus = ACTIVE | ARCHIVED
lastTransition = ARCHIVED | RESTORED
```

或恢复后回到 `ACTIVE`，另留变更记录。否则反复归档后 `previousStatus` 会变成 RESTORED。

### F8. 任务中要求的层级归档尚未实现

本轮只有单个 `ClassroomSessionPackage` 的软归档。尚未实现：

- 子课时归档；
- 大单元归档；
- 层级归档前的汇总阻断检查；
- 部分班级未完成时的教师确认说明。

M2.1 至少应完成 fixture-only 的子课时和大单元软归档合同与确认流程，或从 M2 accepted 范围中明确删除该承诺。

### F9. 搜索和筛选不完整

当前只有“待处理 / 最近 / 本学期”三个记录筛选，没有：

- 按课题、班级、日期搜索；
- 按单元、流程状态、归档状态过滤；
- 课前工作集搜索。

任务要求中的“搜索和筛选”尚未完整证明。

### F10. 截图证据中有 3 张无效空白图

以下 JPEG 只有顶部壳层，未展示目标内容：

```text
03_across_classes_summary_full...
11_preparation_full_page...
14_semester_lesson_tree_expanded...
```

报告诚实说明大视口截图限制，这是加分项；但无效空白图不能继续计入 38 张有效教师体验证据。

M2.1 应删除或重拍为可见视口截图，并明确：

```text
VALID_SCREENSHOT_COUNT
INVALID_SCREENSHOT_COUNT = 0
```

三档响应式 DOM 几何证据可以继续保留。

---

# 后续建议

## 第一步：M2.1 产品与状态闭合

```text
CLASSROOM_M2_1_PRODUCT_SEMANTICS
_RESEARCH_REFERENCE_STATE
_HIERARCHICAL_ARCHIVE
_AND_TEACHER_DENSITY_CLOSURE
```

M2.1 只修 M2 已承诺但未闭合的产品语义，不进入真实 Runtime。

## 第二步：教师/GPT复核并稳定合并

M2.1 通过后：

1. Git merge 到稳定站点；
2. 稳定仓复跑全站门禁；
3. 建立 `classroom-semester-workset-m2-accepted-20260717`；
4. 删除 M2 worktree；
5. 不手工回写页面。

## 第三步：进入 M3

建议下一个大里程碑：

```text
CLASSROOM_M3_LOCAL_DESKTOP_RUNTIME_HOST
_AND_SINGLE_MACHINE_SESSION_VERTICAL_SLICE
```

M3 第一次解除的 HOLD 仅限：

```text
Electron 桌面壳
本地确定性 ClassroomSession
本地命令执行
本地事件日志
教师窗口 + 学生展示窗口
离线素材就绪检查
ClassroomActualRecord 草稿
```

继续 HOLD：

```text
云端模型
语音 Agent
学生实时连接
WebSocket
正式数据库
正式成绩和评价
研究室真实写回
家长端
```
