import { signOut as amplifySignOut } from 'aws-amplify/auth';

/**
 * Completely purges all local storage keys, session storage, and cached tokens,
 * signs out from AWS Amplify Auth, and forces a full-page browser redirect to `/`
 * to eliminate all stale in-memory state.
 */
export async function clearAuthSessionAndRedirect(
  customSignOut?: () => Promise<void> | void
): Promise<void> {
  try {
    if (typeof customSignOut === 'function') {
      await customSignOut();
    } else {
      await amplifySignOut();
    }
  } catch (authErr) {
    console.warn('[Auth] Primary signOut failed, attempting amplifySignOut fallback:', authErr);
    try {
      await amplifySignOut();
    } catch (fallbackErr) {
      console.warn('[Auth] Direct amplifySignOut fallback failed:', fallbackErr);
    }
  } finally {
    try {
      // 1. Wipe sessionStorage completely
      sessionStorage.clear();

      // 2. Wipe standard application mock caches
      const standardCacheKeys = [
        'mock_technicians',
        'mock_service_requests',
        'mock_scheduled_jobs',
        'mock_clients',
        'mock_users',
      ];
      standardCacheKeys.forEach((key) => localStorage.removeItem(key));

      // 3. Purge all Amplify, Cognito, job, and role tokens from localStorage
      const keysToPurge: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith('CognitoIdentityServiceProvider') ||
            key.startsWith('amplify') ||
            key.startsWith('@aws-amplify') ||
            key.startsWith('auth') ||
            key.startsWith('checklist_job_') ||
            key.startsWith('photos_job_') ||
            key.startsWith('upload_queue_') ||
            key.startsWith('comment_job_') ||
            key.startsWith('job_activity_') ||
            key.includes('role') ||
            key.includes('token'))
        ) {
          keysToPurge.push(key);
        }
      }
      keysToPurge.forEach((k) => localStorage.removeItem(k));
    } catch (storageErr) {
      console.error('[Auth] Error clearing storage during logout:', storageErr);
    }

    // 4. Force a clean hard reload to root `/` to clear all JavaScript memory and prevent stale role state
    window.location.href = '/';
  }
}
