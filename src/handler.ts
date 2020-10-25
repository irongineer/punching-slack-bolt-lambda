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
  ButtonAction,
  GlobalShortcut,
  SlashCommand,
} from '@slack/bolt';
import { Button } from '@slack/types';
import { payloads } from './payloads';
import * as helpers from './helpers';

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
const expressReceiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
  processBeforeResponse,
});
const app = new App({
  // If you don't use userToken, you need only botToken without authorize method
  authorize: () => {
    return Promise.resolve({
      botId: process.env.SLACK_APP_ID,
      botToken: process.env.SLACK_BOT_TOKEN,
      userToken: process.env.SLACK_USER_TOKEN,
    });
  },
  receiver: expressReceiver,
  processBeforeResponse,
  logLevel: LogLevel.DEBUG,
});

// ------------------------
// Application Logic
// ------------------------
app.shortcut<GlobalShortcut>('clock', async ({ ack, context, body, logger }) => {
  console.log("app.shortcut('clock')");

  try {
    await openTimeRecordTypesModal(body, context);
    await ack();
  } catch (e) {
    logger.error(e);
    console.error(`:x: Failed to post a message (error: ${e})`);
    await ack();
  }
});

// action_id: clock-in 等のボタンを押すイベントをリッスン
// （そのボタンはモーダルビューの中にあるという想定）
app.action<BlockAction<ButtonAction>>(
  /^(clock-in|clock-out|break-start|break-end)/,
  async ({ ack, body, context, logger }) => {
    console.log("app.action('clock-in'clock-out|break-start|break-end)");

    // 打刻APIの呼び出し（モック）
    const clockRecordType = body.actions[0].value;
    const clockResult = payloads.resultTimeRecord(clockRecordType);

    // parse clock result information from API response
    const recordedType = clockResult.data.timeRecordType;
    const clientTime = clockResult.data.clientTime;

    // get user info of user who reacted to this message
    const user = body.user;

    console.log('user', user);

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
    console.log('timeRecord', timeRecord);

    try {
      // 打刻種別によってカスタムステータスを決定
      await changeCustomStatusByTimeRecordType(body, context);

      // モーダルビューを更新
      const modalUpdateResult = await app.client.views.update({
        token: context.botToken,
        // リクエストに含まれる view_id を渡す
        view_id: body.view!.id,
        // 更新された view の値をペイロードに含む
        view: payloads.timeRecord(timeRecord),
      });
      console.log('modalUpdateResult', modalUpdateResult);
      await ack();
    } catch (e) {
      logger.error(e);
      console.error(`:x: Failed to post a message (error: ${e})`);
      await ack();
    }
  },
);

app.view<ViewSubmitActionWithResponseUrls>('time_record_share', async ({ view, body, context, ack, logger }) => {
  console.log("app.view('time_record_share')");
  // parse timeRecord data stored in views metadata
  const timeRecord = JSON.parse(view.private_metadata);
  const payload = payloads.message(timeRecord);

  // get the response url for the selected channel and post to it
  try {
    body.response_urls.forEach(async url => {
      await app.client.chat.postMessage({
        token: context.botToken,
        channel: url.channel_id,
        text: payload.blocks[0].text.text,
      });
      // await axios.post(url.response_url, payload);
    });

    // clear all open views after user shares to channel
    await ack({
      response_action: 'clear',
    });
  } catch (e) {
    logger.error(e);
    console.error(`:x: Failed to post a message (error: ${e})`);
    await ack();
  }
});

app.command('/clock', async ({ context, body, logger, ack }) => {
  try {
    await openTimeRecordTypesModal(body, context);
    await ack();
  } catch (e) {
    logger.error(e);
    console.error(`:x: Failed to post a message (error: ${e})`);
    await ack();
  }
});

app.command('/echo_me ', async ({ body, context, logger, ack }) => {
  try {
    await app.client.chat.postMessage({
      token: context.botToken,
      channel: body.channel_id,
      text: 'Hello!!!',
    });
    await ack();
  } catch (e) {
    logger.error(e);
    console.error(`:x: Failed to post a message (error: ${e})`);
    await ack();
  }
});

const openTimeRecordTypesModal = async (body: SlashCommand | GlobalShortcut, context: Context): Promise<void> => {
  // 打刻種別APIを呼び出し結果のモック
  const result = payloads.resultTimeRecordTypes;

  // APIの結果をモーダルのボタンに反映
  const items: Button[] = result.data.map((item: any) => {
    const parsedItem: Button = {
      type: 'button',
      action_id: item.timeRecordType,
      text: {
        type: 'plain_text',
        text: item.displayNameEn,
      },
      value: item.timeRecordType,
    };
    if (item.color === 'primary' || item.color === 'danger') {
      parsedItem.style = item.color;
    }
    return parsedItem;
  });
  console.log('payloads.timeRecordTypeSelect(items)', payloads.timeRecordTypeSelect(items));

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

const changeCustomStatusByTimeRecordType = async (body: BlockAction<ButtonAction>, context: Context): Promise<void> => {
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
  console.log('customStatus', customStatus);
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
const server = awsServerlessExpress.createServer(expressReceiver.app);
module.exports.app = (event: APIGatewayEvent, context: LambdaContext) => {
  console.log('⚡️ Bolt app is running!');

  awsServerlessExpress.proxy(server, event, context);
  console.log('awsServerlessExpress.proxy: server', server);
  console.log('awsServerlessExpress.proxy: event', event);
  console.log('awsServerlessExpress.proxy: context', context);
};
