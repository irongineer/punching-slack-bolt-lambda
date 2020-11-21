import { getJstTime } from './helpers';

const payloads: {
  [key: string]: any;
} = {
  resultTimeRecordTypes: {
    data: [
      {
        tenantId: 'time-clock',
        id: '0001',
        timeRecordType: 'clock-in',
        displayNameJa: '出社',
        displayNameEn: 'Clock in',
        color: 'primary',
      },
      {
        tenantId: 'time-clock',
        id: '0002',
        timeRecordType: 'clock-out',
        displayNameJa: '退社',
        displayNameEn: 'Clock out',
        color: 'danger',
      },
      {
        tenantId: 'time-clock',
        id: '0003',
        timeRecordType: 'break-start',
        displayNameJa: '休憩開始',
        displayNameEn: 'Break start',
        color: 'default',
      },
      {
        tenantId: 'time-clock',
        id: '0004',
        timeRecordType: 'break-end',
        displayNameJa: '休憩終了',
        displayNameEn: 'Break end',
        color: 'default',
      },
    ],
  },
  timeRecordTypeSelect: (context: any) => {
    return {
      callback_id: 'time_record_type_select',
      type: 'modal',
      title: {
        type: 'plain_text',
        text: '打刻種別を選択',
        emoji: true,
      },
      close: {
        type: 'plain_text',
        text: 'キャンセル',
        emoji: true,
      },
      blocks: [
        {
          block_id: 'timeRecordType',
          type: 'actions',
          elements: context,
        },
      ],
    };
  },
  resultTimeRecord: (context: any) => {
    return {
      data: {
        timeRecordType: context,
        clientTime: getJstTime(),
      },
    };
  },
  timeRecord: (context: any) => {
    console.log('context', context);
    return {
      callback_id: 'time_record_result',
      type: 'modal',
      title: {
        type: 'plain_text',
        text: '打刻結果',
        emoji: true,
      },
      close: {
        type: 'plain_text',
        text: '終了',
        emoji: true,
      },
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `:clock1: *${context.clientTime}*`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${context.timeRecordType}時刻を記録しました。`,
          },
        },
      ],
      private_metadata: JSON.stringify(context),
    };
  },
  message: (context: any) => {
    return {
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `:clock1: ${context.clientTime} ${context.user} *${context.timeRecordType}*`,
          },
        },
      ],
    };
  },
};

export { payloads };
