const { DynamoDBClient, CreateTableCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

const config = {
  region: process.env.AWS_REGION || 'eu-north-1',
};

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  config.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

const client = new DynamoDBClient(config);
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: true,
  }
});

const waitForTableActive = async (tableName) => {
  console.log(`DynamoDB: Waiting for table "${tableName}" to become ACTIVE...`);
  while (true) {
    try {
      const res = await client.send(new DescribeTableCommand({ TableName: tableName }));
      const status = res.Table.TableStatus;
      if (status === 'ACTIVE') {
        console.log(`DynamoDB: Table "${tableName}" is now ACTIVE!`);
        break;
      }
      // Wait 1.5 seconds before polling again
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (err) {
      console.error(`DynamoDB: Error checking status for "${tableName}":`, err.message);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
};

const initDynamoDB = async () => {
  const tables = [
    {
      TableName: 'consulting_users',
      KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
      AttributeDefinitions: [
        { AttributeName: 'id', AttributeType: 'S' },
        { AttributeName: 'email', AttributeType: 'S' }
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'email-index',
          KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
        }
      ],
      ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
    },
    {
      TableName: 'consulting_settings',
      KeySchema: [{ AttributeName: 'settingKey', KeyType: 'HASH' }],
      AttributeDefinitions: [
        { AttributeName: 'settingKey', AttributeType: 'S' }
      ],
      ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
    },
    {
      TableName: 'consulting_jobs',
      KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
      AttributeDefinitions: [
        { AttributeName: 'id', AttributeType: 'S' }
      ],
      ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
    },
    {
      TableName: 'consulting_applications',
      KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
      AttributeDefinitions: [
        { AttributeName: 'id', AttributeType: 'S' },
        { AttributeName: 'student', AttributeType: 'S' },
        { AttributeName: 'job', AttributeType: 'S' }
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'student-index',
          KeySchema: [{ AttributeName: 'student', KeyType: 'HASH' }],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
        },
        {
          IndexName: 'job-index',
          KeySchema: [{ AttributeName: 'job', KeyType: 'HASH' }],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
        }
      ],
      ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
    },
    {
      TableName: 'consulting_tickets',
      KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
      AttributeDefinitions: [
        { AttributeName: 'id', AttributeType: 'S' }
      ],
      ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
    },
    {
      TableName: 'consulting_messages',
      KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
      AttributeDefinitions: [
        { AttributeName: 'id', AttributeType: 'S' },
        { AttributeName: 'studentId', AttributeType: 'S' }
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'student-index',
          KeySchema: [{ AttributeName: 'studentId', KeyType: 'HASH' }],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
        }
      ],
      ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
    },
    {
      TableName: 'consulting_feedback',
      KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
      AttributeDefinitions: [
        { AttributeName: 'id', AttributeType: 'S' }
      ],
      ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
    },
    {
      TableName: 'consulting_audit_logs',
      KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
      AttributeDefinitions: [
        { AttributeName: 'id', AttributeType: 'S' },
        { AttributeName: 'targetId', AttributeType: 'S' }
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'target-index',
          KeySchema: [{ AttributeName: 'targetId', KeyType: 'HASH' }],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
        }
      ],
      ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
    },
    {
      TableName: 'consulting_payments',
      KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
      AttributeDefinitions: [
        { AttributeName: 'id', AttributeType: 'S' },
        { AttributeName: 'studentId', AttributeType: 'S' }
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'student-index',
          KeySchema: [{ AttributeName: 'studentId', KeyType: 'HASH' }],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
        }
      ],
      ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
    }
  ];

  for (const table of tables) {
    try {
      await client.send(new DescribeTableCommand({ TableName: table.TableName }));
      console.log(`DynamoDB: Table "${table.TableName}" already exists.`);
    } catch (err) {
      if (err.name === 'ResourceNotFoundException') {
        console.log(`DynamoDB: Table "${table.TableName}" not found. Creating...`);
        await client.send(new CreateTableCommand(table));
        await waitForTableActive(table.TableName);
        console.log(`DynamoDB: Table "${table.TableName}" is created and ready.`);
      } else {
        console.error(`DynamoDB: Error checking table "${table.TableName}":`, err);
        throw err;
      }
    }
  }
};

module.exports = {
  client,
  docClient,
  initDynamoDB
};
