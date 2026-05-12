import type { Task } from "./types.js";

// Code editing tasks. The agent must fix bugs so tests pass.
export const codeTasks: Task[] = [
  {
    id: "code-01",
    category: "code",
    description: `Fix the bug in /tmp/agent-sandbox/binary_search.py so that the tests in /tmp/agent-sandbox/test_binary_search.py pass.

The file contains a binary search implementation with a bug. Use the shell tool to run the tests: python3 /tmp/agent-sandbox/test_binary_search.py

When done, report "FINAL ANSWER: fixed" if tests pass.`,
    tools: ["read_file", "write_file", "shell"],
    scorer: "code_test",
    setupFiles: {
      "/tmp/agent-sandbox/binary_search.py": `def binary_search(arr, target):
    left, right = 0, len(arr)  # bug: should be len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1
`,
      "/tmp/agent-sandbox/test_binary_search.py": `from binary_search import binary_search
import sys

def test():
    arr = [1, 3, 5, 7, 9, 11, 13]
    assert binary_search(arr, 7) == 3, f"Expected 3, got {binary_search(arr, 7)}"
    assert binary_search(arr, 1) == 0, f"Expected 0, got {binary_search(arr, 1)}"
    assert binary_search(arr, 13) == 6, f"Expected 6, got {binary_search(arr, 13)}"
    assert binary_search(arr, 6) == -1, f"Expected -1, got {binary_search(arr, 6)}"
    assert binary_search([], 1) == -1, "Expected -1 for empty array"
    print("All tests passed!")

test()
`,
    },
    testCommand: "cd /tmp/agent-sandbox && python3 test_binary_search.py",
    notes: "Bug: right = len(arr) should be len(arr) - 1",
  },
  {
    id: "code-02",
    category: "code",
    description: `Fix the bug in /tmp/agent-sandbox/stack.go so that the tests pass.

Run tests with: cd /tmp/agent-sandbox && go test ./... -run TestStack

When done, report "FINAL ANSWER: fixed" if tests pass.`,
    tools: ["read_file", "write_file", "shell"],
    scorer: "code_test",
    setupFiles: {
      "/tmp/agent-sandbox/go.mod": `module sandbox

go 1.21
`,
      "/tmp/agent-sandbox/stack.go": `package sandbox

type Stack[T any] struct {
	items []T
}

func (s *Stack[T]) Push(v T) {
	s.items = append(s.items, v)
}

func (s *Stack[T]) Pop() (T, bool) {
	var zero T
	if len(s.items) == 0 {
		return zero, false
	}
	// bug: returns the first element instead of the last
	v := s.items[0]
	s.items = s.items[1:]
	return v, true
}

func (s *Stack[T]) Peek() (T, bool) {
	var zero T
	if len(s.items) == 0 {
		return zero, false
	}
	return s.items[len(s.items)-1], true
}

func (s *Stack[T]) Len() int {
	return len(s.items)
}
`,
      "/tmp/agent-sandbox/stack_test.go": `package sandbox

import "testing"

func TestStack(t *testing.T) {
	s := &Stack[int]{}
	s.Push(1)
	s.Push(2)
	s.Push(3)

	if v, ok := s.Pop(); !ok || v != 3 {
		t.Fatalf("Pop: expected 3, got %v (ok=%v)", v, ok)
	}
	if v, ok := s.Pop(); !ok || v != 2 {
		t.Fatalf("Pop: expected 2, got %v (ok=%v)", v, ok)
	}
	if v, ok := s.Pop(); !ok || v != 1 {
		t.Fatalf("Pop: expected 1, got %v (ok=%v)", v, ok)
	}
	if _, ok := s.Pop(); ok {
		t.Fatal("Pop on empty stack should return false")
	}
}
`,
    },
    testCommand: "cd /tmp/agent-sandbox && go test ./... -run TestStack",
    notes: "Bug: Pop returns s.items[0] (bottom) instead of s.items[len-1] (top)",
  },
  {
    id: "code-03",
    category: "code",
    description: `Fix the bug in /tmp/agent-sandbox/words.py so that the tests pass.

Run tests with: python3 /tmp/agent-sandbox/test_words.py

When done, report "FINAL ANSWER: fixed" if tests pass.`,
    tools: ["read_file", "write_file", "shell"],
    scorer: "code_test",
    setupFiles: {
      "/tmp/agent-sandbox/words.py": `def count_words(text):
    """Count occurrences of each word (case-insensitive)."""
    counts = {}
    for word in text.split():
        word = word.strip(".,!?;:").lower()
        if word in counts:
            counts[word] = counts[word] + 1
        else:
            counts[word] = 1  # bug: should start at 1, but actually starts at 0 after strip check
    return counts

def most_common(text, n=3):
    """Return the n most common words."""
    counts = count_words(text)
    # bug: sorted ascending instead of descending
    return sorted(counts.items(), key=lambda x: x[1])[:n]
`,
      "/tmp/agent-sandbox/test_words.py": `from words import count_words, most_common

def test():
    text = "the cat sat on the mat the cat"
    counts = count_words(text)
    assert counts["the"] == 3, f"Expected 3, got {counts['the']}"
    assert counts["cat"] == 2, f"Expected 2, got {counts['cat']}"
    assert counts["sat"] == 1, f"Expected 1, got {counts['sat']}"

    top = most_common(text, 2)
    assert top[0][0] == "the", f"Most common should be 'the', got {top[0][0]}"
    assert top[0][1] == 3, f"'the' should appear 3 times, got {top[0][1]}"
    print("All tests passed!")

test()
`,
    },
    testCommand: "cd /tmp/agent-sandbox && python3 test_words.py",
    notes: "Bug: most_common sorts ascending instead of descending",
  },
  {
    id: "code-04",
    category: "code",
    description: `Fix the bug in /tmp/agent-sandbox/cache.go so that the tests pass.

Run tests with: cd /tmp/agent-sandbox && go test ./... -run TestCache

When done, report "FINAL ANSWER: fixed" if tests pass.`,
    tools: ["read_file", "write_file", "shell"],
    scorer: "code_test",
    setupFiles: {
      "/tmp/agent-sandbox/cache.go": `package sandbox

import "sync"

// TTLCache is a simple in-memory cache without expiry (for this exercise).
type TTLCache struct {
	mu    sync.Mutex
	items map[string]string
}

func NewTTLCache() *TTLCache {
	return &TTLCache{} // bug: items map is nil, will panic on Set
}

func (c *TTLCache) Set(key, value string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.items[key] = value
}

func (c *TTLCache) Get(key string) (string, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	v, ok := c.items[key]
	return v, ok
}

func (c *TTLCache) Delete(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.items, key)
}
`,
      "/tmp/agent-sandbox/cache_test.go": `package sandbox

import "testing"

func TestCache(t *testing.T) {
	c := NewTTLCache()

	c.Set("a", "1")
	c.Set("b", "2")

	if v, ok := c.Get("a"); !ok || v != "1" {
		t.Fatalf("Get a: expected '1', got %q (ok=%v)", v, ok)
	}

	c.Delete("a")
	if _, ok := c.Get("a"); ok {
		t.Fatal("Get after Delete should return false")
	}

	if v, ok := c.Get("b"); !ok || v != "2" {
		t.Fatalf("Get b after deleting a: expected '2', got %q", v)
	}
}
`,
    },
    testCommand: "cd /tmp/agent-sandbox && go test ./... -run TestCache",
    notes: "Bug: NewTTLCache doesn't initialize the items map",
  },
  {
    id: "code-05",
    category: "code",
    description: `Fix the bug in /tmp/agent-sandbox/flatten.py so that the tests pass.

Run tests with: python3 /tmp/agent-sandbox/test_flatten.py

When done, report "FINAL ANSWER: fixed" if tests pass.`,
    tools: ["read_file", "write_file", "shell"],
    scorer: "code_test",
    setupFiles: {
      "/tmp/agent-sandbox/flatten.py": `def flatten(lst):
    """Recursively flatten a nested list."""
    result = []
    for item in lst:
        if isinstance(item, list):
            result.extend(flatten(item))
        else:
            result.append(item)
    return result

def flatten_depth(lst, depth=1):
    """Flatten a list up to a given depth."""
    if depth == 0:
        return lst
    result = []
    for item in lst:
        if isinstance(item, list):
            # bug: passes depth instead of depth-1, so depth is never reduced
            result.extend(flatten_depth(item, depth))
        else:
            result.append(item)
    return result
`,
      "/tmp/agent-sandbox/test_flatten.py": `from flatten import flatten, flatten_depth

def test():
    assert flatten([1, [2, 3], [4, [5, 6]]]) == [1, 2, 3, 4, 5, 6]
    assert flatten([]) == []
    assert flatten([[1, [2]], [3]]) == [1, 2, 3]

    assert flatten_depth([1, [2, [3, [4]]]], depth=1) == [1, 2, [3, [4]]]
    assert flatten_depth([1, [2, [3, [4]]]], depth=2) == [1, 2, 3, [4]]
    assert flatten_depth([1, [2, [3]]], depth=0) == [1, [2, [3]]]
    print("All tests passed!")

test()
`,
    },
    testCommand: "cd /tmp/agent-sandbox && python3 test_flatten.py",
    notes: "Bug: flatten_depth passes 'depth' instead of 'depth-1' in recursive call",
  },
  {
    id: "code-06",
    category: "code",
    description: `Fix the bug in /tmp/agent-sandbox/linked_list.go so that the tests pass.

Run tests with: cd /tmp/agent-sandbox && go test ./... -run TestLinkedList

When done, report "FINAL ANSWER: fixed" if tests pass.`,
    tools: ["read_file", "write_file", "shell"],
    scorer: "code_test",
    setupFiles: {
      "/tmp/agent-sandbox/linked_list.go": `package sandbox

type Node struct {
	Val  int
	Next *Node
}

func NewList(vals ...int) *Node {
	if len(vals) == 0 {
		return nil
	}
	head := &Node{Val: vals[0]}
	cur := head
	for _, v := range vals[1:] {
		cur.Next = &Node{Val: v}
		cur = cur.Next
	}
	return head
}

func ToSlice(head *Node) []int {
	var result []int
	for head != nil {
		result = append(result, head.Val)
		head = head.Next
	}
	return result
}

// Reverse reverses the linked list in place and returns the new head.
func Reverse(head *Node) *Node {
	var prev *Node
	cur := head
	for cur != nil {
		// bug: forgets to advance cur, causing infinite loop
		prev = cur
		cur.Next = prev
	}
	return prev
}
`,
      "/tmp/agent-sandbox/linked_list_test.go": `package sandbox

import (
	"reflect"
	"testing"
)

func TestLinkedList(t *testing.T) {
	head := NewList(1, 2, 3, 4, 5)
	rev := Reverse(head)
	got := ToSlice(rev)
	want := []int{5, 4, 3, 2, 1}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("Reverse: got %v, want %v", got, want)
	}

	single := NewList(42)
	rev2 := Reverse(single)
	if rev2.Val != 42 || rev2.Next != nil {
		t.Fatalf("Reverse single node: expected [42], got %v", ToSlice(rev2))
	}
}
`,
    },
    testCommand: "cd /tmp/agent-sandbox && go test ./... -run TestLinkedList",
    notes: "Bug: Reverse loop forgets to advance cur, causing infinite loop. Also the logic is wrong — it should save next, update cur.Next = prev, then advance.",
  },
];
