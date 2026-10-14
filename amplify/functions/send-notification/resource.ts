import { defineFunction } from '@aws-amplify/backend';

export const sendNotification = defineFunction({
  name: 'send-notification',
  entry: './handler.ts',
  environment: {
    FROM_EMAIL: process.env.FROM_EMAIL || 'notifications@contractorhub.com',
  },
});
