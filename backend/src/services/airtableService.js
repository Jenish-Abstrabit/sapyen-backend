const axios = require('axios');
require('dotenv').config();

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_ID = process.env.AIRTABLE_TABLE_ID;

async function fetchAllAirtableRecords() {
  try {
    let allRecords = [];
    let offset = null;
    
    do {
      const response = await axios.get(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`,
        {
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`
          },
          params: {
            pageSize: 100,
            ...(offset && { offset })
          }
        }
      );

      const { records, offset: nextOffset } = response.data;
      
      // Log the first record to inspect its structure
      if (records.length > 0 && !offset) {
        console.log('First record structure:', JSON.stringify(records[0], null, 2));
      }
      
      allRecords = [...allRecords, ...records];
      offset = nextOffset;
    } while (offset);

    // Sort all records by createdTime in descending order
    allRecords.sort((a, b) => {
      return new Date(b.createdTime) - new Date(a.createdTime);
    });

    return allRecords;
  } catch (error) {
    console.error('Error fetching from Airtable:', error.message);
    if (error.response) {
      console.error('Error details:', error.response.data);
    }
    throw error;
  }
}

async function updateAirtableRecord(recordId, updateData) {
  try {
    const response = await axios.patch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}/${recordId}`,
      {
        fields: {
          'Vial 1 Volume': updateData.vial1_volume,
          'Vial 2 Volume': updateData.vial2_volume,
          'Total Motility': updateData.total_motility,
          'Morphology': updateData.morphology
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error updating Airtable record:', error.message);
    if (error.response) {
      console.error('Error details:', error.response.data);
    }
    throw error;
  }
}

module.exports = {
  fetchAllAirtableRecords,
  updateAirtableRecord
}; 