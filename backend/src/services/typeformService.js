const axios = require('axios');
require('dotenv').config();

const TYPEFORM_ACCESS_TOKEN = process.env.TYPEFORM_ACCESS_TOKEN;
const FORM_ID = process.env.TYPEFORM_FORM_ID;

// Debug logging
console.log('Environment variables:');
console.log('TYPEFORM_ACCESS_TOKEN:', TYPEFORM_ACCESS_TOKEN ? 'Present' : 'Missing');
console.log('FORM_ID:', FORM_ID ? 'Present' : 'Missing');

async function fetchAllTypeformResponses() {
  try {
    let allResponses = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await axios.get(
        `https://api.typeform.com/forms/${FORM_ID}/responses`,
        {
          headers: {
            'Authorization': `Bearer ${TYPEFORM_ACCESS_TOKEN}`
          },
          params: {
            page_size: 100,
            page
          }
        }
      );

      const { items, total_items, page_count } = response.data;
      allResponses = [...allResponses, ...items];
      
      hasMore = page < page_count;
      page++;
    }

    return allResponses;
  } catch (error) {
    console.error('Error fetching from Typeform:', error.message);
    throw error;
  }
}

module.exports = {
  fetchAllTypeformResponses
}; 