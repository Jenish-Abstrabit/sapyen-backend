const express = require('express');
const router = express.Router();
const { welcome } = require('../controllers');
const { fetchAllTypeformResponses } = require('../services/typeformService');
const { fetchAllAirtableRecords } = require('../services/airtableService');

// Example route
router.get('/', welcome);

// Get all Typeform responses
router.get('/typeform', async (req, res) => {
  try {
    const responses = await fetchAllTypeformResponses();
    res.json(responses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all Airtable records
router.get('/airtable', async (req, res) => {
  try {
    const records = await fetchAllAirtableRecords();
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 