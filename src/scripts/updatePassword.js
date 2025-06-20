const bcrypt = require('bcryptjs');
const { connectDB } = require('../config/db');
const { models: { User } } = require('../config/db');

async function updateTestUserPassword() {
  try {
    // Connect to the database
    await connectDB();

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // Update the test user's password
    const updatedUser = await User.update(
      { password: hashedPassword },
      { 
        where: { 
          email: 'test@example.com' // or use the appropriate test user email
        }
      }
    );

    if (updatedUser[0] === 0) {
      console.log('No user found to update. Creating test user...');
      
      // Create a test user if none exists
      await User.create({
        username: 'testadmin',
        name: 'Test Admin',
        email: 'test@example.com',
        password: 'admin123', // Will be hashed by the beforeCreate hook
        role: 'admin',
        status: 'online',
        department: 'Engineering',
        title: 'Test Admin',
        location: 'Local'
      });
      
      console.log('Test user created successfully');
    } else {
      console.log('Password updated successfully');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error updating password:', error);
    process.exit(1);
  }
}

updateTestUserPassword(); 