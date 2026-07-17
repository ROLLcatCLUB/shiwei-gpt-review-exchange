import type { ClassroomEpisode, LessonClassroomPackage } from "../../../../domain/classroom-handoff/lesson-classroom-package.ts";
import {
  compileClassroomComponentPlanR0,
  createClassroomComponentTrustedViewerContext,
  createSafeStudentProjection,
  type ClassroomComponentPlanItem,
  type ClassroomComponentTrustedViewerContexts,
} from "../../../../domain/classroom-components/classroom-component-registry.ts";
import {
  resolveClassroomCompositionEntry,
  type ClassroomCompositionBlueprint,
  type ClassroomComponentProfileId,
} from "./classroom-composition-blueprint.ts";

export { classroomComponentProfileIds } from "./classroom-composition-blueprint.ts";
export type { ClassroomComponentProfileId } from "./classroom-composition-blueprint.ts";
export type ClassroomComponentPlanMode = "PREVIEW" | "LIVE" | "REVIEW";

export interface ClassroomComponentPlan {
  status: "READY" | "REJECTED";
  mode: ClassroomComponentPlanMode;
  profileId: ClassroomComponentProfileId;
  currentBindingId: string;
  currentEpisodeId: string;
  currentScreenId: string;
  accepted: readonly ClassroomComponentPlanItem[];
  rejected: readonly (ClassroomComponentPlanItem & { reason: string })[];
  trustedViewerContexts: ClassroomComponentTrustedViewerContexts;
  blueprintId: string;
  contextReminderId: string | null;
  source: "LESSON_PACKAGE_BLUEPRINT_BINDING_CURSOR";
}

function buildProfileItems(
  profileId: ClassroomComponentProfileId,
  stageComponentId: string,
  contextReminderId: string | undefined,
  revision: number,
): readonly ClassroomComponentPlanItem[] {
  const sharedStageItems: ClassroomComponentPlanItem[] = [
    { componentId: stageComponentId, hostId: "CLASSROOM_STAGE" },
    {
      componentId: stageComponentId,
      hostId: "STUDENT_DISPLAY",
      safeStudentProjection: createSafeStudentProjection({
        projectionId: `m1:${stageComponentId}:${revision}`,
        sourceComponentId: stageComponentId,
      }),
    },
  ];
  const sidecarItems: ClassroomComponentPlanItem[] = [
    { componentId: "classroom.sidecar.lesson-flow", hostId: "CLASSROOM_SIDECAR" },
  ];
  if (contextReminderId)
    sidecarItems.push({
      componentId: "xiaojiao.classroom.context-reminder",
      hostId: "CLASSROOM_SIDECAR",
    });
  if (["OBSERVATION_COMPARE", "STUDENT_PRACTICE", "SHOWCASE_EVALUATION"].includes(profileId))
    sidecarItems.splice(1, 0, {
      componentId: "classroom.sidecar.student-status-summary",
      hostId: "CLASSROOM_SIDECAR",
    });
  if (profileId === "STUDENT_PRACTICE")
    sidecarItems.splice(2, 0, {
      componentId: "classroom.sidecar.recent-events",
      hostId: "CLASSROOM_SIDECAR",
    });
  if (profileId === "TEACHER_DEMONSTRATION")
    sidecarItems.splice(1, 0, {
      componentId: "classroom.art.material-checklist",
      hostId: "CLASSROOM_SIDECAR",
    });

  return Object.freeze([
    ...sharedStageItems,
    ...sidecarItems,
    { componentId: "classroom.note.quick-capture", hostId: "CLASSROOM_OVERLAY" },
    { componentId: "classroom.overlay.action-receipt", hostId: "CLASSROOM_OVERLAY" },
    { componentId: "classroom.control.primary-dock", hostId: "CLASSROOM_DOCK" },
    { componentId: "xiaojiao.global.input-dock", hostId: "GLOBAL_AGENT_DOCK" },
  ]);
}

export function compileClassroomComponentPlan(input: {
  classroomPackage: LessonClassroomPackage;
  blueprint: ClassroomCompositionBlueprint;
  currentBindingId: string;
  currentEpisode: ClassroomEpisode;
  mode: ClassroomComponentPlanMode;
  fixtureStateRevision: number;
}): Readonly<ClassroomComponentPlan> {
  if (input.blueprint.lessonId !== input.classroomPackage.lesson.lessonId)
    throw new Error("CLASSROOM_COMPOSITION_BLUEPRINT_LESSON_MISMATCH");
  const binding = input.classroomPackage.screenBindings.find(
    (item) => item.bindingId === input.currentBindingId,
  );
  if (!binding || binding.episodeId !== input.currentEpisode.episodeId)
    throw new Error("CLASSROOM_COMPONENT_PLAN_BINDING_CURSOR_INVALID");
  const screen = input.classroomPackage.screens.find(
    (item) => item.screenId === binding.screenId,
  );
  if (!screen) throw new Error("CLASSROOM_COMPONENT_PLAN_SCREEN_NOT_FOUND");

  const trustedViewerContexts: ClassroomComponentTrustedViewerContexts =
    Object.freeze({
      CLASSROOM_STAGE: createClassroomComponentTrustedViewerContext({ hostId: "CLASSROOM_STAGE", viewer: "TEACHER", contextRevision: input.fixtureStateRevision }),
      CLASSROOM_SIDECAR: createClassroomComponentTrustedViewerContext({ hostId: "CLASSROOM_SIDECAR", viewer: "TEACHER", contextRevision: input.fixtureStateRevision }),
      CLASSROOM_OVERLAY: createClassroomComponentTrustedViewerContext({ hostId: "CLASSROOM_OVERLAY", viewer: "TEACHER", contextRevision: input.fixtureStateRevision }),
      CLASSROOM_DOCK: createClassroomComponentTrustedViewerContext({ hostId: "CLASSROOM_DOCK", viewer: "TEACHER", contextRevision: input.fixtureStateRevision }),
      STUDENT_DISPLAY: createClassroomComponentTrustedViewerContext({ hostId: "STUDENT_DISPLAY", viewer: "STUDENT", contextRevision: input.fixtureStateRevision }),
      GLOBAL_AGENT_DOCK: createClassroomComponentTrustedViewerContext({ hostId: "GLOBAL_AGENT_DOCK", viewer: "TEACHER", contextRevision: input.fixtureStateRevision }),
    });
  const compositionEntry = resolveClassroomCompositionEntry(input.blueprint, {
    episodeId: input.currentEpisode.episodeId,
    bindingId: input.currentBindingId,
  });
  const profileId = compositionEntry.profileId;
  const contractPlan = compileClassroomComponentPlanR0(
    buildProfileItems(
      profileId,
      compositionEntry.stageComponentId,
      compositionEntry.contextReminderId,
      input.fixtureStateRevision,
    ),
    trustedViewerContexts,
  );
  return Object.freeze({
    status: contractPlan.status === "VALID_CONTRACT_ONLY" ? "READY" : "REJECTED",
    mode: input.mode,
    profileId,
    currentBindingId: input.currentBindingId,
    currentEpisodeId: input.currentEpisode.episodeId,
    currentScreenId: screen.screenId,
    accepted: contractPlan.accepted,
    rejected: Object.freeze(
      contractPlan.rejected.map((item) => ({ ...item, reason: item.reason })),
    ),
    trustedViewerContexts,
    blueprintId: input.blueprint.blueprintId,
    contextReminderId: compositionEntry.contextReminderId ?? null,
    source: "LESSON_PACKAGE_BLUEPRINT_BINDING_CURSOR",
  });
}
