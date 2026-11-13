import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
import { useSearchParams } from 'react-router-dom';
import { useAuthenticator } from '@aws-amplify/ui-react';
import type { Schema } from '../../amplify/data/resource';

type ServiceRequest = Schema['ServiceRequest']['type'];

import {
  useServiceRequests,
  useTechnicians,
  useScheduledJobs,
  useClients,
} from '../hooks/useDispatchData';
import {
  serviceRequestAPI,
  scheduledJobAPI,
  populateJobRelations,
} from '../services/api';
import {
  sendJobUpdatedNotification,
  sendJobDeletedNotification,
  resolveClientForJob,
  sendTechnicianJobAssignmentNotification,
  sendTechnicianJobUpdateNotification,
  resolveTechnicianForJob,
} from '../services/mailService';
import CreateTechnicianModal, {
  type CreateTechnicianData,
} from './admin/modals/CreateTechnicianModal';
import DeleteServiceRequestModal from './modals/DeleteServiceRequestModal';
import AppLayout from './layout/AppLayout';

import styles from '../styles/UI/Dashboard.module.scss';
import modalStyles from '../styles/UI/DispatchCenter.module.scss';
import { formatJobNumber, getCanonicalJobId } from '../utils/formatters';

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

const parseChecklistFromNotes = (
  notes: string | null | undefined,
  jobId?: string | null
): DispatchChecklistItem[] => {
  if (notes) {
    if (notes.startsWith('CHECKLIST:')) {
      try {
        const parsed = JSON.parse(notes.replace('CHECKLIST:', ''));
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any, idx: number) => ({
            id: String(item.id || `step-${idx + 1}`),
            text: String(item.text || ''),
            checked: Boolean(item.checked || item.completed || false),
          }));
        }
      } catch {
        // Fall through
      }
    } else {
      try {
        const parsed = JSON.parse(notes);
        if (parsed) {
          if (Array.isArray(parsed.checklist) && parsed.checklist.length > 0) {
            return parsed.checklist.map((item: any, idx: number) => ({
              id: String(item.id || `step-${idx + 1}`),
              text: String(item.text || ''),
              checked: Boolean(item.checked || item.completed || false),
            }));
          }
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((item: any, idx: number) => ({
              id: String(item.id || `step-${idx + 1}`),
              text: String(item.text || ''),
              checked: Boolean(item.checked || item.completed || false),
            }));
          }
        }
      } catch {
        // Fall through
      }
    }
  }

  // Fallback to localStorage cache for this job
  if (jobId) {
    try {
      const cached = localStorage.getItem(`checklist_job_${jobId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any, idx: number) => ({
            id: String(item.id || `step-${idx + 1}`),
            text: String(item.text || ''),
            checked: Boolean(item.checked || item.completed || false),
          }));
        }
      }
    } catch {
      // Fall through
    }
  }

  return [];
};

export interface JobPhoto {
  id?: string;
  url: string;
  name?: string;
}

export interface JobComment {
  id?: string;
  text: string;
  author?: string;
  createdAt?: string;
}

export interface JobMediaGalleryProps {
  photos?: JobPhoto[];
  onPhotoClick?: (url: string) => void;
  isLoading?: boolean;
}

/**
 * Media Gallery / Photo Viewer Component
 * Renders technician job site photos with safe fallbacks and empty state messaging
 */
export const JobMediaGallery: React.FC<JobMediaGalleryProps> = ({
  photos = [],
  onPhotoClick,
  isLoading = false,
}) => {
  const safePhotos = Array.isArray(photos) ? photos : [];

  return (
    <Box className={styles.dashboardDetailsSection}>
      <Typography variant="subtitle2" className={styles.dashboardSectionTitle}>
        Technician Photos {safePhotos.length > 0 ? `(${safePhotos.length})` : ''}
      </Typography>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 1.5 }}>
          <CircularProgress size={24} />
        </Box>
      ) : safePhotos.length === 0 ? (
        <Box className={styles.emptyStateNotice}>
          📷 No technician photos uploaded yet for this job.
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          {safePhotos?.map((photo, index) => (
            <Box
              key={photo?.id || index}
              onClick={() => photo?.url && onPhotoClick?.(photo.url)}
              sx={{
                width: '60px',
                height: '60px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                overflow: 'hidden',
                cursor: photo?.url ? 'pointer' : 'default',
                position: 'relative',
                transition: 'transform 0.1s',
                '&:hover': photo?.url
                  ? {
                      transform: 'scale(1.05)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }
                  : {},
              }}
            >
              {photo?.url ? (
                <img
                  src={photo.url}
                  alt={photo.name || `Job photo ${index + 1}`}
                  className={styles.techFeedbackPhoto}
                />
              ) : (
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f1f5f9',
                    fontSize: '0.65rem',
                    color: '#94a3b8',
                  }}
                >
                  No URL
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export interface JobCommentsFeedProps {
  comments?: JobComment[];
  isLoading?: boolean;
}

/**
 * Comments / Activity Feed Component
 * Displays technician notes, site logs, and updates with timestamps and author attribution
 */
export const JobCommentsFeed: React.FC<JobCommentsFeedProps> = ({
  comments = [],
  isLoading = false,
}) => {
  const safeComments = Array.isArray(comments) ? comments : [];

  return (
    <Box className={styles.dashboardDetailsSection}>
      <Typography variant="subtitle2" className={styles.dashboardSectionTitle}>
        Technician Notes & Activity Feed {safeComments.length > 0 ? `(${safeComments.length})` : ''}
      </Typography>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 1.5 }}>
          <CircularProgress size={24} />
        </Box>
      ) : safeComments.length === 0 ? (
        <Box className={styles.emptyStateNotice}>
          💬 No technician comments or notes logged yet.
        </Box>
      ) : (
        <Box className={styles.commentsFeedList}>
          {safeComments?.map((c, index) => (
            <Box key={c?.id || index} className={styles.commentFeedItem}>
              <Box className={styles.commentFeedHeader}>
                <Typography className={styles.commentFeedAuthor}>
                  {c?.author || 'Technician'}
                </Typography>
                {c?.createdAt && (
                  <Typography className={styles.commentFeedTime}>
                    {(() => {
                      try {
                        const d = new Date(c.createdAt);
                        return isNaN(d.getTime())
                          ? c.createdAt
                          : d.toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            });
                      } catch {
                        return c.createdAt;
                      }
                    })()}
                  </Typography>
                )}
              </Box>
              <Typography className={styles.commentFeedBody}>
                {c?.text || ''}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export interface DispatcherWorkChecklistModuleProps {
  items?: DispatchChecklistItem[];
  onManageClick: () => void;
  isLoading?: boolean;
}

/**
 * Dispatcher Work Checklist Module Component
 * Displays high-density step-by-step task checklist with completion progress and editor launcher
 */
export const DispatcherWorkChecklistModule: React.FC<
  DispatcherWorkChecklistModuleProps
> = ({ items = [], onManageClick, isLoading = false }) => {
  const safeItems = Array.isArray(items) ? items : [];
  const completedCount = safeItems.filter((i) => i?.checked).length;
  const isAllComplete = safeItems.length > 0 && completedCount === safeItems.length;

  return (
    <Box className={styles.dashboardDetailsSection}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          my: 1,
        }}
      >
        <Typography variant="subtitle2" className={styles.dashboardSectionTitle}>
          Job Checklist
        </Typography>
        <Chip
          label={`${completedCount}/${safeItems.length || 0} completed`}
          size="small"
          color={isAllComplete ? 'success' : 'primary'}
          variant="outlined"
        />
      </Box>
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          color: 'text.secondary',
          mb: 1.5,
          lineHeight: 1.4,
        }}
      >
        Define and inspect the work tasks the technician must complete on site.
      </Typography>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 1.5 }}>
          <CircularProgress size={24} />
        </Box>
      ) : safeItems.length === 0 ? (
        <Box className={styles.emptyStateNotice}>
          📋 No checklist tasks defined yet. Add tasks to guide the technician on site.
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0.75,
            mb: 1.5,
            maxHeight: '180px',
            overflowY: 'auto',
            pr: 0.5,
          }}
        >
          {safeItems?.map((item, idx) => (
            <Box
              key={item?.id || idx}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: '6px 10px',
                borderRadius: '6px',
                backgroundColor: item?.checked
                  ? 'rgba(46, 125, 50, 0.08)'
                  : '#f8fafc',
                border: `1px solid ${
                  item?.checked ? '#c8e6c9' : '#e2e8f0'
                }`,
              }}
            >
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  minWidth: 20,
                  borderRadius: '50%',
                  backgroundColor: item?.checked ? '#2e7d32' : '#1976d2',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                }}
              >
                {item?.checked ? '✓' : idx + 1}
              </Box>
              <Typography
                variant="body2"
                sx={{
                  flex: 1,
                  fontSize: '0.78rem',
                  color: item?.checked ? '#2e7d32' : '#334155',
                  textDecoration: item?.checked ? 'line-through' : 'none',
                }}
              >
                {item?.text || ''}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      <Button
        id="manage-checklist-btn"
        variant="outlined"
        fullWidth
        size="small"
        onClick={onManageClick}
        className={styles.dashboardPrimaryButton}
      >
        📋 {safeItems.length > 0 ? 'Manage Checklist Tasks' : '+ Add Checklist Tasks'}
      </Button>
    </Box>
  );
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
  const [prevProps, setPrevProps] = useState({ open, controlledItems, jobNotes, jobId });
  const [draftItems, setDraftItems] = useState<DispatchChecklistItem[]>(() => {
    if (controlledItems !== undefined) return controlledItems;
    if (jobNotes) return parseChecklistFromNotes(jobNotes, jobId);
    return [];
  });
  const [newItemText, setNewItemText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (
    prevProps.open !== open ||
    prevProps.controlledItems !== controlledItems ||
    prevProps.jobNotes !== jobNotes ||
    prevProps.jobId !== jobId
  ) {
    setPrevProps({ open, controlledItems, jobNotes, jobId });
    if (open) {
      if (controlledItems !== undefined) {
        setDraftItems(controlledItems);
      } else if (jobNotes) {
        setDraftItems(parseChecklistFromNotes(jobNotes, jobId));
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
  const [searchParams] = useSearchParams();
  const urlJobId = searchParams.get('jobId') || searchParams.get('highlight');
  const urlDate = searchParams.get('date');

  const { user } = useAuthenticator((context) => [context.user]);
  const profileUser = user as ProfileUser | undefined;

  // Ã¢â€â‚¬Ã¢â€â‚¬ Layout & Selection State Architecture Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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

  // Synchronize state resets when URL parameters change
  const [prevUrlState, setPrevUrlState] = useState({ urlJobId, urlDate });
  if (prevUrlState.urlJobId !== urlJobId || prevUrlState.urlDate !== urlDate) {
    setPrevUrlState({ urlJobId, urlDate });
    setUserSelectedRequestId(undefined);
    setUserRightPanelOpen(undefined);
    setUserSelectedDate(undefined);
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Dispatcher Checklist Modal state Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const [checklistModalOpen, setChecklistModalOpen] = useState(false);
  const [checklistModalJobId, setChecklistModalJobId] = useState<string | null>(null);
  const [checklistDraftItems, setChecklistDraftItems] = useState<
    DispatchChecklistItem[]
  >([]);

  // Ã¢â€â‚¬Ã¢â€â‚¬ Create Technician Modal state Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const [createTechModalOpen, setCreateTechModalOpen] = useState(false);

  // Ã¢â€â‚¬Ã¢â€â‚¬ Delete Service Request Modal state Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [jobIdToDelete, setJobIdToDelete] = useState<string | null>(null);

  const adminDisplayName =
    profileUser?.attributes?.name ||
    profileUser?.attributes?.given_name ||
    (profileUser?.signInDetails?.loginId
      ? profileUser.signInDetails.loginId.split('@')[0]
      : '') ||
    profileUser?.username ||
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

  // Filter scheduled jobs by selectedDate and attach serviceType & client metadata
  const filteredJobs = useMemo(() => {
    return scheduledJobs
      .filter((job) => {
        const jobDate = job.scheduledDate || getTodayString();
        return jobDate === selectedDate;
      })
      .map((job) => {
        const req = serviceRequests.find((r) => r.id === job.serviceRequestId);
        const serviceType =
          req?.service ||
          (job as unknown as { serviceType?: string; service?: string }).serviceType ||
          (job as unknown as { service?: string }).service ||
          '';
        const clientName =
          req?.client ||
          (job as unknown as { clientName?: string; client?: string }).clientName ||
          (job as unknown as { client?: string }).client ||
          'Unknown';
        return {
          ...job,
          serviceType,
          service_name: serviceType,
          clientName,
        };
      });
  }, [scheduledJobs, selectedDate, serviceRequests]);

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
      const existingReq = serviceRequests.find(
        (r) => r.id === matchedJob.serviceRequestId
      );
      if (existingReq) return existingReq;

      // Fallback synthesis from matched ScheduledJob data so the right-side inspection panel always displays
      const synthesizedReq: ServiceRequest = {
        id: matchedJob.serviceRequestId || matchedJob.id || selectedRequest,
        client:
          (matchedJob as any).clientName ||
          (matchedJob as any).client ||
          'Client',
        service:
          (matchedJob as any).serviceType ||
          (matchedJob as any).service ||
          (matchedJob as any).service_name ||
          'Scheduled Service',
        location:
          (matchedJob as any).location ||
          (matchedJob as any).address ||
          'On Site',
        requestTime:
          (matchedJob as any).requestTime ||
          `${matchedJob.startHour || 9}:00`,
        estimatedDuration:
          (matchedJob as any).estimatedDuration ||
          `${matchedJob.duration || 1} hr`,
        priority: ((matchedJob as any).priority as any) || 'medium',
        type: ((matchedJob as any).type as any) || 'Scheduled',
        status: (matchedJob.status as any) || 'Assigned',
        notes: matchedJob.notes || '',
        assignedTechnicianId: matchedJob.techId || null,
      };
      return synthesizedReq;
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

  // Linked scheduled job for checklist manager and inspection details
  const rightPanelJob = useMemo(() => {
    if (!selectedServiceReq && !selectedRequest) return null;
    const targetId = selectedServiceReq?.id || selectedRequest;
    return (
      scheduledJobs.find(
        (j) =>
          j.id === selectedRequest ||
          j.serviceRequestId === selectedRequest ||
          j.id === targetId ||
          j.serviceRequestId === targetId ||
          (selectedServiceReq &&
            (j.serviceRequestId === selectedServiceReq.id ||
              j.id === selectedServiceReq.id))
      ) || null
    );
  }, [selectedServiceReq, selectedRequest, scheduledJobs]);

  // Parse notes and local caches to get technician comments and photos
  const techFeedback = useMemo(() => {
    const job = rightPanelJob || selectedServiceReq;
    if (!job) return null;

    let comment = '';
    let photos: Array<{ id: string; url: string; name: string }> = [];

    if (job.notes) {
      if (job.notes.startsWith('CHECKLIST:')) {
        // Plain checklist prefix, comments/photos might be in localStorage
      } else {
        try {
          const parsed = JSON.parse(job.notes);
          if (parsed && typeof parsed === 'object') {
            if (typeof parsed.comment === 'string') comment = parsed.comment;
            if (Array.isArray(parsed.photos)) photos = parsed.photos;
            else if (Array.isArray(parsed.technicianPhotos)) photos = parsed.technicianPhotos;
          }
        } catch {
          // If not valid JSON, treat raw notes as a technician comment
          if (!job.notes.startsWith('CHECKLIST:')) {
            comment = job.notes;
          }
        }
      }
    }

    // Check localStorage fallback if empty
    const jId = job.id || (job as any).serviceRequestId;
    if (!comment && jId) {
      try {
        const cachedComment = localStorage.getItem(`comment_job_${jId}`);
        if (cachedComment) comment = cachedComment;
      } catch {
        // Ignore storage access issues
      }
    }
    if ((!photos || photos.length === 0) && jId) {
      try {
        const cachedPhotos = localStorage.getItem(`photos_job_${jId}`);
        if (cachedPhotos) {
          const parsed = JSON.parse(cachedPhotos);
          if (Array.isArray(parsed)) photos = parsed;
        }
      } catch {
        // Ignore storage access issues
      }
    }

    if (!comment && photos.length === 0) {
      return null;
    }

    return { comment, photos };
  }, [rightPanelJob, selectedServiceReq]);

  // Selected job related relations state (photos, comments feed, checklist items)
  const [selectedJobRelations, setSelectedJobRelations] = useState<{
    technicianPhotos: JobPhoto[];
    comments: JobComment[];
    checklistItems: DispatchChecklistItem[];
  } | null>(null);
  const [isLoadingRelations, setIsLoadingRelations] = useState<boolean>(false);

  // Trigger data fetching for selected job relations whenever selection changes
  useEffect(() => {
    if (!selectedRequest) {
      setSelectedJobRelations(null);
      return;
    }

    let isMounted = true;
    setIsLoadingRelations(true);

    const fetchRelations = async () => {
      try {
        const jobWithRelations = await scheduledJobAPI.getJobWithRelations(selectedRequest);
        if (isMounted) {
          setSelectedJobRelations({
            technicianPhotos: jobWithRelations?.technicianPhotos || [],
            comments: jobWithRelations?.comments || [],
            checklistItems: jobWithRelations?.checklistItems || [],
          });
          setIsLoadingRelations(false);
        }
      } catch (err) {
        console.error('Error fetching job relations for right panel:', err);
        if (isMounted) {
          const fallbackPopulated = populateJobRelations(
            rightPanelJob || selectedServiceReq,
            selectedServiceReq
          );
          setSelectedJobRelations({
            technicianPhotos: fallbackPopulated?.technicianPhotos || [],
            comments: fallbackPopulated?.comments || [],
            checklistItems: fallbackPopulated?.checklistItems || [],
          });
          setIsLoadingRelations(false);
        }
      }
    };

    fetchRelations();

    return () => {
      isMounted = false;
    };
  }, [selectedRequest, scheduledJobs, serviceRequests, rightPanelJob, selectedServiceReq]);

  // Get selected client details
  const selectedClient = useMemo(() => {
    if (!selectedServiceReq) return null;
    return clients.find((c) => c.name === selectedServiceReq.client) || null;
  }, [selectedServiceReq, clients]);

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
        (job) =>
          job.serviceRequestId === selectedServiceReq.id ||
          job.id === selectedServiceReq.id ||
          job.id === selectedRequest ||
          job.serviceRequestId === selectedRequest
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

      const reqExistsInSr = serviceRequests.some(
        (r) => r.id === selectedServiceReq.id
      );
      if (reqExistsInSr) {
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
      }

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

        const effectiveTechId =
          editStatus === 'Unassigned'
            ? null
            : selectedServiceReq.assignedTechnicianId || associated?.techId;
        if (effectiveTechId) {
          const tech =
            technicians.find((t) => t.id === effectiveTechId) ||
            (await resolveTechnicianForJob(effectiveTechId, technicians));
          const dynamicTechEmail = tech?.email?.trim();
          if (dynamicTechEmail && tech) {
            sendTechnicianJobUpdateNotification({
              technicianName: tech.name,
              technicianEmail: dynamicTechEmail,
              technicianId: effectiveTechId,
              job: {
                id: selectedServiceReq.id,
                service: editService,
                client: client?.name || selectedServiceReq.client,
                location: editLocation,
                type: editType,
                priority: editPriority,
                status: editStatus,
                scheduledDate: associated?.scheduledDate,
                requestTime: selectedServiceReq.requestTime,
                estimatedDuration: selectedServiceReq.estimatedDuration,
                notes: editNotes,
              },
              changesSummary: `Status updated to ${editStatus}, Service: ${editService}`,
              cachedTechnicians: technicians,
              senderName: adminDisplayName,
            }).catch((err) =>
              console.error('[DispatchCenter] Failed to send technician update email:', err)
            );
          }
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
        (job) => job.serviceRequestId === targetId || job.id === targetId
      );
      if (associated) {
        await deleteScheduledJob(associated.id!);
      }

      if (serviceRequests.some((r) => r.id === targetId)) {
        await deleteServiceRequest(targetId);
      }

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
    setChecklistDraftItems(parseChecklistFromNotes(jobNotes, jobId));
    setChecklistModalJobId(jobId);
    setChecklistModalOpen(true);
  };

  const handleChecklistSave = async () => {
    if (!checklistModalJobId) return;
    try {
      const currentJob = scheduledJobs.find((j) => j.id === checklistModalJobId);
      const currentReq = serviceRequests.find((r) => r.id === checklistModalJobId);

      let updatedNotes = `CHECKLIST:${JSON.stringify(checklistDraftItems)}`;
      const sourceNotes = currentJob?.notes || currentReq?.notes;
      if (sourceNotes) {
        try {
          const parsed = JSON.parse(sourceNotes);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            updatedNotes = JSON.stringify({
              ...parsed,
              checklist: checklistDraftItems,
              checklistItems: checklistDraftItems,
            });
          }
        } catch {
          // Keep CHECKLIST: format
        }
      }

      if (currentJob) {
        await updateScheduledJob(checklistModalJobId, {
          notes: updatedNotes,
        });
      } else if (currentReq) {
        await updateServiceRequest(checklistModalJobId, {
          notes: updatedNotes,
        });
      } else {
        try {
          await updateScheduledJob(checklistModalJobId, {
            notes: updatedNotes,
          });
        } catch {
          await updateServiceRequest(checklistModalJobId, {
            notes: updatedNotes,
          });
        }
      }

      try {
        localStorage.setItem(
          `checklist_job_${checklistModalJobId}`,
          JSON.stringify(checklistDraftItems)
        );
      } catch {
        // Ignore storage restrictions
      }

      // Update active relations state immediately
      setSelectedJobRelations((prev) => ({
        technicianPhotos: prev?.technicianPhotos || [],
        comments: prev?.comments || [],
        checklistItems: checklistDraftItems,
      }));

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

  // Ã¢â€â‚¬Ã¢â€â‚¬ Drag & Drop Handlers with Intact Schema Transfer Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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

        try {
          const tech =
            technicians.find((t) => t.id === techId) ||
            (await resolveTechnicianForJob(techId, technicians));
          const dynamicTechEmail = tech?.email?.trim();
          if (dynamicTechEmail && tech) {
            sendTechnicianJobAssignmentNotification({
              technicianName: tech.name,
              technicianEmail: dynamicTechEmail,
              technicianId: techId,
              job: {
                id: request.id,
                service: request.service,
                client: request.client,
                location: request.location,
                type: request.type,
                priority: request.priority,
                status: 'Assigned',
                scheduledDate: selectedDate,
                requestTime: `${startHour}:00`,
                estimatedDuration: request.estimatedDuration || '2 hours',
                notes: request.notes,
              },
              cachedTechnicians: technicians,
              senderName: adminDisplayName,
            }).catch((err) =>
              console.error('[DispatchCenter] Failed to send technician assignment email:', err)
            );
          }
        } catch (techNotifyErr) {
          console.error('[DispatchCenter] Error preparing technician assignment email:', techNotifyErr);
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

        const relatedReq = serviceRequests.find(
          (r) => r.id === job.serviceRequestId
        );
        const clientName = relatedReq?.client || '';

        try {
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

        try {
          const tech =
            technicians.find((t) => t.id === techId) ||
            (await resolveTechnicianForJob(techId, technicians));
          const dynamicTechEmail = tech?.email?.trim();
          if (dynamicTechEmail && tech) {
            const isReassigned = job.techId !== techId;
            if (isReassigned) {
              sendTechnicianJobAssignmentNotification({
                technicianName: tech.name,
                technicianEmail: dynamicTechEmail,
                technicianId: techId,
                job: {
                  id: job.serviceRequestId || job.id,
                  service: relatedReq?.service || 'Scheduled Job',
                  client: clientName,
                  location: relatedReq?.location,
                  status: 'Assigned',
                  scheduledDate: selectedDate,
                  requestTime: `${startHour}:00`,
                  estimatedDuration: relatedReq?.estimatedDuration || `${job.duration || 2} hours`,
                  notes: job.notes || relatedReq?.notes,
                },
                cachedTechnicians: technicians,
                senderName: adminDisplayName,
              }).catch((err) =>
                console.error('[DispatchCenter] Failed to send technician reassignment email:', err)
              );
            } else {
              sendTechnicianJobUpdateNotification({
                technicianName: tech.name,
                technicianEmail: dynamicTechEmail,
                technicianId: techId,
                job: {
                  id: job.serviceRequestId || job.id,
                  service: relatedReq?.service || 'Scheduled Job',
                  client: clientName,
                  location: relatedReq?.location,
                  status: 'Assigned',
                  scheduledDate: selectedDate,
                  requestTime: `${startHour}:00`,
                  estimatedDuration: relatedReq?.estimatedDuration || `${job.duration || 2} hours`,
                  notes: job.notes || relatedReq?.notes,
                },
                changesSummary: `Rescheduled to ${selectedDate} at ${startHour}:00`,
                cachedTechnicians: technicians,
                senderName: adminDisplayName,
              }).catch((err) =>
                console.error('[DispatchCenter] Failed to send technician reschedule email:', err)
              );
            }
          }
        } catch (techNotifyErr) {
          console.error('[DispatchCenter] Error preparing technician drop update email:', techNotifyErr);
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
    <AppLayout
      hideSubHeader
      activePage="dashboard"
      fullWidth
      noScroll
    >
      <Box
        className={styles.dashboardRoot}
        sx={{
          flex: 1,
          minHeight: 0,
          height: 'calc(100vh - 48px)',
          maxHeight: 'calc(100vh - 48px)',
          pt: 0,
          pb: 0,
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
      {/* â”€â”€ Left Panel - Service Queue (320px) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
              <Box className={styles.dashboardPanelPendingRequestWrap}>
                <Typography variant="caption" className={styles.dashboardCaption}>
                  {srLoading
                    ? 'Loading...'
                    : `${pendingRequests.length} pending requests`}
                </Typography>
              </Box>  
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
                          {formatJobNumber(request, scheduledJobs)}
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

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Center Panel - Scheduling Matrix (Flexible) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
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
                        const canonicalId = getCanonicalJobId(job, scheduledJobs);
                        const jobIdentifier = canonicalId || job.serviceRequestId || job.id || '';
                        const isSelected =
                          selectedRequest === jobIdentifier ||
                          selectedRequest === canonicalId ||
                          selectedRequest === job.id ||
                          selectedRequest === job.serviceRequestId;
                        const isHighlighted =
                          urlJobId === jobIdentifier ||
                          urlJobId === canonicalId ||
                          urlJobId === job.id ||
                          urlJobId === job.serviceRequestId;

                        return (
                          <Box
                            key={job.id}
                            draggable
                            onDragStart={(event) =>
                              handleDragStart(event, 'job', job.id!)
                            }
                            onDragEnd={handleDragEnd}
                            onClick={() => handleJobSelect(canonicalId || job.serviceRequestId || job.id)}
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
                            title={`${formatJobNumber(job, scheduledJobs)} — ${
                              (job.serviceType || job.service_name)
                                ? `${job.serviceType || job.service_name} | `
                                : ''
                            }${job.clientName || 'Unknown'}`}
                          >
                            <Typography
                              variant="caption"
                              className={styles.dashboardJobId}
                            >
                              {formatJobNumber(job, scheduledJobs)}
                            </Typography>
                            {(job.serviceType || job.service_name) && (
                              <Typography
                                variant="caption"
                                className={styles.dashboardJobService}
                              >
                                {job.serviceType || job.service_name}
                              </Typography>
                            )}
                            <Typography
                              variant="caption"
                              className={styles.dashboardJobClient}
                            >
                              {job.clientName ||
                                serviceRequests.find(
                                  (r) => r.id === job.serviceRequestId
                                )?.client ||
                                'Unknown'}
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

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Right Panel - Work Order Details (400px) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <Box
        className={`${styles.dashboardSidePanel} ${styles.dashboardRightPanel} ${
          rightPanelOpen
            ? styles.dashboardRightPanelOpen
            : styles.dashboardRightPanelClosed
        }`}
        sx={{
          height: '100%',
          maxHeight: '100%',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {rightPanelOpen && (
          <Box
            key={selectedServiceReq?.id || selectedRequest || 'no-selection'}
            className={styles.dashboardRightPanelInner}
            sx={{
              height: '100%',
              maxHeight: '100%',
              minHeight: 0,
              flex: '1 1 0%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxSizing: 'border-box',
            }}
          >
            {/* Header */}
            <Box
              className={styles.dashboardPanelHeader}
              sx={{ flexShrink: 0, boxSizing: 'border-box' }}
            >
              <Box
                className={`${styles.dashboardRowBetween} ${styles.dashboardRequestHeader}`}
              >
                <Typography variant="h6" className={styles.dashboardTitle}>
                  Work Order Details
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setRightPanelOpen(false)}
                  sx={{ color: '#666', p: 0.5 }}
                  aria-label="Close details panel"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
              <Typography variant="caption" className={styles.dashboardCaption}>
                {formatJobNumber(selectedServiceReq || rightPanelJob || selectedRequest, scheduledJobs) || 'No request selected'}
              </Typography>
            </Box>

            {/* Details Content */}
            <Box
              className={styles.dashboardDetailsContent}
              sx={{
                flex: '1 1 0%',
                flexGrow: 1,
                flexShrink: 1,
                flexBasis: '0%',
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
                boxSizing: 'border-box',
              }}
            >
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

                  {(() => {
                    const activeChecklistItems =
                      selectedJobRelations?.checklistItems ??
                      (rightPanelJob?.notes || selectedServiceReq?.notes
                        ? parseChecklistFromNotes(
                            rightPanelJob?.notes || selectedServiceReq?.notes,
                            rightPanelJob?.id || selectedServiceReq?.id
                          )
                        : []);

                    const activeComments =
                      selectedJobRelations?.comments && selectedJobRelations.comments.length > 0
                        ? selectedJobRelations.comments
                        : techFeedback?.comment
                        ? [
                            {
                              id: 'c-1',
                              text: techFeedback.comment,
                              author: 'Technician',
                              createdAt: '',
                            },
                          ]
                        : [];

                    const activePhotos =
                      selectedJobRelations?.technicianPhotos &&
                      selectedJobRelations.technicianPhotos.length > 0
                        ? selectedJobRelations.technicianPhotos
                        : techFeedback?.photos || [];

                    return (
                      <>
                        <DispatcherWorkChecklistModule
                          items={activeChecklistItems}
                          isLoading={isLoadingRelations}
                          onManageClick={() =>
                            openChecklistModal(
                              rightPanelJob?.id || selectedServiceReq?.id || selectedRequest || '',
                              rightPanelJob?.notes || selectedServiceReq?.notes
                            )
                          }
                        />

                        <Divider className={styles.dashboardDividerLg} />

                        <JobCommentsFeed
                          comments={activeComments}
                          isLoading={isLoadingRelations}
                        />

                        <JobMediaGallery
                          photos={activePhotos}
                          isLoading={isLoadingRelations}
                          onPhotoClick={(url) => setPreviewImageUrl(url)}
                        />

                        <Divider className={styles.dashboardDividerLg} />
                      </>
                    );
                  })()}

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
                        Map Preview
                      </Typography>
                    </Box>
                  </Box>

                  <Box className={styles.dashboardActions} sx={{ pb: 3 }}>
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
    </AppLayout>
  );
};

export default DispatchCenter;
