# Binary transport limitation

The current GPT GitHub write connector can create and update UTF-8 text files, but its contents action does not accept a local binary file reference. The previous response incorrectly declared the ZIP files present without creating binary Git objects.

Codex intake is correct to hold execution.

Required completion path:

1. Publish both ZIP files using a binary-capable Git Data publisher or GitHub Release asset upload.
2. Download the remote assets and recompute SHA256.
3. Replace the current response manifest and inbound pointer with a final fixed commit.
4. Codex independently verifies the final assets before execution.

Until those steps complete:

```text
BINARY_PAYLOAD_STATUS = MISSING
M2_1_EXECUTION = HOLD
```
