import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  createContext,
  useContext,
} from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Box, Typography, Button, IconButton, Tooltip } from '@mui/material';
import { useAuthenticator } from '@aws-amplify/ui-react';

// Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SpeedIcon from '@mui/icons-material/Speed';
import EngineeringIcon from '@mui/icons-material/Engineering';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LogoutIcon from '@mui/icons-material/Logout';

import AukuraHeader from '../AukuraHeader';
import { clearAuthSessionAndRedirect } from '../../utils/authUtils';
import { useUserRole } from '../../hooks/useUserRole';
import styles from '../../styles/UI/AppLayout.module.scss';

export type ActivePageKey =
  | 'dashboard'
  | 'technicians'
  | 'crm'
  | 'users'
  | 'tech-dashboard';

export interface AppLayoutSubHeaderConfig {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  activePage?: ActivePageKey;
  showBackButton?: boolean;
  onBack?: () => void;
  backTo?: string;
  leftControls?: React.ReactNode;
  primaryAction?: React.ReactNode;
  navActions?: React.ReactNode;
  hideNavActions?: boolean;
  hideSubHeader?: boolean;
  fullWidth?: boolean;
  noScroll?: boolean;
}

export interface AppLayoutProps extends AppLayoutSubHeaderConfig {
  children?: React.ReactNode;
  className?: string;
}

interface AppLayoutContextValue {
  config: AppLayoutSubHeaderConfig;
  setConfig: (
    newConfig:
      | AppLayoutSubHeaderConfig
      | ((prev: AppLayoutSubHeaderConfig) => AppLayoutSubHeaderConfig)
  ) => void;
}

const AppLayoutContext = createContext<AppLayoutContextValue | null>(null);

export const useAppLayout = () => {
  const context = useContext(AppLayoutContext);
  return context;
};

/**
 * Hook for child pages inside AppLayout route to customize title, controls, and actions.
 */
export const useSubHeader = (config: AppLayoutSubHeaderConfig) => {
  const layout = useContext(AppLayoutContext);
  const setConfig = layout?.setConfig;

  useEffect(() => {
    if (setConfig) {
      setConfig(config);
      return () => {
        setConfig({});
      };
    }
  }, [setConfig, config]);
};

type ProfileUser = {
  username?: string;
  signInDetails?: {
    loginId?: string;
  };
  attributes?: Record<string, string | undefined>;
};

export const AppLayout: React.FC<AppLayoutProps> = ({
  title: propTitle,
  subtitle: propSubtitle,
  activePage: propActivePage,
  showBackButton: propShowBackButton,
  onBack: propOnBack,
  backTo: propBackTo,
  leftControls: propLeftControls,
  primaryAction: propPrimaryAction,
  navActions: propNavActions,
  hideNavActions: propHideNavActions,
  hideSubHeader: propHideSubHeader,
  fullWidth: propFullWidth,
  noScroll: propNoScroll,
  children,
  className,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useUserRole();

  // If already rendered inside a parent AppLayout (route wrapper), forward configs cleanly
  const parentLayout = useContext(AppLayoutContext);
  const setParentConfig = parentLayout?.setConfig;

  useEffect(() => {
    if (setParentConfig) {
      setParentConfig({
        title: propTitle,
        subtitle: propSubtitle,
        activePage: propActivePage,
        showBackButton: propShowBackButton,
        onBack: propOnBack,
        backTo: propBackTo,
        leftControls: propLeftControls,
        primaryAction: propPrimaryAction,
        navActions: propNavActions,
        hideNavActions: propHideNavActions,
        hideSubHeader: propHideSubHeader,
        fullWidth: propFullWidth,
        noScroll: propNoScroll,
      });

      return () => {
        setParentConfig({});
      };
    }
  }, [
    setParentConfig,
    propTitle,
    propSubtitle,
    propActivePage,
    propShowBackButton,
    propOnBack,
    propBackTo,
    propLeftControls,
    propPrimaryAction,
    propNavActions,
    propHideNavActions,
    propHideSubHeader,
    propFullWidth,
    propNoScroll,
  ]);

  if (parentLayout) {
    return <>{children || <Outlet />}</>;
  }

  // Internal context state to allow child views to set subheader dynamically
  const [contextConfig, setContextConfig] = useState<AppLayoutSubHeaderConfig>({});

  // Reset dynamic contextConfig whenever route path changes so previous page configs do not leak
  useEffect(() => {
    setContextConfig({});
  }, [location.pathname]);

  // Safe memoized context setter that only triggers re-render if properties actually changed
  const setContextConfigSafe = useCallback(
    (
      newConfig:
        | AppLayoutSubHeaderConfig
        | ((prev: AppLayoutSubHeaderConfig) => AppLayoutSubHeaderConfig)
    ) => {
      setContextConfig((prev) => {
        const next =
          typeof newConfig === 'function' ? newConfig(prev) : newConfig;
        const prevKeys = Object.keys(prev) as (keyof AppLayoutSubHeaderConfig)[];
        const nextKeys = Object.keys(next) as (keyof AppLayoutSubHeaderConfig)[];
        if (prevKeys.length !== nextKeys.length) {
          return next;
        }
        let hasChanged = false;
        for (const k of nextKeys) {
          if (prev[k] !== next[k]) {
            hasChanged = true;
            break;
          }
        }
        return hasChanged ? next : prev;
      });
    },
    []
  );

  const contextValue = useMemo(
    () => ({ config: contextConfig, setConfig: setContextConfigSafe }),
    [contextConfig, setContextConfigSafe]
  );

  // Auth User Data
  const { signOut, user } = useAuthenticator((context) => [
    context.signOut,
    context.user,
  ]);
  const profileUser = user as ProfileUser | undefined;

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const profileEmail =
    profileUser?.attributes?.email ||
    profileUser?.signInDetails?.loginId ||
    profileUser?.username ||
    '';

  const profileImageUrl =
    profileUser?.attributes?.picture ||
    profileUser?.attributes?.profile_image ||
    profileUser?.attributes?.avatar_url ||
    '';

  const profileAvatarInitials = useMemo(() => {
    const emailUsername = profileEmail.split('@')[0] || profileEmail;
    const normalized = emailUsername.replace(/[._-]+/g, ' ').trim();

    if (!normalized) {
      return 'U';
    }

    const parts = normalized.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return parts
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }, [profileEmail]);

  const profileName =
    profileUser?.attributes?.name ||
    profileUser?.attributes?.given_name ||
    (profileEmail ? profileEmail.split('@')[0] : '') ||
    'User';

  // Handle outside clicks to close profile menu
  useEffect(() => {
    if (!profileMenuOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        event.target instanceof Node &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [profileMenuOpen]);

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    await clearAuthSessionAndRedirect(signOut);
  };

  // Route-based synchronous default configs
  const routeDefaults = useMemo(() => {
    const pathname = location.pathname;
    if (pathname.startsWith('/admin/technicians')) {
      return {
        title: 'Technician Management',
        subtitle: 'Admin Portal / Field Force & Service Coverage',
        activePage: 'technicians' as ActivePageKey,
        showBackButton: true,
        backTo: '/admin',
        hideSubHeader: false,
        noScroll: false,
      };
    }
    if (pathname.startsWith('/admin/users')) {
      return {
        title: 'User Account Management',
        subtitle: 'Admin Portal / Technicians and Dispatchers Directory',
        activePage: 'users' as ActivePageKey,
        showBackButton: true,
        backTo: '/admin',
        hideSubHeader: false,
        noScroll: false,
      };
    }
    if (pathname.startsWith('/crm')) {
      return {
        title: 'Client CRM Dashboard',
        subtitle: 'Customer Accounts & Historical Work Orders',
        activePage: 'crm' as ActivePageKey,
        showBackButton: true,
        backTo: '/admin',
        hideSubHeader: false,
        noScroll: false,
      };
    }
    if (pathname.startsWith('/tech-dashboard')) {
      return {
        title: 'Technician Schedule',
        subtitle: 'Live Calendar & Assigned Job Execution',
        activePage: 'tech-dashboard' as ActivePageKey,
        showBackButton: true,
        backTo: '/admin',
        hideSubHeader: false,
        noScroll: true,
      };
    }
    // Default: Dispatch Center (/admin, /admin/dashboard, /)
    return {
      title: 'Dispatch Command Center',
      subtitle: 'Live Service Queue, Scheduling & Map View',
      activePage: 'dashboard' as ActivePageKey,
      showBackButton: false,
      backTo: undefined,
      hideSubHeader: true,
      noScroll: true,
    };
  }, [location.pathname]);

  // Merge precedence: props > contextConfig > routeDefaults
  const activeTitle = propTitle ?? contextConfig.title ?? routeDefaults.title;
  const activeSubtitle =
    propSubtitle ?? contextConfig.subtitle ?? routeDefaults.subtitle;
  const activePage =
    propActivePage ?? contextConfig.activePage ?? routeDefaults.activePage;
  const showBackButton =
    propShowBackButton ??
    contextConfig.showBackButton ??
    routeDefaults.showBackButton;
  const onBack = propOnBack ?? contextConfig.onBack;
  const backTo = propBackTo ?? contextConfig.backTo ?? routeDefaults.backTo;
  const leftControls = propLeftControls ?? contextConfig.leftControls;
  const primaryAction = propPrimaryAction ?? contextConfig.primaryAction;
  const navActions = propNavActions ?? contextConfig.navActions;
  const hideNavActions =
    propHideNavActions ?? contextConfig.hideNavActions ?? false;
  const hideSubHeader =
    propHideSubHeader ??
    contextConfig.hideSubHeader ??
    routeDefaults.hideSubHeader ??
    false;
  const noScroll =
    propNoScroll ?? contextConfig.noScroll ?? routeDefaults.noScroll ?? false;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backTo) {
      navigate(backTo);
    } else if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/admin');
    }
  };

  const isAdmin = role !== 'Technician';

  const currentPath = location.pathname;
  const isDashboard =
    activePage === 'dashboard' ||
    currentPath === '/admin' ||
    currentPath === '/admin/dashboard' ||
    currentPath === '/';
  const isTechnicians =
    activePage === 'technicians' ||
    currentPath.startsWith('/admin/technicians');
  const isCrm =
    activePage === 'crm' ||
    currentPath.startsWith('/crm');
  const isUsers =
    activePage === 'users' ||
    currentPath.startsWith('/admin/users');

  return (
    <AppLayoutContext.Provider value={contextValue}>
      <Box className={`${styles.layoutRoot} ${className || ''}`.trim()}>
        {/* ── 1. Unified Pinned Global Brand Header ── */}
        <Box className={styles.globalHeaderSticky}>
          <AukuraHeader
            profileImageUrl={profileImageUrl}
            profileAvatarInitials={profileAvatarInitials}
            profileEmail={profileEmail}
            profileName={profileName}
            profileMenuOpen={profileMenuOpen}
            setProfileMenuOpen={setProfileMenuOpen}
            profileMenuRef={profileMenuRef}
            triggerId="global-profile-menu-trigger"
            dropdownContent={
              <Box
                className={styles.profileDropdown}
                role="menu"
                aria-labelledby="global-profile-menu-trigger"
              >
                {/* Navigation Shortcuts for Admin */}
                {isAdmin && (
                  <>
                    {!isDashboard && (
                      <button
                        id="dispatch-board-nav-btn"
                        type="button"
                        className={styles.profileMenuItem}
                        onClick={() => {
                          setProfileMenuOpen(false);
                          navigate('/admin');
                        }}
                        role="menuitem"
                      >
                        <SpeedIcon className={styles.profileMenuIcon} />
                        <span>Dispatch Board</span>
                      </button>
                    )}
                    {!isTechnicians && (
                      <button
                        id="create-technician-nav-btn"
                        type="button"
                        className={styles.profileMenuItem}
                        onClick={() => {
                          setProfileMenuOpen(false);
                          navigate('/admin/technicians');
                        }}
                        role="menuitem"
                      >
                        <EngineeringIcon className={styles.profileMenuIcon} />
                        <span>Technicians</span>
                      </button>
                    )}
                    {!isCrm && (
                      <button
                        id="crm-nav-btn"
                        type="button"
                        className={styles.profileMenuItem}
                        onClick={() => {
                          setProfileMenuOpen(false);
                          navigate('/crm');
                        }}
                        role="menuitem"
                      >
                        <GroupsIcon className={styles.profileMenuIcon} />
                        <span>Client CRM</span>
                      </button>
                    )}
                    {!isUsers && (
                      <button
                        id="user-management-nav-btn"
                        type="button"
                        className={styles.profileMenuItem}
                        onClick={() => {
                          setProfileMenuOpen(false);
                          navigate('/admin/users');
                        }}
                        role="menuitem"
                      >
                        <PersonAddIcon className={styles.profileMenuIcon} />
                        <span>Users</span>
                      </button>
                    )}
                  </>
                )}

                {/* Logout Button */}
                <button
                  id="logout-nav-btn"
                  type="button"
                  className={`${styles.profileMenuItem} ${styles.profileMenuItemDanger}`}
                  onClick={handleLogout}
                  role="menuitem"
                >
                  <LogoutIcon className={styles.profileMenuIcon} />
                  <span>Logout</span>
                </button>
              </Box>
            }
          />
        </Box>

        {/* ── 2. Contextual Sub-Header (Page Title & Actions) ── */}
        {!hideSubHeader && (
          <Box component="header" className={styles.subHeader}>
            {/* Left: Back button + Title / Subtitle + Contextual Selectors */}
            <Box className={styles.subHeaderLeft}>
              {showBackButton && (
                <Tooltip title="Back" arrow>
                  <IconButton
                    size="small"
                    className={styles.backButton}
                    onClick={handleBack}
                    aria-label="Back"
                  >
                    <ArrowBackIcon className={styles.backIcon} />
                  </IconButton>
                </Tooltip>
              )}

              <Box className={styles.titleGroup}>
                {typeof activeTitle === 'string' ? (
                  <Typography variant="h6" component="h1" className={styles.title}>
                    {activeTitle}
                  </Typography>
                ) : (
                  activeTitle
                )}
                {activeSubtitle && (
                  typeof activeSubtitle === 'string' ? (
                    <Typography
                      variant="caption"
                      component="p"
                      className={styles.subtitle}
                    >
                      {activeSubtitle}
                    </Typography>
                  ) : (
                    activeSubtitle
                  )
                )}
              </Box>

              {/* Contextual dropdowns or custom left controls (e.g. Client Selector in CRM) */}
              {leftControls && (
                <Box className={styles.leftControls}>{leftControls}</Box>
              )}
            </Box>

            {/* Right: Page Navigation Shortcuts & Primary Actions */}
            <Box className={styles.subHeaderRight}>
              {!hideNavActions && (
                <Box className={styles.navActions}>
                  {navActions ? (
                    navActions
                  ) : (
                    <>
                      {isAdmin && (
                        <>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<SpeedIcon className={styles.navIcon} />}
                            onClick={() => navigate('/admin')}
                            className={`${styles.navButton} ${
                              activePage === 'dashboard'
                                ? styles.navButtonActive
                                : ''
                            }`}
                          >
                            Dispatch Board
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={
                              <EngineeringIcon className={styles.navIcon} />
                            }
                            onClick={() => navigate('/admin/technicians')}
                            className={`${styles.navButton} ${
                              activePage === 'technicians'
                                ? styles.navButtonActive
                                : ''
                            }`}
                          >
                            Technicians
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<GroupsIcon className={styles.navIcon} />}
                            onClick={() => navigate('/crm')}
                            className={`${styles.navButton} ${
                              activePage === 'crm' ? styles.navButtonActive : ''
                            }`}
                          >
                            Client CRM
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<PersonAddIcon className={styles.navIcon} />}
                            onClick={() => navigate('/admin/users')}
                            className={`${styles.navButton} ${
                              activePage === 'users' ? styles.navButtonActive : ''
                            }`}
                          >
                            Users
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </Box>
              )}

              {/* Primary Action Button (e.g., + NEW CLIENT, + ADD TECHNICIAN, etc.) */}
              {primaryAction && (
                <Box className={styles.primaryActionWrapper}>
                  {primaryAction}
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* ── 3. Main Body Content Area ── */}
        <Box
          component="main"
          key={location.pathname}
          className={`${styles.contentArea} ${
            noScroll
              ? hideSubHeader
                ? styles.contentAreaNoScrollFull
                : styles.contentAreaNoScroll
              : ''
          }`}
        >
          {children || <Outlet />}
        </Box>
      </Box>
    </AppLayoutContext.Provider>
  );
};

export default AppLayout;
