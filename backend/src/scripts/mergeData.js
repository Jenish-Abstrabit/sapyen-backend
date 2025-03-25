const fs = require('fs').promises;
const path = require('path');
const { fetchAllTypeformResponses } = require('../services/typeformService');
const { fetchAllAirtableRecords } = require('../services/airtableService');

async function mergeData() {
  try {
    console.log('Fetching data from Typeform...');
    const typeformResponses = await fetchAllTypeformResponses();
    console.log(`Fetched ${typeformResponses.length} responses from Typeform`);

    console.log('Fetching data from Airtable...');
    const airtableRecords = await fetchAllAirtableRecords();
    console.log(`Fetched ${airtableRecords.length} records from Airtable`);

    // Create a map of Airtable records by Name (registration number)
    const airtableMap = new Map(
      airtableRecords.map(record => [
        record.fields.Name,
        {
          vial1Volume: record.fields['Vial 1 Volume'] || '',
          vial2Volume: record.fields['Vial 2 Volume'] || '',
          totalMotility: record.fields['Total Motility'] || 0,
          morphology: record.fields['Morphology'] || 0,
          fp: record.fields['FP (1-4)'] || 0,
          agglutination: record.fields['Agglutination'] || '',
          viscosity: record.fields['Viscosity'] || 0,
          debris: record.fields['Debris'] || '',
          comments: record.fields['Comments'] || '',
          dateSampleReceived: record.fields['Date Sample Received at Lab'] || '',
          dateSampleTested: record.fields['Date Sample Tested'] || '',
          daysOfAbstinence: record.fields['Days of Abstinence (Patient)'] || ''
        }
      ])
    );

    // Create a map of Typeform responses by registration number
    const typeformMap = new Map(
      typeformResponses.map(response => {
        const registrationNumber = response.answers.find(
          a => a.field.ref === '123077da-fa0f-473e-9b73-649c4578fb72'
        )?.text || '';
        
        return [
          registrationNumber,
          {
            responseId: response.response_id,
            landingId: response.landing_id,
            responseType: response.response_type,
            firstName: response.answers.find(
              a => a.field.ref === '01G0DPK147RA5SVVB2HY268ZYE'
            )?.text || '',
            lastName: response.answers.find(
              a => a.field.ref === 'c98e6c56-15fb-424c-9f32-ce1a36bf6a55'
            )?.text || '',
            email: response.answers.find(
              a => a.field.ref === 'b0732c72-5275-419a-8673-bd2d5d5c3e63'
            )?.email || '',
            phoneNumber: response.answers.find(
              a => a.field.ref === 'd3a9680b-b67a-47b3-8719-3a71ffc88084'
            )?.phone_number || ''
          }
        ];
      })
    );

    // Merge the data
    const mergedData = [];
    const allRegistrationNumbers = new Set([
      ...typeformMap.keys(),
      ...airtableMap.keys()
    ]);

    for (const registrationNumber of allRegistrationNumbers) {
      const typeformData = typeformMap.get(registrationNumber) || {};
      const airtableData = airtableMap.get(registrationNumber) || {};

      mergedData.push({
        registrationNumber,
        ...typeformData,
        ...airtableData
      });
    }

    // Save merged data to a JSON file
    const outputPath = path.join(__dirname, '../../data/merged_data.json');
    await fs.writeFile(outputPath, JSON.stringify(mergedData, null, 2));
    console.log(`Merged data saved to ${outputPath}`);
    console.log(`Total merged records: ${mergedData.length}`);

    // Log some statistics
    const typeformOnly = mergedData.filter(d => !airtableMap.has(d.registrationNumber)).length;
    const airtableOnly = mergedData.filter(d => !typeformMap.has(d.registrationNumber)).length;
    const matched = mergedData.length - typeformOnly - airtableOnly;

    console.log('\nStatistics:');
    console.log(`Records only in Typeform: ${typeformOnly}`);
    console.log(`Records only in Airtable: ${airtableOnly}`);
    console.log(`Matched records: ${matched}`);

  } catch (error) {
    console.error('Error merging data:', error);
    process.exit(1);
  }
}

// Run the merge
mergeData(); 