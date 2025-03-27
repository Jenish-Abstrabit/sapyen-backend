const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { fetchMergedData } = require('../services/mergedDataService');
const { syncTypeformData, syncAirtableData } = require('../services/syncService');

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

module.exports = router; 