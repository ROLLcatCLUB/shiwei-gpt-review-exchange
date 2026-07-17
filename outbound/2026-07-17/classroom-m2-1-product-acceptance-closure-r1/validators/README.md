# 干净解压复跑

```powershell
python validate_review_package.py .
node --experimental-strip-types --test source/tests/classroom-m2-semester-workset.test.mjs source/tests/classroom-m2-semester-workset-ui.test.mjs
node --experimental-strip-types source/scripts/validate-classroom-m2-semester-workset.mjs
```

第二份 `validators/validate_review_package.py` 仅用于让审核者快速定位校验器；ZIP 根目录中的同名文件是正式复跑入口。
