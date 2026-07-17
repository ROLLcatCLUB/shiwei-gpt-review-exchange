import type {
  ClassroomActualRecordRef,
  ClassroomArchiveState,
  ClassroomScheduleInstance,
  ClassroomSessionPackage,
  LessonAcrossClassesSummary,
  LessonClassroomWorkset,
  ResearchHandoffCandidate,
  SemesterClassroomWorkset,
} from "../../../domain/classroom-workset/semester-classroom-workset.ts";

const unitId = "unit-colorful-world";

const lessonDefinitions = Object.freeze([
  { lessonId: "lesson-color-gradient", lessonTitle: "色彩的渐变", lessonOrder: 1 },
  { lessonId: "lesson-gradient-rhythm", lessonTitle: "渐变的节奏", lessonOrder: 2 },
  { lessonId: "lesson-colorful-life", lessonTitle: "多彩的生活", lessonOrder: 3 },
]);

const classes = Object.freeze([
  { classId: "grade3-class1", classLabel: "三（1）班" },
  { classId: "grade3-class2", classLabel: "三（2）班" },
  { classId: "grade3-class3", classLabel: "三（3）班" },
  { classId: "grade3-class4", classLabel: "三（4）班" },
  { classId: "grade3-class5", classLabel: "三（5）班" },
]);

function activeArchiveState(): ClassroomArchiveState {
  return Object.freeze({
    status: "ACTIVE",
    lastTransition: null,
    teacherConfirmed: false,
    changedAt: null,
  });
}

function actualRecord(
  packageId: string,
  duration: number,
  quickNote: string,
): ClassroomActualRecordRef {
  return Object.freeze({
    recordRefId: `actual-record:${packageId}`,
    recordUri: `fixture://classroom-actual-record/${packageId}`,
    actualDurationMinutes: duration,
    actualFlow: Object.freeze([
      { episodeId: "E01", title: "观察与比较", actualMinutes: 8 },
      { episodeId: "E04", title: "教师示范", actualMinutes: Math.max(6, duration - 24) },
      { episodeId: "E05", title: "学生实践", actualMinutes: 12 },
      { episodeId: "E06", title: "展示评价", actualMinutes: 4 },
    ]),
    quickNotes: Object.freeze([
      { noteId: `note:${packageId}`, bindingId: "BIND-E04-S06", summary: quickNote },
    ]),
    studentResponseSummary: "只保留匿名聚合：多数学生能够指出连续变化，个别学生需要比较中间色。",
  });
}

function sessionPackage(input: {
  lessonId: string;
  classId: string;
  classLabel: string;
  taughtAt: string;
  scheduleId: string;
  workflowStatus: ClassroomSessionPackage["workflowStatus"];
  revision: string;
  hashCharacter: string;
  duration: number;
  quickNote: string;
  teacherJudgment: string | null;
  teacherDecision: string | null;
  nextClassDecision: string | null;
  researchReferenceIds?: readonly string[];
  archived?: boolean;
}): ClassroomSessionPackage {
  const sessionPackageId = `session-package:${input.lessonId}:${input.classId}:${input.taughtAt.slice(0, 10)}`;
  return Object.freeze({
    sessionPackageId,
    unitId,
    lessonId: input.lessonId,
    classId: input.classId,
    classLabel: input.classLabel,
    scheduledInstanceId: input.scheduleId,
    lessonRevisionId: input.revision,
    classroomSnapshotId: `snapshot:${input.revision}:${input.classId}:${input.taughtAt.slice(0, 10)}`,
    snapshotHash: input.hashCharacter.repeat(64),
    actualRecordRef: actualRecord(sessionPackageId, input.duration, input.quickNote),
    evidenceRefs: Object.freeze([
      `evidence:${sessionPackageId}:demo-timing`,
      `evidence:${sessionPackageId}:anonymous-response-summary`,
    ]),
    teacherReflectionRef:
      input.workflowStatus === "COMPLETE" ? `reflection:${sessionPackageId}` : null,
    researchReferenceIds: Object.freeze([...(input.researchReferenceIds || [])]),
    archiveState: input.archived
      ? Object.freeze({
          status: "ARCHIVED" as const,
          lastTransition: "ARCHIVED" as const,
          teacherConfirmed: true,
          reason: "本学期当前工作面暂不需要继续操作",
          changedAt: "2026-05-10T18:20:00+08:00",
        })
      : activeArchiveState(),
    workflowStatus: input.workflowStatus,
    taughtAt: input.taughtAt,
    teacherJudgment: input.teacherJudgment,
    teacherDecision: input.teacherDecision,
    nextClassDecision: input.nextClassDecision,
    unresolvedRecommendation: input.workflowStatus === "NEEDS_TEACHER_DECISION",
    incompleteClassroomRecord: input.workflowStatus === "PENDING_TRIAGE",
  });
}

const scheduleInstances: readonly ClassroomScheduleInstance[] = Object.freeze([
  {
    scheduledInstanceId: "schedule:gradient:g3c5:2026-05-11",
    unitId,
    lessonId: "lesson-color-gradient",
    classId: "grade3-class5",
    classLabel: "三（5）班",
    scheduledAt: "2026-05-11T14:10:00+08:00",
    scheduleLabel: "05/11 周一 · 第6节 · 14:10—14:50",
    readiness: "READY",
    priority: "NEXT",
    anomalySummary: "上一班已确认材料准备提醒",
    sessionPackageId: null,
  },
  {
    scheduledInstanceId: "schedule:rhythm:g3c1:2026-05-11",
    unitId,
    lessonId: "lesson-gradient-rhythm",
    classId: "grade3-class1",
    classLabel: "三（1）班",
    scheduledAt: "2026-05-11T15:00:00+08:00",
    scheduleLabel: "05/11 周一 · 第7节 · 15:00—15:40",
    readiness: "NEEDS_PREPARATION",
    priority: "TODAY",
    anomalySummary: "封面与节奏示例仍待确认",
    sessionPackageId: null,
  },
  {
    scheduledInstanceId: "schedule:life:g3c4:2026-05-11",
    unitId,
    lessonId: "lesson-colorful-life",
    classId: "grade3-class4",
    classLabel: "三（4）班",
    scheduledAt: "2026-05-11T10:20:00+08:00",
    scheduleLabel: "05/11 周一 · 第3节 · 10:20—11:00",
    readiness: "COMPLETE",
    priority: "TODAY",
    sessionPackageId: "session-package:lesson-colorful-life:grade3-class4:2026-05-11",
  },
  {
    scheduledInstanceId: "schedule:gradient:g3c2:2026-05-13",
    unitId,
    lessonId: "lesson-color-gradient",
    classId: "grade3-class2",
    classLabel: "三（2）班",
    scheduledAt: "2026-05-13T09:30:00+08:00",
    scheduleLabel: "05/13 周三 · 第2节 · 09:30—10:10",
    readiness: "READY",
    priority: "WEEK",
    sessionPackageId: null,
  },
  {
    scheduledInstanceId: "schedule:rhythm:g3c3:2026-05-14",
    unitId,
    lessonId: "lesson-gradient-rhythm",
    classId: "grade3-class3",
    classLabel: "三（3）班",
    scheduledAt: "2026-05-14T13:20:00+08:00",
    scheduleLabel: "05/14 周四 · 第5节 · 13:20—14:00",
    readiness: "NEEDS_PREPARATION",
    priority: "WEEK",
    anomalySummary: "课堂节奏卡仍待教师确认",
    sessionPackageId: null,
  },
  {
    scheduledInstanceId: "schedule:life:g3c5:2026-05-15",
    unitId,
    lessonId: "lesson-colorful-life",
    classId: "grade3-class5",
    classLabel: "三（5）班",
    scheduledAt: "2026-05-15T10:20:00+08:00",
    scheduleLabel: "05/15 周五 · 第3节 · 10:20—11:00",
    readiness: "READY",
    priority: "WEEK",
    sessionPackageId: null,
  },
  ...classes.slice(0, 4).map((item, index) => ({
    scheduledInstanceId: `schedule:gradient:${item.classId}:2026-05-${String(5 + index).padStart(2, "0")}`,
    unitId,
    lessonId: "lesson-color-gradient",
    classId: item.classId,
    classLabel: item.classLabel,
    scheduledAt: `2026-05-${String(5 + index).padStart(2, "0")}T14:10:00+08:00`,
    scheduleLabel: `05/${String(5 + index).padStart(2, "0")} · 第6节 · 14:10—14:50`,
    readiness: "COMPLETE" as const,
    priority: "RECENT_COMPLETE" as const,
    sessionPackageId: `session-package:lesson-color-gradient:${item.classId}:2026-05-${String(5 + index).padStart(2, "0")}`,
  })),
  {
    scheduledInstanceId: "schedule:rhythm:grade3-class2:2026-05-09",
    unitId,
    lessonId: "lesson-gradient-rhythm",
    classId: "grade3-class2",
    classLabel: "三（2）班",
    scheduledAt: "2026-05-09T09:30:00+08:00",
    scheduleLabel: "05/09 周六 · 第2节 · 09:30—10:10",
    readiness: "COMPLETE",
    priority: "RECENT_COMPLETE",
    sessionPackageId: "session-package:lesson-gradient-rhythm:grade3-class2:2026-05-09",
  },
  {
    scheduledInstanceId: "schedule:life:grade3-class4:2026-05-10",
    unitId,
    lessonId: "lesson-colorful-life",
    classId: "grade3-class4",
    classLabel: "三（4）班",
    scheduledAt: "2026-05-10T13:20:00+08:00",
    scheduleLabel: "05/10 周日 · 第5节 · 13:20—14:00",
    readiness: "COMPLETE",
    priority: "RECENT_COMPLETE",
    sessionPackageId: "session-package:lesson-colorful-life:grade3-class4:2026-05-10",
  },
]);

const gradientPackages: readonly ClassroomSessionPackage[] = Object.freeze([
  sessionPackage({ lessonId: "lesson-color-gradient", classId: "grade3-class1", classLabel: "三（1）班", taughtAt: "2026-05-05T14:10:00+08:00", scheduleId: "schedule:gradient:grade3-class1:2026-05-05", workflowStatus: "COMPLETE", revision: "lesson-revision:gradient:v0.5-p1", hashCharacter: "a", duration: 40, quickNote: "中间色对比画面有效。", teacherJudgment: "学生看懂关键一步", teacherDecision: "下一班继续使用对比画面", nextClassDecision: "NEXT_CLASS_TRIAL", researchReferenceIds: ["research-ref:gradient-across-classes"] }),
  sessionPackage({ lessonId: "lesson-color-gradient", classId: "grade3-class2", classLabel: "三（2）班", taughtAt: "2026-05-06T14:10:00+08:00", scheduleId: "schedule:gradient:grade3-class2:2026-05-06", workflowStatus: "PENDING_TRIAGE", revision: "lesson-revision:gradient:v0.5-p1", hashCharacter: "b", duration: 45, quickNote: "材料分装影响了开始时间。", teacherJudgment: null, teacherDecision: null, nextClassDecision: null }),
  sessionPackage({ lessonId: "lesson-color-gradient", classId: "grade3-class3", classLabel: "三（3）班", taughtAt: "2026-05-07T14:10:00+08:00", scheduleId: "schedule:gradient:grade3-class3:2026-05-07", workflowStatus: "NEEDS_TEACHER_DECISION", revision: "lesson-revision:gradient:v0.5-p2", hashCharacter: "c", duration: 43, quickNote: "示范多用3分钟，等待教师判断。", teacherJudgment: "材料操作拖慢了节奏", teacherDecision: null, nextClassDecision: null }),
  sessionPackage({ lessonId: "lesson-color-gradient", classId: "grade3-class4", classLabel: "三（4）班", taughtAt: "2026-05-08T14:10:00+08:00", scheduleId: "schedule:gradient:grade3-class4:2026-05-08", workflowStatus: "COMPLETE", revision: "lesson-revision:gradient:v0.5-p2", hashCharacter: "d", duration: 39, quickNote: "这里有效：学生能主动比较中间色。", teacherJudgment: "这不是问题", teacherDecision: "仅记录", nextClassDecision: "KEEP_ORIGINAL", archived: true }),
]);

const additionalPackages: readonly ClassroomSessionPackage[] = Object.freeze([
  sessionPackage({ lessonId: "lesson-gradient-rhythm", classId: "grade3-class2", classLabel: "三（2）班", taughtAt: "2026-05-09T09:30:00+08:00", scheduleId: "schedule:rhythm:grade3-class2:2026-05-09", workflowStatus: "COMPLETE", revision: "lesson-revision:rhythm:v0.2", hashCharacter: "e", duration: 40, quickNote: "节奏卡片帮助学生安排色带。", teacherJudgment: "任务节奏清楚", teacherDecision: "保留当前版本", nextClassDecision: "KEEP_ORIGINAL" }),
  sessionPackage({ lessonId: "lesson-colorful-life", classId: "grade3-class4", classLabel: "三（4）班", taughtAt: "2026-05-10T13:20:00+08:00", scheduleId: "schedule:life:grade3-class4:2026-05-10", workflowStatus: "COMPLETE", revision: "lesson-revision:life:v0.1", hashCharacter: "f", duration: 41, quickNote: "生活色彩分类引发了临时拓展。", teacherJudgment: "我临时做了拓展", teacherDecision: "仅记录本次拓展", nextClassDecision: "RECORD_ONLY" }),
  sessionPackage({ lessonId: "lesson-colorful-life", classId: "grade3-class4", classLabel: "三（4）班", taughtAt: "2026-05-11T10:20:00+08:00", scheduleId: "schedule:life:g3c4:2026-05-11", workflowStatus: "PENDING_TRIAGE", revision: "lesson-revision:life:v0.1", hashCharacter: "1", duration: 42, quickNote: "学生作品分类尚待教师确认。", teacherJudgment: null, teacherDecision: null, nextClassDecision: null }),
]);

const sessionPackages = Object.freeze([...gradientPackages, ...additionalPackages]);

const acrossSummary: LessonAcrossClassesSummary = Object.freeze({
  summaryId: "across-summary:lesson-color-gradient",
  unitId,
  lessonId: "lesson-color-gradient",
  sourceSessionPackageIds: Object.freeze(gradientPackages.map((item) => item.sessionPackageId)),
  commonDifficulties: Object.freeze(["学生容易直接跳过中间色", "材料准备会显著影响示范节奏"]),
  classDifferences: Object.freeze(gradientPackages.map((item) => ({
    classId: item.classId,
    classLabel: item.classLabel,
    summary: item.teacherJudgment || "仍待教师补充现实判断",
  }))),
  versionChanges: Object.freeze(["三（3）班起使用 v0.5-p2，对比画面提前到示范前"]),
  teacherStrategyAdjustments: Object.freeze(["先比较缺少中间色与加入中间色", "材料分装与清水检查提前完成"]),
  classDurations: Object.freeze(gradientPackages.map((item) => ({ classId: item.classId, minutes: item.actualRecordRef.actualDurationMinutes }))),
  representativeEvidenceRefs: Object.freeze(gradientPackages.flatMap((item) => item.evidenceRefs.slice(0, 1))),
  derivedOnly: true,
});

const researchCandidate: ResearchHandoffCandidate = Object.freeze({
  researchReferenceId: "research-ref:gradient-across-classes",
  objectName: "中间色示范的跨班课堂差异",
  researchQuestion: "对比画面与材料准备分别怎样影响三年级学生理解中间色？",
  sessionPackageIds: Object.freeze([gradientPackages[0].sessionPackageId, gradientPackages[2].sessionPackageId]),
  evidenceRefs: Object.freeze([gradientPackages[0].evidenceRefs[0], gradientPackages[2].evidenceRefs[0]]),
  anonymized: true,
  status: "DRAFT_REFERENCE_ONLY",
  copiesOriginalRecords: false,
  destinationSurface: "RESEARCH_ROOM_HOLD",
});

const lessonWorksets: readonly LessonClassroomWorkset[] = Object.freeze(
  lessonDefinitions.map((lesson) => ({
    ...lesson,
    unitId,
    scheduleInstanceIds: Object.freeze(scheduleInstances.filter((item) => item.lessonId === lesson.lessonId).map((item) => item.scheduledInstanceId)),
    sessionPackageIds: Object.freeze(sessionPackages.filter((item) => item.lessonId === lesson.lessonId).map((item) => item.sessionPackageId)),
    acrossClassesSummaryId: lesson.lessonId === "lesson-color-gradient" ? acrossSummary.summaryId : null,
    pinned: lesson.lessonId === "lesson-color-gradient",
    frequentlyUsed: lesson.lessonId !== "lesson-colorful-life",
  })),
);

export const colorfulWorldSemesterClassroomWorkset: SemesterClassroomWorkset = Object.freeze({
  worksetId: "semester-workset:2025-2026-2:grade3-art",
  semesterId: "term-2025-2026-2",
  semesterLabel: "2025—2026学年第二学期",
  referenceNow: "2026-05-11T13:45:00+08:00",
  unitOrder: Object.freeze([unitId]),
  units: Object.freeze([{ unitId, unitTitle: "多彩的世界", gradeLabel: "三年级", lessonIds: Object.freeze(lessonDefinitions.map((item) => item.lessonId)) }]),
  lessons: lessonWorksets,
  scheduleInstances,
  sessionPackages,
  acrossClassesSummaries: Object.freeze([acrossSummary]),
  researchHandoffCandidates: Object.freeze([researchCandidate]),
  runtimeEffect: "NONE_FIXTURE_ONLY",
  persistence: "MEMORY_RESET_ON_REFRESH",
});

export const colorfulWorldLessonDefinitions = lessonDefinitions;
