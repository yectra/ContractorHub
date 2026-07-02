import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../amplify/data/resource';
import outputs from '../../amplify_outputs.json';

// Detect if Amplify is configured with a backend
export const isAmplifyConfigured = outputs && Object.keys(outputs).length > 0 && (outputs as any).data?.url;

// Generate Amplify client only if configured
const client = isAmplifyConfigured ? generateClient<Schema>() : null;

/**
 * LOCAL STORAGE MOCK DATABASE (DEMO MODE FALLBACK)
 */
const MOCK_SERVICE_REQUESTS = [
  {
    id: 'SR-1001',
    type: 'Emergency' as const,
    priority: 'high' as const,
    client: 'Acme Corp',
    service: 'Main Water Line Leak',
    location: '123 Main St, Metro City',
    requestTime: '08:00 AM',
    estimatedDuration: '2 hours',
    status: 'Unassigned' as const,
    notes: 'Shut off valve is on the street level.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'SR-1002',
    type: 'WebRequest' as const,
    priority: 'medium' as const,
    client: 'Baker Industries',
    service: 'AC Compressor Making Noise',
    location: '456 Industrial Pkwy',
    requestTime: '10:30 AM',
    estimatedDuration: '3 hours',
    status: 'Unassigned' as const,
    notes: 'Contact facility manager Bill on arrival.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'SR-1003',
    type: 'Scheduled' as const,
    priority: 'low' as const,
    client: 'Charlie Brown Residence',
    service: 'Electrical Outlet Install',
    location: '789 Pine Ave',
    requestTime: '01:00 PM',
    estimatedDuration: '1 hour',
    status: 'Unassigned' as const,
    notes: 'Client has friendly Golden Retriever.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

const MOCK_TECHNICIANS = [
  {
    id: 'tech-1',
    name: 'David Miller',
    specialty: 'Plumbing' as const,
    email: 'david@saas.com',
    phone: '555-1212',
    avatar: 'DM',
    color: '#2196f3',
    isAvailable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tech-2',
    name: 'Sarah Connor',
    specialty: 'HVAC' as const,
    email: 'sarah@saas.com',
    phone: '555-3434',
    avatar: 'SC',
    color: '#4caf50',
    isAvailable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tech-3',
    name: 'Marcus Aurelius',
    specialty: 'Electrical' as const,
    email: 'marcus@saas.com',
    phone: '555-5656',
    avatar: 'MA',
    color: '#ff9800',
    isAvailable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

const MOCK_CLIENTS = [
  {
    id: 'c-1',
    name: 'Acme Corp',
    email: 'billing@acme.com',
    phone: '555-0100',
    address: '123 Main St, Metro City',
    outstandingBalance: '150.00',
    notes: 'VIP Business client.',
    preferenceNotes: 'Needs invoices emailed immediately upon completion.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'c-2',
    name: 'Baker Industries',
    email: 'facilities@baker.com',
    phone: '555-0200',
    address: '456 Industrial Pkwy',
    outstandingBalance: '450.00',
    notes: 'Industrial plant.',
    preferenceNotes: 'Hard hat and safety glasses required on site.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'c-3',
    name: 'Charlie Brown Residence',
    email: 'charlie@gmail.com',
    phone: '555-0300',
    address: '789 Pine Ave',
    outstandingBalance: '0.00',
    notes: 'Residential client.',
    preferenceNotes: 'Please ring back doorbell first.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

// LocalStorage helpers
const getLocal = <T>(key: string, defaults: T): T => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaults));
    return defaults;
  }
  return JSON.parse(data);
};

const setLocal = <T>(key: string, val: T) => {
  localStorage.setItem(key, JSON.stringify(val));
};

// Subscriber pub-sub for demo mode
type SubscriberCallback = (data: any) => void;
const pubsub: { [model: string]: SubscriberCallback[] } = {
  ServiceRequest: [],
  Technician: [],
  ScheduledJob: [],
  Client: []
};

const notify = (model: string, data: any) => {
  if (pubsub[model]) {
    pubsub[model].forEach(cb => cb(data));
  }
};

const subscribeMock = (model: string, callback: SubscriberCallback, initialData: any) => {
  pubsub[model].push(callback);
  // Send initial data immediately
  setTimeout(() => callback(initialData), 0);
  
  return {
    unsubscribe() {
      pubsub[model] = pubsub[model].filter(cb => cb !== callback);
    }
  };
};

/**
 * SERVICE REQUEST OPERATIONS
 */
export const serviceRequestAPI = {
  async listServiceRequests() {
    if (client) {
      const response = await client.models.ServiceRequest.list();
      return response.data;
    }
    return getLocal('mock_service_requests', MOCK_SERVICE_REQUESTS);
  },

  observeServiceRequests(
    next: (data: Schema['ServiceRequest']['type'][]) => void,
    error?: (err: any) => void
  ) {
    if (client) {
      return client.models.ServiceRequest.observeQuery().subscribe({
        next: ({ items }) => next(items),
        error: error || ((err) => console.error('Error in ServiceRequest subscription:', err)),
      });
    }
    const current = getLocal('mock_service_requests', MOCK_SERVICE_REQUESTS);
    return subscribeMock('ServiceRequest', next, current);
  },

  async getServiceRequest(id: string) {
    if (client) {
      const response = await client.models.ServiceRequest.get({ id });
      return response.data;
    }
    const list = getLocal('mock_service_requests', MOCK_SERVICE_REQUESTS);
    return list.find(r => r.id === id) || null;
  },

  async createServiceRequest(data: any) {
    if (client) {
      const response = await client.models.ServiceRequest.create(data);
      return response.data;
    }
    const list = getLocal('mock_service_requests', MOCK_SERVICE_REQUESTS);
    const newReq = {
      id: `SR-${Math.floor(1000 + Math.random() * 9000)}`,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...list, newReq];
    setLocal('mock_service_requests', updated);
    notify('ServiceRequest', updated);
    return newReq;
  },

  async updateServiceRequest(id: string, data: any) {
    if (client) {
      const response = await client.models.ServiceRequest.update({ id, ...data });
      return response.data;
    }
    const list = getLocal('mock_service_requests', MOCK_SERVICE_REQUESTS);
    let updatedItem: any = null;
    const updated = list.map(item => {
      if (item.id === id) {
        updatedItem = { ...item, ...data, updatedAt: new Date().toISOString() };
        return updatedItem;
      }
      return item;
    });
    setLocal('mock_service_requests', updated);
    notify('ServiceRequest', updated);
    return updatedItem;
  },

  async deleteServiceRequest(id: string) {
    if (client) {
      const response = await client.models.ServiceRequest.delete({ id });
      return response.data;
    }
    const list = getLocal('mock_service_requests', MOCK_SERVICE_REQUESTS);
    const itemToDelete = list.find(r => r.id === id);
    const updated = list.filter(item => item.id !== id);
    setLocal('mock_service_requests', updated);
    notify('ServiceRequest', updated);
    return itemToDelete || null;
  },
};

/**
 * TECHNICIAN OPERATIONS
 */
export const technicianAPI = {
  async listTechnicians() {
    if (client) {
      const response = await client.models.Technician.list();
      return response.data;
    }
    return getLocal('mock_technicians', MOCK_TECHNICIANS);
  },

  observeTechnicians(
    next: (data: Schema['Technician']['type'][]) => void,
    error?: (err: any) => void
  ) {
    if (client) {
      return client.models.Technician.observeQuery().subscribe({
        next: ({ items }) => next(items),
        error: error || ((err) => console.error('Error in Technician subscription:', err)),
      });
    }
    const current = getLocal('mock_technicians', MOCK_TECHNICIANS);
    return subscribeMock('Technician', next, current);
  },

  async getTechnician(id: string) {
    if (client) {
      const response = await client.models.Technician.get({ id });
      return response.data;
    }
    const list = getLocal('mock_technicians', MOCK_TECHNICIANS);
    return list.find(t => t.id === id) || null;
  },

  async createTechnician(data: any) {
    if (client) {
      const response = await client.models.Technician.create(data);
      return response.data;
    }
    const list = getLocal('mock_technicians', MOCK_TECHNICIANS);
    const newTech = {
      id: `tech-${Math.floor(100 + Math.random() * 900)}`,
      isAvailable: true,
      avatar: data.name ? data.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'T',
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...list, newTech];
    setLocal('mock_technicians', updated);
    notify('Technician', updated);
    return newTech;
  },

  async updateTechnician(id: string, data: any) {
    if (client) {
      const response = await client.models.Technician.update({ id, ...data });
      return response.data;
    }
    const list = getLocal('mock_technicians', MOCK_TECHNICIANS);
    let updatedItem: any = null;
    const updated = list.map(item => {
      if (item.id === id) {
        updatedItem = { ...item, ...data, updatedAt: new Date().toISOString() };
        return updatedItem;
      }
      return item;
    });
    setLocal('mock_technicians', updated);
    notify('Technician', updated);
    return updatedItem;
  },

  async deleteTechnician(id: string) {
    if (client) {
      const response = await client.models.Technician.delete({ id });
      return response.data;
    }
    const list = getLocal('mock_technicians', MOCK_TECHNICIANS);
    const itemToDelete = list.find(t => t.id === id);
    const updated = list.filter(item => item.id !== id);
    setLocal('mock_technicians', updated);
    notify('Technician', updated);
    return itemToDelete || null;
  },
};

/**
 * SCHEDULED JOB OPERATIONS
 */
export const scheduledJobAPI = {
  async listScheduledJobs() {
    if (client) {
      const response = await client.models.ScheduledJob.list();
      return response.data;
    }
    return getLocal<Schema['ScheduledJob']['type'][]>('mock_scheduled_jobs', []);
  },

  observeScheduledJobs(
    next: (data: Schema['ScheduledJob']['type'][]) => void,
    error?: (err: any) => void
  ) {
    if (client) {
      return client.models.ScheduledJob.observeQuery().subscribe({
        next: ({ items }) => next(items),
        error: error || ((err) => console.error('Error in ScheduledJob subscription:', err)),
      });
    }
    const current = getLocal<Schema['ScheduledJob']['type'][]>('mock_scheduled_jobs', []);
    return subscribeMock('ScheduledJob', next, current);
  },

  async getScheduledJob(id: string) {
    if (client) {
      const response = await client.models.ScheduledJob.get({ id });
      return response.data;
    }
    const list = getLocal<Schema['ScheduledJob']['type'][]>('mock_scheduled_jobs', []);
    return list.find(j => j.id === id) || null;
  },

  async createScheduledJob(data: any) {
    if (client) {
      const response = await client.models.ScheduledJob.create(data);
      return response.data;
    }
    const list = getLocal<Schema['ScheduledJob']['type'][]>('mock_scheduled_jobs', []);
    const newJob = {
      id: `job-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'Scheduled' as const,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...list, newJob];
    setLocal('mock_scheduled_jobs', updated);
    notify('ScheduledJob', updated);
    return newJob;
  },

  async updateScheduledJob(id: string, data: any) {
    if (client) {
      const response = await client.models.ScheduledJob.update({ id, ...data });
      return response.data;
    }
    const list = getLocal<Schema['ScheduledJob']['type'][]>('mock_scheduled_jobs', []);
    let updatedItem: any = null;
    const updated = list.map(item => {
      if (item.id === id) {
        updatedItem = { ...item, ...data, updatedAt: new Date().toISOString() };
        return updatedItem;
      }
      return item;
    });
    setLocal('mock_scheduled_jobs', updated);
    notify('ScheduledJob', updated);
    return updatedItem;
  },

  async deleteScheduledJob(id: string) {
    if (client) {
      const response = await client.models.ScheduledJob.delete({ id });
      return response.data;
    }
    const list = getLocal<Schema['ScheduledJob']['type'][]>('mock_scheduled_jobs', []);
    const itemToDelete = list.find(j => j.id === id);
    const updated = list.filter(item => item.id !== id);
    setLocal('mock_scheduled_jobs', updated);
    notify('ScheduledJob', updated);
    return itemToDelete || null;
  },
};

/**
 * CLIENT OPERATIONS
 */
export const clientAPI = {
  async listClients() {
    if (client) {
      const response = await client.models.Client.list();
      return response.data;
    }
    return getLocal('mock_clients', MOCK_CLIENTS);
  },

  observeClients(
    next: (data: Schema['Client']['type'][]) => void,
    error?: (err: any) => void
  ) {
    if (client) {
      return client.models.Client.observeQuery().subscribe({
        next: ({ items }) => next(items),
        error: error || ((err) => console.error('Error in Client subscription:', err)),
      });
    }
    const current = getLocal('mock_clients', MOCK_CLIENTS);
    return subscribeMock('Client', next, current);
  },

  async getClient(id: string) {
    if (client) {
      const response = await client.models.Client.get({ id });
      return response.data;
    }
    const list = getLocal('mock_clients', MOCK_CLIENTS);
    return list.find(c => c.id === id) || null;
  },

  async createClient(data: any) {
    if (client) {
      const response = await client.models.Client.create(data);
      return response.data;
    }
    const list = getLocal('mock_clients', MOCK_CLIENTS);
    const newClient = {
      id: `c-${Math.floor(100 + Math.random() * 900)}`,
      outstandingBalance: '0.00',
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...list, newClient];
    setLocal('mock_clients', updated);
    notify('Client', updated);
    return newClient;
  },

  async updateClient(id: string, data: any) {
    if (client) {
      const response = await client.models.Client.update({ id, ...data });
      return response.data;
    }
    const list = getLocal('mock_clients', MOCK_CLIENTS);
    let updatedItem: any = null;
    const updated = list.map(item => {
      if (item.id === id) {
        updatedItem = { ...item, ...data, updatedAt: new Date().toISOString() };
        return updatedItem;
      }
      return item;
    });
    setLocal('mock_clients', updated);
    notify('Client', updated);
    return updatedItem;
  },

  async deleteClient(id: string) {
    if (client) {
      const response = await client.models.Client.delete({ id });
      return response.data;
    }
    const list = getLocal('mock_clients', MOCK_CLIENTS);
    const itemToDelete = list.find(c => c.id === id);
    const updated = list.filter(item => item.id !== id);
    setLocal('mock_clients', updated);
    notify('Client', updated);
    return itemToDelete || null;
  },
};
