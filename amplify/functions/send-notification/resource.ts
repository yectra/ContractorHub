import { defineFunction } from '@aws-amplify/backend';
import { Function as LambdaFunction, Runtime, Code } from 'aws-cdk-lib/aws-lambda';

/**
 * Send-notification Lambda function resource.
 *
 * Configured using CDK's inline code provider to avoid Windows file-lock (EPERM)
 * issues during CDK bundling in .amplify/artifacts/cdk.out.
 *
 * AWS Lambda's Node.js 20.x runtime includes @aws-sdk/client-ses natively.
 */
export const sendNotification = defineFunction(
  (scope) =>
    new LambdaFunction(scope, 'send-notification-lambda', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      environment: {
        FROM_EMAIL: process.env.FROM_EMAIL || 'kumar@yectra.com',
        SES_REGION: process.env.AWS_REGION || 'us-east-1',
      },
      code: Code.fromInline(`
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const VERIFIED_SYSTEM_FROM_EMAIL = 'kumar@yectra.com';

const ses = new SESClient({
  region: process.env.SES_REGION || process.env.AWS_REGION || 'us-east-1',
});

async function sendEmail(request) {
  const rawAddresses = Array.isArray(request.to) ? request.to : [request.to];
  const toAddresses = rawAddresses
    .map((addr) => (typeof addr === 'string' ? addr.trim() : ''))
    .filter((addr) => addr && /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(addr));

  if (toAddresses.length === 0) {
    throw new Error('No valid dynamic recipient email address provided.');
  }

  const fromAddress = request.from?.trim() || process.env.FROM_EMAIL?.trim() || VERIFIED_SYSTEM_FROM_EMAIL;
  const htmlContent = request.html || request.body || \`<p>\${request.text || ''}</p>\`;
  const plainText =
    request.text ||
    request.body ||
    htmlContent
      .replace(/<style[^>]*>[\\s\\S]*?<\\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\\s{2,}/g, ' ')
      .trim();

  const command = new SendEmailCommand({
    Source: fromAddress,
    Destination: {
      ToAddresses: toAddresses,
    },
    Message: {
      Subject: {
        Data: request.subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: htmlContent,
          Charset: 'UTF-8',
        },
        Text: {
          Data: plainText,
          Charset: 'UTF-8',
        },
      },
    },
  });

  return await ses.send(command);
}

exports.handler = async (event) => {
  console.log('[send-notification] Event received:', JSON.stringify(event));

  // 1. AppSync GraphQL Mutation (via sendNotification / sendEmailNotification)
  if (event && event.arguments) {
    const { to, subject, html, text, body, from } = event.arguments;
    try {
      const result = await sendEmail({ to, subject, html, text, body, from });
      console.log('[send-notification] Email sent successfully via AppSync. MessageId:', result.MessageId);
      return {
        success: true,
        messageId: result.MessageId || null,
        error: null,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[send-notification] AppSync email send failed:', err);
      return {
        success: false,
        messageId: null,
        error: errorMsg,
      };
    }
  }

  // 2. Direct Invocation
  if (event && event.to && event.subject) {
    try {
      const result = await sendEmail(event);
      return {
        success: true,
        messageId: result.MessageId || null,
        error: null,
      };
    } catch (err) {
      return {
        success: false,
        messageId: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // 3. API Gateway HTTP
  try {
    let body = JSON.parse(event.body || '{}');
    if (typeof body === 'string') body = JSON.parse(body);

    const emailReq = body.job && body.clientEmail ? {
      to: body.clientEmail,
      subject: \`Job Notification: \${body.job.service || 'Service Appointment'}\`,
      html: \`<h2>\${body.clientName}</h2><p>Job Details: \${JSON.stringify(body.job)}</p>\`,
    } : body;

    const result = await sendEmail(emailReq);
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' },
      body: JSON.stringify({ message: 'Email sent successfully', messageId: result.MessageId }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' },
      body: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
    };
  }
};
`),
    }),
  {
    resourceGroupName: 'data',
  }
);
