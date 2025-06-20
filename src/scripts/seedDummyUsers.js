const { connectDB, models } = require('../config/db');

const dummyUsers = [
  {
    username: 'johndoe',
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
    status: 'online',
    role: 'user',
    department: 'Engineering',
    title: 'Software Engineer',
    location: 'San Francisco, CA'
  },
  {
    username: 'janedoe',
    name: 'Jane Doe',
    email: 'jane@example.com',
    password: 'password123',
    status: 'busy',
    role: 'user',
    department: 'Design',
    title: 'UI/UX Designer',
    location: 'New York, NY'
  },
  {
    username: 'bobsmith',
    name: 'Bob Smith',
    email: 'bob@example.com',
    password: 'password123',
    status: 'offline',
    role: 'user',
    department: 'Product',
    title: 'Product Manager',
    location: 'Seattle, WA'
  },
  {
    username: 'alicejohnson',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    password: 'password123',
    status: 'online',
    role: 'user',
    department: 'Marketing',
    title: 'Marketing Manager',
    location: 'Los Angeles, CA'
  },
  {
    username: 'mikebrown',
    name: 'Mike Brown',
    email: 'mike@example.com',
    password: 'password123',
    status: 'in-call',
    role: 'user',
    department: 'Sales',
    title: 'Sales Director',
    location: 'Chicago, IL'
  }
];

async function seedUsers() {
  try {
    // Connect to database
    await connectDB();
    console.log('Connected to database');

    // Create users
    for (const userData of dummyUsers) {
      const existingUser = await models.User.findOne({
        where: { email: userData.email }
      });

      if (!existingUser) {
        await models.User.create(userData);
        console.log(`Created user: ${userData.email}`);
      } else {
        console.log(`User already exists: ${userData.email}`);
      }
    }

    console.log('Seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed function
seedUsers(); 