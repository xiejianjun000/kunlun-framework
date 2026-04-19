---
name: computer-use
description: "CUA (Computer Use Agent) for visual GUI-based computer control. When you need screenshots/scrolling/clicking/dragging or need to run CUA commands, **you MUST read this SKILL.md first** — it includes mandatory tags, preflight checks, single-process rules, and operating procedures."
---

# Computer Use (CUA) Guide

CUA is short for Computer Use Agent. It visually controls a computer to complete the requested task.

---

## ⚠️ CRITICAL: Mandatory tags & stop rules

### `<model-switch-multimodal />`

If the preflight check say multimodal is NOT supported, you **MUST** return `<model-switch-multimodal />` and stop all subsequent steps.

IMPORTANT: The multimodal capability result **MUST** come only from the script output. It **MUST NOT** be inferred from conversation context/history.

### `<computer-handoff />`

If a CUA task is interrupted, or CUA requires the user to operate manually, you **MUST** return `<computer-handoff />`.

You must also:

- Stop the CUA process immediately (avoid leaving a running cua process)
- Record the current execution checkpoint so the user can resume later

Place `<computer-handoff />` as the last line of your reply so the user can take over immediately.

---

## Goal

Invoke this skill to start and manage a CUA task when the user needs to control the computer or complete GUI tasks (e.g., screenshots, scrolling, clicking, dragging, in-page operations), or when the user wants to run a CUA command.

---

## Preconditions

- The current model supports GUI / multimodal tasks
- CUA default directory: `/root/.cua`
- CUA binary exists at: `/root/.cua/cua`
- CUA config sets runsDir (screenshots/logs directory) to: `/root/.cua/runs`

---

## Triggers

Trigger when the user explicitly needs computer control to complete a task, for example:

- When CUA is required/triggered for the task
- Take screenshots / interpret UI
- Scroll pages / paginate
- Click / double-click / right-click
- Drag / select / type
- Complete a sequence of GUI steps

---

## Config source (openclaw)

Read from `/root/.openclaw/openclaw.json`:

- `model_id`: take `.agents.defaults.model.primary`, split by `"/"`, use the last segment
- `base_url`: `models.providers.ark.baseUrl`
- `api_key`: `models.providers.ark.apiKey`

---

## ⚠️ Preflight checks (MANDATORY)

You **MUST** run preflight checks every time before execution. You **MUST NOT** reuse or infer preflight results from conversation context/history.

```bash
bash skills/computer-use/scripts/preflight.sh
```

`<model-switch-multimodal />` **MUST** be returned if the preflight script say multimodal is not supported.

If the preflight script fails (non-zero exit) and it did not output `<model-switch-multimodal />`: you **MUST** stop all subsequent steps, explain the concrete failure reason to the user, and return `<computer-handoff />` to request user takeover, do not terminate any other processes.

---

## Command execution

Run CUA with:

```bash
DISPLAY=:99 CUA_CONFIG_DIR=/root/.cua/config /root/.cua/cua run \
  --model <(last segment of .agents.defaults.model.primary)> \
  --base-url <models.providers.ark.baseUrl> \
  --api-key <models.providers.ark.apiKey> \
  <task_content>
```

`<task_content>` should include:

- Target page/app
- Expected outcome (acceptance criteria)
- Acceptable fallback path (what to do if UI differs)

---

## Async execution, interruption, resume

- CUA tasks run asynchronously; the user may terminate at any time
- On user termination/interruption: you must record a checkpoint (completed steps, current window/page, next step, blockers)
- If the user chooses to resume: continue from the checkpoint; treat handoff as already done and proceed with the next step

---

## Abnormal termination & handoff

When a CUA task is interrupted, or CUA requires the user to operate manually:

- Stop the CUA process immediately
- You **MUST** notify the user to take over and return `<computer-handoff />`
- After the user finishes the handoff, they may choose to continue
- On continue: treat handoff as completed and proceed with the next step

---

## Output requirements

- Before starting: state the goal, key assumptions, and safe stop points
- On interruption/abnormal: provide checkpoint details (current window/page, completed steps, next step)
