import { useEffect, useState } from 'react';
import type { Schema } from '../../amplify/data/resource';
import { serviceRequestAPI, technicianAPI, scheduledJobAPI, clientAPI } from '../services/api';
import {
  sendJobCreatedNotification,
  sendJobUpdatedNotification,
  sendJobDeletedNotification,
  resolveClientForJob,
} from '../services/mailService';

/**
 * Hook to fetch service requests with real-time updates
 */
export function useServiceRequests() {
  const [serviceRequests, setServiceRequests] = useState<Schema['ServiceRequest']['type'][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const sub = serviceRequestAPI.observeServiceRequests(
      (data) => {
        setServiceRequests(data || []);
        setLoading(false);
      },
      (err) => {
        const message = err instanceof Error ? err.message : 'Failed to fetch service requests';
        setError(message);
        console.error(message);
        setLoading(false);
      }
    );

    return () => sub.unsubscribe();
  }, []);

  const deleteServiceRequest = async (
    id: string,
    options?: { clientEmail?: string; notifyClient?: boolean; reason?: string; senderName?: string; fromName?: string; adminName?: string }
  ) => {
    try {
      const targetReq = serviceRequests.find((r) => r.id === id);
      await serviceRequestAPI.deleteServiceRequest(id);
      setServiceRequests((prev) => prev.filter((req) => req.id !== id));

      if (options?.notifyClient && targetReq) {
        try {
          const clientEmail = options.clientEmail || (await resolveClientForJob(targetReq.client))?.email;
          if (clientEmail) {
            sendJobDeletedNotification({
              clientName: targetReq.client,
              clientEmail,
              job: {
                id: targetReq.id,
                service: targetReq.service,
                client: targetReq.client,
                location: targetReq.location,
                notes: targetReq.notes,
              },
              reason: options.reason || 'Cancelled from service queue',
              senderName: options.senderName || options.fromName || options.adminName,
            }).catch((err) => console.error('[useServiceRequests] Auto-notification error on delete:', err));
          }
        } catch (notifyErr) {
          console.warn('[useServiceRequests] Failed to send delete notification:', notifyErr);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete service request';
      setError(message);
      throw err;
    }
  };

  const updateServiceRequest = async (
    id: string,
    data: Partial<Schema['ServiceRequest']['type']>,
    options?: { clientEmail?: string; notifyClient?: boolean; changesSummary?: string; senderName?: string; fromName?: string; adminName?: string }
  ) => {
    try {
      const updated = await serviceRequestAPI.updateServiceRequest(id, data);
      setServiceRequests((prev) =>
        prev.map((req) => (req.id === id ? { ...req, ...updated } : req))
      );

      if (options?.notifyClient && updated) {
        try {
          const clientEmail = options.clientEmail || (await resolveClientForJob(updated.client))?.email;
          if (clientEmail) {
            sendJobUpdatedNotification({
              clientName: updated.client,
              clientEmail,
              job: {
                id: updated.id,
                service: updated.service,
                client: updated.client,
                location: updated.location,
                type: updated.type,
                priority: updated.priority,
                status: updated.status,
                requestTime: updated.requestTime,
                estimatedDuration: updated.estimatedDuration,
                notes: updated.notes,
              },
              changesSummary: options.changesSummary,
              senderName: options.senderName || options.fromName || options.adminName,
            }).catch((err) => console.error('[useServiceRequests] Auto-notification error on update:', err));
          }
        } catch (notifyErr) {
          console.warn('[useServiceRequests] Failed to send update notification:', notifyErr);
        }
      }

      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update service request';
      setError(message);
      throw err;
    }
  };

  const createServiceRequest = async (
    data: Partial<Schema['ServiceRequest']['type']>,
    options?: { clientEmail?: string; notifyClient?: boolean; senderName?: string; fromName?: string; adminName?: string }
  ) => {
    try {
      const created = await serviceRequestAPI.createServiceRequest(data);
      setServiceRequests((prev) => [...prev, created!]);

      if (options?.notifyClient && created) {
        try {
          const clientEmail = options.clientEmail || (await resolveClientForJob(created.client))?.email;
          if (clientEmail) {
            sendJobCreatedNotification({
              clientName: created.client,
              clientEmail,
              job: {
                id: created.id,
                service: created.service,
                client: created.client,
                location: created.location,
                type: created.type,
                priority: created.priority,
                status: created.status,
                requestTime: created.requestTime,
                estimatedDuration: created.estimatedDuration,
                notes: created.notes,
              },
              senderName: options.senderName || options.fromName || options.adminName,
            }).catch((err) => console.error('[useServiceRequests] Auto-notification error on create:', err));
          }
        } catch (notifyErr) {
          console.warn('[useServiceRequests] Failed to send create notification:', notifyErr);
        }
      }

      return created;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create service request';
      setError(message);
      throw err;
    }
  };

  return {
    serviceRequests,
    loading,
    error,
    deleteServiceRequest,
    updateServiceRequest,
    createServiceRequest,
  };
}

/**
 * Hook to fetch technicians
 */
export function useTechnicians() {
  const [technicians, setTechnicians] = useState<Schema['Technician']['type'][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const sub = technicianAPI.observeTechnicians(
      (data) => {
        setTechnicians(data || []);
        setLoading(false);
      },
      (err) => {
        const message = err instanceof Error ? err.message : 'Failed to fetch technicians';
        setError(message);
        console.error(message);
        setLoading(false);
      }
    );

    return () => sub.unsubscribe();
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createTechnician = async (data: any) => {
    try {
      const created = await technicianAPI.createTechnician(data);
      setTechnicians((prev) => [...prev, created]);
      return created;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create technician';
      setError(message);
      throw err;
    }
  };

  const deleteTechnician = async (id: string) => {
    try {
      await technicianAPI.deleteTechnician(id);
      setTechnicians((prev) => prev.filter((tech) => tech.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete technician';
      setError(message);
      throw err;
    }
  };

  const updateTechnician = async (id: string, data: Partial<Schema['Technician']['type']>) => {
    try {
      const updated = await technicianAPI.updateTechnician(id, data);
      setTechnicians((prev) =>
        prev.map((tech) => (tech.id === id ? { ...tech, ...updated } : tech))
      );
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update technician';
      setError(message);
      throw err;
    }
  };

  return {
    technicians,
    loading,
    error,
    createTechnician,
    deleteTechnician,
    updateTechnician,
  };
}

/**
 * Hook to fetch scheduled jobs
 */
export function useScheduledJobs() {
  const [scheduledJobs, setScheduledJobs] = useState<Schema['ScheduledJob']['type'][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const sub = scheduledJobAPI.observeScheduledJobs(
      (data) => {
        setScheduledJobs(data || []);
        setLoading(false);
      },
      (err) => {
        const message = err instanceof Error ? err.message : 'Failed to fetch scheduled jobs';
        setError(message);
        console.error(message);
        setLoading(false);
      }
    );

    return () => sub.unsubscribe();
  }, []);

  const deleteScheduledJob = async (
    id: string,
    options?: { clientEmail?: string; notifyClient?: boolean; reason?: string; senderName?: string; fromName?: string; adminName?: string }
  ) => {
    try {
      const targetJob = scheduledJobs.find((j) => j.id === id);
      await scheduledJobAPI.deleteScheduledJob(id);
      setScheduledJobs((prev) => prev.filter((job) => job.id !== id));

      if (options?.notifyClient && targetJob) {
        try {
          const req = await serviceRequestAPI.getServiceRequest(targetJob.serviceRequestId);
          const clientEmail = options.clientEmail || (req ? (await resolveClientForJob(req.client))?.email : null);
          if (clientEmail && req) {
            sendJobDeletedNotification({
              clientName: req.client,
              clientEmail,
              job: {
                id: req.id,
                service: req.service,
                client: req.client,
                location: req.location,
                scheduledDate: targetJob.scheduledDate,
                status: 'Cancelled',
                notes: targetJob.notes || req.notes,
              },
              reason: options.reason || 'Removed from dispatch calendar',
              senderName: options.senderName || options.fromName || options.adminName,
            }).catch((err) => console.error('[useScheduledJobs] Auto-notification error on delete:', err));
          }
        } catch (notifyErr) {
          console.warn('[useScheduledJobs] Failed to send delete notification:', notifyErr);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete scheduled job';
      setError(message);
      throw err;
    }
  };

  const updateScheduledJob = async (
    id: string,
    data: Partial<Schema['ScheduledJob']['type']>,
    options?: { clientEmail?: string; notifyClient?: boolean; changesSummary?: string; senderName?: string; fromName?: string; adminName?: string }
  ) => {
    try {
      const updated = await scheduledJobAPI.updateScheduledJob(id, data);
      setScheduledJobs((prev) =>
        prev.map((job) => (job.id === id ? { ...job, ...updated } : job))
      );

      if (options?.notifyClient && updated) {
        try {
          const req = await serviceRequestAPI.getServiceRequest(updated.serviceRequestId);
          const clientEmail = options.clientEmail || (req ? (await resolveClientForJob(req.client))?.email : null);
          if (clientEmail && req) {
            sendJobUpdatedNotification({
              clientName: req.client,
              clientEmail,
              job: {
                id: req.id,
                service: req.service,
                client: req.client,
                location: req.location,
                status: updated.status || req.status,
                scheduledDate: updated.scheduledDate,
                requestTime: `${updated.startHour}:00`,
                notes: updated.notes || req.notes,
              },
              changesSummary: options.changesSummary,
              senderName: options.senderName || options.fromName || options.adminName,
            }).catch((err) => console.error('[useScheduledJobs] Auto-notification error on update:', err));
          }
        } catch (notifyErr) {
          console.warn('[useScheduledJobs] Failed to send update notification:', notifyErr);
        }
      }

      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update scheduled job';
      setError(message);
      throw err;
    }
  };

  const createScheduledJob = async (
    data: {
      techId: string;
      serviceRequestId: string;
      startHour: number;
      duration: number;
      status?: 'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled';
      notes?: string;
      scheduledDate?: string;
    },
    options?: { clientEmail?: string; notifyClient?: boolean; senderName?: string; fromName?: string; adminName?: string }
  ) => {
    try {
      const created = await scheduledJobAPI.createScheduledJob(data);
      setScheduledJobs((prev) => [...prev, created!]);

      if (options?.notifyClient && created) {
        try {
          const req = await serviceRequestAPI.getServiceRequest(created.serviceRequestId);
          const clientEmail = options.clientEmail || (req ? (await resolveClientForJob(req.client))?.email : null);
          if (clientEmail && req) {
            sendJobCreatedNotification({
              clientName: req.client,
              clientEmail,
              job: {
                id: req.id,
                service: req.service,
                client: req.client,
                location: req.location,
                status: created.status || 'Scheduled',
                scheduledDate: created.scheduledDate,
                requestTime: `${created.startHour}:00`,
                notes: created.notes || req.notes,
              },
              senderName: options.senderName || options.fromName || options.adminName,
            }).catch((err) => console.error('[useScheduledJobs] Auto-notification error on create:', err));
          }
        } catch (notifyErr) {
          console.warn('[useScheduledJobs] Failed to send create notification:', notifyErr);
        }
      }

      return created;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create scheduled job';
      setError(message);
      throw err;
    }
  };

  return {
    scheduledJobs,
    loading,
    error,
    deleteScheduledJob,
    updateScheduledJob,
    createScheduledJob,
  };
}

/**
 * Hook to fetch clients
 */
export function useClients() {
  const [clients, setClients] = useState<Schema['Client']['type'][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const sub = clientAPI.observeClients(
      (data) => {
        setClients(data || []);
        setLoading(false);
      },
      (err) => {
        const message = err instanceof Error ? err.message : 'Failed to fetch clients';
        setError(message);
        console.error(message);
        setLoading(false);
      }
    );

    return () => sub.unsubscribe();
  }, []);

  const deleteClient = async (id: string) => {
    try {
      await clientAPI.deleteClient(id);
      setClients((prev) => prev.filter((client) => client.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete client';
      setError(message);
      throw err;
    }
  };

  const updateClient = async (id: string, data: Partial<Schema['Client']['type']>) => {
    try {
      const updated = await clientAPI.updateClient(id, data);
      setClients((prev) =>
        prev.map((client) => (client.id === id ? { ...client, ...updated } : client))
      );
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update client';
      setError(message);
      throw err;
    }
  };

  const createClient = async (data: Partial<Schema['Client']['type']>) => {
    try {
      const created = await clientAPI.createClient(data);
      setClients((prev) => [...prev, created!]);
      return created;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create client';
      setError(message);
      throw err;
    }
  };

  return {
    clients,
    loading,
    error,
    deleteClient,
    updateClient,
    createClient,
  };
}
