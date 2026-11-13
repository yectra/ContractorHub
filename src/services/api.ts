/* eslint-disable @typescript-eslint/no-explicit-any */
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import outputs from '../../amplify_outputs.json';

// Detect if Amplify is configured with a backend
export const isAmplifyConfigured = Boolean(
  outputs && Object.keys(outputs).length > 0 && (outputs as any).data?.url
);

/**
 * Ensures Amplify is configured with outputs before any data operations
 */
export function ensureAmplifyConfigured(): void {
  try {
    const config = Amplify.getConfig();
    if (!config || Object.keys(config).length === 0) {
      if (outputs && Object.keys(outputs).length > 0) {
        Amplify.configure(outputs);
      }
    }
  } catch {
    if (outputs && Object.keys(outputs).length > 0) {
      Amplify.configure(outputs);
    }
  }
}

let cachedClient: ReturnType<typeof generateClient<Schema>> | null = null;

/**
 * Lazy getter for Amplify Data client: initializes only after Amplify is configured
 */
export function getClient(): ReturnType<typeof generateClient<Schema>> {
  if (!cachedClient) {
    ensureAmplifyConfigured();
    cachedClient = generateClient<Schema>();
  }
  return cachedClient;
}

/**
 * Backward-compatible client proxy so existing `client.models...` calls continue
 * working seamlessly without evaluating `generateClient()` at module load time.
 */
export const client = new Proxy({} as ReturnType<typeof generateClient<Schema>>, {
  get(_target, prop) {
    const instance = getClient();
    const val = (instance as any)[prop];
    if (typeof val === 'function') {
      return val.bind(instance);
    }
    return val;
  },
});

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

// Cross-tab and window storage synchronization
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e: StorageEvent) => {
    if (!e.newValue) return;
    try {
      const parsed = JSON.parse(e.newValue);
      if (e.key === 'mock_service_requests') {
        notify('ServiceRequest', parsed);
      } else if (e.key === 'mock_scheduled_jobs') {
        notify('ScheduledJob', parsed);
      } else if (e.key === 'mock_technicians') {
        notify('Technician', parsed);
      } else if (e.key === 'mock_clients') {
        notify('Client', parsed);
      }
    } catch {
      // Ignore malformed storage updates
    }
  });
}

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
 * Populates and normalizes related relations (technicianPhotos, comments, checklistItems)
 * on a job or service request object, guaranteeing safe array access and falling back
 * to notes JSON parsing or browser localStorage caches.
 */
export function populateJobRelations(job: any, serviceRequest?: any): any {
  if (!job && !serviceRequest) return null;
  const base = job || serviceRequest;
  const secondary = job ? serviceRequest : null;

  // Initialize relations
  let technicianPhotos: any[] = Array.isArray(base.technicianPhotos)
    ? [...base.technicianPhotos]
    : Array.isArray(base.photos)
    ? [...base.photos]
    : [];

  let comments: any[] = Array.isArray(base.comments)
    ? [...base.comments]
    : [];

  let checklistItems: any[] = Array.isArray(base.checklistItems)
    ? [...base.checklistItems]
    : Array.isArray(base.checklist)
    ? [...base.checklist]
    : [];

  // 1. Check notes on both base and secondary objects
  const notesCandidates = [base.notes, secondary?.notes].filter(Boolean);
  for (const notesStr of notesCandidates) {
    if (typeof notesStr !== 'string') continue;
    if (notesStr.startsWith('CHECKLIST:')) {
      try {
        const parsed = JSON.parse(notesStr.replace('CHECKLIST:', ''));
        if (Array.isArray(parsed) && checklistItems.length === 0) {
          checklistItems = parsed;
        }
      } catch {
        // ignore
      }
    } else {
      try {
        const parsed = JSON.parse(notesStr);
        if (parsed && typeof parsed === 'object') {
          if (checklistItems.length === 0) {
            if (Array.isArray(parsed.checklistItems)) checklistItems = parsed.checklistItems;
            else if (Array.isArray(parsed.checklist)) checklistItems = parsed.checklist;
          }
          if (technicianPhotos.length === 0) {
            if (Array.isArray(parsed.technicianPhotos)) technicianPhotos = parsed.technicianPhotos;
            else if (Array.isArray(parsed.photos)) technicianPhotos = parsed.photos;
          }
          if (comments.length === 0) {
            if (Array.isArray(parsed.comments)) {
              comments = parsed.comments;
            } else if (typeof parsed.comment === 'string' && parsed.comment.trim()) {
              comments = [
                {
                  id: 'c-1',
                  text: parsed.comment.trim(),
                  author: 'Technician',
                  createdAt: base.updatedAt || new Date().toISOString(),
                },
              ];
            }
          }
        }
      } catch {
        // Plain text note fallback for comments
        if (!notesStr.startsWith('CHECKLIST:') && comments.length === 0 && notesStr.trim()) {
          comments = [
            {
              id: 'c-note',
              text: notesStr.trim(),
              author: 'Technician',
              createdAt: base.updatedAt || new Date().toISOString(),
            },
          ];
        }
      }
    }
  }

  // 2. Check localStorage caches for technician-uploaded data
  if (typeof window !== 'undefined') {
    const candidateIds = [
      base.id,
      base.serviceRequestId,
      secondary?.id,
      secondary?.serviceRequestId,
    ].filter(Boolean) as string[];

    for (const jId of candidateIds) {
      try {
        if (checklistItems.length === 0) {
          const cached = localStorage.getItem(`checklist_job_${jId}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) checklistItems = parsed;
          }
        }
        if (technicianPhotos.length === 0) {
          const cached = localStorage.getItem(`photos_job_${jId}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) technicianPhotos = parsed;
          }
        }
        if (comments.length === 0) {
          const cachedComments = localStorage.getItem(`comments_job_${jId}`);
          if (cachedComments) {
            const parsed = JSON.parse(cachedComments);
            if (Array.isArray(parsed)) comments = parsed;
          } else {
            const cachedComment = localStorage.getItem(`comment_job_${jId}`);
            if (cachedComment && cachedComment.trim()) {
              comments = [
                {
                  id: `c-${jId}`,
                  text: cachedComment.trim(),
                  author: 'Technician',
                  createdAt: new Date().toISOString(),
                },
              ];
            }
          }
        }
      } catch {
        // Ignore localStorage issues
      }
    }
  }

  // Normalize checklistItems
  checklistItems = checklistItems.map((item: any, idx: number) => ({
    id: String(item?.id || `step-${idx + 1}`),
    text: String(item?.text || item?.title || item?.name || ''),
    checked: Boolean(item?.checked ?? item?.completed ?? false),
  }));

  // Normalize technicianPhotos
  technicianPhotos = technicianPhotos.map((photo: any, idx: number) => {
    if (typeof photo === 'string') {
      return { id: `photo-${idx + 1}`, url: photo, name: `Photo ${idx + 1}` };
    }
    return {
      id: String(photo?.id || `photo-${idx + 1}`),
      url: String(photo?.url || photo?.src || ''),
      name: String(photo?.name || photo?.title || `Photo ${idx + 1}`),
    };
  });

  // Normalize comments
  comments = comments.map((c: any, idx: number) => {
    if (typeof c === 'string') {
      return {
        id: `c-${idx + 1}`,
        text: c,
        author: 'Technician',
        createdAt: new Date().toISOString(),
      };
    }
    return {
      id: String(c?.id || `c-${idx + 1}`),
      text: String(c?.text || c?.comment || c?.message || ''),
      author: String(c?.author || c?.userName || c?.techName || 'Technician'),
      createdAt: String(c?.createdAt || c?.timestamp || new Date().toISOString()),
    };
  });

  return {
    ...base,
    technicianPhotos,
    photos: technicianPhotos,
    comments,
    checklistItems,
    checklist: checklistItems,
  };
}

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
    let req: any;
    if (client) {
      const response = await client.models.ServiceRequest.get({ id });
      req = response.data;
    } else {
      const list = getLocal('mock_service_requests', MOCK_SERVICE_REQUESTS);
      req = list.find((r: any) => r.id === id) || null;
    }
    return req ? populateJobRelations(req) : null;
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
      try {
        const response = await client.models.Technician.create(data);
        if (response.errors && response.errors.length > 0) {
          const err: any = new Error(response.errors.map((e: any) => e.message).join(', '));
          err.errors = response.errors;
          throw err;
        }
        return response.data;
      } catch (err: any) {
        if (!err.errors && (err as any).errors) {
          err.errors = (err as any).errors;
        }
        throw err;
      }
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
      try {
        const response = await client.models.Technician.update({ id, ...data });
        if (response.errors && response.errors.length > 0) {
          const err: any = new Error(response.errors.map((e: any) => e.message).join(', '));
          err.errors = response.errors;
          throw err;
        }
        return response.data;
      } catch (err: any) {
        if (!err.errors && (err as any).errors) {
          err.errors = (err as any).errors;
        }
        throw err;
      }
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
      try {
        const response = await client.models.Technician.delete({ id });
        if (response.errors && response.errors.length > 0) {
          const err: any = new Error(response.errors.map((e: any) => e.message).join(', '));
          err.errors = response.errors;
          throw err;
        }
        return response.data;
      } catch (err: any) {
        if (!err.errors && (err as any).errors) {
          err.errors = (err as any).errors;
        }
        throw err;
      }
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
    let job: any;
    if (client) {
      const response = await client.models.ScheduledJob.get({ id });
      job = response.data;
    } else {
      const list = getLocal<Schema['ScheduledJob']['type'][]>('mock_scheduled_jobs', []);
      job = list.find((j: any) => j.id === id || j.serviceRequestId === id) || null;
    }
    return job ? populateJobRelations(job) : null;
  },

  async getJobWithRelations(id: string) {
    let job: any = null;
    let serviceReq: any = null;

    if (client) {
      try {
        const response = await client.models.ScheduledJob.get({ id });
        job = response.data;
      } catch {
        // Might be a serviceRequestId
      }
    } else {
      const list = getLocal<any[]>('mock_scheduled_jobs', []);
      job = list.find((j: any) => j.id === id || j.serviceRequestId === id) || null;
    }

    const sReqId = job?.serviceRequestId || id;
    if (client && sReqId) {
      try {
        const sRes = await client.models.ServiceRequest.get({ id: sReqId });
        serviceReq = sRes.data;
      } catch {
        // ignore
      }
    } else if (sReqId) {
      const sList = getLocal<any[]>('mock_service_requests', MOCK_SERVICE_REQUESTS);
      serviceReq = sList.find((r: any) => r.id === sReqId) || null;
    }

    return populateJobRelations(job || serviceReq, serviceReq);
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

  async fetchJobDetails(id: string) {
    return fetchJobDetails(id);
  },

  async uploadJobPhoto(id: string, photoData: any) {
    return uploadJobPhoto(id, photoData);
  },

  async deleteJobPhoto(id: string, photoId: string) {
    return deleteJobPhoto(id, photoId);
  },

  async addJobComment(id: string, commentData: any) {
    return addJobComment(id, commentData);
  },

  async updateChecklist(id: string, checklistData: any) {
    return updateChecklist(id, checklistData);
  },
};

export interface TechnicianPhoto {
  id: string;
  url: string;
  name: string;
}

export interface TechnicianComment {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

export interface TechnicianChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface JobDetailsPayload {
  id: string;
  serviceRequestId?: string;
  client?: string;
  clientName?: string;
  service?: string;
  serviceName?: string;
  location?: string;
  address?: string;
  phone?: string;
  status?: string;
  startTime?: string;
  endTime?: string;
  technicianId?: string;
  notes?: string;
  technicianPhotos: TechnicianPhoto[];
  photos: TechnicianPhoto[];
  comments: TechnicianComment[];
  comment?: string;
  checklistItems: TechnicianChecklistItem[];
  checklist: TechnicianChecklistItem[];
  [key: string]: any;
}

/**
 * Fetches fully-populated job details including relations: photos, comments, and checklist.
 */
export async function fetchJobDetails(jobId: string): Promise<JobDetailsPayload | null> {
  if (!jobId) return null;
  const job = await scheduledJobAPI.getJobWithRelations(jobId);
  if (!job) return null;

  return {
    ...job,
    photos: job.technicianPhotos || job.photos || [],
    technicianPhotos: job.technicianPhotos || job.photos || [],
    comments: job.comments || [],
    checklist: job.checklistItems || job.checklist || [],
    checklistItems: job.checklistItems || job.checklist || [],
  };
}

/**
 * Uploads a technician photo for a job and persists it to Amplify/S3 and storage cache.
 */
export async function uploadJobPhoto(
  jobId: string,
  photoData: File | Blob | FormData | { name: string; url?: string; dataUrl?: string }
): Promise<TechnicianPhoto> {
  if (!jobId) throw new Error('Job ID is required to upload photo');

  let name = `photo_${Date.now()}.jpg`;
  let url = '';
  let blobToUpload: Blob | null = null;

  if (typeof FormData !== 'undefined' && photoData instanceof FormData) {
    const fileEntry: any = photoData.get('photo') || photoData.get('file');
    if (fileEntry && typeof fileEntry === 'object') {
      if (fileEntry.name) {
        name = fileEntry.name;
      }
      blobToUpload = fileEntry;
    }
  } else if (typeof File !== 'undefined' && photoData instanceof File) {
    name = photoData.name || name;
    blobToUpload = photoData;
  } else if (typeof Blob !== 'undefined' && photoData instanceof Blob) {
    blobToUpload = photoData;
  } else if (typeof photoData === 'object' && photoData !== null) {
    if ('name' in photoData && photoData.name) {
      name = photoData.name;
    }
    if ('url' in photoData && photoData.url) {
      url = photoData.url;
    } else if ('dataUrl' in photoData && photoData.dataUrl) {
      url = photoData.dataUrl;
    }
  }

  // AWS Amplify Storage upload if available
  if (client && (blobToUpload || url)) {
    try {
      const storageModule = await import('aws-amplify/storage');
      if (storageModule && typeof storageModule.uploadData === 'function') {
        const fileObj = blobToUpload || (await (await fetch(url)).blob());
        const cleanName = name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const uploadRes = await storageModule.uploadData({
          path: `jobs/${jobId}/${Date.now()}_${cleanName}`,
          data: fileObj,
          options: {
            contentType: 'image/jpeg',
          },
        }).result;

        url = uploadRes.path || `https://s3.mock-amplify-bucket.amazonaws.com/${uploadRes.path}`;
      }
    } catch {
      // Fallback
    }
  }

  // Fallback to Data URL if url still not set
  if (!url && blobToUpload) {
    url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blobToUpload as Blob);
    });
  }

  if (!url) {
    url = `https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80`;
  }

  const newPhoto: TechnicianPhoto = {
    id: `photo-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    url,
    name,
  };

  const currentPhotos = getLocal<TechnicianPhoto[]>(`photos_job_${jobId}`, []);
  const updatedPhotos = [...currentPhotos, newPhoto];
  setLocal(`photos_job_${jobId}`, updatedPhotos);

  // Sync to ScheduledJob notes
  try {
    const job = await scheduledJobAPI.getScheduledJob(jobId);
    if (job) {
      let notesObj: any = {};
      if (job.notes && !job.notes.startsWith('CHECKLIST:')) {
        try {
          notesObj = JSON.parse(job.notes);
        } catch {
          // ignore
        }
      }
      notesObj.photos = updatedPhotos;
      notesObj.technicianPhotos = updatedPhotos;
      await scheduledJobAPI.updateScheduledJob(job.id, {
        notes: JSON.stringify(notesObj),
      });
    }
  } catch (err) {
    console.warn('Could not sync photo to scheduled job notes:', err);
  }

  return newPhoto;
}

/**
 * Deletes a technician photo for a job and updates persistent state.
 */
export async function deleteJobPhoto(
  jobId: string,
  photoId: string
): Promise<{ success: boolean; photoId: string }> {
  if (!jobId) throw new Error('Job ID is required to delete photo');

  const currentPhotos = getLocal<TechnicianPhoto[]>(`photos_job_${jobId}`, []);
  const photoToDelete = currentPhotos.find((p) => p.id === photoId);
  const updatedPhotos = currentPhotos.filter((p) => p.id !== photoId);
  setLocal(`photos_job_${jobId}`, updatedPhotos);

  if (client && photoToDelete?.url) {
    try {
      const storageModule = await import('aws-amplify/storage');
      if (storageModule && typeof storageModule.remove === 'function') {
        let path = photoToDelete.url;
        if (path.startsWith('http')) {
          const match = path.match(/jobs\/.+/);
          if (match) path = match[0];
        }
        await storageModule.remove({ path });
      }
    } catch {
      // ignore
    }
  }

  try {
    const job = await scheduledJobAPI.getScheduledJob(jobId);
    if (job) {
      let notesObj: any = {};
      if (job.notes && !job.notes.startsWith('CHECKLIST:')) {
        try {
          notesObj = JSON.parse(job.notes);
        } catch {
          // ignore
        }
      }
      notesObj.photos = updatedPhotos;
      notesObj.technicianPhotos = updatedPhotos;
      await scheduledJobAPI.updateScheduledJob(job.id, {
        notes: JSON.stringify(notesObj),
      });
    }
  } catch (err) {
    console.warn('Could not sync photo deletion to scheduled job:', err);
  }

  return { success: true, photoId };
}

/**
 * Adds a technician comment or activity log entry and persists to storage and backend.
 */
export async function addJobComment(
  jobId: string,
  commentData: string | { text: string; author?: string }
): Promise<TechnicianComment> {
  if (!jobId) throw new Error('Job ID is required to add comment');

  const text = typeof commentData === 'string' ? commentData : commentData.text;
  const author = typeof commentData === 'object' && commentData.author ? commentData.author : 'Technician';

  const newComment: TechnicianComment = {
    id: `c-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    text: (text || '').trim(),
    author,
    createdAt: new Date().toISOString(),
  };

  const currentComments = getLocal<TechnicianComment[]>(`comments_job_${jobId}`, []);
  const updatedComments = [...currentComments, newComment];
  setLocal(`comments_job_${jobId}`, updatedComments);
  try {
    localStorage.setItem(`comment_job_${jobId}`, (text || '').trim());
  } catch {
    // ignore
  }

  try {
    const job = await scheduledJobAPI.getScheduledJob(jobId);
    if (job) {
      let notesObj: any = {};
      if (job.notes && !job.notes.startsWith('CHECKLIST:')) {
        try {
          notesObj = JSON.parse(job.notes);
        } catch {
          // ignore
        }
      }
      notesObj.comment = (text || '').trim();
      notesObj.comments = updatedComments;
      await scheduledJobAPI.updateScheduledJob(job.id, {
        notes: JSON.stringify(notesObj),
      });
    }
  } catch (err) {
    console.warn('Could not sync comment to scheduled job:', err);
  }

  return newComment;
}

/**
 * Updates technician checklist items for a job and persists to storage and backend.
 */
export async function updateChecklist(
  jobId: string,
  checklistData: Array<{ id: string; text: string; checked: boolean }>
): Promise<TechnicianChecklistItem[]> {
  if (!jobId) throw new Error('Job ID is required to update checklist');

  const normalized: TechnicianChecklistItem[] = (checklistData || []).map((item, idx) => ({
    id: String(item.id || `step-${idx + 1}`),
    text: String(item.text || ''),
    checked: Boolean(item.checked),
  }));

  setLocal(`checklist_job_${jobId}`, normalized);

  try {
    const job = await scheduledJobAPI.getScheduledJob(jobId);
    if (job) {
      let notesObj: any = {};
      if (job.notes && !job.notes.startsWith('CHECKLIST:')) {
        try {
          notesObj = JSON.parse(job.notes);
        } catch {
          // ignore
        }
      }
      notesObj.checklist = normalized;
      await scheduledJobAPI.updateScheduledJob(job.id, {
        notes: JSON.stringify(notesObj),
      });
    }
  } catch (err) {
    console.warn('Could not sync checklist to scheduled job:', err);
  }

  return normalized;
}

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
