const yup = require('yup');
const { debugYupSchema } = require('../dist/index'); // Ensure your dist uses peerDependency for yup!

// Create a complex schema
const schema = yup.object({
  name: yup.string().required().min(2),
  email: yup.string().email().required(),
  age: yup.number().positive().integer().min(18),
  address: yup.object({
    street: yup.string().required(),
    city: yup.string().required(),
    zipCode: yup.string().matches(/^\d{5}$/, 'Invalid zip code')
  }),
  hobbies: yup.array().of(yup.string()).min(1)
});

// Test with invalid data
const invalidData = {
  name: 'J', // Too short
  email: 'invalid-email', // Invalid email
  age: 15, // Too young
  address: {
    street: '', // Required but empty
    city: 'New York',
    zipCode: '1234' // Invalid format
  },
  hobbies: [] // Array too short
};

console.log('=== DIRECT YUP TEST ===');
try {
  schema.validateSync(invalidData, { abortEarly: false });
  console.log('Direct validation: PASSED (this should not happen!)');
} catch (err) {
  console.log('Direct validation: FAILED (as expected)');
  console.log('Error type:', err.constructor.name);
  console.log('Error message:', err.message);
  console.log('Inner errors:', err.inner ? err.inner.length : 0);
  if (err.inner) {
    err.inner.forEach((e, i) => {
      console.log(`  ${i}: ${e.path} - ${e.message}`);
    });
  }
}

// Debug the validation
const result = debugYupSchema(schema, invalidData);

console.log('\n=== VALIDATION RESULT ===');
console.log('Is Valid:', result.isValid);
console.log('Errors:', result.errors.length);

console.log('\n=== FIELD ERRORS ===');
Object.keys(result.fieldErrors).forEach(field => {
  console.log(`${field}:`, result.fieldErrors[field].map(e => e.message));
});

console.log('\n=== VALIDATION TREE ===');
console.log(JSON.stringify(result.validationTree, null, 2));
