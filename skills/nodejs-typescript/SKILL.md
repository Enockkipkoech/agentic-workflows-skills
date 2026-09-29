---
name: nodejs-typescript
description: Guides agents in production Node.js and TypeScript development, including architecture, asynchronous programming, concurrency, APIs, testing, error handling, and performance. Use when developing, debugging, reviewing, or refactoring Node.js or TypeScript applications.
license: MIT
metadata:
  author: Enock Kipkoech
  version: "1.0.0"
---

# Node.js & TypeScript

## Use When

Use this skill when:

- Building Node.js applications.
- Writing TypeScript backend services.
- Designing TypeScript architecture.
- Debugging asynchronous code.
- Reviewing Node.js code.
- Working with concurrency or promises.

## Don't Use When

- The task is primarily Python development.
- The task is primarily infrastructure configuration.
- The task is purely UI/UX design.

Use the appropriate specialized skill instead.

## Workflow

1. Understand the application requirements.
2. Identify the runtime and framework.
3. Establish type-safe interfaces.
4. Separate business logic from infrastructure.
5. Implement error handling.
6. Add appropriate tests.
7. Review security and performance.
8. Validate the implementation.

## Rules

- Prefer strict TypeScript.
- Prefer `unknown` over `any`.
- Validate external input.
- Avoid unnecessary abstractions.
- Handle asynchronous failures explicitly.
- Avoid unbounded concurrency.

## Examples

- "Build a Node.js REST API" → Apply API architecture and TypeScript patterns.
- "Fix this Promise concurrency issue" → Analyze async execution and concurrency limits.
- "Review this TypeScript class" → Check types, design, errors, and maintainability.

## Edge Cases

- If an external API is involved, validate its response.
- If large workloads are processed, consider bounded concurrency.
- If multiple operations must succeed together, consider transactions.

## References

See:

- `references/typescript-patterns.md`