import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  applyHierarchyArchivePlan,
  archiveClassroomSessionPackage,
  attachResearchCandidateToSessionPackages,
  classroomArchiveGuard,
  createFixtureScheduleReuseCandidate,
  createHierarchyArchivePlan,
  createResearchHandoffCandidate,
  deriveClassroomWorksetPriorities,
  restoreClassroomSessionPackage,
  restoreHierarchyArchiveScope,
  validateSemesterClassroomWorkset,
} from "../domain/classroom-workset/semester-classroom-workset.ts";
import { colorfulWorldLessonDefinitions, colorfulWorldSemesterClassroomWorkset as workset } from "../app/shell-v1/classroom/semester-classroom-workset-fixture.ts";
import { classroomWorkspaceReducer, createInitialClassroomWorkspaceState } from "../app/shell-v1/classroom/classroom-workspace-state.ts";

const read = (relativePath) => readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

function initialWorkspace(overrides = {}) {
  return createInitialClassroomWorkspaceState({
    selectedCandidateId: "candidate-next",
    elapsedSeconds: 0,
    materialItems: [],
    sessionPackages: workset.sessionPackages,
    scheduleInstances: workset.scheduleInstances,
    researchHandoffCandidates: workset.researchHandoffCandidates,
    ...overrides,
  });
}

test("M2.1 fixture工作集通过结构、引用和边界校验", () => {
  assert.deepEqual(validateSemesterClassroomWorkset(workset), []);
  assert.equal(workset.runtimeEffect, "NONE_FIXTURE_ONLY");
  assert.equal(workset.persistence, "MEMORY_RESET_ON_REFRESH");
});

test("工作集建立大单元到子课时到班级课堂实例层级", () => {
  assert.deepEqual(workset.unitOrder, ["unit-colorful-world"]);
  assert.deepEqual(colorfulWorldLessonDefinitions.map((item) => item.lessonTitle), ["色彩的渐变", "渐变的节奏", "多彩的生活"]);
  assert.equal(workset.units[0].lessonIds.length, 3);
  assert.ok(workset.lessons.every((lesson) => lesson.scheduleInstanceIds.length > 0));
  assert.equal(new Set(workset.sessionPackages.map((item) => item.sessionPackageId)).size, workset.sessionPackages.length);
});

test("课前优先级由referenceNow确定性派生且NEXT唯一", () => {
  const derived = deriveClassroomWorksetPriorities(workset.scheduleInstances, { referenceNow: workset.referenceNow });
  assert.equal(derived.filter((item) => item.priority === "NEXT").length, 1);
  assert.ok(derived.some((item) => item.priority === "TODAY"));
  assert.equal(derived.filter((item) => item.priority === "WEEK").length, 3);
  assert.ok(derived.some((item) => item.priority === "RECENT_COMPLETE"));
});

test("无未来课次时不会伪造NEXT", () => {
  const doneOnly = workset.scheduleInstances.filter((item) => item.readiness === "COMPLETE");
  const derived = deriveClassroomWorksetPriorities(doneOnly, { referenceNow: workset.referenceNow });
  assert.equal(derived.some((item) => item.priority === "NEXT"), false);
});

test("空课表优先级派生安全返回空数组", () => {
  assert.deepEqual(deriveClassroomWorksetPriorities([], { referenceNow: workset.referenceNow }), []);
});

test("置顶和常用改变同一优先区间的工作顺序但不改课堂事实", () => {
  const before = JSON.stringify(workset.sessionPackages);
  const derived = deriveClassroomWorksetPriorities(workset.scheduleInstances, { referenceNow: workset.referenceNow, pinnedLessonIds: ["lesson-gradient-rhythm"], frequentlyUsedLessonIds: ["lesson-colorful-life"] });
  assert.ok(derived.length > 0);
  assert.equal(JSON.stringify(workset.sessionPackages), before);
});

test("复用建立新fixture课次候选并引用历史版本快照", () => {
  const source = workset.sessionPackages[0];
  const candidate = createFixtureScheduleReuseCandidate({ lessonId: source.lessonId, unitId: source.unitId, classId: "grade3-class5", classLabel: "三（5）班", scheduledAt: "2026-05-18T14:10:00+08:00", sourceLessonRevisionId: source.lessonRevisionId, sourceClassroomSnapshotId: source.classroomSnapshotId, existingSchedules: workset.scheduleInstances, referenceNow: workset.referenceNow });
  assert.equal(candidate.origin, "TEACHER_REUSE_CANDIDATE");
  assert.equal(candidate.sourceLessonRevisionId, source.lessonRevisionId);
  assert.equal(candidate.sourceClassroomSnapshotId, source.classroomSnapshotId);
  assert.equal(candidate.sessionPackageId, null);
});

test("同一子课时不同班级拥有独立不可覆盖的课堂记录包", () => {
  const packages = workset.sessionPackages.filter((item) => item.lessonId === "lesson-color-gradient");
  assert.equal(packages.length, 4);
  assert.equal(new Set(packages.map((item) => item.classId)).size, 4);
  assert.equal(new Set(packages.map((item) => item.actualRecordRef.recordRefId)).size, 4);
  assert.ok(packages.every((item) => /^[a-f0-9]{64}$/i.test(item.snapshotHash)));
});

test("研究候选验证对象名称、唯一课堂包、证据归属和匿名确认", () => {
  const packageItem = workset.sessionPackages[0];
  const base = { researchReferenceId: "research-ref:test", objectName: "跨班示范差异", researchQuestion: "哪些情境差异影响学生理解？", sessionPackageIds: [packageItem.sessionPackageId], evidenceRefs: [packageItem.evidenceRefs[0]], anonymized: true, teacherConfirmed: true, availableSessionPackages: workset.sessionPackages };
  const candidate = createResearchHandoffCandidate(base);
  assert.equal(candidate.status, "TEACHER_CONFIRMED_REFERENCE_ONLY");
  assert.equal(candidate.copiesOriginalRecords, false);
  assert.equal(candidate.destinationSurface, "RESEARCH_ROOM_HOLD");
  assert.throws(() => createResearchHandoffCandidate({ ...base, objectName: "" }), /OBJECT_NAME/);
  assert.throws(() => createResearchHandoffCandidate({ ...base, sessionPackageIds: [packageItem.sessionPackageId, packageItem.sessionPackageId] }), /MUST_BE_UNIQUE/);
  assert.throws(() => createResearchHandoffCandidate({ ...base, evidenceRefs: ["evidence:outside"] }), /OUTSIDE_SELECTED_PACKAGES/);
  assert.throws(() => createResearchHandoffCandidate({ ...base, anonymized: false }), /EXTRA_CONFIRMATION/);
});

test("研究候选保存后课堂包建立反向引用且不复制原记录", () => {
  const packageItem = workset.sessionPackages[1];
  const candidate = createResearchHandoffCandidate({ researchReferenceId: "research-ref:attach", objectName: "材料节奏", researchQuestion: "材料怎样影响节奏？", sessionPackageIds: [packageItem.sessionPackageId], evidenceRefs: [packageItem.evidenceRefs[0]], anonymized: true, teacherConfirmed: true, availableSessionPackages: workset.sessionPackages });
  const next = attachResearchCandidateToSessionPackages(workset.sessionPackages, candidate);
  assert.ok(next.find((item) => item.sessionPackageId === packageItem.sessionPackageId).researchReferenceIds.includes(candidate.researchReferenceId));
  assert.equal(next.find((item) => item.sessionPackageId === packageItem.sessionPackageId).actualRecordRef, packageItem.actualRecordRef);
});

test("controller真实保存研究候选并刷新后重置", () => {
  const state = initialWorkspace();
  const packageItem = state.sessionPackages[0];
  const candidate = createResearchHandoffCandidate({ researchReferenceId: "research-ref:controller", objectName: "课堂差异", researchQuestion: "差异是什么？", sessionPackageIds: [packageItem.sessionPackageId], evidenceRefs: [packageItem.evidenceRefs[0]], anonymized: true, teacherConfirmed: true, availableSessionPackages: state.sessionPackages });
  const saved = classroomWorkspaceReducer(state, { type: "ADD_RESEARCH_CANDIDATE", candidate });
  assert.ok(saved.researchHandoffCandidates.some((item) => item.researchReferenceId === candidate.researchReferenceId));
  assert.ok(saved.sessionPackages[0].researchReferenceIds.includes(candidate.researchReferenceId));
  assert.equal(initialWorkspace().researchHandoffCandidates.some((item) => item.researchReferenceId === candidate.researchReferenceId), false);
});

test("待整理和待决定课堂归档失败关闭", () => {
  const pending = workset.sessionPackages.find((item) => item.workflowStatus === "PENDING_TRIAGE");
  const decision = workset.sessionPackages.find((item) => item.workflowStatus === "NEEDS_TEACHER_DECISION");
  assert.equal(classroomArchiveGuard(pending).allowed, false);
  assert.equal(classroomArchiveGuard(decision).allowed, false);
  assert.throws(() => archiveClassroomSessionPackage(pending, { teacherConfirmed: true, reason: "测试", changedAt: workset.referenceNow }), /ARCHIVE_BLOCKED/);
});

test("恢复后当前状态回到ACTIVE并记录RESTORED转换", () => {
  const complete = workset.sessionPackages.find((item) => item.workflowStatus === "COMPLETE" && item.archiveState.status === "ACTIVE");
  const archived = archiveClassroomSessionPackage(complete, { teacherConfirmed: true, reason: "教师确认", changedAt: workset.referenceNow });
  const restored = restoreClassroomSessionPackage(archived, { teacherConfirmed: true, changedAt: workset.referenceNow });
  assert.equal(restored.archiveState.status, "ACTIVE");
  assert.equal(restored.archiveState.lastTransition, "RESTORED");
  assert.equal(restored.actualRecordRef, complete.actualRecordRef);
});

test("课时层级归档计划统计阻断项并允许显式部分归档", () => {
  const plan = createHierarchyArchivePlan({ scope: "LESSON", scopeId: "lesson-color-gradient", sessionPackages: workset.sessionPackages });
  assert.ok(plan.archivableCount > 0);
  assert.ok(plan.blockedCount > 0);
  assert.equal(plan.partialArchiveRequired, true);
  const next = applyHierarchyArchivePlan(workset.sessionPackages, plan, { teacherConfirmed: true, changedAt: workset.referenceNow });
  assert.equal(next.filter((item) => plan.eligibleSessionPackageIds.includes(item.sessionPackageId)).every((item) => item.archiveState.status === "ARCHIVED"), true);
  assert.equal(next.filter((item) => plan.blockedSessionPackageIds.includes(item.sessionPackageId)).every((item) => item.archiveState.status === "ACTIVE"), true);
});

test("大单元层级归档与恢复保持课堂事实和研究引用", () => {
  const plan = createHierarchyArchivePlan({ scope: "UNIT", scopeId: "unit-colorful-world", sessionPackages: workset.sessionPackages });
  const archived = applyHierarchyArchivePlan(workset.sessionPackages, plan, { teacherConfirmed: true, changedAt: workset.referenceNow });
  const restored = restoreHierarchyArchiveScope(archived, { scope: "UNIT", scopeId: "unit-colorful-world", teacherConfirmed: true, changedAt: workset.referenceNow });
  assert.ok(restored.every((item) => item.archiveState.status === "ACTIVE"));
  assert.deepEqual(restored.map((item) => item.actualRecordRef), workset.sessionPackages.map((item) => item.actualRecordRef));
  assert.deepEqual(restored.map((item) => item.researchReferenceIds), workset.sessionPackages.map((item) => item.researchReferenceIds));
});

test("controller默认教师密度：学期、层级、研究抽屉均折叠", () => {
  const state = initialWorkspace();
  assert.equal(state.preparationSectionExpanded.today, true);
  assert.equal(state.preparationSectionExpanded.week, false);
  assert.equal(state.preparationSectionExpanded.recent, true);
  assert.equal(state.preparationSectionExpanded.semester, false);
  assert.equal(state.recordHierarchyExpanded, false);
  assert.equal(state.researchDrawerOpen, false);
});

test("controller支持搜索筛选、置顶常用、复用和批量课堂包替换", () => {
  let state = initialWorkspace();
  state = classroomWorkspaceReducer(state, { type: "SET", key: "preparationSearchQuery", value: "渐变" });
  state = classroomWorkspaceReducer(state, { type: "TOGGLE_STRING_SET", key: "pinnedLessonIds", value: "lesson-gradient-rhythm" });
  const replacement = { ...state.sessionPackages[0], teacherDecision: "测试替换" };
  state = classroomWorkspaceReducer(state, { type: "REPLACE_SESSION_PACKAGES", sessionPackages: [replacement, ...state.sessionPackages.slice(1)] });
  assert.equal(state.preparationSearchQuery, "渐变");
  assert.ok(state.pinnedLessonIds.includes("lesson-gradient-rhythm"));
  assert.equal(state.sessionPackages[0].teacherDecision, "测试替换");
});

test("M2.1继续使用原classroom页面且不新增研究室页面或真实副作用", async () => {
  const surface = await read("app/shell-v1/classroom/classroom-surface.tsx");
  const panel = await read("app/shell-v1/classroom/components/semester-classroom-workset-panels.tsx");
  const page = await read("app/shell-v1/page.tsx");
  assert.ok(surface.includes("SemesterClassroomPreparationPanel"));
  assert.ok(surface.includes("SemesterClassroomRecordPanel"));
  assert.ok(page.includes("ClassroomSurface"));
  assert.ok(panel.includes("研究室 HOLD"));
  for (const forbidden of ["router.push", "fetch(", "WebSocket", "localStorage", "indexedDB"]) assert.ok(!panel.includes(forbidden));
});
