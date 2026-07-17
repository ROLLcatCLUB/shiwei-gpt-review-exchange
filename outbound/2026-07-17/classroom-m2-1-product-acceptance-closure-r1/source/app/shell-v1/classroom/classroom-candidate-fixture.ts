import { teacherScheduleOccurrences } from "../user-center/user-center-fixture.ts";
import type {
  ClassroomCandidate,
  ClassroomLessonPackageDirectory,
  ClassroomPreviewClock,
  PrepRoomClassroomMapping,
} from "./classroom-contracts.ts";
import { colorGradientClassroomPackage } from "./classroom-preview-fixture.ts";
import { colorGradientVisualAssets } from "./classroom-visual-fixture.ts";

export const classroomPreviewClock: ClassroomPreviewClock = {
  referenceNow: "2026-05-11T13:55:00+08:00",
  referenceDayId: "mon",
  referencePeriodId: "p5",
  timezone: "Asia/Shanghai",
};

const dayLabels: Record<string, string> = {
  mon: "周一",
  tue: "周二",
  wed: "周三",
  thu: "周四",
  fri: "周五",
};

const periodLabels: Record<string, string> = {
  p3: "第3节",
  p5: "第5节",
  p6: "第6节",
  p7: "第7节",
};

function scheduleOccurrence(classId: string, dayId: string, periodId: string) {
  const occurrence = teacherScheduleOccurrences.find(
    (item) =>
      item.classId === classId &&
      item.dayId === dayId &&
      item.periodId === periodId,
  );
  if (!occurrence)
    throw new Error(
      `Missing controlled occurrence: ${classId}/${dayId}/${periodId}`,
    );
  return occurrence;
}

function mapping(input: {
  candidateKey: string;
  prepLessonId: string;
  assignmentId: string;
  classId: string;
  dayId: string;
  periodId: string;
  scheduledDate: string;
  unitId: string;
  unitTitle: string;
  plannedWeek: number;
  scheduledWeek: number;
}) {
  const occurrence = scheduleOccurrence(
    input.classId,
    input.dayId,
    input.periodId,
  );
  const semesterPlan: PrepRoomClassroomMapping["semesterPlan"] = {
    semesterPlanItemId: `semester-plan:${input.assignmentId}:week-${input.plannedWeek}:${input.unitId}:${input.prepLessonId}`,
    unitId: input.unitId,
    unitTitle: input.unitTitle,
    lessonId: input.prepLessonId,
    plannedWeek: input.plannedWeek,
    scheduledWeek: input.scheduledWeek,
    relation:
      input.scheduledWeek === input.plannedWeek
        ? "ON_PLAN"
        : input.scheduledWeek > input.plannedWeek
          ? "BEHIND_PLAN"
          : "AHEAD_OF_PLAN",
  };
  return {
    mappingId: `prep-classroom-map:${input.candidateKey}`,
    prepLessonId: input.prepLessonId,
    assignmentId: input.assignmentId,
    classId: input.classId,
    scheduleOccurrenceId: occurrence.occurrenceId,
    scheduledDate: input.scheduledDate,
    semesterPlan,
    source: "PREP_ROOM_LESSON_MAPPING",
  } satisfies PrepRoomClassroomMapping;
}

function candidateBase(input: {
  candidateKey: string;
  gradeId: "grade3" | "grade4";
  gradeLabel: string;
  assignmentId: string;
  classId: string;
  classLabel: string;
  dayId: string;
  periodId: string;
  scheduledDate: string;
  catalogState: "IN_PROGRESS" | "UPCOMING" | "TAUGHT";
  lessonTitle: string;
  prepLessonId: string;
  prepStatus: string;
  unitId: string;
  unitTitle: string;
  plannedWeek: number;
  scheduledWeek: number;
}) {
  const prepRoomMapping = mapping(input);
  const occurrence = scheduleOccurrence(
    input.classId,
    input.dayId,
    input.periodId,
  );
  return {
    candidateId: `candidate:${input.candidateKey}`,
    occurrenceId: occurrence.occurrenceId,
    assignmentId: input.assignmentId,
    classId: input.classId,
    gradeId: input.gradeId,
    gradeLabel: input.gradeLabel,
    lessonTitle: input.lessonTitle,
    classLabel: input.classLabel,
    scheduleLabel: `${input.scheduledDate.slice(5).replace("-", "/")} ${dayLabels[input.dayId]} · ${periodLabels[input.periodId]} · ${occurrence.startTime}—${occurrence.endTime}`,
    scheduledDate: input.scheduledDate,
    catalogState: input.catalogState,
    prepStatus: input.prepStatus,
    prepRoomMapping,
  };
}

function readyCandidate(
  input: Parameters<typeof candidateBase>[0],
): ClassroomCandidate {
  return {
    ...candidateBase(input),
    eligibility: "READY",
    packageId: colorGradientClassroomPackage.packageId,
    snapshotId: colorGradientClassroomPackage.snapshot.snapshotId,
    sourceLessonRevisionId:
      colorGradientClassroomPackage.snapshot.sourceLessonRevisionId,
  };
}

function pendingCandidate(
  input: Parameters<typeof candidateBase>[0] & {
    eligibility: "NEEDS_CONFIRMATION" | "DRAFT_ONLY" | "HOLD";
    readinessReasons: string[];
  },
): ClassroomCandidate {
  return {
    ...candidateBase(input),
    eligibility: input.eligibility,
    packageId: null,
    snapshotId: null,
    readinessReasons: input.readinessReasons,
  };
}

const grade3Assignment = "assignment_grade3_art_2025_2026_2";
const grade4Assignment = "assignment_grade4_art_2025_2026_2";

export const classroomCandidates: ClassroomCandidate[] = [
  readyCandidate({
    candidateKey: "2026-05-11-mon-p6-class-3-5-gradient",
    gradeId: "grade3",
    gradeLabel: "三年级",
    assignmentId: grade3Assignment,
    classId: "class_3_5",
    classLabel: "三（5）班",
    dayId: "mon",
    periodId: "p6",
    scheduledDate: "2026-05-11",
    catalogState: "UPCOMING",
    lessonTitle: "色彩的渐变",
    prepLessonId: "lesson_grade3_gradient_01",
    prepStatus: "课堂包 READY · 备课列表仍显示继续备课",
    unitId: "g3_u2",
    unitTitle: "多彩的世界",
    plannedWeek: 10,
    scheduledWeek: 11,
  }),
  pendingCandidate({
    candidateKey: "2026-05-11-mon-p7-class-3-1-rhythm",
    gradeId: "grade3",
    gradeLabel: "三年级",
    assignmentId: grade3Assignment,
    classId: "class_3_1",
    classLabel: "三（1）班",
    dayId: "mon",
    periodId: "p7",
    scheduledDate: "2026-05-11",
    catalogState: "UPCOMING",
    lessonTitle: "渐变的节奏",
    prepLessonId: "lesson_grade3_rhythm_02",
    prepStatus: "草稿阶段",
    unitId: "g3_u2",
    unitTitle: "多彩的世界",
    plannedWeek: 11,
    scheduledWeek: 11,
    eligibility: "DRAFT_ONLY",
    readinessReasons: ["只有备课草稿", "教师确认尚未完成"],
  }),
  readyCandidate({
    candidateKey: "2026-05-12-tue-p6-class-3-3-gradient",
    gradeId: "grade3",
    gradeLabel: "三年级",
    assignmentId: grade3Assignment,
    classId: "class_3_3",
    classLabel: "三（3）班",
    dayId: "tue",
    periodId: "p6",
    scheduledDate: "2026-05-12",
    catalogState: "UPCOMING",
    lessonTitle: "色彩的渐变",
    prepLessonId: "lesson_grade3_gradient_01",
    prepStatus: "已形成课堂包",
    unitId: "g3_u2",
    unitTitle: "多彩的世界",
    plannedWeek: 10,
    scheduledWeek: 11,
  }),
  readyCandidate({
    candidateKey: "2026-05-13-wed-p3-class-3-4-gradient",
    gradeId: "grade3",
    gradeLabel: "三年级",
    assignmentId: grade3Assignment,
    classId: "class_3_4",
    classLabel: "三（4）班",
    dayId: "wed",
    periodId: "p3",
    scheduledDate: "2026-05-13",
    catalogState: "UPCOMING",
    lessonTitle: "色彩的渐变",
    prepLessonId: "lesson_grade3_gradient_01",
    prepStatus: "已形成课堂包",
    unitId: "g3_u2",
    unitTitle: "多彩的世界",
    plannedWeek: 10,
    scheduledWeek: 11,
  }),
  pendingCandidate({
    candidateKey: "2026-05-14-thu-p7-class-3-2-rhythm",
    gradeId: "grade3",
    gradeLabel: "三年级",
    assignmentId: grade3Assignment,
    classId: "class_3_2",
    classLabel: "三（2）班",
    dayId: "thu",
    periodId: "p7",
    scheduledDate: "2026-05-14",
    catalogState: "UPCOMING",
    lessonTitle: "渐变的节奏",
    prepLessonId: "lesson_grade3_rhythm_02",
    prepStatus: "待教师审核",
    unitId: "g3_u2",
    unitTitle: "多彩的世界",
    plannedWeek: 11,
    scheduledWeek: 11,
    eligibility: "NEEDS_CONFIRMATION",
    readinessReasons: ["课时仍待教师审核", "尚未形成不可变课堂包"],
  }),
  readyCandidate({
    candidateKey: "2026-05-05-tue-p6-class-3-3-gradient-taught",
    gradeId: "grade3",
    gradeLabel: "三年级",
    assignmentId: grade3Assignment,
    classId: "class_3_3",
    classLabel: "三（3）班",
    dayId: "tue",
    periodId: "p6",
    scheduledDate: "2026-05-05",
    catalogState: "TAUGHT",
    lessonTitle: "色彩的渐变",
    prepLessonId: "lesson_grade3_gradient_01",
    prepStatus: "已完成课堂模拟示例",
    unitId: "g3_u2",
    unitTitle: "多彩的世界",
    plannedWeek: 10,
    scheduledWeek: 10,
  }),
  pendingCandidate({
    candidateKey: "2026-05-11-mon-p5-class-4-1-paper-magic",
    gradeId: "grade4",
    gradeLabel: "四年级",
    assignmentId: grade4Assignment,
    classId: "class_4_1",
    classLabel: "四（1）班",
    dayId: "mon",
    periodId: "p5",
    scheduledDate: "2026-05-11",
    catalogState: "IN_PROGRESS",
    lessonTitle: "纸卷魔术",
    prepLessonId: "lesson_grade4_paper_magic_01",
    prepStatus: "待教师审核",
    unitId: "g4_u3",
    unitTitle: "纸卷魔术",
    plannedWeek: 10,
    scheduledWeek: 11,
    eligibility: "NEEDS_CONFIRMATION",
    readinessReasons: ["课时仍待教师审核", "尚未形成不可变课堂包"],
  }),
  pendingCandidate({
    candidateKey: "2026-05-12-tue-p3-class-4-5-weaving",
    gradeId: "grade4",
    gradeLabel: "四年级",
    assignmentId: grade4Assignment,
    classId: "class_4_5",
    classLabel: "四（5）班",
    dayId: "tue",
    periodId: "p3",
    scheduledDate: "2026-05-12",
    catalogState: "UPCOMING",
    lessonTitle: "穿穿编编",
    prepLessonId: "lesson_grade4_weaving_02",
    prepStatus: "HOLD",
    unitId: "g4_u3",
    unitTitle: "编织·纸艺",
    plannedWeek: 11,
    scheduledWeek: 11,
    eligibility: "HOLD",
    readinessReasons: ["材料规格待确认", "课堂启动资格 HOLD"],
  }),
  pendingCandidate({
    candidateKey: "2026-05-12-tue-p5-class-4-2-paper-magic",
    gradeId: "grade4",
    gradeLabel: "四年级",
    assignmentId: grade4Assignment,
    classId: "class_4_2",
    classLabel: "四（2）班",
    dayId: "tue",
    periodId: "p5",
    scheduledDate: "2026-05-12",
    catalogState: "UPCOMING",
    lessonTitle: "纸卷魔术",
    prepLessonId: "lesson_grade4_paper_magic_01",
    prepStatus: "待教师审核",
    unitId: "g4_u3",
    unitTitle: "纸卷魔术",
    plannedWeek: 10,
    scheduledWeek: 11,
    eligibility: "NEEDS_CONFIRMATION",
    readinessReasons: ["课时仍待教师审核", "尚未形成不可变课堂包"],
  }),
  pendingCandidate({
    candidateKey: "2026-05-12-tue-p7-class-4-3-paper-magic",
    gradeId: "grade4",
    gradeLabel: "四年级",
    assignmentId: grade4Assignment,
    classId: "class_4_3",
    classLabel: "四（3）班",
    dayId: "tue",
    periodId: "p7",
    scheduledDate: "2026-05-12",
    catalogState: "UPCOMING",
    lessonTitle: "纸卷魔术",
    prepLessonId: "lesson_grade4_paper_magic_01",
    prepStatus: "草稿阶段",
    unitId: "g4_u3",
    unitTitle: "纸卷魔术",
    plannedWeek: 10,
    scheduledWeek: 11,
    eligibility: "DRAFT_ONLY",
    readinessReasons: ["只有备课草稿", "教师确认尚未完成"],
  }),
  pendingCandidate({
    candidateKey: "2026-05-14-thu-p5-class-4-4-weaving",
    gradeId: "grade4",
    gradeLabel: "四年级",
    assignmentId: grade4Assignment,
    classId: "class_4_4",
    classLabel: "四（4）班",
    dayId: "thu",
    periodId: "p5",
    scheduledDate: "2026-05-14",
    catalogState: "UPCOMING",
    lessonTitle: "穿穿编编",
    prepLessonId: "lesson_grade4_weaving_02",
    prepStatus: "HOLD",
    unitId: "g4_u3",
    unitTitle: "编织·纸艺",
    plannedWeek: 11,
    scheduledWeek: 11,
    eligibility: "HOLD",
    readinessReasons: ["材料规格待确认", "课堂启动资格 HOLD"],
  }),
];

export const recommendedClassroomCandidateId = classroomCandidates[0].candidateId;

const lessonPackageKeys = [
  "lesson_grade3_gradient_01",
  "lesson_grade3_rhythm_02",
  "lesson_grade4_paper_magic_01",
  "lesson_grade4_weaving_02",
];

const lessonPackageCovers: Record<
  string,
  ClassroomLessonPackageDirectory["cover"]
> = {
  lesson_grade3_gradient_01: {
    source: "ASSET",
    assetRef: colorGradientVisualAssets.cover,
    tone: "GRADIENT",
  },
  lesson_grade3_rhythm_02: {
    source: "PLACEHOLDER",
    tone: "RHYTHM",
  },
  lesson_grade4_paper_magic_01: {
    source: "PLACEHOLDER",
    tone: "PAPER",
  },
  lesson_grade4_weaving_02: {
    source: "PLACEHOLDER",
    tone: "WEAVING",
  },
};

export const classroomLessonPackageDirectories: ClassroomLessonPackageDirectory[] =
  lessonPackageKeys.map((prepLessonId) => {
    const related = classroomCandidates.filter(
      (candidate) => candidate.prepRoomMapping.prepLessonId === prepLessonId,
    );
    if (!related.length)
      throw new Error(`Missing prep-room lesson mapping: ${prepLessonId}`);
    const candidateByClass = new Map<string, ClassroomCandidate>();
    for (const candidate of related) {
      const current = candidateByClass.get(candidate.classId);
      if (!current || candidate.catalogState === "TAUGHT")
        candidateByClass.set(candidate.classId, candidate);
    }
    const first = related[0];
    const candidateIds = Array.from(candidateByClass.values()).map(
      (candidate) => candidate.candidateId,
    );
    const readyOccurrenceCount = candidateIds.filter((candidateId) => {
      const candidate = classroomCandidates.find(
        (item) => item.candidateId === candidateId,
      );
      return candidate?.eligibility === "READY" && candidate.catalogState !== "TAUGHT";
    }).length;
    return {
      directoryId: `classroom-lesson-package:${prepLessonId}`,
      prepLessonId,
      lessonTitle: first.lessonTitle,
      gradeId: first.gradeId,
      gradeLabel: first.gradeLabel,
      assignmentId: first.assignmentId,
      unitTitle: first.prepRoomMapping.semesterPlan.unitTitle,
      packageStatus: related.some(
        (candidate) => candidate.eligibility === "READY",
      )
        ? "CLASSROOM_READY"
        : "PREP_IN_PROGRESS",
      cover: lessonPackageCovers[prepLessonId],
      readyOccurrenceCount,
      totalOccurrenceCount: candidateIds.length,
      candidateIds,
    };
  });
