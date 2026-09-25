import { useEffect, useState, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
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
    (forceRefresh = false) => {
      if (authStatus !== 'authenticated') {
        setRole(null);
        setGroups([]);
        setIsLoading(false);
        return Promise.resolve();
      }

      if (isFetchingRef.current) {
        return Promise.resolve();
      }

      isFetchingRef.current = true;

      return fetchAuthSession({ forceRefresh })
        .then((session) => {
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

          // 2. Inspect custom:role user attribute from token payloads
          const customRole = (idToken?.payload?.['custom:role'] ||
            accessToken?.payload?.['custom:role']) as string | undefined;

          // 3. Resolve Role: Check group claims first
          if (userGroups.includes('Admin')) {
            setRole('Admin');
          } else if (userGroups.includes('Technician')) {
            setRole('Technician');
          } else if (customRole === 'Admin') {
            console.warn(
              '[AuthRole] "cognito:groups" claim is missing "Admin" in access token payload, but found "custom:role: Admin". Using attribute fallback.'
            );
            setRole('Admin');
          } else if (customRole === 'Technician') {
            console.warn(
              '[AuthRole] "cognito:groups" claim is missing "Technician" in access token payload, but found "custom:role: Technician". Using attribute fallback.'
            );
            setRole('Technician');
          } else {
            console.warn(
              '[AuthRole] Neither "cognito:groups" nor "custom:role" contains Admin or Technician. Available claims:',
              { groups: userGroups, customRole }
            );
            setRole(null);
          }
          setError(null);
        })
        .catch((err) => {
          if (isMountedRef.current) {
            console.error('[AuthRole] Error fetching user auth session and role groups:', err);
            setError(err instanceof Error ? err.message : 'Failed to retrieve user role');
            setRole(null);
          }
        })
        .finally(() => {
          isFetchingRef.current = false;
          if (isMountedRef.current) {
            setIsLoading(false);
          }
        });
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
