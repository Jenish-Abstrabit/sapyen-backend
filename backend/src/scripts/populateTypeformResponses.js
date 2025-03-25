const { connectDB } = require('../config/database');
const TypeformResponse = require('../models/TypeformResponse');
const { fetchTypeformResponses } = require('../services/typeformService');

async function populateDynamoDB() {
  try {
    // Connect to DynamoDB
    await connectDB();
    console.log('Connected to DynamoDB');

    // Fetch responses from Typeform
    console.log('Fetching responses from Typeform...');
    const responses = await fetchTypeformResponses();
    console.log(`Fetched ${responses.length} responses from Typeform`);

    // Limit to first 10 responses for testing
    const limitedResponses = responses.slice(0, 10);
    console.log(`Processing first ${limitedResponses.length} responses...`);

    // Log the structure of the first item
    if (limitedResponses.length > 0) {
      console.log('\nFirst item structure:');
      console.log(JSON.stringify(limitedResponses[0], null, 2));
    }

    let successCount = 0;
    let errorCount = 0;

    // Insert each response into DynamoDB
    for (const response of limitedResponses) {
      try {
        console.log(`\nAttempting to insert response ${response.response_id}...`);
        
        await TypeformResponse.create(response);
        console.log(`Successfully inserted response ${response.response_id}`);
        successCount++;
      } catch (error) {
        console.error(`Error inserting response ${response.response_id}:`, {
          name: error.name,
          message: error.message,
          stack: error.stack,
          metadata: error.$metadata
        });
        errorCount++;
      }
    }

    console.log('\nPopulation process completed:');
    console.log(`Successfully inserted: ${successCount} responses`);
    console.log(`Failed to insert: ${errorCount} responses`);
  } catch (error) {
    console.error('Error in populateDynamoDB:', error);
    process.exit(1);
  }
}

// Run the population
populateDynamoDB(); 