const fs = require('fs').promises;
const path = require('path');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
require('dotenv').config();

// Debug logging for AWS configuration
console.log('AWS Configuration:');
console.log('Region:', process.env.AWS_REGION || 'eu-north-1');
console.log('Access Key ID exists:', !!process.env.AWS_ACCESS_KEY_ID);
console.log('Secret Access Key exists:', !!process.env.AWS_SECRET_ACCESS_KEY);

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const docClient = DynamoDBDocumentClient.from(client);

async function pushToDynamoDB() {
  try {
    console.log('Starting DynamoDB population process...');

    // Read Typeform data
    const typeformDataPath = path.resolve(__dirname, '../../data/typeform_data.json');
    console.log('Reading Typeform data from:', typeformDataPath);
    const typeformData = JSON.parse(await fs.readFile(typeformDataPath, 'utf8'));
    console.log(`Found ${typeformData.length} Typeform records to process`);

    // Read Airtable data
    const airtableDataPath = path.resolve(__dirname, '../../data/airtable_data.json');
    console.log('Reading Airtable data from:', airtableDataPath);
    const airtableData = JSON.parse(await fs.readFile(airtableDataPath, 'utf8'));
    console.log(`Found ${airtableData.length} Airtable records to process`);

    let typeformSuccessCount = 0;
    let typeformErrorCount = 0;
    let airtableSuccessCount = 0;
    let airtableErrorCount = 0;

    // Push Typeform data
    console.log('\nPushing Typeform data to DynamoDB...');
    for (const record of typeformData) {
      try {
        const command = new PutCommand({
          TableName: 'typeform_data',
          Item: {
            registration_number: record.registration_number,
            data: record.data
          }
        });

        await docClient.send(command);
        console.log(`Successfully inserted Typeform record for ${record.registration_number}`);
        typeformSuccessCount++;
      } catch (error) {
        console.error(`Error inserting Typeform record for ${record.registration_number}:`, {
          name: error.name,
          message: error.message
        });
        typeformErrorCount++;
      }
    }

    // Push Airtable data
    console.log('\nPushing Airtable data to DynamoDB...');
    for (const record of airtableData) {
      try {
        const command = new PutCommand({
          TableName: 'airtable_data',
          Item: {
            registration_number: record.registration_number,
            data: record.data
          }
        });

        await docClient.send(command);
        console.log(`Successfully inserted Airtable record for ${record.registration_number}`);
        airtableSuccessCount++;
      } catch (error) {
        console.error(`Error inserting Airtable record for ${record.registration_number}:`, {
          name: error.name,
          message: error.message
        });
        airtableErrorCount++;
      }
    }

    // Log summary
    console.log('\nPopulation process completed:');
    console.log('\nTypeform Data:');
    console.log(`Successfully inserted: ${typeformSuccessCount} records`);
    console.log(`Failed to insert: ${typeformErrorCount} records`);
    
    console.log('\nAirtable Data:');
    console.log(`Successfully inserted: ${airtableSuccessCount} records`);
    console.log(`Failed to insert: ${airtableErrorCount} records`);

  } catch (error) {
    console.error('Error in pushToDynamoDB:', error);
    process.exit(1);
  }
}

// Run the population
pushToDynamoDB(); 