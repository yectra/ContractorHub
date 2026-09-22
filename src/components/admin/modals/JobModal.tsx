import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import styles from '../../../styles/UI/JobModal.module.scss';
import type { Schema } from '../../../../amplify/data/resource';
import { getTodayString } from '../../../utils/jobHelpers';

type ServiceRequest = Schema['ServiceRequest']['type'];
type Technician = Schema['Technician']['type'];

export interface JobFormData {
  service: string;
  type: 'Scheduled' | 'Emergency' | 'WebRequest';
  priority: 'low' | 'medium' | 'high';
  status: 'Unassigned' | 'Assigned' | 'InProgress' | 'Completed';
  assignedTechnicianId: string;
  scheduledDate: string;
  requestTime: string;
  estimatedDuration: string;
  notes: string;
}

interface JobModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  clientAddress: string;
  job: ServiceRequest | null; // null for add job, job object for edit job
  initialScheduledDate?: string;
  technicians?: Technician[];
  onSubmit: (jobData: JobFormData) => Promise<void>;
}

const CancelIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className={styles.spinnerIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="2" x2="12" y2="6" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
    <line x1="2" y1="12" x2="6" y2="12" />
    <line x1="18" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
  </svg>
);

const INITIAL_FORM_DATA: JobFormData = {
  service: '',
  type: 'Scheduled',
  priority: 'low',
  status: 'Unassigned',
  assignedTechnicianId: '',
  scheduledDate: getTodayString(),
  requestTime: '08:00 AM',
  estimatedDuration: '2 hours',
  notes: '',
};

export default function JobModal({
  isOpen,
  onClose,
  clientName,
  clientAddress,
  job,
  initialScheduledDate,
  technicians = [],
  onSubmit,
}: JobModalProps) {
  const [formData, setFormData] = useState<JobFormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<{ service?: string }>({});
  const [touched, setTouched] = useState<{ service?: boolean }>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      setTouched({});
      setSubmitting(false);

      if (job) {
        setFormData({
          service: job.service || '',
          type: (job.type as 'Scheduled' | 'Emergency' | 'WebRequest') || 'Scheduled',
          priority: (job.priority as 'high' | 'medium' | 'low') || 'low',
          status: (job.status as 'Unassigned' | 'Assigned' | 'InProgress' | 'Completed') || 'Unassigned',
          assignedTechnicianId: job.assignedTechnicianId || '',
          scheduledDate: initialScheduledDate || getTodayString(),
          requestTime: job.requestTime || '08:00 AM',
          estimatedDuration: job.estimatedDuration || '2 hours',
          notes: job.notes || '',
        });
      } else {
        setFormData({
          ...INITIAL_FORM_DATA,
          scheduledDate: initialScheduledDate || getTodayString(),
        });
      }
    }
  }, [job, isOpen, initialScheduledDate]);

  const validateService = (value: string): string | undefined => {
    if (!value.trim()) {
      return 'Service description is required.';
    }
    if (value.trim().length < 3) {
      return 'Service description must be at least 3 characters.';
    }
    return undefined;
  };

  const handleChange = (field: keyof JobFormData, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Automatically set status to Assigned if a technician is selected and previous status was Unassigned
      if (field === 'assignedTechnicianId' && value && prev.status === 'Unassigned') {
        updated.status = 'Assigned';
      } else if (field === 'assignedTechnicianId' && !value && prev.status === 'Assigned') {
        updated.status = 'Unassigned';
      }
      return updated;
    });

    if (field === 'service' && touched.service) {
      setErrors({ service: validateService(value) });
    }
  };

  const handleBlur = (field: keyof JobFormData) => {
    if (field === 'service') {
      setTouched((prev) => ({ ...prev, service: true }));
      setErrors({ service: validateService(formData.service) });
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setFormData(INITIAL_FORM_DATA);
    setErrors({});
    setTouched({});
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const serviceError = validateService(formData.service);
    setTouched({ service: true });
    setErrors({ service: serviceError });

    if (serviceError) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        service: formData.service.trim(),
        notes: formData.notes.trim(),
      });
      // Reset state on successful submission
      setFormData(INITIAL_FORM_DATA);
      setErrors({});
      setTouched({});
    } catch (err) {
      console.error('Error in JobModal submit:', err);
      // Keep modal open so user can rectify and retry
    } finally {
      setSubmitting(false);
    }
  };

  const title = job ? 'Edit Job Details' : 'Quick-Create New Job';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      <form onSubmit={handleSubmit} noValidate>
        {/* Pre-populated Client details */}
        <div className={styles.flexGap10}>
          <div className={styles.formGroupFlex1}>
            <label className={styles.formLabel}>Client Name (Pre-populated)</label>
            <input
              type="text"
              disabled
              value={clientName || 'N/A'}
              className={styles.formInputDisabled}
            />
          </div>

          <div className={styles.formGroupFlex1}>
            <label className={styles.formLabel}>Site Address (Pre-populated)</label>
            <input
              type="text"
              disabled
              value={clientAddress || 'No site address specified'}
              className={styles.formInputDisabled}
            />
          </div>
        </div>

        {/* Service Type / Description */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="job-service-input">
            Service Type / Description <span className={styles.requiredStar}>*</span>
          </label>
          <input
            id="job-service-input"
            type="text"
            required
            placeholder="e.g. AC Compressor Diagnostic, Main Drain Line Clog"
            value={formData.service}
            onChange={(e) => handleChange('service', e.target.value)}
            onBlur={() => handleBlur('service')}
            className={`${styles.formInput} ${errors.service ? styles.inputError : ''}`}
            disabled={submitting}
            autoFocus
          />
          {errors.service && <span className={styles.errorMessage}>{errors.service}</span>}
        </div>

        {/* Order Type & Priority Level */}
        <div className={styles.flexGap10}>
          <div className={styles.formGroupFlex1}>
            <label className={styles.formLabel} htmlFor="job-type-select">
              Order Type
            </label>
            <select
              id="job-type-select"
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value as 'Scheduled' | 'Emergency' | 'WebRequest')}
              className={styles.formSelect}
              disabled={submitting}
            >
              <option value="Scheduled">Scheduled</option>
              <option value="Emergency">Emergency</option>
              <option value="WebRequest">Web Request</option>
            </select>
          </div>

          <div className={styles.formGroupFlex1}>
            <label className={styles.formLabel} htmlFor="job-priority-select">
              Priority Level
            </label>
            <select
              id="job-priority-select"
              value={formData.priority}
              onChange={(e) => handleChange('priority', e.target.value as 'low' | 'medium' | 'high')}
              className={styles.formSelect}
              disabled={submitting}
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
          </div>
        </div>

        {/* Technician Assignee & Status */}
        <div className={styles.flexGap10}>
          <div className={styles.formGroupFlex1}>
            <label className={styles.formLabel} htmlFor="job-technician-select">
              Assigned Technician
            </label>
            <select
              id="job-technician-select"
              value={formData.assignedTechnicianId}
              onChange={(e) => handleChange('assignedTechnicianId', e.target.value)}
              className={styles.formSelect}
              disabled={submitting}
            >
              <option value="">Unassigned (Queue)</option>
              {technicians.map((tech) => (
                <option key={tech.id || ''} value={tech.id || ''}>
                  {tech.name} ({tech.specialty || 'General'})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroupFlex1}>
            <label className={styles.formLabel} htmlFor="job-status-select">
              Execution Status
            </label>
            <select
              id="job-status-select"
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value as 'Unassigned' | 'Assigned' | 'InProgress' | 'Completed')}
              className={styles.formSelect}
              disabled={submitting}
            >
              <option value="Unassigned">Unassigned</option>
              <option value="Assigned">Assigned</option>
              <option value="InProgress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Schedule Date, Time Slot & Estimated Duration */}
        <div className={styles.flexGap10}>
          <div className={styles.formGroupFlex1}>
            <label className={styles.formLabel} htmlFor="job-date-input">
              Scheduled Date
            </label>
            <input
              id="job-date-input"
              type="date"
              value={formData.scheduledDate}
              onChange={(e) => handleChange('scheduledDate', e.target.value)}
              className={styles.formInput}
              disabled={submitting}
            />
          </div>

          <div className={styles.formGroupFlex1}>
            <label className={styles.formLabel} htmlFor="job-time-select">
              Requested Time Slot
            </label>
            <select
              id="job-time-select"
              value={formData.requestTime}
              onChange={(e) => handleChange('requestTime', e.target.value)}
              className={styles.formSelect}
              disabled={submitting}
            >
              <option value="08:00 AM">08:00 AM (Morning)</option>
              <option value="09:00 AM">09:00 AM</option>
              <option value="10:30 AM">10:30 AM</option>
              <option value="01:00 PM">01:00 PM (Afternoon)</option>
              <option value="03:00 PM">03:00 PM</option>
              <option value="05:00 PM">05:00 PM (Evening)</option>
            </select>
          </div>

          <div className={styles.formGroupFlex1}>
            <label className={styles.formLabel} htmlFor="job-duration-select">
              Estimated Duration
            </label>
            <select
              id="job-duration-select"
              value={formData.estimatedDuration}
              onChange={(e) => handleChange('estimatedDuration', e.target.value)}
              className={styles.formSelect}
              disabled={submitting}
            >
              <option value="1 hour">1 hour</option>
              <option value="2 hours">2 hours</option>
              <option value="3 hours">3 hours</option>
              <option value="4 hours">4 hours</option>
              <option value="Full Day">Full Day</option>
            </select>
          </div>
        </div>

        {/* Job Notes / Special Instructions */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="job-notes-input">
            Job Notes / Special Instructions
          </label>
          <textarea
            id="job-notes-input"
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Check in at front desk, gate code is #1234, watch for pets, shut-off valve location..."
            className={styles.formTextArea}
            disabled={submitting}
          />
        </div>

        {/* Action Buttons */}
        <div className={`${styles.flexGap10} ${styles.marginTop16}`}>
          <button
            type="button"
            onClick={handleClose}
            className={styles.buttonOutlineLarge}
            disabled={submitting}
          >
            <CancelIcon /> Cancel
          </button>
          <button
            id="job-modal-submit-btn"
            type="submit"
            className={styles.buttonPrimaryLarge}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <SpinnerIcon /> {job ? 'Saving Changes...' : 'Creating Job...'}
              </>
            ) : (
              <>
                <CheckIcon /> {job ? 'Save Changes' : 'Create New Job'}
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
