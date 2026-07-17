# 2026-07-17｜教室 M2 学期工作集与课堂记录层级

## 授权与版本保护

M1.1 通过外部复核后，站点和治理仓均通过 Git merge 合入稳定线，并在稳定门全部通过后建立 `classroom-dynamic-render-m1-accepted-20260717`。M2 从该标签创建独立 branch/worktree，直接修改原教室页面，没有另建路由、静态站或第二套页面。

## 实施结果

- 把 `ClassroomSurface` 的 21 个分散状态收拢到 `useClassroomWorkspaceController` 单一 reducer；Surface 已降到 M1 接受基线以下，并继续保留六个 M1 Host 和统一 fixture adapter。
- 建立《多彩的世界》学期 fixture，包含《色彩的渐变》《渐变的节奏》《多彩的生活》、三年级 1—5 班、不同课堂状态与不同课时版本。
- 课前准备按“下一节课 / 今天的课 / 本周课程 / 最近完成 / 本学期课架”呈现；系统只可降权或折叠，不能自动归档。
- 课堂记录优先展示待整理、需要教师决定和最近课堂，并可按大单元、子课时、班级课堂实例展开。
- 单班记录包保留版本、快照、哈希、实际流程、随手记、匿名响应摘要、证据引用、教师判断、下一班决定、反思、研究引用和归档状态。
- 跨班汇总只派生共同困难、班级差异、版本变化、教师策略、用时与代表证据，不覆盖单班事实。
- 研究交接支持教师选择课堂实例、逐条证据、研究问题、对象名称和匿名化，只形成引用候选；研究室页面继续 HOLD。
- 软归档必须教师确认，可恢复；待整理和待决定课堂阻断归档，已有研究引用时保留关系提示。

## 最终工程门

```text
M2_SPECIAL_TESTS = 27/27 PASS
M2_VALIDATOR = 100/100 PASS
FULL_SITE_TESTS = 269/269 PASS
FULL_ESLINT_DIRECT_WINDOWS = PASS
VINEXT_PRODUCTION_BUILD_DIRECT_WINDOWS = PASS
WORKER_DEFAULT_FETCH = PASS
BROWSER_CLICK_THROUGH = PASS
BROWSER_CONSOLE_ERRORS = 0
REAL_BROWSER_SCREENSHOTS = 38 JPEG (1280x720)
RESPONSIVE_RUNTIME_LAYOUT_EVIDENCE = 1366 / 1440 / 1920 PASS
NEW_PAGE_COUNT = 0
THIRD_PARTY_INSTALL_COUNT = 0
```

仓库的 `npm run lint` 和 `npm run build` 使用 Bash 包装；当前 Windows 主机缺少 `/bin/bash`，所以使用同一依赖和 Sites 环境变量直接运行 `eslint.cmd` 与 `vinext.cmd build`。浏览器截图工具在大于物理窗口的 CDP 尺寸下会产生平铺画面，因此没有把无效平铺图冒充精确分辨率截图；保留 38 张真实状态截图，并以运行时 DOM/CDP 几何记录三档布局、横向溢出和控制栏避让。

## 阶段状态

M2 工程实现完成，停在 feature 分支等待教师/GPT累计审核。未合入稳定基线，未建立 M2 accepted 标签，不进入 M3。
