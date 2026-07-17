import { readFileSync, writeFileSync } from "node:fs";
import {
  applyHierarchyArchivePlan,
  attachResearchCandidateToSessionPackages,
  createFixtureScheduleReuseCandidate,
  createHierarchyArchivePlan,
  createResearchHandoffCandidate,
  deriveClassroomWorksetPriorities,
  restoreHierarchyArchiveScope,
  validateSemesterClassroomWorkset,
} from "../domain/classroom-workset/semester-classroom-workset.ts";
import { colorfulWorldSemesterClassroomWorkset as workset } from "../app/shell-v1/classroom/semester-classroom-workset-fixture.ts";
import { classroomWorkspaceReducer, createInitialClassroomWorkspaceState } from "../app/shell-v1/classroom/classroom-workspace-state.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const checks = [];
const check = (label, condition) => checks.push({ label, condition: Boolean(condition) });
const source = {
  domain: read("domain/classroom-workset/semester-classroom-workset.ts"),
  fixture: read("app/shell-v1/classroom/semester-classroom-workset-fixture.ts"),
  controller: read("app/shell-v1/classroom/use-classroom-workspace-controller.ts"),
  state: read("app/shell-v1/classroom/classroom-workspace-state.ts"),
  panels: read("app/shell-v1/classroom/components/semester-classroom-workset-panels.tsx"),
  surface: read("app/shell-v1/classroom/classroom-surface.tsx"),
  css: read("app/shell-v1/classroom/classroom.css"),
  page: read("app/shell-v1/page.tsx"),
  hosts: read("app/shell-v1/classroom/hosts/classroom-component-hosts.tsx"),
};

check("工作集结构校验通过", validateSemesterClassroomWorkset(workset).length === 0);
check("fixture-only运行边界", workset.runtimeEffect === "NONE_FIXTURE_ONLY");
check("刷新后内存重置", workset.persistence === "MEMORY_RESET_ON_REFRESH");
check("大单元子课时层级完整", workset.units.length === 1 && workset.lessons.length === 3);
check("课堂记录包不少于七个", workset.sessionPackages.length >= 7);
check("课堂记录包ID唯一", new Set(workset.sessionPackages.map((item) => item.sessionPackageId)).size === workset.sessionPackages.length);

const derived = deriveClassroomWorksetPriorities(workset.scheduleInstances, { referenceNow: workset.referenceNow });
check("优先级由确定性函数派生", source.panels.includes("deriveClassroomWorksetPriorities"));
check("下一节课唯一", derived.filter((item) => item.priority === "NEXT").length === 1);
check("今天课程存在", derived.some((item) => item.priority === "TODAY"));
check("本周课程存在", derived.some((item) => item.priority === "WEEK"));
check("最近完成存在", derived.some((item) => item.priority === "RECENT_COMPLETE"));
check("空课表安全", deriveClassroomWorksetPriorities([], { referenceNow: workset.referenceNow }).length === 0);

const sourcePackage = workset.sessionPackages[0];
const reuse = createFixtureScheduleReuseCandidate({ lessonId: sourcePackage.lessonId, unitId: sourcePackage.unitId, classId: "grade3-class5", classLabel: "三（5）班", scheduledAt: "2026-05-18T14:10:00+08:00", sourceLessonRevisionId: sourcePackage.lessonRevisionId, sourceClassroomSnapshotId: sourcePackage.classroomSnapshotId, existingSchedules: workset.scheduleInstances, referenceNow: workset.referenceNow });
check("复用课次为fixture候选", reuse.origin === "TEACHER_REUSE_CANDIDATE" && reuse.sessionPackageId === null);
check("复用引用源版本", reuse.sourceLessonRevisionId === sourcePackage.lessonRevisionId);
check("复用引用源快照", reuse.sourceClassroomSnapshotId === sourcePackage.classroomSnapshotId);

const research = createResearchHandoffCandidate({ researchReferenceId: "research-ref:validator", objectName: "验证候选", researchQuestion: "课堂差异是什么？", sessionPackageIds: [sourcePackage.sessionPackageId], evidenceRefs: [sourcePackage.evidenceRefs[0]], anonymized: true, teacherConfirmed: true, availableSessionPackages: workset.sessionPackages });
const researchPackages = attachResearchCandidateToSessionPackages(workset.sessionPackages, research);
check("研究候选只保存引用", research.copiesOriginalRecords === false && research.destinationSurface === "RESEARCH_ROOM_HOLD");
check("研究候选反向写入课堂包引用", researchPackages[0].researchReferenceIds.includes(research.researchReferenceId));
check("研究对象名称校验存在", source.domain.includes("RESEARCH_REFERENCE_REQUIRES_OBJECT_NAME"));
check("课堂包唯一校验存在", source.domain.includes("RESEARCH_SESSION_PACKAGE_IDS_MUST_BE_UNIQUE"));
check("证据归属校验存在", source.domain.includes("RESEARCH_EVIDENCE_OUTSIDE_SELECTED_PACKAGES"));
check("非匿名额外确认存在", source.domain.includes("NON_ANONYMIZED_REFERENCE_REQUIRES_EXTRA_CONFIRMATION"));

const lessonPlan = createHierarchyArchivePlan({ scope: "LESSON", scopeId: "lesson-color-gradient", sessionPackages: workset.sessionPackages });
const lessonArchived = applyHierarchyArchivePlan(workset.sessionPackages, lessonPlan, { teacherConfirmed: true, changedAt: workset.referenceNow });
const unitRestored = restoreHierarchyArchiveScope(lessonArchived, { scope: "UNIT", scopeId: "unit-colorful-world", teacherConfirmed: true, changedAt: workset.referenceNow });
check("课时归档计划统计阻断", lessonPlan.archivableCount > 0 && lessonPlan.blockedCount > 0 && lessonPlan.partialArchiveRequired);
check("部分归档保护待处理课堂", lessonArchived.filter((item) => lessonPlan.blockedSessionPackageIds.includes(item.sessionPackageId)).every((item) => item.archiveState.status === "ACTIVE"));
check("恢复后当前状态为ACTIVE", unitRestored.every((item) => item.archiveState.status === "ACTIVE"));
check("恢复转换单独记录", unitRestored.some((item) => item.archiveState.lastTransition === "RESTORED"));

let state = createInitialClassroomWorkspaceState({ selectedCandidateId: "candidate", elapsedSeconds: 0, materialItems: [], sessionPackages: workset.sessionPackages, scheduleInstances: workset.scheduleInstances, researchHandoffCandidates: workset.researchHandoffCandidates });
check("今天默认展开", state.preparationSectionExpanded.today);
check("本周默认折叠", !state.preparationSectionExpanded.week);
check("最近完成默认展开", state.preparationSectionExpanded.recent);
check("学期课架默认折叠", !state.preparationSectionExpanded.semester);
check("记录层级默认折叠", !state.recordHierarchyExpanded);
check("研究抽屉默认关闭", !state.researchDrawerOpen);
state = classroomWorkspaceReducer(state, { type: "ADD_RESEARCH_CANDIDATE", candidate: research });
check("研究候选进入controller状态", state.researchHandoffCandidates.some((item) => item.researchReferenceId === research.researchReferenceId));
check("研究候选保存后抽屉关闭", !state.researchDrawerOpen);

for (const label of ["下一节课", "今天的课", "本周课程", "最近完成", "本学期课架"]) check(`课前区域:${label}`, source.panels.includes(label));
check("无下一节课空状态", source.panels.includes("当前没有下一节课"));
check("课前搜索存在", source.panels.includes("查找课次"));
check("课前筛选存在", source.panels.includes("课前准备筛选"));
check("置顶常用形成轻量工作区", source.panels.includes("置顶与常用") && source.panels.includes("highlightedLessons"));
check("课前预览存在", source.panels.includes("课前预览"));
check("开始课堂进入现有M1", source.surface.includes("startSemesterWorksetLesson") && source.panels.includes("开始课堂"));
check("M2班级身份映射到现有M1候选", source.surface.includes("item.classLabel === scheduledInstance.classLabel"));
check("复用动作存在", source.panels.includes("复用到新课次") && source.panels.includes("createFixtureScheduleReuseCandidate"));
check("记录搜索存在", source.panels.includes("查找课堂记录"));
check("记录组合筛选存在", ["大单元", "处理状态", "归档状态"].every((label) => source.panels.includes(label)));
check("筛选清除存在", source.panels.includes("清除"));
check("记录默认待处理优先", source.panels.includes("待处理优先") && source.state.includes('recordPriorityFilter: "PRIORITY"'));
check("技术详情默认折叠", source.panels.includes("sv1-m2-technical-details") && source.panels.includes("查看版本与引用详情"));
check("完整日志默认折叠", source.panels.includes("<details><summary>展开完整日志</summary>"));
check("无教师质量评分", source.panels.includes("不形成质量评分"));
check("跨班汇总不覆盖单班事实", source.panels.includes("不覆盖任何单班事实"));
check("研究抽屉按需出现", source.panels.includes("ResearchDrawer") && source.panels.includes("researchDrawerOpen"));
check("研究候选可查看编辑取消", ["查看/编辑", "取消", "教师确认并保存候选"].every((label) => source.panels.includes(label)));
check("研究室仍HOLD", source.panels.includes("研究室 HOLD"));
check("课时和大单元归档入口", ["软归档课时", "恢复课时", "软归档可处理课堂", "恢复大单元"].every((label) => source.panels.includes(label)));
check("部分归档语义明确", source.panels.includes("本次只归档可归档课堂"));
check("M1六类宿主仍保留", ["ClassroomStageHost", "ClassroomSidecarHost", "ClassroomOverlayHost", "ClassroomDockHost", "StudentDisplayHost", "GlobalAgentInputHost"].every((item) => `${source.surface}\n${source.hosts}`.includes(item)));
check("M1统一fixture适配器仍保留", source.surface.includes("createClassroomWebFixtureAdapter"));
check("M2.1研究抽屉样式存在", source.css.includes(".sv1-m2-research-drawer"));
check("M2.1筛选抽屉样式存在", source.css.includes(".sv1-m2-filter-drawer"));
check("1366布局规则存在", source.css.includes("@media (max-width: 1439px)"));
check("1920布局规则存在", source.css.includes("@media (min-width: 1700px)"));

const allM2Source = `${source.domain}\n${source.fixture}\n${source.state}\n${source.controller}\n${source.panels}`;
for (const forbidden of ["WebSocket", "EventSource", "fetch(", "navigator.mediaDevices", "localStorage", "indexedDB"]) check(`禁止运行时依赖:${forbidden}`, !allM2Source.includes(forbidden));
check("未新增研究室路由", !source.panels.includes('href="/research') && !source.panels.includes("router.push"));
check("三项一级信息架构不变", ["课前准备", "当前课堂", "课堂记录"].every((label) => source.surface.includes(label)));

const passed = checks.filter((item) => item.condition).length;
for (const item of checks) console[item.condition ? "log" : "error"](`${item.condition ? "PASS" : "FAIL"} ${item.label}`);
const report = {
  task: "CLASSROOM_M2_1_PRODUCT_SEMANTICS_RESEARCH_REFERENCE_STATE_HIERARCHICAL_ARCHIVE_AND_TEACHER_DENSITY_CLOSURE",
  checkedAt: new Date().toISOString(),
  result: passed === checks.length ? "PASS" : "FAIL",
  passed,
  total: checks.length,
  checks,
  boundaries: { realSession: "HOLD", database: "HOLD", model: "HOLD", researchRoomPage: "HOLD", formalWriteback: "HOLD" },
};
writeFileSync(new URL("CLASSROOM_M2_SEMESTER_WORKSET_VALIDATION_REPORT.json", root), `${JSON.stringify(report, null, 2)}\n`);
console.log(`CLASSROOM_M2_1_VALIDATOR = ${passed}/${checks.length} ${passed === checks.length ? "PASS" : "FAIL"}`);
if (passed !== checks.length) process.exitCode = 1;
