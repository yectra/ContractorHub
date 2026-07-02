import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  // Service Requests - jobs that need to be dispatched
  ServiceRequest: a
    .model({
      id: a.id(),
      type: a.enum(['Emergency', 'WebRequest', 'Scheduled']),
      priority: a.enum(['high', 'medium', 'low']),
      client: a.string().required(),
      service: a.string().required(),
      location: a.string().required(),
      requestTime: a.string().required(),
      estimatedDuration: a.string().required(),
      status: a.enum(['Unassigned', 'Assigned', 'InProgress', 'Completed']),
      assignedTechnicianId: a.string(),
      notes: a.string(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.authenticated().to(['read', 'update', 'delete', 'create']),
    ]),

  // Technicians - staff available for dispatch
  Technician: a
    .model({
      id: a.id(),
      name: a.string().required(),
      specialty: a.enum(['Plumbing', 'HVAC', 'Electrical', 'General']),
      email: a.email(),
      phone: a.phone(),
      avatar: a.string(),
      color: a.string(),
      isAvailable: a.boolean().default(true),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.authenticated().to(['read', 'create', 'update', 'delete']),
    ]),

  // Scheduled Jobs - dispatch assignments
  ScheduledJob: a
    .model({
      id: a.id(),
      techId: a.string().required(),
      serviceRequestId: a.string().required(),
      startHour: a.integer().required(),
      duration: a.integer().required(),
      status: a.enum(['Scheduled', 'InProgress', 'Completed', 'Cancelled']),
      notes: a.string(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.authenticated().to(['read', 'create', 'update', 'delete']),
    ]),

  // Client Details - company/customer information
  Client: a
    .model({
      id: a.id(),
      name: a.string().required(),
      email: a.email(),
      phone: a.phone(),
      address: a.string(),
      city: a.string(),
      state: a.string(),
      zipCode: a.string(),
      outstandingBalance: a.string(),
      notes: a.string(),
      preferenceNotes: a.string(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.authenticated().to(['read', 'create', 'update', 'delete']),
    ]),

  // Service History - past work records
  ServiceHistory: a
    .model({
      id: a.id(),
      clientId: a.string().required(),
      technicianId: a.string().required(),
      service: a.string().required(),
      cost: a.string(),
      date: a.date(),
      notes: a.string(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.authenticated().to(['read', 'create', 'update', 'delete']),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
