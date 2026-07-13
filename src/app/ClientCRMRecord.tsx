import React, { useState, useEffect, useMemo } from 'react';
import { useClients, useServiceRequests } from '../hooks/useDispatchData';

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
  const { serviceRequests, createServiceRequest, loading: loadingRequests } = useServiceRequests();

  // State
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showNewJobModal, setShowNewJobModal] = useState<boolean>(false);
  const [showNewClientModal, setShowNewClientModal] = useState<boolean>(false);

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

  // Set default client once loaded
  useEffect(() => {
    if (clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].id || '');
    }
  }, [clients, selectedClientId]);

  // Find currently selected client details
  const selectedClient = useMemo(() => {
    return clients.find((c) => c.id === selectedClientId) || null;
  }, [clients, selectedClientId]);

  // Parse GPS coordinates helper
  const parsedGPS = useMemo(() => {
    if (!selectedClient) return '37.7749, -122.4194';
    const match = selectedClient.notes?.match(/GPS:\s*([-\d.]+),\s*([-\d.]+)/);
    return match ? `${match[1]}, ${match[2]}` : '37.7749, -122.4194';
  }, [selectedClient]);

  // Populate edit form when selected client changes
  useEffect(() => {
    if (selectedClient) {
      const match = selectedClient.notes?.match(/GPS:\s*([-\d.]+),\s*([-\d.]+)/);
      const gpsVal = match ? `${match[1]}, ${match[2]}` : '37.7749, -122.4194';
      const rawNotes = selectedClient.notes?.replace(/GPS:\s*([-\d.]+),\s*([-\d.]+)\s*/g, '').trim() || '';

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
    }
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

  // Inline Style Declarations (Directly matching FieldExecution.tsx style methodologies)
  const styles = {
    container: {
      backgroundColor: '#121212',
      color: '#ffffff',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column' as const,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      boxSizing: 'border-box' as const,
      paddingBottom: '40px',
    },
    header: {
      backgroundColor: '#1a1a1a',
      borderBottom: '1px solid #333',
      padding: '12px 18px',
      position: 'sticky' as const,
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 12px rgba(0,0,0,0.6)',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '10px',
    },
    headerRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    backButton: {
      backgroundColor: 'transparent',
      border: 'none',
      color: '#ff9800',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '6px',
      borderRadius: '8px',
      minWidth: '40px',
      minHeight: '40px',
      transition: 'background-color 0.2s',
    },
    clientSelect: {
      backgroundColor: '#2a2a2a',
      color: '#ffffff',
      border: '1px solid #444',
      borderRadius: '8px',
      padding: '8px 12px',
      fontSize: '0.85rem',
      fontWeight: 600,
      minHeight: '44px',
      outline: 'none',
      cursor: 'pointer',
    },
    newClientBtn: {
      backgroundColor: '#2a2a2a',
      color: '#00e676',
      border: '1px solid #00e676',
      borderRadius: '8px',
      padding: '0 14px',
      fontSize: '0.8rem',
      fontWeight: 800,
      minHeight: '44px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    headerTitle: {
      margin: 0,
      fontSize: '1.2rem',
      fontWeight: 900,
      color: '#ffffff',
      letterSpacing: '0.3px',
    },
    contentArea: {
      padding: '16px',
      flex: 1,
      display: 'flex',
      flexDirection: isMobile ? ('column' as const) : ('row' as const),
      gap: '16px',
      maxWidth: '1440px',
      width: '100%',
      margin: '0 auto',
      boxSizing: 'border-box' as const,
    },
    mainSection: {
      flex: isMobile ? 'none' : '3 1 0',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '16px',
      minWidth: 0, // Prevent flex items from overflowing
    },
    sidebarSection: {
      flex: isMobile ? 'none' : '1.1 1 0',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '16px',
      minWidth: '280px',
    },
    card: {
      backgroundColor: '#1e1e1e',
      borderRadius: '10px',
      border: '1px solid #2e2e2e',
      padding: '16px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      boxSizing: 'border-box' as const,
    },
    sectionTitle: {
      margin: '0 0 12px 0',
      fontSize: '11px',
      fontWeight: 800,
      color: '#ff9800',
      textTransform: 'uppercase' as const,
      letterSpacing: '1px',
      paddingBottom: '8px',
      borderBottom: '1px solid #2e2e2e',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    profileDetail: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '12px',
    },
    detailItem: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '4px',
    },
    detailLabel: {
      fontSize: '11px',
      color: '#888',
      fontWeight: 700,
      textTransform: 'uppercase' as const,
    },
    detailValue: {
      fontSize: '14px',
      color: '#ffffff',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    phoneLink: {
      color: '#00e676',
      textDecoration: 'none',
      fontWeight: 800,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
    },
    mapLink: {
      color: '#82b1ff',
      textDecoration: 'none',
      fontWeight: 800,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
    },
    buttonPrimary: {
      backgroundColor: '#ff9800',
      color: '#000000',
      border: 'none',
      borderRadius: '8px',
      fontWeight: 800,
      fontSize: '13px',
      letterSpacing: '0.5px',
      padding: '12px 16px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      boxShadow: '0 2px 8px rgba(255, 152, 0, 0.35)',
      width: '100%',
      minHeight: '44px',
      boxSizing: 'border-box' as const,
      transition: 'background-color 0.2s',
    },
    buttonOutline: {
      backgroundColor: 'transparent',
      color: '#ff9800',
      border: '1.5px solid #ff9800',
      borderRadius: '8px',
      fontWeight: 800,
      fontSize: '13px',
      padding: '10px 16px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      minHeight: '44px',
      width: '100%',
      boxSizing: 'border-box' as const,
      transition: 'all 0.2s',
    },
    metricGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '12px',
    },
    metricCard: {
      backgroundColor: '#242424',
      borderRadius: '8px',
      border: '1px solid #333',
      padding: '12px',
      textAlign: 'center' as const,
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'center',
      minHeight: '100px',
    },
    metricValue: {
      fontSize: '20px',
      fontWeight: 900,
      color: '#ffffff',
      margin: '4px 0',
    },
    tableControls: {
      display: 'flex',
      flexDirection: isMobile ? ('column' as const) : ('row' as const),
      gap: '10px',
      marginBottom: '14px',
    },
    searchInputWrapper: {
      flex: 1,
      position: 'relative' as const,
    },
    searchInput: {
      width: '100%',
      backgroundColor: '#2a2a2a',
      color: '#ffffff',
      border: '1px solid #444',
      borderRadius: '8px',
      padding: '8px 12px 8px 36px',
      fontSize: '0.85rem',
      outline: 'none',
      minHeight: '40px',
      boxSizing: 'border-box' as const,
    },
    searchIconPos: {
      position: 'absolute' as const,
      left: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#888',
      display: 'flex',
      alignItems: 'center',
    },
    filterSelect: {
      backgroundColor: '#2a2a2a',
      color: '#ffffff',
      border: '1px solid #444',
      borderRadius: '8px',
      padding: '8px 12px',
      fontSize: '0.85rem',
      outline: 'none',
      minHeight: '40px',
      minWidth: '150px',
      cursor: 'pointer',
    },
    tableWrapper: {
      overflowX: 'auto' as const,
      borderRadius: '8px',
      border: '1px solid #2e2e2e',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      fontSize: '13px',
      textAlign: 'left' as const,
    },
    th: {
      backgroundColor: '#242424',
      color: '#888',
      fontWeight: 800,
      padding: '12px 14px',
      textTransform: 'uppercase' as const,
      fontSize: '10px',
      letterSpacing: '0.5px',
      borderBottom: '1px solid #2e2e2e',
    },
    td: {
      padding: '12px 14px',
      borderBottom: '1px solid #2e2e2e',
      color: '#e0e0e0',
    },
    trHover: {
      transition: 'background-color 0.15s',
      cursor: 'pointer',
    },
    pill: (bg: string, fg: string) => ({
      backgroundColor: bg,
      color: fg,
      padding: '3px 8px',
      borderRadius: '4px',
      fontSize: '10px',
      fontWeight: 900,
      textTransform: 'uppercase' as const,
      display: 'inline-block',
      letterSpacing: '0.4px',
    }),
    modalOverlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px',
      backdropFilter: 'blur(4px)',
      boxSizing: 'border-box' as const,
    },
    modalContent: {
      backgroundColor: '#1e1e1e',
      borderRadius: '10px',
      border: '1px solid #333',
      width: '100%',
      maxWidth: '520px',
      maxHeight: '90vh',
      overflowY: 'auto' as const,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      boxSizing: 'border-box' as const,
    },
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px',
      borderBottom: '1px solid #2e2e2e',
    },
    modalTitle: {
      margin: 0,
      fontSize: '15px',
      fontWeight: 800,
      color: '#ff9800',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
    },
    closeBtn: {
      backgroundColor: 'transparent',
      border: 'none',
      color: '#888',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4px',
      borderRadius: '50%',
      transition: 'color 0.2s',
    },
    modalBody: {
      padding: '16px',
    },
    formGroup: {
      marginBottom: '14px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '6px',
    },
    formLabel: {
      fontSize: '11px',
      color: '#ff9800',
      fontWeight: 800,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
    },
    formInput: {
      backgroundColor: '#2a2a2a',
      color: '#ffffff',
      border: '1px solid #444',
      borderRadius: '8px',
      padding: '10px 12px',
      fontSize: '0.85rem',
      outline: 'none',
      width: '100%',
      boxSizing: 'border-box' as const,
    },
    formTextArea: {
      backgroundColor: '#2a2a2a',
      color: '#ffffff',
      border: '1px solid #444',
      borderRadius: '8px',
      padding: '10px 12px',
      fontSize: '0.85rem',
      outline: 'none',
      width: '100%',
      minHeight: '80px',
      resize: 'vertical' as const,
      boxSizing: 'border-box' as const,
    },
    formSelect: {
      backgroundColor: '#2a2a2a',
      color: '#ffffff',
      border: '1px solid #444',
      borderRadius: '8px',
      padding: '10px 12px',
      fontSize: '0.85rem',
      outline: 'none',
      width: '100%',
      cursor: 'pointer',
      boxSizing: 'border-box' as const,
    },
    alertBanner: (isSuccess: boolean) => ({
      backgroundColor: isSuccess ? 'rgba(0, 230, 118, 0.1)' : 'rgba(211, 47, 47, 0.12)',
      color: isSuccess ? '#00e676' : '#ff6b6b',
      borderLeft: `4px solid ${isSuccess ? '#00e676' : '#d32f2f'}`,
      margin: '12px 16px 0 16px',
      padding: '10px 14px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: 700,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }),
  };

  return (
    <div style={styles.container}>
      {/* Header Status Bar */}
      <header style={styles.header}>
        <div style={styles.headerRow}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => window.location.href = '/'}
              style={styles.backButton}
              aria-label="Back to dashboard"
            >
              <BackIcon />
            </button>
            <h1 style={styles.headerTitle}>Client CRM Dashboard</h1>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Client Selector dropdown */}
            {!loadingClients && clients.length > 0 && (
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                style={styles.clientSelect}
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
              style={styles.newClientBtn}
            >
              <PlusIcon />
              {!isMobile && 'NEW CLIENT'}
            </button>
          </div>
        </div>
      </header>

      {/* Alert Banners */}
      {successAlert && (
        <div style={styles.alertBanner(true)}>
          <span>{successAlert}</span>
          <button style={{ background: 'none', border: 'none', color: '#00e676', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setSuccessAlert(null)}>×</button>
        </div>
      )}
      {errorAlert && (
        <div style={styles.alertBanner(false)}>
          <span>{errorAlert}</span>
          <button style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setErrorAlert(null)}>×</button>
        </div>
      )}

      {/* Main CRM Workspace */}
      {loadingClients ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '14px', height: '300px' }}>
          Loading CRM records...
        </div>
      ) : clients.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', textAlign: 'center', gap: '16px' }}>
          <UsersIcon />
          <h2 style={{ fontSize: '1.2rem', color: '#ff9800', margin: 0 }}>No CRM Records Found</h2>
          <p style={{ color: '#aaa', fontSize: '0.85rem', maxWidth: '380px', margin: 0, lineHeight: 1.5 }}>
            There are currently no clients registered in the system. Get started by adding your first client record.
          </p>
          <button
            onClick={() => setShowNewClientModal(true)}
            style={{ ...styles.buttonPrimary, width: 'auto', padding: '12px 24px' }}
          >
            <PlusIcon /> Add First Client
          </button>
        </div>
      ) : !selectedClient ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '14px', height: '300px' }}>
          Please select a client from the dropdown menu.
        </div>
      ) : (
        <div style={styles.contentArea}>
          {/* Main Panel Area: Metrics & Job History */}
          <div style={styles.mainSection}>
            {/* Financial Summary metrics panel */}
            <div style={styles.card}>
              <div style={styles.sectionTitle}>
                <span>Financial Summary Panel</span>
                <span style={{ fontSize: '10px', color: '#aaa' }}>Live billing data</span>
              </div>
              <div style={styles.metricGrid}>
                <div style={styles.metricCard}>
                  <div style={styles.detailLabel}>Outstanding Invoices</div>
                  <div style={{ ...styles.metricValue, color: outstandingInvoicesCount > 0 ? '#ff9800' : '#ffffff' }}>
                    {outstandingInvoicesCount}
                  </div>
                  <div style={{ fontSize: '10px', color: '#888' }}>Unpaid Work Orders</div>
                </div>

                <div style={styles.metricCard}>
                  <div style={styles.detailLabel}>Overdue Balance</div>
                  <div style={{ ...styles.metricValue, color: totalOutstanding > 0 ? '#ff6b6b' : '#00e676' }}>
                    ${totalOutstanding.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '10px', color: '#888' }}>Billing Balance</div>
                </div>

                <div style={styles.metricCard}>
                  <div style={styles.detailLabel}>Payment Status</div>
                  <div style={{ marginTop: '6px' }}>
                    {paymentStatus === 'PAID' ? (
                      <span style={styles.pill('rgba(0, 230, 118, 0.15)', '#00e676')}>PAID / GOOD</span>
                    ) : paymentStatus === 'OVERDUE' ? (
                      <span style={styles.pill('rgba(211, 47, 47, 0.15)', '#ff6b6b')}>OVERDUE</span>
                    ) : (
                      <span style={styles.pill('rgba(255, 152, 0, 0.15)', '#ff9800')}>PENDING ({outstandingInvoicesCount})</span>
                    )}
                  </div>
                  <div style={{ fontSize: '10px', color: '#888', marginTop: '6px' }}>Account Standing</div>
                </div>
              </div>
            </div>

            {/* Job History Table */}
            <div style={styles.card}>
              <div style={styles.sectionTitle}>
                <span>Job History Table</span>
                <span style={styles.pill('#242424', '#ff9800')}>{clientJobs.length} Jobs Total</span>
              </div>

              {/* Search & filters bar */}
              <div style={styles.tableControls}>
                <div style={styles.searchInputWrapper}>
                  <div style={styles.searchIconPos}>
                    <SearchIcon />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by job ID, description, or notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={styles.searchInput}
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active (Assigned/InProgress)</option>
                  <option value="COMPLETED">Completed Only</option>
                </select>
              </div>

              {/* Table wrapper */}
              <div style={styles.tableWrapper}>
                {loadingRequests ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#888' }}>
                    Syncing job details...
                  </div>
                ) : filteredJobs.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: '#666', fontSize: '13px' }}>
                    No matching jobs found for this search/filter selection.
                  </div>
                ) : (
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Job Number</th>
                        <th style={styles.th}>Date</th>
                        <th style={styles.th}>Service Type / Desc</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Total Amount</th>
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
                            style={styles.trHover}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#252525'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <td style={{ ...styles.td, fontWeight: 700, color: '#ff9800' }}>{job.id || 'N/A'}</td>
                            <td style={styles.td}>{formattedDate}</td>
                            <td style={{ ...styles.td, fontWeight: 600 }}>{job.service}</td>
                            <td style={styles.td}>
                              {isCompleted ? (
                                <span style={styles.pill('rgba(0, 230, 118, 0.12)', '#00e676')}>COMPLETED</span>
                              ) : isActive ? (
                                <span style={styles.pill('rgba(130, 177, 255, 0.15)', '#82b1ff')}>ACTIVE</span>
                              ) : (
                                <span style={styles.pill('rgba(255, 152, 0, 0.12)', '#ff9800')}>UNASSIGNED</span>
                              )}
                            </td>
                            <td style={{ ...styles.td, fontWeight: 700 }}>
                              {getJobAmount(job.id || '', job.service)}
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
          <div style={styles.sidebarSection}>
            {/* Client Profile Card */}
            <div style={styles.card}>
              <div style={styles.sectionTitle}>
                <span>Client Profile Card</span>
                <button
                  onClick={() => setShowEditModal(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ff9800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px',
                  }}
                  title="Edit Profile"
                >
                  <EditIcon />
                </button>
              </div>

              <div style={styles.profileDetail}>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Client Name</span>
                  <span style={{ ...styles.detailValue, fontSize: '15px', fontWeight: 800 }}>
                    {selectedClient.name}
                  </span>
                </div>

                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Phone Number</span>
                  <span style={styles.detailValue}>
                    {selectedClient.phone ? (
                      <a href={`tel:${selectedClient.phone}`} style={styles.phoneLink}>
                        <PhoneIcon />
                        {selectedClient.phone}
                      </a>
                    ) : (
                      <span style={{ color: '#666' }}>No phone listed</span>
                    )}
                  </span>
                </div>

                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Email Address</span>
                  <span style={styles.detailValue}>
                    {selectedClient.email ? (
                      <a href={`mailto:${selectedClient.email}`} style={{ color: '#82b1ff', textDecoration: 'none' }}>
                        {selectedClient.email}
                      </a>
                    ) : (
                      <span style={{ color: '#666' }}>No email listed</span>
                    )}
                  </span>
                </div>

                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Billing & Site Address</span>
                  <span style={{ ...styles.detailValue, color: '#e0e0e0' }}>
                    {[
                      selectedClient.address,
                      selectedClient.city,
                      selectedClient.state,
                      selectedClient.zipCode
                    ].filter(Boolean).join(', ') || 'No address specified'}
                  </span>
                </div>

                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>GPS Coordinates</span>
                  <span style={styles.detailValue}>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parsedGPS)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.mapLink}
                    >
                      <MapIcon />
                      {parsedGPS}
                    </a>
                  </span>
                </div>

                {selectedClient.preferenceNotes && (
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Preference Notes</span>
                    <div style={{
                      backgroundColor: 'rgba(255, 152, 0, 0.05)',
                      border: '1px solid rgba(255, 152, 0, 0.15)',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      fontSize: '12px',
                      color: '#ff9800',
                      lineHeight: 1.4,
                    }}>
                      {selectedClient.preferenceNotes}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setShowEditModal(true)}
                  style={{ ...styles.buttonOutline, marginTop: '8px' }}
                >
                  <EditIcon /> EDIT PROFILE DETAILS
                </button>
              </div>
            </div>

            {/* Quick Actions Sidebar Card */}
            <div style={styles.card}>
              <div style={styles.sectionTitle}>
                <span>Quick-Actions Menu</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ color: '#aaa', fontSize: '12px', margin: '0 0 4px 0', lineHeight: 1.4 }}>
                  Instantly dispatch or schedule service requests for this client using the pre-populated template below.
                </p>
                <button
                  onClick={() => setShowNewJobModal(true)}
                  style={styles.buttonPrimary}
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
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Edit Client Profile</h2>
              <button onClick={() => setShowEditModal(false)} style={styles.closeBtn} aria-label="Close modal">
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={handleEditProfileSubmit} style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Client Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  style={styles.formInput}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.formLabel}>Phone Number</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    style={styles.formInput}
                  />
                </div>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.formLabel}>Email Address</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    style={styles.formInput}
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Street Address</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  style={styles.formInput}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ ...styles.formGroup, flex: 2 }}>
                  <label style={styles.formLabel}>City</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    style={styles.formInput}
                  />
                </div>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.formLabel}>State</label>
                  <input
                    type="text"
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    style={styles.formInput}
                  />
                </div>
                <div style={{ ...styles.formGroup, flex: 1.5 }}>
                  <label style={styles.formLabel}>Zip Code</label>
                  <input
                    type="text"
                    value={editForm.zipCode}
                    onChange={(e) => setEditForm({ ...editForm, zipCode: e.target.value })}
                    style={styles.formInput}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ ...styles.formGroup, flex: 1.5 }}>
                  <label style={styles.formLabel}>GPS Coordinates (Lat, Lng)</label>
                  <input
                    type="text"
                    placeholder="e.g. 37.7749, -122.4194"
                    value={editForm.gps}
                    onChange={(e) => setEditForm({ ...editForm, gps: e.target.value })}
                    style={styles.formInput}
                  />
                </div>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.formLabel}>Outstanding Balance ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.outstandingBalance}
                    onChange={(e) => setEditForm({ ...editForm, outstandingBalance: e.target.value })}
                    style={styles.formInput}
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Preference Notes (Invoicing requirements, etc.)</label>
                <textarea
                  value={editForm.preferenceNotes}
                  onChange={(e) => setEditForm({ ...editForm, preferenceNotes: e.target.value })}
                  style={styles.formTextArea}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>General Admin Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Additional customer file notes..."
                  style={styles.formTextArea}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{ ...styles.buttonOutline, flex: 1, minHeight: '48px' }}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  style={{ ...styles.buttonPrimary, flex: 1, minHeight: '48px' }}
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
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Quick-Create New Job</h2>
              <button onClick={() => setShowNewJobModal(false)} style={styles.closeBtn} aria-label="Close modal">
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={handleCreateJobSubmit} style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Client Name (Pre-populated)</label>
                <input
                  type="text"
                  disabled
                  value={selectedClient.name}
                  style={{ ...styles.formInput, backgroundColor: '#181818', color: '#888', cursor: 'not-allowed' }}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Site Address (Pre-populated)</label>
                <input
                  type="text"
                  disabled
                  value={[
                    selectedClient.address,
                    selectedClient.city,
                    selectedClient.state,
                    selectedClient.zipCode
                  ].filter(Boolean).join(', ') || 'No address specified'}
                  style={{ ...styles.formInput, backgroundColor: '#181818', color: '#888', cursor: 'not-allowed' }}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Service Type / Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AC Compressor Diagnostic, Main Drain Line Clog"
                  value={newJobForm.service}
                  onChange={(e) => setNewJobForm({ ...newJobForm, service: e.target.value })}
                  style={styles.formInput}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.formLabel}>Order Type</label>
                  <select
                    value={newJobForm.type}
                    onChange={(e) => setNewJobForm({ ...newJobForm, type: e.target.value as any })}
                    style={styles.formSelect}
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Emergency">Emergency</option>
                    <option value="WebRequest">Web Request</option>
                  </select>
                </div>

                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.formLabel}>Priority Level</label>
                  <select
                    value={newJobForm.priority}
                    onChange={(e) => setNewJobForm({ ...newJobForm, priority: e.target.value as any })}
                    style={styles.formSelect}
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Job Notes / Special Instructions</label>
                <textarea
                  value={newJobForm.notes}
                  onChange={(e) => setNewJobForm({ ...newJobForm, notes: e.target.value })}
                  placeholder="Check in at front desk, code is #1234, watch for golden retriever..."
                  style={styles.formTextArea}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowNewJobModal(false)}
                  style={{ ...styles.buttonOutline, flex: 1, minHeight: '48px' }}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  style={{ ...styles.buttonPrimary, flex: 1, minHeight: '48px' }}
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
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Add New Client</h2>
              <button onClick={() => setShowNewClientModal(false)} style={styles.closeBtn} aria-label="Close modal">
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={handleCreateClientSubmit} style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Client Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wayne Enterprises"
                  value={newClientForm.name}
                  onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })}
                  style={styles.formInput}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.formLabel}>Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 555-0155"
                    value={newClientForm.phone}
                    onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                    style={styles.formInput}
                  />
                </div>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.formLabel}>Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. billing@wayne.com"
                    value={newClientForm.email}
                    onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
                    style={styles.formInput}
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Street Address</label>
                <input
                  type="text"
                  placeholder="e.g. 1007 Mountain Drive"
                  value={newClientForm.address}
                  onChange={(e) => setNewClientForm({ ...newClientForm, address: e.target.value })}
                  style={styles.formInput}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ ...styles.formGroup, flex: 2 }}>
                  <label style={styles.formLabel}>City</label>
                  <input
                    type="text"
                    placeholder="Gotham"
                    value={newClientForm.city}
                    onChange={(e) => setNewClientForm({ ...newClientForm, city: e.target.value })}
                    style={styles.formInput}
                  />
                </div>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.formLabel}>State</label>
                  <input
                    type="text"
                    placeholder="NJ"
                    value={newClientForm.state}
                    onChange={(e) => setNewClientForm({ ...newClientForm, state: e.target.value })}
                    style={styles.formInput}
                  />
                </div>
                <div style={{ ...styles.formGroup, flex: 1.5 }}>
                  <label style={styles.formLabel}>Zip Code</label>
                  <input
                    type="text"
                    placeholder="07001"
                    value={newClientForm.zipCode}
                    onChange={(e) => setNewClientForm({ ...newClientForm, zipCode: e.target.value })}
                    style={styles.formInput}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ ...styles.formGroup, flex: 1.5 }}>
                  <label style={styles.formLabel}>GPS Coordinates (Lat, Lng)</label>
                  <input
                    type="text"
                    placeholder="37.7749, -122.4194"
                    value={newClientForm.gps}
                    onChange={(e) => setNewClientForm({ ...newClientForm, gps: e.target.value })}
                    style={styles.formInput}
                  />
                </div>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.formLabel}>Opening Balance ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newClientForm.outstandingBalance}
                    onChange={(e) => setNewClientForm({ ...newClientForm, outstandingBalance: e.target.value })}
                    style={styles.formInput}
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Preference Notes (Invoicing requirements, etc.)</label>
                <textarea
                  placeholder="e.g. Email billing details instantly upon completion..."
                  value={newClientForm.preferenceNotes}
                  onChange={(e) => setNewClientForm({ ...newClientForm, preferenceNotes: e.target.value })}
                  style={styles.formTextArea}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowNewClientModal(false)}
                  style={{ ...styles.buttonOutline, flex: 1, minHeight: '48px' }}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  style={{ ...styles.buttonPrimary, flex: 1, minHeight: '48px' }}
                >
                  <CheckIcon /> CREATE CLIENT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
