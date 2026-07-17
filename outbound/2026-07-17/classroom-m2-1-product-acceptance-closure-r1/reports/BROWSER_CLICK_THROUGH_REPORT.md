# M2.1 browser click-through

入口：`http://127.0.0.1:5183/shell-v1?room=classroom`

实际点击覆盖：课前默认密度、搜索筛选、周/学期/课时展开、复用候选、开始课堂、课堂记录、记录筛选、技术详情、层级回看、跨班汇总、研究抽屉、候选保存、课时归档、大单元部分归档，以及 1366/1440/1920 三档布局。

浏览器实测发现 M2 `grade3-class5` 与 M1 `class_3_5` 的 fixture ID 接缝；修复为以工作集班级标签显式匹配既有 M1 候选后，“开始课堂”进入 M1 当前课堂。门禁已覆盖该映射。

```text
BROWSER_CLICK_THROUGH = PASS
CLEAN_NEW_TAB_CONSOLE_ERRORS = 0
VALID_SCREENSHOTS = 27
INVALID_SCREENSHOTS = 0
```
