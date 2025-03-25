const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
require('dotenv').config();

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const ddbDocClient = DynamoDBDocumentClient.from(client);

const connectDB = async () => {
  try {
    // Test the connection by making a simple operation
    await client.config.credentials();
    console.log('DynamoDB Connected');
    return ddbDocClient;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { connectDB, ddbDocClient }; 