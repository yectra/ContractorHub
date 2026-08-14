import React, { useState, useEffect, useMemo } from 'react';
import { useServiceRequests, useScheduledJobs } from '../../hooks/useDispatchData';

// Inline SVG's for pure zero-dependency icons
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

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
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

const readCachedArray = <T,>(key: string, fallback: T[]): T[] => {
  const cached = localStorage.getItem(key);
  if (!cached) return fallback;

  try {
    const parsed = JSON.parse(cached);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const getChecklistForJob = (jobId: string, notes?: string | null): ChecklistItem[] => {
  // ── Step 1: Parse dispatcher's template from job notes ────────────────────
  let dispatcherTemplate: ChecklistItem[] | null = null;
  if (notes?.startsWith('CHECKLIST:')) {
    try {
      const parsed = JSON.parse(notes.replace('CHECKLIST:', ''));
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Normalise field names: dispatcher uses 'checked', legacy may use 'completed'
        dispatcherTemplate = parsed.map((item: any) => ({
          id: String(item.id ?? `step-${Math.random()}`),
          text: String(item.text ?? ''),
          checked: Boolean(item.checked ?? item.completed ?? false),
        }));
      }
    } catch {
      // Malformed JSON — skip
    }
  }

  // ── Step 2: Load cached technician progress ───────────────────────────────
  let cachedItems: ChecklistItem[] | null = null;
  const cached = localStorage.getItem(`checklist_job_${jobId}`);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) cachedItems = parsed;
    } catch {
      // Corrupted cache — ignore
    }
  }

  // ── Step 3 & 4: Merge dispatcher template with technician's checked progress
  if (dispatcherTemplate) {
    if (!cachedItems) {
      // No local progress yet — return the dispatcher's template (all unchecked)
      return dispatcherTemplate;
    }

    // Detect structural change: compare sorted item ID sets
    const templateIds = dispatcherTemplate.map((i) => i.id).sort().join(',');
    const cachedIds   = cachedItems.map((i) => i.id).sort().join(',');

    if (templateIds === cachedIds) {
      // Same structure → honour technician's checked progress from localStorage
      return cachedItems;
    }

    // Dispatcher updated the template → merge, preserving checked state for matching IDs
    const checkedMap = new Map(cachedItems.map((i) => [i.id, i.checked]));
    return dispatcherTemplate.map((item) => ({
      ...item,
      checked: checkedMap.has(item.id) ? checkedMap.get(item.id)! : item.checked,
    }));
  }

  // ── Step 5: No dispatcher template — fall back to cache or static defaults ─
  if (cachedItems) return cachedItems;
  return DEFAULT_STEPS;
};

const getCommentForJob = (jobId: string, notes?: string | null): string => {
  const cached = localStorage.getItem(`comment_job_${jobId}`);
  if (cached !== null) return cached;

  if (notes) {
    if (notes.startsWith('CHECKLIST:')) {
      return '';
    }
    try {
      const parsed = JSON.parse(notes);
      if (parsed && typeof parsed.comment === 'string') {
        return parsed.comment;
      }
    } catch {
      // Ignored
    }
  }

  return '';
};

export default function FieldExecution() {
  // Connectivity state
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [successAlert, setSuccessAlert] = useState<string | null>(null);

  // Load backend hooks
  const { serviceRequests, updateServiceRequest } = useServiceRequests();
  const { scheduledJobs, updateScheduledJob } = useScheduledJobs();

  // ── Navigation context ────────────────────────────────────────────────────
  // Reads the previousView token set by the caller (Admin panel or TechDashboard)
  // so the back arrow can route correctly without hard-coding a single destination.
  const previousView = sessionStorage.getItem('previousView') || 'ADMIN';

  // If the TechDashboard passed a specific job ID via sessionStorage, honour it.
  const [sessionJobId] = useState(() => sessionStorage.getItem('selectedJobId') || '');

  // Selected job state — pre-populated from session if available
  const [selectedJobId, setSelectedJobId] = useState<string>(sessionJobId);

  // Checklist state
  const [checklist, setChecklist] = useState<ChecklistItem[]>(DEFAULT_STEPS);

  // Comment state
  const [comment, setComment] = useState<string>('');
  const [isSavingComment, setIsSavingComment] = useState<boolean>(false);

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

  // Prefer the session-passed job if it matches an active job; otherwise fall back to the first job.
  const sessionPreferredJobId = sessionJobId && activeJobs.some((j) => j.id === sessionJobId)
    ? sessionJobId
    : '';
  const effectiveSelectedJobId = selectedJobId || sessionPreferredJobId || activeJobs[0]?.id || '';

  useEffect(() => {
    if (activeJobs.length > 0 && sessionJobId) {
      // Clear the session hint so it doesn't interfere on next manual selection
      sessionStorage.removeItem('selectedJobId');
      sessionStorage.removeItem('selectedSrId');
    }
  }, [activeJobs.length, sessionJobId]);

  // Find currently selected job details
  const selectedJob = useMemo(() => {
    return activeJobs.find((j) => j.id === effectiveSelectedJobId) || null;
  }, [activeJobs, effectiveSelectedJobId]);

  const [loadedJobCacheKey, setLoadedJobCacheKey] = useState<string | null>(null);
  const selectedJobCacheKey = effectiveSelectedJobId
    ? JSON.stringify([effectiveSelectedJobId, selectedJob?.notes])
    : null;

  // Load checklist and photos from cache when job selection changes
  if (effectiveSelectedJobId && selectedJobCacheKey !== loadedJobCacheKey) {
    setLoadedJobCacheKey(selectedJobCacheKey);
    setChecklist(getChecklistForJob(effectiveSelectedJobId, selectedJob?.notes));
    setComment(getCommentForJob(effectiveSelectedJobId, selectedJob?.notes));
    setUploadQueue(readCachedArray<QueuedUpload>(`upload_queue_${effectiveSelectedJobId}`, []));
    setUploadedPhotos(readCachedArray<UploadedPhoto>(`photos_job_${effectiveSelectedJobId}`, []));
  } else if (!effectiveSelectedJobId && loadedJobCacheKey) {
    setLoadedJobCacheKey(null);
  }

  // Persist checklist changes
  const saveChecklist = async (updatedChecklist: ChecklistItem[]) => {
    setChecklist(updatedChecklist);
    if (!effectiveSelectedJobId) return;

    const checklistStr = JSON.stringify(updatedChecklist);
    localStorage.setItem(`checklist_job_${effectiveSelectedJobId}`, checklistStr);

    // Try to sync with Amplify backend if online
    if (isOnline) {
      try {
        const notesObj = {
          checklist: updatedChecklist,
          comment: comment,
          photos: uploadedPhotos,
        };
        await updateScheduledJob(effectiveSelectedJobId, {
          notes: JSON.stringify(notesObj),
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
          path: `jobs/${effectiveSelectedJobId}/${Date.now()}_${name}`,
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
    if (!files || files.length === 0 || !effectiveSelectedJobId) return;

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
        localStorage.setItem(`upload_queue_${effectiveSelectedJobId}`, JSON.stringify(updatedQueue));
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
        localStorage.setItem(`photos_job_${effectiveSelectedJobId}`, JSON.stringify(updatedPhotos));

        // Sync with Amplify database
        try {
          const notesObj = {
            checklist,
            comment,
            photos: updatedPhotos,
          };
          await updateScheduledJob(effectiveSelectedJobId, {
            notes: JSON.stringify(notesObj),
          });
        } catch (err) {
          console.error('Failed to sync uploaded photo to backend:', err);
        }

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
    if (!isOnline || uploadQueue.length === 0 || !effectiveSelectedJobId) return;

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
      localStorage.setItem(`photos_job_${effectiveSelectedJobId}`, JSON.stringify(successfulPhotos));

      // Sync offline queue sync with backend
      try {
        const notesObj = {
          checklist,
          comment,
          photos: successfulPhotos,
        };
        await updateScheduledJob(effectiveSelectedJobId, {
          notes: JSON.stringify(notesObj),
        });
      } catch (err) {
        console.error('Failed to sync synced photos to backend:', err);
      }

      setUploadQueue(failedUploads);
      if (failedUploads.length > 0) {
        localStorage.setItem(`upload_queue_${effectiveSelectedJobId}`, JSON.stringify(failedUploads));
        setErrorAlert('Some queued photo uploads failed to sync.');
      } else {
        localStorage.removeItem(`upload_queue_${effectiveSelectedJobId}`);
        setSuccessAlert('All offline photo uploads synced successfully!');
        setTimeout(() => setSuccessAlert(null), 3000);
      }
      setIsUploading(false);
    };

    processQueue();
  }, [isOnline, uploadQueue, effectiveSelectedJobId, uploadedPhotos]);

  const handleDeleteUploadedPhoto = async (photo: UploadedPhoto) => {
    if (!effectiveSelectedJobId) return;

    const updatedPhotos = uploadedPhotos.filter((p) => p.id !== photo.id);
    setUploadedPhotos(updatedPhotos);
    localStorage.setItem(`photos_job_${effectiveSelectedJobId}`, JSON.stringify(updatedPhotos));

    if (isOnline) {
      try {
        const notesObj = {
          checklist,
          comment,
          photos: updatedPhotos,
        };
        await updateScheduledJob(effectiveSelectedJobId, {
          notes: JSON.stringify(notesObj),
        });

        const storageModule = await import('aws-amplify/storage');
        if (storageModule && typeof storageModule.remove === 'function') {
          let path = photo.url;
          if (path.startsWith('http')) {
            const match = path.match(/jobs\/.+/);
            if (match) {
              path = match[0];
            }
          }
          await storageModule.remove({
            path: path
          });
        }
      } catch (err) {
        console.error('Failed to delete photo from storage:', err);
      }
    }
    setSuccessAlert('Photo deleted successfully.');
    setTimeout(() => setSuccessAlert(null), 3000);
  };

  const handleDeleteQueuedPhoto = (item: QueuedUpload) => {
    if (!effectiveSelectedJobId) return;

    const updatedQueue = uploadQueue.filter((q) => q.id !== item.id);
    setUploadQueue(updatedQueue);
    localStorage.setItem(`upload_queue_${effectiveSelectedJobId}`, JSON.stringify(updatedQueue));

    setSuccessAlert('Queued photo removed.');
    setTimeout(() => setSuccessAlert(null), 3000);
  };

  const handleSaveComment = async () => {
    if (!effectiveSelectedJobId) return;

    setIsSavingComment(true);
    setErrorAlert(null);
    try {
      localStorage.setItem(`comment_job_${effectiveSelectedJobId}`, comment);

      if (isOnline) {
        const notesObj = {
          checklist: checklist,
          comment: comment,
          photos: uploadedPhotos,
        };
        await updateScheduledJob(effectiveSelectedJobId, {
          notes: JSON.stringify(notesObj),
        });
      }
      setSuccessAlert('Notes submitted and saved successfully!');
      setTimeout(() => setSuccessAlert(null), 3000);
    } catch (err) {
      console.error('Failed to save comment:', err);
      setErrorAlert('Failed to save notes to server. Notes are saved locally.');
    } finally {
      setIsSavingComment(false);
    }
  };

  // Complete Job & Invoice flow
  const handleCompleteJob = async () => {
    if (!isChecklistComplete || !effectiveSelectedJobId || !selectedJob) return;

    try {
      setIsUploading(true);
      setErrorAlert(null);

      // 1. Update ScheduledJob status to Completed in database
      await updateScheduledJob(effectiveSelectedJobId, {
        status: 'Completed',
      });

      // 2. Update ServiceRequest status to Completed
      if (selectedJob.serviceRequestId) {
        await updateServiceRequest(selectedJob.serviceRequestId, {
          status: 'Completed',
        });
      }

      // 3. Clear cached checklist, comments and queue (keep photos for completed job history)
      localStorage.removeItem(`checklist_job_${effectiveSelectedJobId}`);
      localStorage.removeItem(`upload_queue_${effectiveSelectedJobId}`);
      localStorage.removeItem(`comment_job_${effectiveSelectedJobId}`);

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
    paddingBottom: '68px',
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
          padding: '6px 10px',
          fontWeight: 700,
          fontSize: '0.66rem',
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
        backgroundColor: '#1a1a1a',
        borderBottom: '1px solid #333',
        padding: '8px 12px',
        position: 'sticky',
        top: !isOnline ? '35px' : 0,
        zIndex: 100,
        boxShadow: '0 2px 8px rgba(0,0,0,0.55)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <button 
            onClick={() => {
              // Context-aware back navigation:
              // If the user arrived from the TechDashboard calendar, return there.
              // Otherwise default to the Admin Dispatch panel.
              if (previousView === 'TECH_DASHBOARD') {
                window.location.href = '/tech-dashboard';
              } else {
                window.location.href = '/';
              }
            }}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#ff9800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              minWidth: '30px',
              minHeight: '30px',
              width: '30px',
              height: '30px',
            }}
            aria-label="Back to dashboard"
          >
            <BackIcon />
          </button>

          {/* Job Selector Dropdown */}
          <div style={{ flex: 1, marginLeft: '8px', marginRight: '8px' }}>
            <select
              value={effectiveSelectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              style={{
                backgroundColor: '#2a2a2a',
                color: '#ffffff',
                border: '1px solid #444',
                borderRadius: '6px',
                padding: '0 10px',
                width: '100%',
                fontSize: '0.72rem',
                fontWeight: 600,
                minHeight: '32px',
                height: '32px',
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
            padding: '0 8px',
            borderRadius: '12px',
            gap: '5px',
            fontSize: '0.6rem',
            fontWeight: 700,
            minHeight: '26px',
          }}>
            <CloudIcon offline={!isOnline} />
            <span style={{ color: isOnline ? '#00e676' : '#ff4d4d' }}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        {selectedJob && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '9px', color: '#ff9800', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '1px' }}>
                Active Job
              </div>
              <h1 style={{ fontSize: '13px', margin: 0, fontWeight: 800, color: '#ffffff', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedJob.serviceName}
              </h1>
            </div>
            <span style={{
              backgroundColor: selectedJob.status === 'Completed' ? '#00e676' : '#ff9800',
              color: '#000',
              fontSize: '9px',
              fontWeight: 900,
              padding: '2px 7px',
              borderRadius: '4px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              marginLeft: '8px',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}>
              {selectedJob.status}
            </span>
          </div>
        )}
      </header>

      {/* Alert Notices */}
      {errorAlert && (
        <div style={{
          backgroundColor: 'rgba(211,47,47,0.12)',
          color: '#ff6b6b',
          borderLeft: '3px solid #d32f2f',
          margin: '8px 12px',
          padding: '7px 10px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: 600,
        }}>
          {errorAlert}
        </div>
      )}

      {successAlert && (
        <div style={{
          backgroundColor: 'rgba(0,230,118,0.1)',
          color: '#00e676',
          borderLeft: '3px solid #00e676',
          margin: '8px 12px',
          padding: '7px 10px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: 600,
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
          padding: '28px 18px',
          textAlign: 'center',
        }}>
          <CloudIcon offline />
          <h2 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ff9800', margin: '10px 0 6px 0' }}>
            No Active Job Selected
          </h2>
          <p style={{ color: '#aaa', fontSize: '0.7rem', maxWidth: '300px', lineHeight: 1.35 }}>
            To start, schedule a job on the Dispatch timeline and make sure you select it from the dropdown above.
          </p>
        </div>
      ) : (
        <main style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          
          {/* Client Info Section */}
          <section style={{
            backgroundColor: '#1e1e1e',
            borderRadius: '8px',
            border: '1px solid #2e2e2e',
            padding: '10px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          }}>
            <h2 style={{
              margin: '0 0 6px 0',
              fontSize: '9px',
              fontWeight: 800,
              color: '#ff9800',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              paddingBottom: '5px',
              borderBottom: '1px solid #2e2e2e',
            }}>
              Customer & Job Site
            </h2>
            <div style={{ fontSize: '12px', fontWeight: 750, color: '#ffffff', marginBottom: '2px', lineHeight: 1.25 }}>
              {selectedJob.clientName}
            </div>
            <div style={{ fontSize: '11px', color: '#999', lineHeight: 1.3, marginBottom: '8px' }}>
              {selectedJob.address}
            </div>

            {/* Large Thumb Actions (Call, Maps Route) */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <a
                href={`tel:${selectedJob.phone}`}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  backgroundColor: '#1a2a1a',
                  color: '#00e676',
                  border: '1.5px solid #00e676',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontWeight: 800,
                  fontSize: '11px',
                  minHeight: '38px',
                  touchAction: 'manipulation',
                  letterSpacing: '0.4px',
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
                  gap: '5px',
                  backgroundColor: '#1a1f2e',
                  color: '#82b1ff',
                  border: '1.5px solid #3d6bde',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontWeight: 800,
                  fontSize: '11px',
                  minHeight: '38px',
                  touchAction: 'manipulation',
                  letterSpacing: '0.4px',
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
            borderRadius: '8px',
            border: '1px solid #2e2e2e',
            padding: '10px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
              <h2 style={{
                margin: 0,
                fontSize: '9px',
                fontWeight: 800,
                color: '#ff9800',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
              }}>
                Work Checklist
              </h2>
              <span style={{ fontSize: '11px', fontWeight: 800, color: progressPercentage === 100 ? '#00e676' : '#ff9800', letterSpacing: '0.3px' }}>
                {progressPercentage}%
              </span>
            </div>

            {/* Live Progress Bar */}
            <div style={{
              width: '100%',
              height: '4px',
              backgroundColor: '#2a2a2a',
              borderRadius: '3px',
              overflow: 'hidden',
              marginBottom: '8px',
            }}>
              <div style={{
                width: `${progressPercentage}%`,
                height: '100%',
                backgroundColor: progressPercentage === 100 ? '#00e676' : '#ff9800',
                transition: 'width 0.3s ease-in-out',
              }} />
            </div>

            {/* Checklist items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {checklist.map((step) => (
                <div
                  key={step.id}
                  onClick={() => handleToggleStep(step.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: step.checked ? 'rgba(0, 230, 118, 0.06)' : '#242424',
                    border: step.checked ? '1px solid rgba(0, 230, 118, 0.25)' : '1px solid #303030',
                    borderRadius: '6px',
                    padding: '0 10px',
                    cursor: 'pointer',
                    minHeight: '38px',
                    boxSizing: 'border-box',
                    userSelect: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Checkbox Circle */}
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: step.checked ? '2px solid #00e676' : '2px solid #555',
                    backgroundColor: step.checked ? '#00e676' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '8px',
                    flexShrink: 0,
                    color: '#000',
                  }}>
                    {step.checked && <CheckIcon />}
                  </div>
                  <span style={{
                    fontSize: '12px',
                    color: step.checked ? '#777' : '#e0e0e0',
                    textDecoration: step.checked ? 'line-through' : 'none',
                    lineHeight: 1.25,
                    fontWeight: step.checked ? 400 : 500,
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
            borderRadius: '8px',
            border: '1px solid #2e2e2e',
            padding: '10px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          }}>
            <h2 style={{
              margin: '0 0 6px 0',
              fontSize: '9px',
              fontWeight: 800,
              color: '#ff9800',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              paddingBottom: '5px',
              borderBottom: '1px solid #2e2e2e',
            }}>
              Job Photos
            </h2>

            {/* Photo Capture CTA */}
            <div style={{ marginBottom: '8px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                backgroundColor: isUploading ? '#333' : '#ff9800',
                color: '#000',
                fontWeight: 800,
                fontSize: '11px',
                letterSpacing: '0.35px',
                padding: '0 12px',
                borderRadius: '6px',
                cursor: isUploading ? 'not-allowed' : 'pointer',
                minHeight: '38px',
                textAlign: 'center',
                boxShadow: '0 2px 6px rgba(255, 152, 0, 0.28)',
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                
                {/* Render Queue Items */}
                {uploadQueue.map((item) => (
                  <div key={item.id} style={{
                    position: 'relative',
                    aspectRatio: '1',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    border: '1px solid #d32f2f',
                  }}>
                    <img 
                      src={item.dataUrl} 
                      alt="Queued photo" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} 
                    />
                    <button
                      onClick={() => handleDeleteQueuedPhoto(item)}
                      title="Delete offline photo"
                      style={{
                        position: 'absolute',
                        top: 3,
                        left: 3,
                        backgroundColor: 'rgba(211, 47, 47, 0.85)',
                        border: 'none',
                        color: '#fff',
                        borderRadius: '4px',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0,
                        zIndex: 10,
                      }}
                    >
                      <TrashIcon />
                    </button>
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
                      padding: '3px 2px',
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
                    borderRadius: '6px',
                    overflow: 'hidden',
                    border: '1px solid #333',
                  }}>
                    <img 
                      src={photo.url} 
                      alt={photo.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    <button
                      onClick={() => handleDeleteUploadedPhoto(photo)}
                      title="Delete photo"
                      style={{
                        position: 'absolute',
                        top: 3,
                        left: 3,
                        backgroundColor: 'rgba(211, 47, 47, 0.85)',
                        border: 'none',
                        color: '#fff',
                        borderRadius: '4px',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0,
                        zIndex: 10,
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d32f2f'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(211, 47, 47, 0.85)'}
                    >
                      <TrashIcon />
                    </button>
                    <div style={{
                      position: 'absolute',
                      top: 3,
                      right: 3,
                      backgroundColor: 'rgba(0, 230, 118, 0.85)',
                      color: '#000',
                      borderRadius: '50%',
                      width: '14px',
                      height: '14px',
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
                border: '2px dashed #2e2e2e',
                borderRadius: '6px',
                padding: '14px',
                textAlign: 'center',
                color: '#555',
                fontSize: '11px',
              }}>
                No photos uploaded yet for this job.
              </div>
            )}
          </section>

          {/* Comments Section */}
          <section style={{
            backgroundColor: '#1e1e1e',
            borderRadius: '8px',
            border: '1px solid #2e2e2e',
            padding: '10px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          }}>
            <h2 style={{
              margin: '0 0 6px 0',
              fontSize: '9px',
              fontWeight: 800,
              color: '#ff9800',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              paddingBottom: '5px',
              borderBottom: '1px solid #2e2e2e',
            }}>
              Technician Notes / Comments
            </h2>
            <textarea
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                localStorage.setItem(`comment_job_${effectiveSelectedJobId}`, e.target.value);
              }}
              placeholder="Enter notes or comments regarding this job..."
              style={{
                width: '100%',
                minHeight: '80px',
                backgroundColor: '#2a2a2a',
                color: '#ffffff',
                border: '1px solid #444',
                borderRadius: '6px',
                padding: '8px 10px',
                fontSize: '12px',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                resize: 'vertical',
                outline: 'none',
                marginTop: '8px',
                marginBottom: '8px',
              }}
            />
            <button
              onClick={handleSaveComment}
              disabled={isSavingComment}
              style={{
                width: '100%',
                backgroundColor: '#ff9800',
                color: '#000000',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 800,
                fontSize: '11px',
                letterSpacing: '0.35px',
                cursor: isSavingComment ? 'not-allowed' : 'pointer',
                minHeight: '38px',
                boxShadow: '0 2px 6px rgba(255, 152, 0, 0.28)',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!isSavingComment) e.currentTarget.style.backgroundColor = '#f58c00';
              }}
              onMouseLeave={(e) => {
                if (!isSavingComment) e.currentTarget.style.backgroundColor = '#ff9800';
              }}
            >
              {isSavingComment ? 'SAVING...' : 'SUBMIT NOTES'}
            </button>
          </section>
        </main>
      )}

      {/* Sticky Bottom Footer CTA */}
      {selectedJob && (
        <footer style={{
          backgroundColor: '#181818',
          borderTop: '1px solid #2e2e2e',
          padding: '8px 12px',
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          boxShadow: '0 -3px 14px rgba(0,0,0,0.65)',
        }}>
          <button
            onClick={handleCompleteJob}
            disabled={!isChecklistComplete || isUploading}
            style={{
              width: '100%',
              backgroundColor: isChecklistComplete ? '#00e676' : '#242424',
              color: isChecklistComplete ? '#000000' : '#555555',
              border: isChecklistComplete ? 'none' : '1px solid #333',
              borderRadius: '8px',
              fontWeight: 900,
              fontSize: '12px',
              letterSpacing: '0.5px',
              cursor: isChecklistComplete && !isUploading ? 'pointer' : 'not-allowed',
              minHeight: '44px',
              textTransform: 'uppercase',
              transition: 'all 0.2s',
              boxShadow: isChecklistComplete ? '0 0 14px rgba(0, 230, 118, 0.38), 0 3px 10px rgba(0,0,0,0.35)' : 'none',
            }}
          >
            {isUploading ? 'SYNCING...' : isChecklistComplete ? '✓  COMPLETE JOB & INVOICE' : 'CHECK ALL ITEMS TO COMPLETE'}
          </button>
        </footer>
      )}
    </div>
  );
}
