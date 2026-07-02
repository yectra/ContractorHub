import { useEffect, useState } from 'react';
import type { Schema } from '../../amplify/data/resource';
import { serviceRequestAPI, technicianAPI, scheduledJobAPI, clientAPI } from '../services/api';

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

  const deleteServiceRequest = async (id: string) => {
    try {
      await serviceRequestAPI.deleteServiceRequest(id);
      setServiceRequests((prev) => prev.filter((req) => req.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete service request';
      setError(message);
      throw err;
    }
  };

  const updateServiceRequest = async (id: string, data: Partial<Schema['ServiceRequest']['type']>) => {
    try {
      const updated = await serviceRequestAPI.updateServiceRequest(id, data);
      setServiceRequests((prev) =>
        prev.map((req) => (req.id === id ? { ...req, ...updated } : req))
      );
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update service request';
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

  const deleteScheduledJob = async (id: string) => {
    try {
      await scheduledJobAPI.deleteScheduledJob(id);
      setScheduledJobs((prev) => prev.filter((job) => job.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete scheduled job';
      setError(message);
      throw err;
    }
  };

  const updateScheduledJob = async (id: string, data: Partial<Schema['ScheduledJob']['type']>) => {
    try {
      const updated = await scheduledJobAPI.updateScheduledJob(id, data);
      setScheduledJobs((prev) =>
        prev.map((job) => (job.id === id ? { ...job, ...updated } : job))
      );
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update scheduled job';
      setError(message);
      throw err;
    }
  };

  const createScheduledJob = async (data: {
    techId: string;
    serviceRequestId: string;
    startHour: number;
    duration: number;
    status?: 'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled';
    notes?: string;
  }) => {
    try {
      const created = await scheduledJobAPI.createScheduledJob(data);
      setScheduledJobs((prev) => [...prev, created!]);
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

  return {
    clients,
    loading,
    error,
    deleteClient,
    updateClient,
  };
}
