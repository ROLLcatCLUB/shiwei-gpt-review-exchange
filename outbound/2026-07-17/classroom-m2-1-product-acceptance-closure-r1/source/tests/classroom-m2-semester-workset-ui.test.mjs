import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (relativePath) => readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("ClassroomSurface继续使用单一workspace controller和原classroom入口", async () => {
  const source = await read("app/shell-v1/classroom/classroom-surface.tsx");
  assert.ok(source.includes("useClassroomWorkspaceController"));
  assert.ok(source.includes("onStartLesson={startSemesterWorksetLesson}"));
  assert.ok(!source.includes("useState("));
  assert.ok(source.split(/\r?\n/).length < 1293);
});

test("课前准备按下一节、今天、本周、最近完成和学期课架呈现", async () => {
  const source = await read("app/shell-v1/classroom/components/semester-classroom-workset-panels.tsx");
  for (const label of ["下一节课", "今天的课", "本周课程", "最近完成", "本学期课架"]) assert.ok(source.includes(label), label);
  assert.ok(source.includes("当前没有下一节课"));
  assert.ok(!source.includes("find((item) => item.priority === \"NEXT\")!"));
});

test("默认教师密度折叠学期课架、记录层级和研究编辑器", async () => {
  const state = await read("app/shell-v1/classroom/classroom-workspace-state.ts");
  assert.ok(state.includes("semester: false"));
  assert.ok(state.includes("recordHierarchyExpanded: false"));
  assert.ok(state.includes("researchDrawerOpen: false"));
  assert.ok(state.includes("week: false"));
});

test("课前置顶常用真实改变工作集并支持复用和开始课堂", async () => {
  const panel = await read("app/shell-v1/classroom/components/semester-classroom-workset-panels.tsx");
  const surface = await read("app/shell-v1/classroom/classroom-surface.tsx");
  for (const marker of ["highlightedLessons", "orderedLessons", "togglePinnedLesson", "toggleFrequentLesson", "复用到新课次", "createFixtureScheduleReuseCandidate", "开始课堂"]) assert.ok(panel.includes(marker), marker);
  assert.ok(panel.includes("不覆盖既有课堂事实"));
  assert.ok(surface.includes("item.classLabel === scheduledInstance.classLabel"));
});

test("课前与课堂记录都有搜索筛选和清除动作", async () => {
  const panel = await read("app/shell-v1/classroom/components/semester-classroom-workset-panels.tsx");
  for (const label of ["查找课次", "课前准备筛选", "查找课堂记录", "更多筛选", "大单元", "处理状态", "归档状态", "清除"]) assert.ok(panel.includes(label), label);
});

test("课堂记录默认优先待整理和需要教师决定", async () => {
  const source = await read("app/shell-v1/classroom/components/semester-classroom-workset-panels.tsx");
  for (const label of ["待整理", "需要教师决定", "待处理优先", "最近课堂", "本学期全部"]) assert.ok(source.includes(label), label);
  assert.ok(source.includes('recordPriorityFilter === "PRIORITY"'));
});

test("教师默认面使用教师语言且技术ID折叠", async () => {
  const source = await read("app/shell-v1/classroom/components/semester-classroom-workset-panels.tsx");
  for (const label of ["使用的课时版本", "课堂留存", "事实快照已保存", "查看版本与引用详情"]) assert.ok(source.includes(label), label);
  assert.ok(source.includes("<details className=\"sv1-m2-technical-details\""));
  assert.ok(source.includes("actualRecordRef.recordUri"));
});

test("课堂记录保留事实判断决定摘要并默认折叠完整日志", async () => {
  const source = await read("app/shell-v1/classroom/components/semester-classroom-workset-panels.tsx");
  for (const label of ["课堂事实", "小教初步判断", "教师现实判断", "教师决定"]) assert.ok(source.includes(label), label);
  assert.ok(source.includes("<details><summary>展开完整日志</summary>"));
  assert.ok(source.includes("不形成质量评分"));
});

test("跨班汇总是派生结果并可进入研究引用抽屉", async () => {
  const source = await read("app/shell-v1/classroom/components/semester-classroom-workset-panels.tsx");
  for (const label of ["同课多班派生汇总", "共同困难", "班级差异", "版本变化", "教师策略调整", "代表性证据"]) assert.ok(source.includes(label), label);
  assert.ok(source.includes("不覆盖任何单班事实"));
  assert.ok(source.includes("形成跨班研究引用候选"));
});

test("研究引用使用按需drawer并支持新建查看编辑取消", async () => {
  const source = await read("app/shell-v1/classroom/components/semester-classroom-workset-panels.tsx");
  for (const label of ["ResearchDrawer", "researchDrawerOpen", "查看/编辑", "取消", "教师确认并保存候选", "只建立引用，不移动课堂记录", "研究室 HOLD"]) assert.ok(source.includes(label), label);
  assert.ok(!source.includes('href="/research'));
});

test("研究候选保存经过强校验并更新课堂包反向引用", async () => {
  const domain = await read("domain/classroom-workset/semester-classroom-workset.ts");
  const state = await read("app/shell-v1/classroom/classroom-workspace-state.ts");
  for (const marker of ["RESEARCH_REFERENCE_REQUIRES_OBJECT_NAME", "RESEARCH_SESSION_PACKAGE_IDS_MUST_BE_UNIQUE", "RESEARCH_EVIDENCE_OUTSIDE_SELECTED_PACKAGES", "NON_ANONYMIZED_REFERENCE_REQUIRES_EXTRA_CONFIRMATION"]) assert.ok(domain.includes(marker), marker);
  assert.ok(state.includes("attachResearchCandidateToSessionPackages"));
  assert.ok(state.includes("researchHandoffCandidates"));
});

test("软归档覆盖课堂、课时和大单元并具有部分归档说明", async () => {
  const source = await read("app/shell-v1/classroom/components/semester-classroom-workset-panels.tsx");
  for (const label of ["classroomArchiveGuard", "软归档课时", "软归档可处理课堂", "恢复课时", "恢复大单元", "本次只归档可归档课堂", "不会删除课堂事实或证据引用"]) assert.ok(source.includes(label), label);
});

test("M2.1样式沿用教室CSS并覆盖三个目标宽度和轻量抽屉", async () => {
  const css = await read("app/shell-v1/classroom/classroom.css");
  for (const marker of [".sv1-m2-preparation", ".sv1-m2-records", ".sv1-m2-research-drawer", ".sv1-m2-filter-drawer", ".sv1-m2-technical-details", "@media (max-width: 1439px)", "@media (min-width: 1700px)"]) assert.ok(css.includes(marker), marker);
});

test("M1动态课堂宿主和工具链继续保留", async () => {
  const surface = await read("app/shell-v1/classroom/classroom-surface.tsx");
  const hosts = await read("app/shell-v1/classroom/hosts/classroom-component-hosts.tsx");
  for (const marker of ["ClassroomStageHost", "ClassroomSidecarHost", "ClassroomOverlayHost", "ClassroomDockHost", "StudentDisplayHost", "GlobalAgentInputHost"]) assert.ok(`${surface}\n${hosts}`.includes(marker), marker);
  assert.ok(surface.includes("createClassroomWebFixtureAdapter"));
});

test("M2.1源码不触碰真实运行时边界", async () => {
  const files = await Promise.all([read("domain/classroom-workset/semester-classroom-workset.ts"), read("app/shell-v1/classroom/semester-classroom-workset-fixture.ts"), read("app/shell-v1/classroom/classroom-workspace-state.ts"), read("app/shell-v1/classroom/use-classroom-workspace-controller.ts"), read("app/shell-v1/classroom/components/semester-classroom-workset-panels.tsx")]);
  const source = files.join("\n");
  for (const forbidden of ["WebSocket", "EventSource", "fetch(", "openai", "navigator.mediaDevices", "localStorage", "indexedDB"]) assert.ok(!source.includes(forbidden), forbidden);
  assert.ok(source.includes("MEMORY_RESET_ON_REFRESH"));
});
