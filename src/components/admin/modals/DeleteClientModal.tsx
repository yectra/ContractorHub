import { useState } from 'react';
import Modal from './Modal';
import styles from '../../../styles/UI/DeleteConfirmModal.module.scss';

interface DeleteClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
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

const SpinnerIcon = () => (
  <svg style={{ animation: 'spin 1s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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

export default function DeleteClientModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  onConfirm,
}: DeleteClientModalProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
    } catch (err) {
      console.error('Failed to delete client:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Delete Client Profile" isConfirm={true}>
      <p className={styles.pConfirm}>
        Are you sure you want to delete client <strong>{clientName}</strong> (ID: {clientId})?
        This will permanently remove the client record and all associated preference files. This action cannot be undone.
      </p>
      <div className={styles.flexGap10}>
        <button
          type="button"
          onClick={handleClose}
          className={styles.buttonOutline}
          disabled={submitting}
        >
          <CancelIcon /> Cancel
        </button>
        <button
          id="confirm-delete-client-btn"
          type="button"
          onClick={handleConfirm}
          className={styles.btnConfirmDelete}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <SpinnerIcon /> Deleting...
            </>
          ) : (
            <>
              <TrashIcon /> Delete Client
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}
