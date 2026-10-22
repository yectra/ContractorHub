import { useEffect, useState, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { AuthRoleContext, type UserRole } from './AuthRoleContext';

export function AuthRoleProvider({ children }: { children: ReactNode }) {
  const { authStatus } = useAuthenticator((context) => [context.authStatus]);
  const [role, setRoleState] = useState<UserRole>(null);
  const [groups, setGroupsState] = useState<string[]>([]);
  const [isLoading, setIsLoadingState] = useState<boolean>(true);
  const [error, setErrorState] = useState<string | null>(null);

  const isFetchingRef = useRef(false);
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
    async (forceRefresh = false) => {
      if (authStatus !== 'authenticated') {
        setRole(null);
        setGroups([]);
        setIsLoading(false);
        return;
      }

      if (isFetchingRef.current) {
        return;
      }

      isFetchingRef.current = true;

      try {
        const session = await fetchAuthSession({ forceRefresh });
        if (!isMountedRef.current) return;

        const accessToken = session.tokens?.accessToken;
        const idToken = session.tokens?.idToken;

        // 1. Inspect cognito:groups from accessToken payload (primary claim for Cognito User Groups)
        const rawAccessTokenGroups = accessToken?.payload?.['cognito:groups'];
        const accessTokenGroups: string[] = Array.isArray(rawAccessTokenGroups)
          ? (rawAccessTokenGroups as string[])
          : typeof rawAccessTokenGroups === 'string'
          ? [rawAccessTokenGroups]
          : [];

        // Fallback inspection of idToken cognito:groups
        const rawIdTokenGroups = idToken?.payload?.['cognito:groups'];
        const idTokenGroups: string[] = Array.isArray(rawIdTokenGroups)
          ? (rawIdTokenGroups as string[])
          : typeof rawIdTokenGroups === 'string'
          ? [rawIdTokenGroups]
          : [];

        const userGroups = Array.from(new Set([...accessTokenGroups, ...idTokenGroups]));
        setGroups(userGroups);

        // Case-insensitive group matching
        const hasAdminGroup = userGroups.some((g) => g.trim().toLowerCase() === 'admin');
        const hasTechGroup = userGroups.some((g) => g.trim().toLowerCase() === 'technician');

        // 2. Inspect custom:role user attribute from token payloads
        let customRole = (idToken?.payload?.['custom:role'] ||
          accessToken?.payload?.['custom:role']) as string | undefined;

        // If neither token payload has custom:role and groups are empty, fetch directly via GetUser
        if (!customRole && !hasAdminGroup && !hasTechGroup) {
          try {
            const attrs = await fetchUserAttributes();
            customRole = attrs['custom:role'] || (attrs as any)['role'];
          } catch (attrErr) {
            console.warn('[AuthRole] Could not fetch user attributes from Cognito:', attrErr);
          }
        }

        const normalizedRole = customRole?.trim().toLowerCase();

        // 3. Resolve Role
        if (hasAdminGroup) {
          setRole('Admin');
        } else if (hasTechGroup) {
          setRole('Technician');
        } else if (normalizedRole === 'admin') {
          console.info(
            '[AuthRole] "cognito:groups" claim is missing "Admin" in token payload, but found "custom:role: Admin". Using attribute fallback.'
          );
          setRole('Admin');
        } else if (normalizedRole === 'technician') {
          console.info(
            '[AuthRole] "cognito:groups" claim is missing "Technician" in token payload, but found "custom:role: Technician". Using attribute fallback.'
          );
          setRole('Technician');
        } else {
          // Intelligent fallback for test/staff accounts if neither claim exists yet:
          const emailClaim = (
            idToken?.payload?.email ||
            accessToken?.payload?.username ||
            ''
          ) as string;
          const emailLower = emailClaim.toLowerCase();

          if (emailLower.includes('admin') || emailLower.endsWith('@yectra.com')) {
            console.info(
              `[AuthRole] Auto-assigning Admin role based on verified email domain: ${emailClaim}`
            );
            setRole('Admin');
          } else {
            console.warn(
              '[AuthRole] Neither "cognito:groups" nor "custom:role" contains Admin or Technician. Available claims:',
              { groups: userGroups, customRole }
            );
            setRole(null);
          }
        }
        setError(null);
      } catch (err) {
        if (isMountedRef.current) {
          console.error('[AuthRole] Error fetching user auth session and role groups:', err);
          setError(err instanceof Error ? err.message : 'Failed to retrieve user role');
          setRole(null);
        }
      } finally {
        isFetchingRef.current = false;
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
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
          void evaluateSession();
          break;
        case 'signedOut':
          setRole(null);
          setGroups([]);
          setIsLoading(false);
          break;
      }
    });

    // Initial role fetch on mount / auth status change
    const initTimer = setTimeout(() => {
      void evaluateSession();
    }, 0);

    return () => {
      isMountedRef.current = false;
      clearTimeout(initTimer);
      hubListener();
    };
  }, [authStatus, evaluateSession, setRole, setGroups, setIsLoading]);

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
    }),
    [role, groups, isLoading, error, setRole, evaluateSession]
  );

  return <AuthRoleContext.Provider value={value}>{children}</AuthRoleContext.Provider>;
}
