const { DynamoDBClient, ListTablesCommand } = require('@aws-sdk/client-dynamodb');
require('dotenv').config();

const regions = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ap-southeast-1',
  'ap-southeast-2',
  'eu-west-1',
  'eu-north-1'
];

const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
};

async function listTablesInRegion(region) {
  const client = new DynamoDBClient({
    region,
    credentials
  });

  try {
    const command = new ListTablesCommand({});
    const response = await client.send(command);
    if (response.TableNames.length > 0) {
      console.log(`\nTables in ${region}:`);
      console.log(response.TableNames);
    }
  } catch (error) {
    console.error(`\nError listing tables in ${region}:`, error.message);
  }
}

async function listAllTables() {
  console.log('Checking tables in all regions...');
  await Promise.all(regions.map(listTablesInRegion));
  console.log('\nDone checking all regions.');
}

listAllTables(); 