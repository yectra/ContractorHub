process.env.CDK_CONTEXT_JSON = JSON.stringify({
  'amplify-backend-namespace': 'testNamespace',
  'amplify-backend-name': 'testBackend',
  'amplify-backend-type': 'sandbox',
});

const { backend } = await import('../amplify/backend');
console.log('Backend synthesized successfully:', !!backend);


