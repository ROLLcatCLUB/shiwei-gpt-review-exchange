import type {
  ClassroomFactEvent,
  ClassroomQuickMark,
} from "../../../domain/classroom-evidence/lightweight-evidence-triage.ts";
import {
  teacherProfessionalContextOptions,
  type TeacherProfessionalContextChoice,
  type TeacherWorkDecision,
} from "../../../domain/classroom-assistant/teacher-work-assistant.ts";
import type {
  TeacherWorkAssistantReviewState,
} from "./teacher-work-assistant-review-fixture.ts";
import { createTeacherWorkAssistantReviewFixture } from "./teacher-work-assistant-review-fixture.ts";

type TeacherAssistantNavigationTarget = "preparation" | "current" | "record";

export function TeacherWorkAssistantNavigation({
  active,
  onNavigate,
}: {
  active: "preparation" | "current" | "record";
  onNavigate: (target: TeacherAssistantNavigationTarget) => void;
}) {
  const items: Array<{
    id: typeof active;
    target: TeacherAssistantNavigationTarget;
    icon: string;
    label: string;
    description: string;
  }> = [
    {
      id: "preparation",
      target: "preparation",
      icon: "备",
      label: "课前准备",
      description: "按课表接住下一节课",
    },
    {
      id: "current",
      target: "current",
      icon: "课",
      label: "当前课堂",
      description: "舞台、提示与随手记",
    },
    {
      id: "record",
      target: "record",
      icon: "记",
      label: "课堂记录",
      description: "事实、判断与决定",
    },
  ];
  return (
    <>
      <p className="sv1-classroom-space-label">教师工作助手</p>
      <nav aria-label="教师工作助手一级导航">
        {items.map((item) => (
          <button
            type="button"
            key={item.id}
            className={active === item.id ? "active" : ""}
            onClick={() => onNavigate(item.target)}
          >
            <i>{item.icon}</i>
            <span>
              <b>{item.label}</b>
              <small>{item.description}</small>
            </span>
          </button>
        ))}
      </nav>
      <div className="sv1-teacher-assistant-boundary-note">
        <b>模拟课堂 · 不产生正式记录</b>
        <span>小教接住整理，关键决定仍由教师作。</span>
      </div>
    </>
  );
}

const journeyLabels = [
  "课前准备",
  "当前课堂",
  "课后整理",
  "课堂记录",
  "下一班提醒",
] as const;

function journeyIndex(reviewState: TeacherWorkAssistantReviewState) {
  if (reviewState === "preparation" || reviewState === "ready") return 0;
  if (["live", "live-expanded", "marked", "closing"].includes(reviewState))
    return 1;
  if (
    [
      "postclass",
      "question",
      "recommendation",
      "recommendation-material",
      "recommendation-extension",
      "recommendation-uncertain",
      "not-a-problem",
      "decision",
      "no-findings",
    ].includes(reviewState)
  )
    return 2;
  if (reviewState === "record") return 3;
  return 4;
}

export function TeacherWorkAssistantJourneyBar({
  reviewState,
  classLabel,
  lessonTitle,
}: {
  reviewState: TeacherWorkAssistantReviewState;
  classLabel?: string;
  lessonTitle?: string;
}) {
  const fixture = createTeacherWorkAssistantReviewFixture(reviewState);
  const activeIndex = journeyIndex(reviewState);
  const displayedClassLabel =
    classLabel ||
    (fixture.snapshot.view === "PRE_CLASS_PREPARATION"
      ? fixture.data.targetClass.classLabel
      : fixture.data.sourceClass.classLabel);
  const displayedLessonTitle = lessonTitle || fixture.data.sourceClass.lessonTitle;
  return (
    <section className="sv1-teacher-assistant-journey-bar" aria-label="教师工作助手生命周期">
      <div className="sv1-teacher-assistant-journey-status">
        <span>{displayedClassLabel} · 《{displayedLessonTitle}》</span>
        <b>{fixture.snapshot.statusLabel}</b>
      </div>
      <ol>
        {journeyLabels.map((label, index) => (
          <li
            key={label}
            className={index === activeIndex ? "active" : index < activeIndex ? "done" : ""}
          >
            <i>{index < activeIndex ? "✓" : index + 1}</i>
            <span>{label}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function TeacherWorkAssistantPreparationPanel({
  reviewState,
}: {
  reviewState: "preparation" | "ready" | "next-preparation";
}) {
  const fixture = createTeacherWorkAssistantReviewFixture(reviewState);
  const reminder = fixture.snapshot.nextOccurrenceReminder;
  const { data } = fixture;
  return (
    <section className="sv1-teacher-assistant-preparation">
      <article className="sv1-teacher-assistant-next-lesson">
        <div className="sv1-teacher-assistant-lesson-art" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="sv1-teacher-assistant-next-copy">
          <span>下一节课 · {data.targetClass.scheduleLabel}</span>
          <h2>{data.targetClass.classLabel} · 《{data.targetClass.lessonTitle}》</h2>
          <strong>✓ {data.targetClass.preparationStatus}</strong>
          <p>{data.targetClass.previewSummary}</p>
          <div>
            <button type="button" className="primary">课前预览</button>
            <button type="button">查看全部课程</button>
          </div>
        </div>
      </article>

      {reminder && (
        <article className="sv1-teacher-assistant-reminder">
          <header>
            <div><i>接</i><span><b>来自上一班的提醒</b><small>来自教师已确认的决定</small></span></div>
            <em>下一班课前</em>
          </header>
          <div className="sv1-teacher-assistant-reminder-grid">
            <section><span>上一班发生的事实</span><p>{reminder.previousClassFact}。</p></section>
            <section><span>教师确认的现实原因</span><p>{reminder.teacherConfirmedContext}。</p></section>
            <section><span>当前班情境差异</span><p>{reminder.currentClassDifference}</p></section>
            <section className="recommendation"><span>已确认建议</span><p>{reminder.confirmedRecommendation}</p></section>
          </div>
          <button type="button" className="primary">{reminder.primaryActionLabel}</button>
        </article>
      )}

      <div className="sv1-teacher-assistant-preparation-grid">
        <article className="sv1-teacher-assistant-today">
          <header><b>今天的课</b><small>课表是课前准备的时间骨架</small></header>
          <div>
            {data.todayLessons.map((lesson) => (
              <button type="button" key={`${lesson.time}-${lesson.classLabel}`}>
                <time>{lesson.time}<small>{lesson.period}</small></time>
                <span><b>{lesson.classLabel} · {lesson.lessonTitle}</b><small>课堂包与课次已绑定</small></span>
                <em>{lesson.status}</em>
              </button>
            ))}
          </div>
        </article>
        <article className="sv1-teacher-assistant-directory">
          <header><b>全部课程</b><button type="button">打开课程目录 ›</button></header>
          <div>
            {data.courseDirectory.map((lesson, index) => (
              <button type="button" key={lesson.lessonTitle}>
                <i className={`tone-${index + 1}`} />
                <span><small>{lesson.grade} · {lesson.unit}</small><b>{lesson.lessonTitle}</b><em>{lesson.status}</em></span>
              </button>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

const assistantQuickMarks: Array<{
  value: ClassroomQuickMark | "ONE_LINE_NOTE";
  label: string;
}> = [
  { value: "NOT_UNDERSTOOD", label: "学生没跟上" },
  { value: "TIME_SHORT", label: "时间不够" },
  { value: "MATERIAL_ISSUE", label: "材料问题" },
  { value: "EFFECTIVE", label: "这里有效" },
  { value: "ONE_LINE_NOTE", label: "说一句" },
];

const quickMarkFactLabels: Partial<Record<ClassroomQuickMark, string>> = {
  NOT_UNDERSTOOD: "学生没跟上",
  TIME_SHORT: "时间不够",
  MATERIAL_ISSUE: "材料问题",
  EFFECTIVE: "这里有效",
};

function classroomFactDetail(
  fallback: string,
  latestClassroomFact?: ClassroomFactEvent | null,
) {
  if (!latestClassroomFact) return fallback;
  if (latestClassroomFact.note)
    return `示范原定6分钟，实际用了11分钟；教师在当时留下一句话：“${latestClassroomFact.note}”`;
  const markLabel = latestClassroomFact.quickMark
    ? quickMarkFactLabels[latestClassroomFact.quickMark]
    : null;
  return markLabel
    ? `示范原定6分钟，实际用了11分钟；教师回看了示范画面，并留下一次“${markLabel}”标记。`
    : fallback;
}

export function TeacherWorkAssistantQuickMark({
  expanded,
  activeMark,
  onToggle,
  onMark,
  onSayOneLine,
}: {
  expanded: boolean;
  activeMark: ClassroomQuickMark | null;
  onToggle: () => void;
  onMark: (mark: ClassroomQuickMark) => void;
  onSayOneLine: () => void;
}) {
  return (
    <aside className={`sv1-teacher-assistant-quick-mark ${expanded ? "is-open" : ""}`} aria-label="课堂随手记">
      <button
        type="button"
        className="sv1-teacher-assistant-quick-mark-trigger"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <i>记</i><span><b>随手记</b><small>只记位置，下课后再整理</small></span><em>{expanded ? "收起" : "展开"}</em>
      </button>
      {expanded && (
        <div className="sv1-teacher-assistant-quick-mark-options">
          {assistantQuickMarks.map((mark) => (
            <button
              type="button"
              key={mark.value}
              className={activeMark === mark.value ? "active" : ""}
              onClick={() =>
                mark.value === "ONE_LINE_NOTE"
                  ? onSayOneLine()
                  : onMark(mark.value)
              }
            >
              {mark.label}
            </button>
          ))}
          <small>选择后自动收起；“说一句”只形成待整理文本，不在课堂中追问。</small>
        </div>
      )}
    </aside>
  );
}

function recommendationStates(reviewState: TeacherWorkAssistantReviewState) {
  return [
    "recommendation",
    "recommendation-material",
    "recommendation-extension",
    "recommendation-uncertain",
  ].includes(reviewState);
}

const teacherDecisionLabels: Record<TeacherWorkDecision["action"], string> = {
  NEXT_CLASS_TRIAL: "下一班试用",
  RECORD_ONLY: "仅记录本次课堂",
  EDIT_BEFORE_TRIAL: "调整后再试用",
  MATCHING_CONTEXTS: "仅用于条件相近班级",
  SEND_TO_PREP_ROOM: "作为备课候选保留",
  IGNORE: "忽略本次建议",
  NO_CHANGE_REQUIRED: "这不是问题，不需调整",
};

export function TeacherWorkAssistantPostclassPanel({
  reviewState,
  selectedContextChoice,
  selectedDecisionAction,
  contextNote = "",
  latestClassroomFact,
  onAnswerOne,
  onSelectContext,
  onContextNoteChange,
  onConfirmOtherContext,
  onDefer,
  onSkip,
  onDecision,
  onContinueAfterDecision,
}: {
  reviewState:
    | "postclass"
    | "question"
    | "recommendation"
    | "recommendation-material"
    | "recommendation-extension"
    | "recommendation-uncertain"
    | "not-a-problem"
    | "decision"
    | "no-findings";
  selectedContextChoice?: TeacherProfessionalContextChoice | null;
  selectedDecisionAction?: TeacherWorkDecision["action"] | null;
  contextNote?: string;
  latestClassroomFact?: ClassroomFactEvent | null;
  onAnswerOne?: () => void;
  onSelectContext?: (choice: TeacherProfessionalContextChoice) => void;
  onContextNoteChange?: (note: string) => void;
  onConfirmOtherContext?: () => void;
  onDefer?: () => void;
  onSkip?: () => void;
  onDecision?: (action: TeacherWorkDecision["action"]) => void;
  onContinueAfterDecision?: () => void;
}) {
  const fixture = createTeacherWorkAssistantReviewFixture(reviewState, {
    ...(selectedContextChoice
      ? { selectedContextChoice }
      : {}),
    ...(contextNote ? { selectedContextNote: contextNote } : {}),
    ...(selectedDecisionAction
      ? { selectedDecisionAction }
      : {}),
  });
  const { data, assessment, snapshot } = fixture;
  const displayedFactDetail = classroomFactDetail(
    data.sourceClass.factDetail,
    latestClassroomFact,
  );
  if (reviewState === "no-findings")
    return (
      <section className="sv1-teacher-assistant-no-findings">
        <div className="sv1-teacher-assistant-no-findings-mark">✓</div>
        <span>课后快速整理</span>
        <h2>本节未发现需要立即处理的明显事项。</h2>
        <p>课堂记录已保存。</p>
        <small>没有明显信号不等于证明课堂完全按计划完成。</small>
        <button type="button" className="primary" onClick={onContinueAfterDecision}>返回课前准备</button>
      </section>
    );

  const showQuestion = reviewState === "question";
  const showRecommendation = recommendationStates(reviewState);
  const selectedChoice = selectedContextChoice ?? snapshot.teacherResponse?.choice;
  const recommendation = snapshot.recommendation;
  return (
    <section className="sv1-teacher-assistant-postclass">
      <div className="sv1-teacher-assistant-postclass-heading">
        <span>课后快速整理</span>
        <h2>小教整理出 1 个需要教师情境判断的地方</h2>
        <p>只回答一个现实问题，也可以稍后再看。完整事实默认收起。</p>
      </div>
      <article className="sv1-teacher-assistant-finding">
        <header>
          <div><span>课堂事实 · 示范环节</span><b>{data.sourceClass.factTitle}</b></div>
          <small>1 / 1</small>
        </header>
        <div className="sv1-teacher-assistant-fact">
          <b>课堂中发生了什么</b>
          <p>{displayedFactDetail}</p>
          <details>
            <summary>查看当时的事实记录</summary>
            <ul>
              <li>事实自动绑定课次、Episode、Binding、Screen 和时间。</li>
              <li>课堂中的教师标记只作为事实来源，不等于原因判断。</li>
              <li>本页没有调用模型，也没有写入数据库。</li>
            </ul>
          </details>
        </div>
        <div className="sv1-teacher-assistant-first-pass">
          <span>小教初步判断 · 尚未确认</span>
          <p>{data.sourceClass.firstPassAssessment}</p>
          <small>{assessment.candidateExplanations[0]?.text}</small>
        </div>

        {showQuestion && (
          <div className="sv1-teacher-assistant-question">
            <b>这次更接近哪种现实情况？</b>
            <p>只选一项。教师的情境判断不会被小教的初步判断替代。</p>
            <div>
              {teacherProfessionalContextOptions.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={selectedChoice === option.value ? "selected" : ""}
                  onClick={() => onSelectContext?.(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {selectedChoice === "OTHER_CONTEXT" && (
              <div className="sv1-teacher-assistant-other-context">
                <input
                  value={contextNote}
                  maxLength={80}
                  onChange={(event) => onContextNoteChange?.(event.target.value)}
                  placeholder="一句话补充本次课堂情况"
                  aria-label="其他课堂情况"
                />
                <button
                  type="button"
                  className="primary"
                  disabled={!contextNote.trim()}
                  onClick={onConfirmOtherContext}
                >
                  记录这句话
                </button>
              </div>
            )}
            <button type="button" className="later" onClick={onDefer}>稍后再看</button>
          </div>
        )}

        {reviewState === "not-a-problem" && (
          <div className="sv1-teacher-assistant-no-recommendation">
            <b>已按教师判断记录：这不是问题。</b>
            <p>本次不生成行动建议，也不修改下一班安排。</p>
            <button type="button" className="primary" onClick={() => onDecision?.("NO_CHANGE_REQUIRED")}>完成并查看课堂记录</button>
          </div>
        )}

        {showRecommendation && recommendation && (
          <div className="sv1-teacher-assistant-recommendation">
            <span>结合教师的现实判断</span>
            <h3>{recommendation.title}</h3>
            <p>{recommendation.summary}</p>
            <ul>
              {recommendation.applicabilityConditions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="sv1-teacher-assistant-default-actions">
              {recommendation.defaultActionLabels.map((label, index) =>
                label === "更多处理" ? (
                  <details key={label}>
                    <summary>{label}</summary>
                    <div>
                      {recommendation.allowedTeacherActions.includes("EDIT_BEFORE_TRIAL") && <button type="button" onClick={() => onDecision?.("EDIT_BEFORE_TRIAL")}>调整后试用</button>}
                      {recommendation.allowedTeacherActions.includes("MATCHING_CONTEXTS") && <button type="button" onClick={() => onDecision?.("MATCHING_CONTEXTS")}>条件相近班级可用</button>}
                      {recommendation.allowedTeacherActions.includes("SEND_TO_PREP_ROOM") && <button type="button" onClick={() => onDecision?.("SEND_TO_PREP_ROOM")}>送回备课室</button>}
                      {recommendation.allowedTeacherActions.includes("IGNORE") && <button type="button" onClick={() => onDecision?.("IGNORE")}>忽略</button>}
                    </div>
                  </details>
                ) : (
                  <button
                    type="button"
                    key={label}
                    className={index === 0 ? "primary" : ""}
                    onClick={() => onDecision?.(label === "下一班试用" ? "NEXT_CLASS_TRIAL" : "RECORD_ONLY")}
                  >
                    {label}
                  </button>
                ),
              )}
            </div>
            <small>默认只呈现 {recommendation.defaultActionLabels.length} 个操作；所有操作仍需教师确认。</small>
          </div>
        )}

        {reviewState === "decision" && snapshot.teacherDecision && (
          <div className="sv1-teacher-assistant-decision-recorded">
            <span>教师决定已记录</span>
            <h3>{teacherDecisionLabels[snapshot.teacherDecision.action]}</h3>
            <p>当前只推进模拟体验，不修改课包、不正式写回，也不替教师自动执行。</p>
            <button type="button" className="primary" onClick={onContinueAfterDecision}>
              {snapshot.teacherDecision.action === "NEXT_CLASS_TRIAL"
                ? "查看下一班课前提醒"
                : "查看课堂记录"}
            </button>
          </div>
        )}

        {reviewState === "postclass" && (
          <button type="button" className="sv1-teacher-assistant-answer-one" onClick={onAnswerOne}>回答一个现实问题</button>
        )}
      </article>
      {["postclass", "question"].includes(reviewState) && (
        <button type="button" className="sv1-teacher-assistant-skip" onClick={onSkip}>这次先不整理</button>
      )}
    </section>
  );
}

export function TeacherWorkAssistantRecordPanel({
  selectedContextChoice,
  selectedDecisionAction,
  contextNote = "",
  latestClassroomFact,
  classLabel,
  lessonTitle,
  scheduleLabel,
  onReturnPreparation,
}: {
  selectedContextChoice?: TeacherProfessionalContextChoice | null;
  selectedDecisionAction?: TeacherWorkDecision["action"] | null;
  contextNote?: string;
  latestClassroomFact?: ClassroomFactEvent | null;
  classLabel?: string;
  lessonTitle?: string;
  scheduleLabel?: string;
  onReturnPreparation?: () => void;
}) {
  const fixture = createTeacherWorkAssistantReviewFixture("record", {
    ...(selectedContextChoice ? { selectedContextChoice } : {}),
    ...(selectedDecisionAction ? { selectedDecisionAction } : {}),
    ...(contextNote ? { selectedContextNote: contextNote } : {}),
  });
  const { data, snapshot } = fixture;
  const displayedFactDetail = classroomFactDetail(
    data.sourceClass.factDetail,
    latestClassroomFact,
  );
  const decisionLabel = snapshot.teacherDecision
    ? teacherDecisionLabels[snapshot.teacherDecision.action]
    : data.record.teacherDecision;
  return (
    <section className="sv1-teacher-assistant-records">
      <div className="sv1-teacher-assistant-records-heading">
        <div><span>课堂记录</span><h2>{classLabel || data.sourceClass.classLabel} · 《{lessonTitle || data.sourceClass.lessonTitle}》</h2><p>{scheduleLabel || data.sourceClass.scheduleLabel} · 已归档 · 只读记录</p></div>
        <button type="button" onClick={onReturnPreparation}>返回课前准备</button>
      </div>
      <article className="sv1-teacher-assistant-record-card">
        <header><b>本节专业工作摘要</b><small>记录教师的专业过程，不形成质量评分</small></header>
        <ol>
          <li><i>1</i><div><span>课堂事实</span><b>{data.sourceClass.factTitle}</b><p>{displayedFactDetail}</p></div></li>
          <li><i>2</i><div><span>小教初步判断</span><b>未确认的一级研判</b><p>{data.sourceClass.firstPassAssessment}</p></div></li>
          <li><i>3</i><div><span>教师现实判断</span><b>{snapshot.teacherResponse?.label || data.record.teacherJudgment}</b><p>教师补足了系统无法独立判断的课堂情境。</p></div></li>
          <li><i>4</i><div><span>教师决定</span><b>{decisionLabel}</b><p>决定已记录；当前无真实运行时副作用。</p></div></li>
        </ol>
        <details>
          <summary>展开完整日志</summary>
          <ul>{data.record.fullLog.map((item) => <li key={item}>{item}</li>)}</ul>
        </details>
      </article>
      <aside className="sv1-teacher-assistant-record-boundary">
        <b>教师成果归教师</b>
        <span>未研究共享 · 未发布 · 未正式写回 · 未自动修改课包</span>
      </aside>
    </section>
  );
}
