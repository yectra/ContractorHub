import { defineFunction } from '@aws-amplify/backend';
import { Function as LambdaFunction, Runtime, Code } from 'aws-cdk-lib/aws-lambda';

/**
 * Post-confirmation Lambda function resource.
 *
 * Configured using CDK's inline code provider to avoid Windows file-lock (EPERM)
 * issues during CDK bundling in .amplify/artifacts/cdk.out.
 *
 * AWS Lambda's Node.js runtime includes the AWS SDK v3 (@aws-sdk/client-cognito-identity-provider)
 * natively, so external bundling and node_modules staging in temporary directories
 * are completely bypassed.
 */
export const postConfirmation = defineFunction(
  (scope) =>
    new LambdaFunction(scope, 'post-confirmation-lambda', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromInline(`
const {
  AdminAddUserToGroupCommand,
  CognitoIdentityProviderClient,
} = require('@aws-sdk/client-cognito-identity-provider');

const cognitoClient = new CognitoIdentityProviderClient({});
const validRoles = ['Admin', 'Technician'];

exports.handler = async (event) => {
  const customRole = event.request?.userAttributes?.['custom:role'];

  if (!validRoles.includes(customRole)) {
    console.warn(
      \`User \${event.userName} does not have a valid custom:role. \` +
        \`Received: \${customRole ?? 'undefined'}\`
    );
    return event;
  }

  await cognitoClient.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: event.userPoolId,
      Username: event.userName,
      GroupName: customRole,
    })
  );

  console.log(
    \`Successfully added user \${event.userName} to group \${customRole}\`
  );

  return event;
};
`),
    }),
  {
    resourceGroupName: 'auth',
  }
);
