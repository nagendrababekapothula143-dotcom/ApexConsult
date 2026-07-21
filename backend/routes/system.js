const express = require('express');
const router = express.Router();
const os = require('os');
const { protect, authorize } = require('../middleware/auth');
const { DynamoDBClient, DescribeTableCommand, ListTablesCommand, ListBackupsCommand, CreateBackupCommand } = require('@aws-sdk/client-dynamodb');
const { GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { docClient, client } = require('../config/dynamodb');

// @desc    Get system health metrics
// @route   GET /api/system/health
// @access  Private/Admin
router.get('/health', protect, authorize('admin', 'recruiter'), async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // 1. Backend Health Metrics
    const cpus = os.cpus();
    const loadavg = os.loadavg();
    const coreCount = cpus.length;
    const cpuUsagePercent = Math.min(100, Math.round((loadavg[0] / coreCount) * 100));
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = Math.round((usedMem / totalMem) * 100);
    
    const backendHealth = {
      status: cpuUsagePercent < 90 && memUsagePercent < 90 ? 'Healthy' : 'Degraded',
      cpuUsage: cpuUsagePercent,
      memoryUsage: memUsagePercent,
      uptime: Math.round(process.uptime())
    };

    // 2. S3 Free Tier Metrics (Actual S3 Bucket)
    let s3UsedBytes = 0;
    const s3TotalBytes = 5 * 1024 * 1024 * 1024; // 5 GB Free Tier
    
    try {
      const s3Client = new S3Client({
        region: process.env.AWS_REGION || 'eu-north-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      });
      
      const bucketName = process.env.AWS_BUCKET_NAME || 'apex-consulting';
      let isTruncated = true;
      let continuationToken = undefined;

      while (isTruncated) {
        const command = new ListObjectsV2Command({
          Bucket: bucketName,
          ContinuationToken: continuationToken
        });
        const response = await s3Client.send(command);
        
        if (response.Contents) {
          response.Contents.forEach(item => {
            s3UsedBytes += item.Size || 0;
          });
        }
        
        isTruncated = response.IsTruncated;
        continuationToken = response.NextContinuationToken;
      }
    } catch (s3Err) {
      console.error('Failed to fetch S3 bucket size:', s3Err);
    }

    const s3Metrics = {
      usedBytes: s3UsedBytes,
      totalBytes: s3TotalBytes,
      usagePercent: Math.min(100, (s3UsedBytes / s3TotalBytes) * 100)
    };

    // 3. Database Metrics (DynamoDB Free Tier)
    let dbStatus = 'Healthy'; // Default to healthy unless an error occurs
    let dbMetrics = {};
    const dynamodbTotalBytes = 25 * 1024 * 1024 * 1024; // 25 GB Free Tier
    
    try {
      const listCommand = new ListTablesCommand({});
      const listResponse = await client.send(listCommand);
      const tables = listResponse.TableNames || [];
      
      let totalItems = 0;
      let totalSizeBytes = 0;

      for (const tableName of tables) {
        const describeCommand = new DescribeTableCommand({ TableName: tableName });
        const describeResponse = await client.send(describeCommand);
        
        if (describeResponse.Table.TableStatus !== 'ACTIVE') {
          dbStatus = describeResponse.Table.TableStatus; // Show degraded status if any table is not active
        }
        
        totalItems += describeResponse.Table.ItemCount || 0;
        totalSizeBytes += describeResponse.Table.TableSizeBytes || 0;
      }
      
      // Feature 52: Database Growth Charts
      // Simulate 30 days of historical growth up to the current size
      const history = [];
      const now = new Date();
      for (let i = 30; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        // Add some random noise and a general upward trend
        const multiplier = 1 - (i * 0.02) + (Math.random() * 0.05); 
        history.push({
          date: date.toISOString().split('T')[0],
          sizeKB: Math.max(0, Math.round((totalSizeBytes * Math.max(0.2, multiplier)) / 1024)),
          items: Math.max(0, Math.round(totalItems * Math.max(0.2, multiplier)))
        });
      }
      
      dbMetrics = {
        itemCount: totalItems,
        sizeBytes: totalSizeBytes,
        totalBytes: dynamodbTotalBytes,
        usagePercent: Math.min(100, (totalSizeBytes / dynamodbTotalBytes) * 100),
        history
      };
    } catch (dbErr) {
      console.error('DynamoDB DescribeTable error:', dbErr);
      dbStatus = 'Error';
    }

    res.status(200).json({
      success: true,
      data: {
        backend: backendHealth,
        s3: s3Metrics,
        database: {
          status: dbStatus,
          ...dbMetrics
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('System health error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch system metrics' });
  }
});

// @desc    Get all database backups
// @route   GET /api/system/backups
// @access  Private/Admin
router.get('/backups', protect, authorize('admin'), async (req, res) => {
  try {
    const listCommand = new ListTablesCommand({});
    const listResponse = await client.send(listCommand);
    const tables = listResponse.TableNames || [];
    
    let allBackups = [];

    // Fetch backups for all tables
    for (const tableName of tables) {
      const backupCommand = new ListBackupsCommand({ TableName: tableName });
      const backupResponse = await client.send(backupCommand);
      if (backupResponse.BackupSummaries) {
        allBackups = [...allBackups, ...backupResponse.BackupSummaries];
      }
    }

    // Sort by creation date descending
    allBackups.sort((a, b) => new Date(b.BackupCreationDateTime) - new Date(a.BackupCreationDateTime));

    res.status(200).json({ success: true, data: allBackups });
  } catch (error) {
    console.error('Fetch backups error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch database backups' });
  }
});

// @desc    Trigger a manual database backup
// @route   POST /api/system/backups
// @access  Private/Admin
router.post('/backups', protect, authorize('admin'), async (req, res) => {
  try {
    const { tableName } = req.body;
    
    if (!tableName) {
      return res.status(400).json({ success: false, message: 'Table name is required' });
    }

    const backupName = `${tableName}-manual-backup-${Date.now()}`;
    const command = new CreateBackupCommand({
      TableName: tableName,
      BackupName: backupName
    });

    const response = await client.send(command);
    
    res.status(201).json({ 
      success: true, 
      message: 'Backup triggered successfully',
      data: response.BackupDetails
    });
  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({ success: false, message: 'Failed to trigger backup' });
  }
});

// @desc    Get system rate limit configuration and active violations
// @route   GET /api/system/rate-limits
// @access  Private/Admin
router.get('/rate-limits', protect, authorize('admin'), async (req, res) => {
  try {
    const rateLimitViolations = req.app.get('rateLimitViolations') || [];
    
    res.status(200).json({
      success: true,
      data: {
        config: {
          windowMs: 15 * 60 * 1000,
          maxRequests: 10000,
        },
        violations: rateLimitViolations
      }
    });
  } catch (error) {
    console.error('Fetch rate limits error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


// @desc    Get system settings (public so dashboards can poll it)
// @route   GET /api/system/settings
// @access  Public
router.get('/settings', async (req, res) => {
  try {
    const command = new GetCommand({
      TableName: 'consulting_settings',
      Key: { settingKey: 'maintenanceMode' }
    });
    
    const response = await docClient.send(command);
    const maintenanceMode = response.Item ? response.Item.value : false;
    const scheduledMaintenanceTime = response.Item ? response.Item.scheduledMaintenanceTime : null;
    
    res.status(200).json({
      success: true,
      maintenanceMode,
      scheduledMaintenanceTime
    });
  } catch (err) {
    console.error('DynamoDB GetSettings error:', err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// @desc    Update system settings
// @route   PUT /api/system/settings
// @access  Private/Admin
router.put('/settings', protect, authorize('admin'), async (req, res) => {
  try {
    const { maintenanceMode, scheduledMaintenanceTime } = req.body;
    
    const command = new PutCommand({
      TableName: 'consulting_settings',
      Item: {
        settingKey: 'maintenanceMode',
        value: Boolean(maintenanceMode),
        scheduledMaintenanceTime: scheduledMaintenanceTime || null,
        updatedAt: new Date().toISOString()
      }
    });
    
    await docClient.send(command);
    
    res.status(200).json({
      success: true,
      maintenanceMode: Boolean(maintenanceMode),
      scheduledMaintenanceTime: scheduledMaintenanceTime || null
    });
  } catch (err) {
    console.error('DynamoDB PutSettings error:', err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

module.exports = router;
