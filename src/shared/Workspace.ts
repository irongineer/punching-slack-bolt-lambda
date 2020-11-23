import { Installation } from '@slack/bolt';

export const scopes = ['commands', 'chat:write'];
export type Scopes = typeof scopes[number];

export default interface Workspace {
  tenantId: string;
  id: string;
  teamId: string;
  name: string;
  appId: string;
  botId: string;
  botUserId: string;
  installUserId: string;
  token: string;
  scopes: Scopes[];
}

interface BuildPutWorkspaceParams {
  tenantId: string;
  installation: Installation;
}

export const buildPutWorkspaceParams = ({
  tenantId,
  installation,
}: BuildPutWorkspaceParams): Workspace => {
  const teamId = installation.team.id;
  return {
    tenantId,
    id: buildId({ tenantId, teamId }),
    teamId: installation.team.id,
    name: installation.team.name,
    appId: installation.appId || '',
    botId: installation.bot?.id || '',
    botUserId: installation.bot?.userId || '',
    installUserId: installation.user.id,
    token: installation.bot?.token || '',
    scopes: installation.bot?.scopes || [],
  };
};

export const buildSlackInstallation = (workspace: Workspace): Installation => {
  return {
    team: { id: workspace.teamId, name: workspace.name },
    appId: workspace.appId,
    user: { token: undefined, scopes: undefined, id: workspace.installUserId },
    bot: {
      scopes: workspace.scopes,
      token: workspace.token,
      userId: workspace.botUserId,
      id: workspace.botId,
    },
    tokenType: 'bot',
  };
};

interface BuildIdParams {
  tenantId: string;
  teamId: string;
}

export const buildId = ({ tenantId, teamId }: BuildIdParams): string => {
  return `slack::${tenantId}::${teamId}`;
};
