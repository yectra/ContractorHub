import { useState, useEffect } from 'react';
import Modal from './Modal';
import styles from '../../../styles/UI/JobModal.module.scss';

interface JobModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  clientAddress: string;
  job: any | null; // null for add job, job object for edit job
  onSubmit: (jobData: any) => Promise<void>;
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

export default function JobModal({ isOpen, onClose, clientName, clientAddress, job, onSubmit }: JobModalProps) {
  const [formData, setFormData] = useState({
    service: '',
    type: 'Scheduled' as 'Scheduled' | 'Emergency' | 'WebRequest',
    priority: 'low' as 'high' | 'medium' | 'low',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (job) {
        setFormData({
          service: job.service || '',
          type: job.type || 'Scheduled',
          priority: job.priority || 'low',
          notes: job.notes || '',
        });
      } else {
        setFormData({
          service: '',
          type: 'Scheduled',
          priority: 'low',
          notes: '',
        });
      }
    }
  }, [job, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setSubmitting(false);
    }
  };

  const title = job ? 'Edit Job Details' : 'Quick-Create New Job';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Client Name (Pre-populated)</label>
          <input
            type="text"
            disabled
            value={clientName}
            className={styles.formInputDisabled}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Site Address (Pre-populated)</label>
          <input
            type="text"
            disabled
            value={clientAddress}
            className={styles.formInputDisabled}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Service Type / Description *</label>
          <input
            type="text"
            required
            placeholder="e.g. AC Compressor Diagnostic, Main Drain Line Clog"
            value={formData.service}
            onChange={(e) => setFormData({ ...formData, service: e.target.value })}
            className={styles.formInput}
          />
        </div>

        <div className={styles.flexGap10}>
          <div className={styles.formGroupFlex1}>
            <label className={styles.formLabel}>Order Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
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
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
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
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Check in at front desk, code is #1234, watch for golden retriever..."
            className={styles.formTextArea}
          />
        </div>

        <div className={`${styles.flexGap10} ${styles.marginTop16}`}>
          <button
            type="button"
            onClick={onClose}
            className={styles.buttonOutlineLarge}
            disabled={submitting}
          >
            <CancelIcon /> Cancel
          </button>
          <button
            type="submit"
            className={styles.buttonPrimaryLarge}
            disabled={submitting}
          >
            <CheckIcon /> {job ? 'Save Changes' : 'Create New Job'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
