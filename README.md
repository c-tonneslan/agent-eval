# agent-eval

A from-scratch evaluation framework for agentic LLMs. Built to understand where agents actually fail, not just whether they pass a benchmark.

The agent is a bare ReAct loop using the Anthropic SDK — no LangChain, no SmolAgents. Every step is logged, every token counted. Tasks cover web browsing, code debugging, and multi-step tool use.

```
web          7/8  (88%)
code         4/6  (67%)
multistep    5/7  (71%)
─────────────────────────
TOTAL       16/21  (76%)

Avg steps/task: 3.2
Avg time/task:  18.4s
Total tokens:   284K input, 61K output, 198K cache hits
```

## What it does

**21 tasks across 3 categories:**

- **Web (8):** Fetch real GitHub API endpoints and extract specific fields. Tests whether the agent actually calls tools or hallucinates answers from training data.
- **Code (6):** Fix intentionally buggy Python/Go files so that the test suite passes. The agent has to read the file, diagnose the bug, write the fix, and verify with the shell.
- **Multistep (7):** Problems that require chaining multiple tool calls — fetch 3 repos and compare, write a script and run it, build a report from 3 different API calls.

**Scoring is intentionally heterogeneous:**
- `exact`/`contains`/`regex` for deterministic answers
- `code_test` for code tasks: run the actual test suite, pass or fail
- `judge`: LLM-as-judge (claude-haiku-4-5) for open-ended multi-step tasks

## Architecture

```
src/
  agent.ts           # ReAct loop — tool calls, trajectory logging, cache
  tools/
    fetch.ts         # HTTP GET
    shell.ts         # subprocess in /tmp/agent-sandbox
    files.ts         # read/write files
  tasks/
    web.ts           # 8 web browsing tasks
    code.ts          # 6 code debugging tasks
    multistep.ts     # 7 multi-step tasks
  eval/
    runner.ts        # orchestrates runs, saves results
    scorer.ts        # exact/contains/regex/code_test scoring
    judge.ts         # LLM judge with structured output
    calibrate.ts     # human rating tool + Pearson r vs judge
  dashboard/
    render.ts        # generates dashboard/index.html
```

The agent uses `cache_control: { type: "ephemeral" }` on the system prompt, which gets reused every step of a trajectory. On a typical run with 3-4 steps per task, cache hits cover ~70% of input tokens.

## Interesting failure cases

### 1. The hallucination detector caught something real

`web-05`: Fetch bubbletea's star count from the GitHub API.

The agent answered "charmbracelet/bubbletea currently has approximately 28,000 stars" and called no tools. Failure mode: `hallucination`. The model used training-data knowledge instead of fetching the actual number — which, if it was outdated, would be silently wrong.

This is the scenario the `hallucination` failure mode is specifically designed to catch. If the task provides tools and the agent answers without using any, that's not a successful answer.

### 2. Identifying the right bug isn't the same as fixing it

`code-06`: Fix a linked list `Reverse()` function. The comment in the code even says "bug: forgets to advance cur, causing infinite loop."

The agent's first attempt added `cur = cur.Next` but put it in the wrong place:

```go
// what the agent wrote (still wrong):
prev = cur
cur.Next = prev   // now cur points to itself
cur = cur.Next    // follows the self-pointer — infinite loop
```

The standard three-pointer reverse pattern requires saving `next` *before* clobbering `cur.Next`. The agent spotted the symptom but not the full fix. It ran the tests, got a timeout, then on step 6 wrote "FINAL ANSWER: fixed" anyway. Trajectory: 8 steps, 6 tool calls, wrong answer, failure mode: `wrong_answer`.

Second run got it right on the first try by reading the test expectations and working backwards through what the loop needed to do.

### 3. Partial multi-step completion gets you wrong answers

`multi-01`: Compare Go version requirements across go-chi/chi, spf13/cobra, and rs/zerolog — fetch all three go.mod files and identify the one with the highest minimum.

The agent fetched chi and cobra, then wrote: "Based on my knowledge, zerolog requires go 1.19." It got the comparison wrong because zerolog's actual go.mod says something different from what the model recalled. Judge scored 3/5 (showed reasoning, fetched 2/3 repos, wrong conclusion).

This is the hardest failure mode to catch programmatically. The agent didn't hallucinate a number out of thin air — it did *some* of the work and then filled in the rest from memory. If you only checked whether it "used tools," it would look fine.

## LLM judge calibration

Multi-step tasks use claude-haiku-4-5 as a judge with a 1-5 rubric. After running the calibration tool against 7 judge-scored tasks:

```
Rated tasks: 7
Pearson r (judge vs human): 0.87
Mean absolute error: 0.43
→ Judge well-calibrated with human ratings
```

Main disagreement: `multi-02` (sum open issues across 3 repos). Judge gave 5/5 because the final number was correct. I gave 4/5 because the agent didn't explicitly show the per-repo breakdown — it could have gotten lucky. The rubric says "Score 5: fetched all three repos, correctly summed the counts" and the trajectory confirmed it did fetch all three, so the judge was probably right and I was being too harsh.

The judge prompt includes the full task rubric, trajectory steps, and final answer. Haiku is fast and cheap (~$0.003/task) and r=0.87 is good enough to trust for pass/fail thresholds.

## Running it

```bash
npm install
cp .env.example .env  # add your ANTHROPIC_API_KEY

# run all 21 tasks
npm run eval

# run by category
npm run eval -- --web
npm run eval -- --code
npm run eval -- --multistep

# run a single task
npm run eval -- --task web-01

# generate the HTML dashboard
npm run dashboard
open dashboard/index.html

# human calibration against judge scores
npm run calibrate
```

Results land in `results/` as JSON. Each task gets a `{id}-trajectory.json` (full step log), `{id}-result.json` (score + failure mode), and optionally `{id}-judge.json` (LLM judge output).

## Failure modes

| Mode | Meaning |
|------|---------|
| `hallucination` | Task had tools available; agent answered without using any |
| `wrong_answer` | Used tools, got the wrong answer |
| `tool_error` | Tool call returned an error |
| `format_error` | Answer didn't match expected format |
| `max_steps` | Hit the 12-step limit without a final answer |
| `max_tokens` | Response truncated |
| `api_error` | Anthropic API error |
| `no_answer` | Agent produced no FINAL ANSWER |

## What I learned

A few things that weren't obvious going in:

**Pass/fail is a bad primary metric.** The code tasks are binary — tests pass or they don't. But for web and multi-step tasks, an agent that fetched 2 of 3 URLs and got 90% of the answer right scores the same zero as one that hallucinated the whole thing. You need the judge scores to see the difference.

**Cache hits matter a lot.** Multi-step tasks with 5-6 steps would be expensive without prompt caching. The system prompt gets written to cache on step 1 and read from cache on every subsequent step. On a 6-step trajectory that's 5 cache reads instead of 5 full reads — roughly 3x cheaper and noticeably faster.

**The hallucination check has false positives.** A task like "what's the license of sqlx" — the agent might know the answer from training and skip the fetch. That's not wrong in the real world, but it's wrong in an eval context where you need to verify the agent can actually use tools. The failure mode detection here penalizes it deliberately, which is the right call for an eval even if it's unfair to the model.
