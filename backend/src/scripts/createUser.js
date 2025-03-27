const { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand } = require('@aws-sdk/client-cognito-identity-provider');
require('dotenv').config();

const client = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

async function createConfirmedUser(email, password, username) {
  try {
    // Step 1: Create the user
    const createUserCommand = new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      TemporaryPassword: password,
      UserAttributes: [
        {
          Name: 'email',
          Value: email
        },
        {
          Name: 'username',
          Value: username
        },
        {
          Name: 'email_verified',
          Value: 'true'
        }
      ],
      MessageAction: 'SUPPRESS' // Suppress the welcome email
    });

    const createUserResult = await client.send(createUserCommand);
    console.log('User created:', createUserResult.User.Username);

    // Step 2: Set permanent password
    const setPasswordCommand = new AdminSetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      Password: password,
      Permanent: true
    });

    await client.send(setPasswordCommand);
    console.log('Password set successfully');

    return {
      success: true,
      message: 'User created and confirmed successfully',
      user: createUserResult.User
    };
  } catch (error) {
    console.error('Error creating user:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Example usage
if (require.main === module) {
  const email = process.argv[2];
  const password = process.argv[3];
  const username = process.argv[4];

  if (!email || !password || !username) {
    console.error('Usage: node createUser.js <email> <password> <username>');
    process.exit(1);
  }

  createConfirmedUser(email, password, username)
    .then(result => {
      if (result.success) {
        console.log('Success:', result.message);
      } else {
        console.error('Error:', result.error);
      }
    });
}

module.exports = {
  createConfirmedUser
}; 