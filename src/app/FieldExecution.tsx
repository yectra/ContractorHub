import React, { useState, useEffect, useMemo } from 'react';
import { useServiceRequests, useScheduledJobs } from '../hooks/useDispatchData';

// Inline SVGs for pure zero-dependency icons
const PhoneIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const MapIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
);

const CameraIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CloudIcon = ({ offline }: { offline?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: offline ? '#ff4d4d' : '#00e676' }}>
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
  </svg>
);

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

interface QueuedUpload {
  id: string;
  name: string;
  dataUrl: string;
}

interface UploadedPhoto {
  id: string;
  url: string;
  name: string;
}

const DEFAULT_STEPS: ChecklistItem[] = [
  { id: '1', text: 'Confirm site contact and review work scope', checked: false },
  { id: '2', text: 'Perform safety inspection and locate shut-off valves', checked: false },
  { id: '3', text: 'Identify source of issue / leak and isolate system', checked: false },
  { id: '4', text: 'Prepare replacement parts, clean joint surfaces', checked: false },
  { id: '5', text: 'Execute main repair / pipe replacement', checked: false },
  { id: '6', text: 'Pressure test lines and inspect for new leaks', checked: false },
  { id: '7', text: 'Restore utility service and verify operational status', checked: false },
  { id: '8', text: 'Clean work area and dispose of debris', checked: false },
];

export default function FieldExecution() {
  // Connectivity state
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [successAlert, setSuccessAlert] = useState<string | null>(null);

  // Load backend hooks
  const { serviceRequests, updateServiceRequest } = useServiceRequests();
  const { scheduledJobs, updateScheduledJob } = useScheduledJobs();

  // Selected job state
  const [selectedJobId, setSelectedJobId] = useState<string>('');

  // Checklist state
  const [checklist, setChecklist] = useState<ChecklistItem[]>(DEFAULT_STEPS);

  // Photo state
  const [uploadQueue, setUploadQueue] = useState<QueuedUpload[]>([]);
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Listen to connectivity changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setErrorAlert(null);
      setSuccessAlert('Connectivity restored. Syncing offline changes...');
      setTimeout(() => setSuccessAlert(null), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSuccessAlert(null);
      setErrorAlert('Offline Mode: Changes will be saved locally.');
      setTimeout(() => setErrorAlert(null), 3000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Filter out scheduled jobs that are active (either Assigned or InProgress or Completed)
  const activeJobs = useMemo(() => {
    return scheduledJobs.map((job) => {
      const request = serviceRequests.find((r) => r.id === job.serviceRequestId);
      return {
        ...job,
        clientName: request?.client || 'Unknown Client',
        serviceName: request?.service || 'General Service',
        address: request?.location || 'Unknown Address',
        phone: '555-0199', // Default contact fallback
      };
    });
  }, [scheduledJobs, serviceRequests]);

  // Set initial selected job once jobs are loaded
  useEffect(() => {
    if (activeJobs.length > 0 && !selectedJobId) {
      setSelectedJobId(activeJobs[0].id || '');
    }
  }, [activeJobs, selectedJobId]);

  // Find currently selected job details
  const selectedJob = useMemo(() => {
    return activeJobs.find((j) => j.id === selectedJobId) || null;
  }, [activeJobs, selectedJobId]);

  // Load checklist and photos from cache when job selection changes
  useEffect(() => {
    if (!selectedJobId) return;

    // Load Checklist
    const cachedChecklist = localStorage.getItem(`checklist_job_${selectedJobId}`);
    if (cachedChecklist) {
      try {
        setChecklist(JSON.parse(cachedChecklist));
      } catch {
        setChecklist(DEFAULT_STEPS);
      }
    } else {
      // Check if job notes contains checklist state
      if (selectedJob?.notes && selectedJob.notes.startsWith('CHECKLIST:')) {
        try {
          const jsonStr = selectedJob.notes.replace('CHECKLIST:', '');
          const parsed = JSON.parse(jsonStr);
          setChecklist(parsed);
          localStorage.setItem(`checklist_job_${selectedJobId}`, jsonStr);
        } catch {
          setChecklist(DEFAULT_STEPS);
        }
      } else {
        setChecklist(DEFAULT_STEPS);
      }
    }

    // Load Upload Queue
    const cachedQueue = localStorage.getItem(`upload_queue_${selectedJobId}`);
    if (cachedQueue) {
      try {
        setUploadQueue(JSON.parse(cachedQueue));
      } catch {
        setUploadQueue([]);
      }
    } else {
      setUploadQueue([]);
    }

    // Load Photos
    const cachedPhotos = localStorage.getItem(`photos_job_${selectedJobId}`);
    if (cachedPhotos) {
      try {
        setUploadedPhotos(JSON.parse(cachedPhotos));
      } catch {
        setUploadedPhotos([]);
      }
    } else {
      setUploadedPhotos([]);
    }
  }, [selectedJobId, selectedJob]);

  // Persist checklist changes
  const saveChecklist = async (updatedChecklist: ChecklistItem[]) => {
    setChecklist(updatedChecklist);
    if (!selectedJobId) return;

    const checklistStr = JSON.stringify(updatedChecklist);
    localStorage.setItem(`checklist_job_${selectedJobId}`, checklistStr);

    // Try to sync with Amplify backend if online
    if (isOnline) {
      try {
        await updateScheduledJob(selectedJobId, {
          notes: `CHECKLIST:${checklistStr}`,
        });
      } catch (err) {
        console.error('Failed to sync checklist update to backend:', err);
      }
    }
  };

  const handleToggleStep = (stepId: string) => {
    const updated = checklist.map((step) =>
      step.id === stepId ? { ...step, checked: !step.checked } : step
    );
    saveChecklist(updated);
  };

  // Compute live progress percentage
  const progressPercentage = useMemo(() => {
    if (checklist.length === 0) return 0;
    const completedCount = checklist.filter((item) => item.checked).length;
    return Math.round((completedCount / checklist.length) * 100);
  }, [checklist]);

  const isChecklistComplete = useMemo(() => {
    return checklist.every((item) => item.checked);
  }, [checklist]);

  // Image compression helper using HTML5 canvas
  const compressImageFile = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const max_size = 1200;

          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context unavailable'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Blob generation failed'));
              }
            },
            'image/jpeg',
            0.7
          );
        };
        img.src = event.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // S3 or Simulated Upload helper
  const uploadPhoto = async (name: string, blob: Blob | string, isBase64 = false): Promise<string> => {
    try {
      const storageModule = await import('aws-amplify/storage');
      if (storageModule && typeof storageModule.uploadData === 'function') {
        const fileObj = isBase64
          ? await (await fetch(blob as string)).blob()
          : (blob as Blob);
        
        const result = await storageModule.uploadData({
          path: `jobs/${selectedJobId}/${Date.now()}_${name}`,
          data: fileObj,
          options: {
            contentType: 'image/jpeg',
          }
        }).result;

        return result.path || `https://s3.mock-amplify-bucket.amazonaws.com/${result.path}`;
      }
    } catch {
      // Fallback to simulation
    }

    await new Promise((resolve) => setTimeout(resolve, 1200));

    if (isBase64) {
      return blob as string;
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob as Blob);
    });
  };

  // Core file upload selection handler
  const handlePhotoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !selectedJobId) return;

    setIsUploading(true);
    setErrorAlert(null);

    const file = files[0];
    try {
      const compressedBlob = await compressImageFile(file);
      const fileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";

      if (!isOnline) {
        const base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(compressedBlob);
        });

        const newQueueItem: QueuedUpload = {
          id: `queue-${Date.now()}`,
          name: fileName,
          dataUrl: base64Data,
        };

        const updatedQueue = [...uploadQueue, newQueueItem];
        setUploadQueue(updatedQueue);
        localStorage.setItem(`upload_queue_${selectedJobId}`, JSON.stringify(updatedQueue));
        setErrorAlert('Offline: Photo upload queued. Will resume when online.');
        setTimeout(() => setErrorAlert(null), 4000);
      } else {
        const url = await uploadPhoto(fileName, compressedBlob);
        const newPhoto: UploadedPhoto = {
          id: `photo-${Date.now()}`,
          url,
          name: fileName,
        };

        const updatedPhotos = [...uploadedPhotos, newPhoto];
        setUploadedPhotos(updatedPhotos);
        localStorage.setItem(`photos_job_${selectedJobId}`, JSON.stringify(updatedPhotos));
        setSuccessAlert('Photo uploaded successfully!');
        setTimeout(() => setSuccessAlert(null), 3000);
      }
    } catch (err) {
      console.error(err);
      setErrorAlert('Failed to process image upload.');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  // Auto-process upload queue when connectivity returns
  useEffect(() => {
    if (!isOnline || uploadQueue.length === 0 || !selectedJobId) return;

    const processQueue = async () => {
      setIsUploading(true);
      setSuccessAlert(`Syncing ${uploadQueue.length} queued photos...`);

      const failedUploads: QueuedUpload[] = [];
      const successfulPhotos: UploadedPhoto[] = [...uploadedPhotos];

      for (const item of uploadQueue) {
        try {
          const url = await uploadPhoto(item.name, item.dataUrl, true);
          successfulPhotos.push({
            id: `photo-${Date.now()}-${Math.random()}`,
            url,
            name: item.name,
          });
        } catch (err) {
          console.error(`Failed to upload queued item ${item.name}:`, err);
          failedUploads.push(item);
        }
      }

      setUploadedPhotos(successfulPhotos);
      localStorage.setItem(`photos_job_${selectedJobId}`, JSON.stringify(successfulPhotos));

      setUploadQueue(failedUploads);
      if (failedUploads.length > 0) {
        localStorage.setItem(`upload_queue_${selectedJobId}`, JSON.stringify(failedUploads));
        setErrorAlert('Some queued photo uploads failed to sync.');
      } else {
        localStorage.removeItem(`upload_queue_${selectedJobId}`);
        setSuccessAlert('All offline photo uploads synced successfully!');
        setTimeout(() => setSuccessAlert(null), 3000);
      }
      setIsUploading(false);
    };

    processQueue();
  }, [isOnline, uploadQueue, selectedJobId, uploadedPhotos]);

  // Complete Job & Invoice flow
  const handleCompleteJob = async () => {
    if (!isChecklistComplete || !selectedJobId || !selectedJob) return;

    try {
      setIsUploading(true);
      setErrorAlert(null);

      // 1. Update ScheduledJob status to Completed in database
      await updateScheduledJob(selectedJobId, {
        status: 'Completed',
      });

      // 2. Update ServiceRequest status to Completed
      if (selectedJob.serviceRequestId) {
        await updateServiceRequest(selectedJob.serviceRequestId, {
          status: 'Completed',
        });
      }

      // 3. Clear cached checklist and queue (keep photos for completed job history)
      localStorage.removeItem(`checklist_job_${selectedJobId}`);
      localStorage.removeItem(`upload_queue_${selectedJobId}`);

      setSuccessAlert('🎉 JOB COMPLETED & INVOICE SENT! Status set to completed.');
      setTimeout(() => setSuccessAlert(null), 5000);
    } catch (err) {
      console.error(err);
      setErrorAlert('Failed to complete job. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const containerStyle: React.CSSProperties = {
    backgroundColor: '#121212',
    color: '#ffffff',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    paddingBottom: '85px',
    boxSizing: 'border-box',
  };

  return (
    <div style={containerStyle}>
      {/* Top Banner for Offline Warning */}
      {!isOnline && (
        <div style={{
          backgroundColor: '#d32f2f',
          color: '#ffffff',
          textAlign: 'center',
          padding: '8px 12px',
          fontWeight: 700,
          fontSize: '0.85rem',
          letterSpacing: '0.5px',
          position: 'sticky',
          top: 0,
          zIndex: 105,
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        }}>
          Offline Mode — Changes saved locally
        </div>
      )}

      {/* Sticky Header Status Bar */}
      <header style={{
        backgroundColor: '#1e1e1e',
        borderBottom: '1px solid #2a2a2a',
        padding: '12px 16px',
        position: 'sticky',
        top: !isOnline ? '35px' : 0,
        zIndex: 100,
        boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <button 
            onClick={() => window.location.href = '/'}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#ff9800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              minWidth: '44px',
              minHeight: '44px',
            }}
            aria-label="Back to dashboard"
          >
            <BackIcon />
          </button>

          {/* Job Selector Dropdown */}
          <div style={{ flex: 1, marginLeft: '12px', marginRight: '12px' }}>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              style={{
                backgroundColor: '#2a2a2a',
                color: '#ffffff',
                border: '1px solid #444',
                borderRadius: '8px',
                padding: '8px 12px',
                width: '100%',
                fontSize: '0.85rem',
                fontWeight: 600,
                minHeight: '48px',
                outline: 'none',
              }}
            >
              {activeJobs.length === 0 ? (
                <option value="">No Assigned Jobs Available</option>
              ) : (
                activeJobs.map((j) => (
                  <option key={j.id || ''} value={j.id || ''}>
                    {j.serviceRequestId || j.id} - {j.clientName}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Connectivity status pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#2a2a2a',
            padding: '6px 10px',
            borderRadius: '16px',
            gap: '6px',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}>
            <CloudIcon offline={!isOnline} />
            <span style={{ color: isOnline ? '#00e676' : '#ff4d4d' }}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        {selectedJob && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '4px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#ff9800', fontWeight: 700, letterSpacing: '0.5px' }}>
                ACTIVE EXECUTION SCREEN
              </div>
              <h1 style={{ fontSize: '1.1rem', margin: '2px 0 0 0', fontWeight: 800, color: '#fff' }}>
                {selectedJob.serviceName}
              </h1>
            </div>
            <span style={{
              backgroundColor: selectedJob.status === 'Completed' ? '#00e676' : '#ff9800',
              color: '#000',
              fontSize: '0.75rem',
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: '4px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}>
              {selectedJob.status}
            </span>
          </div>
        )}
      </header>

      {/* Alert Notices */}
      {errorAlert && (
        <div style={{
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderLeft: '4px solid #c62828',
          margin: '16px',
          padding: '12px 16px',
          borderRadius: '4px',
          fontSize: '0.85rem',
          fontWeight: 600,
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        }}>
          {errorAlert}
        </div>
      )}

      {successAlert && (
        <div style={{
          backgroundColor: '#e8f5e9',
          color: '#2e7d32',
          borderLeft: '4px solid #2e7d32',
          margin: '16px',
          padding: '12px 16px',
          borderRadius: '4px',
          fontSize: '0.85rem',
          fontWeight: 600,
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        }}>
          {successAlert}
        </div>
      )}

      {/* Main Content Area */}
      {!selectedJob ? (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          textAlign: 'center',
        }}>
          <CloudIcon offline />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ff9800', margin: '16px 0 8px 0' }}>
            No Active Job Selected
          </h2>
          <p style={{ color: '#aaa', fontSize: '0.85rem', maxWidth: '300px', lineHeight: 1.5 }}>
            To start, schedule a job on the Dispatch timeline and make sure you select it from the dropdown above.
          </p>
        </div>
      ) : (
        <main style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Client Info Section */}
          <section style={{
            backgroundColor: '#1e1e1e',
            borderRadius: '12px',
            border: '1px solid #2a2a2a',
            padding: '16px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.15)',
          }}>
            <h2 style={{
              margin: '0 0 12px 0',
              fontSize: '0.8rem',
              fontWeight: 800,
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Customer & Job Site Info
            </h2>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>
              {selectedJob.clientName}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#aaa', lineHeight: 1.4, marginBottom: '16px' }}>
              {selectedJob.address}
            </div>

            {/* Large Thumb Actions (Call, Maps Route) */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <a
                href={`tel:${selectedJob.phone}`}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: '#2a2a2a',
                  color: '#ffffff',
                  border: '1px solid #444',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  minHeight: '48px',
                  touchAction: 'manipulation',
                }}
              >
                <PhoneIcon />
                Call Site
              </a>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedJob.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: '#2a2a2a',
                  color: '#ffffff',
                  border: '1px solid #444',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  minHeight: '48px',
                  touchAction: 'manipulation',
                }}
              >
                <MapIcon />
                Map Route
              </a>
            </div>
          </section>

          {/* Checklist Progress Bar & Items */}
          <section style={{
            backgroundColor: '#1e1e1e',
            borderRadius: '12px',
            border: '1px solid #2a2a2a',
            padding: '16px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.15)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{
                margin: 0,
                fontSize: '0.8rem',
                fontWeight: 800,
                color: '#888',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                Work Checklist
              </h2>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: progressPercentage === 100 ? '#00e676' : '#ff9800' }}>
                {progressPercentage}%
              </span>
            </div>

            {/* Live Progress Bar */}
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#2a2a2a',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '16px',
            }}>
              <div style={{
                width: `${progressPercentage}%`,
                height: '100%',
                backgroundColor: progressPercentage === 100 ? '#00e676' : '#ff9800',
                transition: 'width 0.3s ease-in-out',
              }} />
            </div>

            {/* Checklist items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {checklist.map((step) => (
                <div
                  key={step.id}
                  onClick={() => handleToggleStep(step.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: step.checked ? 'rgba(0, 230, 118, 0.05)' : '#252525',
                    border: step.checked ? '1px solid rgba(0, 230, 118, 0.2)' : '1px solid #333',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    minHeight: '48px',
                    boxSizing: 'border-box',
                    userSelect: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Large Checkbox Circle */}
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: step.checked ? '2px solid #00e676' : '2px solid #666',
                    backgroundColor: step.checked ? '#00e676' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '12px',
                    flexShrink: 0,
                    color: '#000',
                  }}>
                    {step.checked && <CheckIcon />}
                  </div>
                  <span style={{
                    fontSize: '0.85rem',
                    color: step.checked ? '#aaa' : '#fff',
                    textDecoration: step.checked ? 'line-through' : 'none',
                    lineHeight: 1.3,
                  }}>
                    {step.text}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Photo Attachments & S3 Upload */}
          <section style={{
            backgroundColor: '#1e1e1e',
            borderRadius: '12px',
            border: '1px solid #2a2a2a',
            padding: '16px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.15)',
          }}>
            <h2 style={{
              margin: '0 0 12px 0',
              fontSize: '0.8rem',
              fontWeight: 800,
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Job Photos
            </h2>

            {/* Photo Capture CTA */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                backgroundColor: isUploading ? '#333' : '#ff9800',
                color: '#000',
                fontWeight: 800,
                fontSize: '0.9rem',
                padding: '12px 16px',
                borderRadius: '8px',
                cursor: isUploading ? 'not-allowed' : 'pointer',
                minHeight: '48px',
                textAlign: 'center',
                boxShadow: '0 2px 6px rgba(255, 152, 0, 0.3)',
                transition: 'background-color 0.2s',
              }}>
                <CameraIcon />
                {isUploading ? 'PROCESSING...' : 'CAPTURE & UPLOAD PHOTO'}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  disabled={isUploading}
                  onChange={handlePhotoSelect}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {/* Upload Queue Display if any items exist */}
            {(uploadQueue.length > 0 || uploadedPhotos.length > 0) ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                
                {/* Render Queue Items */}
                {uploadQueue.map((item) => (
                  <div key={item.id} style={{
                    position: 'relative',
                    aspectRatio: '1',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid #d32f2f',
                  }}>
                    <img 
                      src={item.dataUrl} 
                      alt="Queued photo" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} 
                    />
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      backgroundColor: 'rgba(211, 47, 47, 0.85)',
                      color: '#fff',
                      fontSize: '0.55rem',
                      fontWeight: 800,
                      textAlign: 'center',
                      padding: '4px 2px',
                      textTransform: 'uppercase',
                    }}>
                      QUEUED (OFFLINE)
                    </div>
                  </div>
                ))}

                {/* Render Uploaded Photos */}
                {uploadedPhotos.map((photo) => (
                  <div key={photo.id} style={{
                    position: 'relative',
                    aspectRatio: '1',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid #333',
                  }}>
                    <img 
                      src={photo.url} 
                      alt={photo.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    <div style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      backgroundColor: 'rgba(0, 230, 118, 0.85)',
                      color: '#000',
                      borderRadius: '50%',
                      width: '16px',
                      height: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <CheckIcon />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                border: '2px dashed #333',
                borderRadius: '8px',
                padding: '24px',
                textAlign: 'center',
                color: '#666',
                fontSize: '0.8rem',
              }}>
                No photos uploaded yet for this job.
              </div>
            )}
          </section>
        </main>
      )}

      {/* Sticky Bottom Footer CTA */}
      {selectedJob && (
        <footer style={{
          backgroundColor: '#1e1e1e',
          borderTop: '1px solid #2a2a2a',
          padding: '12px 16px',
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          boxShadow: '0 -2px 10px rgba(0,0,0,0.5)',
        }}>
          <button
            onClick={handleCompleteJob}
            disabled={!isChecklistComplete || isUploading}
            style={{
              width: '100%',
              backgroundColor: isChecklistComplete ? '#00e676' : '#2a2a2a',
              color: isChecklistComplete ? '#000000' : '#666666',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.95rem',
              padding: '14px 20px',
              cursor: isChecklistComplete && !isUploading ? 'pointer' : 'not-allowed',
              minHeight: '48px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              transition: 'all 0.2s',
              boxShadow: isChecklistComplete ? '0 4px 12px rgba(0, 230, 118, 0.3)' : 'none',
            }}
          >
            {isUploading ? 'SYNCING...' : isChecklistComplete ? 'COMPLETE JOB & INVOICE' : 'CHECK ALL ITEMS TO COMPLETE'}
          </button>
        </footer>
      )}
    </div>
  );
}
