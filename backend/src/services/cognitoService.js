require('dotenv').config();
const { CognitoIdentityProviderClient, InitiateAuthCommand, RespondToAuthChallengeCommand, ChangePasswordCommand } = require('@aws-sdk/client-cognito-identity-provider');
const crypto = require('crypto');

// Debug logging
console.log('Cognito Configuration:');
console.log('Region:', process.env.AWS_REGION);
console.log('User Pool ID:', process.env.COGNITO_USER_POOL_ID);
console.log('Client ID:', process.env.COGNITO_CLIENT_ID);
console.log('Client Secret exists:', !!process.env.COGNITO_CLIENT_SECRET);

const client = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID;
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET;

function calculateSecretHash(username) {
  if (!CLIENT_SECRET) {
    throw new Error('Client secret is not configured');
  }
  const message = username + CLIENT_ID;
  const hmac = crypto.createHmac('sha256', CLIENT_SECRET);
  hmac.update(message);
  return hmac.digest('base64');
}

async function login(email, password) {
  try {
    if (!CLIENT_ID) {
      throw new Error('Cognito Client ID is not configured');
    }

    const authParams = {
      USERNAME: email,
      PASSWORD: password
    };

    // Add SECRET_HASH if client secret is configured
    if (CLIENT_SECRET) {
      authParams.SECRET_HASH = calculateSecretHash(email);
      console.log('Added SECRET_HASH to auth parameters');
    }

    const command = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: authParams
    });

    const response = await client.send(command);
    
    // Check if authentication was successful
    if (!response.AuthenticationResult) {
      // Check if we need to respond to a challenge
      if (response.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
        return {
          success: false,
          requiresNewPassword: true,
          session: response.Session,
          error: 'New password required'
        };
      }
      
      console.error('Authentication failed:', response);
      return {
        success: false,
        error: 'Authentication failed. Please check your credentials.'
      };
    }

    return {
      success: true,
      tokens: {
        accessToken: response.AuthenticationResult.AccessToken,
        idToken: response.AuthenticationResult.IdToken
      }
    };
  } catch (error) {
    console.error('Cognito login error:', error);
    
    // Handle specific Cognito errors
    if (error.name === 'NotAuthorizedException') {
      return {
        success: false,
        error: 'Invalid email or password'
      };
    } else if (error.name === 'UserNotFoundException') {
      return {
        success: false,
        error: 'User not found'
      };
    } else if (error.name === 'UserNotConfirmedException') {
      return {
        success: false,
        error: 'User is not confirmed'
      };
    }

    return {
      success: false,
      error: error.message || 'An error occurred during authentication'
    };
  }
}

async function changePassword(session, newPassword) {
  try {
    const command = new ChangePasswordCommand({
      AccessToken: session,
      PreviousPassword: '', // Not needed for force change password
      ProposedPassword: newPassword
    });

    await client.send(command);
    return {
      success: true,
      message: 'Password changed successfully'
    };
  } catch (error) {
    console.error('Change password error:', error);
    return {
      success: false,
      error: error.message || 'Failed to change password'
    };
  }
}

module.exports = {
  login,
  changePassword
}; 