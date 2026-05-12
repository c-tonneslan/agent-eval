import type { Task } from "./types.js";

// Web browsing tasks. The agent must fetch real URLs to answer.
export const webTasks: Task[] = [
  {
    id: "web-01",
    category: "web",
    description:
      "What is the default branch of the repository github.com/go-chi/chi? Use the GitHub API at https://api.github.com/repos/go-chi/chi to find out.",
    tools: ["fetch"],
    scorer: "contains",
    expected: "master",
    notes: "go-chi/chi uses 'master' as its default branch",
  },
  {
    id: "web-02",
    category: "web",
    description:
      "Fetch https://api.github.com/repos/spf13/cobra and tell me the exact value of the 'open_issues_count' field.",
    tools: ["fetch"],
    scorer: "regex",
    expectedPattern: "^\\d+$",
    notes: "Should be a number; we accept any non-negative integer",
  },
  {
    id: "web-03",
    category: "web",
    description:
      "Fetch the raw go.mod file from the main branch of github.com/go-chi/chi (URL: https://raw.githubusercontent.com/go-chi/chi/master/go.mod) and tell me the minimum Go version it requires.",
    tools: ["fetch"],
    scorer: "regex",
    expectedPattern: "^1\\.\\d+(\\.\\d+)?$",
    notes: "Should be something like '1.22' or '1.21.0'",
  },
  {
    id: "web-04",
    category: "web",
    description:
      "Fetch https://api.github.com/repos/jmoiron/sqlx and tell me the license key (the value of license.key in the JSON).",
    tools: ["fetch"],
    scorer: "contains",
    expected: "mit",
    notes: "jmoiron/sqlx is MIT licensed",
  },
  {
    id: "web-05",
    category: "web",
    description:
      "Fetch https://api.github.com/repos/charmbracelet/bubbletea and report the exact number of stargazers (the 'stargazers_count' field).",
    tools: ["fetch"],
    scorer: "regex",
    expectedPattern: "^\\d+$",
    notes: "Should be a positive integer (currently around 30k)",
  },
  {
    id: "web-06",
    category: "web",
    description:
      "Fetch https://api.github.com/repos/spf13/afero and https://api.github.com/repos/spf13/viper. Which one has more GitHub stars? Answer with just the repo name in the format 'owner/repo'.",
    tools: ["fetch"],
    scorer: "contains",
    expected: "spf13/viper",
    notes: "viper has more stars than afero",
  },
  {
    id: "web-07",
    category: "web",
    description:
      "Fetch https://api.github.com/repos/rs/zerolog and tell me the programming language listed (the 'language' field).",
    tools: ["fetch"],
    scorer: "exact",
    expected: "Go",
    notes: "rs/zerolog is written in Go",
  },
  {
    id: "web-08",
    category: "web",
    description:
      "Fetch https://api.github.com/repos/pelletier/go-toml/releases/latest and tell me the tag name of the latest release.",
    tools: ["fetch"],
    scorer: "regex",
    expectedPattern: "^v\\d+\\.\\d+\\.\\d+$",
    notes: "Should be a semver tag like v2.2.3",
  },
];
