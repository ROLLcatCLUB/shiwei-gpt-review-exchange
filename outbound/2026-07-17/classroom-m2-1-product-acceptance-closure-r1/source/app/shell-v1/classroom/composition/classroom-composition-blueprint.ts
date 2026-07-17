export const classroomComponentProfileIds = [
  "OBSERVATION_COMPARE",
  "TEACHER_DEMONSTRATION",
  "STUDENT_PRACTICE",
  "SHOWCASE_EVALUATION",
  "CLEANUP_AND_CLOSE",
] as const;

export type ClassroomComponentProfileId =
  (typeof classroomComponentProfileIds)[number];

export interface ClassroomCompositionBlueprintEntry {
  episodeId: string;
  bindingScope: readonly string[];
  profileId: ClassroomComponentProfileId;
  stageComponentId: string;
  contextReminderId?: string;
}

export interface ClassroomCompositionBlueprint {
  blueprintId: string;
  lessonId: string;
  entries: readonly ClassroomCompositionBlueprintEntry[];
  unknownCompositionPolicy: "REJECTED_UNKNOWN_COMPOSITION";
}

export function resolveClassroomCompositionEntry(
  blueprint: ClassroomCompositionBlueprint,
  input: { episodeId: string; bindingId: string },
): Readonly<ClassroomCompositionBlueprintEntry> {
  const entry = blueprint.entries.find(
    (candidate) => candidate.episodeId === input.episodeId,
  );
  if (!entry || !entry.bindingScope.includes(input.bindingId))
    throw new Error(
      `REJECTED_UNKNOWN_COMPOSITION:${blueprint.blueprintId}:${input.episodeId}:${input.bindingId}`,
    );
  if (!classroomComponentProfileIds.includes(entry.profileId))
    throw new Error(
      `REJECTED_UNKNOWN_COMPOSITION_PROFILE:${blueprint.blueprintId}:${entry.profileId}`,
    );
  return entry;
}
