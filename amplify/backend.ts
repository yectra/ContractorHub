import { defineBackend } from '@aws-amplify/backend';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { sendNotification } from './functions/send-notification/resource';

export const backend = defineBackend({
  auth,
  data,
  sendNotification,
});

// Explicit IAM permissions policy allowing ses:SendEmail and ses:SendRawEmail
backend.sendNotification.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      'ses:SendEmail',
      'ses:SendRawEmail',
      'ses:SendTemplatedEmail',
      'ses:SendBulkTemplatedEmail',
    ],
    resources: ['*'],
  })
);
