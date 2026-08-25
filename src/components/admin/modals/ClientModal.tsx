import { useState, useEffect } from 'react';
import Modal from './Modal';
import styles from '../../../styles/UI/ClientModal.module.scss';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: any | null; // null for add client, client object for edit client
  onSubmit: (clientData: any) => Promise<void>;
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

export default function ClientModal({ isOpen, onClose, client, onSubmit }: ClientModalProps) {
  const [formData, setFormData] = useState({
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
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (client) {
        const match = client.notes?.match(/GPS:\s*([-\d.]+),\s*([-\d.]+)/);
        const gpsVal = match ? `${match[1]}, ${match[2]}` : '37.7749, -122.4194';
        const rawNotes = client.notes?.replace(/GPS:\s*([-\d.]+),\s*([-\d.]+)\s*/g, '').trim() || '';

        setFormData({
          name: client.name || '',
          phone: client.phone || '',
          email: client.email || '',
          address: client.address || '',
          city: client.city || '',
          state: client.state || '',
          zipCode: client.zipCode || '',
          gps: gpsVal,
          outstandingBalance: client.outstandingBalance || '0.00',
          preferenceNotes: client.preferenceNotes || '',
          notes: rawNotes,
        });
      } else {
        setFormData({
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
          notes: '',
        });
      }
    }
  }, [client, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setSubmitting(false);
    }
  };

  const title = client ? 'Edit Client Profile' : 'Add New Client';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Client Name *</label>
          <input
            type="text"
            required
            placeholder={client ? '' : 'e.g. Wayne Enterprises'}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={styles.formInput}
          />
        </div>

        <div className={styles.flexGap10}>
          <div className={styles.formGroupFlex1}>
            <label className={styles.formLabel}>Phone Number</label>
            <input
              type="tel"
              placeholder={client ? '' : 'e.g. 555-0155'}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className={styles.formInput}
            />
          </div>
          <div className={styles.formGroupFlex1}>
            <label className={styles.formLabel}>Email Address</label>
            <input
              type="email"
              placeholder={client ? '' : 'e.g. billing@wayne.com'}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={styles.formInput}
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Street Address</label>
          <input
            type="text"
            placeholder={client ? '' : 'e.g. 1007 Mountain Drive'}
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className={styles.formInput}
          />
        </div>

        <div className={styles.flexGap10}>
          <div className={styles.formGroupFlex2}>
            <label className={styles.formLabel}>City</label>
            <input
              type="text"
              placeholder={client ? '' : 'Gotham'}
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className={styles.formInput}
            />
          </div>
          <div className={styles.formGroupFlex1}>
            <label className={styles.formLabel}>State</label>
            <input
              type="text"
              placeholder={client ? '' : 'NJ'}
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className={styles.formInput}
            />
          </div>
          <div className={styles.formGroupFlex1_5}>
            <label className={styles.formLabel}>Zip Code</label>
            <input
              type="text"
              placeholder={client ? '' : '07001'}
              value={formData.zipCode}
              onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
              className={styles.formInput}
            />
          </div>
        </div>

        <div className={styles.flexGap10}>
          <div className={styles.formGroupFlex1_5}>
            <label className={styles.formLabel}>GPS Coordinates (Lat, Lng)</label>
            <input
              type="text"
              placeholder="37.7749, -122.4194"
              value={formData.gps}
              onChange={(e) => setFormData({ ...formData, gps: e.target.value })}
              className={styles.formInput}
            />
          </div>
          <div className={styles.formGroupFlex1}>
            <label className={styles.formLabel}>Outstanding Balance ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.outstandingBalance}
              onChange={(e) => setFormData({ ...formData, outstandingBalance: e.target.value })}
              className={styles.formInput}
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Preference Notes (Invoicing requirements, etc.)</label>
          <textarea
            placeholder={client ? '' : 'e.g. Email billing details instantly upon completion...'}
            value={formData.preferenceNotes}
            onChange={(e) => setFormData({ ...formData, preferenceNotes: e.target.value })}
            className={styles.formTextArea}
          />
        </div>

        {/* Note: notes is only present in edit client modal block in the original UI */}
        {client && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>General Admin Notes</label>
            <textarea
              placeholder="Additional customer file notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className={styles.formTextArea}
            />
          </div>
        )}

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
            <CheckIcon /> {client ? 'Save Changes' : 'Create Client'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
