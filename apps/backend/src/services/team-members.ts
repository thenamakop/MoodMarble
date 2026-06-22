import { randomUUID } from "node:crypto";

import type { TeamRole } from "../../../../packages/shared";
import { DeviceTokenSchema, TeamIdSchema } from "../../../../packages/shared";
import type { DatabaseClient } from "../db/client";
import { teamMembers } from "../db/schema";

export interface RegisterTeamMemberInput {
  teamId: string;
  deviceToken: string;
  role?: TeamRole;
}

export interface TeamMembershipStore {
  registerMember(input: RegisterTeamMemberInput): Promise<void>;
}

export class InMemoryTeamMembershipStore implements TeamMembershipStore {
  readonly memberships = new Map<
    string,
    {
      id: string;
      teamId: string;
      deviceToken: string;
      role: TeamRole;
      joinedAt: Date;
    }
  >();

  async registerMember(input: RegisterTeamMemberInput): Promise<void> {
    const deviceToken = DeviceTokenSchema.parse(input.deviceToken);
    const teamId = TeamIdSchema.parse(input.teamId);
    const role = input.role ?? "member";
    const existingMembership = this.memberships.get(deviceToken);

    this.memberships.set(deviceToken, {
      id: existingMembership?.id ?? createTeamMemberId(),
      teamId,
      deviceToken,
      role,
      joinedAt: existingMembership?.joinedAt ?? new Date(),
    });
  }

  countMembers(teamId: string): number {
    return Array.from(this.memberships.values()).filter(
      (membership) => membership.teamId === teamId,
    ).length;
  }
}

export class PostgresTeamMembershipStore implements TeamMembershipStore {
  constructor(private readonly databaseClient: DatabaseClient) {}

  async registerMember(input: RegisterTeamMemberInput): Promise<void> {
    const deviceToken = DeviceTokenSchema.parse(input.deviceToken);
    const teamId = TeamIdSchema.parse(input.teamId);
    const role = input.role ?? "member";

    await this.databaseClient.db
      .insert(teamMembers)
      .values({
        id: createTeamMemberId(),
        teamId,
        deviceToken,
        role,
      })
      .onConflictDoUpdate({
        target: teamMembers.deviceToken,
        set: {
          teamId,
          role,
        },
      });
  }
}

function createTeamMemberId(): string {
  return `tmm_${randomUUID().replace(/-/g, "").slice(0, 10)}`;
}
