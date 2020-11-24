import User, { buildId } from '../User';
import dynamodb from '../../dynamodb';

const userTable = 'User';

export const putUser = async (user: User): Promise<void> => {
  try {
    await dynamodb.doc
      .put({
        TableName: userTable,
        Item: user,
      })
      .promise();
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const getUserByKey = async (
  tenantId: string,
  teamId: string,
  userId: string,
): Promise<User | undefined> => {
  const id = buildId({ tenantId, teamId, userId });
  const ret = await dynamodb.doc
    .get({
      TableName: userTable,
      Key: { tenantId, id },
      ConsistentRead: true,
    })
    .promise();
  return ret.Item as User | undefined;
};
