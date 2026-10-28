import { useEffect, useState, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { AuthRoleContext, type UserRole } from './AuthRoleContext';
import { clearAuthSessionAndRedirect } from '../utils/authUtils';

export function AuthRoleProvider({ children }: { children: ReactNode }) {
  const { authStatus, signOut } = useAuthenticator((context) => [context.authStatus, context.signOut]);
  const [role, setRoleState] = useState<UserRole>(null);
  const [groups, setGroupsState] = useState<string[]>([]);
  const [isLoading, setIsLoadingState] = useState<boolean>(true);
  const [error, setErrorState] = useState<string | null>(null);

  const activeFetchPromiseRef = useRef<Promise<UserRole> | null>(null);
  const isMountedRef = useRef(true);

  // Helpers to safely update state only when value has changed
  const setRole = useCallback((newRole: UserRole) => {
    setRoleState((prev) => (prev !== newRole ? newRole : prev));
  }, []);

  const setGroups = useCallback((newGroups: string[]) => {
    setGroupsState((prev) => {
      if (prev.length === newGroups.length && prev.every((g, i) => g === newGroups[i])) {
        return prev;
      }
      return newGroups;
    });
  }, []);

  const setIsLoading = useCallback((loading: boolean) => {
    setIsLoadingState((prev) => (prev !== loading ? loading : prev));
  }, []);

  const setError = useCallback((newError: string | null) => {
    setErrorState((prev) => (prev !== newError ? newError : prev));
  }, []);

  const evaluateSession = useCallback(
    async (forceRefresh = true): Promise<UserRole> => {
      if (authStatus !== 'authenticated') {
        setRole(null);
        setGroups([]);
        setIsLoading(false);
        setError(null);
        return null;
      }

      // If a fetch is already in-flight, return the active promise to avoid duplicate race conditions
      if (activeFetchPromiseRef.current) {
        return activeFetchPromiseRef.current;
      }

      setIsLoading(true);

      const fetchPromise = (async () => {
        try {
          // 1. Fetch auth session fresh from Cognito
          let session;
          try {
            session = await fetchAuthSession({ forceRefresh });
          } catch (sessionErr) {
            console.warn('[AuthRole] fetchAuthSession with forceRefresh failed, falling back:', sessionErr);
            session = await fetchAuthSession();
          }

          if (!isMountedRef.current) return null;

          const accessToken = session.tokens?.accessToken;
          const idToken = session.tokens?.idToken;

          // Inspect cognito:groups from accessToken and idToken payloads
          const rawAccessTokenGroups = accessToken?.payload?.['cognito:groups'];
          const accessTokenGroups: string[] = Array.isArray(rawAccessTokenGroups)
            ? (rawAccessTokenGroups as string[])
            : typeof rawAccessTokenGroups === 'string'
            ? [rawAccessTokenGroups]
            : [];

          const rawIdTokenGroups = idToken?.payload?.['cognito:groups'];
          const idTokenGroups: string[] = Array.isArray(rawIdTokenGroups)
            ? (rawIdTokenGroups as string[])
            : typeof rawIdTokenGroups === 'string'
            ? [rawIdTokenGroups]
            : [];

          const userGroups = Array.from(new Set([...accessTokenGroups, ...idTokenGroups]));
          setGroups(userGroups);

          // Group matching: Admin/Dispatcher vs Technician
          const hasAdminGroup = userGroups.some((g) => {
            const lower = g.trim().toLowerCase();
            return lower === 'admin' || lower === 'dispatcher' || lower === 'dispatch';
          });
          const hasTechGroup = userGroups.some((g) => {
            const lower = g.trim().toLowerCase();
            return lower === 'technician' || lower === 'tech';
          });

          // 2. Fetch fresh user attributes directly from Cognito via GetUser
          let customRole: string | undefined;
          let userEmail: string | undefined;

          try {
            const attrs = await fetchUserAttributes();
            customRole = attrs['custom:role'] || (attrs as Record<string, string | undefined>)['role'];
            userEmail = attrs.email;
          } catch (attrErr) {
            console.warn('[AuthRole] Could not fetch fresh user attributes from Cognito:', attrErr);
          }

          // Fallback to token payload claims if attribute retrieval had missing fields
          if (!customRole) {
            customRole = (idToken?.payload?.['custom:role'] ||
              accessToken?.payload?.['custom:role']) as string | undefined;
          }
          if (!userEmail) {
            userEmail = (idToken?.payload?.email ||
              accessToken?.payload?.username ||
              '') as string;
          }

          const normalizedRole = customRole?.trim().toLowerCase();
          const isAdminAttr = normalizedRole === 'admin' || normalizedRole === 'dispatcher' || normalizedRole === 'dispatch';
          const isTechAttr = normalizedRole === 'technician' || normalizedRole === 'tech';

          let resolvedRole: UserRole = null;

          // 3. Resolve Role
          if (hasAdminGroup || isAdminAttr) {
            resolvedRole = 'Admin';
          } else if (hasTechGroup || isTechAttr) {
            resolvedRole = 'Technician';
          } else {
            // Intelligent fallback for staff accounts based on email
            const emailLower = (userEmail || '').toLowerCase();
            if (emailLower.includes('admin') || emailLower.includes('dispatcher') || emailLower.endsWith('@yectra.com')) {
              console.info(`[AuthRole] Auto-assigning Admin role based on email: ${userEmail}`);
              resolvedRole = 'Admin';
            } else if (emailLower.includes('tech')) {
              console.info(`[AuthRole] Auto-assigning Technician role based on email: ${userEmail}`);
              resolvedRole = 'Technician';
            } else {
              console.warn(
                '[AuthRole] Neither "cognito:groups" nor "custom:role" contains Admin/Dispatcher or Technician. Available claims:',
                { groups: userGroups, customRole, email: userEmail }
              );
              resolvedRole = null;
            }
          }

          if (isMountedRef.current) {
            setRole(resolvedRole);
            setError(null);
          }
          return resolvedRole;
        } catch (err) {
          if (isMountedRef.current) {
            console.error('[AuthRole] Error fetching user auth session and role groups:', err);
            setError(err instanceof Error ? err.message : 'Failed to retrieve user role');
            setRole(null);
          }
          return null;
        } finally {
          activeFetchPromiseRef.current = null;
          if (isMountedRef.current) {
            setIsLoading(false);
          }
        }
      })();

      activeFetchPromiseRef.current = fetchPromise;
      return fetchPromise;
    },
    [authStatus, setRole, setGroups, setIsLoading, setError]
  );

  useEffect(() => {
    isMountedRef.current = true;

    // Listen to Amplify Auth Hub events (signedIn, tokenRefresh, signedOut)
    const hubListener = Hub.listen('auth', ({ payload }) => {
      switch (payload.event) {
        case 'signedIn':
        case 'tokenRefresh':
          void evaluateSession(true);
          break;
        case 'signedOut':
          setRole(null);
          setGroups([]);
          setIsLoading(false);
          setError(null);
          break;
      }
    });

    let timer: ReturnType<typeof setTimeout> | undefined;

    if (authStatus === 'authenticated') {
      timer = setTimeout(() => {
        void evaluateSession(true);
      }, 0);
    } else {
      timer = setTimeout(() => {
        setRole(null);
        setGroups([]);
        setIsLoading(false);
        setError(null);
      }, 0);
    }

    return () => {
      isMountedRef.current = false;
      if (timer) clearTimeout(timer);
      hubListener();
    };
  }, [authStatus, evaluateSession, setRole, setGroups, setIsLoading, setError]);

  const logout = useCallback(async () => {
    await clearAuthSessionAndRedirect(signOut);
  }, [signOut]);

  const value = useMemo(
    () => ({
      role,
      groups,
      isLoading,
      error,
      isAdmin: role === 'Admin',
      isTechnician: role === 'Technician',
      setRole,
      refreshRole: () => evaluateSession(true),
      logout,
    }),
    [role, groups, isLoading, error, setRole, evaluateSession, logout]
  );

  return <AuthRoleContext.Provider value={value}>{children}</AuthRoleContext.Provider>;
}
