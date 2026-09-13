import { z } from "zod";
import type { HerdrPane, HerdrTab, HerdrWorkspace } from "../../types/plexer.ts";

const paneSchema = z.object({
  pane_id: z.string(),
  tab_id: z.string().optional(),
  workspace_id: z.string().optional(),
  agent_status: z.string().optional(),
  name: z.string().optional(),
  focused: z.boolean().optional(),
  agent: z.string().optional(),
  agent_session: z.object({ kind: z.string(), value: z.string() }).nullable().optional(),
  rect: z.object({ width: z.number(), height: z.number(), x: z.number(), y: z.number() }).optional(),
}) satisfies z.ZodType<HerdrPane>;

const tabSchema = z.object({
  tab_id: z.string(),
  label: z.string().optional(),
  workspace_id: z.string().optional(),
  focused: z.boolean().optional(),
  number: z.number().optional(),
  pane_count: z.number().optional(),
  agent_status: z.string().optional(),
}) satisfies z.ZodType<HerdrTab>;

const workspaceSchema = z.object({
  workspace_id: z.string(),
  label: z.string().optional(),
  focused: z.boolean().optional(),
  number: z.number().optional(),
  tab_count: z.number().optional(),
  pane_count: z.number().optional(),
  agent_status: z.string().optional(),
}) satisfies z.ZodType<HerdrWorkspace>;

export const tabOpenReplySchema = z.object({
  tab: tabSchema,
  root_pane: paneSchema,
});

export const moveReplySchema = z.object({
  move_result: z.object({
    changed: z.boolean().optional(),
    reason: z.string().optional(),
    pane: z.object({ pane_id: z.string().optional() }).optional(),
  }).optional(),
});

export const paneOpenReplySchema = z.object({
  pane: paneSchema.optional(),
  root_pane: paneSchema.optional(),
});

export const layoutReplySchema = z.object({
  layout: z.object({
    tab_id: z.string(),
    panes: z.array(z.object({
      pane_id: z.string(),
      rect: z.object({ width: z.number(), height: z.number(), x: z.number(), y: z.number() }),
    })),
  }),
});

export const workspaceOpenReplySchema = z.object({
  workspace: workspaceSchema.optional(),
  root_pane: paneSchema.optional(),
});

export const workspaceListReplySchema = z.object({
  workspaces: z.array(workspaceSchema),
});
