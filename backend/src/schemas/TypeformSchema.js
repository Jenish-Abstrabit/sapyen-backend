class TypeformSchema {
  constructor(response) {
    // Extract registration number from either field
    const regField1 = response.answers.find(
      answer => answer.field.ref === '123077da-fa0f-473e-9b73-649c4578fb72'
    );
    const regField2 = response.answers.find(
      answer => answer.field.ref === '1f9ef7f7-7885-4210-9d9e-e39534dbed1e'
    );
    
    this.registration_number = regField1?.text || regField2?.text;
    
    // Extract other fields using their refs
    this.data = {
      firstName: response.answers.find(answer => answer.field.ref === '01G0DPK147RA5SVVB2HY268ZYE')?.text || '',
      lastName: response.answers.find(answer => answer.field.ref === 'c98e6c56-15fb-424c-9f32-ce1a36bf6a55')?.text || '',
      email: response.answers.find(answer => answer.field.ref === 'b0732c72-5275-419a-8673-bd2d5d5c3e63')?.text || '',
      phoneNumber: response.answers.find(answer => answer.field.ref === 'd3a9680b-b67a-47b3-8719-3a71ffc88084')?.text || ''
    };
  }

  isValid() {
    return !!this.registration_number;
  }
}

module.exports = TypeformSchema; 