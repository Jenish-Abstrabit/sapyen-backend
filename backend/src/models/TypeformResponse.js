const { PutCommand, GetCommand, QueryCommand, DeleteCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { ddbDocClient } = require('../config/database');

const TABLE_NAME = 'user_typeform_airtable_data';

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
    const requiredFields = ['response_id', 'landing_id', 'response_type'];
    for (const field of requiredFields) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }

  static extractFieldValue(answers, ref) {
    const answer = answers.find(a => a.field.ref === ref);
    if (!answer) return null;
    
    // Handle different answer types
    switch (answer.type) {
      case 'text':
        return answer.text;
      case 'email':
        return answer.email;
      case 'phone_number':
        return answer.phone_number;
      default:
        return null;
    }
  }

  static async create(data) {
    this.validateResponse(data);
    
    // Extract fields from answers using ref values
    const extractedFields = {
      first_name: this.extractFieldValue(data.answers, FIELD_REFS.firstName),
      last_name: this.extractFieldValue(data.answers, FIELD_REFS.lastName),
      registration_number: this.extractFieldValue(data.answers, FIELD_REFS.registrationNumber),
      email: this.extractFieldValue(data.answers, FIELD_REFS.email),
      phone_number: this.extractFieldValue(data.answers, FIELD_REFS.phoneNumber)
    };
    
    const params = {
      TableName: TABLE_NAME,
      Item: {
        response_id: data.response_id,
        landing_id: data.landing_id,
        response_type: data.response_type,
        ...extractedFields
      }
    };

    try {
      await ddbDocClient.send(new PutCommand(params));
      return params.Item;
    } catch (error) {
      console.error('Error creating typeform response:', error);
      throw error;
    }
  }

  static async getByResponseId(responseId) {
    if (!responseId) {
      throw new Error('Response ID is required');
    }

    const params = {
      TableName: TABLE_NAME,
      Key: {
        response_id: responseId
      }
    };

    try {
      const { Item } = await ddbDocClient.send(new GetCommand(params));
      return Item;
    } catch (error) {
      console.error('Error getting typeform response:', error);
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
      console.error('Error scanning typeform responses:', error);
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

  static async delete(responseId) {
    if (!responseId) {
      throw new Error('Response ID is required');
    }

    const params = {
      TableName: TABLE_NAME,
      Key: {
        response_id: responseId
      }
    };

    try {
      await ddbDocClient.send(new DeleteCommand(params));
      return true;
    } catch (error) {
      console.error('Error deleting typeform response:', error);
      throw error;
    }
  }
}

module.exports = TypeformResponse; 