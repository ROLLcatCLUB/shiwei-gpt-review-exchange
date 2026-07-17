"use client";

import {
  applyHierarchyArchivePlan,
  archiveClassroomSessionPackage,
  classroomArchiveGuard,
  createFixtureScheduleReuseCandidate,
  createHierarchyArchivePlan,
  createResearchHandoffCandidate,
  deriveClassroomWorksetPriorities,
  restoreClassroomSessionPackage,
  restoreHierarchyArchiveScope,
  type ClassroomScheduleInstance,
  type ClassroomSessionPackage,
  type HierarchyArchivePlan,
  type SemesterClassroomWorkset,
} from "../../../../domain/classroom-workset/semester-classroom-workset.ts";
import type { useClassroomWorkspaceController } from "../use-classroom-workspace-controller.ts";

type ClassroomWorkspaceController = ReturnType<typeof useClassroomWorkspaceController>;

function lessonTitle(workset: SemesterClassroomWorkset, lessonId: string) {
  return workset.lessons.find((lesson) => lesson.lessonId === lessonId)?.lessonTitle || "未命名课时";
}

function displayDate(value: string) {
  const date = new Date(value);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function workflowLabel(sessionPackage: ClassroomSessionPackage) {
  if (sessionPackage.workflowStatus === "PENDING_TRIAGE") return "待整理";
  if (sessionPackage.workflowStatus === "NEEDS_TEACHER_DECISION") return "需要教师决定";
  return "已完成";
}

function evidenceLabel(index: number) {
  return index === 0 ? "课堂节奏证据" : index === 1 ? "匿名学生响应摘要" : `课堂证据 ${index + 1}`;
}

function SectionHeader({ title, summary, expanded, onToggle }: { title: string; summary: string; expanded: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="sv1-m2-section-heading" aria-expanded={expanded} onClick={onToggle}>
      <span><b>{title}</b><small>{summary}</small></span><i>{expanded ? "收起" : "展开"}</i>
    </button>
  );
}

function ScheduleRow({ item, workset, onPreview, onStart }: {
  item: ClassroomScheduleInstance;
  workset: SemesterClassroomWorkset;
  onPreview: (lessonId: string, classId: string) => void;
  onStart?: (lessonId: string, classId: string) => void;
}) {
  return (
    <article className={`sv1-m2-schedule-row priority-${item.priority.toLowerCase()}`}>
      <time>{item.scheduleLabel}</time>
      <div>
        <b>{item.classLabel} · 《{lessonTitle(workset, item.lessonId)}》</b>
        <span>{item.anomalySummary || (item.readiness === "READY" ? "课堂包已就绪" : item.readiness === "COMPLETE" ? "课堂记录已形成" : "仍有课前事项")}</span>
      </div>
      <em className={item.readiness.toLowerCase()}>{item.readiness === "READY" ? "可上" : item.readiness === "COMPLETE" ? "已上" : "待准备"}</em>
      {item.readiness !== "COMPLETE" && <div className="sv1-m2-row-actions"><button type="button" onClick={() => onPreview(item.lessonId, item.classId)}>课前预览</button>{onStart && item.readiness === "READY" && <button type="button" className="primary" onClick={() => onStart(item.lessonId, item.classId)}>开始课堂</button>}</div>}
    </article>
  );
}

export function SemesterClassroomPreparationPanel({ workset, controller, onPreviewLesson, onStartLesson, onOpenSessionRecord }: {
  workset: SemesterClassroomWorkset;
  controller: ClassroomWorkspaceController;
  onPreviewLesson: (lessonId: string, classId: string) => void;
  onStartLesson: (lessonId: string, classId: string) => void;
  onOpenSessionRecord: (sessionPackageId: string) => void;
}) {
  const { state } = controller;
  const sourceSchedules = state.scheduleInstances.length ? state.scheduleInstances : workset.scheduleInstances;
  const schedules = deriveClassroomWorksetPriorities(sourceSchedules, {
    referenceNow: workset.referenceNow,
    pinnedLessonIds: state.pinnedLessonIds,
    frequentlyUsedLessonIds: state.frequentlyUsedLessonIds,
  });
  const query = state.preparationSearchQuery.trim().toLowerCase();
  const matchesSearch = (item: ClassroomScheduleInstance) => !query || `${item.classLabel} ${lessonTitle(workset, item.lessonId)} ${item.anomalySummary || ""}`.toLowerCase().includes(query);
  const matchesFilter = (item: ClassroomScheduleInstance) => {
    if (state.preparationFilter === "TODAY") return item.priority === "NEXT" || item.priority === "TODAY";
    if (state.preparationFilter === "WEEK") return item.priority === "WEEK";
    if (state.preparationFilter === "NEEDS_PREPARATION") return item.readiness === "NEEDS_PREPARATION";
    if (state.preparationFilter === "REMINDER") return Boolean(item.anomalySummary);
    return true;
  };
  const visibleSchedules = schedules.filter((item) => matchesSearch(item) && matchesFilter(item));
  const nextLesson = schedules.find((item) => item.priority === "NEXT") || null;
  const today = visibleSchedules.filter((item) => item.priority === "NEXT" || item.priority === "TODAY");
  const week = visibleSchedules.filter((item) => item.priority === "WEEK");
  const recent = state.sessionPackages
    .filter((item) => schedules.some((schedule) => schedule.sessionPackageId === item.sessionPackageId && schedule.priority === "RECENT_COMPLETE"))
    .filter((item) => !query || `${item.classLabel} ${lessonTitle(workset, item.lessonId)}`.toLowerCase().includes(query))
    .sort((left, right) => right.taughtAt.localeCompare(left.taughtAt)).slice(0, 6);
  const highlightedLessons = workset.lessons
    .filter((lesson) => state.pinnedLessonIds.includes(lesson.lessonId) || state.frequentlyUsedLessonIds.includes(lesson.lessonId))
    .sort((left, right) => Number(state.pinnedLessonIds.includes(right.lessonId)) - Number(state.pinnedLessonIds.includes(left.lessonId)) || left.lessonOrder - right.lessonOrder);
  const orderedLessons = (lessonIds: readonly string[]) => lessonIds.map((id) => workset.lessons.find((item) => item.lessonId === id)).filter((item): item is NonNullable<typeof item> => Boolean(item)).sort((left, right) => {
    const leftRank = (state.pinnedLessonIds.includes(left.lessonId) ? 2 : 0) + (state.frequentlyUsedLessonIds.includes(left.lessonId) ? 1 : 0);
    const rightRank = (state.pinnedLessonIds.includes(right.lessonId) ? 2 : 0) + (state.frequentlyUsedLessonIds.includes(right.lessonId) ? 1 : 0);
    return rightRank - leftRank || left.lessonOrder - right.lessonOrder;
  });

  function createReuseCandidate() {
    const editor = state.reuseScheduleEditorState;
    if (!editor) return;
    const source = [...state.sessionPackages].filter((item) => item.lessonId === editor.lessonId).sort((a, b) => b.taughtAt.localeCompare(a.taughtAt))[0];
    if (!source) {
      controller.setWorksetFeedback("这节课还没有可引用的历史课堂版本，无法建立复用候选。");
      return;
    }
    try {
      controller.addScheduleInstance(createFixtureScheduleReuseCandidate({
        ...editor,
        unitId: source.unitId,
        sourceLessonRevisionId: source.lessonRevisionId,
        sourceClassroomSnapshotId: source.classroomSnapshotId,
        existingSchedules: sourceSchedules,
        referenceNow: workset.referenceNow,
      }));
    } catch (error) {
      controller.setWorksetFeedback(String(error));
    }
  }

  return (
    <section className="sv1-m2-preparation" aria-label="本学期课堂工作集">
      <div className="sv1-m2-workset-tools">
        <label><span>查找课次</span><input aria-label="查找课次" placeholder="课程、班级或提醒" value={state.preparationSearchQuery} onChange={(event) => controller.setPreparationSearchQuery(event.target.value)} /></label>
        <button type="button" aria-expanded={state.preparationFilterDrawerOpen} onClick={() => controller.setPreparationFilterDrawerOpen(!state.preparationFilterDrawerOpen)}>筛选{state.preparationFilter === "ALL" ? "" : " · 已启用"}</button>
        {(query || state.preparationFilter !== "ALL") && <button type="button" className="clear" onClick={() => { controller.setPreparationSearchQuery(""); controller.setPreparationFilter("ALL"); }}>清除</button>}
      </div>
      {state.preparationFilterDrawerOpen && <div className="sv1-m2-filter-drawer" role="group" aria-label="课前准备筛选">{(["ALL", "TODAY", "WEEK", "NEEDS_PREPARATION", "REMINDER"] as const).map((value) => <button type="button" key={value} className={state.preparationFilter === value ? "active" : ""} onClick={() => controller.setPreparationFilter(value)}>{value === "ALL" ? "全部" : value === "TODAY" ? "今天" : value === "WEEK" ? "本周" : value === "NEEDS_PREPARATION" ? "待准备" : "有提醒"}</button>)}</div>}

      {nextLesson ? (
        <article className="sv1-m2-next-lesson">
          <div><span>下一节课 · 始终置顶</span><h2>{nextLesson.classLabel} · 《{lessonTitle(workset, nextLesson.lessonId)}》</h2><p>{nextLesson.scheduleLabel}</p><strong>{nextLesson.anomalySummary || "当前没有额外提醒"}</strong></div>
          <aside><b>课堂包已准备</b><small>上一班决定只作为提醒，不自动修改课包。</small><div><button type="button" onClick={() => onPreviewLesson(nextLesson.lessonId, nextLesson.classId)}>课前预览</button><button type="button" className="primary" onClick={() => onStartLesson(nextLesson.lessonId, nextLesson.classId)}>开始课堂</button></div></aside>
        </article>
      ) : (
        <article className="sv1-m2-empty-workset"><span>当前没有下一节课</span><h2>课表中没有待开始的课堂。</h2><p>可以查看最近完成和本学期课架，系统不会虚构“下一节课”。</p></article>
      )}

      {highlightedLessons.length > 0 && <section className="sv1-m2-highlighted-lessons"><header><b>置顶与常用</b><span>教师选择会改变工作集顺序</span></header><div>{highlightedLessons.map((lesson) => <button type="button" key={lesson.lessonId} onClick={() => controller.setReuseScheduleEditorState({ lessonId: lesson.lessonId, classId: "grade3-class5", classLabel: "三（5）班", scheduledAt: "2026-05-18T14:10:00+08:00" })}><b>{lesson.lessonTitle}</b><small>{state.pinnedLessonIds.includes(lesson.lessonId) ? "已置顶" : "常用"} · 建立复用课次</small></button>)}</div></section>}

      <section className="sv1-m2-workset-section"><SectionHeader title="今天的课" summary={`${today.length} 个课次 · 默认展开`} expanded={state.preparationSectionExpanded.today} onToggle={() => controller.togglePreparationSection("today")} />{state.preparationSectionExpanded.today && <div className="sv1-m2-schedule-list">{today.map((item) => <ScheduleRow key={item.scheduledInstanceId} item={item} workset={workset} onPreview={onPreviewLesson} onStart={item.priority === "NEXT" ? onStartLesson : undefined} />)}{!today.length && <p className="sv1-m2-inline-empty">当前筛选下没有今天的课。</p>}</div>}</section>
      <section className="sv1-m2-workset-section is-lowered"><SectionHeader title="本周课程" summary={`${week.length} 个后续课次 · ${week.filter((item) => item.anomalySummary).length} 项提醒 · 默认折叠`} expanded={state.preparationSectionExpanded.week} onToggle={() => controller.togglePreparationSection("week")} />{state.preparationSectionExpanded.week && <div className="sv1-m2-schedule-list">{week.map((item) => <ScheduleRow key={item.scheduledInstanceId} item={item} workset={workset} onPreview={onPreviewLesson} />)}{!week.length && <p className="sv1-m2-inline-empty">当前筛选下没有本周后续课次。</p>}</div>}</section>
      <section className="sv1-m2-workset-section"><SectionHeader title="最近完成" summary={`最近 7 天 · ${recent.length} 个独立课堂包`} expanded={state.preparationSectionExpanded.recent} onToggle={() => controller.togglePreparationSection("recent")} />{state.preparationSectionExpanded.recent && <div className="sv1-m2-recent-grid">{recent.map((item) => <button type="button" key={item.sessionPackageId} onClick={() => onOpenSessionRecord(item.sessionPackageId)}><span>{displayDate(item.taughtAt)} · {item.classLabel}</span><b>《{lessonTitle(workset, item.lessonId)}》</b><small>{workflowLabel(item)}</small>{item.archiveState.status === "ARCHIVED" && <em>已软归档</em>}</button>)}{!recent.length && <p className="sv1-m2-inline-empty">当前筛选下没有最近完成课堂。</p>}</div>}</section>

      <section className="sv1-m2-workset-section sv1-m2-semester-frame">
        <SectionHeader title="本学期课架" summary={`${workset.units.length} 个大单元 · ${workset.lessons.length} 个子课时 · 默认折叠`} expanded={state.preparationSectionExpanded.semester} onToggle={() => controller.togglePreparationSection("semester")} />
        {state.preparationSectionExpanded.semester && workset.units.map((unit) => {
          const unitExpanded = state.expandedUnitIds.includes(unit.unitId);
          return <article key={unit.unitId} className="sv1-m2-unit-card"><button type="button" className="sv1-m2-unit-heading" aria-expanded={unitExpanded} onClick={() => controller.toggleExpandedUnit(unit.unitId)}><span><small>大单元 · {unit.gradeLabel}</small><b>《{unit.unitTitle}》</b></span><i>{unitExpanded ? "−" : "+"}</i></button>{unitExpanded && <div className="sv1-m2-lesson-tree">{orderedLessons(unit.lessonIds).map((lesson) => {
            const lessonExpanded = state.expandedLessonIds.includes(lesson.lessonId);
            const packages = state.sessionPackages.filter((item) => item.lessonId === lesson.lessonId);
            return <section key={lesson.lessonId}><header><button type="button" aria-expanded={lessonExpanded} onClick={() => controller.toggleExpandedLesson(lesson.lessonId)}><i>{lesson.lessonOrder}</i><span><b>{lesson.lessonTitle}</b><small>{lesson.scheduleInstanceIds.length} 个班级课次 · {packages.length} 个课堂包</small></span></button><div><button type="button" className={state.pinnedLessonIds.includes(lesson.lessonId) ? "selected" : ""} onClick={() => controller.togglePinnedLesson(lesson.lessonId)}>置顶</button><button type="button" className={state.frequentlyUsedLessonIds.includes(lesson.lessonId) ? "selected" : ""} onClick={() => controller.toggleFrequentLesson(lesson.lessonId)}>常用</button></div></header>{lessonExpanded && <div className="sv1-m2-lesson-actions"><button type="button" onClick={() => nextLesson && onPreviewLesson(lesson.lessonId, nextLesson.classId)} disabled={!nextLesson}>再次预演</button><button type="button" onClick={() => controller.setReuseScheduleEditorState({ lessonId: lesson.lessonId, classId: "grade3-class5", classLabel: "三（5）班", scheduledAt: "2026-05-18T14:10:00+08:00" })}>复用到新课次</button><button type="button" onClick={() => packages[0] && onOpenSessionRecord(packages[0].sessionPackageId)} disabled={!packages.length}>查看记录</button><span>复用只建立 fixture 课次候选，不覆盖既有课堂事实。</span></div>}</section>;
          })}</div>}</article>;
        })}
      </section>

      <p className="sv1-m2-boundary-copy">系统可以根据时间和事项自动降权，但不会自动归档。所有新增课次均为 fixture 候选，刷新后重置。</p>
      {state.worksetFeedback && <p className="sv1-m2-record-feedback" role="status">{state.worksetFeedback}<button type="button" onClick={() => controller.setWorksetFeedback(null)}>关闭</button></p>}
      {state.reuseScheduleEditorState && <div className="sv1-m2-archive-dialog" role="dialog" aria-modal="true" aria-labelledby="m2-reuse-title"><button type="button" className="backdrop" aria-label="取消复用" onClick={() => controller.setReuseScheduleEditorState(null)} /><article><h2 id="m2-reuse-title">建立复用课次候选</h2><p>《{lessonTitle(workset, state.reuseScheduleEditorState.lessonId)}》将引用最近课堂的版本和快照，不改写历史课堂。</p><label>班级<input value={state.reuseScheduleEditorState.classLabel} onChange={(event) => controller.setReuseScheduleEditorState({ ...state.reuseScheduleEditorState!, classLabel: event.target.value })} /></label><label>日期时间<input type="datetime-local" value={state.reuseScheduleEditorState.scheduledAt.slice(0, 16)} onChange={(event) => controller.setReuseScheduleEditorState({ ...state.reuseScheduleEditorState!, scheduledAt: `${event.target.value}:00+08:00` })} /></label><div><button type="button" onClick={() => controller.setReuseScheduleEditorState(null)}>取消</button><button type="button" className="primary" onClick={createReuseCandidate}>建立候选</button></div></article></div>}
    </section>
  );
}

function PackageDetail({ workset, sessionPackage, controller }: { workset: SemesterClassroomWorkset; sessionPackage: ClassroomSessionPackage; controller: ClassroomWorkspaceController }) {
  const guard = classroomArchiveGuard(sessionPackage);
  const researchSelected = controller.state.researchCandidateEditorState.selectedSessionPackageIds.includes(sessionPackage.sessionPackageId);
  return (
    <article className="sv1-m2-package-detail">
      <header><div><span>班级课堂实例</span><h2>{sessionPackage.classLabel} · 《{lessonTitle(workset, sessionPackage.lessonId)}》</h2><p>{displayDate(sessionPackage.taughtAt)} · {workflowLabel(sessionPackage)}</p></div><em className={sessionPackage.archiveState.status.toLowerCase()}>{sessionPackage.archiveState.status === "ACTIVE" ? "工作中" : "已软归档"}</em></header>
      <section className="sv1-m2-package-trace"><div><b>使用的课时版本</b><strong>本节授课版本</strong></div><div><b>课堂留存</b><strong>事实快照已保存</strong></div><div><b>实际用时</b><strong>{sessionPackage.actualRecordRef.actualDurationMinutes} 分钟</strong></div><div><b>研究关系</b><strong>{sessionPackage.researchReferenceIds.length ? `${sessionPackage.researchReferenceIds.length} 个引用候选` : "尚未建立"}</strong></div></section>
      <details className="sv1-m2-technical-details"><summary>查看版本与引用详情</summary><dl><div><dt>课时版本</dt><dd><code>{sessionPackage.lessonRevisionId}</code></dd></div><div><dt>课堂快照</dt><dd><code>{sessionPackage.classroomSnapshotId}</code></dd></div><div><dt>快照哈希</dt><dd><code>{sessionPackage.snapshotHash}</code></dd></div><div><dt>实际记录引用</dt><dd><code>{sessionPackage.actualRecordRef.recordUri}</code></dd></div></dl></details>
      <section className="sv1-m2-professional-chain"><header><b>本节专业工作摘要</b><span>记录教师的专业过程，不形成质量评分</span></header><ol><li><i>1</i><div><b>课堂事实</b><p>{sessionPackage.actualRecordRef.quickNotes[0]?.summary || "课堂事实已按实际流程收拢。"}</p></div></li><li><i>2</i><div><b>小教初步判断</b><p>这是尚待教师确认的一级整理，不替代真实课堂情境。</p></div></li><li><i>3</i><div><b>教师现实判断</b><p>{sessionPackage.teacherJudgment || "尚待教师补充"}</p></div></li><li><i>4</i><div><b>教师决定</b><p>{sessionPackage.teacherDecision || "尚未作出决定"}</p></div></li></ol><details><summary>展开完整日志</summary><ul>{sessionPackage.actualRecordRef.actualFlow.map((item) => <li key={item.episodeId}>{item.title} · {item.actualMinutes} 分钟</li>)}</ul></details></section>
      <section className="sv1-m2-package-grid"><div><b>随手记</b>{sessionPackage.actualRecordRef.quickNotes.map((note) => <p key={note.noteId}>{note.summary}</p>)}</div><div><b>学生响应摘要</b><p>{sessionPackage.actualRecordRef.studentResponseSummary}</p></div><div><b>证据引用</b><p>{sessionPackage.evidenceRefs.length} 项课堂证据已关联</p><details><summary>查看引用详情</summary><ul>{sessionPackage.evidenceRefs.map((ref, index) => <li key={ref}>{evidenceLabel(index)}：<code>{ref}</code></li>)}</ul></details></div><div><b>课后反思</b><p>{sessionPackage.teacherReflectionRef ? "已有一条教师反思引用" : "尚未形成，不强制补写长篇文本"}</p></div><div><b>下一班决定</b><p>{sessionPackage.nextClassDecision || "尚无已确认回流"}</p></div><div><b>研究引用状态</b><p>{sessionPackage.researchReferenceIds.length ? "已有引用候选" : "未建立研究引用"}</p></div></section>
      <footer><button type="button" className={researchSelected ? "selected" : ""} onClick={() => controller.openResearchDrawer([sessionPackage.sessionPackageId])}>{researchSelected ? "继续编辑研究引用" : "形成研究引用候选"}</button>{sessionPackage.archiveState.status === "ARCHIVED" ? <button type="button" onClick={() => controller.setArchiveConfirmation({ kind: "SESSION", sessionPackageId: sessionPackage.sessionPackageId, mode: "RESTORE" })}>恢复到工作视图</button> : <button type="button" disabled={!guard.allowed} title={guard.blockers.join("；") || undefined} onClick={() => controller.setArchiveConfirmation({ kind: "SESSION", sessionPackageId: sessionPackage.sessionPackageId, mode: "ARCHIVE" })}>软归档</button>}{!guard.allowed && <span>归档前需处理：{guard.blockers.join("、")}</span>}{guard.notices.map((notice) => <span key={notice} className="notice">{notice}</span>)}</footer>
    </article>
  );
}

function ResearchDrawer({ workset, controller }: { workset: SemesterClassroomWorkset; controller: ClassroomWorkspaceController }) {
  const { state } = controller;
  const editor = state.researchCandidateEditorState;
  const selectedPackages = state.sessionPackages.filter((item) => editor.selectedSessionPackageIds.includes(item.sessionPackageId));
  const selectableEvidence = selectedPackages.flatMap((item) => item.evidenceRefs.map((ref, index) => ({ ref, label: evidenceLabel(index), classLabel: item.classLabel })));
  function update(patch: Partial<typeof editor>) { controller.setResearchCandidateEditorState({ ...editor, ...patch }); }
  function save() {
    const evidenceRefs = editor.selectedEvidenceRefs.length ? editor.selectedEvidenceRefs : selectedPackages.flatMap((item) => item.evidenceRefs.slice(0, 1));
    const id = state.activeResearchCandidateId || `research-ref:teacher-fixture-${state.researchHandoffCandidates.length + 1}`;
    try {
      controller.addResearchCandidate(createResearchHandoffCandidate({
        researchReferenceId: id,
        objectName: editor.objectName,
        researchQuestion: editor.researchQuestion,
        sessionPackageIds: editor.selectedSessionPackageIds,
        evidenceRefs,
        anonymized: editor.anonymized,
        teacherConfirmed: true,
        nonAnonymizedTeacherConfirmation: editor.nonAnonymizedTeacherConfirmation,
        availableSessionPackages: state.sessionPackages,
      }));
    } catch (error) { controller.setArchiveFeedback(String(error)); }
  }
  return <div className="sv1-m2-research-drawer" role="dialog" aria-modal="true" aria-labelledby="m2-research-title"><button type="button" className="backdrop" aria-label="取消研究引用编辑" onClick={controller.cancelResearchEditor} /><article><header><div><span>研究引用候选</span><h2 id="m2-research-title">只建立引用，不移动课堂记录</h2></div><em>研究室 HOLD</em></header><div className="sv1-m2-research-form"><label>研究对象名称<input value={editor.objectName} onChange={(event) => update({ objectName: event.target.value })} /></label><label>研究问题<textarea value={editor.researchQuestion} onChange={(event) => update({ researchQuestion: event.target.value })} /></label><label className="check"><input type="checkbox" checked={editor.anonymized} onChange={(event) => update({ anonymized: event.target.checked, nonAnonymizedTeacherConfirmation: false })} />使用匿名化引用</label>{!editor.anonymized && <label className="check warning"><input type="checkbox" checked={editor.nonAnonymizedTeacherConfirmation} onChange={(event) => update({ nonAnonymizedTeacherConfirmation: event.target.checked })} />我确认本次非匿名引用仅为 fixture，不进入研究室</label>}</div><div className="sv1-m2-research-selection"><b>已选课堂实例 {editor.selectedSessionPackageIds.length}</b>{selectedPackages.map((item) => <button type="button" key={item.sessionPackageId} onClick={() => controller.toggleResearchSessionPackage(item.sessionPackageId)}>{item.classLabel} · {lessonTitle(workset, item.lessonId)} ×</button>)}</div><div className="sv1-m2-evidence-selection"><b>引用证据 {editor.selectedEvidenceRefs.length}</b><p>未选择时，每节课堂只引用首条代表性证据。</p><div>{selectableEvidence.map((item) => { const selected = editor.selectedEvidenceRefs.includes(item.ref); return <button type="button" key={item.ref} className={selected ? "selected" : ""} aria-pressed={selected} onClick={() => controller.toggleResearchEvidence(item.ref)}><span>{selected ? "✓" : "○"}</span><span><b>{item.classLabel} · {item.label}</b><small>引用课堂中已留存的证据</small></span></button>; })}{!selectableEvidence.length && <span>请先选择至少一节课堂。</span>}</div></div><footer><button type="button" onClick={controller.cancelResearchEditor}>取消</button><button type="button" className="primary" disabled={!editor.selectedSessionPackageIds.length || !editor.objectName.trim() || !editor.researchQuestion.trim() || (!editor.anonymized && !editor.nonAnonymizedTeacherConfirmation)} onClick={save}>教师确认并保存候选</button></footer></article></div>;
}

export function SemesterClassroomRecordPanel({ workset, controller, onReturnPreparation }: { workset: SemesterClassroomWorkset; controller: ClassroomWorkspaceController; onReturnPreparation: () => void }) {
  const { state } = controller;
  const pending = state.sessionPackages.filter((item) => item.workflowStatus === "PENDING_TRIAGE" && item.archiveState.status !== "ARCHIVED");
  const decisions = state.sessionPackages.filter((item) => item.workflowStatus === "NEEDS_TEACHER_DECISION" && item.archiveState.status !== "ARCHIVED");
  const recent = [...state.sessionPackages].sort((left, right) => right.taughtAt.localeCompare(left.taughtAt)).slice(0, 6);
  const baseList = state.recordPriorityFilter === "PRIORITY" ? [...pending, ...decisions] : state.recordPriorityFilter === "RECENT" ? recent : state.sessionPackages;
  const recordQuery = state.recordSearchQuery.trim().toLowerCase();
  const list = [...new Map(baseList.map((item) => [item.sessionPackageId, item])).values()].filter((item) => {
    if (recordQuery && !`${item.classLabel} ${lessonTitle(workset, item.lessonId)}`.toLowerCase().includes(recordQuery)) return false;
    if (state.recordUnitFilter !== "ALL" && item.unitId !== state.recordUnitFilter) return false;
    if (state.recordWorkflowFilter !== "ALL" && item.workflowStatus !== state.recordWorkflowFilter) return false;
    if (state.recordArchiveFilter !== "ALL" && item.archiveState.status !== state.recordArchiveFilter) return false;
    return true;
  });
  const selectedPackage = state.sessionPackages.find((item) => item.sessionPackageId === state.selectedSessionPackageId) || list[0] || null;
  const selectedSummary = workset.acrossClassesSummaries.find((item) => item.summaryId === state.selectedAcrossSummaryId) || null;
  const archiveConfirmation = state.archiveConfirmation;
  const archiveTarget = archiveConfirmation?.kind === "SESSION" ? state.sessionPackages.find((item) => item.sessionPackageId === archiveConfirmation.sessionPackageId) || null : null;
  let hierarchyPlan: HierarchyArchivePlan | null = null;
  if (archiveConfirmation?.kind === "HIERARCHY" && archiveConfirmation.mode === "ARCHIVE") {
    try { hierarchyPlan = createHierarchyArchivePlan({ scope: archiveConfirmation.scope, scopeId: archiveConfirmation.scopeId, sessionPackages: state.sessionPackages }); } catch { hierarchyPlan = null; }
  }

  function confirmArchiveChange() {
    if (!archiveConfirmation) return;
    try {
      if (archiveConfirmation.kind === "SESSION" && archiveTarget) {
        controller.replaceSessionPackage(archiveConfirmation.mode === "ARCHIVE" ? archiveClassroomSessionPackage(archiveTarget, { teacherConfirmed: true, reason: "教师确认暂时移出本学期工作视图", changedAt: workset.referenceNow }) : restoreClassroomSessionPackage(archiveTarget, { teacherConfirmed: true, changedAt: workset.referenceNow }));
      } else if (archiveConfirmation.kind === "HIERARCHY") {
        const next = archiveConfirmation.mode === "ARCHIVE" && hierarchyPlan ? applyHierarchyArchivePlan(state.sessionPackages, hierarchyPlan, { teacherConfirmed: true, changedAt: workset.referenceNow }) : restoreHierarchyArchiveScope(state.sessionPackages, { scope: archiveConfirmation.scope, scopeId: archiveConfirmation.scopeId, teacherConfirmed: true, changedAt: workset.referenceNow });
        controller.replaceSessionPackages(next);
      }
      controller.setArchiveFeedback(archiveConfirmation.mode === "ARCHIVE" ? hierarchyPlan?.partialArchiveRequired ? `已软归档 ${hierarchyPlan.archivableCount} 节可归档课堂；${hierarchyPlan.blockedCount} 节待处理课堂保持在工作视图。` : "已软归档，可随时恢复；没有删除任何课堂记录。" : "已恢复到本学期课堂工作视图。");
    } catch (error) { controller.setArchiveFeedback(String(error)); }
    controller.setArchiveConfirmation(null);
  }

  function openCandidate(id: string) {
    const candidate = state.researchHandoffCandidates.find((item) => item.researchReferenceId === id);
    if (!candidate) return;
    controller.setActiveResearchCandidateId(id);
    controller.setResearchCandidateEditorState({ objectName: candidate.objectName, researchQuestion: candidate.researchQuestion, anonymized: candidate.anonymized, nonAnonymizedTeacherConfirmation: false, selectedSessionPackageIds: candidate.sessionPackageIds, selectedEvidenceRefs: candidate.evidenceRefs });
    controller.setResearchDrawerOpen(true);
  }

  const activeArchiveTitle = archiveConfirmation?.kind === "SESSION" && archiveTarget ? `${archiveTarget.classLabel} · 《${lessonTitle(workset, archiveTarget.lessonId)}》` : archiveConfirmation?.kind === "HIERARCHY" ? archiveConfirmation.scope === "LESSON" ? `课时《${lessonTitle(workset, archiveConfirmation.scopeId)}》` : `大单元《${workset.units.find((item) => item.unitId === archiveConfirmation.scopeId)?.unitTitle || "未命名"}》` : "";

  return (
    <section className="sv1-m2-records" aria-label="课堂记录工作集">
      <header className="sv1-m2-record-priority"><div><span>先处理仍需教师工作的课堂</span><h2>待整理 {pending.length} · 需要教师决定 {decisions.length}</h2><p>最近课堂在后；已软归档内容不会被删除。</p></div><button type="button" onClick={onReturnPreparation}>返回课前准备</button></header>
      <div className="sv1-m2-record-toolbar"><label><span>查找课堂记录</span><input aria-label="查找课堂记录" placeholder="课时或班级" value={state.recordSearchQuery} onChange={(event) => controller.setRecordSearchQuery(event.target.value)} /></label><button type="button" aria-expanded={state.recordFilterDrawerOpen} onClick={() => controller.setRecordFilterDrawerOpen(!state.recordFilterDrawerOpen)}>更多筛选</button>{(recordQuery || state.recordUnitFilter !== "ALL" || state.recordWorkflowFilter !== "ALL" || state.recordArchiveFilter !== "ACTIVE") && <button type="button" className="clear" onClick={() => { controller.setRecordSearchQuery(""); controller.setRecordUnitFilter("ALL"); controller.setRecordWorkflowFilter("ALL"); controller.setRecordArchiveFilter("ACTIVE"); }}>清除</button>}</div>
      {state.recordFilterDrawerOpen && <div className="sv1-m2-filter-drawer record"><label>大单元<select value={state.recordUnitFilter} onChange={(event) => controller.setRecordUnitFilter(event.target.value)}><option value="ALL">全部大单元</option>{workset.units.map((unit) => <option key={unit.unitId} value={unit.unitId}>{unit.unitTitle}</option>)}</select></label><label>处理状态<select value={state.recordWorkflowFilter} onChange={(event) => controller.setRecordWorkflowFilter(event.target.value as typeof state.recordWorkflowFilter)}><option value="ALL">全部状态</option><option value="PENDING_TRIAGE">待整理</option><option value="NEEDS_TEACHER_DECISION">需要教师决定</option><option value="COMPLETE">已完成</option></select></label><label>归档状态<select value={state.recordArchiveFilter} onChange={(event) => controller.setRecordArchiveFilter(event.target.value as typeof state.recordArchiveFilter)}><option value="ACTIVE">工作视图</option><option value="ARCHIVED">已软归档</option><option value="ALL">全部</option></select></label></div>}
      <div className="sv1-m2-record-filter" role="group" aria-label="课堂记录筛选"><button type="button" className={state.recordPriorityFilter === "PRIORITY" ? "active" : ""} onClick={() => controller.setRecordPriorityFilter("PRIORITY")}>待处理优先</button><button type="button" className={state.recordPriorityFilter === "RECENT" ? "active" : ""} onClick={() => controller.setRecordPriorityFilter("RECENT")}>最近课堂</button><button type="button" className={state.recordPriorityFilter === "SEMESTER" ? "active" : ""} onClick={() => controller.setRecordPriorityFilter("SEMESTER")}>本学期全部</button></div>
      <div className="sv1-m2-record-layout"><aside className="sv1-m2-record-list">{list.map((item) => <button type="button" key={item.sessionPackageId} className={state.selectedSessionPackageId === item.sessionPackageId && !selectedSummary ? "active" : ""} onClick={() => { controller.setSelectedSessionPackageId(item.sessionPackageId); controller.setSelectedAcrossSummaryId(null); }}><span>{workflowLabel(item)} · {item.classLabel}</span><b>《{lessonTitle(workset, item.lessonId)}》</b><small>{displayDate(item.taughtAt)}</small>{item.archiveState.status === "ARCHIVED" && <em>已软归档</em>}</button>)}{!list.length && <p>当前筛选下没有课堂记录。可以清除筛选后继续查看。</p>}</aside><main>{selectedSummary ? <article className="sv1-m2-across-summary"><header><span>同课多班派生汇总</span><h2>《{lessonTitle(workset, selectedSummary.lessonId)}》跨班接续</h2><p>只引用 {selectedSummary.sourceSessionPackageIds.length} 个独立课堂包，不覆盖任何单班事实。</p><button type="button" onClick={() => controller.openResearchDrawer(selectedSummary.sourceSessionPackageIds)}>形成跨班研究引用候选</button></header><section><b>共同困难</b><ul>{selectedSummary.commonDifficulties.map((item) => <li key={item}>{item}</li>)}</ul></section><section><b>班级差异</b><ul>{selectedSummary.classDifferences.map((item) => <li key={item.classId}><strong>{item.classLabel}</strong>{item.summary}</li>)}</ul></section><section><b>版本变化</b><ul>{selectedSummary.versionChanges.map((item) => <li key={item}>{item}</li>)}</ul></section><section><b>教师策略调整</b><ul>{selectedSummary.teacherStrategyAdjustments.map((item) => <li key={item}>{item}</li>)}</ul></section><section><b>各班用时</b><p>{selectedSummary.classDurations.map((item) => `${item.classId.replace("grade3-class", "三（")}） ${item.minutes}分钟`).join(" · ")}</p></section><section><b>代表性证据</b><p>{selectedSummary.representativeEvidenceRefs.length} 项已关联；技术引用默认折叠。</p><details><summary>查看引用详情</summary><ul>{selectedSummary.representativeEvidenceRefs.map((item) => <li key={item}><code>{item}</code></li>)}</ul></details></section></article> : selectedPackage ? <PackageDetail workset={workset} sessionPackage={selectedPackage} controller={controller} /> : <article className="sv1-m2-empty-workset"><h2>没有可显示的课堂记录</h2><p>调整筛选或返回课前准备。</p></article>}</main></div>

      <section className="sv1-m2-record-hierarchy"><button type="button" className="sv1-m2-section-heading" aria-expanded={state.recordHierarchyExpanded} onClick={() => controller.setRecordHierarchyExpanded(!state.recordHierarchyExpanded)}><span><b>按层级回看</b><small>大单元 → 子课时 → 班级课堂实例 · 默认折叠</small></span><i>{state.recordHierarchyExpanded ? "收起" : "展开"}</i></button>{state.recordHierarchyExpanded && workset.units.map((unit) => { const unitPackages = state.sessionPackages.filter((item) => item.unitId === unit.unitId); const archivedUnitCount = unitPackages.filter((item) => item.archiveState.status === "ARCHIVED").length; return <article key={unit.unitId}><h3>《{unit.unitTitle}》<small>{unit.gradeLabel} · {unitPackages.length} 个课堂包</small><span><button type="button" onClick={() => controller.setArchiveConfirmation({ kind: "HIERARCHY", scope: "UNIT", scopeId: unit.unitId, mode: "ARCHIVE" })}>软归档可处理课堂</button>{archivedUnitCount > 0 && <button type="button" onClick={() => controller.setArchiveConfirmation({ kind: "HIERARCHY", scope: "UNIT", scopeId: unit.unitId, mode: "RESTORE" })}>恢复大单元</button>}</span></h3>{unit.lessonIds.map((lessonId) => { const lesson = workset.lessons.find((item) => item.lessonId === lessonId); if (!lesson) return null; const packages = state.sessionPackages.filter((item) => item.lessonId === lessonId); const summary = workset.acrossClassesSummaries.find((item) => item.lessonId === lessonId); const archivedCount = packages.filter((item) => item.archiveState.status === "ARCHIVED").length; return <section key={lessonId}><header><b>{lesson.lessonOrder}. {lesson.lessonTitle}</b><div>{summary && <button type="button" onClick={() => { controller.setSelectedAcrossSummaryId(summary.summaryId); controller.setSelectedSessionPackageId(null); }}>查看跨班汇总</button>}<button type="button" onClick={() => controller.setArchiveConfirmation({ kind: "HIERARCHY", scope: "LESSON", scopeId: lessonId, mode: "ARCHIVE" })}>软归档课时</button>{archivedCount > 0 && <button type="button" onClick={() => controller.setArchiveConfirmation({ kind: "HIERARCHY", scope: "LESSON", scopeId: lessonId, mode: "RESTORE" })}>恢复课时</button>}</div></header><div>{packages.map((item) => <button type="button" key={item.sessionPackageId} onClick={() => { controller.setSelectedSessionPackageId(item.sessionPackageId); controller.setSelectedAcrossSummaryId(null); }}>{item.classLabel}<small>{workflowLabel(item)}{item.archiveState.status === "ARCHIVED" ? " · 已归档" : ""}</small></button>)}</div></section>; })}</article>; })}</section>

      <section className="sv1-m2-research-summary"><header><div><span>研究引用候选</span><h2>课堂记录留在教室，只建立可追溯引用</h2></div><em>研究室 HOLD</em></header><p>已保存 {state.researchHandoffCandidates.length} 个候选；默认不展开编辑器，也不复制原始记录。</p><div><button type="button" onClick={() => controller.openResearchDrawer(state.researchCandidateEditorState.selectedSessionPackageIds)}>从已选课堂建立候选</button>{state.researchHandoffCandidates.map((item) => <button type="button" key={item.researchReferenceId} onClick={() => openCandidate(item.researchReferenceId)}>{item.objectName} · 查看/编辑</button>)}</div></section>

      {state.archiveFeedback && <p className="sv1-m2-record-feedback" role="status">{state.archiveFeedback}<button type="button" onClick={() => controller.setArchiveFeedback(null)}>关闭</button></p>}
      {state.researchDrawerOpen && <ResearchDrawer workset={workset} controller={controller} />}
      {archiveConfirmation && (archiveTarget || archiveConfirmation.kind === "HIERARCHY") && <div className="sv1-m2-archive-dialog" role="dialog" aria-modal="true" aria-labelledby="m2-archive-title"><button type="button" className="backdrop" aria-label="取消归档" onClick={() => controller.setArchiveConfirmation(null)} /><article><h2 id="m2-archive-title">{archiveConfirmation.mode === "ARCHIVE" ? "确认软归档？" : "恢复到本学期工作视图？"}</h2><p>{activeArchiveTitle}</p>{hierarchyPlan && <div className="sv1-m2-archive-plan"><b>{hierarchyPlan.archivableCount} 节可归档 · {hierarchyPlan.blockedCount} 节被保护</b><ul><li>待整理 {hierarchyPlan.pendingTriageCount}</li><li>待教师决定 {hierarchyPlan.pendingDecisionCount}</li><li>记录不完整 {hierarchyPlan.incompleteCount}</li><li>已有研究引用 {hierarchyPlan.researchReferenceCount}</li></ul>{hierarchyPlan.partialArchiveRequired && <strong>本次只归档可归档课堂，受保护课堂继续留在工作视图。</strong>}{!hierarchyPlan.archivableCount && <strong>当前没有可归档课堂，操作将失败关闭。</strong>}</div>}<ul><li>不会删除课堂事实或证据引用</li><li>不会改变跨班汇总的来源关系</li><li>已有研究引用继续保留</li><li>教师可以随时恢复</li></ul><div><button type="button" onClick={() => controller.setArchiveConfirmation(null)}>取消</button><button type="button" className="primary" disabled={archiveConfirmation.mode === "ARCHIVE" && archiveConfirmation.kind === "HIERARCHY" && !hierarchyPlan?.archivableCount} onClick={confirmArchiveChange}>教师确认</button></div></article></div>}
    </section>
  );
}
