import { useState, useMemo, useEffect } from 'react';
import { Box, IconButton, Card, CardContent, Typography, Chip, Avatar, Divider, Alert, Snackbar, Button, CircularProgress, TextField, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
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
import { useServiceRequests, useTechnicians, useScheduledJobs, useClients } from '../hooks/useDispatchData';
import { isAmplifyConfigured } from '../services/api';

// Hours for the schedule grid (7 AM to 7 PM)
const hours = Array.from({ length: 12 }, (_, i) => i + 7);

const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

  // Synchronize edit states with selected service request
  useEffect(() => {
    if (selectedServiceReq) {
      setEditService(selectedServiceReq.service || '');
      setEditPriority((selectedServiceReq.priority) || 'low');
      setEditLocation(selectedServiceReq.location || '');
      setEditNotes(selectedServiceReq.notes || '');
      setEditType((selectedServiceReq.type) || 'Scheduled');
      setEditStatus((selectedServiceReq.status) || 'Unassigned');
    }
  }, [selectedServiceReq]);

  // Get selected client details
  const selectedClient = useMemo(() => {
    if (!selectedServiceReq) return null;
    return clients.find((c) => c.name === selectedServiceReq.client) || null;
  }, [selectedServiceReq, clients]);

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
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#f0f2f5',
        pt: 1,
        pb: 1,
        boxSizing: 'border-box',
      }}
    >
      {/* Left Panel - Queue Panel (320px) */}
      <Box
        sx={{
          width: leftPanelOpen ? '320px' : '0px',
          minWidth: leftPanelOpen ? '320px' : '0px',
          height: '100%',
          backgroundColor: '#ffffff',
          borderRight: leftPanelOpen ? '1px solid #e0e0e0' : 'none',
          transition: 'width 0.3s ease-in-out, min-width 0.3s ease-in-out',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {leftPanelOpen && (
          <>
            {/* Header */}
            <Box sx={{ p: 1.5, borderBottom: '2px solid #e0e0e0', backgroundColor: '#fafafa' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: '0.95rem' }}>
                  Service Queue
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => window.location.href = '/technician'}
                  sx={{
                    fontSize: '0.65rem',
                    textTransform: 'none',
                    fontWeight: 600,
                    py: 0.2,
                    px: 1,
                  }}
                >
                  Technician View
                </Button>
              </Box>
              <Typography variant="caption" sx={{ color: '#666', fontSize: '0.7rem' }}>
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
                sx={{ mt: 1.5 }}
                fullWidth
                size="small"
                slotProps={{
                  inputLabel: { shrink: true }
                }}
              />
              {srError && (
                <Alert severity="error" sx={{ mt: 1, fontSize: '0.7rem', py: 0.5 }}>
                  {srError}
                </Alert>
              )}
            </Box>

            {/* Queue Cards */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 1.5, py: 2 }}>
              {srLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                  <CircularProgress size={40} />
                </Box>
              ) : pendingRequests.length === 0 ? (
                <Typography variant="body2" sx={{ color: '#999', textAlign: 'center', py: 2 }}>
                  No pending requests
                </Typography>
              ) : (
                pendingRequests.map((request) => (
                  <Card
                    key={request.id}
                    draggable
                    onDragStart={(event) => handleDragStart(event, 'request', request.id!)}
                    onClick={() => handleRequestClick(request.id!)}
                    sx={{
                      mb: 1.5,
                      cursor: 'pointer',
                      border: selectedRequest === request.id ? '2px solid #1976d2' : '1px solid #e0e0e0',
                      transition: 'all 0.2s',
                      '&:hover': {
                        boxShadow: 3,
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                      {/* Header Row */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: '0.75rem' }}>
                          {request.id}
                        </Typography>
                        <Chip
                          label={request.type}
                          size="small"
                          icon={request.type === 'Emergency' ? <PriorityHighIcon sx={{ fontSize: '0.9rem' }} /> : undefined}
                          sx={{
                            height: 18,
                            fontSize: '0.6rem',
                            backgroundColor: request.type === 'Emergency' ? '#ffebee' : '#e3f2fd',
                            color: request.type === 'Emergency' ? '#c62828' : '#1565c0',
                            fontWeight: 600,
                          }}
                        />
                      </Box>

                      {/* Client Name */}
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.3, color: '#333', fontSize: '0.8rem' }}>
                        {request.client}
                      </Typography>

                      {/* Service */}
                      <Typography variant="body2" sx={{ mb: 0.5, color: '#555', fontSize: '0.75rem' }}>
                        {request.service}
                      </Typography>

                      {/* Location */}
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.3 }}>
                        <LocationOnIcon sx={{ fontSize: 12, mr: 0.4, color: '#666' }} />
                        <Typography variant="caption" sx={{ color: '#666', fontSize: '0.7rem' }}>
                          {request.location}
                        </Typography>
                      </Box>

                      {/* Time and Duration */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <AccessTimeIcon sx={{ fontSize: 12, mr: 0.4, color: '#666' }} />
                          <Typography variant="caption" sx={{ color: '#666', fontSize: '0.7rem' }}>
                            {request.requestTime}
                          </Typography>
                        </Box>
                        <Chip
                          label={request.estimatedDuration}
                          size="small"
                          sx={{
                            height: 16,
                            fontSize: '0.6rem',
                            backgroundColor: '#f5f5f5',
                          }}
                        />
                      </Box>

                      {/* Priority Indicator */}
                      <Box
                        sx={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: 4,
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

      {/* Center Panel - Chrono-Matrix (Flexible) */}
      <Box
        sx={{
          flex: 1,
          height: '100%',
          backgroundColor: '#ffffff',
          overflow: 'auto',
          transition: 'all 0.3s ease-in-out',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, pb: 1.5, borderBottom: '2px solid #e0e0e0', backgroundColor: '#fafafa' }}>
          {!isAmplifyConfigured && (
            <Alert severity="info" sx={{ mb: 1.5, fontSize: '0.75rem', py: 0.5 }}>
              Running in <strong>Offline Demo Mode</strong> using local browser storage. Run <code>npx amplify sandbox</code> to deploy the AWS Amplify backend.
            </Alert>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.3 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: '1.1rem' }}>
              Dispatch Command Center
            </Typography>
            <Chip 
              label={new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              color="primary"
              variant="outlined"
              size="small"
              sx={{ fontWeight: 600, fontSize: '0.75rem' }}
            />
          </Box>
          <Typography variant="body2" sx={{ color: '#666', fontSize: '0.8rem' }}>
            Drag and drop service requests to schedule technicians
          </Typography>
        </Box>

        {/* Schedule Grid with padding */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          <Box sx={{ minWidth: 900 }}>
            {/* Time Header Row */}
            <Box sx={{ display: 'flex', mb: 0.5 }}>
              <Box sx={{ width: 150, flexShrink: 0 }} />
              {hours.map((hour) => (
                <Box
                  key={hour}
                  sx={{
                    flex: 1,
                    minWidth: 80,
                    textAlign: 'center',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    color: '#666',
                    pb: 0.5,
                  }}
                >
                  {hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`}
                </Box>
              ))}
            </Box>

            {/* Technician Rows or Empty State */}
            {techLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                <CircularProgress size={40} />
              </Box>
            ) : techError ? (
              <Alert severity="error" sx={{ mt: 2 }}>
                Failed to load technicians: {techError}
              </Alert>
            ) : technicians.length === 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '400px',
                  backgroundColor: '#f9f9f9',
                  borderRadius: 2,
                  border: '2px dashed #e0e0e0',
                  p: 3,
                }}
              >
                <PersonAddIcon sx={{ fontSize: 48, color: '#ccc', mb: 2 }} />
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, color: '#1a1a1a', mb: 1, textAlign: 'center', fontSize: '1rem' }}
                >
                  No Technicians on Duty
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: '#666', mb: 2.5, textAlign: 'center', fontSize: '0.85rem' }}
                >
                  You don't have any technicians available for dispatch. Add staff to your system to start scheduling jobs.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<PersonAddIcon />}
                  sx={{
                    backgroundColor: '#2196f3',
                    color: 'white',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    padding: '0.6rem 1.5rem',
                    '&:hover': {
                      backgroundColor: '#1976d2',
                    },
                  }}
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
                  sx={{
                    display: 'flex',
                    mb: 0.5,
                    borderRadius: 1,
                    overflow: 'hidden',
                    border: '1px solid #e0e0e0',
                    backgroundColor: '#fafafa',
                  }}
                >
                  {/* Technician Info */}
                  <Box
                    sx={{
                      width: 150,
                      flexShrink: 0,
                      p: 1,
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: '#fff',
                      borderRight: '1px solid #e0e0e0',
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 28,
                        height: 28,
                        mr: 0.8,
                        backgroundColor: tech.color || '#9e9e9e',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      {tech.avatar || getAvatarInitials(tech.name || 'U')}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem', lineHeight: 1.2 }}>
                        {tech.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#666', fontSize: '0.65rem' }}>
                        {tech.specialty}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Time Slots */}
                  <Box sx={{ display: 'flex', flex: 1, position: 'relative' }}>
                    {hours.map((hour) => (
                      <Box
                        key={hour}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => handleDrop(event, tech.id!, hour)}
                        sx={{
                          flex: 1,
                          minWidth: 80,
                          minHeight: 50,
                          borderRight: '1px solid #e0e0e0',
                          backgroundColor: '#fff',
                          transition: 'background-color 0.2s',
                          '&:hover': {
                            backgroundColor: '#f0f7ff',
                            cursor: 'pointer',
                          },
                        }}
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
                              handleRequestClick(job.serviceRequestId!);
                            }
                          }}
                          sx={{
                            position: 'absolute',
                            left: `${((job.startHour - 7) / 12) * 100}%`,
                            width: `${(job.duration / 12) * 100}%`,
                            top: 4,
                            bottom: 4,
                            backgroundColor: tech.color || getTechnicianColor(tech.id!),
                            borderRadius: 1,
                            p: 0.5,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            cursor: isDragging ? 'grabbing' : 'grab',
                            boxShadow: 1,
                            '&:hover': {
                              boxShadow: 3,
                            },
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'white',
                              fontWeight: 700,
                              fontSize: '0.65rem',
                              lineHeight: 1.2,
                            }}
                          >
                            {job.serviceRequestId}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'rgba(255,255,255,0.9)',
                              fontSize: '0.6rem',
                              lineHeight: 1.2,
                            }}
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
          <Box sx={{ mt: 2, p: 1.5, backgroundColor: '#e3f2fd', borderRadius: 1, borderLeft: '4px solid #2196f3' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: '#1565c0', fontSize: '0.8rem' }}>
              💡 Quick Guide
            </Typography>
            <Typography variant="caption" sx={{ color: '#1976d2', fontSize: '0.7rem' }}>
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
        sx={{
          width: rightPanelOpen ? '400px' : '0px',
          minWidth: rightPanelOpen ? '400px' : '0px',
          height: '100%',
          backgroundColor: '#ffffff',
          borderLeft: rightPanelOpen ? '1px solid #e0e0e0' : 'none',
          transition: 'width 0.3s ease-in-out, min-width 0.3s ease-in-out',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {rightPanelOpen && (
          <>
            {/* Header */}
            <Box sx={{ p: 1.5, borderBottom: '2px solid #e0e0e0', backgroundColor: '#fafafa' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: '0.95rem' }}>
                  Work Order Details
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: '#666', fontSize: '0.7rem' }}>
                {selectedRequest || 'No request selected'}
              </Typography>
                       {/* Details Content */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              {clLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                  <CircularProgress size={40} />
                </Box>
              ) : !selectedServiceReq ? (
                <Typography variant="body2" sx={{ color: '#999', textAlign: 'center', py: 2 }}>
                  Select a service request to view details
                </Typography>
              ) : (
                <>
                  {/* Work Order Settings (Editable) */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#1a1a1a', fontSize: '0.85rem' }}>
                      Work Order Settings
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <TextField
                        label="Service Description"
                        value={editService}
                        onChange={(e) => setEditService(e.target.value)}
                        fullWidth
                        size="small"
                        disabled={isSaving}
                      />

                      <TextField
                        label="Location"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        fullWidth
                        size="small"
                        disabled={isSaving}
                      />

                      <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Priority</InputLabel>
                          <Select
                            value={editPriority}
                            label="Priority"
                            onChange={(e) => setEditPriority(e.target.value)}
                            disabled={isSaving}
                          >
                            <MenuItem value="low">Low</MenuItem>
                            <MenuItem value="medium">Medium</MenuItem>
                            <MenuItem value="high">High</MenuItem>
                          </Select>
                        </FormControl>

                        <FormControl fullWidth size="small">
                          <InputLabel>Request Type</InputLabel>
                          <Select
                            value={editType}
                            label="Request Type"
                            onChange={(e) => setEditType(e.target.value)}
                            disabled={isSaving}
                          >
                            <MenuItem value="Emergency">Emergency</MenuItem>
                            <MenuItem value="WebRequest">Web Request</MenuItem>
                            <MenuItem value="Scheduled">Scheduled</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>

                      <FormControl fullWidth size="small">
                        <InputLabel>Status</InputLabel>
                        <Select
                          value={editStatus}
                          label="Status"
                          onChange={(e) => setEditStatus(e.target.value)}
                          disabled={isSaving}
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
                      />
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* Client Info (Read-only Contact Info) */}
                  {selectedClient ? (
                    <>
                      <Box sx={{ mb: 2.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#1a1a1a', fontSize: '0.85rem' }}>
                          Contact Information
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Avatar sx={{ width: 40, height: 40, mr: 1.5, backgroundColor: '#1976d2', fontSize: '0.8rem' }}>
                            {getAvatarInitials(selectedClient.name || 'C')}
                          </Avatar>
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                              {selectedClient.name}
                            </Typography>
                            <Chip label="Client" size="small" sx={{ height: 16, fontSize: '0.6rem', mt: 0.3 }} />
                          </Box>
                        </Box>
                        <Divider sx={{ my: 1 }} />
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.8 }}>
                          <PhoneIcon sx={{ fontSize: 14, mr: 0.8, color: '#666' }} />
                          <Typography variant="body2" sx={{ color: '#333', fontSize: '0.8rem' }}>
                            {selectedClient.phone || 'N/A'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 0.8 }}>
                          <LocationOnIcon sx={{ fontSize: 14, mr: 0.8, color: '#666', mt: 0.2 }} />
                          <Typography variant="body2" sx={{ color: '#333', flex: 1, fontSize: '0.8rem' }}>
                            {selectedClient.address || 'N/A'}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Account Status */}
                      <Box sx={{ mb: 2.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#1a1a1a', fontSize: '0.85rem' }}>
                          Account Status
                        </Typography>
                        <Card sx={{ backgroundColor: selectedClient.outstandingBalance ? '#fff3e0' : '#e8f5e9' }}>
                          <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <AttachMoneyIcon sx={{ fontSize: 18, mr: 0.8, color: selectedClient.outstandingBalance ? '#ff9800' : '#4caf50' }} />
                                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                                  Outstanding Balance
                                </Typography>
                              </Box>
                              <Typography variant="h6" sx={{ fontWeight: 700, color: selectedClient.outstandingBalance ? '#ff9800' : '#4caf50', fontSize: '0.95rem' }}>
                                ${selectedClient.outstandingBalance || 0}
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      </Box>

                      {/* Preferences */}
                      {selectedClient.preferenceNotes && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#1a1a1a', fontSize: '0.85rem' }}>
                            Customer Preferences
                          </Typography>
                          <Card sx={{ backgroundColor: '#f3e5f5' }}>
                            <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                              <Typography variant="body2" sx={{ color: '#333', fontSize: '0.8rem', lineHeight: 1.5 }}>
                                {selectedClient.preferenceNotes}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Box>
                      )}

                      <Divider sx={{ my: 2 }} />
                    </>
                  ) : (
                    <Box sx={{ mb: 2.5 }}>
                      <Alert severity="warning" sx={{ fontSize: '0.75rem', py: 0.5 }}>
                        No associated client profile found for "{selectedServiceReq.client}".
                      </Alert>
                    </Box>
                  )}

                  {/* Actions (Save / Delete) */}
                  <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Button
                      variant="contained"
                      onClick={handleSave}
                      disabled={isSaving}
                      startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                      fullWidth
                      sx={{
                        padding: '0.6rem 1rem',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        textTransform: 'none',
                      }}
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
                      sx={{
                        padding: '0.6rem 1rem',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        textTransform: 'none',
                      }}
                    >
                      Delete Work Order
                    </Button>
                  </Box>

                  {/* Map Preview Placeholder */}
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#1a1a1a', fontSize: '0.85rem' }}>
                      Route Preview
                    </Typography>
                    <Box
                      sx={{
                        height: 120,
                        backgroundColor: '#e0e0e0',
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography variant="body2" sx={{ color: '#666', fontSize: '0.8rem' }}>
                        🗺️ Map Preview
                      </Typography>
                    </Box>
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
        sx={{
          position: 'absolute',
          left: leftPanelOpen ? 'calc(320px - 16px)' : '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          backgroundColor: 'white',
          border: '1px solid #e0e0e0',
          zIndex: 1001,
          width: 32,
          height: 32,
          transition: 'left 0.3s ease-in-out',
          '&:hover': {
            backgroundColor: '#f5f5f5',
          },
        }}
      >
        {leftPanelOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
      </IconButton>

      {/* Right Panel Toggle Button - Outside container to remain always accessible */}
      <IconButton
        onClick={() => setRightPanelOpen(!rightPanelOpen)}
        sx={{
          position: 'absolute',
          right: rightPanelOpen ? 'calc(400px - 16px)' : '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          backgroundColor: 'white',
          border: '1px solid #e0e0e0',
          zIndex: 1001,
          width: 32,
          height: 32,
          transition: 'right 0.3s ease-in-out',
          '&:hover': {
            backgroundColor: '#f5f5f5',
          },
        }}
      >
        {rightPanelOpen ? <ChevronRightIcon /> : <ChevronLeftIcon />}
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
          sx={{ width: '100%', fontSize: '0.85rem' }}
        >
          {notificationMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}