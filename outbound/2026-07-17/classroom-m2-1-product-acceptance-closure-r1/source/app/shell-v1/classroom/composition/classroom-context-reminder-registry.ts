import type { ClassroomComponentProfileId } from "./classroom-composition-blueprint.ts";

export type ClassroomContextReminderResumePolicy = Readonly<{
  mode: "NEXT_BINDING_OR_PROFILE";
  teacherCopy: string;
}>;

export interface ClassroomContextReminderCandidate {
  reminderId: string;
  profileId: ClassroomComponentProfileId;
  bindingScope: readonly string[];
  title: string;
  judgement: string;
  evidence: string;
  suggestions: readonly string[];
  resumePolicy: ClassroomContextReminderResumePolicy;
}

export type ClassroomContextReminderRegistry = readonly Readonly<ClassroomContextReminderCandidate>[];

const nextContextPolicy = Object.freeze({
  mode: "NEXT_BINDING_OR_PROFILE",
  teacherCopy: "切换到下一屏或下一环节时，再按新的课堂位置判断是否出现。",
}) satisfies ClassroomContextReminderResumePolicy;

export const classroomContextReminderRegistry: ClassroomContextReminderRegistry =
  Object.freeze([
    Object.freeze({
      reminderId: "xiaojiao-observation-compare",
      profileId: "OBSERVATION_COMPARE",
      bindingScope: Object.freeze(["B001", "B002", "B003", "B004", "B005"]),
      title: "学生开始说出颜色如何慢慢变化",
      judgement: "多数学生已经能从画面中找到连续变化，但仍需确认他们是否理解中间色的作用。",
      evidence: "观察与比较环节的学生口头回应及当前大屏内容。",
      suggestions: Object.freeze([
        "请一位学生指出最自然的过渡位置。",
        "再比较一次连续变化与突然跳变。",
      ]),
      resumePolicy: nextContextPolicy,
    }),
    Object.freeze({
      reminderId: "xiaojiao-teacher-demonstration",
      profileId: "TEACHER_DEMONSTRATION",
      bindingScope: Object.freeze(["B006", "B007", "B008"]),
      title: "示范进入关键连接步骤",
      judgement: "学生需要看清先调中间色、再连接两端的顺序，不宜只记住动作名称。",
      evidence: "当前示范步骤、材料清单与学生观察状态。",
      suggestions: Object.freeze([
        "在加入中间色前短暂停一下。",
        "请学生先说出下一步，再继续示范。",
      ]),
      resumePolicy: nextContextPolicy,
    }),
    Object.freeze({
      reminderId: "xiaojiao-student-practice",
      profileId: "STUDENT_PRACTICE",
      bindingScope: Object.freeze(["B009"]),
      title: "练习中先看材料操作与过渡关系",
      judgement: "当前更需要区分是调色步骤没理解，还是取水、换笔等材料操作拖慢了进度。",
      evidence: "学生实践环节的完成状态、需帮助标记与材料使用情况。",
      suggestions: Object.freeze([
        "先观察需帮助学生卡在哪一步。",
        "必要时只提醒材料顺序，不替学生完成。",
      ]),
      resumePolicy: nextContextPolicy,
    }),
    Object.freeze({
      reminderId: "xiaojiao-showcase-evaluation",
      profileId: "SHOWCASE_EVALUATION",
      bindingScope: Object.freeze(["B010"]),
      title: "作品交流应回到可见的颜色证据",
      judgement: "展示时应先说出画面中的过渡依据，再形成评价，不把标签当成结论。",
      evidence: "匿名作品画廊与本课渐变关系的成功标准。",
      suggestions: Object.freeze([
        "请学生指出一处自然过渡。",
        "把不同感受和画面证据分开表达。",
      ]),
      resumePolicy: nextContextPolicy,
    }),
    Object.freeze({
      reminderId: "xiaojiao-cleanup-and-close",
      profileId: "CLEANUP_AND_CLOSE",
      bindingScope: Object.freeze(["B011"]),
      title: "先收作品，再完成材料归位",
      judgement: "结束环节的重点是材料安全和作品保护，不再追加新的学习任务。",
      evidence: "当前收纳步骤与材料清单的完成状态。",
      suggestions: Object.freeze([
        "先确认作品已放到安全位置。",
        "再检查画笔、清水和调色盘是否归位。",
      ]),
      resumePolicy: nextContextPolicy,
    }),
  ]);

export function resolveClassroomContextReminderCandidate(input: {
  reminderId?: string | null;
  profileId: ClassroomComponentProfileId;
  bindingId: string;
}): Readonly<ClassroomContextReminderCandidate> | null {
  if (!input.reminderId) return null;
  return (
    classroomContextReminderRegistry.find(
      (candidate) =>
        candidate.reminderId === input.reminderId &&
        candidate.profileId === input.profileId &&
        candidate.bindingScope.includes(input.bindingId),
    ) ?? null
  );
}

export function resolveClassroomContextReminderVisibility(input: {
  candidate: Readonly<ClassroomContextReminderCandidate>;
  state: "VISIBLE" | "DEFERRED" | "DISMISSED" | undefined;
  deferredAtBindingId?: string;
  currentBindingId: string;
}): "VISIBLE" | "HIDDEN_DEFERRED" | "HIDDEN_DISMISSED" {
  if (input.state === "DISMISSED") return "HIDDEN_DISMISSED";
  if (
    input.state === "DEFERRED" &&
    input.deferredAtBindingId === input.currentBindingId
  )
    return "HIDDEN_DEFERRED";
  return "VISIBLE";
}
