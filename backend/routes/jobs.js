const express = require('express');
const crypto = require('crypto');
const { docClient } = require('../config/dynamodb');
const { ScanCommand, GetCommand, PutCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// Simple memory cache
const jobsCache = {
  data: null,
  lastFetch: null,
  ttl: 60000 // 1 minute cache
};

// @desc    Get all jobs (with pagination and caching)
// @route   GET /api/jobs
// @access  Public
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const lastKey = req.query.lastEvaluatedKey ? JSON.parse(decodeURIComponent(req.query.lastEvaluatedKey)) : undefined;

    // Use cache if we are just fetching the default first page
    if (!lastKey && limit === 20 && jobsCache.data && (Date.now() - jobsCache.lastFetch < jobsCache.ttl)) {
      return res.status(200).json(jobsCache.data);
    }

    const params = {
      TableName: 'consulting_jobs',
      Limit: limit
    };

    if (lastKey) {
      params.ExclusiveStartKey = lastKey;
    }

    const result = await docClient.send(new ScanCommand(params));

    let jobs = (result.Items || []).map(job => ({
      ...job,
      _id: job.id // Map id to _id for frontend compatibility
    }));
    
    // Note: DynamoDB Scan sorts by arbitrary partition key order unless we sort in memory.
    // In production with pagination, a GSI with a sort key on createdAt should be used.
    jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const responseData = { 
      success: true, 
      count: jobs.length, 
      data: jobs,
      lastEvaluatedKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null
    };

    // Cache the first page
    if (!lastKey && limit === 20) {
      jobsCache.data = responseData;
      jobsCache.lastFetch = Date.now();
    }

    res.status(200).json(responseData);
  } catch (error) {
    console.error('Fetch jobs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get a single job by ID
// @route   GET /api/jobs/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: 'consulting_jobs',
      Key: { id: req.params.id }
    }));

    if (!result.Item) {
      return res.status(404).json({ success: false, message: 'Job listing not found' });
    }

    const job = {
      ...result.Item,
      _id: result.Item.id
    };

    res.status(200).json({ success: true, data: job });
  } catch (error) {
    console.error('Fetch job by ID error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Create a job listing
// @route   POST /api/jobs
// @access  Private (Admin only)
router.post('/', protect, authorize('admin'), async (req, res) => {
  const { title, company, location, description, requirements, salary, link } = req.body;

  if (!title || !company || !location || !description) {
    return res.status(400).json({ success: false, message: 'Please provide title, company, location, and description' });
  }

  try {
    const reqsArray = Array.isArray(requirements)
      ? requirements
      : typeof requirements === 'string'
      ? requirements.split(',').map((req) => req.trim())
      : [];

    const newJobId = crypto.randomUUID();
    const newJob = {
      id: newJobId,
      title,
      company,
      location,
      description,
      requirements: reqsArray,
      salary: salary || '',
      link: link || '',
      createdBy: req.user.id || req.user._id,
      createdAt: new Date().toISOString(),
    };

    await docClient.send(new PutCommand({
      TableName: 'consulting_jobs',
      Item: newJob
    }));

    // Invalidate cache
    jobsCache.data = null;

    const responseJob = {
      ...newJob,
      _id: newJobId
    };

    res.status(201).json({ success: true, data: responseJob });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Update a job listing
// @route   PUT /api/jobs/:id
// @access  Private (Admin only)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const getRes = await docClient.send(new GetCommand({
      TableName: 'consulting_jobs',
      Key: { id: req.params.id }
    }));

    if (!getRes.Item) {
      return res.status(404).json({ success: false, message: 'Job listing not found' });
    }

    const job = getRes.Item;

    // Verify ownership or admin scope
    if (job.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Not authorized to update this listing' });
    }

    if (req.body.requirements && !Array.isArray(req.body.requirements)) {
      req.body.requirements = req.body.requirements.split(',').map((r) => r.trim());
    }

    const updatedJob = {
      ...job,
      ...req.body,
      id: job.id // Lock id
    };

    await docClient.send(new PutCommand({
      TableName: 'consulting_jobs',
      Item: updatedJob
    }));

    // Invalidate cache
    jobsCache.data = null;

    const responseJob = {
      ...updatedJob,
      _id: job.id
    };

    res.status(200).json({ success: true, data: responseJob });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Delete a job listing
// @route   DELETE /api/jobs/:id
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: 'consulting_jobs',
      Key: { id: req.params.id }
    }));

    if (!result.Item) {
      return res.status(404).json({ success: false, message: 'Job listing not found' });
    }

    const job = result.Item;

    // Verify ownership
    if (job.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this listing' });
    }

    await docClient.send(new DeleteCommand({
      TableName: 'consulting_jobs',
      Key: { id: req.params.id }
    }));

    // Invalidate cache
    jobsCache.data = null;

    res.status(200).json({ success: true, message: 'Job listing deleted successfully' });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
