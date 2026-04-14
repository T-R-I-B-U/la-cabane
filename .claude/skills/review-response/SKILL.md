---
name: review-response
description: Prepare clear responses to code review comments with concrete follow-up actions.
argument-hint: [review comment or thread]
disable-model-invocation: true
---

Prepare a response for: $ARGUMENTS

Return:
1. Suggested reply text
2. Whether code change is needed
3. If needed, minimal follow-up action plan

Tone: concise, collaborative, non-defensive.
