class AirtableSchema {
  constructor(record) {
    this.registration_number = record.fields['Name'];
    
    this.data = {
      vial1_volume: record.fields['Vial 1 Volume'] || '',
      vial2_volume: record.fields['Vial 2 Volume'] || '',
      total_motility: record.fields['Total Motility'] || 0,
      morphology: record.fields['Morphology'] || 0
    };
  }

  isValid() {
    return !!this.registration_number;
  }
}

module.exports = AirtableSchema; 