#!/usr/bin/env node

/**
 * Agentic Workflows & Skills — Claude Code Token Usage Analyzer
 *
 * Analyzes Claude Code session transcripts and reports:
 *
 *   - Main-thread vs subagent token usage
 *   - Fresh input / cache-write / cache-read / output tokens
 *   - Approximate cost-equivalent units
 *   - Web search / fetch usage
 *   - Spawned subagents
 *   - Heaviest assistant turns
 *
 * Repository-aware for:
 *
 *   agentic-workflows-skills/
 *   ├── skills/
 *   ├── workflows/
 *   ├── docs/
 *   └── scripts/
 *
 * Claude Code session files remain under:
 *
 *   ~/.claude/projects/<encoded-cwd>/<session-id>.jsonl
 *
 * The script is read-only and has zero external dependencies.
 *
 * Usage:
 *
 *   node scripts/analyze-token-usage.mjs
 *
 *   node scripts/analyze-token-usage.mjs <file.jsonl>
 *
 *   node scripts/analyze-token-usage.mjs --top 15
 *
 *   node scripts/analyze-token-usage.mjs --project <encoded-dir-name>
 *
 *   node scripts/analyze-token-usage.mjs --skill nodejs-typescript
 *
 *   node scripts/analyze-token-usage.mjs --workflow develop
 *
 * Examples:
 *
 *   # Analyze newest session for this repository
 *   node scripts/analyze-token-usage.mjs
 *
 *   # Show 20 heaviest turns
 *   node scripts/analyze-token-usage.mjs --top 20
 *
 *   # Analyze a specific Claude transcript
 *   node scripts/analyze-token-usage.mjs ~/.claude/projects/-home-user-project/session.jsonl
 *
 *   # Filter metadata displayed for a specific skill/workflow
 *   node scripts/analyze-token-usage.mjs --skill nodejs-typescript
 *
 * Notes:
 *
 *   Token usage is taken from Claude Code's transcript metadata.
 *   Cost units are intentionally approximate and are NOT dollar prices.
 */

// -----------------------------------------------------------------------------
// Imports
// -----------------------------------------------------------------------------

import {
  readFileSync,
  readdirSync,
  statSync,
  existsSync,
} from 'node:fs';

import {
  dirname,
  join,
  relative,
  resolve,
} from 'node:path';

import { homedir } from 'node:os';

// -----------------------------------------------------------------------------
// Repository metadata
// -----------------------------------------------------------------------------

const REPO_ROOT = resolve(import.meta.dirname, '..');

const SKILLS_DIR = join(REPO_ROOT, 'skills');
const WORKFLOWS_DIR = join(REPO_ROOT, 'workflows');

const REPOSITORY_NAME = 'agentic-workflows-skills';

// -----------------------------------------------------------------------------
// Approximate cost weights
// -----------------------------------------------------------------------------
//
// These weights are relative to one uncached input token.
//
// They are NOT official dollar prices.
//
// They are useful for comparing where token consumption is coming from.
//
// -----------------------------------------------------------------------------

const WEIGHTS = {
  input: 1.0,
  cacheWrite: 1.25,
  cacheRead: 0.1,
  output: 5.0,
};

// -----------------------------------------------------------------------------
// CLI arguments
// -----------------------------------------------------------------------------

const args = process.argv.slice(2);

function flag(name, defaultValue = null) {
  const index = args.indexOf(name);

  if (
    index >= 0 &&
    index + 1 < args.length &&
    !args[index + 1].startsWith('--')
  ) {
    return args[index + 1];
  }

  return defaultValue;
}

function hasFlag(name) {
  return args.includes(name);
}

const TOP = Math.max(
  1,
  Number(flag('--top', '12')) || 12,
);

const projectOverride = flag('--project');

const skillFilter = flag('--skill');

const workflowFilter = flag('--workflow');

// -----------------------------------------------------------------------------
// Claude project directory
// -----------------------------------------------------------------------------

/**
 * Claude Code encodes the current working directory by replacing
 * "/" with "-".
 *
 * Example:
 *
 *   /home/enock/my_projects/ai-agents-ml/agentic-workflows-skills
 *
 * becomes:
 *
 *   -home-enock-my_projects-ai-agents-ml-agentic-workflows-skills
 */
function encodedCwd() {
  return process.cwd().replace(/\//g, '-');
}

// -----------------------------------------------------------------------------
// Repository discovery
// -----------------------------------------------------------------------------

function repositoryInfo() {
  const skills = existsSync(SKILLS_DIR)
    ? readdirSync(SKILLS_DIR, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .sort()
    : [];

  const workflows = existsSync(WORKFLOWS_DIR)
    ? readdirSync(WORKFLOWS_DIR, { withFileTypes: true })
        .map(entry => entry.name)
        .filter(name => name !== '.DS_Store')
        .sort()
    : [];

  return {
    name: REPOSITORY_NAME,
    root: REPO_ROOT,
    skills,
    workflows,
  };
}

// -----------------------------------------------------------------------------
// Transcript resolution
// -----------------------------------------------------------------------------

function resolveTranscript() {
  const positional = args.find(
    argument =>
      !argument.startsWith('--') &&
      argument.endsWith('.jsonl'),
  );

  if (positional) {
    const file = resolve(positional);

    if (!existsSync(file)) {
      console.error(`Transcript not found: ${file}`);
      process.exit(1);
    }

    return file;
  }

  const projectDirectory = join(
    homedir(),
    '.claude',
    'projects',
    projectOverride || encodedCwd(),
  );

  if (!existsSync(projectDirectory)) {
    console.error(
      `No Claude Code session directory found:\n\n` +
      `  ${projectDirectory}\n\n` +
      `Pass a .jsonl transcript explicitly or use:\n\n` +
      `  --project <encoded-dir-name>`,
    );

    process.exit(1);
  }

  const files = readdirSync(projectDirectory)
    .filter(file => file.endsWith('.jsonl'))
    .map(file => {
      const path = join(projectDirectory, file);

      return {
        path,
        modified: statSync(path).mtimeMs,
      };
    })
    .sort((a, b) => b.modified - a.modified);

  if (!files.length) {
    console.error(
      `No .jsonl Claude Code transcripts found in:\n\n` +
      `  ${projectDirectory}`,
    );

    process.exit(1);
  }

  return files[0].path;
}

// -----------------------------------------------------------------------------
// Usage aggregation
// -----------------------------------------------------------------------------

function blankUsage() {
  return {
    input: 0,
    cacheWrite: 0,
    cacheRead: 0,
    output: 0,
    turns: 0,
    webSearch: 0,
    webFetch: 0,
  };
}

function addUsage(target, usage) {
  if (!usage) return;

  target.input += usage.input_tokens || 0;

  target.cacheWrite +=
    usage.cache_creation_input_tokens || 0;

  target.cacheRead +=
    usage.cache_read_input_tokens || 0;

  target.output += usage.output_tokens || 0;

  target.turns += 1;

  const serverToolUse =
    usage.server_tool_use || {};

  target.webSearch +=
    serverToolUse.web_search_requests || 0;

  target.webFetch +=
    serverToolUse.web_fetch_requests || 0;
}

function costUnits(usage) {
  return Math.round(
    usage.input * WEIGHTS.input +
    usage.cacheWrite * WEIGHTS.cacheWrite +
    usage.cacheRead * WEIGHTS.cacheRead +
    usage.output * WEIGHTS.output,
  );
}

function rawTotal(usage) {
  return (
    usage.input +
    usage.cacheWrite +
    usage.cacheRead +
    usage.output
  );
}

// -----------------------------------------------------------------------------
// Formatting
// -----------------------------------------------------------------------------

function formatTokens(value) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}m`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`;
  }

  return String(value);
}

function percentage(value, total) {
  if (!total) return 0;

  return Math.round((value / total) * 100);
}

function row(label, usage) {
  const parts = [
    `fresh ${formatTokens(usage.input).padStart(7)}`,
    `cache-write ${formatTokens(usage.cacheWrite).padStart(7)}`,
    `cache-read ${formatTokens(usage.cacheRead).padStart(8)}`,
    `output ${formatTokens(usage.output).padStart(7)}`,
  ];

  return (
    `  ${label.padEnd(18)} ${parts.join(' · ')}\n` +
    `  ${''.padEnd(18)} ` +
    `raw ${formatTokens(rawTotal(usage))}` +
    ` · cost-units ${formatTokens(costUnits(usage))}` +
    ` · ${usage.turns} turns`
  );
}

// -----------------------------------------------------------------------------
// Skill / workflow context
// -----------------------------------------------------------------------------

function printRepositoryContext() {
  const repo = repositoryInfo();

  console.log('REPOSITORY');

  console.log(`  name       ${repo.name}`);
  console.log(`  root       ${repo.root}`);
  console.log(`  skills     ${repo.skills.length}`);
  console.log(`  workflows  ${repo.workflows.length}`);

  if (repo.skills.length) {
    console.log(`\n  SKILLS`);

    for (const skill of repo.skills) {
      console.log(`    - ${skill}`);
    }
  }

  if (repo.workflows.length) {
    console.log(`\n  WORKFLOWS`);

    for (const workflow of repo.workflows) {
      console.log(`    - ${workflow}`);
    }
  }

  console.log('');
}

function printFilters() {
  if (!skillFilter && !workflowFilter) {
    return;
  }

  console.log('FILTER CONTEXT');

  if (skillFilter) {
    const skillPath = join(
      SKILLS_DIR,
      skillFilter,
    );

    console.log(
      `  skill     ${skillFilter}` +
      (existsSync(skillPath) ? '' : ' (not found)'),
    );
  }

  if (workflowFilter) {
    const workflowPath = join(
      WORKFLOWS_DIR,
      workflowFilter,
    );

    console.log(
      `  workflow  ${workflowFilter}` +
      (existsSync(workflowPath) ? '' : ' (not found)'),
    );
  }

  console.log('');
}

// -----------------------------------------------------------------------------
// Transcript analysis
// -----------------------------------------------------------------------------

const transcript = resolveTranscript();

const lines = readFileSync(
  transcript,
  'utf8',
)
  .split('\n')
  .filter(Boolean);

const main = blankUsage();
const subagents = blankUsage();

const spawnedAgents = [];

const turns = [];

const seenRequests = new Set();

for (const line of lines) {
  let event;

  try {
    event = JSON.parse(line);
  } catch {
    continue;
  }

  const content =
    event.message &&
    event.message.content;

  const tools = [];

  if (Array.isArray(content)) {
    for (const block of content) {
      if (block.type !== 'tool_use') {
        continue;
      }

      tools.push(block.name);

      if (
        block.name === 'Agent' ||
        block.name === 'Task'
      ) {
        spawnedAgents.push({
          type:
            block.input?.subagent_type ||
            'subagent',

          description:
            block.input?.description ||
            '',
        });
      }
    }
  }

  if (
    event.type !== 'assistant' ||
    !event.message ||
    !event.message.usage
  ) {
    continue;
  }

  /**
   * Claude Code can emit multiple streamed events for
   * the same API request.
   *
   * requestId is preferred over uuid.
   */
  const requestId =
    event.requestId ||
    event.uuid;

  if (
    requestId &&
    seenRequests.has(requestId)
  ) {
    continue;
  }

  if (requestId) {
    seenRequests.add(requestId);
  }

  const usage = event.message.usage;

  const bucket =
    event.isSidechain
      ? subagents
      : main;

  addUsage(bucket, usage);

  turns.push({
    sidechain: Boolean(event.isSidechain),

    output:
      usage.output_tokens || 0,

    cacheRead:
      usage.cache_read_input_tokens || 0,

    cacheWrite:
      usage.cache_creation_input_tokens || 0,

    input:
      usage.input_tokens || 0,

    tools,
  });
}

// -----------------------------------------------------------------------------
// Combined totals
// -----------------------------------------------------------------------------

const total = blankUsage();

for (const key of Object.keys(total)) {
  total[key] =
    main[key] +
    subagents[key];
}

// -----------------------------------------------------------------------------
// Output
// -----------------------------------------------------------------------------

console.log('');

printRepositoryContext();

printFilters();

console.log(`TRANSCRIPT`);
console.log(`  ${transcript}`);
console.log(
  `  events ${lines.length}` +
  ` · assistant turns ${total.turns}` +
  ` · main ${main.turns}` +
  ` · subagents ${subagents.turns}`,
);

console.log('');

console.log('TOKENS BY THREAD');

console.log(row('main thread', main));
console.log(row('subagents', subagents));
console.log(row('TOTAL', total));

const rawTokens = rawTotal(total) || 1;

const cacheReadPercentage =
  percentage(
    total.cacheRead,
    rawTokens,
  );

const outputCostPercentage =
  percentage(
    total.output * WEIGHTS.output,
    costUnits(total) || 1,
  );

console.log('');

console.log('COST INTERPRETATION');

console.log(
  `  ${cacheReadPercentage}% of raw tokens are cache reads.`,
);

console.log(
  `  Cache reads are weighted at ` +
  `${WEIGHTS.cacheRead}x fresh input.`,
);

console.log(
  `  Output represents approximately ` +
  `${outputCostPercentage}% of cost-units.`,
);

console.log('');

console.log(
  '  Priority: reduce OUTPUT and FRESH input first.',
);

console.log(
  '  Cache reads are comparatively inexpensive.',
);

console.log(
  '  Large resident skill/workflow files can increase ' +
  'cache-read volume without increasing cost proportionally.',
);

// -----------------------------------------------------------------------------
// Web usage
// -----------------------------------------------------------------------------

if (
  total.webSearch ||
  total.webFetch
) {
  console.log('');

  console.log('WEB USAGE');

  console.log(
    `  searches ${total.webSearch}` +
    ` · fetches ${total.webFetch}`,
  );
}

// -----------------------------------------------------------------------------
// Subagents
// -----------------------------------------------------------------------------

if (spawnedAgents.length) {
  console.log('');

  console.log(
    `SUBAGENTS SPAWNED (${spawnedAgents.length})`,
  );

  for (const agent of spawnedAgents) {
    console.log(
      `  - ${agent.type}: ${agent.description}`,
    );
  }

  if (subagents.turns === 0) {
    console.log('');

    console.log(
      '  Note: some asynchronous subagents may write ' +
      'their usage to separate transcript files.',
    );

    console.log(
      '  Their tokens therefore may not appear in this ' +
      'transcript total.',
    );
  }
}

// -----------------------------------------------------------------------------
// Heaviest turns
// -----------------------------------------------------------------------------

const heaviestTurns = [...turns]
  .sort(
    (a, b) =>
      b.output - a.output,
  )
  .slice(0, TOP);

console.log('');

console.log(
  `HEAVIEST ${heaviestTurns.length} TURNS ` +
  `(by output tokens)`,
);

for (const turn of heaviestTurns) {
  const thread =
    turn.sidechain
      ? 'sub '
      : 'main';

  const tools =
    turn.tools.length
      ? `[${[
          ...new Set(turn.tools),
        ].join(',')}]`
      : '';

  console.log(
    `  ${thread}` +
    ` out ${formatTokens(turn.output).padStart(7)}` +
    ` · cache-read ${formatTokens(turn.cacheRead).padStart(8)}` +
    ` ${tools}`,
  );
}

console.log('');
