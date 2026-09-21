/* eslint-disable react-hooks/purity */
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
  Card,
  CardContent,
  Snackbar,
  Alert,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EngineeringIcon from '@mui/icons-material/Engineering';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SpeedIcon from '@mui/icons-material/Speed';
import PeopleIcon from '@mui/icons-material/People';
import HandymanIcon from '@mui/icons-material/Handyman';
import EventNoteIcon from '@mui/icons-material/EventNote';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';

import styles from '../styles/UI/TechnicianManagement.module.scss';
import { technicianAPI, scheduledJobAPI } from '../services/api';
import type { Schema } from '../../amplify/data/resource';

export type TechnicianSpecialty = 'Plumbing' | 'HVAC' | 'Electrical' | 'General';

export interface TechnicianRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialty: TechnicianSpecialty;
  isAvailable: boolean;
  color: string;
  avatar: string;
  createdAt?: string;
  updatedAt?: string;
}

const COLOR_PRESETS = [
  { label: 'Blue', hex: '#2563eb' },
  { label: 'Teal', hex: '#0d9488' },
  { label: 'Green', hex: '#16a34a' },
  { label: 'Purple', hex: '#7c3aed' },
  { label: 'Amber', hex: '#d97706' },
  { label: 'Rose', hex: '#e11d48' },
  { label: 'Indigo', hex: '#4f46e5' },
  { label: 'Cyan', hex: '#0891b2' },
];

const INITIAL_FORM_STATE: {
  name: string;
  email: string;
  phone: string;
  specialty: TechnicianSpecialty;
  isAvailable: boolean;
  color: string;
} = {
  name: '',
  email: '',
  phone: '',
  specialty: 'General',
  isAvailable: true,
  color: '#2563eb',
};

export default function TechnicianManagement() {
  const navigate = useNavigate();

  // Live Data States
  const [technicians, setTechnicians] = useState<TechnicianRecord[]>([]);
  const [scheduledJobs, setScheduledJobs] = useState<Schema['ScheduledJob']['type'][]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Modal / Form States
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingTech, setEditingTech] = useState<TechnicianRecord | null>(null);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [formErrors, setFormErrors] = useState<{ name?: string; email?: string; phone?: string }>({});
  const [formTouched, setFormTouched] = useState<{ name?: boolean; email?: boolean; phone?: boolean }>({});
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Delete Confirmation Dialog States
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [techToDelete, setTechToDelete] = useState<TechnicianRecord | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Alert Snackbar State
  const [alert, setAlert] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const showSnackbar = useCallback((message: string, severity: 'success' | 'error' | 'info' = 'success') => {
    setAlert({ open: true, message, severity });
  }, []);

  // Compute initials for Avatar
  const getInitials = (nameStr: string) => {
    const trimmed = nameStr.trim();
    if (!trimmed) return 'T';
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return trimmed.substring(0, 2).toUpperCase();
  };

  // Sync with mock_users cache for global consistency across pages
  const syncWithMockUsersCache = useCallback((updatedTechs: TechnicianRecord[]) => {
    try {
      const cachedUsersRaw = localStorage.getItem('mock_users');
      if (cachedUsersRaw) {
        const usersList: Array<{ id: string; role?: string; [key: string]: unknown }> = JSON.parse(cachedUsersRaw);
        // Keep dispatchers intact, and sync technicians
        const nonTechs = usersList.filter((u) => u.role !== 'Technician');
        const mappedTechs = updatedTechs.map((t) => ({
          id: t.id,
          name: t.name,
          email: t.email,
          phone: t.phone,
          role: 'Technician' as const,
          status: t.isAvailable ? ('Active' as const) : ('Inactive' as const),
          devicePushToken: null,
          deviceType: null,
          deviceRegisteredAt: null,
          permissions: ['dispatch:view', 'crm:view', 'notifications:receive'],
          specialty: t.specialty,
          createdAt: t.createdAt || new Date().toISOString(),
          updatedAt: t.updatedAt || new Date().toISOString(),
        }));
        localStorage.setItem('mock_users', JSON.stringify([...mappedTechs, ...nonTechs]));
      }
    } catch (err) {
      console.error('Failed to sync mock_users cache:', err);
    }
  }, []);

  // Real-time Subscriptions for live AWS Amplify data binding
  useEffect(() => {
    setLoading(true);

    // Observe Technicians
    const unsubTechs = technicianAPI.observeTechnicians(
      (data) => {
        const mapped: TechnicianRecord[] = (data || []).map((t) => ({
          id: t.id!,
          name: t.name || 'Unnamed Technician',
          email: t.email || `${t.name?.toLowerCase().replace(/\s+/g, '') || 'tech'}@contractorsaas.com`,
          phone: t.phone || '555-0100',
          specialty: (t.specialty as TechnicianSpecialty) || 'General',
          isAvailable: t.isAvailable ?? true,
          color: t.color || '#2563eb',
          avatar: t.avatar || getInitials(t.name || 'T'),
          createdAt: t.createdAt || new Date().toISOString(),
          updatedAt: t.updatedAt || new Date().toISOString(),
        }));
        setTechnicians(mapped);
        setLoading(false);
      },
      (err) => {
        console.error('Failed to subscribe to technicians:', err);
        showSnackbar('Error reading live technician records', 'error');
        setLoading(false);
      }
    );

    // Observe Scheduled Jobs
    const unsubJobs = scheduledJobAPI.observeScheduledJobs(
      (jobs) => {
        setScheduledJobs(jobs || []);
      },
      (err) => {
        console.error('Failed to subscribe to scheduled jobs:', err);
      }
    );

    return () => {
      unsubTechs.unsubscribe();
      unsubJobs.unsubscribe();
    };
  }, [showSnackbar]);

  // Dynamic Statistics Calculations for Summary Stat Tiles
  const stats = useMemo(() => {
    const total = technicians.length;
    const activeTechs = technicians.filter((t) => t.isAvailable).length;
    const distinctSpecialties = new Set(technicians.map((t) => t.specialty).filter(Boolean));
    const uniqueSpecialties = distinctSpecialties.size;

    return {
      total,
      activeTechs,
      uniqueSpecialties,
    };
  }, [technicians]);

  // Scheduled Jobs lookup by Technician ID
  const jobsCountByTech = useMemo(() => {
    const map = new Map<string, number>();
    scheduledJobs.forEach((job) => {
      if (job.techId) {
        map.set(job.techId, (map.get(job.techId) || 0) + 1);
      }
    });
    return map;
  }, [scheduledJobs]);

  // Unique specialty list for dropdown selector
  const availableSpecialties = useMemo(() => {
    const defaultList: TechnicianSpecialty[] = ['General', 'Plumbing', 'HVAC', 'Electrical'];
    const dynamicList = technicians.map((t) => t.specialty).filter(Boolean);
    return Array.from(new Set([...defaultList, ...dynamicList]));
  }, [technicians]);

  // Filtered Technicians Matrix
  const filteredTechnicians = useMemo(() => {
    return technicians.filter((tech) => {
      const query = searchQuery.trim().toLowerCase();
      const matchSearch =
        !query ||
        tech.name.toLowerCase().includes(query) ||
        tech.email.toLowerCase().includes(query) ||
        tech.specialty.toLowerCase().includes(query) ||
        tech.phone.toLowerCase().includes(query);

      const matchSpecialty = specialtyFilter === 'All' || tech.specialty === specialtyFilter;
      const statusStr = tech.isAvailable ? 'Active' : 'Inactive';
      const matchStatus = statusFilter === 'All' || statusStr === statusFilter;

      return matchSearch && matchSpecialty && matchStatus;
    });
  }, [technicians, searchQuery, specialtyFilter, statusFilter]);

  // Validation helper
  const validateField = (field: 'name' | 'email' | 'phone', value: string) => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'Technician name is required.';
        if (value.trim().length < 2) return 'Name must be at least 2 characters.';
        return undefined;
      case 'email':
        if (!value.trim()) return 'Email address is required.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Please enter a valid email address.';
        return undefined;
      case 'phone':
        if (!value.trim()) return 'Phone number is required.';
        if (value.replace(/[^\d]/g, '').length < 7) return 'Please enter a valid phone number (min 7 digits).';
        return undefined;
      default:
        return undefined;
    }
  };

  const handleFormChange = (field: 'name' | 'email' | 'phone', value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formTouched[field]) {
      const err = validateField(field, value);
      setFormErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  const handleFormBlur = (field: 'name' | 'email' | 'phone') => {
    setFormTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, formData[field]);
    setFormErrors((prev) => ({ ...prev, [field]: err }));
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingTech(null);
    setFormData(INITIAL_FORM_STATE);
    setFormErrors({});
    setFormTouched({});
    setModalOpen(true);
  };

  // Open Edit Modal pre-populated with technician data
  const handleOpenEditModal = (tech: TechnicianRecord) => {
    setEditingTech(tech);
    setFormData({
      name: tech.name,
      email: tech.email,
      phone: tech.phone,
      specialty: tech.specialty,
      isAvailable: tech.isAvailable,
      color: tech.color,
    });
    setFormErrors({});
    setFormTouched({});
    setModalOpen(true);
  };

  // Close Modal
  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingTech(null);
    setFormData(INITIAL_FORM_STATE);
    setFormErrors({});
    setFormTouched({});
  };

  // Submit Create / Edit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameErr = validateField('name', formData.name);
    const emailErr = validateField('email', formData.email);
    const phoneErr = validateField('phone', formData.phone);

    setFormTouched({ name: true, email: true, phone: true });
    setFormErrors({ name: nameErr, email: emailErr, phone: phoneErr });

    if (nameErr || emailErr || phoneErr) {
      showSnackbar('Please fix validation errors before submitting', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const avatar = getInitials(formData.name);

      if (editingTech) {
        // Live Update
        const updated = await technicianAPI.updateTechnician(editingTech.id, {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          specialty: formData.specialty,
          isAvailable: formData.isAvailable,
          color: formData.color,
          avatar,
        });

        const nextList = technicians.map((t) => (t.id === editingTech.id ? { ...t, ...updated } : t));
        setTechnicians(nextList);
        syncWithMockUsersCache(nextList);
        showSnackbar(`Technician ${formData.name} updated successfully`, 'success');
      } else {
        // Live Create
        const created = await technicianAPI.createTechnician({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          specialty: formData.specialty,
          isAvailable: formData.isAvailable,
          color: formData.color,
          avatar,
        });

        const newRecord: TechnicianRecord = {
          id: created.id!,
          name: created.name,
          email: created.email,
          phone: created.phone,
          specialty: created.specialty as TechnicianSpecialty,
          isAvailable: created.isAvailable ?? true,
          color: created.color || formData.color,
          avatar: created.avatar || avatar,
          createdAt: created.createdAt || new Date().toISOString(),
          updatedAt: created.updatedAt || new Date().toISOString(),
        };

        const nextList = [...technicians, newRecord];
        setTechnicians(nextList);
        syncWithMockUsersCache(nextList);
        showSnackbar(`New field technician ${formData.name} registered`, 'success');
      }

      handleCloseModal();
    } catch (err) {
      console.error('Failed to save technician:', err);
      showSnackbar('Error saving technician details to AWS Amplify backend', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Live Platform Deployment Status ('Active' <-> 'Inactive')
  const handleToggleStatus = async (tech: TechnicianRecord) => {
    const newStatus = !tech.isAvailable;
    const newStatusLabel = newStatus ? 'Active' : 'Inactive';

    try {
      await technicianAPI.updateTechnician(tech.id, {
        isAvailable: newStatus,
      });

      const nextList = technicians.map((t) =>
        t.id === tech.id ? { ...t, isAvailable: newStatus, updatedAt: new Date().toISOString() } : t
      );
      setTechnicians(nextList);
      syncWithMockUsersCache(nextList);
      showSnackbar(`${tech.name} status changed to ${newStatusLabel}`, 'success');
    } catch (err) {
      console.error('Failed to toggle status:', err);
      showSnackbar('Failed to update deployment status', 'error');
    }
  };

  // Open Delete Confirmation Dialog
  const handleOpenDeleteDialog = (tech: TechnicianRecord) => {
    setTechToDelete(tech);
    setDeleteDialogOpen(true);
  };

  // Confirm Live Database Deletion
  const handleConfirmDelete = async () => {
    if (!techToDelete) return;

    setDeleting(true);
    try {
      await technicianAPI.deleteTechnician(techToDelete.id);
      const nextList = technicians.filter((t) => t.id !== techToDelete.id);
      setTechnicians(nextList);
      syncWithMockUsersCache(nextList);
      showSnackbar(`Technician ${techToDelete.name} has been permanently deleted`, 'info');
      setDeleteDialogOpen(false);
      setTechToDelete(null);
    } catch (err) {
      console.error('Failed to delete technician:', err);
      showSnackbar('Error deleting technician from database', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box className={styles.techBoardRoot}>
      {/* ── Header Status Bar ── */}
      <Box className={styles.techHeader} component="header">
        <Box className={styles.techHeaderContent}>
          <Box className={styles.techHeaderLeft}>
            <IconButton
              className={styles.techBackButton}
              onClick={() => navigate(-1)}
              aria-label="Back to dashboard"
            >
              <ArrowBackIcon className={styles.techBackIcon} />
            </IconButton>
            <Box>
              <Typography variant="h5" className={styles.techManagementTitle}>
                Field Technician Management
              </Typography>
              <Typography variant="caption" className={styles.techManagementSubtitle}>
                Admin Portal / Field Service Technicians Directory
              </Typography>
            </Box>
          </Box>

          {/* Top navigation shortcuts */}
          <Box className={styles.techManagementNavActions}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<SpeedIcon className={styles.techManagementNavIcon} />}
              onClick={() => navigate('/')}
              className={styles.techManagementNavButton}
            >
              Dispatch Board
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<PeopleIcon className={styles.techManagementNavIcon} />}
              onClick={() => navigate('/crm')}
              className={styles.techManagementNavButton}
            >
              CRM Record
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AdminPanelSettingsIcon className={styles.techManagementNavIcon} />}
              onClick={() => navigate('/admin/users')}
              className={styles.techManagementNavButton}
            >
              User Management
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<EventNoteIcon className={styles.techManagementNavIcon} />}
              onClick={() => navigate('/tech-dashboard')}
              className={styles.techManagementNavButton}
            >
              Tech Calendar
            </Button>
          </Box>
        </Box>
      </Box>

      {/* ── Main Container ── */}
      <Box className={styles.statsContainer}>
        {/* ── 1. THEME & SUMMARY STAT TILES LAYOUT (3 High-Density Tiles) ── */}
        <Box className={styles.statsGrid}>
          {/* Card 1: Deep Blue Theme */}
          <Card className={`${styles.statsCard} ${styles.totalTechsCard}`}>
            <CardContent className={styles.cardContent}>
              <Box className={styles.cardHeader}>
                <Typography className={styles.cardTitle}>
                  TOTAL FIELD TECHNICIANS
                </Typography>
                <EngineeringIcon className={styles.cardIcon} />
              </Box>
              <Typography className={styles.cardValue}>
                {stats.total}
              </Typography>
              <Typography className={styles.cardDescription}>
                Registered field technician staff
              </Typography>
            </CardContent>
          </Card>

          {/* Card 2: Teal Green Theme */}
          <Card className={`${styles.statsCard} ${styles.activeTechsCard}`}>
            <CardContent className={styles.cardContent}>
              <Box className={styles.cardHeader}>
                <Typography className={styles.cardTitle}>
                  ON-DUTY / ACTIVE
                </Typography>
                <SpeedIcon className={styles.cardIcon} />
              </Box>
              <Typography className={styles.cardValue}>
                {stats.activeTechs}
              </Typography>
              <Typography className={styles.cardDescription}>
                Available for live dispatch jobs
              </Typography>
            </CardContent>
          </Card>

          {/* Card 3: Purple Theme */}
          <Card className={`${styles.statsCard} ${styles.specialtiesCard}`}>
            <CardContent className={styles.cardContent}>
              <Box className={styles.cardHeader}>
                <Typography className={styles.cardTitle}>
                  SPECIALTIES TRACKED
                </Typography>
                <HandymanIcon className={styles.cardIcon} />
              </Box>
              <Typography className={styles.cardValue}>
                {stats.uniqueSpecialties}
              </Typography>
              <Typography className={styles.cardDescription}>
                Active trade certifications
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* ── 2. HIGH-DENSITY ACTION SUB-HEADER BAR & DATA GRID ── */}
        <Paper className={styles.dataPaper}>
          {/* Controls Bar */}
          <Box className={styles.controlsBar}>
            <Box className={styles.controlsGrid}>
              {/* Search text field */}
              <Box>
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  placeholder="Search name, specialty, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" className={styles.searchIcon} />
                        </InputAdornment>
                      ),
                    },
                  }}
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

              {/* Filter Specialty dropdown */}
              <Box>
                <FormControl fullWidth size="small" className={styles.filterControl}>
                  <InputLabel id="specialty-filter-label" className={styles.filterLabel}>
                    Filter Specialty
                  </InputLabel>
                  <Select
                    labelId="specialty-filter-label"
                    value={specialtyFilter}
                    label="Filter Specialty"
                    onChange={(e) => setSpecialtyFilter(e.target.value)}
                    className={styles.filterSelect}
                  >
                    <MenuItem value="All">All Specialties</MenuItem>
                    {availableSpecialties.map((spec) => (
                      <MenuItem key={spec} value={spec}>
                        {spec}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Filter Status dropdown */}
              <Box>
                <FormControl fullWidth size="small" className={styles.filterControl}>
                  <InputLabel id="status-filter-label" className={styles.filterLabel}>
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
                    <MenuItem value="Active">Active / On Duty</MenuItem>
                    <MenuItem value="Inactive">Inactive / Off Duty</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Blue Create Technician button */}
              <Box className={styles.createButtonContainer}>
                <Button
                  id="create-technician-action-btn"
                  variant="contained"
                  startIcon={<PersonAddIcon />}
                  onClick={handleOpenCreateModal}
                  className={styles.createButton}
                >
                  + Create Technician
                </Button>
              </Box>
            </Box>
          </Box>

          {/* ── 3. MANAGEMENT TABLE DATA GRID ── */}
          <TableContainer>
            {loading ? (
              <Box className={styles.loadingState}>
                <CircularProgress size={28} />
                <Typography className={styles.loadingText}>
                  Loading live technician directory...
                </Typography>
              </Box>
            ) : filteredTechnicians.length === 0 ? (
              <Box className={styles.emptyState}>
                <Typography className={styles.emptyStateTitle}>
                  No technicians found matching search filters
                </Typography>
                <Typography className={styles.emptyStateDescription}>
                  Try adjusting your text search terms or modifying the specialty/status filter settings.
                </Typography>
              </Box>
            ) : (
              <Table
                sx={{
                  minWidth: 800,
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
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.66rem', py: 0.9 }}>
                      USER NAME & CONTACT
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.66rem', py: 0.9 }}>
                      ROLE
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.66rem', py: 0.9 }}>
                      SPECIALTY
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.66rem', py: 0.9 }}>
                      STATUS
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.66rem', py: 0.9 }}>
                      SCHEDULED JOBS
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#475569', fontSize: '0.66rem', py: 0.9 }}>
                      ACTIONS
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTechnicians.map((tech) => {
                    const jobCount = jobsCountByTech.get(tech.id) || 0;

                    return (
                      <TableRow
                        key={tech.id}
                        hover
                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                      >
                        {/* 1. USER NAME & CONTACT */}
                        <TableCell sx={{ py: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar
                              sx={{
                                bgcolor: tech.color || '#2563eb',
                                width: 32,
                                height: 32,
                                fontSize: '0.74rem',
                                fontWeight: 700,
                              }}
                            >
                              {tech.avatar || getInitials(tech.name)}
                            </Avatar>
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                <Typography
                                  variant="subtitle2"
                                  sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.82rem', lineHeight: 1.2 }}
                                >
                                  {tech.name}
                                </Typography>
                                {tech.isAvailable && (
                                  <Tooltip title="On Duty / Active">
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
                              <Typography
                                variant="body2"
                                sx={{ color: '#64748b', fontSize: '0.68rem', lineHeight: 1.2 }}
                              >
                                {tech.email} • {tech.phone}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>

                        {/* 2. ROLE (Static Technician Badge) */}
                        <TableCell sx={{ py: 1 }}>
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
                        </TableCell>

                        {/* 3. SPECIALTY */}
                        <TableCell sx={{ py: 1 }}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, color: '#334155', fontSize: '0.76rem' }}
                          >
                            {tech.specialty || 'General'}
                          </Typography>
                        </TableCell>

                        {/* 4. STATUS */}
                        <TableCell sx={{ py: 1 }}>
                          {tech.isAvailable ? (
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

                        {/* 5. SCHEDULED JOBS */}
                        <TableCell sx={{ py: 1 }}>
                          <Chip
                            label={`${jobCount} ${jobCount === 1 ? 'Job' : 'Jobs'}`}
                            size="small"
                            sx={{
                              bgcolor: jobCount > 0 ? '#eff6ff' : '#f8fafc',
                              color: jobCount > 0 ? '#2563eb' : '#94a3b8',
                              fontWeight: 650,
                              border: '1px solid',
                              borderColor: jobCount > 0 ? '#dbeafe' : '#e2e8f0',
                            }}
                          />
                        </TableCell>

                        {/* 6. ACTIONS (Edit Icon, Toggle Switch, Trash Icon) */}
                        <TableCell align="right" sx={{ py: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.6 }}>
                            {/* Edit Icon Button */}
                            <Tooltip title="Edit Profile Details" arrow>
                              <IconButton
                                size="small"
                                onClick={() => handleOpenEditModal(tech)}
                                sx={{
                                  width: 28,
                                  height: 28,
                                  p: 0,
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '6px',
                                  color: '#475569',
                                  '&:hover': { backgroundColor: '#f1f5f9' },
                                }}
                              >
                                <EditIcon style={{ fontSize: '15px' }} />
                              </IconButton>
                            </Tooltip>

                            {/* Toggle Switch */}
                            <Tooltip
                              title={tech.isAvailable ? 'Deactivate Technician' : 'Activate Technician'}
                              arrow
                            >
                              <Box
                                onClick={() => handleToggleStatus(tech)}
                                sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  cursor: 'pointer',
                                  height: 28,
                                  px: 0.5,
                                  border: '1px solid',
                                  borderColor: tech.isAvailable ? '#a7f3d0' : '#cbd5e1',
                                  borderRadius: '6px',
                                  backgroundColor: tech.isAvailable ? '#f0fdf4' : '#f8fafc',
                                  '&:hover': {
                                    backgroundColor: tech.isAvailable ? '#dcfce7' : '#f1f5f9',
                                  },
                                }}
                              >
                                <Switch
                                  checked={tech.isAvailable}
                                  size="small"
                                  color={tech.isAvailable ? 'success' : 'default'}
                                  sx={{ pointerEvents: 'none', transform: 'scale(0.74)' }}
                                />
                              </Box>
                            </Tooltip>

                            {/* Trash Delete Button */}
                            <Tooltip title="Delete Technician Permanently" arrow>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleOpenDeleteDialog(tech)}
                                sx={{
                                  width: 28,
                                  height: 28,
                                  p: 0,
                                  border: '1px solid #fecaca',
                                  borderRadius: '6px',
                                  color: '#dc2626',
                                  backgroundColor: '#fef2f2',
                                  '&:hover': { backgroundColor: '#fee2e2' },
                                }}
                              >
                                <DeleteIcon style={{ fontSize: '16px' }} />
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

      {/* ── CREATE & EDIT TECHNICIAN MODAL ── */}
      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        className={styles.modalOverlay}
        aria-labelledby="tech-modal-title"
      >
        <Box className={styles.modalBox}>
          {/* Header */}
          <Box className={styles.modalHeader}>
            <Typography id="tech-modal-title" className={styles.modalTitle}>
              <EngineeringIcon style={{ color: '#2563eb', fontSize: '1.2rem' }} />
              {editingTech ? 'Edit Technician Profile' : 'Create New Technician'}
            </Typography>
            <IconButton onClick={handleCloseModal} size="small" className={styles.modalCloseBtn}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Body Form */}
          <form onSubmit={handleSubmitForm} noValidate style={{ display: 'contents' }}>
            <Box className={styles.modalBody}>
              {/* Live Preview Badge */}
              <Box className={styles.previewBadge}>
                <Box className={styles.previewAvatar} sx={{ backgroundColor: formData.color }}>
                  {getInitials(formData.name)}
                </Box>
                <Box className={styles.previewInfo}>
                  <Typography className={styles.previewName}>
                    {formData.name.trim() || 'New Technician'}
                  </Typography>
                  <Typography className={styles.previewMeta}>
                    {formData.specialty} • {formData.isAvailable ? 'Active (On Duty)' : 'Inactive (Off Duty)'}
                  </Typography>
                </Box>
              </Box>

              {/* Full Name */}
              <Box className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="tech-form-name">
                  Full Name <span className={styles.requiredStar}>*</span>
                </label>
                <TextField
                  id="tech-form-name"
                  size="small"
                  placeholder="e.g. David Miller"
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  onBlur={() => handleFormBlur('name')}
                  error={Boolean(formTouched.name && formErrors.name)}
                  helperText={formTouched.name && formErrors.name}
                  disabled={submitting}
                  autoFocus
                  sx={{
                    '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.82rem' },
                  }}
                />
              </Box>

              {/* Email & Phone side by side */}
              <Box className={styles.formGroupRow}>
                <Box className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="tech-form-email">
                    Email Address <span className={styles.requiredStar}>*</span>
                  </label>
                  <TextField
                    id="tech-form-email"
                    type="email"
                    size="small"
                    placeholder="e.g. david@contractor.com"
                    value={formData.email}
                    onChange={(e) => handleFormChange('email', e.target.value)}
                    onBlur={() => handleFormBlur('email')}
                    error={Boolean(formTouched.email && formErrors.email)}
                    helperText={formTouched.email && formErrors.email}
                    disabled={submitting}
                    sx={{
                      '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.82rem' },
                    }}
                  />
                </Box>

                <Box className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="tech-form-phone">
                    Phone Number <span className={styles.requiredStar}>*</span>
                  </label>
                  <TextField
                    id="tech-form-phone"
                    size="small"
                    placeholder="e.g. 555-0199"
                    value={formData.phone}
                    onChange={(e) => handleFormChange('phone', e.target.value)}
                    onBlur={() => handleFormBlur('phone')}
                    error={Boolean(formTouched.phone && formErrors.phone)}
                    helperText={formTouched.phone && formErrors.phone}
                    disabled={submitting}
                    sx={{
                      '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.82rem' },
                    }}
                  />
                </Box>
              </Box>

              {/* Specialty & Initial Status side by side */}
              <Box className={styles.formGroupRow}>
                <Box className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="tech-form-specialty">
                    Trade Specialization
                  </label>
                  <FormControl fullWidth size="small">
                    <Select
                      id="tech-form-specialty"
                      value={formData.specialty}
                      onChange={(e) =>
                        setFormData({ ...formData, specialty: e.target.value as TechnicianSpecialty })
                      }
                      disabled={submitting}
                      sx={{ borderRadius: '8px', height: 38, fontSize: '0.82rem' }}
                    >
                      <MenuItem value="General">General Maintenance</MenuItem>
                      <MenuItem value="Plumbing">Plumbing Specialist</MenuItem>
                      <MenuItem value="HVAC">HVAC Technician</MenuItem>
                      <MenuItem value="Electrical">Electrician</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <Box className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="tech-form-status">
                    Deployment Status
                  </label>
                  <FormControl fullWidth size="small">
                    <Select
                      id="tech-form-status"
                      value={formData.isAvailable ? 'available' : 'unavailable'}
                      onChange={(e) =>
                        setFormData({ ...formData, isAvailable: e.target.value === 'available' })
                      }
                      disabled={submitting}
                      sx={{ borderRadius: '8px', height: 38, fontSize: '0.82rem' }}
                    >
                      <MenuItem value="available">Active (On Duty)</MenuItem>
                      <MenuItem value="unavailable">Inactive (Off Duty)</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              {/* Timeline Color Swatches */}
              <Box className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Timeline Color Badge
                </label>
                <Box className={styles.colorPickerRow}>
                  {COLOR_PRESETS.map((preset) => (
                    <Box
                      key={preset.hex}
                      component="button"
                      type="button"
                      className={`${styles.colorSwatch} ${formData.color === preset.hex ? styles.colorSwatchSelected : ''}`}
                      sx={{ backgroundColor: preset.hex }}
                      onClick={() => setFormData({ ...formData, color: preset.hex })}
                      title={preset.label}
                      aria-label={`Select ${preset.label} color`}
                      disabled={submitting}
                    />
                  ))}
                </Box>
              </Box>
            </Box>

            {/* Footer Buttons */}
            <Box className={styles.modalFooter}>
              <Button
                variant="outlined"
                onClick={handleCloseModal}
                disabled={submitting}
                sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 600 }}
              >
                Cancel
              </Button>
              <Button
                id="tech-submit-btn"
                type="submit"
                variant="contained"
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}
                sx={{
                  textTransform: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  bgcolor: '#2563eb',
                  '&:hover': { bgcolor: '#1d4ed8' },
                }}
              >
                {submitting ? 'Saving...' : editingTech ? 'Save Changes' : 'Create Technician'}
              </Button>
            </Box>
          </form>
        </Box>
      </Modal>

      {/* ── DELETE CONFIRMATION DIALOG ── */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: '12px', p: 1 },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 750, color: '#1e293b', fontSize: '1rem', pb: 1 }}>
          Confirm Technician Deletion
        </DialogTitle>
        <DialogContent sx={{ color: '#475569', fontSize: '0.84rem' }}>
          Are you sure you want to delete technician <strong>{techToDelete?.name}</strong>?
          <Box component="p" sx={{ mt: 1, mb: 0, color: '#dc2626', fontSize: '0.78rem' }}>
            This action will permanently remove this technician record from the live database.
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleting}
            sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            id="confirm-delete-tech-btn"
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
            sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 600 }}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── SNACKBAR NOTIFICATIONS ── */}
      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() => setAlert((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setAlert((prev) => ({ ...prev, open: false }))}
          severity={alert.severity}
          variant="filled"
          sx={{ width: '100%', borderRadius: '8px', fontWeight: 600 }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
