import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  IconButton,
  Modal,
  Switch,
  Checkbox,
  FormControlLabel,
  Card,
  CardContent,
  Snackbar,
  Alert,
  Tooltip,
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
} from '@mui/material';
import { useNavigate } from "react-router-dom";

// Icons
import SearchIcon from '@mui/icons-material/Search';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import EngineeringIcon from '@mui/icons-material/Engineering';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import KeyIcon from '@mui/icons-material/Key';
import PeopleIcon from '@mui/icons-material/People';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import SpeedIcon from '@mui/icons-material/Speed';
import styles from '../../styles/UI/UserManagement.module.scss';

import { technicianAPI } from '../../services/api';

// Types definition
interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'Technician' | 'Dispatcher';
  status: 'Active' | 'Inactive';
  devicePushToken: string | null;
  deviceType: 'iOS' | 'Android' | 'Web' | null;
  deviceRegisteredAt: string | null;
  permissions: string[];
  specialty?: 'Plumbing' | 'HVAC' | 'Electrical' | 'General';
  createdAt: string;
  updatedAt: string;
}

const PERMISSION_CATEGORIES = [
  {
    category: 'Dispatch Board',
    items: [
      { id: 'dispatch:view', label: 'View Schedule & Queue', desc: 'Allows viewing active technician schedule and unassigned queue' },
      { id: 'dispatch:edit', label: 'Assign & Edit Schedule', desc: 'Allows dragging jobs on timeline and reassigning technicians' },
      { id: 'dispatch:create', label: 'Create Service Requests', desc: 'Allows adding new jobs to the queue' }
    ]
  },
  {
    category: 'Client CRM',
    items: [
      { id: 'crm:view', label: 'View Client Records', desc: 'Allows reading client details, notes and service history' },
      { id: 'crm:edit', label: 'Create & Edit Clients', desc: 'Allows modifying profiles, balances, and preferences' },
      { id: 'crm:finance', label: 'Financial Records Access', desc: 'Allows viewing balance details and commercial invoicing history' }
    ]
  },
  {
    category: 'User Administration',
    items: [
      { id: 'users:manage', label: 'Create & Edit Users', desc: 'Allows adding technicians/dispatchers and changing details' },
      { id: 'users:permissions', label: 'Edit Fine-grained Permissions', desc: 'Allows override of system permission flags' }
    ]
  },
  {
    category: 'Push Notifications',
    items: [
      { id: 'notifications:receive', label: 'Register Device Token', desc: 'Allows mobile device token collection and background push sync' },
      { id: 'notifications:send', label: 'Send Push Notifications', desc: 'Allows broadcasting test alerts and dispatch pings to technicians' }
    ]
  }
];

const ROLE_PRESETS = {
  Technician: ['dispatch:view', 'crm:view', 'notifications:receive'],
  Dispatcher: [
    'dispatch:view',
    'dispatch:edit',
    'dispatch:create',
    'crm:view',
    'crm:edit',
    'crm:finance',
    'users:manage',
    'users:permissions',
    'notifications:send'
  ]
};

export default function UserManagement() {
  // Database States
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Modal States
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  
  // Form States
  const [formName, setFormName] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formRole, setFormRole] = useState<'Technician' | 'Dispatcher'>('Technician');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');
  const [formSpecialty, setFormSpecialty] = useState<'Plumbing' | 'HVAC' | 'Electrical' | 'General'>('General');
  const [formPermissions, setFormPermissions] = useState<string[]>(ROLE_PRESETS.Technician);

  // Push Token Viewer States
  const [tokenDialogOpen, setTokenDialogOpen] = useState<boolean>(false);
  const [tokenUser, setTokenUser] = useState<UserAccount | null>(null);
  const [testPushText, setTestPushText] = useState<string>('New service call assigned to your route.');
  const [sendingPush, setSendingPush] = useState<boolean>(false);

  // Real-time Push Notification Simulation State
  const [simulatedNotification, setSimulatedNotification] = useState<{
    open: boolean;
    title: string;
    message: string;
    device: string;
  } | null>(null);

  // Alert Notifications
  const [alert, setAlert] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const navigate = useNavigate();

  // Helper to trigger alert notifications
  const showSnackbar = useCallback(
    (message: string, severity: "success" | "error") => {
      setAlert({
        open: true,
        message,
        severity,
      });
    },
    []
  );

  useEffect(() => {
  const loadData = async () => {
    try {
      setLoading(true);

      // Get list of technicians from standard DB
      const techs = await technicianAPI.listTechnicians();

      // Check if users exist in LocalStorage
      const cachedUsersRaw = localStorage.getItem("mock_users");

      let initialUsers: UserAccount[] = [];

      if (cachedUsersRaw) {
        initialUsers = JSON.parse(cachedUsersRaw);
      } else {
        // Map existing technicians to users
        const mappedTechs: UserAccount[] = techs.map((t) => {
          const hasToken = t.id === "tech-1" || t.id === "tech-2";

          return {
            id: t.id!,
            name: t.name,
            email:
              t.email ??
              `${t.name.toLowerCase().replace(/\s+/g, "")}@contractorsaas.com`,
            phone: t.phone ?? "555-0100",
            role: "Technician",
            status: t.isAvailable ? "Active" : "Inactive",
            devicePushToken: hasToken
              ? `fcm-push-token-${t.id}-${Math.floor(
                  100000 + Math.random() * 900000
                )}`
              : null,
            deviceType: hasToken
              ? t.id === "tech-1"
                ? "iOS"
                : "Android"
              : null,
            deviceRegisteredAt: hasToken
              ? new Date(
                  Date.now() - 30 * 24 * 60 * 60 * 1000
                ).toISOString()
              : null,
            permissions: [...ROLE_PRESETS.Technician],

            // Remove `as any`
            specialty: t.specialty ?? "General",

            createdAt: t.createdAt ?? new Date().toISOString(),
            updatedAt: t.updatedAt ?? new Date().toISOString(),
          };
        });

        const defaultDispatchers: UserAccount[] = [
          {
            id: "disp-1",
            name: "Jane Doe",
            email: "jane@contractorsaas.com",
            phone: "555-9090",
            role: "Dispatcher",
            status: "Active",
            devicePushToken: "web-push-token-jane-8837190",
            deviceType: "Web",
            deviceRegisteredAt: new Date(
              Date.now() - 60 * 24 * 60 * 60 * 1000
            ).toISOString(),
            permissions: [...ROLE_PRESETS.Dispatcher],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: "disp-2",
            name: "Alex Rivera",
            email: "alex.rivera@contractorsaas.com",
            phone: "555-8080",
            role: "Dispatcher",
            status: "Active",
            devicePushToken: null,
            deviceType: null,
            deviceRegisteredAt: null,
            permissions: [...ROLE_PRESETS.Dispatcher],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];

        initialUsers = [...mappedTechs, ...defaultDispatchers];
        localStorage.setItem("mock_users", JSON.stringify(initialUsers));
      }

      setUsers(initialUsers);
    } catch (err) {
      console.error("Failed to load users:", err);
      showSnackbar("Error reading user records", "error");
    } finally {
      setLoading(false);
    }
  };

  loadData();
}, [showSnackbar]);

  // Save changes back to user DB and synchronize with Technician API
  const saveUsersList = async (updatedList: UserAccount[]) => {
    setUsers(updatedList);
    localStorage.setItem('mock_users', JSON.stringify(updatedList));
  };

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phone.includes(searchQuery);

      const matchRole = roleFilter === 'All' || u.role === roleFilter;
      const matchStatus = statusFilter === 'All' || u.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Statistics counters
  const stats = useMemo(() => {
    const total = users.length;
    const activeTechs = users.filter((u) => u.role === 'Technician' && u.status === 'Active').length;
    const activeDispatchers = users.filter((u) => u.role === 'Dispatcher' && u.status === 'Active').length;
    const registeredTokens = users.filter((u) => u.devicePushToken !== null).length;

    return { total, activeTechs, activeDispatchers, registeredTokens };
  }, [users]);

  // Initialize form for new user
  const handleOpenAddModal = () => {
    setSelectedUser(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormRole('Technician');
    setFormStatus('Active');
    setFormSpecialty('General');
    setFormPermissions([...ROLE_PRESETS.Technician]);
    setModalOpen(true);
  };

  // Initialize form for editing user
  const handleOpenEditModal = (user: UserAccount) => {
    setSelectedUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPhone(user.phone);
    setFormRole(user.role);
    setFormStatus(user.status);
    setFormSpecialty(user.specialty || 'General');
    setFormPermissions(user.permissions || []);
    setModalOpen(true);
  };

  // Trigger Role change preset check
  const handleRoleChange = (role: 'Technician' | 'Dispatcher') => {
    setFormRole(role);
    setFormPermissions([...ROLE_PRESETS[role]]);
  };

  // Handle permission checkbox change
  const handlePermissionToggle = (permissionId: string) => {
    setFormPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((p) => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  // Quick Activation/Deactivation Toggle
  const handleToggleStatus = async (user: UserAccount) => {
    const newStatus: 'Active' | 'Inactive' = user.status === 'Active' ? 'Inactive' : 'Active';
    const updated = users.map((u) => {
      if (u.id === user.id) {
        return { ...u, status: newStatus, updatedAt: new Date().toISOString() };
      }
      return u;
    });

    try {
      // If it is a technician, sync with Technician API
      if (user.role === 'Technician') {
        await technicianAPI.updateTechnician(user.id, {
          isAvailable: newStatus === 'Active',
        });
      }

      await saveUsersList(updated);
      showSnackbar(`${user.name} is now ${newStatus.toLowerCase()}`, 'success');
    } catch (err) {
      console.error(err);
      showSnackbar('Failed to toggle status', 'error');
    }
  };

  // Handle Create or Update User submission
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim() || !formEmail.trim() || !formPhone.trim()) {
      showSnackbar('Please fill all mandatory fields', 'error');
      return;
    }

    try {
      if (selectedUser) {
        // Edit Mode
        const updatedUser: UserAccount = {
          ...selectedUser,
          name: formName,
          email: formEmail,
          phone: formPhone,
          role: formRole,
          status: formStatus,
          specialty: formRole === 'Technician' ? formSpecialty : undefined,
          permissions: formPermissions,
          updatedAt: new Date().toISOString(),
        };

        // Sync with technician API if role is Technician
        if (formRole === 'Technician') {
          await technicianAPI.updateTechnician(selectedUser.id, {
            name: formName,
            email: formEmail,
            phone: formPhone,
            specialty: formSpecialty,
            isAvailable: formStatus === 'Active',
          });
        }

        const updated = users.map((u) => (u.id === selectedUser.id ? updatedUser : u));
        await saveUsersList(updated);
        showSnackbar('User account updated successfully', 'success');
      } else {
        // Create Mode
        let newId = '';
        if (formRole === 'Technician') {
          // Sync and create in Technician API first to get technician structure
          const createdTech = await technicianAPI.createTechnician({
            name: formName,
            email: formEmail,
            phone: formPhone,
            specialty: formSpecialty,
          });
          newId = createdTech.id!;
        } else {
          newId = `disp-${Math.floor(100 + Math.random() * 900)}`;
        }

        const newUser: UserAccount = {
          id: newId,
          name: formName,
          email: formEmail,
          phone: formPhone,
          role: formRole,
          status: formStatus,
          devicePushToken: null,
          deviceType: null,
          deviceRegisteredAt: null,
          permissions: formPermissions,
          specialty: formRole === 'Technician' ? formSpecialty : undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await saveUsersList([...users, newUser]);
        showSnackbar('New user account registered successfully', 'success');
      }

      setModalOpen(false);
    } catch (err) {
      console.error(err);
      showSnackbar('Error saving account changes', 'error');
    }
  };

  // Quick Register Push Token simulation (to make it easy to demonstrate registered tokens)
  const handleSimulateRegisterToken = async (user: UserAccount) => {
    const generatedToken = `fcm-push-token-${user.id}-${Math.floor(100000 + Math.random() * 900000)}`;
    const randomOS: 'iOS' | 'Android' | 'Web' = user.role === 'Technician' ? (Math.random() > 0.5 ? 'iOS' : 'Android') : 'Web';
    
    const updated = users.map((u) => {
      if (u.id === user.id) {
        return {
          ...u,
          devicePushToken: generatedToken,
          deviceType: randomOS,
          deviceRegisteredAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      return u;
    });

    await saveUsersList(updated);
    showSnackbar(`Simulated push device token registered for ${user.name}`, 'success');
  };

  // Simulate Sending push notification
  const handleSendTestPush = () => {
    if (!tokenUser || !tokenUser.devicePushToken) return;

    const pushToken = tokenUser.devicePushToken;
    const deviceType = tokenUser.deviceType || 'Mobile';
    const userName = tokenUser.name;

    setSendingPush(true);
    setTimeout(() => {
      setSendingPush(false);
      setTokenDialogOpen(false);
      showSnackbar('Push notification dispatched successfully!', 'success');

      // Trigger sliding toast visual notification representation
      setSimulatedNotification({
        open: true,
        title: `🔔 PUSH RECEIVED: ${userName}'s Device`,
        message: testPushText,
        device: `${deviceType} (${pushToken.substring(0, 15)}...)`,
      });

      // Auto dismiss push simulation after 6 seconds
      setTimeout(() => {
        setSimulatedNotification(null);
      }, 6000);
    }, 1200);
  };

  // Get initials for Avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Render visual Avatar colors based on user index
  const getAvatarColor = (role: string) => {
    return role === 'Dispatcher' ? '#ff9800' : '#2563eb';
  };

  return (
    <Box className={styles.userboardRoot}>
      {/* Header Status Bar */}
      <Box className={styles.userHeader} component="header">
        <Box className={styles.userHeaderContent}>
          <Box className={styles.userHeaderLeft}>
            <IconButton
              className={styles.userBackButton}
              onClick={() => navigate(-1)}
              aria-label="Back to dashboard"
            >
              <ArrowBackIcon className={styles.userBackIcon} />
            </IconButton>
            <Box>
              <Typography variant="h5" className={styles.userManagementTitle}>
                User Account Management
              </Typography>
              <Typography variant="caption" className={styles.userManagementSubtitle}>
                Admin Portal / Technicians and Dispatchers Directory
              </Typography>
            </Box>
          </Box>

          {/* Top navigation shortcuts */}
          <Box className={styles.userManagementNavActions}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<SpeedIcon className={styles.userManagementNavIcon} />}
              onClick={() => (window.location.href = '/')}
              className={styles.userManagementNavButton}
            >
              Dispatch Board
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<PeopleIcon className={styles.userManagementNavIcon} />}
              onClick={() => (window.location.href = '/crm')}
              className={styles.userManagementNavButton}
            >
              CRM Record
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Main Container */}
      <Box className={styles.statsContainer}>
        {/* STATS OVERVIEW CARDS */}
        <Box className={styles.statsGrid}>
          {/* Card 1: Total Users */}
          <Card className={`${styles.statsCard} ${styles.totalUsers}`}>
            <CardContent className={styles.cardContent}>
              <Box className={styles.cardHeader}>
                <Typography className={styles.cardTitle}>
                  Total Managed Accounts
                </Typography>
                <PeopleIcon className={styles.cardIcon} />
              </Box>
              <Typography className={styles.cardValue}>
                {stats.total}
              </Typography>
              <Typography className={styles.cardDescription}>
                Registered staff profile records
              </Typography>
            </CardContent>
          </Card>

          {/* Card 2: Active Techs */}
          <Card className={`${styles.statsCard} ${styles.activeTechs}`}>
            <CardContent className={styles.cardContent}>
              <Box className={styles.cardHeader}>
                <Typography className={styles.cardTitle}>
                  Active Technicians
                </Typography>
                <EngineeringIcon className={styles.cardIcon} />
              </Box>
              <Typography className={styles.cardValue}>
                {stats.activeTechs}
              </Typography>
              <Typography className={styles.cardDescription}>
                Technicians available for timeline jobs
              </Typography>
            </CardContent>
          </Card>

          {/* Card 3: Active Dispatchers */}
          <Card className={`${styles.statsCard} ${styles.activeDispatchers}`}>
            <CardContent className={styles.cardContent}>
              <Box className={styles.cardHeader}>
                <Typography className={styles.cardTitle}>
                  Active Dispatchers
                </Typography>
                <AdminPanelSettingsIcon className={styles.cardIcon} />
              </Box>
              <Typography className={styles.cardValue}>
                {stats.activeDispatchers}
              </Typography>
              <Typography className={styles.cardDescription}>
                Admin accounts with system access
              </Typography>
            </CardContent>
          </Card>

          {/* Card 4: Registered Tokens */}
          <Card className={`${styles.statsCard} ${styles.registeredTokens}`}>
            <CardContent className={styles.cardContent}>
              <Box className={styles.cardHeader}>
                <Typography className={styles.cardTitle}>
                  Push Registered Devices
                </Typography>
                <SmartphoneIcon className={styles.cardIcon} />
              </Box>
              <Typography className={styles.cardValue}>
                {stats.registeredTokens}
              </Typography>
              <Typography className={styles.cardDescription}>
                Live mobile push-notification setups
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* CONTROLS AND DIRECTORY GRID */}
        <Paper className={styles.dataPaper}>
          {/* Controls Bar */}
          <Box className={styles.controlsBar}>
            <Box className={styles.controlsGrid}>
              <Box>
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  placeholder="Search name, email, or phone number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" className={styles.searchIcon} />
                        </InputAdornment>
                      ),
                    }
                  }}
                  className={styles.searchField}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      height: 34,
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                    },
                    '& .MuiInputBase-input': {
                      py: 0,
                      height: '34px',
                      boxSizing: 'border-box',
                    },
                    '& .MuiInputAdornment-root': {
                      mr: 0.5,
                    },
                  }}
                />
              </Box>

              <Box>
                <FormControl fullWidth size="small" className={styles.filterControl}>
                  <InputLabel
                    id="role-filter-label"
                    className={styles.filterLabel}>
                    Filter Role
                  </InputLabel>
                  <Select
                    labelId="role-filter-label"
                    value={roleFilter}
                    label="Filter Role"
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className={styles.filterSelect}>
                    <MenuItem value="All">All Roles</MenuItem>
                    <MenuItem value="Technician">Technicians</MenuItem>
                    <MenuItem value="Dispatcher">Dispatchers</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box>
                <FormControl fullWidth size="small" className={styles.filterControl}>
                  <InputLabel
                    id="status-filter-label"
                    className={styles.filterLabel}
                  >
                    Filter Status
                  </InputLabel>
                  <Select
                    labelId="status-filter-label"
                    value={statusFilter}
                    label="Filter Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={styles.filterSelect}
                  >
                    <MenuItem value="All">All Statuses</MenuItem>
                    <MenuItem value="Active">Active Accounts</MenuItem>
                    <MenuItem value="Inactive">Inactive Accounts</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box className={styles.createButtonContainer}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<PersonAddIcon />}
                  onClick={handleOpenAddModal}
                  className={styles.createButton}
                >
                  Create User
                </Button>
              </Box>
            </Box>
          </Box>

          {/* Users List Table */}
          <TableContainer>
            {loading ? (
              <Box className={styles.loadingState}>
                <CircularProgress size={28} />
                <Typography className={styles.loadingText}>
                  Loading user registry directory...
                </Typography>
              </Box>
            ) : filteredUsers.length === 0 ? (
              <Box className={styles.emptyState}>
                <Typography className={styles.emptyStateTitle}>
                  No accounts found matching search filters
                </Typography>
                <Typography className={styles.emptyStateDescription}>
                  Try adjusting your text search terms or modifying the role/status filter settings.
                </Typography>
              </Box>
            ) : (
              <Table 
                sx={{
                  minWidth: 760,
                  '& .MuiTableCell-root': {
                    px: 1.5,
                    borderBottomColor: '#eef2f7',
                  },
                  '& .MuiChip-root': {
                    height: 22,
                    borderRadius: '6px',
                    fontSize: '0.66rem',
                  },
                  '& .MuiChip-label': {
                    px: 0.75,
                  },
                  '& .MuiChip-icon': {
                    ml: 0.5,
                    mr: -0.25,
                  },
                }}
              >
                <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.66rem', py: 0.9 }}>USER NAME & CONTACT</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.66rem', py: 0.9 }}>ROLE</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.66rem', py: 0.9 }}>SPECIALTY</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.66rem', py: 0.9 }}>STATUS</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.66rem', py: 0.9 }}>DEVICE PUSH TOKEN</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#475569', fontSize: '0.66rem', py: 0.9 }}>ACTIONS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const isRegistered = user.devicePushToken !== null;
                    return (
                      <TableRow key={user.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        {/* Column 1: User & Avatar */}
                        <TableCell sx={{ py: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar
                              sx={{
                                bgcolor: getAvatarColor(user.role),
                                width: 30,
                                height: 30,
                                fontSize: '0.72rem',
                              }}
                            >
                              {getInitials(user.name)}
                            </Avatar>
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.82rem', lineHeight: 1.2 }}>
                                  {user.name}
                                </Typography>
                                {user.status === 'Active' && (
                                  <Tooltip title="Online/Active Profile">
                                    <Box
                                      sx={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: '50%',
                                        bgcolor: '#22c55e',
                                        boxShadow: '0 0 0 1px rgba(34, 197, 94, 0.4)',
                                        animation: 'pulse 1.5s infinite',
                                        '@keyframes pulse': {
                                          '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(34, 197, 94, 0.7)' },
                                          '70%': { transform: 'scale(1)', boxShadow: '0 0 0 4px rgba(34, 197, 94, 0)' },
                                          '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(34, 197, 94, 0)' },
                                        },
                                      }}
                                    />
                                  </Tooltip>
                                )}
                              </Box>
                              <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.68rem', lineHeight: 1.2 }}>
                                {user.email} • {user.phone}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>

                        {/* Column 2: Role */}
                        <TableCell sx={{ py: 1 }}>
                          {user.role === 'Dispatcher' ? (
                            <Chip
                              icon={<AdminPanelSettingsIcon style={{ fontSize: '11px', color: '#b45309' }} />}
                              label="Dispatcher"
                              size="small"
                              sx={{
                                bgcolor: '#fef3c7',
                                color: '#b45309',
                                fontWeight: 700,
                                border: '1px solid #fde68a',
                              }}
                            />
                          ) : (
                            <Chip
                              icon={<EngineeringIcon style={{ fontSize: '11px', color: '#1d4ed8' }} />}
                              label="Technician"
                              size="small"
                              sx={{
                                bgcolor: '#dbeafe',
                                color: '#1d4ed8',
                                fontWeight: 700,
                                border: '1px solid #bfdbfe',
                              }}
                            />
                          )}
                        </TableCell>

                        {/* Column 3: Specialty */}
                        <TableCell sx={{ py: 1 }}>
                          {user.role === 'Technician' ? (
                            <Typography variant="body2" sx={{ fontWeight: 550, color: '#334155', fontSize: '0.74rem' }}>
                              {user.specialty || 'General'}
                            </Typography>
                          ) : (
                            <Typography variant="caption" sx={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.68rem' }}>
                              Not Applicable
                            </Typography>
                          )}
                        </TableCell>

                        {/* Column 4: Status Badge */}
                        <TableCell sx={{ py: 1 }}>
                          {user.status === 'Active' ? (
                            <Chip
                              label="Active"
                              size="small"
                              sx={{
                                bgcolor: '#ecfdf5',
                                color: '#047857',
                                fontWeight: 700,
                                border: '1px solid #a7f3d0',
                              }}
                            />
                          ) : (
                            <Chip
                              label="Inactive"
                              size="small"
                              sx={{
                                bgcolor: '#f1f5f9',
                                color: '#64748b',
                                fontWeight: 700,
                                border: '1px solid #e2e8f0',
                              }}
                            />
                          )}
                        </TableCell>

                        {/* Column 5: Push Token Badge */}
                        <TableCell sx={{ py: 1 }}>
                          {isRegistered ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Chip
                                label={`Registered (${user.deviceType})`}
                                size="small"
                                sx={{
                                  bgcolor: '#eff6ff',
                                  color: '#2563eb',
                                  fontWeight: 700,
                                  border: '1px solid #dbeafe',
                                }}
                              />
                              <Tooltip title="View Token Detail & Test Notification" arrow>
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setTokenUser(user);
                                    setTokenDialogOpen(true);
                                  }}
                                  sx={{
                                    width: 24,
                                    height: 24,
                                    p: 0,
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    color: '#2563eb',
                                    '&:hover': { backgroundColor: '#eff6ff' },
                                  }}
                                >
                                  <KeyIcon style={{ fontSize: '13px' }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Chip
                                label="Not Registered"
                                size="small"
                                sx={{
                                  bgcolor: '#fff1f2',
                                  color: '#be123c',
                                  fontWeight: 700,
                                  border: '1px solid #ffe4e6',
                                }}
                              />
                              <Tooltip title="Simulate Push Device Registration" arrow>
                                <Button
                                  variant="text"
                                  size="small"
                                  onClick={() => handleSimulateRegisterToken(user)}
                                  sx={{
                                    textTransform: 'none',
                                    fontSize: '0.66rem',
                                    fontWeight: 700,
                                    p: 0,
                                    minWidth: 0,
                                    color: '#be123c',
                                    textDecoration: 'underline',
                                    '&:hover': { backgroundColor: 'transparent', color: '#9f1239' },
                                  }}
                                >
                                  Register
                                </Button>
                              </Tooltip>
                            </Box>
                          )}
                        </TableCell>

                        {/* Column 6: Actions buttons */}
                        <TableCell align="right" sx={{ py: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                            <Tooltip title="Edit Profile Details" arrow>
                              <IconButton
                                size="small"
                                onClick={() => handleOpenEditModal(user)}
                                sx={{
                                  width: 26,
                                  height: 26,
                                  p: 0,
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '6px',
                                  color: '#475569',
                                  '&:hover': { backgroundColor: '#f1f5f9' },
                                }}
                              >
                                <EditIcon fontSize="inherit" />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title={user.status === 'Active' ? 'Deactivate Account' : 'Activate Account'} arrow>
                              <IconButton
                                size="small"
                                color={user.status === 'Active' ? 'error' : 'success'}
                                onClick={() => handleToggleStatus(user)}
                                sx={{
                                  width: 34,
                                  height: 26,
                                  p: 0,
                                  border: '1px solid',
                                  borderColor: user.status === 'Active' ? '#fecaca' : '#a7f3d0',
                                  borderRadius: '6px',
                                  backgroundColor: user.status === 'Active' ? '#fef2f2' : '#f0fdf4',
                                  '&:hover': {
                                    backgroundColor: user.status === 'Active' ? '#fee2e2' : '#dcfce7',
                                  },
                                }}
                              >
                                <Switch
                                  checked={user.status === 'Active'}
                                  size="small"
                                  color={user.status === 'Active' ? 'success' : 'default'}
                                  sx={{ pointerEvents: 'none', transform: 'scale(0.74)' }}
                                />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </TableContainer>
        </Paper>
      </Box>

      {/* CREATE & EDIT ACCOUNT MODAL */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        aria-labelledby="user-modal-title"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Box
          component="form"
          onSubmit={handleSubmitForm}
          sx={{
            bgcolor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            width: '100%',
            maxWidth: '750px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Modal Header */}
          <Box
            sx={{
              p: 2.5,
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography id="user-modal-title" variant="h6" sx={{ fontWeight: 800, color: '#1e293b' }}>
              {selectedUser ? `Modify Account: ${selectedUser.name}` : 'Register New User Account'}
            </Typography>
            <Chip
              label={selectedUser ? 'Edit Profile' : 'New Creation'}
              size="small"
              color={selectedUser ? 'primary' : 'success'}
              sx={{ fontWeight: 700 }}
            />
          </Box>

          {/* Modal Body (Scrollable) */}
          <Box sx={{ p: 3, overflowY: 'auto', flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 750, color: '#475569', mb: 2, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
              1. Basic Account Information
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2.5,
                mb: 4,
              }}
            >
              <TextField
                fullWidth
                label="Full Name"
                required
                placeholder="e.g. John Doe"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
              />

              <TextField
                fullWidth
                label="Email Address"
                type="email"
                required
                placeholder="e.g. john@contractorsaas.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
              />

              <TextField
                fullWidth
                label="Phone Number"
                required
                placeholder="e.g. 555-0199"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
              />

              <FormControl fullWidth>
                <InputLabel id="modal-role-label">System Role</InputLabel>
                <Select
                  labelId="modal-role-label"
                  value={formRole}
                  label="System Role"
                  onChange={(e) => handleRoleChange(e.target.value)}
                  sx={{ borderRadius: '8px' }}
                >
                  <MenuItem value="Technician">Technician (Field Execution)</MenuItem>
                  <MenuItem value="Dispatcher">Dispatcher (Administrative / Board)</MenuItem>
                </Select>
              </FormControl>

              {formRole === 'Technician' && (
                <FormControl fullWidth>
                  <InputLabel id="modal-specialty-label">Trade Specialty</InputLabel>
                  <Select
                    labelId="modal-specialty-label"
                    value={formSpecialty}
                    label="Trade Specialty"
                    onChange={(e) => setFormSpecialty(e.target.value)}
                    sx={{ borderRadius: '8px' }}
                  >
                    <MenuItem value="Plumbing">Plumbing</MenuItem>
                    <MenuItem value="HVAC">HVAC</MenuItem>
                    <MenuItem value="Electrical">Electrical</MenuItem>
                    <MenuItem value="General">General Trade</MenuItem>
                  </Select>
                </FormControl>
              )}

              <Box
                sx={{
                  gridColumn: formRole === 'Technician' ? 'span 1' : { xs: 'span 1', sm: 'span 2' },
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={formStatus === 'Active'}
                      onChange={(e) => setFormStatus(e.target.checked ? 'Active' : 'Inactive')}
                      color="success"
                    />
                  }
                  label={
                    <Box sx={{ ml: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>
                        Account Status: {formStatus}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                        Inactive accounts are restricted from accessing system utilities
                      </Typography>
                    </Box>
                  }
                />
              </Box>
            </Box>

            {/* PERMISSIONS GRID MATRIX */}
            <Divider sx={{ mb: 3 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 750, color: '#475569', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                2. Fine-grained Access Permissions
              </Typography>
              <Button
                variant="text"
                size="small"
                onClick={() => setFormPermissions([...ROLE_PRESETS[formRole]])}
                sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.72rem' }}
              >
                Reset to {formRole} Presets
              </Button>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 3,
              }}
            >
              {PERMISSION_CATEGORIES.map((cat) => (
                <Card key={cat.category} variant="outlined" sx={{ borderRadius: '10px', height: '100%' }}>
                  <Box sx={{ px: 2, py: 1.2, backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155', fontSize: '0.8rem' }}>
                      {cat.category}
                    </Typography>
                  </Box>
                  <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {cat.items.map((item) => (
                      <FormControlLabel
                        key={item.id}
                        control={
                          <Checkbox
                            checked={formPermissions.includes(item.id)}
                            onChange={() => handlePermissionToggle(item.id)}
                            size="small"
                          />
                        }
                        label={
                          <Box sx={{ ml: 0.2 }}>
                            <Typography variant="body2" sx={{ fontWeight: 650, color: '#334155', fontSize: '0.8rem' }}>
                              {item.label}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontSize: '0.72rem', mt: 0.1, lineHeight: 1.3 }}>
                              {item.desc}
                            </Typography>
                          </Box>
                        }
                        sx={{ alignItems: 'flex-start', margin: 0, '& .MuiCheckbox-root': { pt: '2px' } }}
                      />
                    ))}
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>

          {/* Modal Actions */}
          <Box
            sx={{
              p: 2.5,
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 1.5,
            }}
          >
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={() => setModalOpen(false)}
              sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 600, color: '#475569', borderColor: '#cbd5e1' }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              type="submit"
              startIcon={<SaveIcon />}
              sx={{
                textTransform: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                backgroundColor: '#2563eb',
                '&:hover': { backgroundColor: '#1d4ed8' },
              }}
            >
              Save Profile
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* PUSH TOKEN DETAILED DIALOG & TESTER */}
      <Dialog
        open={tokenDialogOpen}
        onClose={() => setTokenDialogOpen(false)}
        aria-labelledby="token-dialog-title"
        sx={{ '& .MuiDialog-paper': { borderRadius: '12px', width: '100%', maxWidth: '520px' } }}
      >
        <DialogTitle id="token-dialog-title" sx={{ fontWeight: 800, color: '#0f172a', py: 2 }}>
          Push Device Token Details
        </DialogTitle>
        <DialogContent sx={{ pb: 3 }}>
          {tokenUser && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box sx={{ bgcolor: '#f8fafc', p: 2, borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 1 }}>
                  Registered Device Token Link
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <SmartphoneIcon sx={{ color: '#2563eb' }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                      {tokenUser.deviceType} Registered Client Device
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      Registered: {tokenUser.deviceRegisteredAt ? new Date(tokenUser.deviceRegisteredAt).toLocaleString() : 'N/A'}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ position: 'relative' }}>
                  <textarea
                    readOnly
                    value={tokenUser.devicePushToken || ''}
                    style={{
                      width: '100%',
                      minHeight: '60px',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#475569',
                      fontFamily: 'Courier New, monospace',
                      fontSize: '0.75rem',
                      outline: 'none',
                      resize: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </Box>
              </Box>

              <Divider />

              {/* TEST NOTIFICATION FORM */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 750, color: '#475569', mb: 1.5 }}>
                  Simulate Live Test Push Notification
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.78rem', mb: 2 }}>
                  Send a push notification broadcast directly to this registered push handle token. You can verify it instantly via the simulated floating pop-up.
                </Typography>

                <TextField
                  fullWidth
                  label="Notification Alert Body"
                  variant="outlined"
                  size="small"
                  value={testPushText}
                  onChange={(e) => setTestPushText(e.target.value)}
                  sx={{ mb: 2.5, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                />

                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  onClick={handleSendTestPush}
                  disabled={sendingPush || !testPushText.trim()}
                  startIcon={sendingPush ? <CircularProgress size={16} color="inherit" /> : <NotificationsIcon />}
                  sx={{
                    textTransform: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    py: 1.2,
                    backgroundColor: '#2563eb',
                    '&:hover': { backgroundColor: '#1d4ed8' },
                  }}
                >
                  {sendingPush ? 'Broadcasting Alert Payload...' : 'Dispatch Test Push payload'}
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0, justifyContent: 'flex-end' }}>
          <Button
            onClick={() => setTokenDialogOpen(false)}
            variant="outlined"
            sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 600, color: '#475569', borderColor: '#cbd5e1' }}
          >
            Close Dialog
          </Button>
        </DialogActions>
      </Dialog>

      {/* SNAPBAR ALERTS */}
      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() => setAlert((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert
          onClose={() => setAlert((prev) => ({ ...prev, open: false }))}
          severity={alert.severity}
          sx={{ width: '100%', borderRadius: '8px' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>

      {/* FLOATING REAL-TIME PUSH NOTIFICATION SIMULATOR TOAST */}
      {simulatedNotification && (
        <Box
          sx={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 1000,
            maxWidth: '380px',
            width: '100%',
            animation: 'slideIn 0.3s ease-out',
            '@keyframes slideIn': {
              '0%': { transform: 'translateY(100px) scale(0.9)', opacity: 0 },
              '100%': { transform: 'translateY(0) scale(1)', opacity: 1 },
            },
          }}
        >
          <Paper
            elevation={8}
            sx={{
              p: 2,
              borderRadius: '12px',
              border: '2px solid #2563eb',
              backgroundColor: '#ffffff',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15), 0 10px 10px -5px rgba(0,0,0,0.1)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top ringing bar animation */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '4px',
                backgroundColor: '#2563eb',
              }}
            />
            
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', pt: 0.5 }}>
              <Avatar
                sx={{
                  bgcolor: '#eff6ff',
                  color: '#2563eb',
                  width: 36,
                  height: 36,
                  animation: 'ring 1s infinite alternate',
                  '@keyframes ring': {
                    '0%': { transform: 'rotate(-10deg)' },
                    '100%': { transform: 'rotate(10deg)' },
                  },
                }}
              >
                <NotificationsIcon style={{ fontSize: '20px' }} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e293b', fontSize: '0.85rem' }}>
                    {simulatedNotification.title}
                  </Typography>
                  <Chip
                    label="Push Delivered"
                    size="small"
                    color="success"
                    sx={{ height: '16px', '& .MuiChip-label': { px: 1, fontSize: '0.62rem', fontWeight: 900 } }}
                  />
                </Box>
                
                <Typography variant="body2" sx={{ color: '#334155', fontSize: '0.8rem', mt: 0.8, fontWeight: 550, lineHeight: 1.4 }}>
                  "{simulatedNotification.message}"
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', mt: 1.2 }}>
                  <SmartphoneIcon style={{ fontSize: '11px', color: '#64748b' }} />
                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', fontWeight: 600 }}>
                    Handle: {simulatedNotification.device}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );
}
