import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Box,
  Typography,
  Chip,
  TextField,
  Button,
  IconButton,
  CircularProgress,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import styles from '../styles/UI/DispatchCenter.module.scss';

export interface DispatchChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface JobChecklistEditorProps {
  open: boolean;
  onClose: () => void;
  jobId?: string | null;
  jobNotes?: string | null;
  items?: DispatchChecklistItem[];
  onItemsChange?: (items: DispatchChecklistItem[]) => void;
  onSave?: (items: DispatchChecklistItem[]) => Promise<void> | void;
  updateScheduledJob?: (id: string, input: { notes?: string }) => Promise<unknown>;
  onNotification?: (message: string, type?: 'success' | 'error' | 'warning') => void;
}

/**
 * Parses the CHECKLIST: prefix format stored in the job notes into item objects.
 */
export const parseChecklistFromNotes = (notes: string | null | undefined): DispatchChecklistItem[] => {
  if (notes?.startsWith('CHECKLIST:')) {
    try {
      const parsed = JSON.parse(notes.replace('CHECKLIST:', ''));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

/**
 * Job Checklist Editor Modal Component (DispatchCenter)
 * 
 * Replicates the visual design, typography, color palette, container padding, 
 * badge pills, form inputs, and action buttons from UserManagement.
 */
export const DispatchCenter: React.FC<JobChecklistEditorProps> = ({
  open,
  onClose,
  jobId,
  jobNotes,
  items: controlledItems,
  onItemsChange,
  onSave,
  updateScheduledJob,
  onNotification,
}) => {
  const [draftItems, setDraftItems] = useState<DispatchChecklistItem[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sync draft items when modal opens or job notes change
  useEffect(() => {
    if (open) {
      if (controlledItems !== undefined) {
        setDraftItems(controlledItems);
      } else if (jobNotes) {
        setDraftItems(parseChecklistFromNotes(jobNotes));
      } else {
        setDraftItems([]);
      }
      setNewItemText('');
    }
  }, [open, controlledItems, jobNotes]);

  const handleAddItem = useCallback(() => {
    const text = newItemText.trim();
    if (!text) return;

    const newItem: DispatchChecklistItem = {
      id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      text,
      checked: false,
    };

    const updated = [...draftItems, newItem];
    setDraftItems(updated);
    if (onItemsChange) {
      onItemsChange(updated);
    }
    setNewItemText('');
  }, [newItemText, draftItems, onItemsChange]);

  const handleRemoveItem = useCallback((id: string) => {
    const updated = draftItems.filter((item) => item.id !== id);
    setDraftItems(updated);
    if (onItemsChange) {
      onItemsChange(updated);
    }
  }, [draftItems, onItemsChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddItem();
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    try {
      setIsSaving(true);

      if (onSave) {
        await onSave(draftItems);
      } else if (jobId && updateScheduledJob) {
        const payload = JSON.stringify(draftItems);
        await updateScheduledJob(jobId, {
          notes: `CHECKLIST:${payload}`,
        });

        // Bust stale technician progress cache so FieldExecution picks up the updated template immediately
        try {
          localStorage.removeItem(`checklist_job_${jobId}`);
        } catch {
          // Ignore localStorage errors if restricted
        }

        if (onNotification) {
          onNotification('✅ Checklist saved! Technician will see the updated steps immediately.', 'success');
        }
        onClose();
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Failed to save checklist:', err);
      if (onNotification) {
        onNotification('Failed to save checklist. Please try again.', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => !isSaving && onClose()}
      aria-labelledby="checklist-modal-title"
      className={styles.modalOverlay}
    >
      <Box
        component="form"
        onSubmit={handleFormSubmit}
        className={styles.modalBox}
      >
        {/* Modal Header */}
        <Box className={styles.modalHeader}>
          <Typography
            id="checklist-modal-title"
            variant="h6"
            className={styles.modalTitle}
          >
            📋 Job Checklist Editor
          </Typography>
          <Chip
            label="Task Editor"
            size="small"
            color="success"
            className={styles.taskEditorBadge}
          />
        </Box>

        {/* Modal Body (Scrollable) */}
        <Box className={styles.modalBody}>
          <Typography
            variant="subtitle2"
            className={styles.sectionLabel}
          >
            1. DEFINE STEP-BY-STEP TASK CHECKLIST
          </Typography>

          {/* Checklist Items List */}
          <Box className={styles.itemsList}>
            {draftItems.length === 0 ? (
              <Box className={styles.emptyState}>
                <Typography variant="body2" className={styles.emptyStateText}>
                  No steps defined yet. Add your first step below.
                </Typography>
              </Box>
            ) : (
              draftItems.map((item, idx) => (
                <Box key={item.id} className={styles.checklistItem}>
                  {/* Step Number Badge */}
                  <Box className={styles.stepBadge}>
                    {idx + 1}
                  </Box>
                  <Typography variant="body2" className={styles.itemText}>
                    {item.text}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={isSaving}
                    className={styles.removeButton}
                    aria-label={`Remove step ${idx + 1}: ${item.text}`}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))
            )}
          </Box>

          {/* Add New Item Input Row */}
          <Box className={styles.addItemRow}>
            <TextField
              id="new-checklist-item-input"
              className={styles.addItemInput}
              fullWidth
              size="small"
              placeholder="e.g. Inspect HVAC compressor & verify coolant pressure"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSaving}
              autoComplete="off"
            />
            <Button
              id="add-checklist-item-btn"
              variant="contained"
              onClick={handleAddItem}
              disabled={!newItemText.trim() || isSaving}
              className={styles.addButton}
            >
              + Add Step
            </Button>
          </Box>

          {draftItems.length > 0 && (
            <Typography variant="caption" className={styles.stepCounter}>
              {draftItems.length} step{draftItems.length !== 1 ? 's' : ''} configured
            </Typography>
          )}
        </Box>

        {/* Modal Actions / Footer */}
        <Box className={styles.modalFooter}>
          <Button
            variant="outlined"
            startIcon={<CancelIcon />}
            onClick={onClose}
            disabled={isSaving}
            className={styles.cancelButton}
          >
            Cancel
          </Button>
          <Button
            id="save-checklist-btn"
            variant="contained"
            type="submit"
            startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            disabled={isSaving}
            className={styles.saveButton}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default DispatchCenter;
