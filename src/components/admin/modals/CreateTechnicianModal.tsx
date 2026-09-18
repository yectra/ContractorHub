import { useState } from 'react';
import Modal from './Modal';
import styles from '../../../styles/UI/CreateTechnicianModal.module.scss';

export type TechnicianSpecialty = 'Plumbing' | 'HVAC' | 'Electrical' | 'General';

export interface CreateTechnicianData {
  name: string;
  email: string;
  phone: string;
  specialty: TechnicianSpecialty;
  isAvailable: boolean;
  color: string;
  avatar: string;
}

interface CreateTechnicianModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (technicianData: CreateTechnicianData) => Promise<void>;
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

const COLOR_PRESETS = [
  { label: 'Blue', hex: '#2563eb' },
  { label: 'Green', hex: '#16a34a' },
  { label: 'Purple', hex: '#7c3aed' },
  { label: 'Amber', hex: '#d97706' },
  { label: 'Rose', hex: '#e11d48' },
  { label: 'Teal', hex: '#0d9488' },
  { label: 'Indigo', hex: '#4f46e5' },
  { label: 'Cyan', hex: '#0891b2' },
];

const INITIAL_FORM_STATE = {
  name: '',
  email: '',
  phone: '',
  specialty: 'General' as TechnicianSpecialty,
  isAvailable: true,
  color: '#2563eb',
};

export default function CreateTechnicianModal({ isOpen, onClose, onSubmit }: CreateTechnicianModalProps) {
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<{ name?: string; email?: string; phone?: string }>({});
  const [touched, setTouched] = useState<{ name?: boolean; email?: boolean; phone?: boolean }>({});
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setFormData(INITIAL_FORM_STATE);
    setErrors({});
    setTouched({});
    setSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Compute initials for avatar preview
  const getInitials = (nameStr: string) => {
    const trimmed = nameStr.trim();
    if (!trimmed) return 'T';
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return trimmed.substring(0, 2).toUpperCase();
  };

  const validateField = (field: 'name' | 'email' | 'phone', value: string) => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'Technician name is required.';
        if (value.trim().length < 2) return 'Name must be at least 2 characters.';
        return undefined;
      case 'email':
        if (!value.trim()) return 'Email address is required.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Please enter a valid email address.';
        return undefined;
      case 'phone':
        if (!value.trim()) return 'Phone number is required.';
        if (value.replace(/[^\d]/g, '').length < 7) return 'Please enter a valid phone number (min 7 digits).';
        return undefined;
      default:
        return undefined;
    }
  };

  const handleChange = (field: 'name' | 'email' | 'phone', value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      const err = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  const handleBlur = (field: 'name' | 'email' | 'phone') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, formData[field]);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all as touched and validate
    const nameErr = validateField('name', formData.name);
    const emailErr = validateField('email', formData.email);
    const phoneErr = validateField('phone', formData.phone);

    setTouched({ name: true, email: true, phone: true });
    setErrors({ name: nameErr, email: emailErr, phone: phoneErr });

    if (nameErr || emailErr || phoneErr) {
      return;
    }

    setSubmitting(true);
    try {
      const avatar = getInitials(formData.name);
      await onSubmit({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        specialty: formData.specialty,
        isAvailable: formData.isAvailable,
        color: formData.color,
        avatar,
      });
      // Reset & close on success
      resetForm();
      onClose();
    } catch (err) {
      console.error('Error submitting technician:', err);
      // Keep modal open on failure so user can retry
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Technician">
      <form onSubmit={handleSubmit} noValidate>
        {/* Visual Live Preview Chip */}
        <div className={styles.previewBadge}>
          <div className={styles.previewAvatar} style={{ backgroundColor: formData.color }}>
            {getInitials(formData.name)}
          </div>
          <div className={styles.previewInfo}>
            <span className={styles.previewName}>
              {formData.name.trim() || 'New Technician'}
            </span>
            <span className={styles.previewMeta}>
              {formData.specialty} • {formData.isAvailable ? 'Active / Available' : 'Off Duty'}
            </span>
          </div>
        </div>

        {/* Full Name Input */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="tech-name-input">
            Full Name <span className={styles.requiredStar}>*</span>
          </label>
          <input
            id="tech-name-input"
            type="text"
            placeholder="e.g. David Miller"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            onBlur={() => handleBlur('name')}
            className={`${styles.formInput} ${errors.name ? styles.inputError : ''}`}
            disabled={submitting}
            autoFocus
          />
          {errors.name && <span className={styles.errorMessage}>{errors.name}</span>}
        </div>

        {/* Email & Phone side by side */}
        <div className={styles.flexGap10}>
          <div className={styles.formGroupFlex1}>
            <label className={styles.formLabel} htmlFor="tech-email-input">
              Email Address <span className={styles.requiredStar}>*</span>
            </label>
            <input
              id="tech-email-input"
              type="email"
              placeholder="e.g. david@contractor.com"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              className={`${styles.formInput} ${errors.email ? styles.inputError : ''}`}
              disabled={submitting}
            />
            {errors.email && <span className={styles.errorMessage}>{errors.email}</span>}
          </div>

          <div className={styles.formGroupFlex1}>
            <label className={styles.formLabel} htmlFor="tech-phone-input">
              Phone Number <span className={styles.requiredStar}>*</span>
            </label>
            <input
              id="tech-phone-input"
              type="tel"
              placeholder="e.g. 555-0199"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              onBlur={() => handleBlur('phone')}
              className={`${styles.formInput} ${errors.phone ? styles.inputError : ''}`}
              disabled={submitting}
            />
            {errors.phone && <span className={styles.errorMessage}>{errors.phone}</span>}
          </div>
        </div>

        {/* Specialty & Status */}
        <div className={styles.flexGap10}>
          <div className={styles.formGroupFlex1}>
            <label className={styles.formLabel} htmlFor="tech-specialty-select">
              Role / Specialization
            </label>
            <select
              id="tech-specialty-select"
              value={formData.specialty}
              onChange={(e) => setFormData({ ...formData, specialty: e.target.value as TechnicianSpecialty })}
              className={styles.formSelect}
              disabled={submitting}
            >
              <option value="General">General Maintenance</option>
              <option value="Plumbing">Plumbing Specialist</option>
              <option value="HVAC">HVAC Technician</option>
              <option value="Electrical">Electrician</option>
            </select>
          </div>

          <div className={styles.formGroupFlex1}>
            <label className={styles.formLabel} htmlFor="tech-status-select">
              Initial Status
            </label>
            <select
              id="tech-status-select"
              value={formData.isAvailable ? 'available' : 'unavailable'}
              onChange={(e) => setFormData({ ...formData, isAvailable: e.target.value === 'available' })}
              className={styles.formSelect}
              disabled={submitting}
            >
              <option value="available">Available (On Duty)</option>
              <option value="unavailable">Unavailable (Off Duty)</option>
            </select>
          </div>
        </div>

        {/* Timeline Badge Color */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Timeline Color Badge
          </label>
          <div className={styles.colorPickerRow}>
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.hex}
                type="button"
                className={`${styles.colorSwatch} ${formData.color === preset.hex ? styles.colorSwatchSelected : ''}`}
                style={{ backgroundColor: preset.hex }}
                onClick={() => setFormData({ ...formData, color: preset.hex })}
                title={preset.label}
                aria-label={`Select ${preset.label} color`}
                disabled={submitting}
              />
            ))}
          </div>
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
            id="create-technician-submit-btn"
            type="submit"
            className={styles.buttonPrimaryLarge}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <SpinnerIcon /> Creating Technician...
              </>
            ) : (
              <>
                <CheckIcon /> Create Technician
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
