export type ClassroomPageId =
  | "overview"
  | "stage"
  | "response"
  | "assessment"
  | "data";

export type ClassroomSessionMode = "PREVIEW" | "LIVE" | "REVIEW";

export type ClassroomPreviewClock = {
  referenceNow: string;
  referenceDayId: string;
  referencePeriodId: string;
  timezone: "Asia/Shanghai";
};

export type ClassroomCatalogState = "IN_PROGRESS" | "UPCOMING" | "TAUGHT";

export type SemesterPlanReference = {
  semesterPlanItemId: string;
  unitId: string;
  unitTitle: string;
  lessonId: string;
  plannedWeek: number;
  scheduledWeek: number;
  relation: "ON_PLAN" | "AHEAD_OF_PLAN" | "BEHIND_PLAN";
};

export type PrepRoomClassroomMapping = {
  mappingId: string;
  prepLessonId: string;
  assignmentId: string;
  classId: string;
  scheduleOccurrenceId: string;
  scheduledDate: string;
  semesterPlan: SemesterPlanReference;
  source: "PREP_ROOM_LESSON_MAPPING";
};

type ClassroomCandidateBase = {
  candidateId: string;
  occurrenceId: string;
  assignmentId: string;
  classId: string;
  gradeId: "grade3" | "grade4";
  gradeLabel: string;
  lessonTitle: string;
  classLabel: string;
  scheduleLabel: string;
  scheduledDate: string;
  catalogState: ClassroomCatalogState;
  prepStatus: string;
  prepRoomMapping: PrepRoomClassroomMapping;
};

export type ReadyClassroomCandidate = ClassroomCandidateBase & {
  eligibility: "READY";
  packageId: string;
  snapshotId: string;
  sourceLessonRevisionId: string;
};

export type PrepRequiredCandidate = ClassroomCandidateBase & {
  eligibility: "NEEDS_CONFIRMATION" | "DRAFT_ONLY" | "HOLD";
  packageId: null;
  snapshotId: null;
  readinessReasons: string[];
};

export type ClassroomCandidate = ReadyClassroomCandidate | PrepRequiredCandidate;

export type ClassroomLessonPackageDirectory = {
  directoryId: string;
  prepLessonId: string;
  lessonTitle: string;
  gradeId: "grade3" | "grade4";
  gradeLabel: string;
  assignmentId: string;
  unitTitle: string;
  packageStatus: "CLASSROOM_READY" | "PREP_IN_PROGRESS";
  cover: {
    source: "TEACHER_SELECTED" | "SCREEN" | "ASSET" | "PLACEHOLDER";
    screenId?: string;
    assetRef?: string;
    tone: "GRADIENT" | "RHYTHM" | "PAPER" | "WEAVING";
  };
  readyOccurrenceCount: number;
  totalOccurrenceCount: number;
  candidateIds: string[];
};

export type ClassroomScreenPresentationOverride = {
  imageUri?: string;
  title?: string;
  question?: string;
  studentAction?: string;
};

export type ClassroomPackagePresentationProfile = {
  packageId: string;
  cover: ClassroomLessonPackageDirectory["cover"];
  previewScreenIds: readonly string[];
  screenPresentationOverrides: Readonly<
    Record<string, ClassroomScreenPresentationOverride>
  >;
  teacherFacingSummary: {
    readyLabel: string;
    notices: ReadonlyArray<{
      tone: "INFO" | "WARNING";
      title: string;
      detail: string;
    }>;
  };
};

export type ClassroomPackageRegistryEntry = {
  classroomPackage: LessonClassroomPackage;
  presentationProfile: ClassroomPackagePresentationProfile;
  teacherVisible: boolean;
};

export type ClassroomPackageRegistry = Readonly<
  Record<string, ClassroomPackageRegistryEntry>
>;

export type ClassroomPackageResolution =
  | {
      status: "RESOLVED";
      classroomPackage: LessonClassroomPackage;
      presentationProfile: ClassroomPackagePresentationProfile;
    }
  | {
      status: "HOLD";
      code:
        | "CANDIDATE_NOT_READY"
        | "PACKAGE_NOT_REGISTERED"
        | "PACKAGE_ID_MISMATCH"
        | "SNAPSHOT_ID_MISMATCH"
        | "SOURCE_REVISION_MISMATCH"
        | "PACKAGE_NOT_READY"
        | "PACKAGE_REFERENCE_INVALID";
      message: string;
    };

export type ClassroomPackageValidationIssue = {
  code: string;
  message: string;
  objectId?: string;
};

export function classroomScreenContent(
  screen: ClassroomScreenDocument,
  profile: ClassroomPackagePresentationProfile,
) {
  return {
    ...(screen.studentVisibleContent as ClassroomScreenPresentationOverride),
    ...profile.screenPresentationOverrides[screen.screenId],
  };
}

export function classroomScreenImageUri(
  screen: ClassroomScreenDocument,
  profile: ClassroomPackagePresentationProfile,
) {
  return (
    profile.screenPresentationOverrides[screen.screenId]?.imageUri ||
    screen.assetRefs.find((asset) => asset.status === "READY" && asset.uri)?.uri
  );
}

export type ClassroomPreviewLock = {
  candidateId: string;
  occurrenceId: string;
  assignmentId: string;
  classId: string;
  packageId: string;
  snapshotId: string;
  sourceLessonRevisionId: string;
};

export type ClassroomProgressSummary = {
  completed: number;
  inProgress: number;
  notResponded: number;
};

export type ClassroomSupportFlags = {
  needsHelp: number;
  showcaseEligible: number;
};

export type ClassroomPreviewEvent = {
  eventId: string;
  timeLabel: string;
  studentLabel: string;
  action: string;
  tone: "DEFAULT" | "POSITIVE" | "ATTENTION";
};

export type ClassroomPreviewFixtureExtension = {
  fixtureOnly: true;
  notClassroomActualRecord: true;
  notPersisted: true;
  fixtureLabel: string;
  classroom: {
    classId: string;
    classLabel: string;
    enrolled: number;
    present: number;
    connected: number;
  };
  session: {
    sessionId: string;
    mode: ClassroomSessionMode;
    currentBindingId: string;
    elapsedSeconds: number;
  };
  progress: ClassroomProgressSummary;
  supportFlags: ClassroomSupportFlags;
  supportStudents: Array<{
    studentId: string;
    displayName: string;
    reason: string;
  }>;
  randomCandidates: string[];
  recentEvents: ClassroomPreviewEvent[];
  xiaojiaoCandidate: {
    title: string;
    judgement: string;
    suggestions: string[];
  };
};

export const classroomPageRegistry: ReadonlyArray<{
  id: ClassroomPageId;
  label: string;
  icon: string;
  description: string;
  implemented: boolean;
}> = [
  {
    id: "overview",
    label: "课堂总览",
    icon: "览",
    description: "掌握课堂全局",
    implemented: true,
  },
  {
    id: "stage",
    label: "教学舞台",
    icon: "屏",
    description: "展示与引导",
    implemented: false,
  },
  {
    id: "response",
    label: "学生响应",
    icon: "生",
    description: "查看学生回答",
    implemented: false,
  },
  {
    id: "assessment",
    label: "课堂评价",
    icon: "评",
    description: "过程性评价",
    implemented: false,
  },
  {
    id: "data",
    label: "课堂数据",
    icon: "数",
    description: "数据统计与分析",
    implemented: false,
  },
] as const;

export function progressTotal(progress: ClassroomProgressSummary) {
  return progress.completed + progress.inProgress + progress.notResponded;
}
import type {
  ClassroomScreenDocument,
  LessonClassroomPackage,
} from "../../../domain/classroom-handoff/lesson-classroom-package";
