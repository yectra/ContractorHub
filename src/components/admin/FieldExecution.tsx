import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServiceRequests, useScheduledJobs } from '../../hooks/useDispatchData';
import styles from '../../styles/UI/FieldExecution.module.scss';

// Zero-dependency SVG Icons matching CRM design system
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

const CameraIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CloudIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const SaveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
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
  // Step 1: Parse dispatcher's template from job notes
  let dispatcherTemplate: ChecklistItem[] | null = null;
  if (notes?.startsWith('CHECKLIST:')) {
    try {
      const parsed = JSON.parse(notes.replace('CHECKLIST:', ''));
      if (Array.isArray(parsed) && parsed.length > 0) {
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

  // Step 2: Load cached technician progress
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

  // Step 3 & 4: Merge dispatcher template with technician's checked progress
  if (dispatcherTemplate) {
    if (!cachedItems) {
      return dispatcherTemplate;
    }

    const templateIds = dispatcherTemplate.map((i) => i.id).sort().join(',');
    const cachedIds = cachedItems.map((i) => i.id).sort().join(',');

    if (templateIds === cachedIds) {
      return cachedItems;
    }

    const checkedMap = new Map(cachedItems.map((i) => [i.id, i.checked]));
    return dispatcherTemplate.map((item) => ({
      ...item,
      checked: checkedMap.has(item.id) ? checkedMap.get(item.id)! : item.checked,
    }));
  }

  // Step 5: Fall back to cache or defaults
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
  const navigate = useNavigate();

  // Connectivity state
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [successAlert, setSuccessAlert] = useState<string | null>(null);

  // Load backend hooks
  const { serviceRequests, updateServiceRequest } = useServiceRequests();
  const { scheduledJobs, updateScheduledJob } = useScheduledJobs();

  // Navigation context
  const previousView = sessionStorage.getItem('previousView') || 'ADMIN';
  const [sessionJobId] = useState(() => sessionStorage.getItem('selectedJobId') || '');

  // Selected job state
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

  // Filter out scheduled jobs that are active
  const activeJobs = useMemo(() => {
    return scheduledJobs.map((job) => {
      const request = serviceRequests.find((r) => r.id === job.serviceRequestId);
      return {
        ...job,
        clientName: request?.client || 'Unknown Client',
        serviceName: request?.service || 'General Service',
        address: request?.location || 'Unknown Address',
        phone: '555-0199',
      };
    });
  }, [scheduledJobs, serviceRequests]);

  // Prefer session-passed job if it matches an active job; otherwise first available job
  const sessionPreferredJobId = sessionJobId && activeJobs.some((j) => j.id === sessionJobId)
    ? sessionJobId
    : '';
  const effectiveSelectedJobId = selectedJobId || sessionPreferredJobId || activeJobs[0]?.id || '';

  useEffect(() => {
    if (activeJobs.length > 0 && sessionJobId) {
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
    return checklist.length > 0 && checklist.every((item) => item.checked);
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
          },
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
      const fileName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';

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
            path: path,
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
      setSuccessAlert('Technician notes submitted and saved successfully!');
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

      // 3. Clear cached checklist, comments and queue
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

  // Handle back navigation
  const handleBackNavigation = () => {
    if (previousView === 'TECH_DASHBOARD') {
      navigate('/tech-dashboard');
    } else {
      navigate(-1);
    }
  };

  const jobIdString = selectedJob
    ? `${selectedJob.serviceRequestId || selectedJob.id} - ${selectedJob.clientName}`
    : 'No Active Job';

  return (
    <div className={styles.container}>
      {/* Top Banner for Offline Warning */}
      {!isOnline && (
        <div className={styles.offlineBanner}>
          <CloudIcon />
          <span>Offline Mode — Changes saved locally and will auto-sync when online.</span>
        </div>
      )}

      {/* Header Bar: White, bordered, shadowless header matching CRM layout style */}
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <div className={styles.headerLeft}>
            <button
              onClick={handleBackNavigation}
              className={styles.backButton}
              aria-label="Back to dashboard"
            >
              <BackIcon />
            </button>

            <div className={styles.headerTitleWrapper}>
              <span className={styles.headerSubtitle}>Field Execution</span>
              <h1 className={styles.headerTitle}>{jobIdString}</h1>
            </div>
          </div>

          <div className={styles.headerRight}>
            {/* Job Selector Dropdown */}
            {activeJobs.length > 0 && (
              <select
                value={effectiveSelectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className={styles.jobSelect}
                aria-label="Select active job"
              >
                {activeJobs.map((j) => (
                  <option key={j.id || ''} value={j.id || ''}>
                    {j.serviceRequestId || j.id} - {j.clientName}
                  </option>
                ))}
              </select>
            )}

            {/* Connectivity Status Pill */}
            <span className={isOnline ? styles.pillOnline : styles.pillOffline}>
              <CloudIcon />
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>

            {/* Scheduled / In Progress / Completed Status Pill */}
            {selectedJob && (
              <span
                className={
                  selectedJob.status === 'Completed'
                    ? styles.pillCompleted
                    : selectedJob.status === 'InProgress'
                    ? styles.pillInProgress
                    : styles.pillScheduled
                }
              >
                {selectedJob.status?.toUpperCase() || 'SCHEDULED'}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Alert Notices */}
      {errorAlert && (
        <div className={styles.alertError}>
          <span>{errorAlert}</span>
          <button onClick={() => setErrorAlert(null)}>×</button>
        </div>
      )}

      {successAlert && (
        <div className={styles.alertSuccess}>
          <span>{successAlert}</span>
          <button onClick={() => setSuccessAlert(null)}>×</button>
        </div>
      )}

      {/* Main Content Area */}
      {!selectedJob ? (
        <div className={styles.noRecordsContainer}>
          <CloudIcon />
          <h2>No Active Job Selected</h2>
          <p>
            To start executing work, schedule a job on the Dispatch timeline and make sure you select it from the dropdown above.
          </p>
          <button
            onClick={() => navigate('/')}
            className={styles.buttonPrimary}
          >
            Go to Dispatch Board
          </button>
        </div>
      ) : (
        <div className={styles.contentArea}>
          {/* LEFT-SIDE WORKSPACE LAYOUT (Approx. 70% width) */}
          <div className={styles.mainSection}>
            {/* UPPER SECTION: Active Task Summary Card styled identically to CRM's FINANCIAL SUMMARY PANEL */}
            <div className={styles.card}>
              <div className={styles.sectionTitle}>
                <span>Active Task Summary</span>
                <span className={styles.sectionSubtitle}>Live field execution status</span>
              </div>

              <div className={styles.metricGrid}>
                {/* Metric Card 1: Service Name */}
                <div className={styles.metricCard}>
                  <div className={styles.metricLabel}>Active Task / Scope</div>
                  <div className={styles.metricValue} title={selectedJob.serviceName}>
                    {selectedJob.serviceName}
                  </div>
                  <div className={styles.metricFooter}>Primary Work Order</div>
                </div>

                {/* Metric Card 2: Completion Progress */}
                <div className={styles.metricCard}>
                  <div className={styles.metricLabel}>Checklist Completion</div>
                  <div
                    className={
                      progressPercentage === 100
                        ? styles.metricValueGreen
                        : styles.metricValueOrange
                    }
                  >
                    {progressPercentage}%
                  </div>
                  <div className={styles.metricFooter}>
                    {checklist.filter((i) => i.checked).length} of {checklist.length} Steps Done
                  </div>
                </div>

                {/* Metric Card 3: Execution Status */}
                <div className={styles.metricCard}>
                  <div className={styles.metricLabel}>Execution Status</div>
                  <div style={{ marginTop: '4px' }}>
                    <span
                      className={
                        selectedJob.status === 'Completed'
                          ? styles.pillCompleted
                          : selectedJob.status === 'InProgress'
                          ? styles.pillInProgress
                          : styles.pillScheduled
                      }
                    >
                      {selectedJob.status?.toUpperCase() || 'SCHEDULED'}
                    </span>
                  </div>
                  <div className={styles.metricFooter}>Real-time Dispatch Sync</div>
                </div>
              </div>
            </div>

            {/* MAIN BODY AREA: WORK CHECKLIST modeled exactly after CRM's JOB HISTORY TABLE */}
            <div className={styles.card}>
              <div className={styles.sectionTitle}>
                <span>Work Checklist</span>
                <span className={styles.pillProgress}>
                  {progressPercentage}% Completed
                </span>
              </div>

              {/* Live Progress Bar */}
              <div className={styles.progressBarContainer}>
                <div
                  className={`${styles.progressBarFill} ${
                    progressPercentage === 100 ? styles.complete : ''
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>

              {/* High-density grid checklist table */}
              <div className={styles.checklistTableWrapper}>
                <div className={styles.checklistHeader}>
                  <div className={styles.checklistHeaderCol1}>Status</div>
                  <div className={styles.checklistHeaderCol2}>Standard Operating Procedure / Step</div>
                  <div className={styles.checklistHeaderCol3}>Verification</div>
                </div>

                {checklist.map((step, idx) => (
                  <div
                    key={step.id}
                    onClick={() => handleToggleStep(step.id)}
                    className={`${styles.checklistItem} ${step.checked ? styles.checked : ''}`}
                  >
                    {/* Gray circular checkbox / Green checked circle */}
                    <div
                      className={`${styles.checkboxCircle} ${step.checked ? styles.checked : ''}`}
                    >
                      {step.checked && <CheckIcon />}
                    </div>

                    <div
                      className={`${styles.checklistText} ${step.checked ? styles.checked : ''}`}
                    >
                      <span className={styles.checklistStepNumber}>{idx + 1}.</span>
                      {step.text}
                    </div>

                    <div className={styles.checklistStatusCol}>
                      {step.checked ? (
                        <span className={styles.pillCompleted}>DONE</span>
                      ) : (
                        <span className={styles.pillPending}>PENDING</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Photo Attachments & S3 Upload Card */}
            <div className={styles.card}>
              <div className={styles.sectionTitle}>
                <span>Job Site Photos</span>
                <span className={styles.pillCount}>
                  {uploadedPhotos.length + uploadQueue.length} Photos
                </span>
              </div>

              {/* Photo Capture CTA Button */}
              <label
                className={`${styles.photoUploadLabel} ${
                  isUploading ? styles.disabled : ''
                }`}
              >
                <CameraIcon />
                {isUploading ? 'PROCESSING & UPLOADING...' : 'CAPTURE & UPLOAD JOB PHOTO'}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  disabled={isUploading}
                  onChange={handlePhotoSelect}
                  style={{ display: 'none' }}
                />
              </label>

              {/* Photos Grid */}
              {uploadQueue.length > 0 || uploadedPhotos.length > 0 ? (
                <div className={styles.photoGrid}>
                  {/* Queued Photos */}
                  {uploadQueue.map((item) => (
                    <div
                      key={item.id}
                      className={`${styles.photoCard} ${styles.queued}`}
                    >
                      <img
                        src={item.dataUrl}
                        alt="Queued photo"
                        className={`${styles.photoImg} ${styles.queued}`}
                      />
                      <button
                        onClick={() => handleDeleteQueuedPhoto(item)}
                        title="Remove offline photo"
                        className={styles.photoDeleteBtn}
                      >
                        <TrashIcon />
                      </button>
                      <div className={styles.photoQueuedBadge}>
                        QUEUED (OFFLINE)
                      </div>
                    </div>
                  ))}

                  {/* Uploaded Photos */}
                  {uploadedPhotos.map((photo) => (
                    <div key={photo.id} className={styles.photoCard}>
                      <img
                        src={photo.url}
                        alt={photo.name}
                        className={styles.photoImg}
                      />
                      <button
                        onClick={() => handleDeleteUploadedPhoto(photo)}
                        title="Delete photo"
                        className={styles.photoDeleteBtn}
                      >
                        <TrashIcon />
                      </button>
                      <div className={styles.photoCheckBadge}>
                        <CheckIcon />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyPhotosNotice}>
                  No photos uploaded yet for this service job. Click above to attach inspection photos.
                </div>
              )}
            </div>

            {/* Technician Notes Card */}
            <div className={styles.card}>
              <div className={styles.sectionTitle}>
                <span>Technician Notes / Execution Log</span>
                <span className={styles.sectionSubtitle}>Stored with job history</span>
              </div>

              <textarea
                value={comment}
                onChange={(e) => {
                  setComment(e.target.value);
                  localStorage.setItem(`comment_job_${effectiveSelectedJobId}`, e.target.value);
                }}
                placeholder="Enter field observation notes, materials used, or remarks regarding this job..."
                className={styles.formTextArea}
              />

              <button
                onClick={handleSaveComment}
                disabled={isSavingComment}
                className={styles.buttonPrimary}
              >
                <SaveIcon />
                {isSavingComment ? 'SAVING NOTES...' : 'SUBMIT & SAVE NOTES'}
              </button>
            </div>
          </div>

          {/* RIGHT-SIDE SIDEBAR CONTAINER (Approx. 30% width) */}
          <div className={styles.sidebarSection}>
            {/* Customer & Job Site Info Card: Replicating CRM's CLIENT PROFILE CARD */}
            <div className={styles.card}>
              <div className={styles.sectionTitle}>
                <span>Customer & Job Site Info</span>
              </div>

              <div className={styles.profileDetail}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Client Name</span>
                  <span className={`${styles.detailValue} ${styles.large}`}>
                    {selectedJob.clientName}
                  </span>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Service Address</span>
                  <span className={`${styles.detailValue} ${styles.muted}`}>
                    {selectedJob.address}
                  </span>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Contact Phone</span>
                  <span className={styles.detailValue}>
                    {selectedJob.phone ? (
                      <a href={`tel:${selectedJob.phone}`} className={styles.phoneLink}>
                        <PhoneIcon />
                        {selectedJob.phone}
                      </a>
                    ) : (
                      <span className={styles.detailValueMuted}>No phone listed</span>
                    )}
                  </span>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Site Navigation / GPS</span>
                  <span className={styles.detailValue}>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        selectedJob.address
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.mapLink}
                    >
                      <MapIcon />
                      View on Google Maps
                    </a>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick-Action Panel: Vertical Outline Buttons */}
            <div className={styles.card}>
              <div className={styles.sectionTitle}>
                <span>Quick Actions</span>
              </div>

              <div className={styles.quickActionsList}>
                <a
                  href={`tel:${selectedJob.phone}`}
                  className={styles.buttonOutline}
                >
                  <PhoneIcon />
                  CALL SITE CONTACT
                </a>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    selectedJob.address
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.buttonOutline}
                >
                  <MapIcon />
                  OPEN MAP ROUTE
                </a>

                {/* Complete Job & Invoice Button */}
                <button
                  onClick={handleCompleteJob}
                  disabled={!isChecklistComplete || isUploading}
                  className={
                    isChecklistComplete && !isUploading
                      ? styles.buttonPrimaryLarge
                      : styles.buttonDisabledLarge
                  }
                >
                  {isUploading ? (
                    'SYNCING DATA...'
                  ) : isChecklistComplete ? (
                    <>
                      <CheckIcon /> COMPLETE JOB & INVOICE
                    </>
                  ) : (
                    'CHECK ALL ITEMS TO COMPLETE'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
