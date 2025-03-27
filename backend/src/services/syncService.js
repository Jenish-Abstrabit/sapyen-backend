const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { fetchAllTypeformResponses } = require('./typeformService');
const { fetchAllAirtableRecords, updateAirtableRecord } = require('./airtableService');
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

// Helper function to store duplicate records in error_data table
async function storeDuplicateRecord(registrationNumber, type, records) {
  try {
    // Convert records to DynamoDB format
    const formattedRecords = records.map(record => {
      const formattedRecord = {};
      for (const [key, value] of Object.entries(record)) {
        if (typeof value === 'number') {
          formattedRecord[key] = { N: value.toString() };
        } else {
          formattedRecord[key] = { S: value.toString() };
        }
      }
      return formattedRecord;
    });

    const command = new PutCommand({
      TableName: 'error_data',
      Item: {
        registration_number: registrationNumber,
        type: type,
        data: formattedRecords
      }
    });

    await docClient.send(command);
    console.log(`Stored duplicate record for ${registrationNumber} of type ${type}`);
  } catch (error) {
    console.error(`Error storing duplicate record for ${registrationNumber}:`, error);
    throw error;
  }
}

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

async function syncTypeformData() {
  try {
    console.log('Starting Typeform sync process...');

    // Fetch data from all sources simultaneously
    const [typeformResponses, dynamoDBItems, errorDataItems] = await Promise.all([
      fetchAllTypeformResponses(),
      fetchAllFromDynamoDB('typeform_data'),
      fetchAllFromDynamoDB('error_data')
    ]);

    console.log(`Fetched ${typeformResponses.length} responses from Typeform`);
    console.log(`Fetched ${dynamoDBItems.length} items from DynamoDB`);
    console.log(`Fetched ${errorDataItems.length} items from error_data`);

    // Process Typeform responses using TypeformSchema
    const processedTypeformResponses = typeformResponses
      .map(response => new TypeformSchema(response))
      .filter(schema => schema.isValid())
      .map(schema => ({
        registration_number: schema.registration_number,
        data: schema.data
      }));

    console.log(`Processed ${processedTypeformResponses.length} valid responses from Typeform`);

    // Create maps for easier lookup
    const dynamoDBMap = new Map(
      dynamoDBItems.map(item => [item.registration_number, item])
    );

    const errorDataMap = new Map(
      errorDataItems.map(item => [item.registration_number, item])
    );

    // Group records by registration number
    const registrationNumberMap = new Map();
    processedTypeformResponses.forEach(response => {
      if (!registrationNumberMap.has(response.registration_number)) {
        registrationNumberMap.set(response.registration_number, []);
      }
      registrationNumberMap.get(response.registration_number).push(response.data);
    });

    // Create a map of registration numbers that have duplicates
    const duplicateRegistrationNumbers = new Set(
      Array.from(registrationNumberMap.entries())
        .filter(([_, records]) => records.length > 1)
        .map(([regNum]) => regNum)
    );

    // Process each registration number
    for (const [registrationNumber, records] of registrationNumberMap) {
      if (records.length === 1) {
        // Case 1: Unique record
        if (!dynamoDBMap.has(registrationNumber)) {
          // Record doesn't exist in typeform_data
          if (errorDataMap.has(registrationNumber) && errorDataMap.get(registrationNumber).type === 'typeform') {
            // Remove from error_data if it exists there
            const deleteCommand = new DeleteCommand({
              TableName: 'error_data',
              Key: {
                registration_number: registrationNumber
              }
            });
            await docClient.send(deleteCommand);
            console.log(`Removed ${registrationNumber} from error_data as it's now unique`);
          }
        }
        // If record exists in typeform_data, do nothing
      } else {
        // Case 2: Duplicate records
        if (errorDataMap.has(registrationNumber) && errorDataMap.get(registrationNumber).type === 'typeform') {
          // Update existing record in error_data
          console.log(`Updating duplicate record for ${registrationNumber} in error_data`);
        } else {
          // Add new record to error_data
          console.log(`Adding new duplicate record for ${registrationNumber} to error_data`);
        }
        await storeDuplicateRecord(registrationNumber, 'typeform', records);
      }
    }

    // Find new entries (in Typeform but not in DynamoDB)
    const newEntries = processedTypeformResponses.filter(
      response => !dynamoDBMap.has(response.registration_number) && !duplicateRegistrationNumbers.has(response.registration_number)
    );

    // Find deleted entries (in DynamoDB but not in Typeform, or in DynamoDB but now has duplicates)
    const deletedEntries = dynamoDBItems.filter(
      item => !processedTypeformResponses.some(response => response.registration_number === item.registration_number) ||
              duplicateRegistrationNumbers.has(item.registration_number)
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
        validTypeformResponses: processedTypeformResponses.length,
        totalDynamoDBItems: dynamoDBItems.length,
        newEntries: newEntries.map(e => e.registration_number),
        deletedEntries: deletedEntries.map(e => e.registration_number),
        duplicateRegistrationNumbers: Array.from(registrationNumberMap.entries())
          .filter(([_, records]) => records.length > 1)
          .map(([regNum]) => regNum)
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

async function syncAirtableData() {
  try {
    console.log('Starting Airtable sync process...');

    // Fetch data from all sources simultaneously
    const [airtableRecords, dynamoDBItems, errorDataItems] = await Promise.all([
      fetchAllAirtableRecords(),
      fetchAllFromDynamoDB('airtable_data'),
      fetchAllFromDynamoDB('error_data')
    ]);

    console.log(`Fetched ${airtableRecords.length} records from Airtable`);
    console.log(`Fetched ${dynamoDBItems.length} items from DynamoDB`);
    console.log(`Fetched ${errorDataItems.length} items from error_data`);

    // Process Airtable records using AirtableSchema
    const processedAirtableRecords = airtableRecords
      .map(record => new AirtableSchema(record))
      .filter(schema => schema.isValid())
      .map(schema => ({
        registration_number: schema.registration_number,
        data: schema.data
      }));

    console.log(`Processed ${processedAirtableRecords.length} valid records from Airtable`);

    // Create maps for easier lookup
    const dynamoDBMap = new Map(
      dynamoDBItems.map(item => [item.registration_number, item])
    );

    const errorDataMap = new Map(
      errorDataItems.map(item => [item.registration_number, item])
    );

    // Group records by registration number
    const registrationNumberMap = new Map();
    processedAirtableRecords.forEach(record => {
      if (!registrationNumberMap.has(record.registration_number)) {
        registrationNumberMap.set(record.registration_number, []);
      }
      registrationNumberMap.get(record.registration_number).push(record.data);
    });

    // Create a map of registration numbers that have duplicates
    const duplicateRegistrationNumbers = new Set(
      Array.from(registrationNumberMap.entries())
        .filter(([_, records]) => records.length > 1)
        .map(([regNum]) => regNum)
    );

    // Process each registration number
    for (const [registrationNumber, records] of registrationNumberMap) {
      if (records.length === 1) {
        // Case 1: Unique record
        if (!dynamoDBMap.has(registrationNumber)) {
          // Record doesn't exist in airtable_data
          if (errorDataMap.has(registrationNumber) && errorDataMap.get(registrationNumber).type === 'airtable') {
            // Remove from error_data if it exists there
            const deleteCommand = new DeleteCommand({
              TableName: 'error_data',
              Key: {
                registration_number: registrationNumber
              }
            });
            await docClient.send(deleteCommand);
            console.log(`Removed ${registrationNumber} from error_data as it's now unique`);
          }
        }
        // If record exists in airtable_data, do nothing
      } else {
        // Case 2: Duplicate records
        if (errorDataMap.has(registrationNumber) && errorDataMap.get(registrationNumber).type === 'airtable') {
          // Update existing record in error_data
          console.log(`Updating duplicate record for ${registrationNumber} in error_data`);
        } else {
          // Add new record to error_data
          console.log(`Adding new duplicate record for ${registrationNumber} to error_data`);
        }
        await storeDuplicateRecord(registrationNumber, 'airtable', records);
      }
    }

    // Find new entries (in Airtable but not in DynamoDB)
    const newEntries = processedAirtableRecords.filter(
      record => !dynamoDBMap.has(record.registration_number) && !duplicateRegistrationNumbers.has(record.registration_number)
    );

    // Find deleted entries (in DynamoDB but not in Airtable, or in DynamoDB but now has duplicates)
    const deletedEntries = dynamoDBItems.filter(
      item => !processedAirtableRecords.some(record => record.registration_number === item.registration_number) ||
              duplicateRegistrationNumbers.has(item.registration_number)
    );

    // Find updated entries (in both but with different content and not duplicates)
    const updatedEntries = processedAirtableRecords.filter(record => {
      const dynamoItem = dynamoDBMap.get(record.registration_number);
      if (!dynamoItem) return false;
      return !compareAirtableData(record.data, dynamoItem.data) && !duplicateRegistrationNumbers.has(record.registration_number);
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
        validAirtableRecords: processedAirtableRecords.length,
        totalDynamoDBItems: dynamoDBItems.length,
        newEntries: newEntries.map(e => e.registration_number),
        updatedEntries: updatedEntries.map(e => e.registration_number),
        deletedEntries: deletedEntries.map(e => e.registration_number),
        duplicateRegistrationNumbers: Array.from(registrationNumberMap.entries())
          .filter(([_, records]) => records.length > 1)
          .map(([regNum]) => regNum)
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

async function updateAirtableDynamoDBRecord(registrationNumber, updateData) {
  try {
    // First, get the existing record to ensure it exists
    const getCommand = new GetCommand({
      TableName: 'airtable_data',
      Key: {
        registration_number: registrationNumber
      }
    });

    const existingRecord = await docClient.send(getCommand);
    if (!existingRecord.Item) {
      throw new Error(`Record with registration number ${registrationNumber} not found in DynamoDB`);
    }

    // Update Airtable record
    await updateAirtableRecord(updateData.record_id, updateData);

    // Update DynamoDB record
    const command = new PutCommand({
      TableName: 'airtable_data',
      Item: {
        registration_number: registrationNumber,
        data: {
          record_id: updateData.record_id,
          vial1_volume: updateData.vial1_volume,
          vial2_volume: updateData.vial2_volume,
          total_motility: updateData.total_motility,
          morphology: updateData.morphology
        }
      }
    });

    await docClient.send(command);

    return {
      success: true,
      message: `Successfully updated record for registration number ${registrationNumber}`
    };
  } catch (error) {
    console.error('Error updating record:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  syncTypeformData,
  syncAirtableData,
  updateAirtableDynamoDBRecord
}; 