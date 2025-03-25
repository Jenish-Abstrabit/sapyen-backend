const fs = require('fs').promises;
const path = require('path');
const { connectDB } = require('../config/database');
const TypeformResponse = require('../models/TypeformResponse');

async function populateDynamoDB() {
  try {
    // Connect to DynamoDB
    await connectDB();
    console.log('Connected to DynamoDB');

    // Read the merged data file
    const mergedDataPath = path.resolve(__dirname, '../../data/merged_data.json');
    console.log('Reading merged data from:', mergedDataPath);
    const mergedData = JSON.parse(await fs.readFile(mergedDataPath, 'utf8'));
    console.log(`Found ${mergedData.length} records to process`);

    let successCount = 0;
    let errorCount = 0;

    // Insert each record into DynamoDB
    for (const record of mergedData) {
      try {
        console.log(`\nProcessing record for registration number: ${record.registrationNumber}`);
        
        await TypeformResponse.create(record);
        console.log(`Successfully inserted record for ${record.registrationNumber}`);
        successCount++;
      } catch (error) {
        console.error(`Error inserting record for ${record.registrationNumber}:`, {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        errorCount++;
      }
    }

    console.log('\nPopulation process completed:');
    console.log(`Successfully inserted: ${successCount} records`);
    console.log(`Failed to insert: ${errorCount} records`);
  } catch (error) {
    console.error('Error in populateDynamoDB:', error);
    process.exit(1);
  }
}

// Run the population
populateDynamoDB(); 