import { useState, useMemo } from 'react';
import { Box, IconButton, Card, CardContent, Typography, Chip, Avatar, Divider, Alert, Snackbar, Button, CircularProgress, TextField, Select, MenuItem, FormControl, InputLabel, Dialog, OutlinedInput } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PhoneIcon from '@mui/icons-material/Phone';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CloseIcon from '@mui/icons-material/Close';
import { useServiceRequests, useTechnicians, useScheduledJobs, useClients } from '../hooks/useDispatchData';
import GroupsIcon from '@mui/icons-material/Groups';
import DashboardIcon from '@mui/icons-material/Dashboard';
import Tooltip from '@mui/material/Tooltip';
import styles from '../styles/UI/Dashboard.module.scss';
import DispatchCenter from '../components/DispatchCenter';

// Hours for the schedule grid (7 AM to 7 PM)
const hours = Array.from({ length: 12 }, (_, i) => i + 7);

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

// ── Dispatcher checklist item shape (matches FieldExecution's ChecklistItem) ──
interface DispatchChecklistItem {
  id: string;
  text: string;
  checked: boolean; // field name matches FieldExecution's ChecklistItem.checked
}

export default function ThreePanelPage() {
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'success' | 'error' | 'warning'>('success');
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // ── Dispatcher Checklist Modal state ────────────────────────────────────────
  const [checklistModalOpen, setChecklistModalOpen] = useState(false);
  const [checklistModalJobId, setChecklistModalJobId] = useState<string | null>(null);
  const [checklistDraftItems, setChecklistDraftItems] = useState<DispatchChecklistItem[]>([]);

  const getScheduleByDate = (date: string) => {
    console.log(`Fetching schedule for date: ${date}`);
    // Future API integration: getScheduleByDate(date).then(...)
  };

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate || getTodayString());
    getScheduleByDate(newDate || getTodayString());
  };

  // Fetch real data from Amplify
  const { serviceRequests, loading: srLoading, error: srError, updateServiceRequest, deleteServiceRequest } = useServiceRequests();
  const { technicians, loading: techLoading, error: techError } = useTechnicians();
  const { scheduledJobs, createScheduledJob, updateScheduledJob, deleteScheduledJob } = useScheduledJobs();
  const { clients, loading: clLoading } = useClients();

  // Filter scheduled jobs by selectedDate (defaulting legacy jobs to today's date)
  const filteredJobs = useMemo(() => {
    return scheduledJobs.filter((job) => {
      const jobDate = job.scheduledDate || getTodayString();
      return jobDate === selectedDate;
    });
  }, [scheduledJobs, selectedDate]);

  // Filter service requests to show only those that are unassigned in the queue
  const pendingRequests = useMemo(() => {
    return serviceRequests.filter((req) => req.status === 'Unassigned');
  }, [serviceRequests]);

  // Get selected service request helper
  const selectedServiceReq = useMemo(() => {
    if (!selectedRequest) return null;
    const sr = serviceRequests.find((r) => r.id === selectedRequest);
    if (sr) return sr;
    const job = scheduledJobs.find((j) => j.id === selectedRequest);
    if (job) {
      return serviceRequests.find((r) => r.id === job.serviceRequestId) || null;
    }
    return null;
  }, [selectedRequest, serviceRequests, scheduledJobs]);

  // Edit states for service request
  const [editService, setEditService] = useState('');
  const [editPriority, setEditPriority] = useState<'high' | 'medium' | 'low'>('low');
  const [editLocation, setEditLocation] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editType, setEditType] = useState<'Emergency' | 'WebRequest' | 'Scheduled'>('Scheduled');
  const [editStatus, setEditStatus] = useState<'Unassigned' | 'Assigned' | 'InProgress' | 'Completed'>('Unassigned');
  const [syncedServiceReqKey, setSyncedServiceReqKey] = useState<string | null>(null);
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
    setEditPriority((selectedServiceReq.priority) || 'low');
    setEditLocation(selectedServiceReq.location || '');
    setEditNotes(selectedServiceReq.notes || '');
    setEditType((selectedServiceReq.type) || 'Scheduled');
    setEditStatus((selectedServiceReq.status) || 'Unassigned');
  } else if (!selectedServiceReq && syncedServiceReqKey) {
    setSyncedServiceReqKey(null);
  }

  // Find associated scheduled job if it exists for the selected service request
  const associatedJob = useMemo(() => {
    if (!selectedServiceReq) return null;
    return scheduledJobs.find((job) => job.serviceRequestId === selectedServiceReq.id);
  }, [selectedServiceReq, scheduledJobs]);

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

  // Get the scheduled job linked to the currently selected service request (used by checklist modal)
  const rightPanelJob = useMemo(() => {
    if (!selectedServiceReq) return null;
    return scheduledJobs.find((j) => j.serviceRequestId === selectedServiceReq.id) || null;
  }, [selectedServiceReq, scheduledJobs]);

  // Get technician name helper
  const getTechnicianName = (techId: string): string => {
    return technicians.find((t) => t.id === techId)?.name || 'Unknown';
  };

  // Get technician color helper
  const getTechnicianColor = (techId: string): string => {
    return technicians.find((t) => t.id === techId)?.color || '#9e9e9e';
  };

  // Get avatar initials
  const getAvatarInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const getPriorityColor = (priority: string | null | undefined) => {
    switch (priority) {
      case 'high': return '#f44336';
      case 'medium': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#9e9e9e';
    }
  };

  const handleRequestClick = (requestId: string) => {
    setSelectedRequest(requestId);
    setRightPanelOpen(true);
  };

  const handleSave = async () => {
    if (!selectedServiceReq) {
      showNotification_('No work order selected', 'error');
      return;
    }

    try {
      setIsSaving(true);

      // Find associated scheduled job if it exists
      const associatedJob = scheduledJobs.find(
        (job) => job.serviceRequestId === selectedServiceReq.id
      );

      // Check if status is set to Assigned/InProgress/Completed but no job is scheduled
      if (!associatedJob && (editStatus === 'Assigned' || editStatus === 'InProgress' || editStatus === 'Completed')) {
        showNotification_('Cannot set status to Assigned, In Progress, or Completed without scheduling the job on the timeline first.', 'error');
        return;
      }

      // Update service request in Amplify
      await updateServiceRequest(selectedServiceReq.id!, {
        service: editService,
        priority: editPriority,
        location: editLocation,
        notes: editNotes,
        type: editType,
        status: editStatus,
        assignedTechnicianId: editStatus === 'Unassigned' ? null : selectedServiceReq.assignedTechnicianId,
      });

      // Sync or delete scheduled job based on status
      if (associatedJob) {
        if (editStatus === 'Unassigned') {
          await deleteScheduledJob(associatedJob.id!);
        } else {
          let jobStatus: 'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled' = 'Scheduled';
          if (editStatus === 'InProgress') jobStatus = 'InProgress';
          else if (editStatus === 'Completed') jobStatus = 'Completed';
          
          await updateScheduledJob(associatedJob.id!, {
            status: jobStatus,
            notes: editNotes,
          });
        }
      }

      showNotification_('Work order saved successfully!', 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save work order';
      showNotification_(`Save failed: ${errorMessage}. Please try again.`, 'error');
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedServiceReq) {
      showNotification_('No work order selected to delete', 'error');
      return;
    }

    if (window.confirm('Are you sure you want to delete this service request? This will also remove any scheduled assignments.')) {
      try {
        setIsSaving(true);

        // Find associated job
        const associatedJob = scheduledJobs.find(
          (job) => job.serviceRequestId === selectedServiceReq.id
        );
        if (associatedJob) {
          await deleteScheduledJob(associatedJob.id!);
        }

        // Delete request
        await deleteServiceRequest(selectedServiceReq.id!);

        // Clear selection and close right panel
        setSelectedRequest(null);
        setRightPanelOpen(false);
        showNotification_('Work order deleted successfully.', 'success');
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Delete failed';
        showNotification_(`Failed to delete: ${errorMsg}`, 'error');
        console.error('Delete error:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const showNotification_ = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotification(true);
  };

  // ── Dispatcher Checklist Helpers ─────────────────────────────────────────────

  /** Parse the CHECKLIST: encoded notes string back into an item array. */
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

  /** Open the checklist editor modal, seeding draft from the job's existing notes. */
  const openChecklistModal = (jobId: string, jobNotes?: string | null) => {
    setChecklistDraftItems(parseChecklistFromNotes(jobNotes));
    setChecklistModalJobId(jobId);
    setChecklistModalOpen(true);
  };

  /**
   * Persist the draft checklist to the ScheduledJob via updateScheduledJob.
   * Uses the CHECKLIST: prefix protocol that FieldExecution already decodes.
   * Also clears the per-job localStorage entry so the technician immediately
   * receives the dispatcher's updated template on next load.
   */
  const handleChecklistSave = async () => {
    if (!checklistModalJobId) return;
    try {
      const payload = JSON.stringify(checklistDraftItems);
      await updateScheduledJob(checklistModalJobId, {
        notes: `CHECKLIST:${payload}`,
      });
      // Bust stale technician-progress cache so FieldExecution picks up the new template
      localStorage.removeItem(`checklist_job_${checklistModalJobId}`);
      showNotification_('✅ Checklist saved! Technician will see the updated steps immediately.', 'success');
      setChecklistModalOpen(false);
    } catch (err) {
      console.error('Failed to save checklist:', err);
      showNotification_('Failed to save checklist. Please try again.', 'error');
    }
  };

  const handleDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    type: 'request' | 'job',
    id: string
  ) => {
    setIsDragging(true);
    event.dataTransfer.setData(
      'application/json',
      JSON.stringify({ type, id })
    );
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
    const data = JSON.parse(
      event.dataTransfer.getData('application/json') || '{}'
    );

    try {
      if (data.type === 'request') {
        const request = serviceRequests.find((r) => r.id === data.id);
        if (!request) {
          showNotification_('Request not found', 'error');
          return;
        }

        // Check if there is an existing scheduled job for this request
        const existingJob = scheduledJobs.find((j) => j.serviceRequestId === data.id);

        if (existingJob) {
          // Update the existing scheduled job
          await updateScheduledJob(existingJob.id!, {
            techId,
            startHour,
            scheduledDate: selectedDate,
          });
        } else {
          // Create scheduled job
          await createScheduledJob({
            techId,
            serviceRequestId: data.id,
            startHour,
            duration: 2,
            status: 'Scheduled',
            scheduledDate: selectedDate,
          });
        }

        // Update service request status and technician
        await updateServiceRequest(data.id, {
          status: 'Assigned',
          assignedTechnicianId: techId,
        });

        showNotification_(`Job ${data.id} assigned to ${getTechnicianName(techId)}`, 'success');
      }

      if (data.type === 'job') {
        const job = scheduledJobs.find((j) => j.id === data.id);
        if (!job) {
          showNotification_('Job not found', 'error');
          return;
        }

        // Update scheduled job with new technician, time, and date
        await updateScheduledJob(data.id, {
          techId,
          startHour,
          scheduledDate: selectedDate,
        });

        // Also update service request's technician and status to keep them in sync
        await updateServiceRequest(job.serviceRequestId, {
          status: 'Assigned',
          assignedTechnicianId: techId,
        });

        showNotification_(`Job reassigned to ${getTechnicianName(techId)}`, 'success');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Drop operation failed';
      showNotification_(errorMsg, 'error');
      console.error('Drop error:', error);
    }
  };

  return (
    <Box className={styles.dashboardRoot}>
      {/* Left Panel - Queue Panel (320px) */}
      <Box
       className={`${styles.dashboardSidePanel} ${styles.dashboardLeftPanel} ${
  leftPanelOpen
    ? styles.dashboardLeftPanelOpen
    : styles.dashboardLeftPanelClosed
}`}
      >
        {leftPanelOpen && (
          <>
            {/* Header */}
            <Box className={styles.dashboardPanelHeader}>
            <Box className={styles.dashboardPanelHeadingWrap}>
  

              {/* Section Title */}
              <Typography
                variant="h6"
                className={styles.dashboardTitle}
              >
                Service Queue
              </Typography>
            </Box>
              <Typography variant="caption" className={styles.dashboardCaption}>
                {srLoading ? 'Loading...' : `${pendingRequests.length} pending requests`}
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
                  inputLabel: { shrink: true }
                }}
              />
              {srError && (
                <Alert severity="error" className={styles.dashboardAlertError}>
                  {srError}
                </Alert>
              )}
            </Box>

            {/* Queue Cards */}
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
                    onDragStart={(event) => handleDragStart(event, 'request', request.id!)}
                    onClick={() => handleRequestClick(request.id!)}
                    className={`${styles.dashboardRequestCard} ${
                      selectedRequest === request.id ? styles.dashboardRequestCardSelected : styles.dashboardRequestCardIdle
                    }`}
                  >
                    <CardContent className={styles.dashboardCardContent}>
                      {/* Header Row */}
                      <Box className={`${styles.dashboardRowBetween} ${styles.dashboardRequestHeader}`}>
                        <Typography variant="subtitle2" className={styles.dashboardRequestId}>
                          {request.id}
                        </Typography>
                        <Chip
                          label={request.type}
                          size="small"
                          icon={request.type === 'Emergency' ? <PriorityHighIcon /> : undefined}
                          className={`${styles.dashboardRequestTypeChip} ${
                            request.type === 'Emergency' ? styles.dashboardEmergencyChip : styles.dashboardStandardChip
                          }`}
                        />
                      </Box>

                      {/* Client Name */}
                      <Typography variant="body2" className={styles.dashboardRequestClient}>
                        {request.client}
                      </Typography>

                      {/* Service */}
                      <Typography variant="body2" className={styles.dashboardRequestService}>
                        {request.service}
                      </Typography>

                      {/* Location */}
                      <Box className={styles.dashboardIconTextRow}>
                        <LocationOnIcon className={styles.dashboardRequestIcon} />
                        <Typography variant="caption" className={styles.dashboardRequestMeta}>
                          {request.location}
                        </Typography>
                      </Box>

                      {/* Time and Duration */}
                      <Box className={`${styles.dashboardRowBetween} ${styles.dashboardRequestFooter}`}>
                        <Box className={styles.dashboardIconTextRow}>
                          <AccessTimeIcon className={styles.dashboardRequestIcon} />
                          <Typography variant="caption" className={styles.dashboardRequestMeta}>
                            {request.requestTime}
                          </Typography>
                        </Box>
                        <Chip
                          label={request.estimatedDuration}
                          size="small"
                          className={styles.dashboardDurationChip}
                        />
                      </Box>

                      {/* Priority Indicator */}
                      <Box
                        className={styles.dashboardPriorityBar}
                        sx={{ backgroundColor: getPriorityColor(request.priority) }}
                      />
                    </CardContent>
                  </Card>
                ))
              )}
            </Box>
          </>
        )}
      </Box>

      {/* Center Panel - Chrono-Matrix (Flexible) */}
      <Box className={styles.dashboardCenterPanel}>
        {/* Header */}
        <Box className={styles.dashboardCenterHeader}>
         {/* {!isAmplifyConfigured && (
            <Alert severity="info" className={styles.dashboardInfoAlert}>
              Running in <strong>Offline Demo Mode</strong> using local browser storage. Run <code>npx amplify sandbox</code> to deploy the AWS Amplify backend.
            </Alert>
          )}*/}
           {/* Navigation Buttons */}
          <Box className={styles.dashboardNavRow}>
          {/* <Tooltip title="Open Technician View" arrow>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EngineeringIcon className={styles.dashboardNavIcon} />}
                  onClick={() => {
                    sessionStorage.setItem('previousView', 'ADMIN');
                    window.location.href = '/technician';
                  }}
                  className={styles.dashboardCompactButton}
                >
                  Tech
                </Button>
              </Tooltip> */}

              <Tooltip title="Open Client CRM" arrow>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<GroupsIcon className={styles.dashboardNavIcon} />}
                  onClick={() => (window.location.href = '/crm')}
                  className={styles.dashboardCompactButton}
                >
                  Client
                </Button>
              </Tooltip>

              <Tooltip title="Open Technician Dashboard" arrow>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DashboardIcon className={styles.dashboardNavIcon} />}
                  onClick={() => (window.location.href = '/tech-dashboard')}
                  className={styles.dashboardCompactButton}
                >
                  Dashboard
                </Button>
              </Tooltip>

              <Tooltip title="Open User Management" arrow>
                <Button
                  id="user-management-nav-btn"
                  variant="outlined"
                  size="small"
                  startIcon={<PersonAddIcon className={styles.dashboardNavIcon} />}
                  onClick={() => (window.location.href = '/admin/users')}
                  className={styles.dashboardCompactButton}
                >
                  Users
                </Button>
              </Tooltip>
          </Box>    
          <Box className={`${styles.dashboardRowBetween} ${styles.dashboardCenterTitleRow}`}>
            <Typography variant="h5" className={styles.dashboardCenterTitle}>
              Dispatch Command Center
            </Typography>
            <Chip 
              label={new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
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

        {/* Schedule Grid with padding */}
        <Box className={styles.dashboardGridScroll}>
          <Box className={styles.dashboardGridInner}>
            {/* Time Header Row */}
            <Box className={styles.dashboardTimeHeaderRow}>
              <Box className={styles.dashboardTechSpacer} />
              {hours.map((hour) => (
                <Box
                  key={hour}
                  className={styles.dashboardTimeHeaderCell}
                >
                  {hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`}
                </Box>
              ))}
            </Box>

            {/* Technician Rows or Empty State */}
            {techLoading ? (
              <Box className={`${styles.dashboardLoadingBox} ${styles.dashboardLoadingBoxLarge}`}>
                <CircularProgress size={40} />
              </Box>
            ) : techError ? (
              <Alert severity="error" className={styles.dashboardErrorAlertSpaced}>
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
                  You don't have any technicians available for dispatch. Add staff to your system to start scheduling jobs.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<PersonAddIcon />}
                  className={`${styles.dashboardPrimaryButton} ${styles.dashboardAddTechButton}`}
                  onClick={() => {
                    showNotification_('Redirect to staff management (feature not yet implemented)', 'warning');
                  }}
                >
                  Add Technicians
                </Button>
              </Box>
            ) : (
              technicians.map((tech) => (
                <Box
                  key={tech.id}
                  className={styles.dashboardTechRow}
                >
                  {/* Technician Info */}
                  <Box className={styles.dashboardTechInfo}>
                    <Avatar
                      className={styles.dashboardTechAvatar}
                      sx={{ backgroundColor: tech.color || '#9e9e9e' }}
                    >
                      {tech.avatar || getAvatarInitials(tech.name || 'U')}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" className={styles.dashboardTechName}>
                        {tech.name}
                      </Typography>
                      <Typography variant="caption" className={styles.dashboardTechSpecialty}>
                        {tech.specialty}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Time Slots */}
                  <Box className={styles.dashboardTimeSlots}>
                    {hours.map((hour) => (
                      <Box
                        key={hour}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => handleDrop(event, tech.id!, hour)}
                        className={styles.dashboardTimeSlot}
                      />
                    ))}

                    {/* Scheduled Jobs */}
                    {filteredJobs
                      .filter((job) => job.techId === tech.id)
                      .map((job, idx) => (
                        <Box
                          key={idx}
                          draggable
                          onDragStart={(event) => handleDragStart(event, 'job', job.id!)}
                          onDragEnd={handleDragEnd}
                          onClick={() => {
                            if (!isDragging) {
                              // Set ADMIN as previous view so FieldExecution back button returns here
                              sessionStorage.setItem('previousView', 'ADMIN');
                              handleRequestClick(job.serviceRequestId!);
                            }
                          }}
                          className={`${styles.dashboardScheduledJob} ${
                            isDragging ? styles.dashboardScheduledJobGrabbing : styles.dashboardScheduledJobGrab
                          }`}
                          sx={{
                            left: `${((job.startHour - 7) / 12) * 100}%`,
                            width: `${(job.duration / 12) * 100}%`,
                            backgroundColor: tech.color || getTechnicianColor(tech.id!),
                          }}
                        >
                          <Typography
                            variant="caption"
                            className={styles.dashboardJobId}
                          >
                            {job.serviceRequestId}
                          </Typography>
                          <Typography
                            variant="caption"
                            className={styles.dashboardJobClient}
                          >
                            {serviceRequests.find((r) => r.id === job.serviceRequestId)?.client || 'Unknown'}
                          </Typography>
                        </Box>
                      ))}
                  </Box>
                </Box>
              ))
            )}
          </Box>

          {/* Instructions */}
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

      {/* Right Panel - Detail Inspection Drawer (400px) */}
      <Box
        className={`${styles.dashboardSidePanel} ${styles.dashboardRightPanel} ${
          rightPanelOpen
            ? styles.dashboardRightPanelOpen
            : styles.dashboardRightPanelClosed
        }`}
      >
        {rightPanelOpen && (
          <>
            {/* Header */}
            <Box className={styles.dashboardPanelHeader}>
              <Box className={`${styles.dashboardRowBetween} ${styles.dashboardRequestHeader}`}>
                <Typography variant="h6" className={styles.dashboardTitle}>
                  Work Order Details
                </Typography>
              </Box>
              <Typography variant="caption" className={styles.dashboardCaption}>
                {selectedRequest || 'No request selected'}
              </Typography>
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
                  {/* Work Order Settings (Editable) */}
                  <Box className={styles.dashboardDetailsSection}>
                    <Typography variant="subtitle2" className={styles.dashboardSectionTitle}>
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
                          <InputLabel shrink className={styles.dashboardCompactLabel} sx={compactSelectLabelSx}>Priority</InputLabel>
                          <Select
                            displayEmpty
                            value={editPriority}
                            label="Priority"
                            input={<OutlinedInput label="Priority" notched />}
                            onChange={(e) => setEditPriority(e.target.value)}
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
                          <InputLabel shrink className={styles.dashboardCompactLabel} sx={compactSelectLabelSx}>Request Type</InputLabel>
                          <Select
                            displayEmpty
                            value={editType}
                            label="Request Type"
                            input={<OutlinedInput label="Request Type" notched />}
                            onChange={(e) => setEditType(e.target.value)}
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
                        <InputLabel shrink className={styles.dashboardCompactLabel} sx={compactSelectLabelSx}>Status</InputLabel>
                        <Select
                          displayEmpty
                          value={editStatus}
                          label="Status"
                          input={<OutlinedInput label="Status" notched />}
                          onChange={(e) => setEditStatus(e.target.value)}
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

                  {/* Client Info (Read-only Contact Info) */}
                  {selectedClient ? (
                    <>
                      <Box className={styles.dashboardContactSection}>
                        <Typography variant="subtitle2" className={styles.dashboardSectionTitle}>
                          Contact Information
                        </Typography>
                        <Box className={styles.dashboardContactRow}>
                          <Avatar className={styles.dashboardClientAvatar}>
                            {getAvatarInitials(selectedClient.name || 'C')}
                          </Avatar>
                          <Box>
                            <Typography variant="body1" className={styles.dashboardClientName}>
                              {selectedClient.name}
                            </Typography>
                            <Chip label="Client" size="small" className={styles.dashboardClientChip} />
                          </Box>
                        </Box>
                        <Divider className={styles.dashboardContactDivider} />
                        <Box className={styles.dashboardContactRow}>
                          <PhoneIcon className={styles.dashboardContactIcon} />
                          <Typography variant="body2" className={styles.dashboardContactText}>
                            {selectedClient.phone || 'N/A'}
                          </Typography>
                        </Box>
                        <Box className={`${styles.dashboardContactRow} ${styles.dashboardContactRowStart}`}>
                          <LocationOnIcon className={`${styles.dashboardContactIcon} ${styles.dashboardContactIconStart}`} />
                          <Typography variant="body2" className={`${styles.dashboardContactText} ${styles.dashboardContactTextFlex}`}>
                            {selectedClient.address || 'N/A'}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Account Status */}
                      <Box className={styles.dashboardContactSection}>
                        <Typography variant="subtitle2" className={styles.dashboardSectionTitle}>
                          Account Status
                        </Typography>
                        <Card className={selectedClient.outstandingBalance ? styles.dashboardBalanceCardDue : styles.dashboardBalanceCardClear}>
                          <CardContent className={styles.dashboardBalanceContent}>
                            <Box className={styles.dashboardRowBetween}>
                              <Box className={styles.dashboardContactRow}>
                                <AttachMoneyIcon className={`${styles.dashboardBalanceIcon} ${
                                  selectedClient.outstandingBalance ? styles.dashboardBalanceIconDue : styles.dashboardBalanceIconClear
                                }`} />
                                <Typography variant="body2" className={styles.dashboardBalanceLabel}>
                                  Outstanding Balance
                                </Typography>
                              </Box>
                              <Typography
                                variant="h6"
                                className={`${styles.dashboardBalanceValue} ${
                                  selectedClient.outstandingBalance ? styles.dashboardBalanceValueDue : styles.dashboardBalanceValueClear
                                }`}
                              >
                                ${selectedClient.outstandingBalance || 0}
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      </Box>

                      {/* Preferences */}
                      {selectedClient.preferenceNotes && (
                        <Box className={styles.dashboardPreferenceSection}>
                          <Typography variant="subtitle2" className={styles.dashboardSectionTitle}>
                            Customer Preferences
                          </Typography>
                          <Card className={styles.dashboardPreferenceCard}>
                            <CardContent className={styles.dashboardBalanceContent}>
                              <Typography variant="body2" className={styles.dashboardPreferenceCopy}>
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
                      <Alert severity="warning" className={styles.dashboardWarningAlert}>
                        No associated client profile found for "{selectedServiceReq.client}".
                      </Alert>
                    </Box>
                  )}

                  {/* ── Dispatcher Checklist Manager ─────────────────────── */}
                  {rightPanelJob && (
                    <Box className={styles.dashboardDetailsSection}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', my: 1 }}>
                        <Typography variant="subtitle2" className={styles.dashboardSectionTitle}>
                          Job Checklist
                        </Typography>
                        <Chip
                          label={`${parseChecklistFromNotes(rightPanelJob.notes).length || 'Default'} steps`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Box>
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 1, lineHeight: 1.4 }}>
                        Define the exact steps the technician must tick off before completing this job.
                      </Typography>
                      <Button
                        id="manage-checklist-btn"
                        variant="outlined"
                        fullWidth
                        size="small"
                        onClick={() => openChecklistModal(rightPanelJob.id!, rightPanelJob.notes)}
                        className={styles.dashboardPrimaryButton} 
                      >
                        📋 Manage Job Checklist
                      </Button>
                    </Box>
                  )}

                  {/* Technician Feedback Section (Conditional) */}
                  {techFeedback && (techFeedback.comment || (techFeedback.photos && techFeedback.photos.length > 0)) && (
                    <>
                      <Box className={styles.dashboardDetailsSection}>
                        <Typography variant="subtitle2" className={styles.dashboardSectionTitle}>
                          Technician Feedback
                        </Typography>

                        {/* Technician Comment */}
                        {techFeedback.comment && (
                          <Box sx={{ mb: 1.5 }}>
                            <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, mb: 0.5, color: '#666' }}>
                              Technician Notes
                            </Typography>
                            <textarea
                              value={techFeedback.comment}
                              readOnly
                              className={styles.techCommentTextarea}
                            />
                          </Box>
                        )}

                        {/* Technician Photos */}
                        {techFeedback.photos && techFeedback.photos.length > 0 && (
                          <Box>
                            <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, mb: 0.5, color: '#666' }}>
                              Job Photos ({techFeedback.photos.length})
                            </Typography>
                            <Box sx={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {techFeedback.photos.map((photo: { id: string; url: string; name: string }, index: number) => (
                                <Box
                                  key={photo.id || index}
                                  onClick={() => setPreviewImageUrl(photo.url)}
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
                                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                    }
                                  }}
                                >
                                  <img
                                    src={photo.url}
                                    alt={photo.name}
                                    className={styles.techFeedbackPhoto}
                                  />
                                </Box>
                              ))}
                            </Box>
                          </Box>
                        )}
                      </Box>
                      <Divider className={styles.dashboardDividerLg} />
                    </>
                  )}

                  {/* Map Preview Placeholder */}
                  <Box className={styles.dashboardRoutePreview}>
                    <Typography variant="subtitle2" className={styles.dashboardSectionTitle}>
                      Route Preview
                    </Typography>
                    <Box className={styles.dashboardMapPreview}>
                      <Typography variant="body2" className={styles.dashboardMapCopy}>
                        🗺️ Map Preview
                      </Typography>
                    </Box>
                  </Box>

                  {/* Actions (Save / Delete) */}
                  <Box className={styles.dashboardActions}>
                    <Button
                      variant="contained"
                      onClick={handleSave}
                      disabled={isSaving}
                      startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                      fullWidth
                      className={styles.dashboardPrimaryButton}
                    >
                      {isSaving ? 'Saving...' : 'Save Work Order'}
                    </Button>

                    <Button
                      variant="outlined"
                      color="error"
                      onClick={handleDelete}
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
            </Box>          </Box>
          </>
        )}
      </Box>

      {/* Left Panel Toggle Button - Outside container to remain always accessible */}
      <IconButton
        onClick={() => setLeftPanelOpen(!leftPanelOpen)}
        className={`${styles.dashboardToggle} ${styles.dashboardToggleLeft} ${
          leftPanelOpen ? styles.dashboardToggleLeftOpen : styles.dashboardToggleLeftClosed
        }`}
      >
        {leftPanelOpen ? <ChevronLeftIcon className={styles.dashboardToggleIcon} /> : <ChevronRightIcon className={styles.dashboardToggleIcon} />}
      </IconButton>

      {/* Right Panel Toggle Button - Outside container to remain always accessible */}
      <IconButton
        onClick={() => setRightPanelOpen(!rightPanelOpen)}
        className={`${styles.dashboardToggle} ${styles.dashboardToggleRight} ${
          rightPanelOpen ? styles.dashboardToggleRightOpen : styles.dashboardToggleRightClosed
        }`}
      >
        {rightPanelOpen ? <ChevronRightIcon className={styles.dashboardToggleIcon} /> : <ChevronLeftIcon className={styles.dashboardToggleIcon} />}
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

      {/* ═══════════════════════════════════════════════════════════════════════
          DISPATCHER CHECKLIST EDITOR MODAL (DispatchCenter)
          Allows the dispatcher to define per-job steps that sync to FieldExecution.
      ═══════════════════════════════════════════════════════════════════════ */}
      <DispatchCenter
        open={checklistModalOpen}
        onClose={() => setChecklistModalOpen(false)}
        jobId={checklistModalJobId}
        items={checklistDraftItems}
        onItemsChange={setChecklistDraftItems}
        onSave={handleChecklistSave}
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
            }
          }}
        >
          <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
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
                }
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Dialog>
      )}
    </Box>
  );
}
