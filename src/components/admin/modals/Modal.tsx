import type { ReactNode } from 'react';
import styles from '../../../styles/UI/Modal.module.scss';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  isConfirm?: boolean;
  children: ReactNode;
}

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function Modal({ isOpen, onClose, title, isConfirm = false, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div 
        className={`${styles.modalContent} ${isConfirm ? styles.confirm : ''}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2 className={`${styles.modalTitle} ${isConfirm ? styles.confirm : ''}`}>{title}</h2>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Close modal">
            <CloseIcon />
          </button>
        </div>
        <div className={styles.modalBody}>
          {children}
        </div>
      </div>
    </div>
  );
}
