import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from "react-router-dom";
import { useClients, useServiceRequests } from '../../hooks/useDispatchData';
import styles from '../../styles/UI/ClientRecord.module.scss';
import { IconButton, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ClientModal from './modals/ClientModal';
import JobModal from './modals/JobModal';
import DeleteConfirmModal from './modals/DeleteConfirmModal';

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
const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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
  const handleEditProfileSubmit = async (formData: any) => {
    if (!selectedClient || !selectedClient.id) return;

    try {
      const gpsLine = `GPS: ${formData.gps}`;
      const finalNotes = formData.notes.trim() ? `${formData.notes.trim()}\n${gpsLine}` : gpsLine;

      await updateClient(selectedClient.id, {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        outstandingBalance: formData.outstandingBalance,
        preferenceNotes: formData.preferenceNotes,
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
  const handleCreateJobSubmit = async (formData: any) => {
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
        service: formData.service,
        location: clientAddress || 'No site address specified',
        type: formData.type,
        priority: formData.priority,
        status: 'Unassigned',
        requestTime: '08:00 AM',
        estimatedDuration: '2 hours',
        notes: formData.notes,
      });

      setSuccessAlert('New job created in the dispatch queue successfully!');
      setShowNewJobModal(false);
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
    setShowEditJobModal(true);
  };

  // Handle Edit Job Submit
  const handleEditJobSubmit = async (formData: any) => {
    if (!selectedJob || !selectedJob.id) return;
    try {
      await updateServiceRequest(selectedJob.id, {
        service: formData.service,
        type: formData.type,
        priority: formData.priority,
        notes: formData.notes,
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
  const handleCreateClientSubmit = async (formData: any) => {
    try {
      const gpsLine = `GPS: ${formData.gps}`;
      const finalNotes = formData.preferenceNotes.trim() 
        ? `${formData.preferenceNotes.trim()}\n${gpsLine}` 
        : gpsLine;

      const created = await createClient({
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        outstandingBalance: formData.outstandingBalance,
        preferenceNotes: formData.preferenceNotes,
        notes: finalNotes,
      });

      if (created) {
        setSelectedClientId(created.id || '');
      }
      setSuccessAlert(`Client "${formData.name}" created successfully!`);
      setShowNewClientModal(false);
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
                      <span className={styles.noValueListed}>No phone listed</span>
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
                      <span className={styles.noValueListed}>No email listed</span>
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

      {/* Extracted modular modals */}
      <ClientModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        client={selectedClient}
        onSubmit={handleEditProfileSubmit}
      />

      <ClientModal
        isOpen={showNewClientModal}
        onClose={() => setShowNewClientModal(false)}
        client={null}
        onSubmit={handleCreateClientSubmit}
      />

      <JobModal
        isOpen={showNewJobModal}
        onClose={() => setShowNewJobModal(false)}
        clientName={selectedClient?.name || ''}
        clientAddress={[
          selectedClient?.address,
          selectedClient?.city,
          selectedClient?.state,
          selectedClient?.zipCode
        ].filter(Boolean).join(', ') || 'No site address specified'}
        job={null}
        onSubmit={handleCreateJobSubmit}
      />

      <JobModal
        isOpen={showEditJobModal}
        onClose={() => setShowEditJobModal(false)}
        clientName={selectedClient?.name || ''}
        clientAddress={[
          selectedClient?.address,
          selectedClient?.city,
          selectedClient?.state,
          selectedClient?.zipCode
        ].filter(Boolean).join(', ') || 'No site address specified'}
        job={selectedJob}
        onSubmit={handleEditJobSubmit}
      />

      <DeleteConfirmModal
        isOpen={showDeleteConfirmModal}
        onClose={() => setShowDeleteConfirmModal(false)}
        jobId={jobToDelete?.id || 'N/A'}
        jobService={jobToDelete?.service || ''}
        onConfirm={handleDeleteJobConfirm}
      />
    </div>
  );
}
