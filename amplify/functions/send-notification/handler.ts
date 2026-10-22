import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

export const VERIFIED_SYSTEM_FROM_EMAIL = 'kumar@yectra.com';

const ses = new SESClient({
  region: process.env.SES_REGION || process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  } : undefined,
});

interface EmailRequest {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  body?: string;
  from?: string;
}

interface JobNotificationRequest {
  clientName: string;
  clientEmail: string;
  job: {
    id?: string | null;
    service?: string | null;
    client?: string | null;
    location?: string | null;
    type?: string | null;
    priority?: string | null;
    status?: string | null;
    scheduledDate?: string | null;
    requestTime?: string | null;
    estimatedDuration?: string | null;
    assignedTechnicianName?: string | null;
    notes?: string | null;
  };
  changesSummary?: string;
  reason?: string;
}

async function sendEmail(request: EmailRequest) {
  const rawAddresses = Array.isArray(request.to) ? request.to : [request.to];
  const toAddresses = rawAddresses
    .map((addr) => (typeof addr === 'string' ? addr.trim() : ''))
    .filter((addr) => addr && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr));

  if (toAddresses.length === 0) {
    throw new Error('No valid dynamic recipient email address provided.');
  }

  // Ensure the sender complies with AWS SES verification rules by using the verified system email
  const fromAddress = request.from?.trim() || process.env.FROM_EMAIL?.trim() || VERIFIED_SYSTEM_FROM_EMAIL;

  const htmlContent = request.html || request.body || `<p>${request.text || ''}</p>`;

  const plainText =
    request.text ||
    request.body ||
    htmlContent
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
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

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'OPTIONS,POST',
};

export const handler = async (event: any): Promise<any> => {
  // 1. AppSync GraphQL Mutation Handler (via client.mutations.sendNotification / sendEmailNotification)
  if (event && event.arguments) {
    const { to, subject, html, text, body, from } = event.arguments;
    console.log(`[send-notification] AppSync mutation received for recipient(s): ${to}`);
    try {
      const result = await sendEmail({ to, subject, html, text, body, from });
      console.log(`[send-notification] AppSync email sent successfully. MessageId: ${result.MessageId}`);
      return {
        success: true,
        messageId: result.MessageId || null,
        error: null,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[send-notification] AppSync email send failed:', err);
      return {
        success: false,
        messageId: null,
        error: errorMsg,
      };
    }
  }

  // 2. Direct Invocation Handler (e.g. AWS Lambda invoke with direct JSON payload)
  if (event && event.to && event.subject && event.html) {
    try {
      const result = await sendEmail(event);
      return {
        success: true,
        messageId: result.MessageId || null,
        error: null,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        messageId: null,
        error: errorMsg,
      };
    }
  }

  // 3. API Gateway / HTTP Proxy Handler
  const path = event?.rawPath || event?.path;
  const method = event?.requestContext?.http?.method || event?.httpMethod;

  if (method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  try {
    let body = JSON.parse(event.body || '{}');
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }

    // Generic /email route controller
    if (path === '/email' && method === 'POST') {
      const emailRequest = body as EmailRequest;

      if (!emailRequest.to || !emailRequest.subject || !emailRequest.html) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            error: 'Missing required fields: to, subject, html',
            received: emailRequest,
          }),
        };
      }

      const result = await sendEmail(emailRequest);
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          message: 'Email sent successfully',
          messageId: result.MessageId,
        }),
      };
    }

    // Job Creation notification route controller
    if ((path === '/jobs/create' || path === '/jobs/created') && method === 'POST') {
      const req = body as JobNotificationRequest;
      const dynamicRecipient = req.clientEmail?.trim();

      if (!dynamicRecipient) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Missing dynamic client recipient email (clientEmail)' }),
        };
      }

      const jobIdStr = req.job?.id ? `#${req.job.id}` : 'New Job';
      const subject = `Job Scheduled: ${req.job?.service || 'Service Appointment'} (${jobIdStr})`;
      const html = `<h2>Service Appointment Confirmed</h2>
<p>Hello <strong>${req.clientName || 'Valued Client'}</strong>,</p>
<p>Your service job (${jobIdStr}) has been successfully scheduled for ${req.job?.scheduledDate || 'Standard Window'}.</p>
<p>Service: ${req.job?.service || 'Contractor Service'}<br>Location: ${req.job?.location || 'Client Location'}</p>`;

      const result = await sendEmail({
        to: dynamicRecipient,
        subject,
        html,
      });

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          message: 'Job creation notification sent successfully',
          recipient: dynamicRecipient,
          messageId: result.MessageId,
        }),
      };
    }

    // Job Update notification route controller
    if ((path === '/jobs/update' || path === '/jobs/updated') && method === 'POST') {
      const req = body as JobNotificationRequest;
      const dynamicRecipient = req.clientEmail?.trim();

      if (!dynamicRecipient) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Missing dynamic client recipient email (clientEmail)' }),
        };
      }

      const jobIdStr = req.job?.id ? `#${req.job.id}` : 'Job Details';
      const subject = `Job Updated: ${req.job?.service || 'Service Appointment'} (${jobIdStr})`;
      const html = `<h2>Service Details Updated</h2>
<p>Hello <strong>${req.clientName || 'Valued Client'}</strong>,</p>
<p>Your service job (${jobIdStr}) was recently updated.</p>
${req.changesSummary ? `<p><strong>Changes:</strong> ${req.changesSummary}</p>` : ''}
<p>Status: ${req.job?.status || 'Updated'}<br>Scheduled Date: ${req.job?.scheduledDate || 'Pending'}</p>`;

      const result = await sendEmail({
        to: dynamicRecipient,
        subject,
        html,
      });

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          message: 'Job update notification sent successfully',
          recipient: dynamicRecipient,
          messageId: result.MessageId,
        }),
      };
    }

    // Job Delete notification route controller
    if ((path === '/jobs/delete' || path === '/jobs/deleted') && method === 'POST') {
      const req = body as JobNotificationRequest;
      const dynamicRecipient = req.clientEmail?.trim();

      if (!dynamicRecipient) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Missing dynamic client recipient email (clientEmail)' }),
        };
      }

      const jobIdStr = req.job?.id ? `#${req.job.id}` : 'Service Request';
      const subject = `Job Cancelled: ${req.job?.service || 'Service Appointment'} (${jobIdStr})`;
      const html = `<h2>Service Appointment Cancellation Notice</h2>
<p>Hello <strong>${req.clientName || 'Valued Client'}</strong>,</p>
<p>Service job (${jobIdStr}) has been cancelled and removed from our active schedule.</p>
${req.reason ? `<p><strong>Reason:</strong> ${req.reason}</p>` : ''}`;

      const result = await sendEmail({
        to: dynamicRecipient,
        subject,
        html,
      });

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          message: 'Job deletion notification sent successfully',
          recipient: dynamicRecipient,
          messageId: result.MessageId,
        }),
      };
    }

    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Route not found' }),
    };
  } catch (error) {
    console.error('[send-notification handler] Error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
