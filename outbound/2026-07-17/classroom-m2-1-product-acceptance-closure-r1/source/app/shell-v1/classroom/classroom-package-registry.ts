import {
  deriveClassroomPresentationSequence,
  type LessonClassroomPackage,
} from "../../../domain/classroom-handoff/lesson-classroom-package.ts";
import type {
  ClassroomCandidate,
  ClassroomPackagePresentationProfile,
  ClassroomPackageRegistry,
  ClassroomPackageRegistryEntry,
  ClassroomPackageResolution,
  ClassroomPackageValidationIssue,
  ClassroomPreviewLock,
} from "./classroom-contracts.ts";
import { colorGradientClassroomPackage } from "./classroom-preview-fixture.ts";
import {
  colorGradientPreflightScreenIds,
  colorGradientScreenPresentation,
  colorGradientVisualAssets,
} from "./classroom-visual-fixture.ts";

export const colorGradientClassroomPresentationProfile = {
  packageId: colorGradientClassroomPackage.packageId,
  cover: {
    source: "ASSET",
    assetRef: colorGradientVisualAssets.cover,
    tone: "GRADIENT",
  },
  previewScreenIds: colorGradientPreflightScreenIds,
  screenPresentationOverrides: colorGradientScreenPresentation,
  teacherFacingSummary: {
    readyLabel: "课堂内容已准备",
    notices: [
      {
        tone: "WARNING",
        title: "示范图片待补",
        detail: "第6—8屏暂时使用文字占位，上课前请替换。",
      },
    ],
  },
} satisfies ClassroomPackagePresentationProfile;

export const classroomPackageRegistry: ClassroomPackageRegistry = {
  [colorGradientClassroomPackage.packageId]: {
    classroomPackage: colorGradientClassroomPackage,
    presentationProfile: colorGradientClassroomPresentationProfile,
    teacherVisible: true,
  },
};

export function validateClassroomPackageRegistryEntry(
  registryKey: string,
  entry: ClassroomPackageRegistryEntry,
): ClassroomPackageValidationIssue[] {
  const issues: ClassroomPackageValidationIssue[] = [];
  const classroomPackage = entry.classroomPackage;
  const screenIds = new Set(classroomPackage.screens.map((screen) => screen.screenId));
  const episodeIds = new Set(
    classroomPackage.episodes.map((episode) => episode.episodeId),
  );
  const bindingIds = new Set<string>();
  const bindingsById = new Map(
    classroomPackage.screenBindings.map((binding) => [binding.bindingId, binding]),
  );

  if (registryKey !== classroomPackage.packageId) {
    issues.push({
      code: "REGISTRY_KEY_PACKAGE_ID_MISMATCH",
      message: "注册表键与课堂包身份不一致。",
      objectId: registryKey,
    });
  }
  if (entry.presentationProfile.packageId !== classroomPackage.packageId) {
    issues.push({
      code: "PROFILE_PACKAGE_ID_MISMATCH",
      message: "呈现配置与课堂包身份不一致。",
      objectId: entry.presentationProfile.packageId,
    });
  }
  for (const binding of classroomPackage.screenBindings) {
    if (bindingIds.has(binding.bindingId)) {
      issues.push({
        code: "DUPLICATE_BINDING_ID",
        message: "课堂包存在重复的大屏绑定身份。",
        objectId: binding.bindingId,
      });
    }
    bindingIds.add(binding.bindingId);
    if (!screenIds.has(binding.screenId)) {
      issues.push({
        code: "BINDING_SCREEN_NOT_FOUND",
        message: "大屏绑定引用了不存在的课堂画面。",
        objectId: binding.bindingId,
      });
    }
    if (!episodeIds.has(binding.episodeId)) {
      issues.push({
        code: "BINDING_EPISODE_NOT_FOUND",
        message: "大屏绑定引用了不存在的课堂环节。",
        objectId: binding.bindingId,
      });
    }
  }
  const sequenceBindingIds = new Set<string>();
  classroomPackage.presentationSequence.forEach((item, index) => {
    if (item.sequenceIndex !== index) {
      issues.push({
        code: "PRESENTATION_SEQUENCE_INDEX_INVALID",
        message: "课堂播放序列的序号不连续。",
        objectId: item.bindingId,
      });
    }
    if (sequenceBindingIds.has(item.bindingId)) {
      issues.push({
        code: "PRESENTATION_SEQUENCE_BINDING_DUPLICATE",
        message: "课堂播放序列重复引用了同一条大屏关系。",
        objectId: item.bindingId,
      });
    }
    sequenceBindingIds.add(item.bindingId);
    const binding = bindingsById.get(item.bindingId);
    if (!binding) {
      issues.push({
        code: "PRESENTATION_SEQUENCE_BINDING_NOT_FOUND",
        message: "课堂播放序列引用了不存在的大屏关系。",
        objectId: item.bindingId,
      });
      return;
    }
    if (
      binding.episodeId !== item.episodeId ||
      binding.screenId !== item.screenId
    ) {
      issues.push({
        code: "PRESENTATION_SEQUENCE_BINDING_CONTEXT_MISMATCH",
        message: "课堂播放序列与大屏关系的环节或画面身份不一致。",
        objectId: item.bindingId,
      });
    }
  });
  for (const binding of classroomPackage.screenBindings) {
    if (!sequenceBindingIds.has(binding.bindingId)) {
      issues.push({
        code: "PRESENTATION_SEQUENCE_BINDING_MISSING",
        message: "课堂播放序列遗漏了大屏关系。",
        objectId: binding.bindingId,
      });
    }
  }
  const expectedSequence = deriveClassroomPresentationSequence(
    classroomPackage.episodes,
    classroomPackage.screenBindings,
  );
  if (
    JSON.stringify(classroomPackage.presentationSequence) !==
    JSON.stringify(expectedSequence)
  ) {
    issues.push({
      code: "PRESENTATION_SEQUENCE_DERIVATION_MISMATCH",
      message: "课堂播放序列没有按环节顺序和环节内大屏顺序生成。",
    });
  }
  for (const screenId of entry.presentationProfile.previewScreenIds) {
    if (!screenIds.has(screenId)) {
      issues.push({
        code: "PREVIEW_SCREEN_NOT_FOUND",
        message: "课前预览引用了不存在的课堂画面。",
        objectId: screenId,
      });
    }
  }
  for (const screenId of Object.keys(
    entry.presentationProfile.screenPresentationOverrides,
  )) {
    if (!screenIds.has(screenId)) {
      issues.push({
        code: "PRESENTATION_OVERRIDE_SCREEN_NOT_FOUND",
        message: "画面呈现配置引用了不存在的课堂画面。",
        objectId: screenId,
      });
    }
  }
  return issues;
}

export function resolveClassroomPackage(
  candidate: ClassroomCandidate | null | undefined,
  registry: ClassroomPackageRegistry = classroomPackageRegistry,
): ClassroomPackageResolution {
  if (!candidate || candidate.eligibility !== "READY") {
    return {
      status: "HOLD",
      code: "CANDIDATE_NOT_READY",
      message: "当前课次尚未形成可进入课堂的确认包。",
    };
  }
  const entry = registry[candidate.packageId];
  if (!entry) {
    return {
      status: "HOLD",
      code: "PACKAGE_NOT_REGISTERED",
      message: "当前课次对应的课堂包不存在，请返回备课室检查。",
    };
  }
  const classroomPackage = entry.classroomPackage;
  const validationIssues = validateClassroomPackageRegistryEntry(
    candidate.packageId,
    entry,
  );
  if (validationIssues.length) {
    return {
      status: "HOLD",
      code: "PACKAGE_REFERENCE_INVALID",
      message: validationIssues[0].message,
    };
  }
  if (classroomPackage.packageId !== candidate.packageId) {
    return {
      status: "HOLD",
      code: "PACKAGE_ID_MISMATCH",
      message: "课次与课堂包身份不一致，请返回备课室检查。",
    };
  }
  if (classroomPackage.snapshot.snapshotId !== candidate.snapshotId) {
    return {
      status: "HOLD",
      code: "SNAPSHOT_ID_MISMATCH",
      message: "课次与课堂快照版本不一致，请重新确认课堂包。",
    };
  }
  if (
    classroomPackage.snapshot.sourceLessonRevisionId !==
    candidate.sourceLessonRevisionId
  ) {
    return {
      status: "HOLD",
      code: "SOURCE_REVISION_MISMATCH",
      message: "课次与备课修订版本不一致，请重新确认课堂包。",
    };
  }
  if (classroomPackage.readiness.status !== "READY") {
    return {
      status: "HOLD",
      code: "PACKAGE_NOT_READY",
      message: "课堂包尚未通过课前准备检查。",
    };
  }
  return {
    status: "RESOLVED",
    classroomPackage,
    presentationProfile: entry.presentationProfile,
  };
}

export function validatePreviewLockAgainstPackage(
  lock: ClassroomPreviewLock,
  candidate: ClassroomCandidate,
  classroomPackage: LessonClassroomPackage,
): ClassroomPackageValidationIssue[] {
  const issues: ClassroomPackageValidationIssue[] = [];
  if (lock.candidateId !== candidate.candidateId) {
    issues.push({ code: "LOCK_CANDIDATE_MISMATCH", message: "预演锁定的课次已变化。" });
  }
  if (lock.packageId !== classroomPackage.packageId) {
    issues.push({ code: "LOCK_PACKAGE_MISMATCH", message: "预演锁定的课堂包已变化。" });
  }
  if (lock.snapshotId !== classroomPackage.snapshot.snapshotId) {
    issues.push({ code: "LOCK_SNAPSHOT_MISMATCH", message: "预演锁定的课堂快照已变化。" });
  }
  if (
    lock.sourceLessonRevisionId !==
    classroomPackage.snapshot.sourceLessonRevisionId
  ) {
    issues.push({ code: "LOCK_REVISION_MISMATCH", message: "预演锁定的备课修订已变化。" });
  }
  return issues;
}

export function validateCurrentBindingForPackage(
  currentBindingId: string | null,
  classroomPackage: LessonClassroomPackage,
): ClassroomPackageValidationIssue[] {
  if (
    !currentBindingId ||
    !classroomPackage.presentationSequence.some(
      (item) => item.bindingId === currentBindingId,
    )
  ) {
    return [
      {
        code: "CURRENT_BINDING_NOT_IN_PACKAGE",
        message: "当前画面位置不属于所选课堂包。",
        objectId: currentBindingId || undefined,
      },
    ];
  }
  return [];
}

export function classroomPackageMinutes(classroomPackage: LessonClassroomPackage) {
  return classroomPackage.episodes.reduce(
    (sum, episode) => sum + episode.durationMinutes,
    0,
  );
}
