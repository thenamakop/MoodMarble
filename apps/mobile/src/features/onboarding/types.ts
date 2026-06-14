import { z } from "zod";

import { TeamIdSchema, WorkspaceIdSchema } from "@/contracts/mood-submission";

export const AnonymousSessionSchema = z.object({
  workspaceId: WorkspaceIdSchema,
  teamId: TeamIdSchema,
  deviceJwt: z.string().trim().min(1),
});

export type AnonymousSession = z.infer<typeof AnonymousSessionSchema>;
