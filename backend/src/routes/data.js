const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { fetchMergedData } = require('../services/mergedDataService');
const { syncTypeformData, syncAirtableData, updateAirtableDynamoDBRecord } = require('../services/syncService');

// Protected route to fetch merged data
router.get('/fetchMergedData', verifyToken, async (req, res) => {
  try {
    const result = await fetchMergedData();

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Error in fetchMergedData route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Protected route to sync Typeform data
router.post('/syncTypeform', verifyToken, async (req, res) => {
  try {
    const result = await syncTypeformData();

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      summary: result.summary
    });
  } catch (error) {
    console.error('Error in syncTypeform route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Protected route to sync Airtable data
router.post('/syncAirtable', verifyToken, async (req, res) => {
  try {
    const result = await syncAirtableData();

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      summary: result.summary
    });
  } catch (error) {
    console.error('Error in syncAirtable route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Protected route to update Airtable and DynamoDB record
router.put('/updateRecord/:registrationNumber', verifyToken, async (req, res) => {
  try {
    const { registrationNumber } = req.params;
    const updateData = req.body;

    // Validate required fields
    const requiredFields = ['record_id', 'vial1_volume', 'vial2_volume', 'total_motility', 'morphology'];
    const missingFields = requiredFields.filter(field => !(field in updateData));
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    const result = await updateAirtableDynamoDBRecord(registrationNumber, updateData);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error in updateRecord route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router; 