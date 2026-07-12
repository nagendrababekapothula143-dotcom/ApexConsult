const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const multer = require('multer');
const pdf = require('pdf-parse');
const { docClient } = require('../config/dynamodb');
const { ScanCommand, GetCommand, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
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
    try {
      if (req.file.mimetype === 'application/pdf') {
        const parsed = await pdf(req.file.buffer);
        rawText = parsed.text;
      } else {
        rawText = req.file.buffer.toString('utf-8');
      }
    } catch (parseErr) {
      console.warn('PDF parsing failed, falling back to text read:', parseErr.message);
      rawText = req.file.buffer.toString('utf-8');
    }

    // Clean up raw text (remove binary characters or zero bytes)
    rawText = rawText.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '');

    // 3. Extract details from rawText or fallback to user credentials
    const studentName = req.user.name || 'Charan Ambiripeta';
    const studentEmail = req.user.email || 'student@apex.com';

    // Simple parser for sections
    let aboutMe = `Analytical consulting candidate specifically optimized to align with ${job.company}'s requirements for the ${job.title} role. Proficient in strategic problem-solving and structured case reviews.`;
    let education = `Borcelle University | Bachelor of Science in Economics & Business\nGPA: 3.8/4.0`;
    let experience = `Salford & Co. | Management Intern\n- Restructured analytical case models and spreadsheets to optimize client deliverables.\n- Presented slides using professional designs to program mentors, achieving top ranking in cohort.`;
    
    // If the uploaded resume has some real text, try to extract experiences or match some lines!
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    if (lines.length > 3) {
      // Simple heuristic: search for keywords
      let eduIndex = -1;
      let expIndex = -1;
      let skillsIndex = -1;

      for (let i = 0; i < lines.length; i++) {
        const l = lines[i].toLowerCase();
        if (l.includes('education')) eduIndex = i;
        else if (l.includes('experience') || l.includes('work')) expIndex = i;
        else if (l.includes('skills')) skillsIndex = i;
      }

      // Extract parts if indices are found
      if (expIndex !== -1) {
        const endIdx = skillsIndex !== -1 ? skillsIndex : (eduIndex > expIndex ? eduIndex : lines.length);
        const expLines = lines.slice(expIndex + 1, endIdx);
        if (expLines.length > 0) {
          experience = expLines.join('\n');
        }
      }

      if (eduIndex !== -1) {
        const endIdx = expIndex !== -1 && expIndex > eduIndex ? expIndex : (skillsIndex > eduIndex ? skillsIndex : lines.length);
        const eduLines = lines.slice(eduIndex + 1, endIdx);
        if (eduLines.length > 0) {
          education = eduLines.join('\n');
        }
      }
    }

    // 4. Tailor / inject JD lines into the experience text
    // We parse the experience lines and modify/insert JD keywords and custom bullets matching the requirements!
    let expBulletPoints = experience.split('\n');
    
    // Clean experience bullet points and append JD lines
    const jdKeywords = job.requirements || ['Case Analysis', 'Quantitative Modeling', 'Slides Preparation'];
    
    // Construct tailored experience bullets
    const tailoredBullets = [];
    if (expBulletPoints.length > 1) {
      tailoredBullets.push(expBulletPoints[0]); // Keep company / header line
      // Add a tailored bullet matching the JD requirements
      tailoredBullets.push(`- Collaborated on key cases, applying ${jdKeywords.slice(0, 2).join(' and ')} techniques to drive client deliverables.`);
      // Keep other original bullets but inject keywords
      for (let i = 1; i < expBulletPoints.length; i++) {
        let bullet = expBulletPoints[i];
        if (bullet.trim().startsWith('-') || bullet.trim().startsWith('•')) {
          // Inject a keyword if not present
          if (i === 1 && jdKeywords[2]) {
            bullet = bullet.replace(/spreadsheets|models|deliverables/i, `spreadsheets using ${jdKeywords[2]} concepts`);
          }
          tailoredBullets.push(bullet);
        } else if (bullet.trim().length > 0 && !bullet.includes('|')) {
          tailoredBullets.push(`- ${bullet}`);
        }
      }
    } else {
      // Fallback experience if they uploaded an empty file
      tailoredBullets.push(`Salford & Co. | Consulting Analyst Intern`);
      tailoredBullets.push(`- Leveraged ${jdKeywords.slice(0, 2).join(' and ')} to restructure client business cases and spreadsheets.`);
      tailoredBullets.push(`- Developed strategic case materials and slides, aligning with program directives for ${job.company}.`);
    }

    const finalExperience = tailoredBullets.join('\n');

    // Make skills list
    const finalSkills = jdKeywords.slice(0, 6);

    // Create the final tailored plain text resume (for download)
    const tailoredText = `
${studentName.toUpperCase()}
${job.title.toUpperCase()}
--------------------------------------------------------------------------------
📞 +123-456-7890 | ✉️ ${studentEmail} | 📍 Dallas, TX
--------------------------------------------------------------------------------

ABOUT ME
${aboutMe}

EDUCATION
${education}

WORK EXPERIENCE
${finalExperience}

SKILLS
${finalSkills.map(s => `• ${s}`).join('\n')}
`.trim();

    // Send response back
    res.status(200).json({
      success: true,
      data: {
        studentName,
        studentEmail,
        jobTitle: job.title,
        jobCompany: job.company,
        aboutMe,
        education,
        experience: finalExperience,
        skills: finalSkills,
        tailoredText // The complete plain text for download
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

module.exports = router;
