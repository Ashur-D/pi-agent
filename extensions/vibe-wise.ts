/**
 * VibeWise for Pi Coding Agent (Optimized for Google Gemini)
 *
 * "You build. AI writes."
 *
 * A Pi extension and learning guide that puts understanding first.
 * The learner designs the architecture and makes all decisions;
 * AI provides feedback, explains concepts, asks follow-ups, and
 * implements the agreed design only after explicit approval.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import type {
  ExtensionAPI,
  ExtensionContext,
  Theme,
  AgentToolResult,
} from "@earendil-works/pi-coding-agent";
import {
  Editor,
  type EditorTheme,
  Key,
  matchesKey,
  Text,
  visibleWidth,
  wrapTextWithAnsi,
} from "@earendil-works/pi-tui";
import { Type, type Static } from "typebox";

// ─── State Management & Utilities ────────────────────────────────────────────

export interface LearnerProfile {
  mode: "active" | "paused";
  onboarding: "complete" | "incomplete";
  situation: string;
  building: string;
  codebaseFamiliarity: string;
  learningScope: string;
  experience: string;
  stack: string;
  frequency: "Light" | "Normal" | "Frequent";
  questionStyle: "Open-ended" | "Multiple choice" | "Mixed";
  implementationStyle: "AI writes code" | "A mix" | "More hands-on";
}

/**
 * Locate the nearest .vibe-wise or .sensible-vibes directory upward from cwd,
 * stopping at the nearest .git boundary. Symlinks are rejected.
 */
export function findStateDirectory(cwd: string): string | null {
  let dir = path.resolve(cwd);
  while (true) {
    for (const name of [".vibe-wise", ".sensible-vibes"]) {
      const candidate = path.join(dir, name);
      try {
        const stat = fs.lstatSync(candidate);
        if (stat.isDirectory() && !stat.isSymbolicLink()) {
          return candidate;
        }
      } catch {}
    }
    // Stop at .git directory or file (worktree / submodule)
    try {
      if (fs.existsSync(path.join(dir, ".git"))) {
        break;
      }
    } catch {}

    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Find the project root directory where .vibe-wise should be created.
 */
export function findProjectRoot(cwd: string): string {
  let dir = path.resolve(cwd);
  while (true) {
    if (fs.existsSync(path.join(dir, ".git"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(cwd);
}

/**
 * Check if the learner profile is currently active (not paused, not empty, not symlink).
 */
export function isProfileActive(stateDir: string | null): boolean {
  if (!stateDir) return false;
  const profilePath = path.join(stateDir, "profile.md");
  try {
    const stat = fs.lstatSync(profilePath);
    if (stat.isSymbolicLink() || !stat.isFile()) return false;
    const content = fs.readFileSync(profilePath, "utf-8");
    if (!content.trim()) return false;

    // Scan line by line for Learning mode: paused
    for (const line of content.split("\n")) {
      if (/^Learning mode:\s*paused\s*$/i.test(line.trim())) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse structured information from profile.md.
 */
export function readProfileDetails(stateDir: string): LearnerProfile {
  const defaults: LearnerProfile = {
    mode: "active",
    onboarding: "incomplete",
    situation: "Not specified",
    building: "Not specified",
    codebaseFamiliarity: "Not specified",
    learningScope: "Not specified",
    experience: "Beginner",
    stack: "Not specified",
    frequency: "Normal",
    questionStyle: "Open-ended",
    implementationStyle: "AI writes code",
  };

  const profilePath = path.join(stateDir, "profile.md");
  if (!fs.existsSync(profilePath)) return defaults;

  try {
    const text = fs.readFileSync(profilePath, "utf-8");
    const getVal = (regex: RegExp, fallback: string): string => {
      const match = text.match(regex);
      return match ? match[1].trim() : fallback;
    };

    const isPaused = /^Learning mode:\s*paused\s*$/im.test(text);
    const isOnboardingComplete = /^Onboarding:\s*complete\s*$/im.test(text);

    return {
      mode: isPaused ? "paused" : "active",
      onboarding: isOnboardingComplete ? "complete" : "incomplete",
      situation: getVal(/Situation:\s*(.+)$/im, defaults.situation),
      building: getVal(/Building:\s*(.+)$/im, defaults.building),
      codebaseFamiliarity: getVal(/Codebase familiarity:\s*(.+)$/im, defaults.codebaseFamiliarity),
      learningScope: getVal(/Learning scope:\s*(.+)$/im, defaults.learningScope),
      experience: getVal(/Overall programming:\s*(.+)$/im, defaults.experience),
      stack: getVal(/Stack familiarity:\s*(.+)$/im, defaults.stack),
      frequency: (getVal(/Checkpoint frequency:\s*(.+)$/im, "Normal") as any) || "Normal",
      questionStyle: (getVal(/Question style:\s*(.+)$/im, "Open-ended") as any) || "Open-ended",
      implementationStyle: (getVal(/Implementation style:\s*(.+)$/im, "AI writes code") as any) || "AI writes code",
    };
  } catch {
    return defaults;
  }
}

/**
 * Set active / paused state in profile.md.
 */
export function setProfileMode(stateDir: string, mode: "active" | "paused"): boolean {
  const profilePath = path.join(stateDir, "profile.md");
  if (!fs.existsSync(profilePath)) return false;

  try {
    let content = fs.readFileSync(profilePath, "utf-8");
    if (/Learning mode:\s*(active|paused)/i.test(content)) {
      content = content.replace(/Learning mode:\s*(active|paused)/i, `Learning mode: ${mode}`);
    } else {
      content = `Learning mode: ${mode}\n` + content;
    }
    fs.writeFileSync(profilePath, content, "utf-8");
    return true;
  } catch {
    return false;
  }
}

/**
 * Initialize fresh .vibe-wise directory and notes.
 */
export function initializeState(
  projectRoot: string,
  profile: Partial<LearnerProfile> = {}
): string {
  const stateDir = path.join(projectRoot, ".vibe-wise");
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }

  const profileContent = `# Learner Profile

Learning mode: ${profile.mode || "active"}
Onboarding: ${profile.onboarding || "complete"}

## Project
Situation: ${profile.situation || "New project"}
Building: ${profile.building || "Application development"}
Codebase familiarity: ${profile.codebaseFamiliarity || "Not specified"}
Learning scope: ${profile.learningScope || "entire system"}

## Experience
Overall programming: ${profile.experience || "Beginner"}
Stack familiarity: ${profile.stack || "Not specified"}

## Goals
Primary: Understand the project end to end as we build it.
Capability goal: Not specified

## Preferences
Checkpoint frequency: ${profile.frequency || "Normal"}
Question style: ${profile.questionStyle || "Open-ended"}
Implementation style: ${profile.implementationStyle || "AI writes code"}

## Strong Concepts
No demonstrated understanding recorded yet.

## Developing Concepts
None recorded yet.

## Revisit
None recorded yet.
`;

  const progressContent = `# Learning Progress

No learning events recorded yet.
`;

  const mapContent = `# Project Map

## Purpose
${profile.building || "[What this software does.]"}

## Requirements
[User needs and constraints. These do not automatically settle technical choices.]

## Components
[Components, responsibilities, and supporting file paths.]

## Main Flow
[Compact text diagram with labeled arrows. Reflect the learner's model refined together.]

## Data and Trust Boundaries
[Storage, ownership, auth, external services; unknown when unverified.]

## Build and Deployment
[Commands and configuration paths verified in the repository.]

## Unknowns
[Unresolved technical choices and architecture questions.]
`;

  fs.writeFileSync(path.join(stateDir, "profile.md"), profileContent, "utf-8");
  fs.writeFileSync(path.join(stateDir, "progress.md"), progressContent, "utf-8");
  fs.writeFileSync(path.join(stateDir, "project-map.md"), mapContent, "utf-8");

  return stateDir;
}

/**
 * Backup existing notes and reset with fresh onboarding templates.
 */
export function backupAndResetState(stateDir: string): { success: boolean; backupDir?: string; error?: string } {
  try {
    const backupParent = path.join(stateDir, "backups");
    if (!fs.existsSync(backupParent)) {
      fs.mkdirSync(backupParent, { recursive: true, mode: 0o700 });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const randomHex = crypto.randomBytes(3).toString("hex");
    const backupDir = path.join(backupParent, `reset-${timestamp}-${randomHex}`);
    fs.mkdirSync(backupDir, { mode: 0o700 });

    const filenames = ["profile.md", "progress.md", "project-map.md"];
    for (const file of filenames) {
      const src = path.join(stateDir, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(backupDir, file));
      }
    }

    // Write fresh templates with Onboarding: incomplete and Onboarding reset: pending
    const freshProfile = `# Learner Profile

Learning mode: active
Onboarding: incomplete
Onboarding reset: pending

Remaining onboarding: Project situation, experience, stack familiarity, goals, and preferences.
`;

    const freshProgress = `# Learning Progress\n\nNo learning events recorded yet.\n`;
    const freshMap = `# Project Map\n\nNot mapped yet. Inspect current project.\n`;

    fs.writeFileSync(path.join(stateDir, "profile.md"), freshProfile, "utf-8");
    fs.writeFileSync(path.join(stateDir, "progress.md"), freshProgress, "utf-8");
    fs.writeFileSync(path.join(stateDir, "project-map.md"), freshMap, "utf-8");

    return { success: true, backupDir };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Tool Parameter Schemas ──────────────────────────────────────────────────

const OptionSchema = Type.Object({
  label: Type.String({ description: "Short option label (e.g. 'Implement this step', 'Discuss', 'Beginner')" }),
  description: Type.Optional(Type.String({ description: "Optional brief explanation of this choice" })),
});

const AskUserQuestionParams = Type.Object({
  question: Type.String({ description: "The single question to ask the user" }),
  options: Type.Array(OptionSchema, { description: "2 to 4 options for the user to choose from" }),
  header: Type.Optional(Type.String({ description: "Optional short header (max 12 characters, e.g. 'Checkpoint')" })),
  multiSelect: Type.Optional(Type.Boolean({ description: "Allow multiple selections (default: false)" })),
});

type AskUserQuestionType = Static<typeof AskUserQuestionParams>;

interface QuestionDetails {
  question: string;
  header?: string;
  options: string[];
  answer: string | null;
  wasCustom?: boolean;
}

// ─── Main Extension Factory ──────────────────────────────────────────────────

export default function vibeWiseExtension(pi: ExtensionAPI) {
  // Ephemeral flag: becomes true when the learner confirms an Implementation Checkpoint
  let isImplementationApproved = false;

  // ─── Interactive Question Tool ─────────────────────────────────────────────
  function registerQuestionTool(toolName: string) {
    pi.registerTool({
      name: toolName,
      label: "Ask User Question",
      description:
        "Ask the user an interactive multiple-choice question with keyboard selection. " +
        "Use for onboarding choices and Design or Implementation checkpoint confirmations.",
      parameters: AskUserQuestionParams,
      executionMode: "sequential",

      async execute(_toolCallId, params: AskUserQuestionType, _signal, _onUpdate, ctx) {
        if (params.options.length === 0) {
          return {
            content: [{ type: "text", text: "Error: No options provided" }],
            details: { question: params.question, options: [], answer: null },
          };
        }

        // Check if this is an Implementation Checkpoint confirmation
        const isImplementationPrompt = params.options.some((o) =>
          /implement this step|implement/i.test(o.label)
        );

        // If TUI mode is available, render interactive picker
        if (ctx.mode === "tui") {
          const allOptions = [
            ...params.options,
            { label: "Type something...", description: "Provide custom response in text", isOther: true },
          ];

          const result = await ctx.ui.custom<{ answer: string; wasCustom: boolean; index?: number } | null>(
            (tui, theme, _kb, done) => {
              let optionIndex = 0;
              let editMode = false;
              let cachedLines: string[] | undefined;

              const editorTheme: EditorTheme = {
                borderColor: (s) => theme.fg("accent", s),
                selectList: {
                  selectedPrefix: (t) => theme.fg("accent", t),
                  selectedText: (t) => theme.fg("accent", t),
                  description: (t) => theme.fg("muted", t),
                  scrollInfo: (t) => theme.fg("dim", t),
                  noMatch: (t) => theme.fg("warning", t),
                },
              };
              const editor = new Editor(tui, editorTheme);

              editor.onSubmit = (value) => {
                const trimmed = value.trim();
                if (trimmed) {
                  done({ answer: trimmed, wasCustom: true });
                } else {
                  editMode = false;
                  editor.setText("");
                  refresh();
                }
              };

              function refresh() {
                cachedLines = undefined;
                tui.requestRender();
              }

              function handleInput(data: string) {
                if (editMode) {
                  if (matchesKey(data, Key.escape)) {
                    editMode = false;
                    editor.setText("");
                    refresh();
                    return;
                  }
                  editor.handleInput(data);
                  refresh();
                  return;
                }

                if (matchesKey(data, Key.up)) {
                  optionIndex = Math.max(0, optionIndex - 1);
                  refresh();
                  return;
                }
                if (matchesKey(data, Key.down)) {
                  optionIndex = Math.min(allOptions.length - 1, optionIndex + 1);
                  refresh();
                  return;
                }

                // Number shortcut keys: '1' selects option 1, '2' selects option 2, etc.
                const num = parseInt(data, 10);
                if (!isNaN(num) && num >= 1 && num <= allOptions.length) {
                  const targetIndex = num - 1;
                  const selected = allOptions[targetIndex];
                  if (selected.isOther) {
                    editMode = true;
                    refresh();
                  } else {
                    done({ answer: selected.label, wasCustom: false, index: num });
                  }
                  return;
                }

                if (matchesKey(data, Key.enter)) {
                  const selected = allOptions[optionIndex];
                  if (selected.isOther) {
                    editMode = true;
                    refresh();
                  } else {
                    done({ answer: selected.label, wasCustom: false, index: optionIndex + 1 });
                  }
                  return;
                }

                if (matchesKey(data, Key.escape)) {
                  done(null);
                }
              }

              function render(width: number): string[] {
                if (cachedLines) return cachedLines;

                const lines: string[] = [];
                const renderWidth = Math.max(1, width);

                function addWrappedWithPrefix(prefix: string, text: string) {
                  const prefixWidth = visibleWidth(prefix);
                  if (prefixWidth >= renderWidth) {
                    lines.push(...wrapTextWithAnsi(prefix + text, renderWidth));
                    return;
                  }
                  const wrapped = wrapTextWithAnsi(text, renderWidth - prefixWidth);
                  const continuationPrefix = " ".repeat(prefixWidth);
                  for (let i = 0; i < wrapped.length; i++) {
                    lines.push(`${i === 0 ? prefix : continuationPrefix}${wrapped[i]}`);
                  }
                }

                const headerText = params.header ? `[${params.header}] ` : "✦ Checkpoint: ";
                lines.push(theme.fg("accent", "─".repeat(renderWidth)));
                addWrappedWithPrefix(" ", theme.bold(theme.fg("accent", headerText)) + theme.fg("text", params.question));
                lines.push("");

                for (let i = 0; i < allOptions.length; i++) {
                  const opt = allOptions[i];
                  const selected = i === optionIndex;
                  const isOther = opt.isOther === true;
                  const prefix = selected ? theme.fg("accent", "> ") : "  ";
                  const label = `${i + 1}. ${opt.label}${isOther && editMode ? " ✎" : ""}`;
                  const color = selected || (isOther && editMode) ? "accent" : "text";

                  addWrappedWithPrefix(prefix, theme.fg(color, label));

                  if (opt.description) {
                    addWrappedWithPrefix("     ", theme.fg("muted", opt.description));
                  }
                }

                if (editMode) {
                  lines.push("");
                  addWrappedWithPrefix(" ", theme.fg("muted", "Your custom answer:"));
                  for (const line of editor.render(Math.max(1, renderWidth - 2))) {
                    lines.push(` ${line}`);
                  }
                }

                lines.push("");
                if (editMode) {
                  addWrappedWithPrefix(" ", theme.fg("dim", "Enter to submit • Esc to go back"));
                } else {
                  addWrappedWithPrefix(" ", theme.fg("dim", "↑↓ / 1-9 to select • Enter to confirm • Esc to cancel"));
                }
                lines.push(theme.fg("accent", "─".repeat(renderWidth)));

                cachedLines = lines;
                return lines;
              }

              return {
                render,
                invalidate: () => {
                  cachedLines = undefined;
                },
                handleInput,
              };
            }
          );

          const optionLabels = params.options.map((o) => o.label);

          if (!result) {
            return {
              content: [{ type: "text", text: "User cancelled the selection" }],
              details: { question: params.question, options: optionLabels, answer: null } as QuestionDetails,
            };
          }

          if (result.wasCustom) {
            return {
              content: [{ type: "text", text: `User wrote: ${result.answer}` }],
              details: {
                question: params.question,
                header: params.header,
                options: optionLabels,
                answer: result.answer,
                wasCustom: true,
              } as QuestionDetails,
            };
          }

          // If the user selected "Implement this step", grant approval!
          if (isImplementationPrompt && /implement this step|implement/i.test(result.answer)) {
            isImplementationApproved = true;
          }

          return {
            content: [{ type: "text", text: `User selected: ${result.index}. ${result.answer}` }],
            details: {
              question: params.question,
              header: params.header,
              options: optionLabels,
              answer: result.answer,
              wasCustom: false,
            } as QuestionDetails,
          };
        }

        // Fallback for non-interactive or RPC mode
        if (ctx.hasUI) {
          const choices = params.options.map((o, idx) => `${idx + 1}. ${o.label}`);
          const picked = await ctx.ui.select(params.question, choices);
          if (!picked) {
            return {
              content: [{ type: "text", text: "User cancelled selection" }],
              details: { question: params.question, options: params.options.map((o) => o.label), answer: null },
            };
          }
          if (isImplementationPrompt && /implement this step|implement/i.test(picked)) {
            isImplementationApproved = true;
          }
          return {
            content: [{ type: "text", text: `User selected: ${picked}` }],
            details: { question: params.question, options: params.options.map((o) => o.label), answer: picked },
          };
        }

        // Plain text fallback
        const formatted = params.options.map((o, i) => `${i + 1}. ${o.label}${o.description ? ` (${o.description})` : ""}`).join("\n");
        return {
          content: [
            {
              type: "text",
              text: `${params.question}\nOptions:\n${formatted}\n(Please respond with your choice)`,
            },
          ],
          details: { question: params.question, options: params.options.map((o) => o.label), answer: null },
        };
      },

      renderCall(args, theme, _context) {
        const header = args.header ? `[${args.header}] ` : "";
        let text = theme.fg("accent", theme.bold("✦ Checkpoint: ")) + theme.fg("text", `${header}${args.question}`);
        const opts = Array.isArray(args.options) ? args.options : [];
        if (opts.length) {
          const list = opts.map((o: any, i: number) => `  ${i + 1}. ${o.label}`);
          text += `\n${theme.fg("dim", list.join("\n"))}`;
        }
        return new Text(text, 0, 0);
      },

      renderResult(result, _options, theme, _context) {
        const details = result.details as QuestionDetails | undefined;
        if (!details) {
          const text = result.content[0];
          return new Text(text?.type === "text" ? text.text : "", 0, 0);
        }

        if (details.answer === null) {
          return new Text(theme.fg("warning", "Cancelled"), 0, 0);
        }

        if (details.wasCustom) {
          return new Text(
            theme.fg("success", "✓ ") + theme.fg("muted", "(wrote) ") + theme.fg("accent", details.answer),
            0,
            0
          );
        }
        return new Text(theme.fg("success", "✓ ") + theme.fg("accent", details.answer), 0, 0);
      },
    });
  }

  // Register both standard ask_user_question and AskUserQuestion
  registerQuestionTool("ask_user_question");
  registerQuestionTool("AskUserQuestion");

  // ─── Gemini Tool-Call Safety Guard ──────────────────────────────────────────
  pi.on("tool_call", async (event, ctx) => {
    const stateDir = findStateDirectory(ctx.cwd);
    if (!stateDir || !isProfileActive(stateDir)) return;

    const toolName = event.toolName;
    if (toolName === "edit" || toolName === "write") {
      const input = event.input as any;
      const targetFile = input?.file || input?.path || "";
      const resolved = path.resolve(ctx.cwd, targetFile);

      // Notes inside .vibe-wise are always editable (the agent needs to update learning notes!)
      if (resolved.startsWith(stateDir) || resolved.includes(".vibe-wise") || resolved.includes(".sensible-vibes")) {
        return;
      }

      // If learner has NOT approved implementation for this turn:
      if (!isImplementationApproved) {
        return {
          block: true,
          reason:
            "✦ VibeWise Guard: Direct file modification is blocked! " +
            "In VibeWise learning mode, you must NEVER modify application files until the learner has designed the solution " +
            "and explicitly confirmed an Implementation Checkpoint.\n" +
            "Action required:\n" +
            "1. Present an '✦ Implementation checkpoint: <title>' summarizing the exact changes.\n" +
            "2. Call `ask_user_question` with:\n" +
            "   - 'Implement this step' (description: 'Write the code for this step')\n" +
            "   - 'Discuss' (description: 'Ask questions or adjust details before coding')\n" +
            "3. Only proceed to edit/write after the learner selects 'Implement this step'.",
        };
      }
    }
  });

  // ─── Reset Approval on Agent End ───────────────────────────────────────────
  pi.on("agent_end", () => {
    // Reset approval flag so subsequent tasks require a new checkpoint
    isImplementationApproved = false;
  });

  // ─── Session Start ─────────────────────────────────────────────────────────
  pi.on("session_start", (_event, ctx) => {
    const stateDir = findStateDirectory(ctx.cwd);
    if (!stateDir || !isProfileActive(stateDir)) {
      ctx.ui.setStatus("vibe-wise", undefined);
      return;
    }

    const profile = readProfileDetails(stateDir);
    const label = `✦ VibeWise: active (${profile.experience} · ${profile.frequency})`;
    ctx.ui.setStatus("vibe-wise", ctx.ui.theme.fg("accent", label));

    // Warn if .vibe-wise is not in .gitignore
    const gitignorePath = path.join(ctx.cwd, ".gitignore");
    if (fs.existsSync(gitignorePath)) {
      try {
        const gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");
        if (!gitignoreContent.includes(".vibe-wise")) {
          // Remind learner non-intrusively
          ctx.ui.notify("Tip: Consider adding .vibe-wise/ to .gitignore to keep learning notes private", "info");
        }
      } catch {}
    }
  });

  // ─── System Prompt Injection & Chat Triggers ───────────────────────────────
  pi.on("before_agent_start", (event, ctx) => {
    const stateDir = findStateDirectory(ctx.cwd);
    if (!stateDir || !isProfileActive(stateDir)) {
      return;
    }

    const promptText = event.prompt.trim();

    // Check for conversational implementation approval triggers
    if (
      /^(implement this step|implement|go ahead and (implement|write|code)|just implement( this one)?|confirm and implement|proceed to implement|proceed with implementation|skip checkpoints)\b/i.test(
        promptText
      )
    ) {
      isImplementationApproved = true;
    }

    // Check for conversational pause/resume triggers
    if (/^pause learning\b/i.test(promptText)) {
      setProfileMode(stateDir, "paused");
      ctx.ui.setStatus("vibe-wise", ctx.ui.theme.fg("muted", "✦ VibeWise: paused"));
      ctx.ui.notify("✦ VibeWise learning paused. Resume with /learn.", "info");
      return;
    }
    if (/^resume learning\b/i.test(promptText)) {
      setProfileMode(stateDir, "active");
      const profile = readProfileDetails(stateDir);
      ctx.ui.setStatus("vibe-wise", ctx.ui.theme.fg("accent", `✦ VibeWise: active (${profile.experience})`));
      ctx.ui.notify("✦ VibeWise learning resumed.", "info");
    }

    // Read stored notes
    let profileText = "";
    let mapText = "";
    let progressText = "";
    try {
      profileText = fs.readFileSync(path.join(stateDir, "profile.md"), "utf-8");
    } catch {}
    try {
      mapText = fs.readFileSync(path.join(stateDir, "project-map.md"), "utf-8");
    } catch {}
    try {
      progressText = fs.readFileSync(path.join(stateDir, "progress.md"), "utf-8");
    } catch {}

    const profile = readProfileDetails(stateDir);
    const pendingMatch = progressText.match(/## Pending decision[\s\S]*?(?=\n## |$)/i);
    const pendingDecision = pendingMatch ? pendingMatch[0].trim() : "None pending";
    const isOnboardingIncomplete = /Onboarding:\s*incomplete/i.test(profileText);

    // Build Gemini-optimized system prompt section
    const vibeWiseSection = `
# VIBEWISE LEARNING MODE (ACTIVE)
You are operating in VibeWise learning mode. The human is the engineer and leads all design choices.
You are their mentor, reviewer, and pair programmer.
YOUR MOTTO: "You build. AI writes."

## LEARNER PROFILE:
- Overall programming: ${profile.experience}
- Stack familiarity: ${profile.stack}
- Checkpoint frequency: ${profile.frequency}
- Question style: ${profile.questionStyle}
- Implementation style: ${profile.implementationStyle}

## CRITICAL RULES FOR GEMINI:
1. NEVER WRITE OR MODIFY PROJECT CODE UNTIL THE LEARNER APPROVES AN IMPLEMENTATION CHECKPOINT.
   - When the user asks to build, change, or fix something, DO NOT call 'write' or 'edit' tools.
   - Always invite the learner's approach first using:
     ✦ Build checkpoint: <title>
   - Ask: "How would you approach this?" or ask a focused question about architecture, data flow, or state.
   - Wait for the learner to reply.

2. TEACH CONCEPTS DIRECTLY, LEAVE DESIGN DECISIONS TO THE LEARNER:
   - When explaining an unfamiliar concept, use:
     ✦ Concept: <clear explanation of what it is>
     ✦ Why this matters: <practical consequence in this project>
   - Use compact ASCII flow diagrams: e.g. \`notes ← folder links → folders\`
   - Keep guidance concise (1–3 sentences) and avoid filler or personal hype.

3. CHECKPOINT HEADINGS (use exact bold headings with ✦):
   - ✦ Build checkpoint: <title> — Open-ended reasoning questions in chat.
   - ✦ Design checkpoint: <title> — Summarize proposed architecture and tradeoffs. Propose additions in a table: Detail | Proposal | Why it matters. Call \`ask_user_question\` with options:
     1. Confirm and continue (records design, moves to next piece; NO code yet)
     2. Discuss (ask questions or clarify)
   - ✦ Implementation checkpoint: <title> — Specific code changes ready to make. Call \`ask_user_question\` with:
     1. Implement this step ("This approach makes sense to me; write the code for this step.")
     2. Discuss ("Ask questions or clarify anything before deciding.")
   - ✦ Implementation report: <title> — After writing code and running tests, summarize what changed, how key code works, and actual verification/test results.

4. NATIVE TOOL PICKER:
   - Always call \`ask_user_question\` for multiple-choice onboarding and checkpoint confirmations.
   - Open-ended reasoning belongs in chat.

5. MAINTAIN LOCAL STATE IN ${stateDir}:
   - Update profile.md (mastered concepts, developing concepts).
   - Update progress.md (topics introduced, pending decisions).
   - Update project-map.md (purpose, requirements, components, data boundaries, unknowns).

${
  isOnboardingIncomplete
    ? `## ONBOARDING IN PROGRESS:
Ask only unanswered onboarding questions one at a time using ask_user_question:
- What are we doing? (New project / Existing repo / Known project)
- Programming experience (Beginner / Intermediate / Advanced)
- Stack familiarity (Beginner / Intermediate / Advanced)
- Preferences (Use defaults / Customize)
When complete, update profile.md to 'Onboarding: complete' and begin the task.`
    : ""
}

## CURRENT PROJECT MAP:
${mapText || "Not mapped yet."}

## CURRENT PENDING DECISION:
${pendingDecision}
`.trim();

    event.systemPromptOptions.sections.vibe_wise = vibeWiseSection;
  });

  // ─── Slash Commands ────────────────────────────────────────────────────────

  // /learn (or /vibe-wise)
  pi.registerCommand("learn", {
    description: "Activate or resume VibeWise learning-first development",
    handler: async (_args, ctx) => {
      let stateDir = findStateDirectory(ctx.cwd);

      // If state directory already exists
      if (stateDir) {
        if (!isProfileActive(stateDir)) {
          setProfileMode(stateDir, "active");
          const profile = readProfileDetails(stateDir);
          ctx.ui.setStatus("vibe-wise", ctx.ui.theme.fg("accent", `✦ VibeWise: active (${profile.experience})`));
          ctx.ui.notify("✦ VibeWise learning mode resumed!", "info");
          return;
        }

        // Already active
        const profile = readProfileDetails(stateDir);
        ctx.ui.notify(
          `✦ VibeWise is active (${profile.experience} · ${profile.frequency} checkpoints). Ask Gemini what you'd like to build!`,
          "info"
        );
        return;
      }

      // First-time setup: interactive onboarding in TUI if available
      const projectRoot = findProjectRoot(ctx.cwd);

      if (ctx.mode === "tui" && ctx.hasUI) {
        // Step 1: Situation
        const situation = await ctx.ui.select("✦ VibeWise Setup — What are we doing?", [
          "1. New project (building from scratch)",
          "2. Existing repo (joining an unfamiliar or existing codebase)",
          "3. Known project (already familiar with the codebase)",
        ]);
        if (!situation) return;

        let codebaseFamiliarity = "Not specified";
        let learningScope = "entire system";

        if (situation.startsWith("2")) {
          const fam = await ctx.ui.select("✦ Codebase Familiarity", [
            "1. New to this codebase",
            "2. A little experience",
            "3. Know it well",
          ]);
          if (fam) codebaseFamiliarity = fam.replace(/^\d+\.\s*/, "");

          const scope = await ctx.ui.select("✦ Learning Scope", [
            "1. Whole system",
            "2. Parts we touch",
            "3. A mix",
          ]);
          if (scope) learningScope = scope.replace(/^\d+\.\s*/, "");
        }

        // Step 2: Experience
        const exp = await ctx.ui.select("✦ Overall Programming Experience", [
          "1. Beginner (explain concepts, use diagrams, small steps)",
          "2. Intermediate (focus on interactions and tradeoffs)",
          "3. Advanced (probe difficult constraints and failure modes)",
        ]);
        if (!exp) return;
        const experience = exp.includes("Beginner")
          ? "Beginner"
          : exp.includes("Intermediate")
          ? "Intermediate"
          : "Advanced";

        // Step 3: Stack Familiarity
        const stackChoice = await ctx.ui.select("✦ Stack Familiarity", [
          "1. Beginner (new to this tech stack)",
          "2. Intermediate (some experience with this stack)",
          "3. Advanced (comfortable with this stack)",
        ]);
        const stack = stackChoice
          ? stackChoice.includes("Beginner")
            ? "Beginner"
            : stackChoice.includes("Intermediate")
            ? "Intermediate"
            : "Advanced"
          : "Not specified";

        // Step 4: Preferences
        const prefChoice = await ctx.ui.select("✦ Preferences", [
          "1. Use defaults (Reason through each decision first; AI writes code)",
          "2. Customize (Adjust frequency, question style, coding style)",
        ]);

        let frequency: "Light" | "Normal" | "Frequent" = "Normal";
        let questionStyle: "Open-ended" | "Multiple choice" | "Mixed" = "Open-ended";
        let implementationStyle: "AI writes code" | "A mix" | "More hands-on" = "AI writes code";

        if (prefChoice && prefChoice.startsWith("2")) {
          const freq = await ctx.ui.select("✦ Checkpoint Frequency", [
            "1. Light (major decisions only)",
            "2. Normal (each meaningful decision)",
            "3. Frequent (smaller incremental steps)",
          ]);
          if (freq) {
            frequency = freq.includes("Light") ? "Light" : freq.includes("Frequent") ? "Frequent" : "Normal";
          }

          const qStyle = await ctx.ui.select("✦ Question Style", [
            "1. Open-ended (practice explaining engineering thinking in chat)",
            "2. Multiple choice (structured options)",
            "3. Mixed",
          ]);
          if (qStyle) {
            questionStyle = qStyle.includes("Multiple") ? "Multiple choice" : qStyle.includes("Mixed") ? "Mixed" : "Open-ended";
          }

          const cStyle = await ctx.ui.select("✦ Coding Preference", [
            "1. AI writes code (you lead the design; AI writes verified code)",
            "2. A mix (collaborative coding)",
            "3. More hands-on",
          ]);
          if (cStyle) {
            implementationStyle = cStyle.includes("mix") ? "A mix" : cStyle.includes("hands-on") ? "More hands-on" : "AI writes code";
          }
        }

        // Initialize state
        stateDir = initializeState(projectRoot, {
          situation: situation.replace(/^\d+\.\s*/, ""),
          codebaseFamiliarity,
          learningScope,
          experience,
          stack,
          frequency,
          questionStyle,
          implementationStyle,
          onboarding: "complete",
        });

        ctx.ui.setStatus("vibe-wise", ctx.ui.theme.fg("accent", `✦ VibeWise: active (${experience} · ${frequency})`));
        ctx.ui.notify("✦ VibeWise initialized! You lead the design; AI writes the code.", "info");
      } else {
        // Non-interactive fallback: create default profile and let model onboard
        stateDir = initializeState(projectRoot, { onboarding: "incomplete" });
        ctx.ui.setStatus("vibe-wise", ctx.ui.theme.fg("accent", "✦ VibeWise: active"));
        ctx.ui.notify("✦ VibeWise initialized! Describe what you'd like to build to begin.", "info");
      }
    },
  });

  // /learn:reset
  pi.registerCommand("learn:reset", {
    description: "Back up learning notes and restart onboarding for this project",
    handler: async (_args, ctx) => {
      const stateDir = findStateDirectory(ctx.cwd);
      if (!stateDir) {
        ctx.ui.notify("No VibeWise notes found for this project.", "warning");
        return;
      }

      const confirmed = await ctx.ui.confirm(
        "Reset VibeWise Learning?",
        "This backs up your profile, progress, and project map to .vibe-wise/backups/ " +
        "and restarts onboarding. Application code will NOT be touched."
      );

      if (!confirmed) {
        ctx.ui.notify("Reset cancelled.", "info");
        return;
      }

      const res = backupAndResetState(stateDir);
      if (!res.success) {
        ctx.ui.notify(`Reset failed: ${res.error}`, "error");
        return;
      }

      ctx.ui.notify(`✦ Notes backed up to ${res.backupDir}. Restarting onboarding...`, "info");
      // Trigger learn command to re-onboard
      const commands = (pi as any).getCommands?.() || [];
      const learnCmd = commands.find((c: any) => c.name === "learn");
      if (learnCmd?.handler) {
        await learnCmd.handler("", ctx);
      }
    },
  });

  // /learn:status
  pi.registerCommand("learn:status", {
    description: "Show current VibeWise learning status and preferences",
    handler: async (_args, ctx) => {
      const stateDir = findStateDirectory(ctx.cwd);
      if (!stateDir) {
        ctx.ui.notify("VibeWise is not initialized in this project. Run /learn to start.", "info");
        return;
      }

      const profile = readProfileDetails(stateDir);
      const lines = [
        `Status: ${profile.mode.toUpperCase()}`,
        `Location: ${stateDir}`,
        `Experience: ${profile.experience}`,
        `Stack: ${profile.stack}`,
        `Checkpoint Frequency: ${profile.frequency}`,
        `Question Style: ${profile.questionStyle}`,
        `Implementation Style: ${profile.implementationStyle}`,
      ];

      ctx.ui.notify(lines.join(" | "), "info");
    },
  });

  // /learn:pause
  pi.registerCommand("learn:pause", {
    description: "Pause VibeWise learning mode",
    handler: async (_args, ctx) => {
      const stateDir = findStateDirectory(ctx.cwd);
      if (!stateDir) {
        ctx.ui.notify("VibeWise is not initialized in this project.", "warning");
        return;
      }
      setProfileMode(stateDir, "paused");
      ctx.ui.setStatus("vibe-wise", ctx.ui.theme.fg("muted", "✦ VibeWise: paused"));
      ctx.ui.notify("✦ VibeWise learning paused. Resume anytime with /learn:resume or /learn.", "info");
    },
  });

  // /learn:resume
  pi.registerCommand("learn:resume", {
    description: "Resume VibeWise learning mode",
    handler: async (_args, ctx) => {
      const stateDir = findStateDirectory(ctx.cwd);
      if (!stateDir) {
        ctx.ui.notify("VibeWise is not initialized in this project. Run /learn to start.", "warning");
        return;
      }
      setProfileMode(stateDir, "active");
      const profile = readProfileDetails(stateDir);
      ctx.ui.setStatus("vibe-wise", ctx.ui.theme.fg("accent", `✦ VibeWise: active (${profile.experience})`));
      ctx.ui.notify("✦ VibeWise learning mode resumed!", "info");
    },
  });
}
