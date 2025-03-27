const fs = require('fs');
const path = require('path');
const { fetchAllTypeformResponses } = require('../services/typeformService');
const { fetchAllAirtableRecords } = require('../services/airtableService');
const TypeformSchema = require('../schemas/TypeformSchema');
const AirtableSchema = require('../schemas/AirtableSchema');

async function fetchData() {
  try {
    // Fetch Typeform data
    console.log('Fetching Typeform responses...');
    const typeformResponses = await fetchAllTypeformResponses();
    console.log(`Fetched ${typeformResponses.length} responses from Typeform`);

    // Process Typeform data
    console.log('\nProcessing Typeform data...');
    const typeformEntries = new Map();
    const duplicateTypeformRegs = new Set();

    typeformResponses.forEach(response => {
      if (!response.answers || response.answers.length === 0) return;

      const schema = new TypeformSchema(response);
      if (!schema.isValid()) return;

      const regNum = schema.registration_number;
      if (typeformEntries.has(regNum)) {
        duplicateTypeformRegs.add(regNum);
        typeformEntries.delete(regNum); // Remove the entry if it's a duplicate
      } else {
        typeformEntries.set(regNum, schema);
      }
    });

    // Save processed Typeform data
    const typeformDataPath = path.join(__dirname, '../../data/typeform_data.json');
    fs.writeFileSync(typeformDataPath, JSON.stringify(Array.from(typeformEntries.values()), null, 2));
    console.log('Saved processed Typeform data to:', typeformDataPath);

    // Log Typeform processing summary
    console.log('\nTypeform Processing Summary:');
    console.log(`Total responses: ${typeformResponses.length}`);
    console.log(`Valid entries: ${typeformEntries.size}`);
    console.log(`Duplicate registration numbers: ${duplicateTypeformRegs.size}`);
    if (duplicateTypeformRegs.size > 0) {
      console.log('\nDuplicate registration numbers:');
      duplicateTypeformRegs.forEach(regNum => console.log(`- ${regNum}`));
    }

    // Fetch Airtable data
    console.log('\nFetching Airtable records...');
    const airtableRecords = await fetchAllAirtableRecords();
    console.log(`Fetched ${airtableRecords.length} records from Airtable`);

    // Process Airtable data
    console.log('\nProcessing Airtable data...');
    const airtableEntries = new Map();
    const duplicateAirtableRegs = new Set();

    airtableRecords.forEach(record => {
      const schema = new AirtableSchema(record);
      if (!schema.isValid()) return;

      const regNum = schema.registration_number;
      if (airtableEntries.has(regNum)) {
        duplicateAirtableRegs.add(regNum);
        airtableEntries.delete(regNum); // Remove the entry if it's a duplicate
      } else {
        airtableEntries.set(regNum, schema);
      }
    });

    // Save processed Airtable data
    const airtableDataPath = path.join(__dirname, '../../data/airtable_data.json');
    fs.writeFileSync(airtableDataPath, JSON.stringify(Array.from(airtableEntries.values()), null, 2));
    console.log('Saved processed Airtable data to:', airtableDataPath);

    // Log Airtable processing summary
    console.log('\nAirtable Processing Summary:');
    console.log(`Total records: ${airtableRecords.length}`);
    console.log(`Valid entries: ${airtableEntries.size}`);
    console.log(`Duplicate registration numbers: ${duplicateAirtableRegs.size}`);
    if (duplicateAirtableRegs.size > 0) {
      console.log('\nDuplicate registration numbers:');
      duplicateAirtableRegs.forEach(regNum => console.log(`- ${regNum}`));
    }

  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

fetchData(); 