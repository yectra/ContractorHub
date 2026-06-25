import { Box, Container, Typography, type BoxProps } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Link } from 'react-router-dom';

export const PageLayout = styled(Box)<BoxProps>(() => ({
  display: 'flex',
  flexDirection: 'row',
  minHeight: '100vh',
}));

export const LayoutContainer = styled(Box)<BoxProps>(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flexGrow: 1,
  marginLeft: 240,
  transition: 'margin-left 0.3s ease',
  minHeight: '100vh',
  '&.sidebar-collapsed': {
    marginLeft: 72,
  },
  [theme.breakpoints.down('md')]: {
    marginLeft: 0,
    '&.sidebar-collapsed': {
      marginLeft: 0,
    },
  },
}));

export const ContentLayout = styled(Box)<BoxProps>(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flexGrow: 1,
  padding: theme.spacing(2),
  maxWidth: '100vw',
  overflowX: 'clip',
}));

export const PageContainer = styled(Container)(({ theme }) => ({
  padding: `${theme.spacing(2)} 0`,
}));

export const PageHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: theme.spacing(2),
  gap: theme.spacing(2),
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
}));

export const PageContent = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2, 0),
}));

export const LogoWrapper = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
}));

export const LogoIcon = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

export const LogoText = styled(Typography)(({ theme }) => ({
  fontWeight: theme.typography.fontWeightBold,
  fontSize: theme.typography.h6.fontSize,
  margin: 0,
  color: theme.palette.getContrastText(theme.palette.appbar.main),
  textDecoration: 'none',
}));

export const SidebarContainer = styled(Box)<BoxProps>(({ theme }) => ({
  width: 240,
  background: `linear-gradient(180deg, ${theme.palette.appbar.main} 0%, ${theme.palette.appbar.light} 100%)`,
  position: 'fixed',
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  overflow: 'hidden',
  transition: 'width 0.3s ease',
  top: 0,
  left: 0,
  zIndex: 1101,
  [theme.breakpoints.down('md')]: {
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 9999,
    '&.collapsed': {
      display: 'none',
    },
  },
  '&.collapsed': {
    width: 72,
  },
}));

export const SidebarTop = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexShrink: 0,
  padding: theme.spacing(2),
  paddingRight: 0,
  marginBottom: theme.spacing(1),
}));

export const SidebarCollapseBtn = styled(Box)(({ theme }) => ({
  alignSelf: 'center',
  width: 24,
  height: 36,
  border: `1px solid ${theme.palette.divider}`,
  borderRight: 'none',
  borderTopLeftRadius: theme.shape.borderRadius,
  borderBottomLeftRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  boxShadow: theme.shadows[1],
  color: theme.palette.text.primary,
  transition: 'all 0.3s ease',
  zIndex: theme.zIndex.drawer + 2,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    boxShadow: theme.shadows[4],
  },
  '&.collapsed': {
    marginLeft: 'auto',
  },
}));

export const SidebarNav = styled(Box)(() => ({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  overflowX: 'hidden',
  '&::-webkit-scrollbar': { width: '4px' },
  '&::-webkit-scrollbar-track': { background: 'transparent' },
  '&::-webkit-scrollbar-thumb': {
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '4px',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: 'rgba(255,255,255,0.35)',
  },
  scrollbarWidth: 'thin',
  scrollbarColor: 'rgba(255,255,255,0.2) transparent',
}));

export const SidebarNavLink = styled(Link)(() => ({
  textDecoration: 'none',
  display: 'block',
}));

export const SidebarNavItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  alignItems: 'center',
  padding: theme.spacing(1, 2),
  cursor: 'pointer',
  color: theme.palette.getContrastText(theme.palette.appbar.main),
  transition: 'all 0.2s ease',
  borderRadius: 5,
  margin: theme.spacing(0.75, 1),
  '&:hover': {
    backgroundColor: theme.palette.appbar.light,
  },
  '&.active': {
    backgroundColor: theme.palette.appbar.dark,
  },
  '&.collapsed': {
    justifyContent: 'center',
  },
}));

export const SidebarIcon = styled(Box)(() => ({
  display: 'inline-flex',
  width: 22,
  height: 22,
  alignItems: 'center',
  justifyContent: 'center',
}));

export const SidebarNavLabel = styled(Typography)(({ theme }) => ({
  fontSize: theme.typography.body2.fontSize,
}));

export const SidebarFooter = styled(Box)(({ theme }) => ({
  flexShrink: 0,
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
}));

export const SidebarCard = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(1.5),
  boxShadow: theme.shadows[1],
}));

export const SidebarBottomLinks = styled(Box)(() => ({
  marginTop: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
}));

export const SidebarLink = styled(Link)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '8px',
  borderRadius: '8px',
  color: theme.palette.getContrastText(theme.palette.appbar.main),
  textDecoration: 'none',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: theme.palette.appbar.light,
  },
}));

export const DrawerHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  minHeight: theme.spacing(6),
}));

export const DrawerTitle = styled(Typography)(({ theme }) => ({
  margin: 0,
  fontSize: theme.typography.h4.fontSize,
  fontWeight: theme.typography.fontWeightMedium,
  color: theme.palette.text.primary,
}));

export const DrawerContent = styled(Box)<BoxProps>(({ theme }) => ({
  flex: 1,
  overflowY: 'auto',
  padding: theme.spacing(3),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}));

export const DrawerFooter = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.divider}`,
}));
