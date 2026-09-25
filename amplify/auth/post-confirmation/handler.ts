import type { PostConfirmationTriggerHandler } from 'aws-lambda';
import {
  AdminAddUserToGroupCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({});

const validRoles = ['Admin', 'Technician'] as const;

type UserRole = (typeof validRoles)[number];

const isUserRole = (value: string | undefined): value is UserRole => {
  return value === 'Admin' || value === 'Technician';
};

export const handler: PostConfirmationTriggerHandler = async (event) => {
  const customRole = event.request.userAttributes['custom:role'];

  if (!isUserRole(customRole)) {
    console.warn(
      `User ${event.userName} does not have a valid custom:role. ` +
        `Received: ${customRole ?? 'undefined'}`,
    );

    return event;
  }

  await cognitoClient.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: event.userPoolId,
      Username: event.userName,
      GroupName: customRole,
    }),
  );

  console.log(
    `Successfully added user ${event.userName} to group ${customRole}`,
  );

  return event;
};