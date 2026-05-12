import type { Task } from "./types.js";

// Multi-step tasks requiring multiple tool calls and reasoning across results.
export const multistepTasks: Task[] = [
  {
    id: "multi-01",
    category: "multistep",
    description: `Find the Go version requirements for three repos and determine which uses the newest Go version.

Fetch the go.mod files:
- https://raw.githubusercontent.com/go-chi/chi/master/go.mod
- https://raw.githubusercontent.com/spf13/cobra/main/go.mod
- https://raw.githubusercontent.com/rs/zerolog/master/go.mod

Report the repo that requires the highest minimum Go version, in the format "owner/repo requires go X.XX".`,
    tools: ["fetch"],
    scorer: "judge",
    rubric: `The answer should correctly identify which of the three repos (go-chi/chi, spf13/cobra, rs/zerolog) requires the highest minimum Go version.
Score 5: Correct repo identified with the correct Go version number, fetched all three go.mod files.
Score 4: Correct repo but minor version formatting issue, or only fetched 2 of 3.
Score 3: Wrong repo but fetched at least one go.mod and showed reasoning.
Score 2: Answered without fetching any go.mod files (hallucination).
Score 1: No meaningful attempt or completely wrong.`,
  },
  {
    id: "multi-02",
    category: "multistep",
    description: `Count the total number of open issues across these three GitHub repos:
- spf13/afero
- spf13/viper
- spf13/cobra

Use the GitHub API (https://api.github.com/repos/owner/repo) to get the open_issues_count for each. Report the total as a single number.`,
    tools: ["fetch"],
    scorer: "judge",
    rubric: `The answer should fetch all three repos from the GitHub API and sum their open_issues_count fields.
Score 5: Fetched all three repos, correctly summed the counts, reported a single number.
Score 4: Fetched all three but minor arithmetic error or formatting issue.
Score 3: Fetched only 1-2 repos and extrapolated or estimated.
Score 2: Reported a number without fetching any of the repos.
Score 1: Failed to produce a number or completely wrong.`,
  },
  {
    id: "multi-03",
    category: "multistep",
    description: `You need to verify a claim: "The charmbracelet/bubbletea repo has more stars than charmbracelet/bubbles".

Fetch both repos from the GitHub API and determine if the claim is TRUE or FALSE. Show your work.`,
    tools: ["fetch"],
    scorer: "judge",
    rubric: `The answer should fetch both repos and compare their stargazers_count.
Score 5: Fetched both repos, compared actual numbers, correctly labeled TRUE or FALSE.
Score 4: Fetched both repos but minor error in comparison or reporting.
Score 3: Fetched one repo and made an assumption about the other.
Score 2: Answered TRUE or FALSE without fetching either repo.
Score 1: Failed to produce an answer or no attempt.`,
  },
  {
    id: "multi-04",
    category: "multistep",
    description: `Write a Python script to /tmp/agent-sandbox/primes.py that:
1. Generates all prime numbers up to 100 using the Sieve of Eratosthenes
2. Prints them one per line

Then run it and report the last prime number it prints.`,
    tools: ["write_file", "shell"],
    scorer: "contains",
    expected: "97",
    notes: "The last prime <= 100 is 97",
  },
  {
    id: "multi-05",
    category: "multistep",
    description: `Write a Go program to /tmp/agent-sandbox/fibonacci.go that prints the first 10 Fibonacci numbers (starting from 0, 1).

The go.mod at /tmp/agent-sandbox/go.mod already exists with module name 'sandbox'. Run the program with:
cd /tmp/agent-sandbox && go run fibonacci.go

Report the 10th number (last one printed).`,
    tools: ["read_file", "write_file", "shell"],
    scorer: "contains",
    expected: "34",
    notes: "0,1,1,2,3,5,8,13,21,34 — the 10th is 34",
  },
  {
    id: "multi-06",
    category: "multistep",
    description: `Find which GitHub repo has the most recent 'pushed_at' timestamp among these three:
- github.com/go-chi/chi
- github.com/spf13/cobra
- github.com/uber-go/zap

Use the GitHub API and report the repo name (owner/repo format) that was most recently pushed to.`,
    tools: ["fetch"],
    scorer: "judge",
    rubric: `The answer should fetch all three repos, compare the pushed_at field (ISO 8601 timestamps), and identify the most recently updated one.
Score 5: Fetched all three, showed timestamps, correctly identified most recent.
Score 4: Fetched all three, correct answer but didn't show timestamps.
Score 3: Fetched only 1-2 repos and made an inference.
Score 2: Answered without fetching any repos.
Score 1: No attempt or completely wrong.`,
  },
  {
    id: "multi-07",
    category: "multistep",
    description: `Create a file at /tmp/agent-sandbox/report.txt that contains:
Line 1: The language of the rs/zerolog GitHub repo (fetch https://api.github.com/repos/rs/zerolog)
Line 2: The license key of the jmoiron/sqlx GitHub repo (fetch https://api.github.com/repos/jmoiron/sqlx)
Line 3: The number of forks of the spf13/afero GitHub repo (fetch https://api.github.com/repos/spf13/afero)

Then read the file back and report its contents.`,
    tools: ["fetch", "write_file", "read_file"],
    scorer: "judge",
    rubric: `The answer should fetch all three repos and write a 3-line file.
Score 5: Fetched all three repos, wrote correct values to the file, read it back and reported it. Line 1 = "Go", Line 2 = "mit", Line 3 = a number.
Score 4: Got all three right but minor formatting issue (extra whitespace, etc).
Score 3: Got 2 out of 3 values correct.
Score 2: Wrote the file without fetching the repos (made up values).
Score 1: Did not create the file or completely wrong.`,
  },
];
