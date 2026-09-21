import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import styles from '../../../styles/UI/ClientModal.module.scss';
import type { Schema } from '../../../../amplify/data/resource';

type Client = Schema['Client']['type'];

export interface ClientFormData {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  gps: string;
  outstandingBalance: string;
  preferenceNotes: string;
  notes: string;
}

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null; // null for add client, client object for edit client
  onSubmit: (clientData: ClientFormData) => Promise<void>;
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

const INITIAL_FORM_DATA: ClientFormData = {
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
};

export default function ClientModal({ isOpen, onClose, client, onSubmit }: ClientModalProps) {
  const [formData, setFormData] = useState<ClientFormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<{ [key: string]: string | undefined }>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean | undefined }>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      setTouched({});
      setSubmitting(false);

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
        setFormData(INITIAL_FORM_DATA);
      }
    }
  }, [client, isOpen]);

  const validateField = (field: string, value: string): string | undefined => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'Client name is required.';
        if (value.trim().length < 2) return 'Client name must be at least 2 characters.';
        return undefined;
      case 'email':
        if (value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          return 'Please enter a valid email address.';
        }
        return undefined;
      case 'phone':
        if (value.trim() && value.replace(/[^\d]/g, '').length < 7) {
          return 'Please enter a valid phone number (minimum 7 digits).';
        }
        return undefined;
      case 'outstandingBalance':
        if (value && (isNaN(Number(value)) || Number(value) < 0)) {
          return 'Outstanding balance must be a non-negative number.';
        }
        return undefined;
      default:
        return undefined;
    }
  };

  const handleChange = (field: keyof ClientFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      const error = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
  };

  const handleBlur = (field: keyof ClientFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field]);
    setErrors((prev) => ({ ...prev, [field]: error }));
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

    // Validate all fields
    const nameError = validateField('name', formData.name);
    const emailError = validateField('email', formData.email);
    const phoneError = validateField('phone', formData.phone);
    const balanceError = validateField('outstandingBalance', formData.outstandingBalance);

    const validationErrors = {
      name: nameError,
      email: emailError,
      phone: phoneError,
      outstandingBalance: balanceError,
    };

    setTouched({
      name: true,
      email: true,
      phone: true,
      outstandingBalance: true,
    });
    setErrors(validationErrors);

    if (nameError || emailError || phoneError || balanceError) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        zipCode: formData.zipCode.trim(),
        gps: formData.gps.trim(),
        outstandingBalance: formData.outstandingBalance || '0.00',
        preferenceNotes: formData.preferenceNotes.trim(),
        notes: formData.notes.trim(),
      });
      // Reset & close on success handled by parent or here
      setFormData(INITIAL_FORM_DATA);
      setErrors({});
      setTouched({});
    } catch (err) {
      console.error('Error in ClientModal submit:', err);
      // Keep modal open so user can rectify and retry
    } finally {
      setSubmitting(false);
    }
  };

  const title = client ? 'Edit Client Profile' : 'Add New Client';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      <form onSubmit={handleSubmit} noValidate>
        {/* Client Name */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="client-name-input">
            Client Name <span className={styles.requiredStar}>*</span>
          </label>
          <input
            id="client-name-input"
            type="text"
            required
            placeholder="e.g. Wayne Enterprises"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            onBlur={() => handleBlur('name')}
            className={`${styles.formInput} ${errors.name ? styles.inputError : ''}`}
            disabled={submitting}
            autoFocus
          />
          {errors.name && <span className={styles.errorMessage}>{errors.name}</span>}
        </div>

        {/* Phone & Email */}
        <div className={styles.flexGap10}>
          <div className={styles.formGroupFlex1}>
            <label className={styles.formLabel} htmlFor="client-phone-input">
              Phone Number
            </label>
            <input
              id="client-phone-input"
              type="tel"
              placeholder="e.g. 555-0155"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              onBlur={() => handleBlur('phone')}
              className={`${styles.formInput} ${errors.phone ? styles.inputError : ''}`}
              disabled={submitting}
            />
            {errors.phone && <span className={styles.errorMessage}>{errors.phone}</span>}
          </div>
          <div className={styles.formGroupFlex1}>
            <label className={styles.formLabel} htmlFor="client-email-input">
              Email Address
            </label>
            <input
              id="client-email-input"
              type="email"
              placeholder="e.g. billing@wayne.com"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              className={`${styles.formInput} ${errors.email ? styles.inputError : ''}`}
              disabled={submitting}
            />
            {errors.email && <span className={styles.errorMessage}>{errors.email}</span>}
          </div>
        </div>

        {/* Street Address */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="client-address-input">
            Street Address
          </label>
          <input
            id="client-address-input"
            type="text"
            placeholder="e.g. 1007 Mountain Drive"
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            className={styles.formInput}
            disabled={submitting}
          />
        </div>

        {/* City, State, Zip */}
        <div className={styles.flexGap10}>
          <div className={styles.formGroupFlex2}>
            <label className={styles.formLabel} htmlFor="client-city-input">
              City
            </label>
            <input
              id="client-city-input"
              type="text"
              placeholder="Gotham"
              value={formData.city}
              onChange={(e) => handleChange('city', e.target.value)}
              className={styles.formInput}
              disabled={submitting}
            />
          </div>
          <div className={styles.formGroupFlex1}>
            <label className={styles.formLabel} htmlFor="client-state-input">
              State
            </label>
            <input
              id="client-state-input"
              type="text"
              placeholder="NJ"
              value={formData.state}
              onChange={(e) => handleChange('state', e.target.value)}
              className={styles.formInput}
              disabled={submitting}
            />
          </div>
          <div className={styles.formGroupFlex1_5}>
            <label className={styles.formLabel} htmlFor="client-zip-input">
              Zip Code
            </label>
            <input
              id="client-zip-input"
              type="text"
              placeholder="07001"
              value={formData.zipCode}
              onChange={(e) => handleChange('zipCode', e.target.value)}
              className={styles.formInput}
              disabled={submitting}
            />
          </div>
        </div>

        {/* GPS & Outstanding Balance */}
        <div className={styles.flexGap10}>
          <div className={styles.formGroupFlex1_5}>
            <label className={styles.formLabel} htmlFor="client-gps-input">
              GPS Coordinates (Lat, Lng)
            </label>
            <input
              id="client-gps-input"
              type="text"
              placeholder="37.7749, -122.4194"
              value={formData.gps}
              onChange={(e) => handleChange('gps', e.target.value)}
              className={styles.formInput}
              disabled={submitting}
            />
          </div>
          <div className={styles.formGroupFlex1}>
            <label className={styles.formLabel} htmlFor="client-balance-input">
              Outstanding Balance ($)
            </label>
            <input
              id="client-balance-input"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.outstandingBalance}
              onChange={(e) => handleChange('outstandingBalance', e.target.value)}
              onBlur={() => handleBlur('outstandingBalance')}
              className={`${styles.formInput} ${errors.outstandingBalance ? styles.inputError : ''}`}
              disabled={submitting}
            />
            {errors.outstandingBalance && (
              <span className={styles.errorMessage}>{errors.outstandingBalance}</span>
            )}
          </div>
        </div>

        {/* Preference Notes */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="client-pref-notes-input">
            Preference Notes (Invoicing requirements, site access, etc.)
          </label>
          <textarea
            id="client-pref-notes-input"
            placeholder="e.g. Email billing details instantly upon completion, require sign-off on site..."
            value={formData.preferenceNotes}
            onChange={(e) => handleChange('preferenceNotes', e.target.value)}
            className={styles.formTextArea}
            disabled={submitting}
          />
        </div>

        {/* General Admin Notes (Always available or in edit mode) */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="client-admin-notes-input">
            General Admin Notes
          </label>
          <textarea
            id="client-admin-notes-input"
            placeholder="Additional customer internal notes, gate codes, contact preferences..."
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            className={styles.formTextArea}
            disabled={submitting}
          />
        </div>

        {/* Actions */}
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
            id="client-modal-submit-btn"
            type="submit"
            className={styles.buttonPrimaryLarge}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <SpinnerIcon /> {client ? 'Saving Changes...' : 'Creating Client...'}
              </>
            ) : (
              <>
                <CheckIcon /> {client ? 'Save Changes' : 'Create Client'}
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
