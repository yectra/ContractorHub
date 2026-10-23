import { client, clientAPI } from './api';
import type { Schema } from '../../amplify/data/resource';

declare const process: any;

/**
 * Safely retrieves an environment variable across browser (Vite import.meta.env)
 * and Node / SSR / Bundler environments (process.env).
 */
export const getEnvVar = (key: string): string | undefined => {
  try {
    if (typeof process !== 'undefined' && process?.env && process.env[key]) {
      return process.env[key];
    }
  } catch {
    // Process not defined in pure browser
  }

  if (typeof import.meta !== 'undefined' && (import.meta as any)?.env) {
    const meta = (import.meta as any).env;
    return meta[key] || meta[`VITE_${key}`];
  }
  return undefined;
};

export const VERIFIED_SYSTEM_FROM_EMAIL = 'kumar@yectra.com';

/**
 * Returns the verified system email for AWS SES sender compliance.
 * Reads FROM_EMAIL or VITE_FROM_EMAIL, defaulting to kumar@yectra.com.
 */
export const getVerifiedSenderEmail = (): string => {
  const configured = getEnvVar('FROM_EMAIL') || getEnvVar('VITE_FROM_EMAIL');
  if (configured && configured.trim()) {
    return configured.trim();
  }
  return VERIFIED_SYSTEM_FROM_EMAIL;
};

/**
 * Formats an email sender string according to RFC 5322 / AWS SES standards:
 * e.g., "Admin Name" <karunambigai1990@gmail.com> or "Operations" <kumar@yectra.com>
 *
 * Ensures:
 * 1. The verified AWS SES email is always preserved intact inside angle brackets <...>.
 * 2. Any dynamic display name appears before the email in quotes (e.g., "Admin Name" <email>).
 * 3. Special characters and newlines in the display name are properly sanitized.
 */
export function formatSenderAddress(
  displayName?: string | null,
  verifiedEmailOverride?: string | null
): string {
  const rawEmail = (verifiedEmailOverride || getVerifiedSenderEmail()).trim();
  const emailMatch = rawEmail.match(/<([^>]+)>/);
  const cleanEmail = (emailMatch ? emailMatch[1] : rawEmail).trim();

  let name = displayName?.trim();
  if (!name && emailMatch) {
    const extractedName = rawEmail.substring(0, rawEmail.indexOf('<')).replace(/["']/g, '').trim();
    if (extractedName) {
      name = extractedName;
    }
  }

  if (!name) {
    const envName = getEnvVar('FROM_NAME') || getEnvVar('VITE_FROM_NAME') || getEnvVar('SENDER_NAME');
    if (envName && envName.trim()) {
      name = envName.trim();
    }
  }

  if (!name) {
    name = 'ContractorHub Dispatch';
  }

  const sanitizedName = name.replace(/["\r\n\t]/g, '').trim();
  return sanitizedName ? `"${sanitizedName}" <${cleanEmail}>` : `<${cleanEmail}>`;
}

export interface SendEmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  senderName?: string;
  fromName?: string;
  displayName?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const SEND_NOTIFICATION_MUTATION = /* GraphQL */ `
  mutation SendNotification(
    $to: String!
    $subject: String!
    $html: String
    $body: String
    $text: String
    $from: String
    $senderName: String
    $fromName: String
  ) {
    sendNotification(
      to: $to
      subject: $subject
      html: $html
      body: $body
      text: $text
      from: $from
      senderName: $senderName
      fromName: $fromName
    ) {
      success
      messageId
      error
    }
  }
`;

const SEND_EMAIL_MUTATION = /* GraphQL */ `
  mutation SendEmailNotification(
    $to: String!
    $subject: String!
    $html: String
    $body: String
    $text: String
    $from: String
    $senderName: String
    $fromName: String
  ) {
    sendEmailNotification(
      to: $to
      subject: $subject
      html: $html
      body: $body
      text: $text
      from: $from
      senderName: $senderName
      fromName: $fromName
    ) {
      success
      messageId
      error
    }
  }
`;

/**
 * Core utility to send an email securely via backend Lambda / AppSync mutation.
 * Completely encapsulates AWS SES on the backend so no AWS credentials are required in the browser.
 */
export async function sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
  const rawAddresses = Array.isArray(payload.to) ? payload.to : [payload.to];
  const toAddresses = rawAddresses
    .map((addr) => (typeof addr === 'string' ? addr.trim() : ''))
    .filter((addr) => addr && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr));

  if (toAddresses.length === 0) {
    console.warn('[MailService] sendEmail aborted: No valid dynamic recipient email address provided.', { received: payload.to });
    return { success: false, error: 'Recipient email is missing or invalid' };
  }

  // Format sender to ensure the verified email is strictly maintained inside <...>,
  // while applying any dynamic sender display name provided.
  const dynamicSenderName = payload.senderName || payload.fromName || payload.displayName;
  const fromAddress = formatSenderAddress(dynamicSenderName, payload.from);

  const plainText =
    payload.text ||
    payload.html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

  const variables: Record<string, any> = {
    to: toAddresses.join(', '),
    subject: payload.subject,
    html: payload.html,
    body: payload.html,
    text: plainText,
    from: fromAddress,
  };

  if (dynamicSenderName) {
    variables.senderName = dynamicSenderName;
    variables.fromName = dynamicSenderName;
  }

  try {
    let resultData: { success: boolean; messageId?: string | null; error?: string | null } | undefined;

    // 1. Try typed model mutations if available in client
    if (typeof (client as any)?.mutations?.sendNotification === 'function') {
      let response: any;
      try {
        response = await (client as any).mutations.sendNotification(variables);
      } catch (mutateErr: any) {
        if (
          mutateErr?.message?.includes('jwt') ||
          mutateErr?.message?.includes('token') ||
          mutateErr?.message?.includes('Auth') ||
          mutateErr?.name === 'NoValidAuthTokens' ||
          mutateErr?.recoverySuggestion
        ) {
          response = await (client as any).mutations.sendNotification(variables, { authMode: 'iam' });
        } else {
          throw mutateErr;
        }
      }

      if (response?.errors && response.errors.length > 0) {
        const firstErrMsg = response.errors[0]?.message || 'GraphQL mutation error';
        console.error(`[MailService] Backend notification mutation error: ${firstErrMsg}`, response.errors[0]);
        return { success: false, error: firstErrMsg };
      }
      resultData = response?.data;
    } else if (typeof (client as any)?.mutations?.sendEmailNotification === 'function') {
      let response: any;
      try {
        response = await (client as any).mutations.sendEmailNotification(variables);
      } catch (mutateErr: any) {
        if (
          mutateErr?.message?.includes('jwt') ||
          mutateErr?.message?.includes('token') ||
          mutateErr?.message?.includes('Auth') ||
          mutateErr?.name === 'NoValidAuthTokens' ||
          mutateErr?.recoverySuggestion
        ) {
          response = await (client as any).mutations.sendEmailNotification(variables, { authMode: 'iam' });
        } else {
          throw mutateErr;
        }
      }

      if (response?.errors && response.errors.length > 0) {
        const firstErrMsg = response.errors[0]?.message || 'GraphQL mutation error';
        console.error(`[MailService] Backend notification mutation error: ${firstErrMsg}`, response.errors[0]);
        return { success: false, error: firstErrMsg };
      }
      resultData = response?.data;
    } else if (typeof (client as any)?.graphql === 'function') {
      // 2. Direct AppSync GraphQL invocation: try sendNotification first, fallback to sendEmailNotification
      let response: any;
      try {
        response = await (client as any).graphql({
          query: SEND_NOTIFICATION_MUTATION,
          variables,
        });
      } catch (primaryGqlErr: any) {
        const primaryMsg = primaryGqlErr?.errors?.[0]?.message || primaryGqlErr?.message || '';
        if (
          primaryMsg.includes('jwt') ||
          primaryMsg.includes('token') ||
          primaryMsg.includes('Auth') ||
          primaryGqlErr?.name === 'NoValidAuthTokens' ||
          primaryGqlErr?.recoverySuggestion
        ) {
          response = await (client as any).graphql({
            query: SEND_NOTIFICATION_MUTATION,
            variables,
            authMode: 'iam',
          });
        } else if (primaryMsg.includes('FieldUndefined') || primaryMsg.includes('sendNotification')) {
          response = await (client as any).graphql({
            query: SEND_EMAIL_MUTATION,
            variables,
          });
        } else {
          throw primaryGqlErr;
        }
      }

      if (response?.errors && response.errors.length > 0) {
        const firstErrMsg = response.errors[0]?.message || 'GraphQL error';
        console.error(`[MailService] Backend notification GraphQL error: ${firstErrMsg}`, response.errors[0]);
        return { success: false, error: firstErrMsg };
      }
      resultData = response?.data?.sendNotification || response?.data?.sendEmailNotification;
    } else {
      console.warn('[MailService] Backend Amplify client unavailable. Skipping notification.');
      return { success: false, error: 'Backend Amplify client unavailable' };
    }

    if (resultData && resultData.success) {
      console.log(`[MailService] Email successfully sent via backend Lambda to ${toAddresses.join(', ')} (MessageId: ${resultData.messageId})`);
      return {
        success: true,
        messageId: resultData.messageId || undefined,
      };
    }

    const failureReason = resultData?.error || 'Failed to dispatch email via backend Lambda';
    console.warn(`[MailService] Backend mailer reported non-success: ${failureReason}`);
    return {
      success: false,
      error: failureReason,
    };
  } catch (error: any) {
    const graphQLErrors = error?.errors || error?.response?.errors;
    const firstErrorMessage =
      graphQLErrors && graphQLErrors.length > 0 && graphQLErrors[0]?.message
        ? graphQLErrors[0].message
        : error instanceof Error
        ? error.message
        : String(error);

    console.error(`[MailService] Failed to send email via backend Lambda: ${firstErrorMessage}`, {
      errorMessage: firstErrorMessage,
      error: graphQLErrors ? graphQLErrors[0] : error,
    });

    return {
      success: false,
      error: firstErrorMessage,
    };
  }
}

/**
 * Common job details passed into notification builders
 */
export interface JobEmailDetails {
  id?: string | null;
  service?: string | null;
  client?: string | null;
  clientId?: string | null;
  clientEmail?: string | null;
  location?: string | null;
  type?: string | null;
  priority?: string | null;
  status?: string | null;
  scheduledDate?: string | null;
  requestTime?: string | null;
  estimatedDuration?: string | null;
  assignedTechnicianName?: string | null;
  notes?: string | null;
}

/**
 * Master responsive HTML email layout wrapper with ContractorHub branding
 */
function renderEmailShell(content: string, preheader: string = ''): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ContractorHub Notification</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      color: #1e293b;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f1f5f9;
      padding: 30px 10px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #2563eb 100%);
      padding: 32px 28px;
      text-align: left;
    }
    .brand-title {
      color: #ffffff;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .brand-subtitle {
      color: #93c5fd;
      font-size: 13px;
      font-weight: 500;
      margin-top: 4px;
      margin-bottom: 0;
    }
    .content-body {
      padding: 32px 28px;
    }
    .h1-title {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 16px 0;
    }
    .card-box {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .detail-row {
      margin-bottom: 10px;
      font-size: 14px;
      line-height: 1.5;
    }
    .detail-row:last-child {
      margin-bottom: 0;
    }
    .detail-label {
      color: #64748b;
      font-weight: 600;
      display: inline-block;
      width: 140px;
    }
    .detail-value {
      color: #0f172a;
      font-weight: 500;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 700;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-created {
      background-color: #dbeafe;
      color: #1d4ed8;
    }
    .badge-updated {
      background-color: #fef3c7;
      color: #b45309;
    }
    .badge-deleted {
      background-color: #ffe4e6;
      color: #e11d48;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px 28px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  ${preheader ? `<span style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</span>` : ''}
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1 class="brand-title">ContractorHub</h1>
        <p class="brand-subtitle">Smart Dispatch & Client Service Portal</p>
      </div>
      <div class="content-body">
        ${content}
      </div>
      <div class="footer">
        <p style="margin: 0 0 6px 0;">&copy; ${year} ContractorHub Service Operations. All rights reserved.</p>
        <p style="margin: 0;">This is an automated dispatch notification regarding your service appointments.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export interface SendJobCreatedNotificationParams {
  clientName: string;
  clientEmail?: string | null;
  job: JobEmailDetails;
  cachedClients?: Schema['Client']['type'][];
  senderName?: string;
  fromName?: string;
  adminName?: string;
}

/**
 * 1. Send Job Created Notification
 */
export async function sendJobCreatedNotification(
  params: SendJobCreatedNotificationParams
): Promise<SendEmailResult> {
  const { clientName, job, cachedClients, senderName, fromName, adminName } = params;
  const jobIdStr = job.id ? `#${job.id}` : 'New Request';

  // Pull recipient email dynamically from database if not explicitly supplied
  let dynamicToEmail = params.clientEmail?.trim();
  if (!dynamicToEmail) {
    const resolved = await resolveClientEmailForJob(job.clientEmail || job.client || job.clientId || clientName, cachedClients);
    if (resolved) {
      dynamicToEmail = resolved;
    }
  }

  if (!dynamicToEmail) {
    console.warn(`[SES MailService] sendJobCreatedNotification aborted: No email found in database record for client "${clientName}" (Job: ${jobIdStr}).`);
    return {
      success: false,
      error: `No recipient email found in database record for client "${clientName}"`,
    };
  }

  console.log(`[SES MailService] Sending job created email to dynamic client address: ${dynamicToEmail} for job ${jobIdStr}`);

  const subject = `Job Scheduled: ${job.service || 'Service Appointment'} (${jobIdStr})`;
  const preheader = `Your scheduled service appointment details with ContractorHub (${jobIdStr})`;

  const html = renderEmailShell(
    `
    <div style="margin-bottom: 20px;">
      <span class="badge badge-created">Job Scheduled</span>
    </div>
    <h2 class="h1-title">Service Appointment Confirmed</h2>
    <p style="font-size: 15px; color: #334155; margin: 0 0 16px 0;">
      Hello <strong>${clientName}</strong>,
    </p>
    <p style="font-size: 14px; color: #475569; margin: 0 0 20px 0; line-height: 1.6;">
      Your service job has been scheduled in our dispatch queue. Below are the confirmed job details:
    </p>

    <div class="card-box">
      <div class="detail-row">
        <span class="detail-label">Job Reference:</span>
        <span class="detail-value" style="font-weight: 700; color: #1e3a8a;">${jobIdStr}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Service Type:</span>
        <span class="detail-value">${job.service || 'General Contractor Service'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Scheduled Date:</span>
        <span class="detail-value" style="color: #0f172a; font-weight: 700;">${job.scheduledDate || 'Pending Date Confirmation'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Time Window:</span>
        <span class="detail-value">${job.requestTime || '08:00 AM'} (${job.estimatedDuration || '2 hours'})</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Service Location:</span>
        <span class="detail-value">${job.location || 'On-file client address'}</span>
      </div>
      ${job.assignedTechnicianName ? `
      <div class="detail-row">
        <span class="detail-label">Assigned Pro:</span>
        <span class="detail-value">${job.assignedTechnicianName}</span>
      </div>` : ''}
      ${job.priority ? `
      <div class="detail-row">
        <span class="detail-label">Priority:</span>
        <span class="detail-value" style="text-transform: capitalize;">${job.priority}</span>
      </div>` : ''}
      ${job.notes ? `
      <div class="detail-row" style="margin-top: 14px; border-top: 1px dashed #cbd5e1; padding-top: 10px;">
        <span class="detail-label" style="vertical-align: top;">Notes / Instructions:</span>
        <span class="detail-value" style="color: #475569;">${job.notes}</span>
      </div>` : ''}
    </div>

    <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-top: 24px;">
      If you have questions or need to adjust your scheduled time, please contact our dispatch team or reply to this message.
    </p>
    `,
    preheader
  );

  const text = `
ContractorHub - Service Appointment Confirmed

Hello ${clientName},
Your service appointment (${jobIdStr}) has been successfully scheduled.

Details:
- Job Ref: ${jobIdStr}
- Service: ${job.service || 'Contractor Service'}
- Scheduled Date: ${job.scheduledDate || 'Pending Date'}
- Time Window: ${job.requestTime || '08:00 AM'} (${job.estimatedDuration || '2 hours'})
- Location: ${job.location || 'Client location'}
- Technician: ${job.assignedTechnicianName || 'To be assigned'}
- Notes: ${job.notes || 'None'}

Thank you for choosing ContractorHub!
  `.trim();

  return sendEmail({
    to: dynamicToEmail,
    subject,
    html,
    text,
    senderName: senderName || fromName || adminName,
  });
}

export interface SendJobUpdatedNotificationParams {
  clientName: string;
  clientEmail?: string | null;
  job: JobEmailDetails;
  changesSummary?: string;
  cachedClients?: Schema['Client']['type'][];
  senderName?: string;
  fromName?: string;
  adminName?: string;
}

/**
 * 2. Send Job Updated Notification
 */
export async function sendJobUpdatedNotification(
  params: SendJobUpdatedNotificationParams
): Promise<SendEmailResult> {
  const { clientName, job, changesSummary, cachedClients, senderName, fromName, adminName } = params;
  const jobIdStr = job.id ? `#${job.id}` : 'Job Details';

  // Pull recipient email dynamically from database if not explicitly supplied
  let dynamicToEmail = params.clientEmail?.trim();
  if (!dynamicToEmail) {
    const resolved = await resolveClientEmailForJob(job.clientEmail || job.client || job.clientId || clientName, cachedClients);
    if (resolved) {
      dynamicToEmail = resolved;
    }
  }

  if (!dynamicToEmail) {
    console.warn(`[SES MailService] sendJobUpdatedNotification aborted: No email found in database record for client "${clientName}" (Job: ${jobIdStr}).`);
    return {
      success: false,
      error: `No recipient email found in database record for client "${clientName}"`,
    };
  }

  console.log(`[SES MailService] Sending job updated email to dynamic client address: ${dynamicToEmail} for job ${jobIdStr}`);

  const subject = `Job Updated: ${job.service || 'Service Appointment'} (${jobIdStr})`;
  const preheader = `Updates have been made to your ContractorHub service appointment (${jobIdStr})`;

  const html = renderEmailShell(
    `
    <div style="margin-bottom: 20px;">
      <span class="badge badge-updated">Job Updated</span>
    </div>
    <h2 class="h1-title">Service Details Have Been Updated</h2>
    <p style="font-size: 15px; color: #334155; margin: 0 0 16px 0;">
      Hello <strong>${clientName}</strong>,
    </p>
    <p style="font-size: 14px; color: #475569; margin: 0 0 20px 0; line-height: 1.6;">
      Your service job <strong>${jobIdStr}</strong> was recently updated. Please review the current schedule and specifications below:
    </p>

    ${changesSummary ? `
    <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px; font-size: 13px; color: #92400e;">
      <strong>Summary of Changes:</strong> ${changesSummary}
    </div>` : ''}

    <div class="card-box">
      <div class="detail-row">
        <span class="detail-label">Job Reference:</span>
        <span class="detail-value" style="font-weight: 700; color: #1e3a8a;">${jobIdStr}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Service Type:</span>
        <span class="detail-value">${job.service || 'General Contractor Service'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Current Status:</span>
        <span class="detail-value" style="font-weight: 700;">${job.status || 'Scheduled'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Scheduled Date:</span>
        <span class="detail-value" style="font-weight: 700;">${job.scheduledDate || 'Standard Schedule'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Time Window:</span>
        <span class="detail-value">${job.requestTime || 'Standard'} (${job.estimatedDuration || '2 hours'})</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Location:</span>
        <span class="detail-value">${job.location || 'On-file client address'}</span>
      </div>
      ${job.assignedTechnicianName ? `
      <div class="detail-row">
        <span class="detail-label">Technician:</span>
        <span class="detail-value">${job.assignedTechnicianName}</span>
      </div>` : ''}
      ${job.notes ? `
      <div class="detail-row" style="margin-top: 14px; border-top: 1px dashed #cbd5e1; padding-top: 10px;">
        <span class="detail-label" style="vertical-align: top;">Notes / Instructions:</span>
        <span class="detail-value" style="color: #475569;">${job.notes}</span>
      </div>` : ''}
    </div>

    <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-top: 24px;">
      If you did not authorize this change or have scheduling questions, please reply directly to this notification.
    </p>
    `,
    preheader
  );

  const text = `
ContractorHub - Service Job Updated

Hello ${clientName},
Updates have been saved for your job (${jobIdStr}).

Current Details:
- Job Ref: ${jobIdStr}
- Service: ${job.service || 'Contractor Service'}
- Status: ${job.status || 'Updated'}
- Date: ${job.scheduledDate || 'Scheduled Date'}
- Time Window: ${job.requestTime || 'Standard'} (${job.estimatedDuration || '2 hours'})
- Location: ${job.location || 'Client location'}
- Technician: ${job.assignedTechnicianName || 'Assigned Tech'}
- Notes: ${job.notes || 'None'}

ContractorHub Operations Team
  `.trim();

  return sendEmail({
    to: dynamicToEmail,
    subject,
    html,
    text,
    senderName: senderName || fromName || adminName,
  });
}

export interface SendJobDeletedNotificationParams {
  clientName: string;
  clientEmail?: string | null;
  job: JobEmailDetails;
  reason?: string;
  cachedClients?: Schema['Client']['type'][];
  senderName?: string;
  fromName?: string;
  adminName?: string;
}

/**
 * 3. Send Job Deleted / Cancelled Notification
 */
export async function sendJobDeletedNotification(
  params: SendJobDeletedNotificationParams
): Promise<SendEmailResult> {
  const { clientName, job, reason, cachedClients, senderName, fromName, adminName } = params;
  const jobIdStr = job.id ? `#${job.id}` : 'Service Request';

  // Pull recipient email dynamically from database if not explicitly supplied
  let dynamicToEmail = params.clientEmail?.trim();
  if (!dynamicToEmail) {
    const resolved = await resolveClientEmailForJob(job.clientEmail || job.client || job.clientId || clientName, cachedClients);
    if (resolved) {
      dynamicToEmail = resolved;
    }
  }

  if (!dynamicToEmail) {
    console.warn(`[SES MailService] sendJobDeletedNotification aborted: No email found in database record for client "${clientName}" (Job: ${jobIdStr}).`);
    return {
      success: false,
      error: `No recipient email found in database record for client "${clientName}"`,
    };
  }

  console.log(`[SES MailService] Sending job cancelled email to dynamic client address: ${dynamicToEmail} for job ${jobIdStr}`);

  const subject = `Job Cancelled: ${job.service || 'Service Appointment'} (${jobIdStr})`;
  const preheader = `Notice: Your scheduled job with ContractorHub has been removed (${jobIdStr})`;

  const html = renderEmailShell(
    `
    <div style="margin-bottom: 20px;">
      <span class="badge badge-deleted">Job Cancelled</span>
    </div>
    <h2 class="h1-title">Service Appointment Cancellation Notice</h2>
    <p style="font-size: 15px; color: #334155; margin: 0 0 16px 0;">
      Hello <strong>${clientName}</strong>,
    </p>
    <p style="font-size: 14px; color: #475569; margin: 0 0 20px 0; line-height: 1.6;">
      This email confirms that service job <strong>${jobIdStr}</strong> has been cancelled and removed from our active dispatch schedule.
    </p>

    <div class="card-box" style="border-left: 4px solid #ef4444;">
      <div class="detail-row">
        <span class="detail-label">Job Reference:</span>
        <span class="detail-value" style="font-weight: 700; color: #dc2626;">${jobIdStr}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Service:</span>
        <span class="detail-value">${job.service || 'Contractor Service'}</span>
      </div>
      ${job.scheduledDate ? `
      <div class="detail-row">
        <span class="detail-label">Was Scheduled For:</span>
        <span class="detail-value">${job.scheduledDate}</span>
      </div>` : ''}
      <div class="detail-row">
        <span class="detail-label">Location:</span>
        <span class="detail-value">${job.location || 'Client location'}</span>
      </div>
      ${reason ? `
      <div class="detail-row" style="margin-top: 10px; color: #991b1b;">
        <span class="detail-label">Reason:</span>
        <span class="detail-value">${reason}</span>
      </div>` : ''}
    </div>

    <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-top: 24px;">
      If this cancellation was in error or you would like to reschedule a new service, please reach out to us at any time.
    </p>
    `,
    preheader
  );

  const text = `
ContractorHub - Service Job Cancelled

Hello ${clientName},
This confirms that job ${jobIdStr} (${job.service || 'Contractor Service'}) has been cancelled and removed from our dispatch schedule.

Location: ${job.location || 'Client location'}
${reason ? `Reason: ${reason}` : ''}

If you need to reschedule or have questions, please contact our dispatch team.
  `.trim();

  return sendEmail({
    to: dynamicToEmail,
    subject,
    html,
    text,
    senderName: senderName || fromName || adminName,
  });
}

/**
 * Robust Client Lookup helper:
 * Finds a client from an in-memory list or queries the database via clientAPI.
 * Matches by exact ID or name (case-insensitive).
 */
export async function resolveClientForJob(
  clientIdentifier: string,
  cachedClients?: Schema['Client']['type'][]
): Promise<Schema['Client']['type'] | null> {
  if (!clientIdentifier) return null;

  const target = clientIdentifier.trim().toLowerCase();

  // 1. Check in-memory / state clients first
  if (cachedClients && cachedClients.length > 0) {
    const found = cachedClients.find(
      (c) => c.id?.toLowerCase() === target || c.name?.toLowerCase() === target
    );
    if (found) return found;
  }

  // 2. Query Client database directly by ID if possible
  try {
    const directClient = await clientAPI.getClient(clientIdentifier.trim());
    if (directClient && (directClient.id?.toLowerCase() === target || directClient.name?.toLowerCase() === target)) {
      return directClient;
    }
  } catch {
    // ID lookup might throw if clientIdentifier is a freeform name rather than an ID
  }

  // 3. Query Client database list via API
  try {
    const allClients = await clientAPI.listClients();
    if (allClients && allClients.length > 0) {
      const match = allClients.find(
        (c) => c.id?.toLowerCase() === target || c.name?.toLowerCase() === target
      );
      if (match) return match;
    }
  } catch (err) {
    console.error('[SES MailService] Error looking up client in database:', err);
  }

  return null;
}

/**
 * Dynamically retrieves a client's email address directly from their database record.
 * Accepts a client identifier (name, ID, or job reference) and queries the database.
 */
export async function resolveClientEmailForJob(
  clientIdentifier?: string | null,
  cachedClients?: Schema['Client']['type'][]
): Promise<string | null> {
  if (!clientIdentifier) return null;
  const clientRecord = await resolveClientForJob(clientIdentifier, cachedClients);
  return clientRecord?.email?.trim() || null;
}

export interface NotifyJobCreatedOptions {
  clientName?: string;
  clientEmail?: string;
  clientInfo?: { name?: string; email?: string };
  cachedClients?: Schema['Client']['type'][];
  senderName?: string;
  fromName?: string;
  adminName?: string;
}

export interface NotifyJobUpdatedOptions {
  clientName?: string;
  clientEmail?: string;
  clientInfo?: { name?: string; email?: string };
  changesSummary?: string;
  cachedClients?: Schema['Client']['type'][];
  senderName?: string;
  fromName?: string;
  adminName?: string;
}

export interface NotifyJobDeletedOptions {
  clientName?: string;
  clientEmail?: string;
  clientInfo?: { name?: string; email?: string };
  reason?: string;
  cachedClients?: Schema['Client']['type'][];
  senderName?: string;
  fromName?: string;
  adminName?: string;
}

/**
 * High-level dynamic controller for job creation notification:
 * Automatically pulls the client's email directly from the database record
 * associated with the job and dispatches the SES notification.
 */
export async function notifyJobCreated(
  job: JobEmailDetails,
  options?: NotifyJobCreatedOptions
): Promise<SendEmailResult> {
  const clientName = options?.clientName || options?.clientInfo?.name || job.client || 'Valued Client';
  const clientEmail = options?.clientEmail || options?.clientInfo?.email;
  return sendJobCreatedNotification({
    clientName,
    clientEmail,
    job,
    cachedClients: options?.cachedClients,
    senderName: options?.senderName,
    fromName: options?.fromName,
    adminName: options?.adminName,
  });
}

/**
 * High-level dynamic controller for job update notification:
 * Automatically pulls the client's email directly from the database record
 * associated with the job and dispatches the SES notification.
 */
export async function notifyJobUpdated(
  job: JobEmailDetails,
  options?: NotifyJobUpdatedOptions
): Promise<SendEmailResult> {
  const clientName = options?.clientName || options?.clientInfo?.name || job.client || 'Valued Client';
  const clientEmail = options?.clientEmail || options?.clientInfo?.email;
  return sendJobUpdatedNotification({
    clientName,
    clientEmail,
    job,
    changesSummary: options?.changesSummary,
    cachedClients: options?.cachedClients,
    senderName: options?.senderName,
    fromName: options?.fromName,
    adminName: options?.adminName,
  });
}

/**
 * High-level dynamic controller for job cancellation/deletion notification:
 * Automatically pulls the client's email directly from the database record
 * associated with the job and dispatches the SES notification.
 */
export async function notifyJobDeleted(
  job: JobEmailDetails,
  options?: NotifyJobDeletedOptions
): Promise<SendEmailResult> {
  const clientName = options?.clientName || options?.clientInfo?.name || job.client || 'Valued Client';
  const clientEmail = options?.clientEmail || options?.clientInfo?.email;
  return sendJobDeletedNotification({
    clientName,
    clientEmail,
    job,
    reason: options?.reason,
    cachedClients: options?.cachedClients,
    senderName: options?.senderName,
    fromName: options?.fromName,
    adminName: options?.adminName,
  });
}

