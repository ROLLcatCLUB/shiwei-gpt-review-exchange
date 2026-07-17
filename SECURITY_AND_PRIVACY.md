# 安全与隐私门

本仓库是公开的审核交换仓。每次上传前必须通过：

```text
SECRET_SCAN = PASS
REAL_TEACHER_DATA = NONE
REAL_STUDENT_DATA = NONE
REAL_CLASSROOM_LOG = NONE
MANIFEST_ALIGNMENT = PASS
ZIP_SHA256 = VERIFIED
```

发现敏感内容时不得“先传再删”。应停止发布，将根指针状态标记为 `HOLD_SENSITIVE_PACKAGE`，并由用户决定私有仓、脱敏或不上传。
