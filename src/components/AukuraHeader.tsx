import React from 'react';
import {
  Box,
  IconButton,
  Avatar,
  Tooltip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

export interface AukuraHeaderProps {
  onToggleSidebar?: () => void;
  activePill?: string;
  organizationName?: string;
  profileImageUrl?: string;
  profileAvatarInitials?: string;
  profileEmail?: string;
  profileName?: string;
  profileMenuOpen: boolean;
  setProfileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  profileMenuRef: React.RefObject<HTMLDivElement | null>;
  triggerId?: string;
  dropdownContent: React.ReactNode;
}

export const AukuraHeader: React.FC<AukuraHeaderProps> = ({
  profileImageUrl,
  profileAvatarInitials,
  profileEmail,
  profileName,
  profileMenuOpen,
  setProfileMenuOpen,
  profileMenuRef,
  triggerId = 'profile-menu-trigger',
  dropdownContent,
}) => {
  const navigate = useNavigate();

  return (
    <Box
      component="header"
      sx={{
        width: '100%',
        height: '48px',
        minHeight: '48px',
        bgcolor: '#1e293b',
        borderBottom: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: { xs: 2, sm: 2.5 },
        position: 'relative',
        zIndex: 1200,
        boxSizing: 'border-box',
        flexShrink: 0,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.18)',
      }}
    >
      {/* ── Far Left Area: Brand Logo Image ──────────────────────── */}
      <Box
        onClick={() => navigate('/admin')}
        sx={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <img
          src="/assets/logo.png"
          alt="Aukura Logo"
          className="h-8 w-auto object-contain"
          style={{
            height: '32px',
            width: 'auto',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </Box>

      <Box
        ref={profileMenuRef}
        sx={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        <Tooltip title={`Profile Account (${profileName ? `${profileName} - ` : ''}${profileEmail || 'User'})`} arrow>
          <IconButton
            id={triggerId}
            onClick={() => setProfileMenuOpen((prev) => !prev)}
            aria-label="Open user profile menu"
            aria-expanded={profileMenuOpen}
            aria-haspopup="menu"
            sx={{
              p: '2px',
              border: '2px solid #ffffff',
              bgcolor: '#ffffff',
              borderRadius: '50%',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                opacity: 0.92,
                boxShadow: '0 0 0 2px rgba(56, 189, 248, 0.4)',
              },
            }}
          >
            <Avatar
              src={profileImageUrl || undefined}
              alt={profileEmail ? `${profileEmail} profile` : 'User profile'}
              sx={{
                width: 28,
                height: 28,
                bgcolor: '#ffffff',
                color: '#1e293b',
                fontSize: '0.74rem',
                fontWeight: 700,
                letterSpacing: 0,
              }}
            >
              {!profileImageUrl ? (profileAvatarInitials) : null}
            </Avatar>
          </IconButton>
        </Tooltip>

        {/* Existing dropdown menu rendered seamlessly */}
        {profileMenuOpen && (
          <Box
            sx={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              zIndex: 1400,
            }}
          >
            {dropdownContent}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default AukuraHeader;
