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
const { logAuditAction } = require('../utils/auditLogger');
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

    // 3. Call Groq API to tailor the resume perfectly

    const prompt = `
You are an expert resume writer and technical recruiter. I will provide you with the raw text of a candidate's resume and a target job description.

Your goal is to perform a DEEP TAILORING of the candidate's resume so it perfectly aligns with the target job description, similar to how a professional resume writing service would adapt a "Software Engineer" resume into a "Gen AI/ML Engineer" resume by highlighting overlapping skills.

CRITICAL RULES:
1. DO NOT invent fake companies, employment dates, or degrees. You must use the candidate's actual work history.
2. You must EXTRACT the candidate's actual Name, Email, Phone Number, and Location from the raw text and preserve them EXACTLY.
3. DEEP TAILORING: You must intelligently REWRITE and TAILOR their existing bullet points. If the candidate's background differs from the target job, you must re-frame their past work to highlight the specific skills, tools, and methodologies mentioned in the Job Description (e.g., AWS, Python, scalable microservices, LLMs). 
4. PROFESSIONAL SUMMARY: Generate a dense, highly tailored Professional Summary (5-8 bullet points) that perfectly fuses the candidate's background with the JD's exact requirements.
5. TECHNICAL SKILLS: Extract and categorize their skills comprehensively (e.g., "Programming & Scripting", "Cloud Platforms", "DevOps, CI/CD", "Databases & Data Storage"). Inject keywords from the JD where they logically fit the candidate's profile.
6. EXPERIENCE: For EACH job in their history, rewrite 5-10 bullet points. Use strong action verbs and quantify achievements where possible.

Format your output STRICTLY as a JSON object with the following keys:
{
  "studentName": "Extracted Name",
  "studentEmail": "Extracted Email",
  "studentPhone": "Extracted Phone",
  "studentLocation": "Extracted Location",
  "professionalSummary": ["Tailored summary bullet 1", "Tailored summary bullet 2", "..."],
  "technicalSkills": [
    { "category": "Programming & Scripting", "skills": "Python, Java, SQL" },
    { "category": "Cloud Platforms & Services", "skills": "AWS (Lambda, S3), GCP" }
  ],
  "professionalExperience": [
    {
      "company": "Actual Company Name",
      "dates": "Actual Dates",
      "role": "Tailored Role Title (e.g., AI/ML Engineer instead of just Engineer if applicable)",
      "responsibilities": ["Deeply tailored bullet 1", "Deeply tailored bullet 2", "..."]
    }
  ],
  "certifications": ["Actual Cert 1", "Actual Cert 2"],
  "educationalDetails": ["Actual Degree 1", "Actual Degree 2"],
  "interviewPrep": [
    "\\"Can you walk me through your background?\\"",
    "\\"What do you know about our company and what we do?\\"",
    "\\"Why do you think this role aligns well with your skills and experience?\\""
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

    // Always fetch the key directly from environment
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not configured in your .env file.");
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are an expert resume optimizer. Only output valid JSON matching the schema without any markdown wrapping." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq API Error:', errText);
      throw new Error(`Groq API Error: ${errText}`);
    }

    const resultData = await response.json();
    let aiParsed;
    try {
      const aiResponseText = resultData.choices[0].message.content;
      aiParsed = JSON.parse(aiResponseText);
    } catch (e) {
      console.error('Failed to parse Groq response:', e);
      throw new Error("Failed to parse JSON response from Groq.");
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

    let resumeText = '';
    let atsResult = null;
    let resumeUrl = null;
    let resumeKey = null;

    if (req.body.requestAssistance !== 'true' && req.file) {
      resumeUrl = req.file.location;
      resumeKey = req.file.key;

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

      // Match requirements keywords
      const requirements = job.requirements || [];
      const matchedKeywords = [];
      const missingKeywords = [];

      if (requirements && requirements.length > 0) {
        for (const reqSkill of requirements) {
          if (!reqSkill) continue;
          const cleanSkill = String(reqSkill).toLowerCase().trim();
          if (resumeText.includes(cleanSkill)) {
            matchedKeywords.push(reqSkill);
          } else {
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
      const matchScore = Math.min(100, Math.max(45, Math.round((matchedKeywords.length / totalReqs) * 100)));

      atsResult = {
        score: matchScore,
        matchedKeywords,
        missingKeywords,
        evaluatedAt: new Date().toISOString()
      };
    }

    const newAppId = crypto.randomUUID();
    const newApp = {
      id: newAppId,
      job: jobId,
      student: studentId,
      resumeUrl: resumeUrl,
      resumeKey: resumeKey,
      status: req.body.requestAssistance === 'true' ? 'recruiter_requested' : 'pending',
      externallyApplied: req.body.externallyApplied === 'true',
      atsResult: atsResult,
      recruiterId: null,
      appliedAt: new Date().toISOString()
    };

    // Save to DynamoDB
    await docClient.send(new PutCommand({
      TableName: 'consulting_applications',
      Item: newApp
    }));

    // Notify admins via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to('admins').emit('new_application', {
        id: newAppId,
        studentName: req.user.name || 'A student',
        jobTitle: job.title,
        requestAssistance: req.body.requestAssistance === 'true'
      });
    }

    await logAuditAction(
      req.user.id || req.user._id,
      req.user.name || 'Student',
      req.body.requestAssistance === 'true' ? 'STUDENT_REQUESTED_ASSISTANCE' : 'SUBMIT_APPLICATION',
      newAppId,
      { jobTitle: job.title, jobId: job.id }
    );

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
    res.status(500).json({ success: false, message: error.stack || error.message });
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

// @desc    Get current recruiter's assigned applications
// @route   GET /api/applications/recruiter
// @access  Private (Recruiter only)
router.get('/recruiter', protect, authorize('recruiter'), async (req, res) => {
  try {
    const recruiterId = req.user.id || req.user._id;

    const result = await docClient.send(new ScanCommand({
      TableName: 'consulting_applications',
      FilterExpression: 'recruiterId = :recruiterId',
      ExpressionAttributeValues: { ':recruiterId': recruiterId }
    }));

    const rawApps = result.Items || [];
    const jobCache = {};
    const studentCache = {};

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
          job: job ? { ...job, _id: job.id } : null,
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
    console.error('Fetch recruiter applications error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Assign a recruiter to an application
// @route   PATCH /api/applications/:id/assign-recruiter
// @access  Private (Admin only)
router.patch('/:id/assign-recruiter', protect, authorize('admin'), async (req, res) => {
  try {
    const { recruiterId } = req.body;
    
    const getRes = await docClient.send(new GetCommand({
      TableName: 'consulting_applications',
      Key: { id: req.params.id }
    }));

    if (!getRes.Item) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const application = getRes.Item;
    application.recruiterId = recruiterId || null;

    await docClient.send(new PutCommand({
      TableName: 'consulting_applications',
      Item: application
    }));

    // Log the assignment action
    await logAuditAction(
      req.user.id || req.user._id,
      req.user.name || req.user.email,
      recruiterId ? 'ASSIGN_RECRUITER' : 'UNASSIGN_RECRUITER',
      application.id,
      { recruiterId }
    );

    // Socket.io Real-time Updates
    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');
    if (io) {
      // 1. Notify Admins
      io.to('admins').emit('application_updated', application);
      
      // 2. Notify the newly assigned Recruiter
      if (recruiterId && connectedUsers && connectedUsers.has(recruiterId)) {
        io.to(connectedUsers.get(recruiterId)).emit('application_updated', application);
      }
      
      // 3. Notify the Student
      if (application.student && connectedUsers && connectedUsers.has(application.student)) {
        io.to(connectedUsers.get(application.student)).emit('application_updated', application);
      }
    }

    res.status(200).json({ success: true, message: 'Recruiter assigned successfully', data: application });
  } catch (error) {
    console.error('Assign recruiter error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Upload resume for an application (Recruiter finalizing)
// @route   POST /api/applications/:id/upload-resume
// @access  Private (Recruiter only)
router.post('/:id/upload-resume', protect, authorize('recruiter'), handleUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a resume file' });
    }

    const appId = req.params.id;

    const getRes = await docClient.send(new GetCommand({
      TableName: 'consulting_applications',
      Key: { id: appId }
    }));

    if (!getRes.Item) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const application = getRes.Item;

    // Verify this recruiter is actually assigned
    if (application.recruiterId !== (req.user.id || req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this application' });
    }

    application.resumeUrl = req.file.location;
    application.resumeKey = req.file.key;
    application.status = 'application sent'; // Move out of recruiter_requested state

    await docClient.send(new PutCommand({
      TableName: 'consulting_applications',
      Item: application
    }));

    // Log the upload action
    await logAuditAction(
      req.user.id || req.user._id,
      req.user.name || req.user.email,
      'RECRUITER_SUBMITTED_APPLICATION',
      application.id,
      { status: 'application sent', originalStudent: application.studentName || 'Student' }
    );

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

    // Socket.io Real-time Updates
    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');
    if (io) {
      // 1. Notify Admins
      io.to('admins').emit('application_updated', responseApp);
      
      // 2. Notify the Student
      if (application.student && connectedUsers && connectedUsers.has(application.student)) {
        io.to(connectedUsers.get(application.student)).emit('application_updated', responseApp);
      }
    }

    res.status(200).json({ success: true, message: 'Resume uploaded successfully', data: responseApp });
  } catch (error) {
    console.error('Upload resume error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
