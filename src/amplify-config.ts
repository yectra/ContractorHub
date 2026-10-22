import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';

// Initialize Amplify configuration immediately upon module evaluation
if (outputs && Object.keys(outputs).length > 0) {
  Amplify.configure(outputs);
}

export { outputs };
export default outputs;
