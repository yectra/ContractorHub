import { useState } from 'react';
import Modal from './Modal';
import styles from '../../../styles/UI/DeleteConfirmModal.module.scss';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobService: string;
  onConfirm: () => Promise<void>;
}

const CancelIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

export default function DeleteConfirmModal({ isOpen, onClose, jobId, jobService, onConfirm }: DeleteConfirmModalProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Delete" isConfirm={true}>
      <p className={styles.pConfirm}>
        Are you sure you want to delete the job <strong>{jobId}</strong> ({jobService})? This action cannot be undone.
      </p>
      <div className={styles.flexGap10}>
        <button
          type="button"
          onClick={onClose}
          className={styles.buttonOutline}
          disabled={submitting}
        >
          <CancelIcon /> Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className={styles.btnConfirmDelete}
          disabled={submitting}
        >
          <TrashIcon /> Delete
        </button>
      </div>
    </Modal>
  );
}
