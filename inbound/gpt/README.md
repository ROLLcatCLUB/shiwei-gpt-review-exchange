# GPT inbound

GPT 只在 `gpt-response` 分支写入本目录，不修改 `main/outbound/`。

回传位置：

```text
inbound/gpt/<YYYY-MM-DD>/<response-id>/
```

开始审核前读取：

1. `main:CURRENT_POINTER.json`
2. 指针所列 `README_FOR_GPT_REVIEW.md`
3. `GPT_REVIEW_PROMPT.md`
4. `PACKAGE_MANIFEST.json`
5. validator、报告、截图和 ZIP

回传完成后必须更新：

```text
gpt-response:INBOUND_POINTER.json
```

请使用 `templates/GPT_RESPONSE_MANIFEST.template.json`。不要把审核结论直接写进 Codex 的出站目录，也不要把建议表述为已经获得项目授权。
