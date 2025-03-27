const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const docClient = DynamoDBDocumentClient.from(client);

async function fetchAllFromTable(tableName) {
  const items = [];
  let lastEvaluatedKey = undefined;

  do {
    const command = new ScanCommand({
      TableName: tableName,
      ExclusiveStartKey: lastEvaluatedKey
    });

    const result = await docClient.send(command);
    items.push(...result.Items);
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return items;
}

async function fetchMergedData() {
  try {
    // Fetch data from both tables simultaneously
    console.log('Fetching data from both tables simultaneously...');
    const [typeformResult, airtableResult] = await Promise.all([
      fetchAllFromTable('typeform_data'),
      fetchAllFromTable('airtable_data')
    ]);

    console.log(`Fetched ${typeformResult.length} items from typeform_data`);
    console.log(`Fetched ${airtableResult.length} items from airtable_data`);

    // Create maps for easier lookup
    const typeformMap = new Map(
      typeformResult.map(item => [item.registration_number, item.data])
    );

    const airtableMap = new Map(
      airtableResult.map(item => [item.registration_number, item.data])
    );

    // Get all unique registration numbers
    const allRegNumbers = new Set([
      ...typeformMap.keys(),
      ...airtableMap.keys()
    ]);

    // Merge the data
    const mergedData = Array.from(allRegNumbers).map(regNumber => ({
      registration_number: regNumber,
      typeform_data: typeformMap.get(regNumber) || {},
      airtable_data: airtableMap.get(regNumber) || {}
    }));

    console.log(`Created ${mergedData.length} merged records`);

    return {
      success: true,
      data: mergedData
    };
  } catch (error) {
    console.error('Error fetching merged data:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  fetchMergedData
}; 