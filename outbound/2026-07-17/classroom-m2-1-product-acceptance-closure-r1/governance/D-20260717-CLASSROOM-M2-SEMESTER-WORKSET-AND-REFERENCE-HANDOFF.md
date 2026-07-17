# D-20260717：教室 M2 学期工作集与仅引用研究交接

## 决策

在 M1 accepted 标签上以独立 branch/worktree 实施教室 M2，并继续使用原 `/shell-v1?room=classroom`。建立大单元、子课时、班级课堂实例和 `ClassroomSessionPackage` 的 fixture-only 工作集；跨班汇总只能派生引用，研究交接只能形成教师确认的引用候选，归档只能是教师主动确认且可恢复的软状态。

## 证据

```text
M1 accepted tag = classroom-dynamic-render-m1-accepted-20260717
M2 tests = 27/27 PASS
M2 validator = 100/100 PASS
full site tests = 269/269 PASS
ESLint = PASS
production build = PASS
worker fetch export = PASS
browser click-through = PASS
browser console errors = 0
screenshots = 38 real JPEG
responsive runtime layout = 1366 / 1440 / 1920 PASS
new page count = 0
third-party install count = 0
```

浏览器截图工具在超出物理窗口的 CDP 尺寸下产生平铺画面，项目已删除这些无效图，不把它们冒充精确分辨率证据；三档响应式通过运行时 DOM/CDP 几何、横向溢出和控制栏避让数据记录。

## 阶段裁决

```text
M2_ENGINEERING = PASS
M2_FEATURE_BRANCH = AWAITING_TEACHER_GPT_REVIEW
M2_STABLE_MERGE = NOT_AUTHORIZED
M3 = NOT_AUTHORIZED
```

## 边界

真实数据库、真实 ClassroomSession、真实学生连接、模型、语音、WebSocket、Electron、研究室真实页面、自动研究分析、正式评价、正式写回、磁盘归档和第三方组件安装继续 HOLD。
