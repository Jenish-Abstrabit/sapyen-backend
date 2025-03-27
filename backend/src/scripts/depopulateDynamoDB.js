const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
require('dotenv').config();

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const docClient = DynamoDBDocumentClient.from(client);

async function deleteAllItems(tableName) {
  let deletedCount = 0;
  let lastEvaluatedKey = undefined;

  do {
    // Scan the table
    const scanCommand = new ScanCommand({
      TableName: tableName,
      ExclusiveStartKey: lastEvaluatedKey
    });

    const scanResult = await docClient.send(scanCommand);
    const items = scanResult.Items;
    lastEvaluatedKey = scanResult.LastEvaluatedKey;

    // Delete each item
    for (const item of items) {
      const deleteCommand = new DeleteCommand({
        TableName: tableName,
        Key: {
          registration_number: item.registration_number
        }
      });

      await docClient.send(deleteCommand);
      deletedCount++;
      console.log(`Deleted item with registration number: ${item.registration_number}`);
    }

    console.log(`Processed ${deletedCount} items from ${tableName} so far...`);
  } while (lastEvaluatedKey);

  return deletedCount;
}

async function depopulateDynamoDB() {
  try {
    console.log('Starting DynamoDB depopulation process...');

    // Delete all items from typeform_data table
    console.log('\nDeleting all items from typeform_data table...');
    const typeformDeletedCount = await deleteAllItems('typeform_data');
    console.log(`Successfully deleted ${typeformDeletedCount} items from typeform_data table`);

    // Delete all items from airtable_data table
    console.log('\nDeleting all items from airtable_data table...');
    const airtableDeletedCount = await deleteAllItems('airtable_data');
    console.log(`Successfully deleted ${airtableDeletedCount} items from airtable_data table`);

    // Log summary
    console.log('\nDepopulation process completed:');
    console.log(`Total items deleted from typeform_data: ${typeformDeletedCount}`);
    console.log(`Total items deleted from airtable_data: ${airtableDeletedCount}`);

  } catch (error) {
    console.error('Error in depopulateDynamoDB:', error);
    process.exit(1);
  }
}

// Run the depopulation
depopulateDynamoDB(); 