import { Context, NextFn, AckFn } from '@slack/bolt';
import { WebClient } from '@slack/web-api';
import { generateSlackInstallUrl } from '../../../src/helpers';
import { payloads } from '../../../src/payloads';
import { scopes } from '../Workspace';
import { scopes as userScopes } from '../User';
import { InstallProvider } from '@slack/oauth';

interface connectAccountParams {
  client: WebClient;
  context: Context;
  triggerId: string;
  installer: InstallProvider;
  next: NextFn;
  ack: AckFn<void>;
}

// ユーザー連携が未実施の場合にSlackアプリインストールを要求するミドルウェア
const connectAccount = async ({
  client,
  context,
  triggerId,
  installer,
  next,
  ack,
}: connectAccountParams): Promise<void> => {
  const user = context.user;
  if (user) {
    await next();
  }

  try {
    const url = await generateSlackInstallUrl(
      installer,
      scopes,
      userScopes,
      'tenant-id',
      'sessionState',
    );

    await client.views.open({
      token: context.botToken,
      trigger_id: triggerId,
      view: payloads.connectStart(url), // カスタムインストール URL に飛ばす
    });
    await ack();
    return;
  } catch (error) {
    // 何らかの理由でアカウント連携できなかったためエラーをわたし、イベントプロセスを終了
    console.error(`Failed to connect account`);
    console.error(error);
    await client.views.open({
      token: context.botToken,
      trigger_id: triggerId,
      view: payloads.connectFailed,
    });

    // 制御とリスナー関数を（もしあれば）前のミドルウェア渡す、もしくはグローバルエラーハンドラに引き渡し
    throw error;
  }
};

export default connectAccount;
