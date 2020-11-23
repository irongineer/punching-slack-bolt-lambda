import Workspace, { buildId } from '../Workspace';
import dynamodb from '../../dynamodb';

const workspaceTable = 'Workspace';

export const putWorkspace = async (workspace: Workspace): Promise<void> => {
  try {
    await dynamodb.doc
      .put({
        TableName: workspaceTable,
        Item: workspace,
      })
      .promise();
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const getWorkspaceByTenantId = async (
  tenantId: string,
  teamId: string,
): Promise<Workspace | undefined> => {
  const id = buildId({ tenantId, teamId });
  const ret = await dynamodb.doc
    .get({
      TableName: workspaceTable,
      Key: { tenantId, id },
      ConsistentRead: true,
    })
    .promise();
  return ret.Item as Workspace | undefined;
};
