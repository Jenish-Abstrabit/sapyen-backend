const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { fetchAllTypeformResponses } = require('./typeformService');
const { fetchAllAirtableRecords } = require('./airtableService');
const TypeformSchema = require('../schemas/TypeformSchema');
const AirtableSchema = require('../schemas/AirtableSchema');

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const docClient = DynamoDBDocumentClient.from(client);

async function fetchAllFromDynamoDB(tableName) {
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

// Helper function to compare Airtable data
function compareAirtableData(airtableData, dynamoData) {
  const fieldsToCompare = ['vial1_volume', 'vial2_volume', 'total_motility', 'morphology'];
  
  for (const field of fieldsToCompare) {
    // Convert strings to numbers for comparison if possible
    const airtableValue = parseFloat(airtableData[field]);
    const dynamoValue = parseFloat(dynamoData[field]);
    
    // If both values are valid numbers, compare them
    if (!isNaN(airtableValue) && !isNaN(dynamoValue)) {
      if (Math.abs(airtableValue - dynamoValue) > 0.0001) { // Using small epsilon for float comparison
        return false;
      }
    } else {
      // If either value is not a number, compare as strings
      if (airtableData[field] !== dynamoData[field]) {
        return false;
      }
    }
  }
  
  return true;
}

async function syncAirtableData() {
  try {
    console.log('Starting Airtable sync process...');

    // Fetch data from both sources simultaneously
    const [airtableRecords, dynamoDBItems] = await Promise.all([
      fetchAllAirtableRecords(),
      fetchAllFromDynamoDB('airtable_data')
    ]);

    console.log(`Fetched ${airtableRecords.length} records from Airtable`);
    console.log(`Fetched ${dynamoDBItems.length} items from DynamoDB`);

    // Process Airtable records using AirtableSchema
    const processedAirtableRecords = airtableRecords
      .map(record => new AirtableSchema(record))
      .filter(schema => schema.isValid())
      .map(schema => ({
        registration_number: schema.registration_number,
        data: schema.data
      }));

    console.log(`Processed ${processedAirtableRecords.length} valid records from Airtable`);

    // Track registration numbers to identify duplicates
    const registrationNumberCount = new Map();
    processedAirtableRecords.forEach(record => {
      if (record.registration_number) {
        registrationNumberCount.set(
          record.registration_number,
          (registrationNumberCount.get(record.registration_number) || 0) + 1
        );
      }
    });

    // Filter out duplicates
    const validAirtableRecords = processedAirtableRecords.filter(record => {
      if (registrationNumberCount.get(record.registration_number) > 1) {
        console.log('Found duplicate registration number:', record.registration_number);
        return false;
      }
      return true;
    });

    console.log(`Found ${validAirtableRecords.length} valid records with unique registration numbers`);

    // Create maps for easier lookup
    const airtableMap = new Map(
      validAirtableRecords.map(record => [record.registration_number, record])
    );

    const dynamoDBMap = new Map(
      dynamoDBItems.map(item => [item.registration_number, item])
    );

    // Find new entries (in Airtable but not in DynamoDB)
    const newEntries = validAirtableRecords.filter(
      record => !dynamoDBMap.has(record.registration_number)
    );

    // Find deleted entries (in DynamoDB but not in Airtable)
    const deletedEntries = dynamoDBItems.filter(
      item => !airtableMap.has(item.registration_number)
    );

    // Find updated entries (in both but with different content)
    const updatedEntries = validAirtableRecords.filter(record => {
      const dynamoItem = dynamoDBMap.get(record.registration_number);
      if (!dynamoItem) return false;
      return !compareAirtableData(record.data, dynamoItem.data);
    });

    // Add new entries to DynamoDB
    console.log(`\nAdding ${newEntries.length} new entries to DynamoDB...`);
    for (const entry of newEntries) {
      const command = new PutCommand({
        TableName: 'airtable_data',
        Item: {
          registration_number: entry.registration_number,
          data: entry.data
        }
      });
      await docClient.send(command);
      console.log(`Added entry with registration number: ${entry.registration_number}`);
    }

    // Update modified entries in DynamoDB
    console.log(`\nUpdating ${updatedEntries.length} modified entries in DynamoDB...`);
    for (const entry of updatedEntries) {
      const command = new PutCommand({
        TableName: 'airtable_data',
        Item: {
          registration_number: entry.registration_number,
          data: entry.data
        }
      });
      await docClient.send(command);
      console.log(`Updated entry with registration number: ${entry.registration_number}`);
    }

    // Delete removed entries from DynamoDB
    console.log(`\nDeleting ${deletedEntries.length} entries from DynamoDB...`);
    for (const entry of deletedEntries) {
      const command = new DeleteCommand({
        TableName: 'airtable_data',
        Key: {
          registration_number: entry.registration_number
        }
      });
      await docClient.send(command);
      console.log(`Deleted entry with registration number: ${entry.registration_number}`);
    }

    return {
      success: true,
      summary: {
        totalAirtableRecords: airtableRecords.length,
        validAirtableRecords: validAirtableRecords.length,
        totalDynamoDBItems: dynamoDBItems.length,
        newEntries: newEntries.map(e => e.registration_number),
        updatedEntries: updatedEntries.map(e => e.registration_number),
        deletedEntries: deletedEntries.map(e => e.registration_number),
        duplicateRegistrationNumbers: Array.from(registrationNumberCount.entries())
          .filter(([_, count]) => count > 1)
          .map(([regNum, count]) => ({ registration_number: regNum, count }))
      }
    };
  } catch (error) {
    console.error('Error in syncAirtableData:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function syncTypeformData() {
  try {
    console.log('Starting Typeform sync process...');

    // Fetch data from both sources simultaneously
    const [typeformResponses, dynamoDBItems] = await Promise.all([
      fetchAllTypeformResponses(),
      fetchAllFromDynamoDB('typeform_data')
    ]);

    console.log(`Fetched ${typeformResponses.length} responses from Typeform`);
    console.log(`Fetched ${dynamoDBItems.length} items from DynamoDB`);

    // Process Typeform responses using TypeformSchema
    const processedTypeformResponses = typeformResponses
      .map(response => new TypeformSchema(response))
      .filter(schema => schema.isValid())
      .map(schema => ({
        registration_number: schema.registration_number,
        data: schema.data
      }));

    console.log(`Processed ${processedTypeformResponses.length} valid responses from Typeform`);

    // Track registration numbers to identify duplicates
    const registrationNumberCount = new Map();
    processedTypeformResponses.forEach(response => {
      if (response.registration_number) {
        registrationNumberCount.set(
          response.registration_number,
          (registrationNumberCount.get(response.registration_number) || 0) + 1
        );
      }
    });

    // Filter out duplicates
    const validTypeformResponses = processedTypeformResponses.filter(response => {
      if (registrationNumberCount.get(response.registration_number) > 1) {
        console.log('Found duplicate registration number:', response.registration_number);
        return false;
      }
      return true;
    });

    console.log(`Found ${validTypeformResponses.length} valid responses with unique registration numbers`);

    // Create maps for easier lookup
    const typeformMap = new Map(
      validTypeformResponses.map(response => [response.registration_number, response])
    );

    const dynamoDBMap = new Map(
      dynamoDBItems.map(item => [item.registration_number, item])
    );

    // Find new entries (in Typeform but not in DynamoDB)
    const newEntries = validTypeformResponses.filter(
      response => !dynamoDBMap.has(response.registration_number)
    );

    // Find deleted entries (in DynamoDB but not in Typeform)
    const deletedEntries = dynamoDBItems.filter(
      item => !typeformMap.has(item.registration_number)
    );

    // Add new entries to DynamoDB
    console.log(`\nAdding ${newEntries.length} new entries to DynamoDB...`);
    for (const entry of newEntries) {
      const command = new PutCommand({
        TableName: 'typeform_data',
        Item: {
          registration_number: entry.registration_number,
          data: entry.data
        }
      });
      await docClient.send(command);
      console.log(`Added entry with registration number: ${entry.registration_number}`);
    }

    // Delete removed entries from DynamoDB
    console.log(`\nDeleting ${deletedEntries.length} entries from DynamoDB...`);
    for (const entry of deletedEntries) {
      const command = new DeleteCommand({
        TableName: 'typeform_data',
        Key: {
          registration_number: entry.registration_number
        }
      });
      await docClient.send(command);
      console.log(`Deleted entry with registration number: ${entry.registration_number}`);
    }

    return {
      success: true,
      summary: {
        totalTypeformResponses: typeformResponses.length,
        validTypeformResponses: validTypeformResponses.length,
        totalDynamoDBItems: dynamoDBItems.length,
        newEntries: newEntries.map(e => e.registration_number),
        deletedEntries: deletedEntries.map(e => e.registration_number),
        duplicateRegistrationNumbers: Array.from(registrationNumberCount.entries())
          .filter(([_, count]) => count > 1)
          .map(([regNum, count]) => ({ registration_number: regNum, count }))
      }
    };
  } catch (error) {
    console.error('Error in syncTypeformData:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  syncTypeformData,
  syncAirtableData
}; 