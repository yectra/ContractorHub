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
  const rawRole = event.request.userAttributes['custom:role'];
  const userEmail = (event.request.userAttributes['email'] || '').toLowerCase();

  let targetRole: UserRole | null = null;

  if (rawRole) {
    const cleaned = rawRole.trim().toLowerCase();
    if (cleaned === 'admin') targetRole = 'Admin';
    else if (cleaned === 'technician') targetRole = 'Technician';
  }

  // Intelligent fallback if custom:role attribute is missing on signup
  if (!targetRole) {
    if (userEmail.includes('admin') || userEmail.endsWith('@yectra.com')) {
      targetRole = 'Admin';
    } else {
      targetRole = 'Technician';
    }
    console.info(
      `[PostConfirmation] User ${event.userName} (${userEmail}) missing custom:role. Assigned fallback role: ${targetRole}`
    );
  }

  try {
    await cognitoClient.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: event.userPoolId,
        Username: event.userName,
        GroupName: targetRole,
      }),
    );

    console.log(
      `Successfully added user ${event.userName} to Cognito group "${targetRole}"`,
    );
  } catch (err) {
    console.error(
      `[PostConfirmation] Failed to add user ${event.userName} to group "${targetRole}":`,
      err,
    );
  }

  return event;
};
