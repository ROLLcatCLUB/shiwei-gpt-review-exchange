# 当前里程碑

```text
milestone = CLASSROOM_M2_1_PRODUCT_SEMANTICS_RESEARCH_REFERENCE_STATE_HIERARCHICAL_ARCHIVE_AND_TEACHER_DENSITY_CLOSURE
status = IMPLEMENTED_VERIFIED_AWAITING_STABLE_MERGE_REVIEW
stable_base = classroom-dynamic-render-m1-accepted-20260717
feature_branch = codex/classroom-m2-semester-workset
```

## 已完成

- M2-A：以单一 workspace controller/reducer 收拢 ClassroomSurface 状态，保留 M1 视觉和点击行为。
- M2-B：建立 Unit → Lesson → 班级课堂实例 → ClassroomSessionPackage 的学期 fixture 层级。
- M2-C：课前准备形成下一节、今天、本周、最近完成、本学期课架五层工作梯度。
- M2-D：课堂记录形成优先队列、单班包摘要、层级浏览和不覆盖事实的跨班派生汇总。
- M2-E：研究交接仅形成教师确认的引用候选；软归档必须确认、可恢复且不删除事实。
- M2-F：专项/全站测试、validator、ESLint、生产构建、浏览器点击与三档响应式运行时证据通过。
- M2.1-F1/F2：研究候选进入 fixture 状态、更新课堂包反向引用，并改为按需抽屉；
- M2.1-F3/F4：技术身份默认折叠，学期、记录层级和研究编辑默认降密度；
- M2.1-F5/F6：置顶、常用、复用、开始课堂和确定性优先级具有真实 fixture 结果；
- M2.1-F7/F8：归档当前状态与转换分离，单课堂、子课时和大单元软归档闭合；
- M2.1-F9/F10：搜索筛选闭合，27 张 JPEG 覆盖三档视口且无无效图片。

## 呈现规则

所有功能直接呈现在：

```text
http://127.0.0.1:5183/shell-v1?room=classroom
```

没有新增需要单独打开的页面。27 张有效 JPEG 用于 M2.1 累计审核，精确覆盖 1366x768、1440x900 和 1920x1080。

## 停止门

M2.1 完成累计私有审核包并上传 GitHub 审核交换仓后停止。未授权稳定合并，未授权 M3。真实 Session、数据库、模型、语音、学生连接、WebSocket、Electron、研究室页面、正式评价与写回继续 HOLD。

累计包已生成并完成干净解压复跑：

```text
ZIP = THIS_CUMULATIVE_REVIEW_PACKAGE
SHA256 = SEE_ADJACENT_SHA256_AND_GITHUB_OUTBOUND_MANIFEST
CLEAN_EXTRACT_RESULT = RECORDED_AFTER_FINAL_ZIP_BUILD
```
