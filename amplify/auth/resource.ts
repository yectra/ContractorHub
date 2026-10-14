import { defineAuth } from '@aws-amplify/backend';
import { postConfirmation } from '../functions/post-confirmation-lambda/resource';


export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  groups: ['Admin', 'Technician'],
  userAttributes: {
    'custom:role': {
      dataType: 'String',
      mutable: true,
    },
  },
  triggers: {
    postConfirmation,
  },
  access: (allow) => [
    allow.resource(postConfirmation).to(['addUserToGroup']),
  ],
});
