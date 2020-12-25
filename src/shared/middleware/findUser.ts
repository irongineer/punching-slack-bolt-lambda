import { Context, NextFn } from '@slack/bolt';
import { WebClient } from '@slack/web-api';
import { payloads } from '../../../src/payloads';
import { getUserByKey } from '../dao/user';

interface findUserParams {
  client: WebClient;
  context: Context;
  teamId: string;
  userId: string;
  triggerId: string;
  next: NextFn;
}

//  ID情報管理プロバイダ上のユーザからの着信イベントと紐つけた認証ミドルウェア
const findUser = async ({
  client,
  context,
  teamId,
  userId,
  triggerId,
  next,
}: findUserParams): Promise<void> => {
  // const helpChannelId = 'C12345';

  // Slack ユーザ ID を使ってシステム上にあるユーザ情報を検索できる関数があるとと仮定
  try {
    const user = await getUserByKey(teamId, userId);
    // 検索できたらそのユーザ情報でコンテクストを生成
    context.user = user;
  } catch (error) {
    // システム上にユーザが存在しないのでエラーをわたし、イベントプロセスを終了
    console.error(`Failed to find user by userId: ${userId}`);
    console.error(error);
    await client.views.open({
      token: context.botToken,
      trigger_id: triggerId,
      view: payloads.connectFailed,
    });

    // 制御とリスナー関数を（もしあれば）前のミドルウェア渡す、もしくはグローバルエラーハンドラに引き渡し
    throw error;
  }

  // 制御とリスナー関数を次のミドルウェアに引き渡し
  await next();
};

export default findUser;
