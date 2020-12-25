/* eslint-disable no-console */
import { APIGatewayEvent, Context as LambdaContext } from 'aws-lambda';
import * as awsServerlessExpress from 'aws-serverless-express';
import {
  App,
  ExpressReceiver,
  ViewSubmitAction,
  Context,
  LogLevel,
  CodedError,
  BlockAction,
  Button,
  ButtonAction,
  GlobalShortcut,
  SlashCommand,
  Installation,
  SlackShortcutMiddlewareArgs,
  SlackActionMiddlewareArgs,
} from '@slack/bolt';
import { payloads } from './payloads';
import * as helpers from './helpers';
import {
  scopes,
  buildPutWorkspaceParams,
  buildSlackInstallation,
} from './shared/Workspace';
import {
  scopes as userScopes,
  buildPutUserParams,
  buildUserInstallation,
} from './shared/User';
import { putWorkspace, getWorkspaceByKey } from './shared/dao/workspace';
import { putUser, getUserByKey } from './shared/dao/user';
import findUser from './shared/middleware/findUser';
import connectAccount from './shared/middleware/connectAccount';

interface ViewSubmitActionWithResponseUrls extends ViewSubmitAction {
  response_urls: ResponseUrlInfo[];
}

interface ResponseUrlInfo {
  block_id: string;
  action_id: string;
  channel_id: string;
  response_url: string;
}

interface CustomStatus {
  status_text: string;
  status_emoji: string;
  status_expiration: number;
}

const processBeforeResponse = true;

// ------------------------
// Bolt App Initialization
// ------------------------
const receiver = new ExpressReceiver({
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  stateSecret: 'my-state-secret',
  scopes,
  installerOptions: {
    authVersion: 'v2', // default value
    metadata: 'some session data', // sample data
    userScopes: [],
    installPath: '/slack/install', // default value
    redirectUriPath: '/slack/oauth_redirect', // default value
    callbackOptions: {
      success: async (instalation, _installOptions, _req, res) => {
        if (instalation.team) {
          await app.client.chat.postMessage({
            token: instalation.bot?.token,
            channel: instalation.user.id,
            text: payloads.connectDone.blocks[0].text.text,
          });
          res.send(
            helpers.buildRedirectButton(
              instalation.team?.id,
              instalation.appId || '',
            ),
          );
        } else {
          res.send('Success organization install!');
        }
      },
      failure: (_error, _installOptions, _req, res) => {
        res.send('Failure');
      },
    },
  },
  installationStore: {
    storeInstallation: async installation => {
      console.log('storeInstallation', installation);
      // TODO Get tenantId and sub from DB by teamId and userId
      const tenantId = installation.team.id; // Temporary
      const sub = installation.user.id; // Temporary
      const workspace = buildPutWorkspaceParams({ tenantId, installation });
      const user = buildPutUserParams({ tenantId, sub, installation });
      await Promise.all([putWorkspace(workspace), putUser(user)]);
      return Promise.resolve();
    },
    fetchInstallation: async installQuery => {
      console.log('fetchInstallation', installQuery);
      const workspace = await getWorkspaceByKey(installQuery.teamId);
      const user = await getUserByKey(
        installQuery.teamId,
        installQuery.userId || '',
      );
      console.log('workspace', workspace);
      console.log('user', user);
      if (!workspace) {
        throw new Error('Failed to get workspace!');
      }
      const workspaceInstallation = buildSlackInstallation(workspace);
      const userInstallation = user
        ? buildUserInstallation(user)
        : { id: '', token: '', scopes: [] };
      const installation: Installation<'v2', false> = {
        ...workspaceInstallation,
        user: userInstallation,
      };

      console.log('installation', installation);
      return installation;
    },
  },
  processBeforeResponse,
});
const app = new App({
  receiver,
  processBeforeResponse,
  logLevel: LogLevel.DEBUG,
});

// ------------------------
// Custom Route
// ------------------------
receiver.router.get('/slack/user_install', async (_req, res, _next) => {
  if (!receiver.installer) {
    throw new Error('Failed to get installer!');
  }
  try {
    // feel free to modify the scopes
    const url = await helpers.generateSlackInstallUrl(
      receiver.installer,
      scopes,
      userScopes,
      'tenant-id',
      'sessionState',
    );

    res.send(helpers.buildSlackUrl(url || ''));
  } catch (error) {
    console.log(error);
  }
});

// ------------------------
// Middleware
// ------------------------
const findServiceUser = async (
  args: (
    | SlackShortcutMiddlewareArgs<GlobalShortcut>
    | SlackActionMiddlewareArgs<BlockAction<ButtonAction>>
  ) &
    Context, // Workaround
  // args: Middleware<SlackShortcutMiddlewareArgs<SlackShortcut>>
  // args: any,
): Promise<void> => {
  const teamId = args.body.team?.id;
  const userId = args.body.user.id;
  if (!teamId) {
    throw new Error('Not support Org installation!');
  }
  if (!receiver.installer) {
    throw new Error('Failed to get installer!');
  }
  await findUser({
    context: args.context,
    client: app.client,
    teamId,
    userId,
    triggerId: args.body.trigger_id,
    next: args.next,
  });
};

const connectUserAccount = async (
  args: (
    | SlackShortcutMiddlewareArgs<GlobalShortcut>
    | SlackActionMiddlewareArgs<BlockAction<ButtonAction>>
  ) &
    Context, // Workaround
  // args: Middleware<SlackShortcutMiddlewareArgs<SlackShortcut>>
  // args: any,
): Promise<void> => {
  if (!receiver.installer) {
    throw new Error('Failed to get installer!');
  }
  await connectAccount({
    context: args.context,
    client: app.client,
    triggerId: args.body.trigger_id,
    installer: receiver.installer,
    next: args.next,
    ack: args.ack,
  });
};
// ------------------------
// Application Logic
// ------------------------
app.shortcut<GlobalShortcut>(
  'clock',
  findServiceUser,
  connectUserAccount,
  async ({ ack, context, body, logger }) => {
    logger.info("app.shortcut('clock')");
    logger.info('context: ', context);

    try {
      await openTimeRecordTypesModal(body, context);
      await ack();
    } catch (e) {
      logger.error(e);
      await ack();
    }
  },
);

// action_id: clock-in 等のボタンを押すイベントをリッスン
// （そのボタンはモーダルビューの中にあるという想定）
app.action<BlockAction<ButtonAction>>(
  /^(clock-in|clock-out|break-start|break-end)/,
  findServiceUser,
  connectUserAccount,
  async ({ ack, body, context, logger, action }) => {
    logger.info("app.action('clock-in|clock-out|break-start|break-end)");
    logger.info('body', body);
    logger.info('context', context);
    logger.info('action', action);
    // 打刻APIの呼び出し（モック）
    const clockRecordType = action.text.text;
    const clockResult = payloads.resultTimeRecord(clockRecordType);
    logger.info('clockResult', clockResult);

    // parse clock result information from API response
    const recordedType = clockResult.data.timeRecordType;
    const clientTime = clockResult.data.clientTime;

    // get user info of user who reacted to this message
    const user = body.user;

    logger.info('user', user);

    // formatting the user's name to mention that user in the message (see: https://api.slack.com/messaging/composing/formatting)
    let name = '';
    if (helpers.hasProperty(user, 'id')) {
      name = `<@${user.id}>`;
    }

    const timeRecord = {
      timeRecordType: recordedType,
      clientTime: clientTime,
      user: name,
    };
    logger.info('timeRecord', timeRecord);

    const messagePayload = payloads.message(timeRecord);

    // post time record message to the user clocked
    try {
      await app.client.chat.postMessage({
        token: context.botToken,
        channel: user.id,
        text: messagePayload.blocks[0].text.text,
      });
      // await ack();
    } catch (e) {
      logger.error(`:x: Failed to post a message (error: ${e})`);
      await ack();
    }

    try {
      // 打刻種別によってカスタムステータスを決定
      // await changeCustomStatusByTimeRecordType(body, context);

      // モーダルビューを更新
      if (body.view) {
        const modalUpdateResult = await app.client.views.update({
          token: context.botToken,
          // リクエストに含まれる view_id を渡す
          view_id: body.view.id,
          // 更新された view の値をペイロードに含む
          view: payloads.timeRecord(timeRecord),
        });
        logger.info('modalUpdateResult', modalUpdateResult);
        await ack();
      } else {
        throw new Error('Missing body.view!');
      }
    } catch (e) {
      logger.error(`:x: Failed to post a message (error: ${e})`);
      await ack();
    }
  },
);

app.view<ViewSubmitActionWithResponseUrls>(
  'time_record_result',
  async ({ body, context, ack, logger }) => {
    logger.info("app.view('time_record_result')");
    logger.info('body: ', body);
    logger.info('context: ', context);

    await ack({
      response_action: 'clear',
    });
  },
);

app.action<BlockAction<ButtonAction>>(
  'connect_account',
  async ({ ack, body, context, logger }) => {
    logger.info("app.action('connect_account')");
    await ack();

    await app.client.views.update({
      token: context.botToken,
      view_id: body.view?.id,
      view: payloads.connectLoading,
    });
  },
);

app.command('/clock', async ({ context, body, logger, ack }) => {
  try {
    await openTimeRecordTypesModal(body, context);
    await ack();
  } catch (e) {
    logger.error(`:x: Failed to post a message (error: ${e})`);
    await ack();
  }
});

const openTimeRecordTypesModal = async (
  body: SlashCommand | GlobalShortcut,
  context: Context,
): Promise<void> => {
  // 打刻種別APIを呼び出し結果のモック
  const result = payloads.resultTimeRecordTypes;

  // APIの結果をモーダルのボタンに反映
  const items: Button[] = result.data.map((item: any) => {
    const parsedItem: Button = {
      type: 'button',
      action_id: item.timeRecordType,
      text: {
        type: 'plain_text',
        text: item.displayNameJa,
      },
      value: item.timeRecordType,
    };
    if (item.color === 'primary' || item.color === 'danger') {
      parsedItem.style = item.color;
    }
    return parsedItem;
  });
  console.log(
    'payloads.timeRecordTypeSelect(items)',
    payloads.timeRecordTypeSelect(items),
  );

  // モーダルを開く
  const modalViewResult = await app.client.views.open({
    token: context.botToken,
    trigger_id: body.trigger_id,
    view: payloads.timeRecordTypeSelect(items),
  });
  console.log('modalViewResult', modalViewResult);
};

const printCompleteJSON = async (error: CodedError): Promise<void> => {
  console.error(JSON.stringify(error));
};

const changeCustomStatusByTimeRecordType = async (
  body: BlockAction<ButtonAction>,
  context: Context,
): Promise<void> => {
  const actionId = body.actions[0].action_id;
  const customStatus = {} as CustomStatus;
  if (actionId === 'clock-in' || actionId === 'break-end') {
    customStatus.status_text = 'on duty';
    customStatus.status_emoji = ':desktop_computer:';
    customStatus.status_expiration = 0;
  } else if (actionId === 'break-start') {
    customStatus.status_text = 'on break';
    customStatus.status_emoji = ':coffee:';
    customStatus.status_expiration = 0;
  } else {
    customStatus.status_text = '';
    customStatus.status_emoji = '';
    customStatus.status_expiration = 0;
  }
  // status を変更
  const statusChangeResult = await app.client.users.profile.set({
    token: context.userToken,
    profile: JSON.stringify(customStatus),
  });
  console.log('statusChangeResult', statusChangeResult);
};

// Check the details of the error to handle cases where you should retry sending a message or stop the app
app.error(printCompleteJSON);

// ------------------------
// AWS Lambda Handler
// ------------------------
const server = awsServerlessExpress.createServer(receiver.app);
module.exports.app = (event: APIGatewayEvent, context: LambdaContext) => {
  console.log('⚡️ Bolt app is running!');

  awsServerlessExpress.proxy(server, event, context);
  console.log('awsServerlessExpress.proxy: server', server);
  console.log('awsServerlessExpress.proxy: event', event);
  console.log('awsServerlessExpress.proxy: context', context);
};
