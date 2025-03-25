require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const TypeformResponse = require('./models/TypeformResponse');
const { connectDB } = require('./config/database');

// Sample response matching the new schema
const sampleResponse = {
  response_id: 'test_response_123',
  landing_id: 'test_landing_456',
  response_type: 'form_response',
  answers: [
    {
      field: {
        id: 'first_name_field',
        type: 'text',
        ref: '01G0DPK147RA5SVVB2HY268ZYE'
      },
      type: 'text',
      text: 'John'
    },
    {
      field: {
        id: 'last_name_field',
        type: 'text',
        ref: 'c98e6c56-15fb-424c-9f32-ce1a36bf6a55'
      },
      type: 'text',
      text: 'Doe'
    },
    {
      field: {
        id: 'registration_number_field',
        type: 'text',
        ref: '123077da-fa0f-473e-9b73-649c4578fb72'
      },
      type: 'text',
      text: 'REG123456'
    },
    {
      field: {
        id: 'email_field',
        type: 'email',
        ref: 'b0732c72-5275-419a-8673-bd2d5d5c3e63'
      },
      type: 'email',
      email: 'john.doe@example.com'
    },
    {
      field: {
        id: 'phone_number_field',
        type: 'phone_number',
        ref: 'd3a9680b-b67a-47b3-8719-3a71ffc88084'
      },
      type: 'phone_number',
      phone_number: '+1234567890'
    }
  ]
};

async function testTypeformResponse() {
  try {
    // Test creating a response
    console.log('Creating test response...');
    const result = await TypeformResponse.create(sampleResponse);
    console.log('Created response:', result);

    // Test getting all responses
    console.log('\nGetting all responses...');
    const allResponses = await TypeformResponse.getAll();
    console.log('All responses:', allResponses);

    // Test getting response by ID
    console.log('\nGetting response by ID...');
    const responseById = await TypeformResponse.getByResponseId(sampleResponse.response_id);
    console.log('Response by ID:', responseById);

    // Test getting response by email
    console.log('\nGetting response by email...');
    const responseByEmail = await TypeformResponse.getByEmail('john.doe@example.com');
    console.log('Response by email:', responseByEmail);

    // Test deleting response
    // console.log('\nDeleting response...');
    // await TypeformResponse.delete(sampleResponse.response_id);
    // console.log('Response deleted successfully');

  } catch (error) {
    console.error('Error in test:', error);
  }
}

testTypeformResponse(); 