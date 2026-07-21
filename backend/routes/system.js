const express = require('express');
const router = express.Router();
const os = require('os');
const { protect, authorize } = require('../middleware/auth');
const { DynamoDBClient, DescribeTableCommand, ListTablesCommand } = require('@aws-sdk/client-dynamodb');
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
      
      dbMetrics = {
        itemCount: totalItems,
        sizeBytes: totalSizeBytes,
        totalBytes: dynamodbTotalBytes,
        usagePercent: Math.min(100, (totalSizeBytes / dynamodbTotalBytes) * 100)
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

module.exports = router;

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
