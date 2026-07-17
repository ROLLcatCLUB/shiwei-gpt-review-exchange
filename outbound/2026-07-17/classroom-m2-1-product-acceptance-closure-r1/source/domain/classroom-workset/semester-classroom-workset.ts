export type ClassroomArchiveStatus = "ACTIVE" | "ARCHIVED";
export type ClassroomArchiveTransition = "ARCHIVED" | "RESTORED";
export type ClassroomPackageWorkflowStatus =
  | "PENDING_TRIAGE"
  | "NEEDS_TEACHER_DECISION"
  | "COMPLETE";
export type ClassroomWorksetPriority =
  | "NEXT"
  | "TODAY"
  | "WEEK"
  | "RECENT_COMPLETE"
  | "SEMESTER_ONLY";

export interface ClassroomArchiveState {
  status: ClassroomArchiveStatus;
  lastTransition: ClassroomArchiveTransition | null;
  teacherConfirmed: boolean;
  reason?: string;
  changedAt: string | null;
}

export interface ClassroomActualRecordRef {
  recordRefId: string;
  recordUri: `fixture://classroom-actual-record/${string}`;
  actualDurationMinutes: number;
  actualFlow: readonly {
    episodeId: string;
    title: string;
    actualMinutes: number;
  }[];
  quickNotes: readonly {
    noteId: string;
    bindingId: string;
    summary: string;
  }[];
  studentResponseSummary: string;
}

export interface ClassroomScheduleInstance {
  scheduledInstanceId: string;
  unitId: string;
  lessonId: string;
  classId: string;
  classLabel: string;
  scheduledAt: string;
  scheduleLabel: string;
  readiness: "READY" | "NEEDS_PREPARATION" | "COMPLETE";
  priority: ClassroomWorksetPriority;
  anomalySummary?: string;
  sessionPackageId: string | null;
  origin?: "SEMESTER_FIXTURE" | "TEACHER_REUSE_CANDIDATE";
  sourceLessonRevisionId?: string;
  sourceClassroomSnapshotId?: string;
}

export interface ClassroomSessionPackage {
  sessionPackageId: string;
  unitId: string;
  lessonId: string;
  classId: string;
  classLabel: string;
  scheduledInstanceId: string;
  lessonRevisionId: string;
  classroomSnapshotId: string;
  snapshotHash: string;
  actualRecordRef: ClassroomActualRecordRef;
  evidenceRefs: readonly string[];
  teacherReflectionRef: string | null;
  researchReferenceIds: readonly string[];
  archiveState: ClassroomArchiveState;
  workflowStatus: ClassroomPackageWorkflowStatus;
  taughtAt: string;
  teacherJudgment: string | null;
  teacherDecision: string | null;
  nextClassDecision: string | null;
  unresolvedRecommendation: boolean;
  incompleteClassroomRecord: boolean;
}

export interface LessonAcrossClassesSummary {
  summaryId: string;
  unitId: string;
  lessonId: string;
  sourceSessionPackageIds: readonly string[];
  commonDifficulties: readonly string[];
  classDifferences: readonly { classId: string; classLabel: string; summary: string }[];
  versionChanges: readonly string[];
  teacherStrategyAdjustments: readonly string[];
  classDurations: readonly { classId: string; minutes: number }[];
  representativeEvidenceRefs: readonly string[];
  derivedOnly: true;
}

export interface ResearchHandoffCandidate {
  researchReferenceId: string;
  objectName: string;
  researchQuestion: string;
  sessionPackageIds: readonly string[];
  evidenceRefs: readonly string[];
  anonymized: boolean;
  status: "DRAFT_REFERENCE_ONLY" | "TEACHER_CONFIRMED_REFERENCE_ONLY";
  copiesOriginalRecords: false;
  destinationSurface: "RESEARCH_ROOM_HOLD";
}

export interface LessonClassroomWorkset {
  lessonId: string;
  lessonTitle: string;
  lessonOrder: number;
  unitId: string;
  scheduleInstanceIds: readonly string[];
  sessionPackageIds: readonly string[];
  acrossClassesSummaryId: string | null;
  pinned: boolean;
  frequentlyUsed: boolean;
}

export interface UnitClassroomWorkset {
  unitId: string;
  unitTitle: string;
  gradeLabel: string;
  lessonIds: readonly string[];
}

export interface SemesterClassroomWorkset {
  worksetId: string;
  semesterId: string;
  semesterLabel: string;
  referenceNow: string;
  unitOrder: readonly string[];
  units: readonly UnitClassroomWorkset[];
  lessons: readonly LessonClassroomWorkset[];
  scheduleInstances: readonly ClassroomScheduleInstance[];
  sessionPackages: readonly ClassroomSessionPackage[];
  acrossClassesSummaries: readonly LessonAcrossClassesSummary[];
  researchHandoffCandidates: readonly ResearchHandoffCandidate[];
  runtimeEffect: "NONE_FIXTURE_ONLY";
  persistence: "MEMORY_RESET_ON_REFRESH";
}

export interface ClassroomArchiveGuardResult {
  allowed: boolean;
  blockers: readonly string[];
  notices: readonly string[];
}

export interface HierarchyArchivePlan {
  scope: "LESSON" | "UNIT";
  scopeId: string;
  totalCount: number;
  activeCount: number;
  archivedCount: number;
  archivableCount: number;
  blockedCount: number;
  pendingTriageCount: number;
  pendingDecisionCount: number;
  incompleteCount: number;
  researchReferenceCount: number;
  eligibleSessionPackageIds: readonly string[];
  blockedSessionPackageIds: readonly string[];
  partialArchiveRequired: boolean;
}

export function classroomArchiveGuard(
  sessionPackage: ClassroomSessionPackage,
): ClassroomArchiveGuardResult {
  const blockers: string[] = [];
  if (sessionPackage.workflowStatus === "PENDING_TRIAGE") blockers.push("课堂仍待整理");
  if (
    sessionPackage.workflowStatus === "NEEDS_TEACHER_DECISION" ||
    sessionPackage.unresolvedRecommendation
  ) blockers.push("仍有需要教师确认的建议");
  if (sessionPackage.incompleteClassroomRecord) blockers.push("课堂记录尚未完整收拢");
  const notices = sessionPackage.researchReferenceIds.length
    ? ["已有研究引用；软归档后继续保留引用关系"]
    : [];
  return Object.freeze({
    allowed: blockers.length === 0,
    blockers: Object.freeze(blockers),
    notices: Object.freeze(notices),
  });
}

export function archiveClassroomSessionPackage(
  sessionPackage: ClassroomSessionPackage,
  input: { teacherConfirmed: boolean; reason: string; changedAt: string },
): ClassroomSessionPackage {
  if (!input.teacherConfirmed) throw new Error("ARCHIVE_TEACHER_CONFIRMATION_REQUIRED");
  const guard = classroomArchiveGuard(sessionPackage);
  if (!guard.allowed) throw new Error(`ARCHIVE_BLOCKED:${guard.blockers.join("|")}`);
  return Object.freeze({
    ...sessionPackage,
    archiveState: Object.freeze({
      status: "ARCHIVED" as const,
      lastTransition: "ARCHIVED" as const,
      teacherConfirmed: true,
      reason: input.reason,
      changedAt: input.changedAt,
    }),
  });
}

export function restoreClassroomSessionPackage(
  sessionPackage: ClassroomSessionPackage,
  input: { teacherConfirmed: boolean; changedAt: string },
): ClassroomSessionPackage {
  if (!input.teacherConfirmed) throw new Error("RESTORE_TEACHER_CONFIRMATION_REQUIRED");
  if (sessionPackage.archiveState.status !== "ARCHIVED")
    throw new Error("RESTORE_REQUIRES_ARCHIVED_PACKAGE");
  return Object.freeze({
    ...sessionPackage,
    archiveState: Object.freeze({
      status: "ACTIVE" as const,
      lastTransition: "RESTORED" as const,
      teacherConfirmed: true,
      reason: sessionPackage.archiveState.reason,
      changedAt: input.changedAt,
    }),
  });
}

export function deriveClassroomWorksetPriority(
  instance: ClassroomScheduleInstance,
  input: {
    referenceNow: string;
    nextScheduledInstanceId: string | null;
    pinnedLessonIds?: readonly string[];
    frequentlyUsedLessonIds?: readonly string[];
  },
): ClassroomWorksetPriority {
  if (instance.scheduledInstanceId === input.nextScheduledInstanceId) return "NEXT";
  const now = new Date(input.referenceNow);
  const scheduled = new Date(instance.scheduledAt);
  const distance = scheduled.getTime() - now.getTime();
  if (instance.scheduledAt.slice(0, 10) === input.referenceNow.slice(0, 10)) return "TODAY";
  if (distance > 0 && distance <= 7 * 24 * 60 * 60 * 1000) return "WEEK";
  if (instance.readiness === "COMPLETE" && distance <= 0 && distance >= -7 * 24 * 60 * 60 * 1000)
    return "RECENT_COMPLETE";
  return "SEMESTER_ONLY";
}

export function deriveClassroomWorksetPriorities(
  instances: readonly ClassroomScheduleInstance[],
  input: {
    referenceNow: string;
    pinnedLessonIds?: readonly string[];
    frequentlyUsedLessonIds?: readonly string[];
  },
): readonly ClassroomScheduleInstance[] {
  const reference = new Date(input.referenceNow).getTime();
  const next = [...instances]
    .filter((item) => item.readiness !== "COMPLETE" && new Date(item.scheduledAt).getTime() >= reference)
    .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt))[0] || null;
  const bucketOrder: Record<ClassroomWorksetPriority, number> = {
    NEXT: 0,
    TODAY: 1,
    WEEK: 2,
    RECENT_COMPLETE: 3,
    SEMESTER_ONLY: 4,
  };
  return Object.freeze(instances.map((item) => Object.freeze({
    ...item,
    priority: deriveClassroomWorksetPriority(item, {
      ...input,
      nextScheduledInstanceId: next?.scheduledInstanceId || null,
    }),
  })).sort((left, right) => {
    const bucket = bucketOrder[left.priority] - bucketOrder[right.priority];
    if (bucket) return bucket;
    const leftBoost = (input.pinnedLessonIds?.includes(left.lessonId) ? 2 : 0) +
      (input.frequentlyUsedLessonIds?.includes(left.lessonId) ? 1 : 0);
    const rightBoost = (input.pinnedLessonIds?.includes(right.lessonId) ? 2 : 0) +
      (input.frequentlyUsedLessonIds?.includes(right.lessonId) ? 1 : 0);
    return rightBoost - leftBoost || left.scheduledAt.localeCompare(right.scheduledAt);
  }));
}

export function createFixtureScheduleReuseCandidate(input: {
  lessonId: string;
  unitId: string;
  classId: string;
  classLabel: string;
  scheduledAt: string;
  sourceLessonRevisionId: string;
  sourceClassroomSnapshotId: string;
  existingSchedules: readonly ClassroomScheduleInstance[];
  referenceNow: string;
}): ClassroomScheduleInstance {
  if (!input.classId || !input.classLabel || !input.scheduledAt)
    throw new Error("REUSE_CANDIDATE_REQUIRES_CLASS_AND_DATE");
  const suffix = input.scheduledAt.replace(/[^0-9]/g, "").slice(0, 12);
  const scheduledInstanceId = `schedule:reuse:${input.lessonId}:${input.classId}:${suffix}`;
  if (input.existingSchedules.some((item) => item.scheduledInstanceId === scheduledInstanceId))
    throw new Error("REUSE_SCHEDULE_ID_DUPLICATED");
  const date = new Date(input.scheduledAt);
  const scheduleLabel = `${date.getMonth() + 1}/${date.getDate()} · 教师复用候选`;
  const draft = {
    scheduledInstanceId,
    unitId: input.unitId,
    lessonId: input.lessonId,
    classId: input.classId,
    classLabel: input.classLabel,
    scheduledAt: input.scheduledAt,
    scheduleLabel,
    readiness: "NEEDS_PREPARATION" as const,
    priority: "SEMESTER_ONLY" as const,
    anomalySummary: "教师新建的复用课次；尚未进入真实课表",
    sessionPackageId: null,
    origin: "TEACHER_REUSE_CANDIDATE" as const,
    sourceLessonRevisionId: input.sourceLessonRevisionId,
    sourceClassroomSnapshotId: input.sourceClassroomSnapshotId,
  };
  return deriveClassroomWorksetPriorities([...input.existingSchedules, draft], {
    referenceNow: input.referenceNow,
  }).find((item) => item.scheduledInstanceId === scheduledInstanceId)!;
}

export function createResearchHandoffCandidate(input: {
  researchReferenceId: string;
  objectName: string;
  researchQuestion: string;
  sessionPackageIds: readonly string[];
  evidenceRefs: readonly string[];
  anonymized: boolean;
  teacherConfirmed: boolean;
  nonAnonymizedTeacherConfirmation?: boolean;
  availableSessionPackages: readonly ClassroomSessionPackage[];
}): ResearchHandoffCandidate {
  const uniquePackageIds = [...new Set(input.sessionPackageIds)];
  if (!input.researchReferenceId.trim()) throw new Error("RESEARCH_REFERENCE_ID_REQUIRED");
  if (!input.objectName.trim()) throw new Error("RESEARCH_REFERENCE_REQUIRES_OBJECT_NAME");
  if (uniquePackageIds.length === 0) throw new Error("RESEARCH_REFERENCE_REQUIRES_SESSION_PACKAGE");
  if (uniquePackageIds.length !== input.sessionPackageIds.length)
    throw new Error("RESEARCH_SESSION_PACKAGE_IDS_MUST_BE_UNIQUE");
  if (!input.researchQuestion.trim()) throw new Error("RESEARCH_REFERENCE_REQUIRES_QUESTION");
  if (!input.anonymized && !input.nonAnonymizedTeacherConfirmation)
    throw new Error("NON_ANONYMIZED_REFERENCE_REQUIRES_EXTRA_CONFIRMATION");
  const selectedPackages = uniquePackageIds.map((id) => {
    const found = input.availableSessionPackages.find((item) => item.sessionPackageId === id);
    if (!found) throw new Error(`RESEARCH_PACKAGE_REF_MISSING:${id}`);
    return found;
  });
  const availableEvidence = new Set(selectedPackages.flatMap((item) => item.evidenceRefs));
  for (const evidenceRef of input.evidenceRefs)
    if (!availableEvidence.has(evidenceRef))
      throw new Error(`RESEARCH_EVIDENCE_OUTSIDE_SELECTED_PACKAGES:${evidenceRef}`);
  return Object.freeze({
    researchReferenceId: input.researchReferenceId,
    objectName: input.objectName.trim(),
    researchQuestion: input.researchQuestion.trim(),
    sessionPackageIds: Object.freeze(uniquePackageIds),
    evidenceRefs: Object.freeze([...new Set(input.evidenceRefs)]),
    anonymized: input.anonymized,
    status: input.teacherConfirmed ? "TEACHER_CONFIRMED_REFERENCE_ONLY" : "DRAFT_REFERENCE_ONLY",
    copiesOriginalRecords: false,
    destinationSurface: "RESEARCH_ROOM_HOLD",
  });
}

export function attachResearchCandidateToSessionPackages(
  sessionPackages: readonly ClassroomSessionPackage[],
  candidate: ResearchHandoffCandidate,
): readonly ClassroomSessionPackage[] {
  return Object.freeze(sessionPackages.map((item) => candidate.sessionPackageIds.includes(item.sessionPackageId)
    ? Object.freeze({
        ...item,
        researchReferenceIds: Object.freeze([...new Set([...item.researchReferenceIds, candidate.researchReferenceId])]),
      })
    : item));
}

export function createHierarchyArchivePlan(input: {
  scope: "LESSON" | "UNIT";
  scopeId: string;
  sessionPackages: readonly ClassroomSessionPackage[];
}): HierarchyArchivePlan {
  const scoped = input.sessionPackages.filter((item) =>
    input.scope === "LESSON" ? item.lessonId === input.scopeId : item.unitId === input.scopeId,
  );
  if (!scoped.length) throw new Error("ARCHIVE_SCOPE_HAS_NO_SESSION_PACKAGES");
  const active = scoped.filter((item) => item.archiveState.status === "ACTIVE");
  const eligible = active.filter((item) => classroomArchiveGuard(item).allowed);
  const blocked = active.filter((item) => !classroomArchiveGuard(item).allowed);
  return Object.freeze({
    scope: input.scope,
    scopeId: input.scopeId,
    totalCount: scoped.length,
    activeCount: active.length,
    archivedCount: scoped.length - active.length,
    archivableCount: eligible.length,
    blockedCount: blocked.length,
    pendingTriageCount: active.filter((item) => item.workflowStatus === "PENDING_TRIAGE").length,
    pendingDecisionCount: active.filter((item) => item.workflowStatus === "NEEDS_TEACHER_DECISION").length,
    incompleteCount: active.filter((item) => item.incompleteClassroomRecord).length,
    researchReferenceCount: active.filter((item) => item.researchReferenceIds.length > 0).length,
    eligibleSessionPackageIds: Object.freeze(eligible.map((item) => item.sessionPackageId)),
    blockedSessionPackageIds: Object.freeze(blocked.map((item) => item.sessionPackageId)),
    partialArchiveRequired: eligible.length > 0 && blocked.length > 0,
  });
}

export function applyHierarchyArchivePlan(
  sessionPackages: readonly ClassroomSessionPackage[],
  plan: HierarchyArchivePlan,
  input: { teacherConfirmed: boolean; changedAt: string },
): readonly ClassroomSessionPackage[] {
  if (!input.teacherConfirmed) throw new Error("HIERARCHY_ARCHIVE_TEACHER_CONFIRMATION_REQUIRED");
  if (!plan.archivableCount) throw new Error("HIERARCHY_ARCHIVE_HAS_NO_ELIGIBLE_PACKAGES");
  return Object.freeze(sessionPackages.map((item) => plan.eligibleSessionPackageIds.includes(item.sessionPackageId)
    ? archiveClassroomSessionPackage(item, {
        teacherConfirmed: true,
        reason: plan.partialArchiveRequired ? "教师确认只软归档当前可归档课堂" : "教师确认按层级软归档",
        changedAt: input.changedAt,
      })
    : item));
}

export function restoreHierarchyArchiveScope(
  sessionPackages: readonly ClassroomSessionPackage[],
  input: { scope: "LESSON" | "UNIT"; scopeId: string; teacherConfirmed: boolean; changedAt: string },
): readonly ClassroomSessionPackage[] {
  if (!input.teacherConfirmed) throw new Error("HIERARCHY_RESTORE_TEACHER_CONFIRMATION_REQUIRED");
  const matchesScope = (item: ClassroomSessionPackage) => input.scope === "LESSON"
    ? item.lessonId === input.scopeId
    : item.unitId === input.scopeId;
  return Object.freeze(sessionPackages.map((item) => matchesScope(item) && item.archiveState.status === "ARCHIVED"
    ? restoreClassroomSessionPackage(item, { teacherConfirmed: true, changedAt: input.changedAt })
    : item));
}

export function validateSemesterClassroomWorkset(workset: SemesterClassroomWorkset): readonly string[] {
  const issues: string[] = [];
  const units = new Map(workset.units.map((unit) => [unit.unitId, unit]));
  const lessons = new Map(workset.lessons.map((lesson) => [lesson.lessonId, lesson]));
  const schedules = new Map(workset.scheduleInstances.map((instance) => [instance.scheduledInstanceId, instance]));
  const packages = new Map(workset.sessionPackages.map((item) => [item.sessionPackageId, item]));
  const researchIds = new Set<string>();
  if (packages.size !== workset.sessionPackages.length) issues.push("SESSION_PACKAGE_ID_DUPLICATED");
  if (schedules.size !== workset.scheduleInstances.length) issues.push("SCHEDULE_INSTANCE_ID_DUPLICATED");
  for (const unitId of workset.unitOrder) if (!units.has(unitId)) issues.push(`UNIT_ORDER_REF_MISSING:${unitId}`);
  for (const lesson of workset.lessons) {
    if (!units.has(lesson.unitId)) issues.push(`LESSON_UNIT_REF_MISSING:${lesson.lessonId}`);
    for (const id of lesson.scheduleInstanceIds)
      if (!schedules.has(id)) issues.push(`LESSON_SCHEDULE_REF_MISSING:${lesson.lessonId}:${id}`);
    for (const id of lesson.sessionPackageIds)
      if (!packages.has(id)) issues.push(`LESSON_PACKAGE_REF_MISSING:${lesson.lessonId}:${id}`);
  }
  for (const sessionPackage of workset.sessionPackages) {
    const schedule = schedules.get(sessionPackage.scheduledInstanceId);
    if (!lessons.has(sessionPackage.lessonId)) issues.push(`PACKAGE_LESSON_REF_MISSING:${sessionPackage.sessionPackageId}`);
    if (!schedule) issues.push(`PACKAGE_SCHEDULE_REF_MISSING:${sessionPackage.sessionPackageId}`);
    else if (schedule.classId !== sessionPackage.classId || schedule.lessonId !== sessionPackage.lessonId)
      issues.push(`PACKAGE_SCHEDULE_IDENTITY_MISMATCH:${sessionPackage.sessionPackageId}`);
    if (!/^[a-f0-9]{64}$/i.test(sessionPackage.snapshotHash)) issues.push(`PACKAGE_SNAPSHOT_HASH_INVALID:${sessionPackage.sessionPackageId}`);
    if (!sessionPackage.actualRecordRef.recordUri.startsWith("fixture://")) issues.push(`PACKAGE_RECORD_REF_NOT_FIXTURE:${sessionPackage.sessionPackageId}`);
    if (sessionPackage.archiveState.status !== "ACTIVE" && sessionPackage.archiveState.status !== "ARCHIVED")
      issues.push(`PACKAGE_ARCHIVE_STATUS_INVALID:${sessionPackage.sessionPackageId}`);
  }
  for (const summary of workset.acrossClassesSummaries) {
    if (!summary.derivedOnly) issues.push(`SUMMARY_NOT_DERIVED:${summary.summaryId}`);
    for (const id of summary.sourceSessionPackageIds)
      if (!packages.has(id)) issues.push(`SUMMARY_PACKAGE_REF_MISSING:${summary.summaryId}:${id}`);
  }
  for (const candidate of workset.researchHandoffCandidates) {
    if (researchIds.has(candidate.researchReferenceId)) issues.push(`RESEARCH_REFERENCE_ID_DUPLICATED:${candidate.researchReferenceId}`);
    researchIds.add(candidate.researchReferenceId);
    if (candidate.copiesOriginalRecords) issues.push(`RESEARCH_COPIES_RECORDS:${candidate.researchReferenceId}`);
    if (candidate.destinationSurface !== "RESEARCH_ROOM_HOLD") issues.push(`RESEARCH_DESTINATION_NOT_HOLD:${candidate.researchReferenceId}`);
    for (const id of candidate.sessionPackageIds)
      if (!packages.has(id)) issues.push(`RESEARCH_PACKAGE_REF_MISSING:${candidate.researchReferenceId}:${id}`);
  }
  if (workset.runtimeEffect !== "NONE_FIXTURE_ONLY") issues.push("REAL_RUNTIME_FORBIDDEN");
  if (workset.persistence !== "MEMORY_RESET_ON_REFRESH") issues.push("PERSISTENCE_FORBIDDEN");
  return Object.freeze(issues);
}
