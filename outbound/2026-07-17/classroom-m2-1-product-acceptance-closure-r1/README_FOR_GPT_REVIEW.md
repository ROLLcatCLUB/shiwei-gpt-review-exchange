# 教室 M2.1 累计私有审核包

审核对象：

```text
CLASSROOM_M2_1_PRODUCT_SEMANTICS
_RESEARCH_REFERENCE_STATE
_HIERARCHICAL_ARCHIVE
_AND_TEACHER_DENSITY_CLOSURE
```

## 建议裁决

```text
M2_ENGINEERING_FOUNDATION = PASS
M2_1_PRODUCT_AND_STATE_CLOSURE = PASS_WITH_TEACHER_GPT_REVIEW
M2_STABLE_MERGE = NOT_AUTHORIZED
M2_ACCEPTED_TAG = NOT_AUTHORIZED
M3 = NOT_AUTHORIZED
```

M2.1 继续直接呈现在原教室地址：

```text
http://127.0.0.1:5183/shell-v1?room=classroom
```

没有新增页面、独立站、第二套教室路由或研究室页面。

## 本轮闭合

- 研究候选保存为真实 fixture 对象并反向关联课堂包；
- 研究表单默认隐藏，按单班、跨班或操作栏打开抽屉；
- revision、snapshot、hash、evidence URI 默认折叠；
- 学期课架、记录层级和研究抽屉默认折叠；
- 置顶、常用、复用、开始课堂均有实际 fixture 结果；
- 优先级确定性派生并覆盖空工作集；
- 归档当前状态与恢复转换分离；
- 单课堂、子课时和大单元软归档具有显式阻断与部分归档说明；
- 课前和记录均支持搜索、组合筛选、清除；
- 浏览器实测修复 M2/M1 班级 ID 接缝，开始课堂可进入既有 M1 当前课堂。
- reducer 与初始状态位于 React 无关纯模块，选择性源码包可独立复跑专项测试。

## 复跑

```powershell
python validate_review_package.py .
node --experimental-strip-types --test source/tests/classroom-m2-semester-workset.test.mjs source/tests/classroom-m2-semester-workset-ui.test.mjs
node --experimental-strip-types source/scripts/validate-classroom-m2-semester-workset.mjs
```

27 张有效 JPEG 是精确可见视口截图，覆盖 1366x768、1440x900 和 1920x1080；无效截图为 0。完整工作区的全站 275 项、ESLint、vinext 生产构建和干净浏览器控制台错误 0 由报告提供。

## HOLD

真实数据库、真实 ClassroomSession、真实学生连接、模型、语音、WebSocket、Electron、研究室真实页面、自动研究分析、正式评价、正式写回和磁盘归档。
