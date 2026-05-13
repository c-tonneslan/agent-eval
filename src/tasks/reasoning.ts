import type { Task } from "./types.js";

// Reasoning tasks: logic, math, and structured inference.
// These have no fetch/shell — the agent must reason from the task description alone.
// They test whether the model actually reasons or just pattern-matches.
export const reasoningTasks: Task[] = [
  {
    id: "reason-01",
    category: "reasoning",
    description: `A farmer has 17 sheep. All but 9 die. How many sheep are left?`,
    tools: [],
    scorer: "exact",
    expected: "9",
    notes: "Classic trick question. 'All but 9' means 9 remain.",
  },
  {
    id: "reason-02",
    category: "reasoning",
    description: `You have a 3-gallon jug and a 5-gallon jug. No markings. You need exactly 4 gallons. Describe the steps to measure exactly 4 gallons. Report the step count as a number on the first line, then the steps.`,
    tools: [],
    scorer: "judge",
    rubric: `The classic water pouring puzzle. Correct solution (one of two valid paths):
Path A (6 steps): Fill 5gal → pour into 3gal → dump 3gal → pour 2gal into 3gal → fill 5gal → pour 1gal into 3gal → 4gal remain in 5gal.
Path B (also works): Fill 3gal → pour into 5gal → fill 3gal → pour into 5gal until full (2gal left in 3gal) → dump 5gal → pour 2gal into 5gal → fill 3gal → pour into 5gal = 5gal.
Score 5: Correct solution, clear step-by-step, arrives at exactly 4 gallons.
Score 4: Correct answer with minor explanation gaps.
Score 3: Partially correct logic, identifies the approach but makes an error.
Score 2: Wrong but shows some understanding of the constraint.
Score 1: Completely wrong or no meaningful attempt.`,
  },
  {
    id: "reason-03",
    category: "reasoning",
    description: `Three boxes are labeled "Apples", "Oranges", and "Apples & Oranges". All three labels are wrong. You can draw one fruit from one box without looking. What is the minimum number of draws needed to correctly label all boxes, and which box do you draw from first? Answer in the format: "N draw(s), draw from [box name]"`,
    tools: [],
    scorer: "judge",
    rubric: `Classic mislabeled boxes puzzle.
Correct answer: 1 draw, from the "Apples & Oranges" box.
Reasoning: Since all labels are wrong, the "Apples & Oranges" box must contain only apples or only oranges. Draw one — if you get an apple, that box is "Apples". The box labeled "Apples" can't be apples (wrong label) and can't be the mixed (that's solved), so it's "Oranges". The remaining box is "Apples & Oranges".
Score 5: Correctly says 1 draw, from "Apples & Oranges", with correct reasoning.
Score 4: Correct answer, reasoning has minor gaps.
Score 3: Correct number of draws but wrong box, or right box but wrong reasoning.
Score 2: Wrong number of draws (says 2 or more).
Score 1: No meaningful attempt.`,
  },
  {
    id: "reason-04",
    category: "reasoning",
    description: `What is the next number in this sequence: 1, 1, 2, 3, 5, 8, 13, 21, ?

Answer with just the number.`,
    tools: [],
    scorer: "exact",
    expected: "34",
    notes: "Fibonacci sequence. 13+21=34.",
  },
  {
    id: "reason-05",
    category: "reasoning",
    description: `If you have a rod of length 1 meter, and you cut off half of it, then cut half of what's left, and keep doing this forever, what is the total length you've cut off? Answer as a fraction or decimal.`,
    tools: [],
    scorer: "judge",
    rubric: `This is the geometric series 1/2 + 1/4 + 1/8 + ... = 1 (the sum of an infinite geometric series with ratio 1/2 is 1).
Score 5: Correctly says the total cut approaches 1 meter (the full rod), with reasoning about the geometric series or infinite sum.
Score 4: Correct answer (1 meter or "the full rod") without formal series explanation.
Score 3: Gets close — says "almost 1 meter" or "approaches 1" without full explanation.
Score 2: Wrong answer but shows understanding of repeated halving.
Score 1: Completely wrong (e.g., says 0.5 or infinity).`,
  },
  {
    id: "reason-06",
    category: "reasoning",
    description: `Alice is taller than Bob. Bob is taller than Carol. Carol is taller than David. Eve is shorter than Carol but taller than David.

Rank all five people from tallest to shortest. Use the format: "1. Name, 2. Name, ..." etc.`,
    tools: [],
    scorer: "judge",
    rubric: `From the clues: Alice > Bob > Carol > David, and Carol > Eve > David.
So the order is: Alice, Bob, Carol, Eve, David.
Score 5: Correct order (Alice, Bob, Carol, Eve, David) with clear reasoning.
Score 4: Correct order, minimal explanation.
Score 3: Almost correct — Eve and Carol swapped or David/Eve swapped.
Score 2: Partially correct (gets the extremes right but middle wrong).
Score 1: Wrong or no attempt.`,
  },
  {
    id: "reason-07",
    category: "reasoning",
    description: `A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost? Answer in cents (e.g., "5 cents").`,
    tools: [],
    scorer: "contains",
    expected: "5 cents",
    notes: "Classic CRT item. Ball = $0.05, not $0.10. Bat = $1.05.",
  },
];
