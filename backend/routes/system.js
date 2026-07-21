const express = require('express');
const router = express.Router();
const os = require('os');
const { protect, authorize } = require('../middleware/auth');
const { DynamoDBClient, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
const { GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
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

    // 2. S3 Free Tier Metrics (Calculated from local uploads folder for now)
    const getDirSize = (dirPath) => {
      let size = 0;
      try {
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);
          for (let i = 0; i < files.length; i++) {
            const filePath = path.join(dirPath, files[i]);
            const stats = fs.statSync(filePath);
            if (stats.isFile()) size += stats.size;
            else if (stats.isDirectory()) size += getDirSize(filePath);
          }
        }
      } catch (e) {
        console.error('Error calculating directory size:', e);
      }
      return size;
    };
    
    const uploadsPath = path.join(__dirname, '../uploads');
    const s3UsedBytes = getDirSize(uploadsPath);
    const s3TotalBytes = 5 * 1024 * 1024 * 1024; // 5 GB Free Tier

    const s3Metrics = {
      usedBytes: s3UsedBytes,
      totalBytes: s3TotalBytes,
      usagePercent: Math.min(100, (s3UsedBytes / s3TotalBytes) * 100)
    };

    // 3. Database Metrics (DynamoDB Free Tier)
    let dbStatus = 'Unknown';
    let dbMetrics = {};
    const dynamodbTotalBytes = 25 * 1024 * 1024 * 1024; // 25 GB Free Tier
    
    try {
      const command = new DescribeTableCommand({ TableName: 'consulting_users' });
      const response = await client.send(command);
      
      const table = response.Table;
      dbStatus = table.TableStatus === 'ACTIVE' ? 'Healthy' : table.TableStatus;
      
      dbMetrics = {
        itemCount: table.ItemCount || 0,
        sizeBytes: table.TableSizeBytes || 0,
        billingMode: table.BillingModeSummary?.BillingMode || 'PROVISIONED',
        readCapacity: table.ProvisionedThroughput?.ReadCapacityUnits || 0,
        writeCapacity: table.ProvisionedThroughput?.WriteCapacityUnits || 0,
        totalBytes: dynamodbTotalBytes,
        usagePercent: Math.min(100, ((table.TableSizeBytes || 0) / dynamodbTotalBytes) * 100)
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
