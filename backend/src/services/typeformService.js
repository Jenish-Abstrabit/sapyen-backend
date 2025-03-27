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
    // Make a single request with page_size=1000 to get all responses
    const response = await axios.get(
      `https://api.typeform.com/forms/${FORM_ID}/responses`,
      {
        headers: {
          'Authorization': `Bearer ${TYPEFORM_ACCESS_TOKEN}`
        },
        params: {
          page_size: 1000, // Get maximum responses in one request
          response_type: 'completed' // Only get completed responses
        }
      }
    );

    const { items, total_items } = response.data;
    
    console.log(`\nTypeform API Response:`);
    console.log(`Total items reported by API: ${total_items}`);
    console.log(`Items received: ${items.length}`);

    // Validate total number of responses
    if (items.length !== total_items) {
      console.warn(`\nWarning: Response count mismatch!`);
      console.warn(`Expected ${total_items} responses but got ${items.length}`);
    }

    // Check for duplicate response IDs
    const responseIds = new Set();
    const duplicates = [];
    items.forEach(response => {
      if (responseIds.has(response.response_id)) {
        duplicates.push(response.response_id);
      }
      responseIds.add(response.response_id);
    });

    if (duplicates.length > 0) {
      console.warn(`\nWarning: Found ${duplicates.length} duplicate response IDs:`);
      duplicates.forEach(id => console.warn(`- ${id}`));
    }

    return items;
  } catch (error) {
    console.error('Error fetching from Typeform:', error.message);
    throw error;
  }
}

module.exports = {
  fetchAllTypeformResponses
}; 