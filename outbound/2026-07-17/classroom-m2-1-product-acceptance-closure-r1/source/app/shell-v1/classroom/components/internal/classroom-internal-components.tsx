import type { ClassroomComponentViewer } from "../../../../../domain/classroom-components/classroom-component-registry";

export function ClassroomImageCompare({
  title,
  question,
  leftImage,
  rightImage,
  activeSide,
  onSwitch,
}: {
  title: string;
  question: string;
  leftImage?: string;
  rightImage?: string;
  activeSide: "BOTH" | "LEFT" | "RIGHT";
  onSwitch?: (side: "BOTH" | "LEFT" | "RIGHT") => void;
}) {
  const images = [
    { side: "LEFT" as const, label: "连续变化", image: leftImage },
    { side: "RIGHT" as const, label: "突然跳变", image: rightImage },
  ];
  return (
    <section className="sv1-classroom-image-compare" data-component-id="classroom.display.image-compare">
      <header>
        <div><span>图片对比</span><h2>{title}</h2></div>
        {onSwitch && (
          <div aria-label="图片对比视图">
            {(["BOTH", "LEFT", "RIGHT"] as const).map((side) => (
              <button type="button" className={activeSide === side ? "active" : ""} key={side} onClick={() => onSwitch(side)}>
                {side === "BOTH" ? "并列" : side === "LEFT" ? "左图" : "右图"}
              </button>
            ))}
          </div>
        )}
      </header>
      <div className={`sv1-classroom-image-compare-grid mode-${activeSide.toLowerCase()}`}>
        {images
          .filter((item) => activeSide === "BOTH" || activeSide === item.side)
          .map((item) => (
            <figure key={item.side}>
              {item.image ? <div style={{ backgroundImage: `url(${item.image})` }} /> : <div className="is-empty">图片待补充</div>}
              <figcaption>{item.label}</figcaption>
            </figure>
          ))}
      </div>
      <p>{question}</p>
    </section>
  );
}

export type ClassroomMaterialItem = {
  id: string;
  label: string;
  checked: boolean;
  group: "PREPARE" | "USE" | "CLEANUP";
};

export function ClassroomMaterialChecklist({
  viewer,
  items,
  onToggle,
}: {
  viewer: ClassroomComponentViewer;
  items: readonly ClassroomMaterialItem[];
  onToggle?: (itemId: string) => void;
}) {
  const groupLabels = {
    PREPARE: "材料准备",
    USE: "使用提醒",
    CLEANUP: "收纳安全",
  } as const;
  return (
    <section className="sv1-classroom-material-checklist" data-component-id="classroom.art.material-checklist">
      <header><span>材料清单</span><h2>水粉课堂材料与安全</h2></header>
      <div>
        {(Object.keys(groupLabels) as Array<keyof typeof groupLabels>).map((group) => (
          <section key={group}>
            <b>{groupLabels[group]}</b>
            {items.filter((item) => item.group === group).map((item) => (
              <button
                type="button"
                key={item.id}
                className={item.checked ? "checked" : ""}
                onClick={() => viewer === "TEACHER" && onToggle?.(item.id)}
                disabled={viewer === "STUDENT"}
                aria-pressed={item.checked}
              >
                <i>{item.checked ? "✓" : "○"}</i><span>{item.label}</span>
              </button>
            ))}
          </section>
        ))}
      </div>
      <small>{viewer === "TEACHER" ? "模拟勾选，不会写回课包。" : "学生端只读画面。"}</small>
    </section>
  );
}

export type ClassroomGalleryWork = {
  workId: string;
  title: string;
  tag: "表现突出" | "基本达成" | "需支持";
  palette: string;
};

export function ClassroomAnonymousStudentGallery({
  viewer,
  works,
  selectedWorkId,
  onSelect,
}: {
  viewer: ClassroomComponentViewer;
  works: readonly ClassroomGalleryWork[];
  selectedWorkId: string | null;
  onSelect?: (workId: string) => void;
}) {
  return (
    <section className="sv1-classroom-gallery" data-component-id="classroom.display.student-gallery-fixture">
      <header>
        <div><span>匿名作品画廊 · 体验数据</span><h2>从颜色里感受自然时刻</h2></div>
        <small>不形成正式评分</small>
      </header>
      <div>
        {works.map((work, index) => (
          <button
            type="button"
            key={work.workId}
            className={selectedWorkId === work.workId ? "selected" : ""}
            onClick={() => viewer === "TEACHER" && onSelect?.(work.workId)}
            disabled={viewer === "STUDENT"}
          >
            <i style={{ background: work.palette }} />
            <span><b>作品 {index + 1}</b><small>{work.title}</small></span>
            <em className={`tag-${work.tag}`}>{work.tag}</em>
          </button>
        ))}
      </div>
      <p>{viewer === "TEACHER" ? "选择作品只改变当前模拟展示，不记录学生身份。" : "作品已匿名化，不显示学生姓名。"}</p>
    </section>
  );
}
