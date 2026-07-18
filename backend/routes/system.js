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
    // 1. CPU Metrics
    const cpus = os.cpus();
    const loadavg = os.loadavg(); // Returns [1m, 5m, 15m] load
    const coreCount = cpus.length;
    // CPU load percentage (approximate based on 1m load / cores)
    const cpuUsagePercent = Math.min(100, Math.round((loadavg[0] / coreCount) * 100));

    // 2. Memory Metrics
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = Math.round((usedMem / totalMem) * 100);

    // 3. Database Metrics (DynamoDB)
    let dbStatus = 'Unknown';
    let dbMetrics = {};
    
    try {
      const command = new DescribeTableCommand({ TableName: 'consulting_users' });
      const response = await client.send(command);
      
      const table = response.Table;
      dbStatus = table.TableStatus === 'ACTIVE' ? 'Healthy' : table.TableStatus;
      
      dbMetrics = {
        itemCount: table.ItemCount,
        sizeBytes: table.TableSizeBytes,
        billingMode: table.BillingModeSummary?.BillingMode || 'PROVISIONED',
        readCapacity: table.ProvisionedThroughput?.ReadCapacityUnits || 0,
        writeCapacity: table.ProvisionedThroughput?.WriteCapacityUnits || 0,
      };
    } catch (dbErr) {
      console.error('DynamoDB DescribeTable error:', dbErr);
      dbStatus = 'Error';
    }

    res.status(200).json({
      success: true,
      data: {
        cpu: {
          usagePercent: cpuUsagePercent,
          cores: coreCount,
          model: cpus[0].model,
          loadAverage: loadavg
        },
        memory: {
          usagePercent: memUsagePercent,
          totalGB: (totalMem / (1024 ** 3)).toFixed(2),
          usedGB: (usedMem / (1024 ** 3)).toFixed(2)
        },
        database: {
          status: dbStatus,
          ...dbMetrics
        },
        uptimeSeconds: Math.round(process.uptime()),
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
    
    res.status(200).json({
      success: true,
      maintenanceMode
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
    const { maintenanceMode } = req.body;
    
    const command = new PutCommand({
      TableName: 'consulting_settings',
      Item: {
        settingKey: 'maintenanceMode',
        value: Boolean(maintenanceMode),
        updatedAt: new Date().toISOString()
      }
    });
    
    await docClient.send(command);
    
    res.status(200).json({
      success: true,
      maintenanceMode: Boolean(maintenanceMode)
    });
  } catch (err) {
    console.error('DynamoDB PutSettings error:', err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});
