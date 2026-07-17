# M2.1 验收矩阵

| Gate | 结果 | 证据 |
|---|---|---|
| F1 研究候选真实状态 | PASS | 唯一 ID、fixture reducer、课堂包反向引用 |
| F2 按需研究抽屉 | PASS | 单班/跨班/新建/编辑/取消，默认关闭 |
| F3 教师面隐藏技术身份 | PASS | 技术详情 `<details>` 默认折叠 |
| F4 默认信息密度 | PASS | today/recent 展开，week/semester/hierarchy/research 折叠 |
| F5 工作动作语义 | PASS | 置顶/常用排序、复用候选、开始课堂进入 M1 |
| F6 确定性优先级 | PASS | NEXT/TODAY/WEEK/RECENT_COMPLETE/SEMESTER_ONLY 与空状态 |
| F7 归档状态语义 | PASS | 当前 ACTIVE/ARCHIVED，lastTransition 单独记录 |
| F8 层级软归档 | PASS | 单课堂/课时/大单元、保护项、显式部分归档、恢复 |
| F9 搜索筛选 | PASS | 课前与记录搜索、组合筛选、清除 |
| F10 截图证据 | PASS | 27 valid JPEG，0 invalid，三档精确视口 |
| M1 回归 | PASS | 20/20、54/54、开始课堂浏览器点击 |
| 全站工程门 | PASS | 275/275、ESLint、vinext build、console errors 0 |
| 原 classroom 页面 | PASS | 新页面数 0 |
| 真实 Runtime 与持久化 | HOLD | 无 Session/DB/model/WebSocket/writeback |
| M2 稳定合并 | NOT AUTHORIZED | 等待累计审核 |
| M3 | NOT AUTHORIZED | 本轮停止 |
