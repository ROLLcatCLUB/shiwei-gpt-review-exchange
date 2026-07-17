# ADR-0003：教室学期工作集、课堂记录包与仅引用研究交接

日期：2026-07-17  
状态：`IMPLEMENTED_IN_M2_FEATURE_BRANCH / AWAITING_TEACHER_GPT_REVIEW`

## 决策

教室继续使用原 `/shell-v1?room=classroom` 和“课前准备 / 当前课堂 / 课堂记录”三项一级信息架构。M2 在这一页面内建立：

```text
大单元
└─ 子课时
   └─ 班级课堂实例
      └─ ClassroomSessionPackage
```

`ClassroomSessionPackage` 是只读 fixture 逻辑记录包，不是真实 `ClassroomSession`，也不是磁盘 ZIP。它只保存版本、快照、哈希、实际记录引用、证据引用、教师反思引用、研究引用关系和软归档状态。

跨班汇总是派生对象，只引用单班课堂包，不覆盖单班事实。研究交接只产生 `ResearchHandoffCandidate`，教师逐项选择课堂实例和证据后确认引用候选；本轮不创建研究室页面，不移动或复制原始记录。

归档采用教师主动确认的软状态：`ACTIVE / ARCHIVED / RESTORED`。待整理、待教师决定的课堂禁止归档；已有研究引用的课堂允许软归档时必须提示引用关系继续保留。

## 理由

- 教师需要按下一节、今天、本周、最近完成和学期课架组织工作，而不是在功能栏目中寻找课堂。
- 同一课时在不同班级有独立情境、版本与证据，不能被跨班总结反向改写。
- 研究与归档属于高责任边界；fixture 阶段只能验证引用和教师确认合同。
- M1 的动态课堂必须保持可回归，因此先用单一 reducer/controller 收拢页面状态，再接 M2 面板。

## 继续 HOLD

真实数据库、真实 `ClassroomSession`、真实学生连接、模型、语音、WebSocket、Electron、研究室真实页面、自动研究分析、正式评价、正式写回、磁盘归档和第三方组件安装。
