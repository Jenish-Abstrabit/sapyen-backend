const axios = require('axios');
require('dotenv').config();

const TYPEFORM_ACCESS_TOKEN = process.env.TYPEFORM_ACCESS_TOKEN;
const FORM_ID = process.env.TYPEFORM_FORM_ID;

async function fetchTypeformResponses() {
  try {
    const response = await axios.get(
      `https://api.typeform.com/forms/${FORM_ID}/responses`,
      {
        headers: {
          'Authorization': `Bearer ${TYPEFORM_ACCESS_TOKEN}`
        },
        params: {
          page_size: 10 // Adjust based on your needs
        }
      }
    );
    return response.data.items || [];
  } catch (error) {
    console.error('Error fetching from Typeform:', error.message);
    throw error;
  }
}

module.exports = {
  fetchTypeformResponses
}; 