const express = require('express');
const crypto = require('crypto');
const { db } = require('../config/firebase');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

const NodeCache = require('node-cache');
const jobsCache = new NodeCache({ stdTTL: 60, checkperiod: 120 }); // 60 seconds cache

// @desc    Get all jobs (with pagination and caching)
// @route   GET /api/jobs
// @access  Public
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const lastKey = req.query.lastEvaluatedKey ? JSON.parse(decodeURIComponent(req.query.lastEvaluatedKey)) : undefined;

    // Use cache if we are just fetching the default first page
    if (!lastKey && limit === 20 && jobsCache.has('defaultPage')) {
      return res.status(200).json(jobsCache.get('defaultPage'));
    }

    let jobsQuery = db.collection('consulting_jobs').orderBy('createdAt', 'desc').limit(limit);

    if (lastKey && lastKey.id) {
      const docRef = await db.collection('consulting_jobs').doc(lastKey.id).get();
      if (docRef.exists) {
        jobsQuery = jobsQuery.startAfter(docRef);
      }
    }

    const resultSnapshot = await jobsQuery.get();

    let jobs = resultSnapshot.docs.map(doc => ({
      ...doc.data(),
      _id: doc.id
    }));

    // Filter out expired jobs unless includeExpired=true is passed
    if (req.query.includeExpired !== 'true') {
      const now = new Date().toISOString();
      jobs = jobs.filter(job => !job.expiresAt || job.expiresAt > now);
    }
    
    // Sort in memory just in case
    jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    let nextLastKey = null;
    if (resultSnapshot.docs.length === limit) {
      const lastDoc = resultSnapshot.docs[resultSnapshot.docs.length - 1];
      nextLastKey = encodeURIComponent(JSON.stringify({ id: lastDoc.id }));
    }

    const responseData = { 
      success: true, 
      count: jobs.length, 
      data: jobs,
      lastEvaluatedKey: nextLastKey
    };

    // Cache the first page
    if (!lastKey && limit === 20) {
      jobsCache.set('defaultPage', responseData);
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
    const docRef = await db.collection('consulting_jobs').doc(req.params.id).get();

    if (!docRef.exists) {
      return res.status(404).json({ success: false, message: 'Job listing not found' });
    }

    const job = {
      ...docRef.data(),
      _id: docRef.id
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
  const { title, company, location, description, requirements, salary, link, recruiterId, expiresAt, placementFee } = req.body;

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
      recruiterId: recruiterId || null,
      createdBy: req.user.id || req.user._id,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Default 30 days
      placementFee: Number(placementFee) || 0,
    };

    await db.collection('consulting_jobs').doc(newJobId).set(newJob);

    // Invalidate cache
    jobsCache.del('defaultPage');

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
    const docRef = await db.collection('consulting_jobs').doc(req.params.id).get();

    if (!docRef.exists) {
      return res.status(404).json({ success: false, message: 'Job listing not found' });
    }

    const job = docRef.data();

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

    await db.collection('consulting_jobs').doc(job.id).set(updatedJob);

    // Invalidate cache
    jobsCache.del('defaultPage');

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
    const docRef = await db.collection('consulting_jobs').doc(req.params.id).get();

    if (!docRef.exists) {
      return res.status(404).json({ success: false, message: 'Job listing not found' });
    }

    const job = docRef.data();

    // Verify ownership
    if (job.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this listing' });
    }

    await db.collection('consulting_jobs').doc(req.params.id).delete();

    // Invalidate cache
    jobsCache.del('defaultPage');

    res.status(200).json({ success: true, message: 'Job listing deleted successfully' });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
