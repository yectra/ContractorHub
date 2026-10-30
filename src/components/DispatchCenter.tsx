import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  IconButton,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  Divider,
  Alert,
  Snackbar,
  Button,
  CircularProgress,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  OutlinedInput,
  Modal,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PhoneIcon from '@mui/icons-material/Phone';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import CancelIcon from '@mui/icons-material/Cancel';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CloseIcon from '@mui/icons-material/Close';
import GroupsIcon from '@mui/icons-material/Groups';
import EngineeringIcon from '@mui/icons-material/Engineering';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { clearAuthSessionAndRedirect } from '../utils/authUtils';

import {
  useServiceRequests,
  useTechnicians,
  useScheduledJobs,
  useClients,
} from '../hooks/useDispatchData';
import { serviceRequestAPI } from '../services/api';
import {
  sendJobUpdatedNotification,
  sendJobDeletedNotification,
  resolveClientForJob,
} from '../services/mailService';
import CreateTechnicianModal, {
  type CreateTechnicianData,
} from './admin/modals/CreateTechnicianModal';
import DeleteServiceRequestModal from './modals/DeleteServiceRequestModal';
import AukuraHeader from './AukuraHeader';

import styles from '../styles/UI/Dashboard.module.scss';
import modalStyles from '../styles/UI/DispatchCenter.module.scss';

// Hours for the schedule grid (7 AM to 7 PM inclusive - 13 hourly slots)
const hours = Array.from({ length: 13 }, (_, i) => i + 7);

const compactSelectLabelSx = {
  backgroundColor: '#ffffff',
  lineHeight: 1.2,
  px: 0.5,
  transform: 'translate(14px, -7px) scale(0.75)',
  '&.MuiInputLabel-shrink': {
    transform: 'translate(14px, -7px) scale(0.75)',
  },
};

const compactSelectSx = {
  height: 36,
  alignItems: 'center',
  '& .MuiSelect-select': {
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    minHeight: '20px !important',
    paddingTop: '12px',
    paddingBottom: '4px',
    paddingLeft: '10px',
    paddingRight: '28px !important',
    lineHeight: '18px',
  },
};

const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export interface DispatchChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface JobChecklistEditorProps {
  open: boolean;
  onClose: () => void;
  jobId?: string | null;
  jobNotes?: string | null;
  items?: DispatchChecklistItem[];
  onItemsChange?: (items: DispatchChecklistItem[]) => void;
  onSave?: (items: DispatchChecklistItem[]) => Promise<void> | void;
  updateScheduledJob?: (id: string, input: { notes?: string }) => Promise<unknown>;
  onNotification?: (message: string, type?: 'success' | 'error' | 'warning') => void;
}

const parseChecklistFromNotes = (notes: string | null | undefined): DispatchChecklistItem[] => {
  if (notes?.startsWith('CHECKLIST:')) {
    try {
      const parsed = JSON.parse(notes.replace('CHECKLIST:', ''));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

/**
 * Job Checklist Editor Modal Component
 */
export const JobChecklistEditor: React.FC<JobChecklistEditorProps> = ({
  open,
  onClose,
  jobId,
  jobNotes,
  items: controlledItems,
  onItemsChange,
  onSave,
  updateScheduledJob,
  onNotification,
}) => {
  const [prevProps, setPrevProps] = useState({ open, controlledItems, jobNotes });
  const [draftItems, setDraftItems] = useState<DispatchChecklistItem[]>(() => {
    if (controlledItems !== undefined) return controlledItems;
    if (jobNotes) return parseChecklistFromNotes(jobNotes);
    return [];
  });
  const [newItemText, setNewItemText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (
    prevProps.open !== open ||
    prevProps.controlledItems !== controlledItems ||
    prevProps.jobNotes !== jobNotes
  ) {
    setPrevProps({ open, controlledItems, jobNotes });
    if (open) {
      if (controlledItems !== undefined) {
        setDraftItems(controlledItems);
      } else if (jobNotes) {
        setDraftItems(parseChecklistFromNotes(jobNotes));
      } else {
        setDraftItems([]);
      }
      setNewItemText('');
    }
  }

  const handleAddItem = useCallback(() => {
    const text = newItemText.trim();
    if (!text) return;

    const newItem: DispatchChecklistItem = {
      id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      text,
      checked: false,
    };

    const updated = [...draftItems, newItem];
    setDraftItems(updated);
    if (onItemsChange) {
      onItemsChange(updated);
    }
    setNewItemText('');
  }, [newItemText, draftItems, onItemsChange]);

  const handleRemoveItem = useCallback(
    (id: string) => {
      const updated = draftItems.filter((item) => item.id !== id);
      setDraftItems(updated);
      if (onItemsChange) {
        onItemsChange(updated);
      }
    },
    [draftItems, onItemsChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddItem();
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    try {
      setIsSaving(true);
      if (onSave) {
        await onSave(draftItems);
      } else if (jobId && updateScheduledJob) {
        const payload = JSON.stringify(draftItems);
        await updateScheduledJob(jobId, {
          notes: `CHECKLIST:${payload}`,
        });

        try {
          localStorage.removeItem(`checklist_job_${jobId}`);
        } catch {
          // Ignore storage restrictions
        }

        if (onNotification) {
          onNotification(
            '✅ Checklist saved! Technician will see the updated steps immediately.',
            'success'
          );
        }
        onClose();
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Failed to save checklist:', err);
      if (onNotification) {
        onNotification('Failed to save checklist. Please try again.', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => !isSaving && onClose()}
      aria-labelledby="checklist-modal-title"
      className={modalStyles.modalOverlay}
    >
      <Box
        component="form"
        onSubmit={handleFormSubmit}
        className={modalStyles.modalBox}
      >
        <Box className={modalStyles.modalHeader}>
          <Typography
            id="checklist-modal-title"
            variant="h6"
            className={modalStyles.modalTitle}
          >
            📋 Job Checklist Editor
          </Typography>
          <Chip
            label="Task Editor"
            size="small"
            color="success"
            className={modalStyles.taskEditorBadge}
          />
        </Box>

        <Box className={modalStyles.modalBody}>
          <Typography variant="subtitle2" className={modalStyles.sectionLabel}>
            1. DEFINE STEP-BY-STEP TASK CHECKLIST
          </Typography>

          <Box className={modalStyles.itemsList}>
            {draftItems.length === 0 ? (
              <Box className={modalStyles.emptyState}>
                <Typography variant="body2" className={modalStyles.emptyStateText}>
                  No steps defined yet. Add your first step below.
                </Typography>
              </Box>
            ) : (
              draftItems.map((item, idx) => (
                <Box key={item.id} className={modalStyles.checklistItem}>
                  <Box className={modalStyles.stepBadge}>{idx + 1}</Box>
                  <Typography variant="body2" className={modalStyles.itemText}>
                    {item.text}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={isSaving}
                    className={modalStyles.removeButton}
                    aria-label={`Remove step ${idx + 1}: ${item.text}`}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))
            )}
          </Box>

          <Box className={modalStyles.addItemRow}>
            <TextField
              id="new-checklist-item-input"
              className={modalStyles.addItemInput}
              fullWidth
              size="small"
              placeholder="e.g. Inspect HVAC compressor & verify coolant pressure"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSaving}
              autoComplete="off"
            />
            <Button
              id="add-checklist-item-btn"
              variant="contained"
              onClick={handleAddItem}
              disabled={!newItemText.trim() || isSaving}
              className={modalStyles.addButton}
            >
              + Add Step
            </Button>
          </Box>

          {draftItems.length > 0 && (
            <Typography variant="caption" className={modalStyles.stepCounter}>
              {draftItems.length} step{draftItems.length !== 1 ? 's' : ''} configured
            </Typography>
          )}
        </Box>

        <Box className={modalStyles.modalFooter}>
          <Button
            variant="outlined"
            startIcon={<CancelIcon />}
            onClick={onClose}
            disabled={isSaving}
            className={modalStyles.cancelButton}
          >
            Cancel
          </Button>
          <Button
            id="save-checklist-btn"
            variant="contained"
            type="submit"
            startIcon={
              isSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />
            }
            disabled={isSaving}
            className={modalStyles.saveButton}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

type ProfileUser = {
  username?: string;
  signInDetails?: {
    loginId?: string;
  };
  attributes?: Record<string, string | undefined>;
};

/**
 * Principal Dispatch Command Center Dashboard Component
 */
export const DispatchCenter: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlJobId = searchParams.get('jobId') || searchParams.get('highlight');
  const urlDate = searchParams.get('date');

  const { signOut, user } = useAuthenticator((context) => [
    context.signOut,
    context.user,
  ]);
  const profileUser = user as ProfileUser | undefined;

  // ── Layout & Selection State Architecture ──────────────────────────────────
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [userRightPanelOpen, setUserRightPanelOpen] = useState<boolean | undefined>(
    undefined
  );
  // Shared selection state tracker for the active service request / job item
  const [userSelectedRequestId, setUserSelectedRequestId] = useState<
    string | null | undefined
  >(undefined);

  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<
    'success' | 'error' | 'warning'
  >('success');
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [userSelectedDate, setUserSelectedDate] = useState<string | undefined>(
    undefined
  );
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  // Synchronize state resets when URL parameters change
  const [prevUrlState, setPrevUrlState] = useState({ urlJobId, urlDate });
  if (prevUrlState.urlJobId !== urlJobId || prevUrlState.urlDate !== urlDate) {
    setPrevUrlState({ urlJobId, urlDate });
    setUserSelectedRequestId(undefined);
    setUserRightPanelOpen(undefined);
    setUserSelectedDate(undefined);
  }

  // ── Dispatcher Checklist Modal state ────────────────────────────────────────
  const [checklistModalOpen, setChecklistModalOpen] = useState(false);
  const [checklistModalJobId, setChecklistModalJobId] = useState<string | null>(null);
  const [checklistDraftItems, setChecklistDraftItems] = useState<
    DispatchChecklistItem[]
  >([]);

  // ── Create Technician Modal state ───────────────────────────────────────────
  const [createTechModalOpen, setCreateTechModalOpen] = useState(false);

  // ── Delete Service Request Modal state ──────────────────────────────────────
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [jobIdToDelete, setJobIdToDelete] = useState<string | null>(null);

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

  const adminDisplayName =
    profileUser?.attributes?.name ||
    profileUser?.attributes?.given_name ||
    (profileEmail ? profileEmail.split('@')[0] : '') ||
    'ContractorHub Dispatch';

  // Real-time data streams
  const {
    serviceRequests,
    loading: srLoading,
    error: srError,
    updateServiceRequest,
    deleteServiceRequest,
  } = useServiceRequests();
  const {
    technicians,
    loading: techLoading,
    error: techError,
    createTechnician,
  } = useTechnicians();
  const {
    scheduledJobs,
    createScheduledJob,
    updateScheduledJob,
    deleteScheduledJob,
  } = useScheduledJobs();
  const { clients, loading: clLoading } = useClients();

  // URL Deep-linking resolution
  const targetRequestFromUrl = useMemo(() => {
    if (!urlJobId) return null;
    return serviceRequests.find((r) => r.id === urlJobId) || null;
  }, [urlJobId, serviceRequests]);

  const targetScheduledJobFromUrl = useMemo(() => {
    if (!urlJobId) return null;
    return (
      scheduledJobs.find(
        (j) => j.serviceRequestId === urlJobId || j.id === urlJobId
      ) || null
    );
  }, [urlJobId, scheduledJobs]);

  const urlResolvedRequestId = useMemo(() => {
    if (!urlJobId) return null;
    return (
      targetRequestFromUrl?.id ||
      targetScheduledJobFromUrl?.serviceRequestId ||
      urlJobId
    );
  }, [urlJobId, targetRequestFromUrl, targetScheduledJobFromUrl]);

  // Derived active state: user selections take precedence, falling back to URL / data-derived values
  const selectedRequest =
    userSelectedRequestId !== undefined
      ? userSelectedRequestId
      : urlJobId
      ? urlResolvedRequestId
      : null;

  const rightPanelOpen =
    userRightPanelOpen !== undefined
      ? userRightPanelOpen
      : Boolean(
          urlJobId &&
            (targetRequestFromUrl ||
              targetScheduledJobFromUrl ||
              urlResolvedRequestId)
        );

  const selectedDate =
    userSelectedDate !== undefined
      ? userSelectedDate
      : urlDate ||
        targetScheduledJobFromUrl?.scheduledDate ||
        getTodayString();

  const setSelectedRequest = useCallback(
    (val: string | null | ((prev: string | null) => string | null)) => {
      if (typeof val === 'function') {
        setUserSelectedRequestId((prev) =>
          val(prev !== undefined ? prev : urlJobId ? urlResolvedRequestId : null)
        );
      } else {
        setUserSelectedRequestId(val);
      }
    },
    [urlJobId, urlResolvedRequestId]
  );

  const setRightPanelOpen = useCallback(
    (val: boolean | ((prev: boolean) => boolean)) => {
      if (typeof val === 'function') {
        setUserRightPanelOpen((prev) =>
          val(
            prev !== undefined
              ? prev
              : Boolean(
                  urlJobId &&
                    (targetRequestFromUrl ||
                      targetScheduledJobFromUrl ||
                      urlResolvedRequestId)
                )
          )
        );
      } else {
        setUserRightPanelOpen(val);
      }
    },
    [urlJobId, targetRequestFromUrl, targetScheduledJobFromUrl, urlResolvedRequestId]
  );

  const setSelectedDate = (val: string | ((prev: string) => string)) => {
    if (typeof val === 'function') {
      setUserSelectedDate((prev) =>
        val(
          prev !== undefined
            ? prev
            : urlDate ||
                targetScheduledJobFromUrl?.scheduledDate ||
                getTodayString()
        )
      );
    } else {
      setUserSelectedDate(val);
    }
  };

  /**
   * UNIFIED SELECTION HANDLER
   * Updates the shared selection state and ensures the right-side details panel opens
   */
  const handleJobSelect = useCallback(
    (jobId?: string | null) => {
      if (!jobId) return;
      try {
        sessionStorage.setItem('previousView', 'ADMIN');
      } catch {
        // Ignore storage restrictions
      }
      setSelectedRequest(jobId);
      setRightPanelOpen(true);
    },
    [setSelectedRequest, setRightPanelOpen]
  );

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate || getTodayString());
  };

  useEffect(() => {
    if (!profileMenuOpen) {
      return;
    }

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

  const handleCreateTechnician = async (techData: CreateTechnicianData) => {
    try {
      const created = await createTechnician(techData);
      showNotification_(
        `Technician "${created.name}" created successfully!`,
        'success'
      );
    } catch (err) {
      console.error('Failed to create technician:', err);
      const msg = err instanceof Error ? err.message : 'Failed to create technician';
      showNotification_(msg, 'error');
      throw err;
    }
  };

  const handleLogout = async () => {
    await clearAuthSessionAndRedirect(signOut);
  };

  // Filter scheduled jobs by selectedDate
  const filteredJobs = useMemo(() => {
    return scheduledJobs.filter((job) => {
      const jobDate = job.scheduledDate || getTodayString();
      return jobDate === selectedDate;
    });
  }, [scheduledJobs, selectedDate]);

  // Filter service requests to show only unassigned jobs in the queue
  const pendingRequests = useMemo(() => {
    return serviceRequests.filter((req) => req.status === 'Unassigned');
  }, [serviceRequests]);

  /**
   * ALIGNED DATA FETCHING & FILTERING MECHANISM
   * Handles both assigned and unassigned records identically via unique ID mapping
   */
  const selectedServiceReq = useMemo(() => {
    if (!selectedRequest) return null;
    // 1. Direct match on ServiceRequest ID (unassigned queue items or direct ID lookup)
    const directMatch = serviceRequests.find((r) => r.id === selectedRequest);
    if (directMatch) return directMatch;

    // 2. Lookup via ScheduledJob (resolves when scheduledJob ID or serviceRequestId was passed)
    const matchedJob = scheduledJobs.find(
      (j) => j.id === selectedRequest || j.serviceRequestId === selectedRequest
    );
    if (matchedJob) {
      return (
        serviceRequests.find((r) => r.id === matchedJob.serviceRequestId) || null
      );
    }

    return null;
  }, [selectedRequest, serviceRequests, scheduledJobs]);

  // Edit states for service request
  const [editService, setEditService] = useState('');
  const [editPriority, setEditPriority] = useState<'high' | 'medium' | 'low'>('low');
  const [editLocation, setEditLocation] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editType, setEditType] = useState<'Emergency' | 'WebRequest' | 'Scheduled'>(
    'Scheduled'
  );
  const [editStatus, setEditStatus] = useState<
    'Unassigned' | 'Assigned' | 'InProgress' | 'Completed'
  >('Unassigned');
  const [syncedServiceReqKey, setSyncedServiceReqKey] = useState<string | null>(
    null
  );

  const selectedServiceReqKey = selectedServiceReq
    ? JSON.stringify([
        selectedServiceReq.id,
        selectedServiceReq.service,
        selectedServiceReq.priority,
        selectedServiceReq.location,
        selectedServiceReq.notes,
        selectedServiceReq.type,
        selectedServiceReq.status,
      ])
    : null;

  // Synchronize edit states with selected service request
  if (selectedServiceReq && selectedServiceReqKey !== syncedServiceReqKey) {
    setSyncedServiceReqKey(selectedServiceReqKey);
    setEditService(selectedServiceReq.service || '');
    setEditPriority(selectedServiceReq.priority || 'low');
    setEditLocation(selectedServiceReq.location || '');
    setEditNotes(selectedServiceReq.notes || '');
    setEditType(selectedServiceReq.type || 'Scheduled');
    setEditStatus(selectedServiceReq.status || 'Unassigned');
  } else if (!selectedServiceReq && syncedServiceReqKey) {
    setSyncedServiceReqKey(null);
  }

  // Find associated scheduled job if it exists for the selected service request
  const associatedJob = useMemo(() => {
    if (!selectedServiceReq && !selectedRequest) return null;
    const targetId = selectedServiceReq?.id || selectedRequest;
    return (
      scheduledJobs.find(
        (job) => job.serviceRequestId === targetId || job.id === targetId
      ) || null
    );
  }, [selectedServiceReq, selectedRequest, scheduledJobs]);

  // Parse notes to get technician comment and photos
  const techFeedback = useMemo(() => {
    if (!associatedJob || !associatedJob.notes) return null;
    try {
      const parsed = JSON.parse(associatedJob.notes);
      return {
        comment: typeof parsed.comment === 'string' ? parsed.comment : '',
        photos: Array.isArray(parsed.photos) ? parsed.photos : [],
      };
    } catch {
      return null;
    }
  }, [associatedJob]);

  // Get selected client details
  const selectedClient = useMemo(() => {
    if (!selectedServiceReq) return null;
    return clients.find((c) => c.name === selectedServiceReq.client) || null;
  }, [selectedServiceReq, clients]);

  // Linked scheduled job for checklist manager
  const rightPanelJob = useMemo(() => {
    if (!selectedServiceReq && !selectedRequest) return null;
    const targetId = selectedServiceReq?.id || selectedRequest;
    return (
      scheduledJobs.find(
        (j) => j.serviceRequestId === targetId || j.id === targetId
      ) || null
    );
  }, [selectedServiceReq, selectedRequest, scheduledJobs]);

  const getTechnicianName = (techId: string): string => {
    return technicians.find((t) => t.id === techId)?.name || 'Unknown';
  };

  const getTechnicianColor = (techId: string): string => {
    return technicians.find((t) => t.id === techId)?.color || '#9e9e9e';
  };

  const getAvatarInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const getPriorityColor = (priority: string | null | undefined) => {
    switch (priority) {
      case 'high':
        return '#f44336';
      case 'medium':
        return '#ff9800';
      case 'low':
        return '#4caf50';
      default:
        return '#9e9e9e';
    }
  };

  const handleSave = async () => {
    if (!selectedServiceReq) {
      showNotification_('No work order selected', 'error');
      return;
    }

    try {
      setIsSaving(true);
      const associated = scheduledJobs.find(
        (job) => job.serviceRequestId === selectedServiceReq.id
      );

      if (
        !associated &&
        (editStatus === 'Assigned' ||
          editStatus === 'InProgress' ||
          editStatus === 'Completed')
      ) {
        showNotification_(
          'Cannot set status to Assigned, In Progress, or Completed without scheduling the job on the timeline first.',
          'error'
        );
        return;
      }

      await updateServiceRequest(selectedServiceReq.id!, {
        service: editService,
        priority: editPriority,
        location: editLocation,
        notes: editNotes,
        type: editType,
        status: editStatus,
        assignedTechnicianId:
          editStatus === 'Unassigned'
            ? null
            : selectedServiceReq.assignedTechnicianId,
      });

      if (associated) {
        if (editStatus === 'Unassigned') {
          await deleteScheduledJob(associated.id!);
        } else {
          let jobStatus: 'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled' =
            'Scheduled';
          if (editStatus === 'InProgress') jobStatus = 'InProgress';
          else if (editStatus === 'Completed') jobStatus = 'Completed';

          await updateScheduledJob(associated.id!, {
            status: jobStatus,
            notes: editNotes,
          });
        }
      }

      try {
        const client =
          clients.find(
            (c) =>
              c.name === selectedServiceReq.client ||
              c.id === selectedServiceReq.client
          ) || (await resolveClientForJob(selectedServiceReq.client, clients));
        const dynamicClientEmail = client?.email?.trim();
        if (dynamicClientEmail && client) {
          const effectiveTechId =
            editStatus === 'Unassigned'
              ? null
              : selectedServiceReq.assignedTechnicianId || associated?.techId;
          const techName = effectiveTechId
            ? getTechnicianName(effectiveTechId)
            : undefined;
          sendJobUpdatedNotification({
            clientName: client.name,
            clientEmail: dynamicClientEmail,
            job: {
              id: selectedServiceReq.id,
              service: editService,
              client: client.name,
              location: editLocation,
              type: editType,
              priority: editPriority,
              status: editStatus,
              scheduledDate: associated?.scheduledDate,
              requestTime: selectedServiceReq.requestTime,
              estimatedDuration: selectedServiceReq.estimatedDuration,
              assignedTechnicianName: techName,
              notes: editNotes,
            },
            changesSummary: `Status updated to ${editStatus}, Service: ${editService}`,
            cachedClients: clients,
            senderName: adminDisplayName,
          }).catch((err) =>
            console.error('[DispatchCenter] Failed to send update email:', err)
          );
        }
      } catch (notifyErr) {
        console.error('[DispatchCenter] Error preparing update email:', notifyErr);
      }

      showNotification_('Work order saved successfully!', 'success');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to save work order';
      showNotification_(`Save failed: ${errorMessage}. Please try again.`, 'error');
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (id?: string) => {
    const targetId = id || selectedServiceReq?.id;
    if (!targetId) {
      showNotification_('No work order selected to delete', 'error');
      return;
    }
    setJobIdToDelete(targetId);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    const targetId = jobIdToDelete || selectedServiceReq?.id;
    if (!targetId) {
      setIsDeleteModalOpen(false);
      setJobIdToDelete(null);
      return;
    }

    try {
      setIsSaving(true);
      const targetReq =
        serviceRequests.find((r) => r.id === targetId) || selectedServiceReq;
      const associated = scheduledJobs.find(
        (job) => job.serviceRequestId === targetId
      );
      if (associated) {
        await deleteScheduledJob(associated.id!);
      }

      await deleteServiceRequest(targetId);

      try {
        const client =
          clients.find(
            (c) => c.name === targetReq?.client || c.id === targetReq?.client
          ) ||
          (targetReq?.client
            ? await resolveClientForJob(targetReq.client, clients)
            : null);
        const dynamicEmail = client?.email?.trim();
        if (dynamicEmail && targetReq && client) {
          sendJobDeletedNotification({
            clientName: client.name,
            clientEmail: dynamicEmail,
            job: {
              id: targetId,
              service: targetReq.service,
              client: client.name,
              location: targetReq.location,
              scheduledDate: associated?.scheduledDate,
              status: 'Cancelled',
              notes: targetReq.notes,
            },
            reason: 'Removed from dispatch calendar & service queue',
            cachedClients: clients,
            senderName: adminDisplayName,
          }).catch((err) =>
            console.error('[DispatchCenter] Failed to send delete email:', err)
          );
        }
      } catch (notifyErr) {
        console.error('[DispatchCenter] Error preparing delete email:', notifyErr);
      }

      setSelectedRequest(null);
      setRightPanelOpen(false);
      setIsDeleteModalOpen(false);
      setJobIdToDelete(null);
      showNotification_('Work order deleted successfully.', 'success');
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Delete operation failed';
      showNotification_(`Failed to delete: ${errorMsg}`, 'error');
      console.error('Delete error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelDelete = () => {
    if (isSaving) return;
    setIsDeleteModalOpen(false);
    setJobIdToDelete(null);
  };

  const showNotification_ = (
    message: string,
    type: 'success' | 'error' | 'warning' = 'success'
  ) => {
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotification(true);
  };

  const openChecklistModal = (jobId: string, jobNotes?: string | null) => {
    setChecklistDraftItems(parseChecklistFromNotes(jobNotes));
    setChecklistModalJobId(jobId);
    setChecklistModalOpen(true);
  };

  const handleChecklistSave = async () => {
    if (!checklistModalJobId) return;
    try {
      const payload = JSON.stringify(checklistDraftItems);
      await updateScheduledJob(checklistModalJobId, {
        notes: `CHECKLIST:${payload}`,
      });
      localStorage.removeItem(`checklist_job_${checklistModalJobId}`);
      showNotification_(
        '✅ Checklist saved! Technician will see the updated steps immediately.',
        'success'
      );
      setChecklistModalOpen(false);
    } catch (err) {
      console.error('Failed to save checklist:', err);
      showNotification_('Failed to save checklist. Please try again.', 'error');
    }
  };

  // ── Drag & Drop Handlers with Intact Schema Transfer ─────────────────────────
  const handleDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    type: 'request' | 'job',
    id: string
  ) => {
    setIsDragging(true);
    event.dataTransfer.setData('application/json', JSON.stringify({ type, id }));
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDrop = async (
    event: React.DragEvent<HTMLDivElement>,
    techId: string,
    startHour: number
  ) => {
    event.preventDefault();
    setIsDragging(false);

    let data: { type?: string; id?: string } = {};
    try {
      data = JSON.parse(
        event.dataTransfer.getData('application/json') || '{}'
      );
    } catch {
      return;
    }

    if (!data.id) return;

    try {
      if (data.type === 'request') {
        const request = serviceRequests.find((r) => r.id === data.id);
        if (!request) {
          showNotification_('Request not found', 'error');
          return;
        }

        const existingJob = scheduledJobs.find(
          (j) => j.serviceRequestId === data.id
        );

        if (existingJob) {
          await updateScheduledJob(existingJob.id!, {
            techId,
            startHour,
            scheduledDate: selectedDate,
          });
        } else {
          // Structural transfer: unique record identifier remains fully intact
          await createScheduledJob({
            techId,
            serviceRequestId: data.id,
            startHour,
            duration: 2,
            status: 'Scheduled',
            scheduledDate: selectedDate,
          });
        }

        await updateServiceRequest(data.id, {
          status: 'Assigned',
          assignedTechnicianId: techId,
        });

        // Automatically preserve active selection on the assigned job
        handleJobSelect(data.id);

        try {
          const client =
            clients.find(
              (c) => c.name === request.client || c.id === request.client
            ) || (await resolveClientForJob(request.client, clients));
          const dynamicEmail = client?.email?.trim();
          if (dynamicEmail && client) {
            sendJobUpdatedNotification({
              clientName: client.name,
              clientEmail: dynamicEmail,
              job: {
                id: request.id,
                service: request.service,
                client: client.name,
                location: request.location,
                type: request.type,
                priority: request.priority,
                status: 'Assigned',
                scheduledDate: selectedDate,
                requestTime: `${startHour}:00`,
                estimatedDuration: request.estimatedDuration || '2 hours',
                assignedTechnicianName: getTechnicianName(techId),
                notes: request.notes,
              },
              changesSummary: `Assigned to ${getTechnicianName(
                techId
              )} for ${selectedDate} at ${startHour}:00`,
              cachedClients: clients,
              senderName: adminDisplayName,
            }).catch((err) =>
              console.error('[DispatchCenter] Failed to send drop schedule email:', err)
            );
          }
        } catch (notifyErr) {
          console.error('[DispatchCenter] Error preparing drop schedule email:', notifyErr);
        }

        showNotification_(
          `Job ${data.id} assigned to ${getTechnicianName(techId)}`,
          'success'
        );
      }

      if (data.type === 'job') {
        const job = scheduledJobs.find((j) => j.id === data.id);
        if (!job) {
          showNotification_('Job not found', 'error');
          return;
        }

        await updateScheduledJob(data.id, {
          techId,
          startHour,
          scheduledDate: selectedDate,
        });

        await updateServiceRequest(job.serviceRequestId, {
          status: 'Assigned',
          assignedTechnicianId: techId,
        });

        // Automatically preserve active selection on reassignment
        handleJobSelect(job.serviceRequestId || job.id);

        try {
          const relatedReq = serviceRequests.find(
            (r) => r.id === job.serviceRequestId
          );
          const clientName = relatedReq?.client || '';
          const client =
            clients.find(
              (c) => c.name === clientName || c.id === clientName
            ) || (await resolveClientForJob(clientName, clients));
          const dynamicEmail = client?.email?.trim();
          if (dynamicEmail && client) {
            sendJobUpdatedNotification({
              clientName: client.name,
              clientEmail: dynamicEmail,
              job: {
                id: job.serviceRequestId || job.id,
                service: relatedReq?.service || 'Scheduled Job',
                client: client.name,
                location: relatedReq?.location,
                status: 'Assigned',
                scheduledDate: selectedDate,
                requestTime: `${startHour}:00`,
                assignedTechnicianName: getTechnicianName(techId),
                notes: job.notes || relatedReq?.notes,
              },
              changesSummary: `Reassigned to ${getTechnicianName(
                techId
              )} for ${selectedDate} at ${startHour}:00`,
              cachedClients: clients,
              senderName: adminDisplayName,
            }).catch((err) =>
              console.error('[DispatchCenter] Failed to send drop reassign email:', err)
            );
          }
        } catch (notifyErr) {
          console.error('[DispatchCenter] Error preparing drop reassign email:', notifyErr);
        }

        showNotification_(
          `Job reassigned to ${getTechnicianName(techId)}`,
          'success'
        );
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Drop operation failed';
      showNotification_(errorMsg, 'error');
      console.error('Drop error:', error);
    } finally {
      setIsDragging(false);
    }
  };

  useEffect(() => {
    const testAPI = async () => {
      try {
        const data = await serviceRequestAPI.listServiceRequests();
        console.log('===== AMPLIFY API TEST =====', data);
      } catch (error) {
        console.error('===== AMPLIFY API ERROR =====', error);
      }
    };
    testAPI();
  }, []);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        bgcolor: '#1e293b',
      }}
    >
      {/* ── Aukura Unified Corporate Header Bar ────────────────────────── */}
      <AukuraHeader
        profileImageUrl={profileImageUrl}
        profileAvatarInitials={profileAvatarInitials}
        profileEmail={profileEmail}
        profileName={profileEmail.split('@')[0]}
        profileMenuOpen={profileMenuOpen}
        setProfileMenuOpen={setProfileMenuOpen}
        profileMenuRef={profileMenuRef}
        triggerId="profile-menu-trigger"
        dropdownContent={
          <Box
            className={styles.profileDropdown}
            role="menu"
            aria-labelledby="profile-menu-trigger"
          >
            <button
              id="create-technician-nav-btn"
              type="button"
              className={styles.profileMenuItem}
              onClick={() => {
                navigate('/admin/technicians');
                setProfileMenuOpen(false);
              }}
              role="menuitem"
            >
              <EngineeringIcon className={styles.profileMenuIcon} />
              <span>Technicians</span>
            </button>
            <button
              type="button"
              className={styles.profileMenuItem}
              onClick={() => {
                navigate('/crm');
                setProfileMenuOpen(false);
              }}
              role="menuitem"
            >
              <GroupsIcon className={styles.profileMenuIcon} />
              <span>Client</span>
            </button>
            <button
              id="user-management-nav-btn"
              type="button"
              className={styles.profileMenuItem}
              onClick={() => {
                navigate('/admin/users');
                setProfileMenuOpen(false);
              }}
              role="menuitem"
            >
              <PersonAddIcon className={styles.profileMenuIcon} />
              <span>Users</span>
            </button>
            <button
              id="logout-nav-btn"
              type="button"
              className={`${styles.profileMenuItem} ${styles.profileMenuItemDanger}`}
              onClick={() => {
                setProfileMenuOpen(false);
                handleLogout();
              }}
              role="menuitem"
            >
              <LogoutIcon className={styles.profileMenuIcon} />
              <span>Logout</span>
            </button>
          </Box>
        }
      />

      <Box
        className={styles.dashboardRoot}
        sx={{
          flex: 1,
          minHeight: 0,
          height: 'calc(100vh - 48px)',
          pt: 0,
          pb: 0,
          overflow: 'hidden',
        }}
      >
      {/* ── Left Panel - Service Queue (320px) ────────────────────────── */}
      <Box
        className={`${styles.dashboardSidePanel} ${styles.dashboardLeftPanel} ${
          leftPanelOpen
            ? styles.dashboardLeftPanelOpen
            : styles.dashboardLeftPanelClosed
        }`}
      >
        {leftPanelOpen && (
          <>
            <Box className={styles.dashboardPanelHeader}>
              <Box className={styles.dashboardPanelHeadingWrap}>
                <Typography variant="h6" className={styles.dashboardTitle}>
                  Service Queue
                </Typography>
              </Box>
              <Typography variant="caption" className={styles.dashboardCaption}>
                {srLoading
                  ? 'Loading...'
                  : `${pendingRequests.length} pending requests`}
              </Typography>
              <TextField
                type="date"
                label="Schedule Date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                onClick={(e) => {
                  try {
                    (e.target as HTMLInputElement).showPicker();
                  } catch {
                    // Fallback
                  }
                }}
                className={`${styles.dashboardField} ${styles.dashboardCompactField}`}
                fullWidth
                size="small"
                slotProps={{
                  inputLabel: { shrink: true },
                }}
              />
              {srError && (
                <Alert severity="error" className={styles.dashboardAlertError}>
                  {srError}
                </Alert>
              )}
            </Box>

            <Box className={styles.dashboardQueueList}>
              {srLoading ? (
                <Box className={styles.dashboardLoadingBox}>
                  <CircularProgress size={40} />
                </Box>
              ) : pendingRequests.length === 0 ? (
                <Typography variant="body2" className={styles.dashboardEmptyText}>
                  No pending requests
                </Typography>
              ) : (
                pendingRequests.map((request) => (
                  <Card
                    key={request.id}
                    draggable
                    onDragStart={(event) =>
                      handleDragStart(event, 'request', request.id!)
                    }
                    onDragEnd={handleDragEnd}
                    onClick={() => handleJobSelect(request.id!)}
                    className={`${styles.dashboardRequestCard} ${
                      selectedRequest === request.id
                        ? styles.dashboardRequestCardSelected
                        : styles.dashboardRequestCardIdle
                    } ${urlJobId === request.id ? styles.dashboardCardHighlighted : ''}`}
                  >
                    <CardContent className={styles.dashboardCardContent}>
                      <Box
                        className={`${styles.dashboardRowBetween} ${styles.dashboardRequestHeader}`}
                      >
                        <Typography
                          variant="subtitle2"
                          className={styles.dashboardRequestId}
                        >
                          {request.id}
                        </Typography>
                        <Chip
                          label={request.type}
                          size="small"
                          icon={
                            request.type === 'Emergency' ? (
                              <PriorityHighIcon />
                            ) : undefined
                          }
                          className={`${styles.dashboardRequestTypeChip} ${
                            request.type === 'Emergency'
                              ? styles.dashboardEmergencyChip
                              : styles.dashboardStandardChip
                          }`}
                        />
                      </Box>

                      <Typography
                        variant="body2"
                        className={styles.dashboardRequestClient}
                      >
                        {request.client}
                      </Typography>

                      <Typography
                        variant="body2"
                        className={styles.dashboardRequestService}
                      >
                        {request.service}
                      </Typography>

                      <Box className={styles.dashboardIconTextRow}>
                        <LocationOnIcon className={styles.dashboardRequestIcon} />
                        <Typography
                          variant="caption"
                          className={styles.dashboardRequestMeta}
                        >
                          {request.location}
                        </Typography>
                      </Box>

                      <Box
                        className={`${styles.dashboardRowBetween} ${styles.dashboardRequestFooter}`}
                      >
                        <Box className={styles.dashboardIconTextRow}>
                          <AccessTimeIcon className={styles.dashboardRequestIcon} />
                          <Typography
                            variant="caption"
                            className={styles.dashboardRequestMeta}
                          >
                            {request.requestTime}
                          </Typography>
                        </Box>
                        <Chip
                          label={request.estimatedDuration}
                          size="small"
                          className={styles.dashboardDurationChip}
                        />
                      </Box>

                      <Box
                        className={styles.dashboardPriorityBar}
                        sx={{
                          backgroundColor: getPriorityColor(request.priority),
                        }}
                      />
                    </CardContent>
                  </Card>
                ))
              )}
            </Box>
          </>
        )}
      </Box>

      {/* ── Center Panel - Scheduling Matrix (Flexible) ────────────────── */}
      <Box className={styles.dashboardCenterPanel}>
        <Box className={styles.dashboardCenterHeader} sx={{ pt: 1.5 }}>

          <Box
            className={`${styles.dashboardRowBetween} ${styles.dashboardCenterTitleRow}`}
          >
            <Typography variant="h5" className={styles.dashboardCenterTitle}>
              Dispatch Command Center
            </Typography>
            <Chip
              label={new Date(selectedDate + 'T00:00:00').toLocaleDateString(
                undefined,
                {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }
              )}
              color="primary"
              variant="outlined"
              size="small"
              className={styles.dashboardDateChip}
            />
          </Box>
          <Typography variant="body2" className={styles.dashboardSubtitle}>
            Drag and drop service requests to schedule technicians
          </Typography>
        </Box>

        <Box className={styles.dashboardGridScroll}>
          <Box className={styles.dashboardGridInner}>
            <Box className={styles.dashboardTimeHeaderRow}>
              <Box className={styles.dashboardTechSpacer} />
              {hours.map((hour) => (
                <Box key={hour} className={styles.dashboardTimeHeaderCell}>
                  {hour === 12
                    ? '12:00 PM'
                    : hour > 12
                    ? `${hour - 12}:00 PM`
                    : `${hour}:00 AM`}
                </Box>
              ))}
            </Box>

            {techLoading ? (
              <Box
                className={`${styles.dashboardLoadingBox} ${styles.dashboardLoadingBoxLarge}`}
              >
                <CircularProgress size={40} />
              </Box>
            ) : techError ? (
              <Alert
                severity="error"
                className={styles.dashboardErrorAlertSpaced}
              >
                Failed to load technicians: {techError}
              </Alert>
            ) : technicians.length === 0 ? (
              <Box className={styles.dashboardEmptyTechState}>
                <PersonAddIcon className={styles.dashboardEmptyTechIcon} />
                <Typography
                  variant="h6"
                  className={styles.dashboardEmptyTechTitle}
                >
                  No Technicians on Duty
                </Typography>
                <Typography
                  variant="body2"
                  className={styles.dashboardEmptyTechCopy}
                >
                  You don't have any technicians available for dispatch. Add staff
                  to your system to start scheduling jobs.
                </Typography>
                <Button
                  id="dashboard-empty-add-tech-btn"
                  variant="contained"
                  startIcon={<PersonAddIcon />}
                  className={`${styles.dashboardPrimaryButton} ${styles.dashboardAddTechButton}`}
                  onClick={() => setCreateTechModalOpen(true)}
                >
                  Add Technicians
                </Button>
              </Box>
            ) : (
              technicians.map((tech) => (
                <Box key={tech.id} className={styles.dashboardTechRow}>
                  <Box className={styles.dashboardTechInfo}>
                    <Avatar
                      className={styles.dashboardTechAvatar}
                      sx={{ backgroundColor: tech.color || '#9e9e9e' }}
                    >
                      {tech.avatar || getAvatarInitials(tech.name || 'U')}
                    </Avatar>
                    <Box>
                      <Typography
                        variant="body2"
                        className={styles.dashboardTechName}
                      >
                        {tech.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        className={styles.dashboardTechSpecialty}
                      >
                        {tech.specialty}
                      </Typography>
                    </Box>
                  </Box>

                  <Box className={styles.dashboardTimeSlots}>
                    {hours.map((hour) => (
                      <Box
                        key={hour}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => handleDrop(event, tech.id!, hour)}
                        className={styles.dashboardTimeSlot}
                      />
                    ))}

                    {/* Middle lane scheduled job chips mapping block */}
                    {filteredJobs
                      .filter((job) => job.techId === tech.id)
                      .map((job) => {
                        const jobIdentifier = job.serviceRequestId || job.id!;
                        const isSelected =
                          selectedRequest === jobIdentifier ||
                          selectedRequest === job.id ||
                          selectedRequest === job.serviceRequestId;
                        const isHighlighted =
                          urlJobId === jobIdentifier ||
                          urlJobId === job.serviceRequestId;

                        return (
                          <Box
                            key={job.id}
                            draggable
                            onDragStart={(event) =>
                              handleDragStart(event, 'job', job.id!)
                            }
                            onDragEnd={handleDragEnd}
                            onClick={() => handleJobSelect(jobIdentifier)}
                            className={`${styles.dashboardScheduledJob} ${
                              isDragging
                                ? styles.dashboardScheduledJobGrabbing
                                : styles.dashboardScheduledJobGrab
                            } ${
                              isSelected || isHighlighted
                                ? styles.dashboardScheduledJobActive
                                : ''
                            }`}
                            sx={{
                              left: `${
                                ((job.startHour - 7) / hours.length) * 100
                              }%`,
                              width: `${(job.duration / hours.length) * 100}%`,
                              backgroundColor:
                                tech.color || getTechnicianColor(tech.id!),
                            }}
                          >
                            <Typography
                              variant="caption"
                              className={styles.dashboardJobId}
                            >
                              {job.serviceRequestId || job.id}
                            </Typography>
                            <Typography
                              variant="caption"
                              className={styles.dashboardJobClient}
                            >
                              {serviceRequests.find(
                                (r) => r.id === job.serviceRequestId
                              )?.client || 'Unknown'}
                            </Typography>
                          </Box>
                        );
                      })}
                  </Box>
                </Box>
              ))
            )}
          </Box>

          <Box className={styles.dashboardGuide}>
            <Typography variant="body2" className={styles.dashboardGuideTitle}>
              💡 Quick Guide
            </Typography>
            <Typography variant="caption" className={styles.dashboardGuideCopy}>
              • Click on service requests in the left queue to view details
              <br />
              • Drag requests from the queue to technician time slots to schedule
              <br />
              • Click scheduled jobs in the center to view details
              <br />• Drag existing jobs to reschedule or reassign technicians
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ── Right Panel - Work Order Details (400px) ───────────────────── */}
      <Box
        className={`${styles.dashboardSidePanel} ${styles.dashboardRightPanel} ${
          rightPanelOpen
            ? styles.dashboardRightPanelOpen
            : styles.dashboardRightPanelClosed
        }`}
      >
        {rightPanelOpen && (
          <Box
            key={selectedServiceReq?.id || selectedRequest || 'no-selection'}
            sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            {/* Header */}
            <Box className={styles.dashboardPanelHeader}>
              <Box
                className={`${styles.dashboardRowBetween} ${styles.dashboardRequestHeader}`}
              >
                <Typography variant="h6" className={styles.dashboardTitle}>
                  Work Order Details
                </Typography>
              </Box>
              <Typography variant="caption" className={styles.dashboardCaption}>
                {selectedServiceReq?.id || selectedRequest || 'No request selected'}
              </Typography>
            </Box>

            {/* Details Content */}
            <Box className={styles.dashboardDetailsContent}>
              {clLoading ? (
                <Box className={styles.dashboardLoadingBox}>
                  <CircularProgress size={40} />
                </Box>
              ) : !selectedServiceReq ? (
                <Typography variant="body2" className={styles.dashboardEmptyText}>
                  Select a service request to view details
                </Typography>
              ) : (
                <>
                  <Box className={styles.dashboardDetailsSection}>
                    <Typography
                      variant="subtitle2"
                      className={styles.dashboardSectionTitle}
                    >
                      Work Order Settings
                    </Typography>

                    <Box className={styles.dashboardFormStack}>
                      <TextField
                        label="Service Description"
                        value={editService}
                        onChange={(e) => setEditService(e.target.value)}
                        fullWidth
                        size="small"
                        disabled={isSaving}
                        className={styles.dashboardCompactField}
                      />

                      <TextField
                        label="Location"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        fullWidth
                        size="small"
                        disabled={isSaving}
                        className={styles.dashboardCompactField}
                      />

                      <Box className={styles.dashboardFormRow}>
                        <FormControl fullWidth size="small">
                          <InputLabel
                            shrink
                            className={styles.dashboardCompactLabel}
                            sx={compactSelectLabelSx}
                          >
                            Priority
                          </InputLabel>
                          <Select
                            displayEmpty
                            value={editPriority}
                            label="Priority"
                            input={<OutlinedInput label="Priority" notched />}
                            onChange={(e) => setEditPriority(e.target.value as any)}
                            disabled={isSaving}
                            className={styles.dashboardCompactSelect}
                            sx={compactSelectSx}
                          >
                            <MenuItem value="low">Low</MenuItem>
                            <MenuItem value="medium">Medium</MenuItem>
                            <MenuItem value="high">High</MenuItem>
                          </Select>
                        </FormControl>

                        <FormControl fullWidth size="small">
                          <InputLabel
                            shrink
                            className={styles.dashboardCompactLabel}
                            sx={compactSelectLabelSx}
                          >
                            Request Type
                          </InputLabel>
                          <Select
                            displayEmpty
                            value={editType}
                            label="Request Type"
                            input={<OutlinedInput label="Request Type" notched />}
                            onChange={(e) => setEditType(e.target.value as any)}
                            disabled={isSaving}
                            className={styles.dashboardCompactSelect}
                            sx={compactSelectSx}
                          >
                            <MenuItem value="Emergency">Emergency</MenuItem>
                            <MenuItem value="WebRequest">Web Request</MenuItem>
                            <MenuItem value="Scheduled">Scheduled</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>

                      <FormControl fullWidth size="small">
                        <InputLabel
                          shrink
                          className={styles.dashboardCompactLabel}
                          sx={compactSelectLabelSx}
                        >
                          Status
                        </InputLabel>
                        <Select
                          displayEmpty
                          value={editStatus}
                          label="Status"
                          input={<OutlinedInput label="Status" notched />}
                          onChange={(e) => setEditStatus(e.target.value as any)}
                          disabled={isSaving}
                          className={styles.dashboardCompactSelect}
                          sx={compactSelectSx}
                        >
                          <MenuItem value="Unassigned">Unassigned</MenuItem>
                          <MenuItem value="Assigned">Assigned</MenuItem>
                          <MenuItem value="InProgress">In Progress</MenuItem>
                          <MenuItem value="Completed">Completed</MenuItem>
                        </Select>
                      </FormControl>

                      <TextField
                        label="Internal Notes"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        fullWidth
                        multiline
                        rows={2}
                        size="small"
                        disabled={isSaving}
                        className={styles.dashboardCompactField}
                      />
                    </Box>
                  </Box>

                  <Divider className={styles.dashboardDividerLg} />

                  {selectedClient ? (
                    <>
                      <Box className={styles.dashboardContactSection}>
                        <Typography
                          variant="subtitle2"
                          className={styles.dashboardSectionTitle}
                        >
                          Contact Information
                        </Typography>
                        <Box className={styles.dashboardContactRow}>
                          <Avatar className={styles.dashboardClientAvatar}>
                            {getAvatarInitials(selectedClient.name || 'C')}
                          </Avatar>
                          <Box>
                            <Typography
                              variant="body1"
                              className={styles.dashboardClientName}
                            >
                              {selectedClient.name}
                            </Typography>
                            <Chip
                              label="Client"
                              size="small"
                              className={styles.dashboardClientChip}
                            />
                          </Box>
                        </Box>
                        <Divider className={styles.dashboardContactDivider} />
                        <Box className={styles.dashboardContactRow}>
                          <PhoneIcon className={styles.dashboardContactIcon} />
                          <Typography
                            variant="body2"
                            className={styles.dashboardContactText}
                          >
                            {selectedClient.phone || 'N/A'}
                          </Typography>
                        </Box>
                        <Box
                          className={`${styles.dashboardContactRow} ${styles.dashboardContactRowStart}`}
                        >
                          <LocationOnIcon
                            className={`${styles.dashboardContactIcon} ${styles.dashboardContactIconStart}`}
                          />
                          <Typography
                            variant="body2"
                            className={`${styles.dashboardContactText} ${styles.dashboardContactTextFlex}`}
                          >
                            {selectedClient.address || 'N/A'}
                          </Typography>
                        </Box>
                      </Box>

                      <Box className={styles.dashboardContactSection}>
                        <Typography
                          variant="subtitle2"
                          className={styles.dashboardSectionTitle}
                        >
                          Account Status
                        </Typography>
                        <Card
                          className={
                            selectedClient.outstandingBalance
                              ? styles.dashboardBalanceCardDue
                              : styles.dashboardBalanceCardClear
                          }
                        >
                          <CardContent className={styles.dashboardBalanceContent}>
                            <Box className={styles.dashboardRowBetween}>
                              <Box className={styles.dashboardContactRow}>
                                <AttachMoneyIcon
                                  className={`${styles.dashboardBalanceIcon} ${
                                    selectedClient.outstandingBalance
                                      ? styles.dashboardBalanceIconDue
                                      : styles.dashboardBalanceIconClear
                                  }`}
                                />
                                <Typography
                                  variant="body2"
                                  className={styles.dashboardBalanceLabel}
                                >
                                  Outstanding Balance
                                </Typography>
                              </Box>
                              <Typography
                                variant="h6"
                                className={`${styles.dashboardBalanceValue} ${
                                  selectedClient.outstandingBalance
                                    ? styles.dashboardBalanceValueDue
                                    : styles.dashboardBalanceValueClear
                                }`}
                              >
                                ${selectedClient.outstandingBalance || 0}
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      </Box>

                      {selectedClient.preferenceNotes && (
                        <Box className={styles.dashboardPreferenceSection}>
                          <Typography
                            variant="subtitle2"
                            className={styles.dashboardSectionTitle}
                          >
                            Customer Preferences
                          </Typography>
                          <Card className={styles.dashboardPreferenceCard}>
                            <CardContent className={styles.dashboardBalanceContent}>
                              <Typography
                                variant="body2"
                                className={styles.dashboardPreferenceCopy}
                              >
                                {selectedClient.preferenceNotes}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Box>
                      )}

                      <Divider className={styles.dashboardDividerLg} />
                    </>
                  ) : (
                    <Box className={styles.dashboardWarningBox}>
                      <Alert
                        severity="warning"
                        className={styles.dashboardWarningAlert}
                      >
                        No associated client profile found for "
                        {selectedServiceReq.client}".
                      </Alert>
                    </Box>
                  )}

                  {rightPanelJob && (
                    <Box className={styles.dashboardDetailsSection}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          my: 1,
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          className={styles.dashboardSectionTitle}
                        >
                          Job Checklist
                        </Typography>
                        <Chip
                          label={`${
                            parseChecklistFromNotes(rightPanelJob.notes).length ||
                            'Default'
                          } steps`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          color: 'text.secondary',
                          mb: 1,
                          lineHeight: 1.4,
                        }}
                      >
                        Define the exact steps the technician must tick off before
                        completing this job.
                      </Typography>
                      <Button
                        id="manage-checklist-btn"
                        variant="outlined"
                        fullWidth
                        size="small"
                        onClick={() =>
                          openChecklistModal(
                            rightPanelJob.id!,
                            rightPanelJob.notes
                          )
                        }
                        className={styles.dashboardPrimaryButton}
                      >
                        📋 Manage Job Checklist
                      </Button>
                    </Box>
                  )}

                  {techFeedback &&
                    (techFeedback.comment ||
                      (techFeedback.photos && techFeedback.photos.length > 0)) && (
                      <>
                        <Box className={styles.dashboardDetailsSection}>
                          <Typography
                            variant="subtitle2"
                            className={styles.dashboardSectionTitle}
                          >
                            Technician Feedback
                          </Typography>

                          {techFeedback.comment && (
                            <Box sx={{ mb: 1.5 }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  display: 'block',
                                  fontWeight: 600,
                                  mb: 0.5,
                                  color: '#666',
                                }}
                              >
                                Technician Notes
                              </Typography>
                              <textarea
                                value={techFeedback.comment}
                                readOnly
                                className={styles.techCommentTextarea}
                              />
                            </Box>
                          )}

                          {techFeedback.photos &&
                            techFeedback.photos.length > 0 && (
                              <Box>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    display: 'block',
                                    fontWeight: 600,
                                    mb: 0.5,
                                    color: '#666',
                                  }}
                                >
                                  Job Photos ({techFeedback.photos.length})
                                </Typography>
                                <Box
                                  sx={{
                                    display: 'flex',
                                    gap: '8px',
                                    flexWrap: 'wrap',
                                  }}
                                >
                                  {techFeedback.photos.map(
                                    (
                                      photo: {
                                        id: string;
                                        url: string;
                                        name: string;
                                      },
                                      index: number
                                    ) => (
                                      <Box
                                        key={photo.id || index}
                                        onClick={() =>
                                          setPreviewImageUrl(photo.url)
                                        }
                                        sx={{
                                          width: '60px',
                                          height: '60px',
                                          borderRadius: '4px',
                                          border: '1px solid #ddd',
                                          overflow: 'hidden',
                                          cursor: 'pointer',
                                          position: 'relative',
                                          transition: 'transform 0.1s',
                                          '&:hover': {
                                            transform: 'scale(1.05)',
                                            boxShadow:
                                              '0 2px 8px rgba(0,0,0,0.15)',
                                          },
                                        }}
                                      >
                                        <img
                                          src={photo.url}
                                          alt={photo.name}
                                          className={styles.techFeedbackPhoto}
                                        />
                                      </Box>
                                    )
                                  )}
                                </Box>
                              </Box>
                            )}
                        </Box>
                        <Divider className={styles.dashboardDividerLg} />
                      </>
                    )}

                  <Box className={styles.dashboardRoutePreview}>
                    <Typography
                      variant="subtitle2"
                      className={styles.dashboardSectionTitle}
                    >
                      Route Preview
                    </Typography>
                    <Box className={styles.dashboardMapPreview}>
                      <Typography
                        variant="body2"
                        className={styles.dashboardMapCopy}
                      >
                        🗺️ Map Preview
                      </Typography>
                    </Box>
                  </Box>

                  <Box className={styles.dashboardActions}>
                    <Button
                      variant="contained"
                      onClick={handleSave}
                      disabled={isSaving}
                      startIcon={
                        isSaving ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <SaveIcon />
                        )
                      }
                      fullWidth
                      className={styles.dashboardPrimaryButton}
                    >
                      {isSaving ? 'Saving...' : 'Save Work Order'}
                    </Button>

                    <Button
                      id="delete-work-order-btn"
                      variant="outlined"
                      color="error"
                      onClick={() => handleDeleteClick()}
                      disabled={isSaving}
                      startIcon={<DeleteIcon />}
                      fullWidth
                      className={`${styles.dashboardPrimaryButton} ${styles.dashboardDangerButton}`}
                    >
                      Delete Work Order
                    </Button>
                  </Box>
                </>
              )}
            </Box>
          </Box>
        )}
      </Box>

      {/* Left Panel Toggle Button */}
      <IconButton
        onClick={() => setLeftPanelOpen(!leftPanelOpen)}
        className={`${styles.dashboardToggle} ${styles.dashboardToggleLeft} ${
          leftPanelOpen
            ? styles.dashboardToggleLeftOpen
            : styles.dashboardToggleLeftClosed
        }`}
      >
        {leftPanelOpen ? (
          <ChevronLeftIcon className={styles.dashboardToggleIcon} />
        ) : (
          <ChevronRightIcon className={styles.dashboardToggleIcon} />
        )}
      </IconButton>

      {/* Right Panel Toggle Button */}
      <IconButton
        onClick={() => setRightPanelOpen(!rightPanelOpen)}
        className={`${styles.dashboardToggle} ${styles.dashboardToggleRight} ${
          rightPanelOpen
            ? styles.dashboardToggleRightOpen
            : styles.dashboardToggleRightClosed
        }`}
      >
        {rightPanelOpen ? (
          <ChevronRightIcon className={styles.dashboardToggleIcon} />
        ) : (
          <ChevronLeftIcon className={styles.dashboardToggleIcon} />
        )}
      </IconButton>

      {/* Notification Toast */}
      <Snackbar
        open={showNotification}
        autoHideDuration={3500}
        onClose={() => setShowNotification(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setShowNotification(false)}
          severity={notificationType}
          className={styles.dashboardToastAlert}
        >
          {notificationMessage}
        </Alert>
      </Snackbar>

      {/* Dispatcher Checklist Editor Modal */}
      <JobChecklistEditor
        open={checklistModalOpen}
        onClose={() => setChecklistModalOpen(false)}
        jobId={checklistModalJobId}
        items={checklistDraftItems}
        onItemsChange={setChecklistDraftItems}
        onSave={handleChecklistSave}
      />

      {/* Create Technician Modal */}
      <CreateTechnicianModal
        isOpen={createTechModalOpen}
        onClose={() => setCreateTechModalOpen(false)}
        onSubmit={handleCreateTechnician}
      />

      {/* Delete Service Request Confirmation Modal */}
      <DeleteServiceRequestModal
        isOpen={isDeleteModalOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        jobId={jobIdToDelete}
        isDeleting={isSaving}
      />

      {/* Image Preview Modal */}
      {previewImageUrl && (
        <Dialog
          open={!!previewImageUrl}
          onClose={() => setPreviewImageUrl(null)}
          maxWidth="md"
          sx={{
            '& .MuiPaper-root': {
              backgroundColor: 'transparent',
              boxShadow: 'none',
              overflow: 'hidden',
            },
          }}
        >
          <Box
            sx={{
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <img
              src={previewImageUrl}
              alt="Enlarged job preview"
              className={styles.previewImage}
            />
            <IconButton
              onClick={() => setPreviewImageUrl(null)}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                color: '#fff',
                backgroundColor: 'rgba(0,0,0,0.5)',
                '&:hover': {
                  backgroundColor: 'rgba(0,0,0,0.7)',
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Dialog>
      )}
      </Box>
    </Box>
  );
};

export default DispatchCenter;
