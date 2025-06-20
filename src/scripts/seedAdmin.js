const { connectDB, models } = require('../config/db');

async function seedAdmin() {
  try {
    await connectDB();

    // Create admin user
    const adminUser = await models.User.create({
      username: 'admin',
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'admin123', // This will be hashed by the model hook
      role: 'admin',
      status: 'online',
      department: 'Administration',
      title: 'System Administrator',
      location: 'HQ',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin&backgroundColor=b6e3f4'
    });

    console.log('Admin user created successfully:', adminUser.toJSON());
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin user:', error);
    process.exit(1);
  }
}

seedAdmin(); 