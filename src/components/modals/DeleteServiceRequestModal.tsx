import React, { useState, useEffect, useCallback } from 'react';
import styles from '../../styles/UI/DeleteServiceRequestModal.module.scss';

export interface DeleteServiceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  jobId?: string | null;
  isDeleting?: boolean;
}

/**
 * Warning / Alert Icon Emblem (soft rounded warning circle badge)
 */
const AlertWarningIcon: React.FC = () => (
  <svg
    className={styles.warningIcon}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const SpinnerIcon: React.FC = () => (
  <svg
    className={styles.spinner}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
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

export const DeleteServiceRequestModal: React.FC<DeleteServiceRequestModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  jobId,
  isDeleting: externalIsDeleting,
}) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const isBusy = externalIsDeleting || internalLoading;

  // Handle ESC key to dismiss modal
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isBusy) {
        onClose();
      }
    },
    [isOpen, isBusy, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const handleConfirmAction = async () => {
    if (isBusy) return;
    setInternalLoading(true);
    try {
      await onConfirm();
    } catch (err) {
      console.error('Failed to confirm service request deletion:', err);
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <div
      className={`${styles.modalOverlay} bg-black/40 backdrop-blur-sm z-50`}
      onClick={() => !isBusy && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-heading"
      aria-describedby="delete-modal-description"
    >
      <div
        className={`${styles.modalCard} bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-center border border-gray-100`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning Icon Emblem */}
        <div className={styles.warningIconContainer} aria-hidden="true">
          <AlertWarningIcon />
        </div>

        {/* Modal Heading */}
        <h2 id="delete-modal-heading" className={styles.heading}>
          Delete Service Request
        </h2>

        {/* Modal Descriptive Body Paragraph */}
        <p id="delete-modal-description" className={styles.description}>
          Are you sure you want to delete this service request? This will also remove any scheduled assignments permanently from the system timeline rows.
        </p>

        {/* Flex Action Buttons */}
        <div className={styles.buttonRow}>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className={`${styles.cancelButton} border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 rounded-lg py-2.5 font-medium transition-colors`}
            aria-label="Cancel deletion"
          >
            Cancel
          </button>
          <button
            id="confirm-delete-service-request-btn"
            type="button"
            onClick={handleConfirmAction}
            disabled={isBusy}
            className={`${styles.confirmButton} bg-rose-600 hover:bg-rose-700 text-white rounded-lg py-2.5 font-medium transition-colors shadow-sm`}
            aria-label={`Confirm delete service request${jobId ? ` ${jobId}` : ''}`}
          >
            {isBusy ? (
              <>
                <SpinnerIcon /> Deleting...
              </>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteServiceRequestModal;
