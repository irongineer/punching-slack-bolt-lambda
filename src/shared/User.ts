import { Installation } from '@slack/bolt';

export const scopes = ['users.profile:write'];
export type Scopes = typeof scopes[number];

export default interface User {
  tenantId: string;
  id: string;
  teamId: string;
  userId: string;
  sub: string;
  token: string;
  scopes: Scopes[];
}

interface UserInstallation {
  id: string;
  token: string;
  scopes: string[];
}

interface BuildPutUserParams {
  tenantId: string;
  sub: string;
  installation: Installation;
}

export const buildPutUserParams = ({
  tenantId,
  sub,
  installation,
}: BuildPutUserParams): User => {
  const teamId = installation.team.id;
  const userId = installation.user.id;
  return {
    tenantId,
    id: buildId({ tenantId, teamId, userId }),
    teamId,
    userId,
    sub,
    token: installation.user?.token || '',
    scopes: installation.user?.scopes || [],
  };
};

export const buildUserInstallation = ({
  id,
  token,
  scopes,
}: User): UserInstallation => {
  return { id, token, scopes };
};

interface BuildIdParams {
  tenantId: string;
  teamId: string;
  userId: string;
}

export const buildId = ({
  tenantId,
  teamId,
  userId,
}: BuildIdParams): string => {
  return `slack::${tenantId}::${teamId}::${userId}`;
};
