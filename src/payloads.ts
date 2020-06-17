const payloads: {
  [key: string]: any;
} = {
  resultTimeRecordTypes: {
    data: [
      {
        tenantId: "time-clock",
        id: "0001",
        timeRecordType: "clock-in",
        displayNameJa: "出社",
        displayNameEn: "Clock in",
        color: "primary",
      },
      {
        tenantId: "time-clock",
        id: "0002",
        timeRecordType: "clock-out",
        displayNameJa: "退社",
        displayNameEn: "Clock out",
        color: "danger",
      },
      {
        tenantId: "time-clock",
        id: "0003",
        timeRecordType: "break-start",
        displayNameJa: "休憩開始",
        displayNameEn: "Break start",
        color: "default",
      },
      {
        tenantId: "time-clock",
        id: "0004",
        timeRecordType: "break-end",
        displayNameJa: "休憩終了",
        displayNameEn: "Break end",
        color: "default",
      },
    ],
  },
  timeRecordTypeSelect: (context: any) => {
    return {
      callback_id: "time_record_type_select",
      type: "modal",
      title: {
        type: "plain_text",
        text: "Select Time Record Type",
        emoji: true,
      },
      close: {
        type: "plain_text",
        text: "Cancel",
        emoji: true,
      },
      blocks: [
        {
          block_id: "timeRecordType",
          type: "actions",
          elements: context,
        },
      ],
    };
  },
  resultTimeRecord: (context: any) => {
    return {
      data: {
        timeRecordType: context,
        clientTime: new Date().toLocaleString("ja"),
      },
    };
  },
  timeRecord: (context: any) => {
    return {
      callback_id: "time_record_share",
      type: "modal",
      title: {
        type: "plain_text",
        text: "Clock Result",
        emoji: true,
      },
      submit: {
        type: "plain_text",
        text: "Share",
        emoji: true,
      },
      close: {
        type: "plain_text",
        text: "Close",
        emoji: true,
      },
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `:clock1: *${context.clientTime}*`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `${context.timeRecordType} time was recorded.`,
          },
        },
        {
          block_id: "channel",
          type: "input",
          element: {
            action_id: "data",
            type: "conversations_select",
            placeholder: {
              type: "plain_text",
              text: "Select a channel",
              emoji: true,
            },
            response_url_enabled: true,
            default_to_current_conversation: true,
            filter: {
              exclude_bot_users: true,
            },
          },
          label: {
            type: "plain_text",
            text: "Send to channel",
            emoji: true,
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
          type: "section",
          text: {
            type: "mrkdwn",
            text: `:clock1: *${context.user} ${context.timeRecordType}* at ${context.clientTime}`,
          },
        },
      ],
    };
  },
};

export { payloads };
