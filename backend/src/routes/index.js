const express = require('express');
const router = express.Router();
const { welcome } = require('../controllers');
const TypeformResponse = require('../models/TypeformResponse');

// Example route
router.get('/', welcome);

// Create a new response
router.post('/responses', async (req, res) => {
  try {
    const response = await TypeformResponse.create(req.body);
    res.status(201).json(response);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all responses with optional limit
router.get('/responses', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const responses = await TypeformResponse.getAll(limit);
    res.json(responses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get response by ID
router.get('/responses/:responseId', async (req, res) => {
  try {
    const response = await TypeformResponse.getByResponseId(req.params.responseId);
    if (!response) {
      return res.status(404).json({ error: 'Response not found' });
    }
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get responses by email
router.get('/responses/email/:email', async (req, res) => {
  try {
    const responses = await TypeformResponse.getByEmail(req.params.email);
    res.json(responses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete response by ID
router.delete('/responses/:responseId', async (req, res) => {
  try {
    await TypeformResponse.delete(req.params.responseId);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 