import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import {
  signUp,
  type SignUpInput,
} from 'aws-amplify/auth';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

import outputs from '../amplify_outputs.json';
import './index.css';
import App from './App';
import Providers from './app/providers';
import { AuthRoleProvider } from './contexts/AuthRoleProvider';
import styles from './styles/UI/RoleUI.module.scss';

Amplify.configure(outputs);

type UserRole = 'Admin' | 'Technician';

const formFields = {
  signUp: {
    email: {
      order: 1,
      isRequired: true,
    },
    password: {
      order: 2,
      isRequired: true,
    },
    confirm_password: {
      order: 3,
      isRequired: true,
    },
  },
};

const normalizeSignUpInput = (
  input: SignUpInput,
  role: UserRole,
): SignUpInput => {
  return {
    ...input,
    options: {
      ...input.options,
      userAttributes: {
        ...input.options?.userAttributes,
        'custom:role': role,
      },
    },
  };
};

const SignUpFormFields = () => {
  const [role, setRole] = useState<UserRole>('Technician');

  return (
    <>
      <Authenticator.SignUp.FormFields />

      <div className={styles.authRoleWrapper}>
        <label htmlFor="custom-role-select" className={styles.authRoleLabel}>
          Role *
        </label>

        <select
          id="custom-role-select"
          name="custom:role"
          value={role}
          onChange={(event) => {
            setRole(event.target.value as UserRole);
          }}
          required
          className={styles.authRoleSelect}
        >
          <option value="Technician">Technician</option>
          <option value="Admin">Admin</option>
        </select>
      </div>
    </>
  );
};

const authComponents = {
  SignUp: {
    FormFields: SignUpFormFields,
  },
};

const services = {
  async handleSignUp(input: SignUpInput) {
    const role =
      input.options?.userAttributes?.['custom:role'] as
        | UserRole
        | undefined;

    return signUp(normalizeSignUpInput(input, role ?? 'Technician'));
  },
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Authenticator
      formFields={formFields}
      components={authComponents}
      services={services}
    >
      <Providers>
        <AuthRoleProvider>
          <App />
        </AuthRoleProvider>
      </Providers>
    </Authenticator>
  </StrictMode>,
);