import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from "react-router-dom";
import { useClients, useServiceRequests } from '../../hooks/useDispatchData';
import styles from '../../styles/UI/ClientRecord.module.scss';
import { IconButton, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

// Inline SVG Icons for zero-dependency consistency with FieldExecution
const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const MapIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default function ClientCRMRecord() {
  const { clients, updateClient, createClient, loading: loadingClients } = useClients();
  const { serviceRequests, createServiceRequest, updateServiceRequest, deleteServiceRequest, loading: loadingRequests } = useServiceRequests();

  // State
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showNewJobModal, setShowNewJobModal] = useState<boolean>(false);
  const [showNewClientModal, setShowNewClientModal] = useState<boolean>(false);
  const [showEditJobModal, setShowEditJobModal] = useState<boolean>(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState<boolean>(false);
  const [jobToDelete, setJobToDelete] = useState<any>(null);

  const navigate = useNavigate();
  
  // Form states
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    gps: '',
    outstandingBalance: '',
    preferenceNotes: '',
    notes: '',
  });

  const [newJobForm, setNewJobForm] = useState({
    service: '',
    type: 'Scheduled' as 'Scheduled' | 'Emergency' | 'WebRequest',
    priority: 'low' as 'high' | 'medium' | 'low',
    notes: '',
  });

  const [editJobForm, setEditJobForm] = useState({
    service: '',
    type: 'Scheduled' as 'Scheduled' | 'Emergency' | 'WebRequest',
    priority: 'low' as 'high' | 'medium' | 'low',
    notes: '',
  });

  const [newClientForm, setNewClientForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    gps: '37.7749, -122.4194',
    outstandingBalance: '0.00',
    preferenceNotes: '',
  });

  // Alerts
  const [successAlert, setSuccessAlert] = useState<string | null>(null);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);

  // Handle responsive layout checks
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 960);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const effectiveSelectedClientId = selectedClientId || clients[0]?.id || '';

  // Find currently selected client details
  const selectedClient = useMemo(() => {
    return clients.find((c) => c.id === effectiveSelectedClientId) || null;
  }, [clients, effectiveSelectedClientId]);

  // Parse GPS coordinates helper
  const parsedGPS = useMemo(() => {
    if (!selectedClient) return '37.7749, -122.4194';
    const match = selectedClient.notes?.match(/GPS:\s*([-\d.]+),\s*([-\d.]+)/);
    return match ? `${match[1]}, ${match[2]}` : '37.7749, -122.4194';
  }, [selectedClient]);

  const [syncedClientKey, setSyncedClientKey] = useState<string | null>(null);
  const selectedClientKey = selectedClient
    ? JSON.stringify([
        selectedClient.id,
        selectedClient.name,
        selectedClient.phone,
        selectedClient.email,
        selectedClient.address,
        selectedClient.city,
        selectedClient.state,
        selectedClient.zipCode,
        selectedClient.notes,
        selectedClient.outstandingBalance,
        selectedClient.preferenceNotes,
      ])
    : null;

  // Populate edit form when selected client changes
  if (selectedClient && selectedClientKey !== syncedClientKey) {
    const match = selectedClient.notes?.match(/GPS:\s*([-\d.]+),\s*([-\d.]+)/);
    const gpsVal = match ? `${match[1]}, ${match[2]}` : '37.7749, -122.4194';
    const rawNotes = selectedClient.notes?.replace(/GPS:\s*([-\d.]+),\s*([-\d.]+)\s*/g, '').trim() || '';

    setSyncedClientKey(selectedClientKey);
    setEditForm({
      name: selectedClient.name || '',
      phone: selectedClient.phone || '',
      email: selectedClient.email || '',
      address: selectedClient.address || '',
      city: selectedClient.city || '',
      state: selectedClient.state || '',
      zipCode: selectedClient.zipCode || '',
      gps: gpsVal,
      outstandingBalance: selectedClient.outstandingBalance || '0.00',
      preferenceNotes: selectedClient.preferenceNotes || '',
      notes: rawNotes,
    });
  } else if (!selectedClient && syncedClientKey) {
    setSyncedClientKey(null);
  }

  // Filter jobs (service requests) associated with the selected client
  const clientJobs = useMemo(() => {
    if (!selectedClient) return [];
    return serviceRequests.filter((job) => job.client === selectedClient.name);
  }, [serviceRequests, selectedClient]);

  // Apply search query and status filters
  const filteredJobs = useMemo(() => {
    return clientJobs.filter((job) => {
      const jobIdStr = job.id || '';
      const matchSearch =
        jobIdStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (job.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'COMPLETED' && job.status === 'Completed') ||
        (statusFilter === 'ACTIVE' && (job.status === 'InProgress' || job.status === 'Assigned' || job.status === 'Unassigned'));

      return matchSearch && matchStatus;
    });
  }, [clientJobs, searchQuery, statusFilter]);

  // Financial Metrics calculations
  const totalOutstanding = useMemo(() => {
    if (!selectedClient) return 0;
    return parseFloat(selectedClient.outstandingBalance || '0.00');
  }, [selectedClient]);

  const outstandingInvoicesCount = useMemo(() => {
    // Count active and completed requests that may have outstanding invoices
    if (totalOutstanding > 0) {
      const unpaidCount = clientJobs.filter(j => j.status !== 'Completed').length;
      return unpaidCount > 0 ? unpaidCount : 1;
    }
    return 0;
  }, [clientJobs, totalOutstanding]);

  const paymentStatus = useMemo(() => {
    if (!selectedClient) return 'GOOD';
    const balance = parseFloat(selectedClient.outstandingBalance || '0.00');
    if (balance <= 0) return 'PAID';
    if (balance > 300) return 'OVERDUE';
    return 'PENDING';
  }, [selectedClient]);

  // Handle Edit Profile Save
  const handleEditProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !selectedClient.id) return;

    try {
      const gpsLine = `GPS: ${editForm.gps}`;
      const finalNotes = editForm.notes.trim() ? `${editForm.notes.trim()}\n${gpsLine}` : gpsLine;

      await updateClient(selectedClient.id, {
        name: editForm.name,
        phone: editForm.phone,
        email: editForm.email,
        address: editForm.address,
        city: editForm.city,
        state: editForm.state,
        zipCode: editForm.zipCode,
        outstandingBalance: editForm.outstandingBalance,
        preferenceNotes: editForm.preferenceNotes,
        notes: finalNotes,
      });

      setSuccessAlert('Client profile updated successfully!');
      setShowEditModal(false);
      setTimeout(() => setSuccessAlert(null), 4000);
    } catch (err) {
      console.error(err);
      setErrorAlert('Failed to update client profile.');
      setTimeout(() => setErrorAlert(null), 4000);
    }
  };

  // Handle Quick Create Job
  const handleCreateJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    try {
      const clientAddress = [
        selectedClient.address,
        selectedClient.city,
        selectedClient.state,
        selectedClient.zipCode
      ].filter(Boolean).join(', ');

      await createServiceRequest({
        client: selectedClient.name,
        service: newJobForm.service,
        location: clientAddress || 'No site address specified',
        type: newJobForm.type,
        priority: newJobForm.priority,
        status: 'Unassigned',
        requestTime: '08:00 AM',
        estimatedDuration: '2 hours',
        notes: newJobForm.notes,
      });

      setSuccessAlert('New job created in the dispatch queue successfully!');
      setShowNewJobModal(false);
      setNewJobForm({
        service: '',
        type: 'Scheduled',
        priority: 'low',
        notes: '',
      });
      setTimeout(() => setSuccessAlert(null), 4000);
    } catch (err) {
      console.error(err);
      setErrorAlert('Failed to create new job.');
      setTimeout(() => setErrorAlert(null), 4000);
    }
  };

  // Handle Edit Job Click
  const handleEditJobClick = (job: any) => {
    setSelectedJob(job);
    setEditJobForm({
      service: job.service || '',
      type: job.type || 'Scheduled',
      priority: job.priority || 'low',
      notes: job.notes || '',
    });
    setShowEditJobModal(true);
  };

  // Handle Edit Job Submit
  const handleEditJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob || !selectedJob.id) return;
    try {
      await updateServiceRequest(selectedJob.id, {
        service: editJobForm.service,
        type: editJobForm.type,
        priority: editJobForm.priority,
        notes: editJobForm.notes,
      });
      setSuccessAlert('Job updated successfully!');
      setShowEditJobModal(false);
      setTimeout(() => setSuccessAlert(null), 4000);
    } catch (err) {
      console.error(err);
      setErrorAlert('Failed to update job.');
      setTimeout(() => setErrorAlert(null), 4000);
    }
  };

  // Handle Delete Job Click
  const handleDeleteJobClick = (job: any) => {
    setJobToDelete(job);
    setShowDeleteConfirmModal(true);
  };

  // Handle Delete Job Confirm
  const handleDeleteJobConfirm = async () => {
    if (!jobToDelete || !jobToDelete.id) return;
    try {
      await deleteServiceRequest(jobToDelete.id);
      setSuccessAlert('Job deleted successfully!');
      setShowDeleteConfirmModal(false);
      setJobToDelete(null);
      setTimeout(() => setSuccessAlert(null), 4000);
    } catch (err) {
      console.error(err);
      setErrorAlert('Failed to delete job.');
      setTimeout(() => setErrorAlert(null), 4000);
    }
  };

  // Handle Create Client
  const handleCreateClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const gpsLine = `GPS: ${newClientForm.gps}`;
      const finalNotes = newClientForm.preferenceNotes.trim() 
        ? `${newClientForm.preferenceNotes.trim()}\n${gpsLine}` 
        : gpsLine;

      const created = await createClient({
        name: newClientForm.name,
        phone: newClientForm.phone,
        email: newClientForm.email,
        address: newClientForm.address,
        city: newClientForm.city,
        state: newClientForm.state,
        zipCode: newClientForm.zipCode,
        outstandingBalance: newClientForm.outstandingBalance,
        preferenceNotes: newClientForm.preferenceNotes,
        notes: finalNotes,
      });

      if (created) {
        setSelectedClientId(created.id || '');
      }
      setSuccessAlert(`Client "${newClientForm.name}" created successfully!`);
      setShowNewClientModal(false);
      setNewClientForm({
        name: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        gps: '37.7749, -122.4194',
        outstandingBalance: '0.00',
        preferenceNotes: '',
      });
      setTimeout(() => setSuccessAlert(null), 4000);
    } catch (err) {
      console.error(err);
      setErrorAlert('Failed to create client.');
      setTimeout(() => setErrorAlert(null), 4000);
    }
  };

  // Generate a mock job amount for visual consistency with real invoicing systems
  const getJobAmount = (jobId: string, serviceName: string) => {
    // Generate a stable pseudorandom amount based on job details
    let sum = 0;
    const combined = jobId + serviceName;
    for (let i = 0; i < combined.length; i++) {
      sum += combined.charCodeAt(i);
    }
    return `$${((sum % 450) + 75).toFixed(2)}`;
  };



  return (
    <div className={styles.container}>
      {/* Header Status Bar */}
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <div className={styles.flexGap8}>
            <button
              onClick={() => navigate(-1)}
              className={styles.backButton}
              aria-label="Back to dashboard"
            >
              <BackIcon />
            </button>
            <h1 className={styles.headerTitle}>Client CRM Dashboard</h1>
          </div>

          <div className={styles.flexGap8}>
            {/* Client Selector dropdown */}
            {!loadingClients && clients.length > 0 && (
              <select
                value={effectiveSelectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className={styles.clientSelect}
              >
                {clients.map((c, index) => (
                  <option key={c.id || index} value={c.id || ''}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}

            {/* Quick add client button */}
            <button 
              onClick={() => setShowNewClientModal(true)} 
              className={styles.newClientBtn}
            >
              <PlusIcon />
              {!isMobile && 'NEW CLIENT'}
            </button>

            {/* User Management button */}
            <button
              onClick={() => window.location.href = '/admin/users'}
              className={styles.usersBtn}
              title="Open User Management"
            >
              <UsersIcon />
              {!isMobile && 'USERS'}
            </button>
          </div>
        </div>
      </header>

      {/* Alert Banners */}
      {successAlert && (
        <div className={styles.alertSuccess}>
          <span>{successAlert}</span>
          <button onClick={() => setSuccessAlert(null)}>×</button>
        </div>
      )}
      {errorAlert && (
        <div className={styles.alertError}>
          <span>{errorAlert}</span>
          <button onClick={() => setErrorAlert(null)}>×</button>
        </div>
      )}

      {/* Main CRM Workspace */}
      {loadingClients ? (
        <div className={styles.workspaceLoading}>
          Loading CRM records...
        </div>
      ) : clients.length === 0 ? (
        <div className={styles.noRecordsContainer}>
          <UsersIcon />
          <h2>No CRM Records Found</h2>
          <p>
            There are currently no clients registered in the system. Get started by adding your first client record.
          </p>
          <button
            onClick={() => setShowNewClientModal(true)}
            className={`${styles.buttonPrimary} ${styles.auto}`}
          >
            <PlusIcon /> Add First Client
          </button>
        </div>
      ) : !selectedClient ? (
        <div className={styles.workspaceLoading}>
          Please select a client from the dropdown menu.
        </div>
      ) : (
        <div className={styles.contentArea}>
          {/* Main Panel Area: Metrics & Job History */}
          <div className={styles.mainSection}>
            {/* Financial Summary metrics panel */}
            <div className={styles.card}>
              <div className={styles.sectionTitle}>
                <span>Financial Summary Panel</span>
                <span className={styles.sectionSubtitle}>Live billing data</span>
              </div>
              <div className={styles.metricGrid}>
                <div className={styles.metricCard}>
                  <div className={styles.detailLabel}>Outstanding Invoices</div>
                  <div className={`${styles.metricValue} ${outstandingInvoicesCount > 0 ? styles.orange : ''}`}>
                    {outstandingInvoicesCount}
                  </div>
                  <div className={styles.fontSize9Muted}>Unpaid Work Orders</div>
                </div>

                <div className={styles.metricCard}>
                  <div className={styles.detailLabel}>Overdue Balance</div>
                  <div className={`${styles.metricValue} ${totalOutstanding > 0 ? styles.red : styles.green}`}>
                    ${totalOutstanding.toFixed(2)}
                  </div>
                  <div className={styles.fontSize9Muted}>Billing Balance</div>
                </div>

                <div className={styles.metricCard}>
                  <div className={styles.detailLabel}>Payment Status</div>
                  <div className={styles.marginTop4}>
                    {paymentStatus === 'PAID' ? (
                      <span className={styles.pillPaid}>PAID / GOOD</span>
                    ) : paymentStatus === 'OVERDUE' ? (
                      <span className={styles.pillOverdue}>OVERDUE</span>
                    ) : (
                      <span className={styles.pillPending}>PENDING ({outstandingInvoicesCount})</span>
                    )}
                  </div>
                  <div className={styles.fontSize9Muted}>Account Standing</div>
                </div>
              </div>
            </div>

            {/* Job History Table */}
            <div className={styles.card}>
              <div className={styles.sectionTitle}>
                <span>Job History Table</span>
                <span className={styles.pillCount}>{clientJobs.length} Jobs Total</span>
              </div>
 
              {/* Search & filters bar */}
              <div className={styles.tableControls}>
                <div className={styles.searchInputWrapper}>
                  <div className={styles.searchIconPos}>
                    <SearchIcon />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by job ID, description, or notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>
 
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active (Assigned/InProgress)</option>
                  <option value="COMPLETED">Completed Only</option>
                </select>
              </div>
 
              {/* Table wrapper */}
              <div className={styles.tableWrapper}>
                {loadingRequests ? (
                  <div className={styles.textCenterMuted12}>
                    Syncing job details...
                  </div>
                ) : filteredJobs.length === 0 ? (
                  <div className={styles.textCenterMuted12Wide}>
                    No matching jobs found for this search/filter selection.
                  </div>
                ) : (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.th}>Job Number</th>
                        <th className={styles.th}>Date</th>
                        <th className={styles.th}>Service Type / Desc</th>
                        <th className={styles.th}>Status</th>
                        <th className={styles.th}>Total Amount</th>
                        <th className={styles.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredJobs.map((job, index) => {
                        const isCompleted = job.status === 'Completed';
                        const isActive = job.status === 'InProgress' || job.status === 'Assigned';
                        const formattedDate = job.createdAt 
                          ? new Date(job.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                          : 'Recent';
 
                        return (
                          <tr 
                            key={job.id || index} 
                            className={styles.trHover}
                          >
                            <td className={`${styles.td} ${styles.jobNumber}`}>{job.id || 'N/A'}</td>
                            <td className={styles.td}>{formattedDate}</td>
                            <td className={`${styles.td} ${styles.service}`}>{job.service}</td>
                            <td className={styles.td}>
                              {isCompleted ? (
                                <span className={styles.pillCompleted}>COMPLETED</span>
                              ) : isActive ? (
                                <span className={styles.pillActive}>ACTIVE</span>
                              ) : (
                                <span className={styles.pillUnassigned}>UNASSIGNED</span>
                              )}
                            </td>
                            <td className={`${styles.td} ${styles.amount}`}>
                              {getJobAmount(job.id || '', job.service)}
                            </td>
                            <td className={styles.td}>
                              <div className={styles.actionButtons}>
                                <Tooltip title="Edit" arrow>
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditJobClick(job);
                                    }}
                                    className={styles.actionBtnEdit}
                                    sx={{
                                      color: '#4fc3f7', /* Soft blue for high contrast on dark backgrounds */
                                      '&:hover': {
                                        color: '#81d4fa',
                                        backgroundColor: 'rgba(79, 195, 247, 0.08)',
                                      },
                                    }}
                                  >
                                    <EditIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete" arrow>
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteJobClick(job);
                                    }}
                                    className={styles.actionBtnDelete}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
 
          {/* Sidebar Area: Profile Information & Quick Actions */}
          <div className={styles.sidebarSection}>
            {/* Client Profile Card */}
            <div className={styles.card}>
              <div className={styles.sectionTitle}>
                <span>Client Profile Card</span>
                <button
                  onClick={() => setShowEditModal(true)}
                  className={styles.editProfileBtn}
                  title="Edit Profile"
                >
                  <EditIcon />
                </button>
              </div>
 
              <div className={styles.profileDetail}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Client Name</span>
                  <span className={`${styles.detailValue} ${styles.large}`}>
                    {selectedClient.name}
                  </span>
                </div>
 
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Phone Number</span>
                  <span className={styles.detailValue}>
                    {selectedClient.phone ? (
                      <a href={`tel:${selectedClient.phone}`} className={styles.phoneLink}>
                        <PhoneIcon />
                        {selectedClient.phone}
                      </a>
                    ) : (
                      <span style={{ color: '#666' }}>No phone listed</span>
                    )}
                  </span>
                </div>
 
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Email Address</span>
                  <span className={styles.detailValue}>
                    {selectedClient.email ? (
                      <a href={`mailto:${selectedClient.email}`} className={styles.emailLink}>
                        {selectedClient.email}
                      </a>
                    ) : (
                      <span style={{ color: '#666' }}>No email listed</span>
                    )}
                  </span>
                </div>
 
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Billing & Site Address</span>
                  <span className={`${styles.detailValue} ${styles.muted}`}>
                    {[
                      selectedClient.address,
                      selectedClient.city,
                      selectedClient.state,
                      selectedClient.zipCode
                    ].filter(Boolean).join(', ') || 'No address specified'}
                  </span>
                </div>
 
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>GPS Coordinates</span>
                  <span className={styles.detailValue}>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parsedGPS)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.mapLink}
                    >
                      <MapIcon />
                      {parsedGPS}
                    </a>
                  </span>
                </div>
 
                {selectedClient.preferenceNotes && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Preference Notes</span>
                    <div className={styles.preferenceNotesContainer}>
                      {selectedClient.preferenceNotes}
                    </div>
                  </div>
                )}
 
                <button
                  onClick={() => setShowEditModal(true)}
                  className={`${styles.buttonOutline} ${styles.marginTop4}`}
                >
                  <EditIcon /> EDIT PROFILE DETAILS
                </button>
              </div>
            </div>
 
            {/* Quick Actions Sidebar Card */}
            <div className={styles.card}>
              <div className={styles.sectionTitle}>
                <span>Quick-Actions Menu</span>
              </div>
              <div className={styles.flexColumnGap8}>
                <p className={styles.pMuted}>
                  Instantly dispatch or schedule service requests for this client using the pre-populated template below.
                </p>
                <button
                  onClick={() => setShowNewJobModal(true)}
                  className={styles.buttonPrimary}
                >
                  <PlusIcon /> QUICK-CREATE NEW JOB
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Edit Profile details */}
      {showEditModal && selectedClient && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Edit Client Profile</h2>
              <button onClick={() => setShowEditModal(false)} className={styles.closeBtn} aria-label="Close modal">
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={handleEditProfileSubmit} className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Client Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.flexGap10}>
                <div className={styles.formGroupFlex1}>
                  <label className={styles.formLabel}>Phone Number</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className={styles.formInput}
                  />
                </div>
                <div className={styles.formGroupFlex1}>
                  <label className={styles.formLabel}>Email Address</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className={styles.formInput}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Street Address</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.flexGap10}>
                <div className={styles.formGroupFlex2}>
                  <label className={styles.formLabel}>City</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className={styles.formInput}
                  />
                </div>
                <div className={styles.formGroupFlex1}>
                  <label className={styles.formLabel}>State</label>
                  <input
                    type="text"
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    className={styles.formInput}
                  />
                </div>
                <div className={styles.formGroupFlex1_5}>
                  <label className={styles.formLabel}>Zip Code</label>
                  <input
                    type="text"
                    value={editForm.zipCode}
                    onChange={(e) => setEditForm({ ...editForm, zipCode: e.target.value })}
                    className={styles.formInput}
                  />
                </div>
              </div>

              <div className={styles.flexGap10}>
                <div className={styles.formGroupFlex1_5}>
                  <label className={styles.formLabel}>GPS Coordinates (Lat, Lng)</label>
                  <input
                    type="text"
                    placeholder="e.g. 37.7749, -122.4194"
                    value={editForm.gps}
                    onChange={(e) => setEditForm({ ...editForm, gps: e.target.value })}
                    className={styles.formInput}
                  />
                </div>
                <div className={styles.formGroupFlex1}>
                  <label className={styles.formLabel}>Outstanding Balance ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.outstandingBalance}
                    onChange={(e) => setEditForm({ ...editForm, outstandingBalance: e.target.value })}
                    className={styles.formInput}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Preference Notes (Invoicing requirements, etc.)</label>
                <textarea
                  value={editForm.preferenceNotes}
                  onChange={(e) => setEditForm({ ...editForm, preferenceNotes: e.target.value })}
                  className={styles.formTextArea}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>General Admin Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Additional customer file notes..."
                  className={styles.formTextArea}
                />
              </div>

              <div className={`${styles.flexGap10} ${styles.marginTop16}`}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className={styles.buttonOutlineLarge}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className={styles.buttonPrimaryLarge}
                >
                  <CheckIcon /> SAVE CHANGES
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Quick-Create New Job pre-populated */}
      {showNewJobModal && selectedClient && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Quick-Create New Job</h2>
              <button onClick={() => setShowNewJobModal(false)} className={styles.closeBtn} aria-label="Close modal">
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={handleCreateJobSubmit} className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Client Name (Pre-populated)</label>
                <input
                  type="text"
                  disabled
                  value={selectedClient.name}
                  className={styles.formInputDisabled}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Site Address (Pre-populated)</label>
                <input
                  type="text"
                  disabled
                  value={[
                    selectedClient.address,
                    selectedClient.city,
                    selectedClient.state,
                    selectedClient.zipCode
                  ].filter(Boolean).join(', ') || 'No address specified'}
                  className={styles.formInputDisabled}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Service Type / Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AC Compressor Diagnostic, Main Drain Line Clog"
                  value={newJobForm.service}
                  onChange={(e) => setNewJobForm({ ...newJobForm, service: e.target.value })}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.flexGap10}>
                <div className={styles.formGroupFlex1}>
                  <label className={styles.formLabel}>Order Type</label>
                  <select
                    value={newJobForm.type}
                    onChange={(e) => setNewJobForm({ ...newJobForm, type: e.target.value as any })}
                    className={styles.formSelect}
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Emergency">Emergency</option>
                    <option value="WebRequest">Web Request</option>
                  </select>
                </div>

                <div className={styles.formGroupFlex1}>
                  <label className={styles.formLabel}>Priority Level</label>
                  <select
                    value={newJobForm.priority}
                    onChange={(e) => setNewJobForm({ ...newJobForm, priority: e.target.value as any })}
                    className={styles.formSelect}
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Job Notes / Special Instructions</label>
                <textarea
                  value={newJobForm.notes}
                  onChange={(e) => setNewJobForm({ ...newJobForm, notes: e.target.value })}
                  placeholder="Check in at front desk, code is #1234, watch for golden retriever..."
                  className={styles.formTextArea}
                />
              </div>

              <div className={`${styles.flexGap10} ${styles.marginTop16}`}>
                <button
                  type="button"
                  onClick={() => setShowNewJobModal(false)}
                  className={styles.buttonOutlineLarge}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className={styles.buttonPrimaryLarge}
                >
                  <CheckIcon /> CREATE NEW JOB
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Create New Client */}
      {showNewClientModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Add New Client</h2>
              <button onClick={() => setShowNewClientModal(false)} className={styles.closeBtn} aria-label="Close modal">
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={handleCreateClientSubmit} className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Client Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wayne Enterprises"
                  value={newClientForm.name}
                  onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.flexGap10}>
                <div className={styles.formGroupFlex1}>
                  <label className={styles.formLabel}>Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 555-0155"
                    value={newClientForm.phone}
                    onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                    className={styles.formInput}
                  />
                </div>
                <div className={styles.formGroupFlex1}>
                  <label className={styles.formLabel}>Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. billing@wayne.com"
                    value={newClientForm.email}
                    onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
                    className={styles.formInput}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Street Address</label>
                <input
                  type="text"
                  placeholder="e.g. 1007 Mountain Drive"
                  value={newClientForm.address}
                  onChange={(e) => setNewClientForm({ ...newClientForm, address: e.target.value })}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.flexGap10}>
                <div className={styles.formGroupFlex2}>
                  <label className={styles.formLabel}>City</label>
                  <input
                    type="text"
                    placeholder="Gotham"
                    value={newClientForm.city}
                    onChange={(e) => setNewClientForm({ ...newClientForm, city: e.target.value })}
                    className={styles.formInput}
                  />
                </div>
                <div className={styles.formGroupFlex1}>
                  <label className={styles.formLabel}>State</label>
                  <input
                    type="text"
                    placeholder="NJ"
                    value={newClientForm.state}
                    onChange={(e) => setNewClientForm({ ...newClientForm, state: e.target.value })}
                    className={styles.formInput}
                  />
                </div>
                <div className={styles.formGroupFlex1_5}>
                  <label className={styles.formLabel}>Zip Code</label>
                  <input
                    type="text"
                    placeholder="07001"
                    value={newClientForm.zipCode}
                    onChange={(e) => setNewClientForm({ ...newClientForm, zipCode: e.target.value })}
                    className={styles.formInput}
                  />
                </div>
              </div>

              <div className={styles.flexGap10}>
                <div className={styles.formGroupFlex1_5}>
                  <label className={styles.formLabel}>GPS Coordinates (Lat, Lng)</label>
                  <input
                    type="text"
                    placeholder="37.7749, -122.4194"
                    value={newClientForm.gps}
                    onChange={(e) => setNewClientForm({ ...newClientForm, gps: e.target.value })}
                    className={styles.formInput}
                  />
                </div>
                <div className={styles.formGroupFlex1}>
                  <label className={styles.formLabel}>Opening Balance ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newClientForm.outstandingBalance}
                    onChange={(e) => setNewClientForm({ ...newClientForm, outstandingBalance: e.target.value })}
                    className={styles.formInput}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Preference Notes (Invoicing requirements, etc.)</label>
                <textarea
                  placeholder="e.g. Email billing details instantly upon completion..."
                  value={newClientForm.preferenceNotes}
                  onChange={(e) => setNewClientForm({ ...newClientForm, preferenceNotes: e.target.value })}
                  className={styles.formTextArea}
                />
              </div>

              <div className={`${styles.flexGap10} ${styles.marginTop16}`}>
                <button
                  type="button"
                  onClick={() => setShowNewClientModal(false)}
                  className={styles.buttonOutlineLarge}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className={styles.buttonPrimaryLarge}
                >
                  <CheckIcon /> CREATE CLIENT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Edit Job pre-populated */}
      {showEditJobModal && selectedClient && selectedJob && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Edit Job Details</h2>
              <button onClick={() => setShowEditJobModal(false)} className={styles.closeBtn} aria-label="Close modal">
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={handleEditJobSubmit} className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Client Name (Pre-populated)</label>
                <input
                  type="text"
                  disabled
                  value={selectedClient.name}
                  className={styles.formInputDisabled}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Site Address (Pre-populated)</label>
                <input
                  type="text"
                  disabled
                  value={[
                    selectedClient.address,
                    selectedClient.city,
                    selectedClient.state,
                    selectedClient.zipCode
                  ].filter(Boolean).join(', ') || 'No address specified'}
                  className={styles.formInputDisabled}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Service Type / Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AC Compressor Diagnostic, Main Drain Line Clog"
                  value={editJobForm.service}
                  onChange={(e) => setEditJobForm({ ...editJobForm, service: e.target.value })}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.flexGap10}>
                <div className={styles.formGroupFlex1}>
                  <label className={styles.formLabel}>Order Type</label>
                  <select
                    value={editJobForm.type}
                    onChange={(e) => setEditJobForm({ ...editJobForm, type: e.target.value as any })}
                    className={styles.formSelect}
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Emergency">Emergency</option>
                    <option value="WebRequest">Web Request</option>
                  </select>
                </div>

                <div className={styles.formGroupFlex1}>
                  <label className={styles.formLabel}>Priority Level</label>
                  <select
                    value={editJobForm.priority}
                    onChange={(e) => setEditJobForm({ ...editJobForm, priority: e.target.value as any })}
                    className={styles.formSelect}
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Job Notes / Special Instructions</label>
                <textarea
                  value={editJobForm.notes}
                  onChange={(e) => setEditJobForm({ ...editJobForm, notes: e.target.value })}
                  placeholder="Check in at front desk, code is #1234, watch for golden retriever..."
                  className={styles.formTextArea}
                />
              </div>

              <div className={`${styles.flexGap10} ${styles.marginTop16}`}>
                <button
                  type="button"
                  onClick={() => setShowEditJobModal(false)}
                  className={styles.buttonOutlineLarge}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className={styles.buttonPrimaryLarge}
                >
                  <CheckIcon /> SAVE CHANGES
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Confirm Delete Job */}
      {showDeleteConfirmModal && jobToDelete && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} ${styles.confirm}`}>
            <div className={styles.modalHeader}>
              <h2 className={`${styles.modalTitle} ${styles.confirm}`}>Confirm Delete</h2>
              <button onClick={() => setShowDeleteConfirmModal(false)} className={styles.closeBtn} aria-label="Close modal">
                <CloseIcon />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.pConfirm}>
                Are you sure you want to delete the job <strong>{jobToDelete.id || 'N/A'}</strong> ({jobToDelete.service})? This action cannot be undone.
              </p>
              <div className={styles.flexGap10}>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirmModal(false)}
                  className={styles.buttonOutline}
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleDeleteJobConfirm}
                  className={styles.btnConfirmDelete}
                >
                  DELETE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
