#!/usr/bin/env node

/**
 * Portability and convention guard for Enock's Agentic Workflows and Skills.
 *
 * Repository layout:
 *
 *   agentic-workflows-skills/
 *   ├── skills/
 *   │   └── <skill>/
 *   │       └── SKILL.md
 *   │
 *   └── workflows/
 *       └── <workflow>/
 *           ├── SKILL.md
 *           ├── agents/
 *           └── supporting files
 *
 * Run:
 *
 *   node scripts/check-portability.mjs
 *
 * Exit code:
 *
 *   0 = passed
 *   1 = one or more violations
 *
 * The checker is intentionally read only.
 *
 * Rules:
 *
 *   1. Every SKILL.md declares allowed-tools.
 *   2. No Claude-only model alias is hardcoded as a spawn directive.
 *   3. Subagent tools are not named directly in prose.
 *   4. SKILL.md files do not contain shell glue that breaks PowerShell.
 *   5. Instruction files stay within their byte budgets.
 *   6. Skill descriptions stay below the character cap.
 *   7. Workflow skills ship their OpenAI Codex adapter.
 *   8. allowed-tools uses Agent rather than legacy Task.
 *   9. Duplicated contract blocks stay byte identical.
 *  10. No em or en dash appears in instruction files.
 *  11. No ordinary hyphenated prose appears in instruction files.
 */

import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs';

import { join, relative } from 'node:path';

// -----------------------------------------------------------------------------
// Repository paths
// -----------------------------------------------------------------------------

const REPO_ROOT = new URL('../', import.meta.url).pathname;

const SKILLS_DIR = join(REPO_ROOT, 'skills');
const WORKFLOWS_DIR = join(REPO_ROOT, 'workflows');

// Both are collections of Agent Skills.
//
// A directory becomes an installable skill when it contains SKILL.md.
const SKILL_ROOTS = [
  {
    name: 'skills',
    path: SKILLS_DIR,
    kind: 'skill',
  },
  {
    name: 'workflows',
    path: WORKFLOWS_DIR,
    kind: 'workflow',
  },
];

const violations = [];
const warnings = [];

const sizes = [];

// -----------------------------------------------------------------------------
// Budgets
// -----------------------------------------------------------------------------

const WARN_AT = 0.9;

const SKILL_BYTE_BUDGET = 32 * 1024;

const SKILL_BYTE_OVERRIDES = {};

const SUPPORT_MD_BYTE_BUDGET = 24 * 1024;

const SUPPORT_MD_OVERRIDES = {
  'workflows/architect/agent-prompt.md': 32 * 1024,

  'workflows/architect/internal/design-conversation.md': 29 * 1024,
};

// -----------------------------------------------------------------------------
// Description limits
// -----------------------------------------------------------------------------

const DESCRIPTION_CHAR_CAP = 400;

// -----------------------------------------------------------------------------
// Hot path budgets
// -----------------------------------------------------------------------------
//
// These paths describe the files that are commonly loaded together.
//
// All paths are repository relative.
// -----------------------------------------------------------------------------

const HOT_PATH_BUDGETS = [
  {
    name: 'architect main full design path',

    budget: 72 * 1024,

    required: [
      'workflows/architect/SKILL.md',
      'workflows/architect/internal/design-conversation.md',
      'workflows/architect/internal/after-subagent.md',
    ],
  },

  {
    name: 'architect subagent write path',

    budget: 56 * 1024,

    required: [
      'workflows/architect/agent-prompt.md',
      'workflows/architect/spec-template.md',
    ],

    oneOf: [
      'workflows/architect/agent-modes/feature.md',
      'workflows/architect/agent-modes/architecture.md',
      'workflows/architect/agent-modes/enhancement.md',
      'workflows/architect/agent-modes/cross-cutting.md',
    ],
  },

  {
    name: 'scope plan path',

    budget: 48 * 1024,

    required: [
      'workflows/scope/SKILL.md',
      'workflows/scope/modes/plan.md',
      'workflows/scope/scope-template.md',
      'workflows/scope/approaches/facade.md',
    ],

    oneOf: [
      'workflows/scope/modes/plan-greenfield.md',
      'workflows/scope/modes/plan-brownfield.md',
      'workflows/scope/modes/plan-monorepo.md',
    ],
  },

  {
    name: 'scope replan and add path',

    budget: 25 * 1024,

    required: [
      'workflows/scope/SKILL.md',
      'workflows/scope/scope-template.md',
    ],

    oneOf: [
      'workflows/scope/modes/replan.md',
      'workflows/scope/modes/add.md',
    ],
  },

  {
    name: 'develop UI path',

    budget: 52 * 1024,

    required: [
      'workflows/develop/ui-guide.md',
      'workflows/develop/ui/implementation.md',
    ],

    oneOf: [
      'workflows/develop/ui/mcp.md',
      'workflows/develop/ui/image.md',
      'workflows/develop/ui/existing.md',
      'workflows/develop/ui/generate.md',
    ],
  },

  {
    name: 'audit phase path',

    budget: 26 * 1024,

    required: [
      'workflows/audit/SKILL.md',
      'workflows/audit/modes/tool-skills.md',
    ],

    oneOf: [
      'workflows/audit/modes/greenfield.md',
      'workflows/audit/modes/whole-repo.md',
      'workflows/audit/modes/area.md',
      'workflows/audit/modes/gapfill.md',
    ],
  },

  {
    name: 'test setup path',

    budget: 26 * 1024,

    required: [
      'workflows/test/SKILL.md',
      'workflows/test/modes/setup.md',
    ],
  },

  {
    name: 'develop build path',

    budget: 51 * 1024,

    required: [
      'workflows/develop/SKILL.md',
      'workflows/develop/flow/build.md',
    ],

    oneOf: [
      'workflows/develop/ui-guide.md',
      'workflows/develop/logical-guide.md',
    ],
  },

  {
    name: 'develop UI build path',

    budget: 90 * 1024,

    required: [
      'workflows/develop/SKILL.md',
      'workflows/develop/flow/build.md',
      'workflows/develop/ui-guide.md',
      'workflows/develop/ui/implementation.md',
      'workflows/develop/checklist.md',
    ],

    oneOf: [
      'workflows/develop/ui/mcp.md',
      'workflows/develop/ui/image.md',
      'workflows/develop/ui/existing.md',
      'workflows/develop/ui/generate.md',
    ],
  },
];

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function repoRelative(path) {
  return relative(REPO_ROOT, path).replaceAll('\\', '/');
}

function isFile(path) {
  return existsSync(path) && statSync(path).isFile();
}

function readText(path) {
  return readFileSync(path, 'utf8');
}

function byteLength(text) {
  return Buffer.byteLength(text, 'utf8');
}

function frontmatter(text) {
  const match = text.match(
    /^---\n([\s\S]*?)\n---/,
  );

  return match ? match[1] : '';
}

function isSkillFile(path) {
  return path.endsWith('/SKILL.md');
}

// -----------------------------------------------------------------------------
// Walk markdown files
// -----------------------------------------------------------------------------

function walk(dir, callback) {
  if (!existsSync(dir)) return;

  for (const entry of readdirSync(dir, {
    withFileTypes: true,
  })) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(path, callback);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.md')) {
      callback(path);
    }
  }
}

// -----------------------------------------------------------------------------
// Discover Agent Skills
// -----------------------------------------------------------------------------

function discoverSkills() {
  const result = [];

  for (const root of SKILL_ROOTS) {
    if (!existsSync(root.path)) continue;

    for (const entry of readdirSync(root.path, {
      withFileTypes: true,
    })) {
      if (!entry.isDirectory()) continue;

      const directory = join(root.path, entry.name);

      const skillFile = join(
        directory,
        'SKILL.md',
      );

      if (!isFile(skillFile)) continue;

      result.push({
        name: entry.name,
        kind: root.kind,
        root: root.name,
        directory,
        skillFile,
        relative: repoRelative(skillFile),
      });
    }
  }

  return result;
}

// -----------------------------------------------------------------------------
// Rule 11 helpers
// -----------------------------------------------------------------------------

const MASK = value =>
  ' '.repeat(value.length);

/**
 * Remove regions where hyphens are expected and permitted:
 *
 *   - fenced code
 *   - inline code
 *   - HTML comments
 *   - markdown link targets
 *   - URLs
 *   - frontmatter keys
 *
 * Keep the description because it is prose.
 */
function proseOnly(text) {
  return text
    .replace(
      /```[\s\S]*?```/g,
      MASK,
    )

    .replace(
      /`[^`\n]+`/g,
      MASK,
    )

    .replace(
      /<!--[\s\S]*?-->/g,
      MASK,
    )

    .replace(
      /\]\([^)]*\)/g,
      MASK,
    )

    .replace(
      /https?:\/\/\S+/g,
      MASK,
    )

    .replace(
      /^---\n[\s\S]*?\n---/m,
      frontmatterBlock =>
        frontmatterBlock
          .split('\n')
          .map(line =>
            /^description:/.test(line)
              ? line
              : MASK(line),
          )
          .join('\n'),
    );
}

// -----------------------------------------------------------------------------
// Parsed literals
// -----------------------------------------------------------------------------
//
// These names are part of the workflow protocol and therefore intentionally
// contain hyphens.
// -----------------------------------------------------------------------------

const PARSED_LITERALS = new Set([
  'in-progress',
  'gap-fill',
  'whole-repo',
  'Follow-up',
  'follow-up',
  'pre-flight',
  'Pre-flight',
]);

function isExemptTerm(word) {
  return (
    /^[A-Z0-9-]+$/.test(word) ||
    PARSED_LITERALS.has(word)
  );
}

// -----------------------------------------------------------------------------
// Rule 1, 2, 3, 4, 5, 6, 8, 10, 11
// -----------------------------------------------------------------------------

function checkMarkdown(path) {
  const relativePath = repoRelative(path);

  const text = readText(path);

  const isSkillMd =
    path.endsWith('/SKILL.md');

  const fm = frontmatter(text);

  // ---------------------------------------------------------------------------
  // Size report
  // ---------------------------------------------------------------------------

  const words = text.trim()
    ? text.trim().split(/\s+/).length
    : 0;

  const bytes = byteLength(text);

  sizes.push({
    rel: relativePath,
    words,
    bytes,
  });

  // ---------------------------------------------------------------------------
  // Rule 1
  // ---------------------------------------------------------------------------

  if (
    isSkillMd &&
    !/^allowed-tools:/m.test(fm)
  ) {
    violations.push(
      `${relativePath}: missing \`allowed-tools\` in frontmatter`,
    );
  }

  // ---------------------------------------------------------------------------
  // Rule 8
  // ---------------------------------------------------------------------------

  if (isSkillMd) {
    const allowedTools = fm.match(
      /^allowed-tools:\s*(.*)$/m,
    );

    if (
      allowedTools &&
      /\bTask\b/.test(allowedTools[1])
    ) {
      violations.push(
        `${relativePath}: allowed-tools declares \`Task\`; use \`Agent\` instead`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 5 and Rule 6
  // ---------------------------------------------------------------------------

  if (isSkillMd) {
    const skillName =
      relativePath.split('/')[1];

    const budget =
      SKILL_BYTE_OVERRIDES[skillName] ??
      SKILL_BYTE_BUDGET;

    if (bytes > budget) {
      violations.push(
        `${relativePath}: ${bytes} bytes exceeds its skill budget of ${budget}`,
      );
    } else if (
      bytes / budget > WARN_AT
    ) {
      warnings.push(
        `${relativePath}: ${bytes}/${budget} bytes ` +
        `(${(100 * bytes / budget).toFixed(1)}% of skill budget)`,
      );
    }

    const descriptionMatch =
      fm.match(
        /^description:\s*"([\s\S]*?)"\s*$/m,
      );

    if (
      descriptionMatch &&
      descriptionMatch[1].length >
        DESCRIPTION_CHAR_CAP
    ) {
      violations.push(
        `${relativePath}: description is ` +
        `${descriptionMatch[1].length} characters ` +
        `(cap ${DESCRIPTION_CHAR_CAP})`,
      );
    } else if (
      descriptionMatch &&
      descriptionMatch[1].length /
        DESCRIPTION_CHAR_CAP >
        WARN_AT
    ) {
      warnings.push(
        `${relativePath}: description is ` +
        `${descriptionMatch[1].length}/${DESCRIPTION_CHAR_CAP} characters`,
      );
    }

    // Description is loaded into sessions, so enforce the dash rule there too.
    if (
      descriptionMatch &&
      /[—–]/.test(
        descriptionMatch[1],
      )
    ) {
      violations.push(
        `${relativePath}: description contains an em or en dash`,
      );
    }
  } else {
    const budget =
      SUPPORT_MD_OVERRIDES[relativePath] ??
      SUPPORT_MD_BYTE_BUDGET;

    if (bytes > budget) {
      violations.push(
        `${relativePath}: ${bytes} bytes exceeds support file budget of ${budget}`,
      );
    } else if (
      bytes / budget > WARN_AT
    ) {
      warnings.push(
        `${relativePath}: ${bytes}/${budget} bytes ` +
        `(${(100 * bytes / budget).toFixed(1)}% of support file budget)`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 11
  // ---------------------------------------------------------------------------

  {
    const masked = proseOnly(text);

    const seen = new Set();

    const pattern =
      /[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)+/g;

    for (
      const match of masked.matchAll(pattern)
    ) {
      const word = match[0];

      if (isExemptTerm(word)) {
        continue;
      }

      const line =
        masked
          .slice(0, match.index)
          .split('\n')
          .length;

      const key =
        `${line}:${word}`;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);

      violations.push(
        `${relativePath}:${line}: hyphen in prose ` +
        `\`${word}\`; rewrite it as simple words`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Line based checks
  // ---------------------------------------------------------------------------

  const lines = text.split('\n');

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    // -------------------------------------------------------------------------
    // Rule 2
    // -------------------------------------------------------------------------

    if (
      /model:\s*"(haiku|sonnet|opus|fable)"/.test(
        line,
      )
    ) {
      violations.push(
        `${relativePath}:${lineNumber}: hardcoded model alias; use role words instead`,
      );
    }

    // -------------------------------------------------------------------------
    // Rule 3
    // -------------------------------------------------------------------------

    if (
      /\bthe [`"]?(Agent|Task)[`"]? tool\b/i.test(
        line,
      ) ||
      /spawn an [`"]?Agent\b/i.test(
        line,
      )
    ) {
      violations.push(
        `${relativePath}:${lineNumber}: names the subagent tool in prose; use capability first wording`,
      );
    }

    // -------------------------------------------------------------------------
    // Rule 4
    // -------------------------------------------------------------------------

    if (
      isSkillMd &&
      (
        />\/dev\/null/.test(line) ||
        /&&\s*BASE=/.test(line) ||
        /\|\|\s*BASE=/.test(line)
      )
    ) {
      violations.push(
        `${relativePath}:${lineNumber}: non portable shell glue; express base branch selection as prose`,
      );
    }

    // -------------------------------------------------------------------------
    // Rule 10
    // -------------------------------------------------------------------------

    if (/[—–]/.test(line)) {
      violations.push(
        `${relativePath}:${lineNumber}: contains an em or en dash`,
      );
    }
  });
}

// -----------------------------------------------------------------------------
// Scan skills and workflows
// -----------------------------------------------------------------------------

for (const root of SKILL_ROOTS) {
  walk(root.path, checkMarkdown);
}

// -----------------------------------------------------------------------------
// Validate hot paths
// -----------------------------------------------------------------------------

for (const group of HOT_PATH_BUDGETS) {
  let bytes = 0;

  let missing = false;

  for (const relativePath of group.required) {
    const absolutePath =
      join(REPO_ROOT, relativePath);

    if (!isFile(absolutePath)) {
      violations.push(
        `${group.name}: required file is missing: ${relativePath}`,
      );

      missing = true;
      continue;
    }

    bytes += byteLength(
      readText(absolutePath),
    );
  }

  if (group.oneOf) {
    let largest = 0;
    let largestPath = '';

    for (const relativePath of group.oneOf) {
      const absolutePath =
        join(REPO_ROOT, relativePath);

      if (!isFile(absolutePath)) {
        continue;
      }

      const size =
        byteLength(
          readText(absolutePath),
        );

      if (size > largest) {
        largest = size;
        largestPath = relativePath;
      }
    }

    if (largestPath) {
      bytes += largest;

      group.detail =
        ` (largest optional: ${largestPath})`;
    } else {
      violations.push(
        `${group.name}: none of the optional files exist`,
      );

      missing = true;
    }
  }

  group.bytes = bytes;

  if (missing) {
    continue;
  }

  if (bytes > group.budget) {
    violations.push(
      `${group.name}: ${bytes} bytes exceeds ` +
      `hot path budget of ${group.budget}` +
      `${group.detail ?? ''}`,
    );
  } else if (
    bytes / group.budget > WARN_AT
  ) {
    warnings.push(
      `${group.name}: ${bytes}/${group.budget} bytes ` +
      `(${(100 * bytes / group.budget).toFixed(1)}% of budget)`,
    );
  }
}

// -----------------------------------------------------------------------------
// Rule 9
// -----------------------------------------------------------------------------
//
// Contract blocks can appear in skills OR workflows.
//
// They must remain byte identical wherever duplicated.
// -----------------------------------------------------------------------------

const CONTRACT_BLOCK =
  /<!-- ([A-Z-]+):START[^>]*-->([\s\S]*?)<!-- \1:END -->/g;

const contracts = new Map();

for (const file of sizes) {
  const absolutePath =
    join(REPO_ROOT, file.rel);

  const text =
    readText(absolutePath);

  for (
    const [, name, body] of
      text.matchAll(CONTRACT_BLOCK)
  ) {
    if (!contracts.has(name)) {
      contracts.set(name, []);
    }

    contracts.get(name).push({
      rel: file.rel,
      body: body.trim(),
    });
  }
}

for (const [name, copies] of contracts) {
  if (copies.length < 2) {
    violations.push(
      `${copies[0].rel}: contract block \`${name}\` appears only once`,
    );

    continue;
  }

  const [first, ...rest] = copies;

  for (const other of rest) {
    if (other.body !== first.body) {
      violations.push(
        `contract block \`${name}\` has drifted: ` +
        `${first.rel} and ${other.rel} differ`,
      );
    }
  }
}

// -----------------------------------------------------------------------------
// Rule 7
// -----------------------------------------------------------------------------
//
// The existing workflow system uses OpenAI Codex adapters.
//
// Generic domain skills under skills/ do not require the adapter.
//
// This keeps:
//
//   skills/nodejs-typescript/SKILL.md
//
// valid without forcing workflow specific adapter files into every domain
// skill.
//
// Workflows continue to require:
//
//   workflows/<name>/agents/openai.yaml
// -----------------------------------------------------------------------------

if (existsSync(WORKFLOWS_DIR)) {
  for (
    const entry of readdirSync(
      WORKFLOWS_DIR,
      { withFileTypes: true },
    )
  ) {
    if (!entry.isDirectory()) {
      continue;
    }

    const workflowName = entry.name;

    const workflowDir =
      join(
        WORKFLOWS_DIR,
        workflowName,
      );

    const skillFile =
      join(
        workflowDir,
        'SKILL.md',
      );

    if (!isFile(skillFile)) {
      continue;
    }

    const adapter =
      join(
        workflowDir,
        'agents',
        'openai.yaml',
      );

    if (!isFile(adapter)) {
      violations.push(
        `workflows/${workflowName}: missing agents/openai.yaml`,
      );

      continue;
    }

    const yaml =
      readText(adapter);

    for (
      const field of [
        'interface:',
        'display_name:',
        'short_description:',
        'default_prompt:',
      ]
    ) {
      if (!yaml.includes(field)) {
        violations.push(
          `workflows/${workflowName}/agents/openai.yaml: missing \`${field.replace(':', '')}\` field`,
        );
      }
    }
  }
}

// -----------------------------------------------------------------------------
// Repository summary
// -----------------------------------------------------------------------------

const discoveredSkills =
  discoverSkills();

const domainSkills =
  discoveredSkills.filter(
    skill => skill.kind === 'skill',
  );

const workflows =
  discoveredSkills.filter(
    skill => skill.kind === 'workflow',
  );

// -----------------------------------------------------------------------------
// Results
// -----------------------------------------------------------------------------

const failed =
  violations.length > 0;

console.log('');

console.log(
  'Agentic Workflows and Skills portability check',
);

console.log('');

console.log(
  `Repository: ${repoRelative(REPO_ROOT) || '.'}`,
);

console.log(
  `Domain skills: ${domainSkills.length}`,
);

console.log(
  `Workflows: ${workflows.length}`,
);

console.log(
  `Instruction files: ${sizes.length}`,
);

if (domainSkills.length) {
  console.log('\nSkills:');

  for (const skill of domainSkills) {
    console.log(`  - ${skill.name}`);
  }
}

if (workflows.length) {
  console.log('\nWorkflows:');

  for (const workflow of workflows) {
    console.log(`  - ${workflow.name}`);
  }
}

// -----------------------------------------------------------------------------
// Failures
// -----------------------------------------------------------------------------

if (failed) {
  console.error(
    `\nPortability check FAILED (${violations.length} violation${violations.length === 1 ? '' : 's'}):`,
  );

  for (const violation of violations) {
    console.error(`  - ${violation}`);
  }
}

// -----------------------------------------------------------------------------
// Instruction file report
// -----------------------------------------------------------------------------

if (!failed) {
  const report =
    [...sizes]
      .sort(
        (a, b) => b.bytes - a.bytes,
      )
      .slice(0, 15);

  if (report.length) {
    const padding =
      Math.max(
        ...report.map(
          file => file.rel.length,
        ),
      );

    console.log(
      '\nHeaviest instruction files (words and bytes):',
    );

    for (const file of report) {
      console.log(
        `  ${file.rel.padEnd(padding)} ` +
        `${String(file.words).padStart(5)} w · ` +
        `${String(file.bytes).padStart(6)} b`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Hot path report
  // ---------------------------------------------------------------------------

  if (HOT_PATH_BUDGETS.length) {
    const padding =
      Math.max(
        ...HOT_PATH_BUDGETS.map(
          group => group.name.length,
        ),
      );

    console.log(
      '\nHot path budgets (bytes used / budget · utilization):',
    );

    for (const group of HOT_PATH_BUDGETS) {
      if (
        typeof group.bytes !== 'number'
      ) {
        continue;
      }

      const percent =
        (100 * group.bytes) /
        group.budget;

      const flag =
        percent > 100 * WARN_AT
          ? '  <-- shrink this'
          : '';

      console.log(
        `  ${group.name.padEnd(padding)} ` +
        `${String(group.bytes).padStart(6)} / ` +
        `${String(group.budget).padStart(6)} ` +
        `${percent.toFixed(1).padStart(5)}%` +
        flag,
      );
    }
  }
}

// -----------------------------------------------------------------------------
// Warnings
// -----------------------------------------------------------------------------

if (warnings.length) {
  console.log(
    `\nWARNINGS (${warnings.length}) ` +
    `under budget but above ${100 * WARN_AT}%:`,
  );

  for (const warning of warnings) {
    console.log(`  - ${warning}`);
  }
}

// -----------------------------------------------------------------------------
// Exit status
// -----------------------------------------------------------------------------

if (failed) {
  process.exitCode = 1;
} else {
  console.log(
    '\nPortability check passed. ' +
    'Skills and workflows follow the repository conventions.',
  );
}
