class AirtableSchema {
  constructor(record) {
    this.registration_number = record.fields['Name'];
    
    this.data = {
      record_id: record.id,
      vial1_volume: record.fields['Vial 1 Volume'] || '',
      vial2_volume: record.fields['Vial 2 Volume'] || '',
      total_motility: record.fields['Total Motility'] || 0,
      morphology: record.fields['Morphology'] || 0
    };
  }

  isValid() {
    return !!this.registration_number && !!this.data.record_id;
  }
}

module.exports = AirtableSchema; 