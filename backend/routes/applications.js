const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const multer = require('multer');
const pdf = require('pdf-parse');
const { docClient } = require('../config/dynamodb');
const { ScanCommand, GetCommand, PutCommand, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { protect, authorize } = require('../middleware/auth');
const handleUpload = require('../middleware/upload');
const { getPresignedUrl } = require('../config/s3');
const router = express.Router();

const uploadTemp = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
}).single('resume');

// @desc    Get all applications (Admin only)
// @route   GET /api/applications
// @access  Private (Admin only)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const appsResult = await docClient.send(new ScanCommand({
      TableName: 'consulting_applications'
    }));

    const rawApps = appsResult.Items || [];
    const studentCache = {};
    const jobCache = {};

    const populatedApps = await Promise.all(
      rawApps.map(async (app) => {
        // Fetch Student details with caching
        let student = null;
        if (studentCache[app.student]) {
          student = studentCache[app.student];
        } else {
          const studentRes = await docClient.send(new GetCommand({
            TableName: 'consulting_users',
            Key: { id: app.student }
          }));
          student = studentRes.Item || null;
          studentCache[app.student] = student;
        }

        // Fetch Job details with caching
        let job = null;
        if (jobCache[app.job]) {
          job = jobCache[app.job];
        } else {
          const jobRes = await docClient.send(new GetCommand({
            TableName: 'consulting_jobs',
            Key: { id: app.job }
          }));
          job = jobRes.Item || null;
          jobCache[app.job] = job;
        }

        const appObj = {
          ...app,
          _id: app.id,
          student: student ? { ...student, _id: student.id } : null,
          job: job ? { ...job, _id: job.id } : null
        };

        if (appObj.resumeKey) {
          const signed = await getPresignedUrl(appObj.resumeKey);
          if (signed) {
            appObj.resumeUrl = signed;
          }
        }
        return appObj;
      })
    );

    populatedApps.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

    res.status(200).json({ success: true, count: populatedApps.length, data: populatedApps });
  } catch (error) {
    console.error('Fetch all applications error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Tailor a resume based on JD
// @route   POST /api/applications/tailor
// @access  Private (Student only)
router.post('/tailor', protect, authorize('student'), uploadTemp, async (req, res) => {
  const { jobId } = req.body;

  if (!jobId) {
    return res.status(400).json({ success: false, message: 'Please provide a jobId' });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please upload a resume file to tailor' });
  }

  try {
    // 1. Fetch Job
    const jobRes = await docClient.send(new GetCommand({
      TableName: 'consulting_jobs',
      Key: { id: jobId }
    }));

    if (!jobRes.Item) {
      return res.status(404).json({ success: false, message: 'Job listing not found' });
    }

    const job = jobRes.Item;

    // 2. Extract Text
    let rawText = '';
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ success: false, message: 'Invalid file format. Only PDF resumes are supported for AI Tailoring.' });
    }
    
    try {
      const parsed = await pdf(req.file.buffer);
      rawText = parsed.text;
    } catch (parseErr) {
      console.warn('PDF parsing failed:', parseErr.message);
      return res.status(400).json({ success: false, message: 'Could not read the PDF text. Please ensure it is a valid text-based PDF.' });
    }

    // Clean up raw text (remove binary characters or zero bytes)
    rawText = rawText.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '');

    // 3. Extract details from rawText or fallback to user credentials
    const studentName = req.user.name || 'Charan Ambiripeta';
    const studentEmail = req.user.email || 'student@apex.com';

    // 3. Call Gemini API to tailor the resume perfectly
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured in the backend environment.');
    }

    const prompt = `
You are an expert resume writer. I will provide you with the raw text of a candidate's resume and a job description.

CRITICAL RULES:
1. DO NOT invent fake experiences, companies, or degrees.
2. You must EXTRACT the candidate's actual Name, Email, Phone Number, and Location from the raw text and preserve them EXACTLY. If you cannot find a phone or location, return an empty string.
3. TAILORING: If the candidate's current background (e.g., Security Engineer) differs from the target job description (e.g., Automation Engineer), you must intelligently REWRITE and TAILOR their existing bullet points to highlight skills relevant to the new role. Do not lie, but frame their past work to match the new job perfectly.

Format your output strictly as a JSON object with the following keys:
{
  "studentName": "Extracted Name",
  "studentEmail": "Extracted Email",
  "studentPhone": "Extracted Phone",
  "studentLocation": "Extracted Location (City, State)",
  "professionalSummary": ["Bullet point 1", "Bullet point 2"],
  "technicalSkills": [
    { "category": "Programming & Scripting", "skills": "Python, Java" }
  ],
  "professionalExperience": [
    {
      "company": "Company Name",
      "dates": "Jan 2025 - Present",
      "role": "Role Title",
      "responsibilities": ["Tailored bullet point 1", "Tailored bullet point 2"]
    }
  ],
  "certifications": ["Cert 1", "Cert 2"],
  "educationalDetails": ["Degree 1", "Degree 2"],
  "interviewPrep": [
    "•  \"Can you walk me through your background?\"",
    "•  \"What do you know about our company?\""
  ]
}

--- JOB DESCRIPTION ---
Title: ${job.title}
Company: ${job.company}
Description: ${job.description || ''}
Requirements: ${(job.requirements || []).join(', ')}

--- RAW RESUME TEXT ---
${rawText}
`;

    const apiKey = GEMINI_API_KEY || 'AIzaSyDjxg4Jgsdus3TXzf1l5EDZ8W0ghQ616B8';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "SYSTEM INSTRUCTION: You are an expert resume optimizer. Only output valid JSON matching the schema without any markdown wrapping.\n\n" + prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API Error:', errText);
      throw new Error('Google Generative AI returned an error. Check quota or billing status.');
    }

    const resultData = await response.json();
    let aiParsed;
    try {
      const aiResponseText = resultData.candidates[0].content.parts[0].text;
      aiParsed = JSON.parse(aiResponseText);
    } catch (e) {
      throw new Error("Failed to parse JSON response from Gemini.");
    }

    // Send response back
    res.status(200).json({
      success: true,
      data: {
        studentName: aiParsed.studentName || studentName,
        studentEmail: aiParsed.studentEmail || studentEmail,
        studentPhone: aiParsed.studentPhone || '',
        studentLocation: aiParsed.studentLocation || '',
        jobTitle: job.title,
        jobCompany: job.company,
        jobRequirements: job.requirements || [],
        jobDescription: job.description || '',
        aiData: aiParsed
      }
    });

  } catch (error) {
    console.error('Tailor resume error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Apply for a job (Student only)
// @route   POST /api/applications
// @access  Private (Student only)
router.post('/', protect, authorize('student'), handleUpload, async (req, res) => {
  const { jobId } = req.body;

  if (!jobId) {
    return res.status(400).json({ success: false, message: 'Please provide a jobId' });
  }

  try {
    // Check if the job exists
    const jobRes = await docClient.send(new GetCommand({
      TableName: 'consulting_jobs',
      Key: { id: jobId }
    }));

    if (!jobRes.Item) {
      return res.status(404).json({ success: false, message: 'Job listing not found' });
    }

    const job = jobRes.Item;

    const studentId = req.user.id || req.user._id;

    // Check if user already applied using Query on student-index GSI
    const checkRes = await docClient.send(new QueryCommand({
      TableName: 'consulting_applications',
      IndexName: 'student-index',
      KeyConditionExpression: 'student = :student',
      FilterExpression: '#jobAlias = :job',
      ExpressionAttributeNames: {
        '#jobAlias': 'job'
      },
      ExpressionAttributeValues: {
        ':student': studentId,
        ':job': jobId
      }
    }));

    if (checkRes.Items && checkRes.Items.length > 0) {
      return res.status(400).json({ success: false, message: 'You have already applied for this job' });
    }

    // 3. Extract Text from the resume for ATS analysis
    let resumeText = '';
    try {
      if (req.file.mimetype === 'application/pdf') {
        const fileBuf = req.file.buffer || (req.file.path ? fs.readFileSync(req.file.path) : null);
        if (fileBuf) {
          const parsed = await pdf(fileBuf);
          resumeText = parsed.text;
        }
      } else {
        const fileBuf = req.file.buffer || (req.file.path ? fs.readFileSync(req.file.path) : null);
        if (fileBuf) {
          resumeText = fileBuf.toString('utf-8');
        }
      }
    } catch (parseErr) {
      console.warn('ATS PDF parsing failed, falling back to basic metadata:', parseErr.message);
      resumeText = req.file.originalname;
    }

    // Clean up text
    resumeText = (resumeText || '').toLowerCase().replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '');

    // 4. Match requirements keywords
    const requirements = job.requirements || [];
    const matchedKeywords = [];
    const missingKeywords = [];

    if (requirements.length > 0) {
      for (const reqSkill of requirements) {
        const cleanSkill = reqSkill.toLowerCase().trim();
        if (resumeText.includes(cleanSkill)) {
          matchedKeywords.push(reqSkill);
        } else {
          // Check for sub-word matching
          let matchFound = false;
          const words = cleanSkill.split(' ');
          if (words.length > 1) {
            const importantWords = words.filter(w => w.length > 3);
            if (importantWords.some(w => resumeText.includes(w))) {
              matchFound = true;
            }
          }
          if (matchFound) {
            matchedKeywords.push(reqSkill);
          } else {
            missingKeywords.push(reqSkill);
          }
        }
      }
    }

    const totalReqs = requirements.length || 1;
    const matchScore = Math.min(
      100,
      Math.max(
        45, // Base score
        Math.round((matchedKeywords.length / totalReqs) * 100)
      )
    );

    const atsResult = {
      score: matchScore,
      matchedKeywords,
      missingKeywords,
      evaluatedAt: new Date().toISOString()
    };

    const newAppId = crypto.randomUUID();
    const newApp = {
      id: newAppId,
      job: jobId,
      student: studentId,
      resumeUrl: req.file.location,
      resumeKey: req.file.key,
      status: 'pending',
      externallyApplied: req.body.externallyApplied === 'true',
      atsResult,
      appliedAt: new Date().toISOString()
    };

    // Save to DynamoDB
    await docClient.send(new PutCommand({
      TableName: 'consulting_applications',
      Item: newApp
    }));

    const responseApp = {
      ...newApp,
      _id: newAppId
    };

    if (responseApp.resumeKey) {
      const signed = await getPresignedUrl(responseApp.resumeKey);
      if (signed) {
        responseApp.resumeUrl = signed;
      }
    }

    res.status(201).json({ success: true, data: responseApp });
  } catch (error) {
    console.error('Submit application error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get current student's applications
// @route   GET /api/applications/student
// @access  Private (Student only)
router.get('/student', protect, authorize('student'), async (req, res) => {
  try {
    const studentId = req.user.id || req.user._id;

    const result = await docClient.send(new QueryCommand({
      TableName: 'consulting_applications',
      IndexName: 'student-index',
      KeyConditionExpression: 'student = :student',
      ExpressionAttributeValues: { ':student': studentId }
    }));

    const rawApps = result.Items || [];
    const jobCache = {};

    const populatedApps = await Promise.all(
      rawApps.map(async (app) => {
        let job = null;
        if (jobCache[app.job]) {
          job = jobCache[app.job];
        } else {
          const jobRes = await docClient.send(new GetCommand({
            TableName: 'consulting_jobs',
            Key: { id: app.job }
          }));
          job = jobRes.Item || null;
          jobCache[app.job] = job;
        }

        const appObj = {
          ...app,
          _id: app.id,
          job: job ? { ...job, _id: job.id } : null
        };

        if (appObj.resumeKey) {
          const signed = await getPresignedUrl(appObj.resumeKey);
          if (signed) {
            appObj.resumeUrl = signed;
          }
        }
        return appObj;
      })
    );

    populatedApps.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

    res.status(200).json({ success: true, count: populatedApps.length, data: populatedApps });
  } catch (error) {
    console.error('Fetch student applications error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get all applications for a specific job
// @route   GET /api/applications/job/:jobId
// @access  Private (Admin only)
router.get('/job/:jobId', protect, authorize('admin'), async (req, res) => {
  try {
    // Check if job exists
    const jobRes = await docClient.send(new GetCommand({
      TableName: 'consulting_jobs',
      Key: { id: req.params.jobId }
    }));

    if (!jobRes.Item) {
      return res.status(404).json({ success: false, message: 'Job listing not found' });
    }

    const result = await docClient.send(new QueryCommand({
      TableName: 'consulting_applications',
      IndexName: 'job-index',
      KeyConditionExpression: '#jobAlias = :job',
      ExpressionAttributeNames: { '#jobAlias': 'job' },
      ExpressionAttributeValues: { ':job': req.params.jobId }
    }));

    const rawApps = result.Items || [];
    const studentCache = {};

    const populatedApps = await Promise.all(
      rawApps.map(async (app) => {
        let student = null;
        if (studentCache[app.student]) {
          student = studentCache[app.student];
        } else {
          const studentRes = await docClient.send(new GetCommand({
            TableName: 'consulting_users',
            Key: { id: app.student }
          }));
          student = studentRes.Item || null;
          studentCache[app.student] = student;
        }

        const appObj = {
          ...app,
          _id: app.id,
          student: student ? { ...student, _id: student.id } : null
        };

        if (appObj.resumeKey) {
          const signed = await getPresignedUrl(appObj.resumeKey);
          if (signed) {
            appObj.resumeUrl = signed;
          }
        }
        return appObj;
      })
    );

    populatedApps.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

    res.status(200).json({ success: true, count: populatedApps.length, data: populatedApps });
  } catch (error) {
    console.error('Fetch job applications error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Update application status
// @route   PATCH /api/applications/:id
// @access  Private (Admin only)
router.patch('/:id', protect, authorize('admin'), async (req, res) => {
  const { status } = req.body;

  if (!status || !['pending', 'reviewed', 'accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid status' });
  }

  try {
    const getRes = await docClient.send(new GetCommand({
      TableName: 'consulting_applications',
      Key: { id: req.params.id }
    }));

    if (!getRes.Item) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const application = getRes.Item;
    application.status = status;

    // Save updated application
    await docClient.send(new PutCommand({
      TableName: 'consulting_applications',
      Item: application
    }));

    const responseApp = {
      ...application,
      _id: application.id
    };

    if (responseApp.resumeKey) {
      const signed = await getPresignedUrl(responseApp.resumeKey);
      if (signed) {
        responseApp.resumeUrl = signed;
      }
    }

    res.status(200).json({ success: true, data: responseApp });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Delete application
// @route   DELETE /api/applications/:id
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const appId = req.params.id;

    // Optional: First get the application to find its resumeKey so we can delete from S3
    const getRes = await docClient.send(new GetCommand({
      TableName: 'consulting_applications',
      Key: { id: appId }
    }));

    if (!getRes.Item) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    // Delete from DynamoDB
    await docClient.send(new DeleteCommand({
      TableName: 'consulting_applications',
      Key: { id: appId }
    }));

    // Note: To fully clean up, we should also delete the S3 object if resumeKey exists.
    // For now, removing the DynamoDB record is sufficient to remove it from the ATS system.
    
    res.status(200).json({ success: true, message: 'Application deleted successfully' });
  } catch (error) {
    console.error('Delete application error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
