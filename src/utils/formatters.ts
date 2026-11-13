/**
 * Resolves the canonical unique job identifier from a job object, service request object,
 * or ID string.
 *
 * In this system, ScheduledJob records represent scheduled calendar assignments for a
 * primary ServiceRequest. The canonical unique business identifier shared between
 * Dispatcher and Technician views is the ServiceRequest ID (e.g. "SR-1001"), or
 * explicit `jobNumber` / `job_number` field if defined.
 */
export function getCanonicalJobId(
  jobOrId?: any,
  scheduledJobs?: Array<{ id?: string | null; serviceRequestId?: string | null } | any>
): string {
  if (!jobOrId) return '';

  if (typeof jobOrId === 'object' && jobOrId !== null) {
    return (
      jobOrId.jobNumber ||
      jobOrId.job_number ||
      jobOrId.serviceRequestId ||
      jobOrId.srId ||
      jobOrId.id ||
      ''
    );
  }

  const str = String(jobOrId).trim();
  if (!str) return '';

  // If a scheduledJobs array is provided and str matches a job.id, resolve to its canonical serviceRequestId
  if (Array.isArray(scheduledJobs) && scheduledJobs.length > 0) {
    const match = scheduledJobs.find((j) => j && (j.id === str || j.serviceRequestId === str));
    if (match && match.serviceRequestId) {
      return match.serviceRequestId;
    }
  }

  // Fallback to localStorage lookup in browser if str is a scheduled job ID ("job-...")
  if (typeof window !== 'undefined' && str.startsWith('job-')) {
    try {
      const cached = localStorage.getItem('mock_scheduled_jobs');
      if (cached) {
        const jobs = JSON.parse(cached);
        if (Array.isArray(jobs)) {
          const match = jobs.find((j: any) => j.id === str);
          if (match && match.serviceRequestId) {
            return match.serviceRequestId;
          }
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  return str;
}

/**
 * Consistently formats a job or service request into a standardized human-readable
 * job number (e.g., "J9014") using a canonical 32-bit djb2 hash.
 */
export function formatJobNumber(jobOrId?: any, scheduledJobs?: any[]): string {
  const canonicalId = getCanonicalJobId(jobOrId, scheduledJobs);
  if (!canonicalId || typeof canonicalId !== 'string' || canonicalId.trim() === '') {
    return 'J0000';
  }

  const clean = canonicalId.trim();

  // If already formatted as a job number (e.g., "J9014"), return normalized uppercase
  if (/^J\d{4}$/i.test(clean)) {
    return clean.toUpperCase();
  }

  // Consistent 32-bit integer string hash (djb2 variant)
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  // Map to positive integer in the range [1000, 9999]
  const positiveHash = Math.abs(hash);
  const code = 1000 + (positiveHash % 9000);

  return `J${code}`;
}

