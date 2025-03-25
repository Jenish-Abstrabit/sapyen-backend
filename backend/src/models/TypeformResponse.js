const { PutCommand, GetCommand, QueryCommand, DeleteCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { ddbDocClient } = require('../config/database');

const TABLE_NAME = 'user_data';

// Ref values for field extraction
const FIELD_REFS = {
  firstName: '01G0DPK147RA5SVVB2HY268ZYE',
  lastName: 'c98e6c56-15fb-424c-9f32-ce1a36bf6a55',
  registrationNumber: '123077da-fa0f-473e-9b73-649c4578fb72',
  email: 'b0732c72-5275-419a-8673-bd2d5d5c3e63',
  phoneNumber: 'd3a9680b-b67a-47b3-8719-3a71ffc88084'
};

class TypeformResponse {
  static validateResponse(data) {
    const requiredFields = ['registrationNumber'];
    for (const field of requiredFields) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }

  static async create(data) {
    this.validateResponse(data);
    
    const params = {
      TableName: TABLE_NAME,
      Item: {
        registration_number: data.registrationNumber,
        response_id: data.responseId || null,
        first_name: data.firstName || '',
        last_name: data.lastName || '',
        email: data.email || '',
        phone_number: data.phoneNumber || '',
        landing_id: data.landingId || '',
        response_type: data.responseType || '',
        // Only specified Airtable fields
        vial1_volume: data.vial1Volume || '',
        vial2_volume: data.vial2Volume || '',
        total_motility: data.totalMotility || 0,
        morphology: data.morphology || 0,
        created_at: new Date().toISOString()
      }
    };

    try {
      await ddbDocClient.send(new PutCommand(params));
      return params.Item;
    } catch (error) {
      console.error('Error creating merged record:', error);
      throw error;
    }
  }

  static async getByRegistrationNumber(registrationNumber) {
    if (!registrationNumber) {
      throw new Error('Registration number is required');
    }

    const params = {
      TableName: TABLE_NAME,
      Key: {
        registration_number: registrationNumber
      }
    };

    try {
      const { Item } = await ddbDocClient.send(new GetCommand(params));
      return Item;
    } catch (error) {
      console.error('Error getting record:', error);
      throw error;
    }
  }

  static async getAll(limit = 100) {
    const params = {
      TableName: TABLE_NAME,
      Limit: limit
    };

    try {
      const { Items } = await ddbDocClient.send(new ScanCommand(params));
      return Items || [];
    } catch (error) {
      console.error('Error scanning records:', error);
      throw error;
    }
  }

  static async getByEmail(email) {
    if (!email) {
      throw new Error('Email is required');
    }

    const params = {
      TableName: TABLE_NAME,
      FilterExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email
      }
    };

    try {
      const { Items } = await ddbDocClient.send(new ScanCommand(params));
      return Items || [];
    } catch (error) {
      console.error('Error querying by email:', error);
      throw error;
    }
  }

  static async delete(registrationNumber) {
    if (!registrationNumber) {
      throw new Error('Registration number is required');
    }

    const params = {
      TableName: TABLE_NAME,
      Key: {
        registration_number: registrationNumber
      }
    };

    try {
      await ddbDocClient.send(new DeleteCommand(params));
      return true;
    } catch (error) {
      console.error('Error deleting record:', error);
      throw error;
    }
  }
}

module.exports = TypeformResponse; 