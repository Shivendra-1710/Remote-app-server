const { sequelize, models: { User, Chat, Session }, Op } = require('../config/db');

async function verifyDatabase() {
  try {
    console.log('Verifying database integrity...');
    
    // Connect to database
    await sequelize.authenticate();
    
    // Check for duplicate emails
    const duplicateEmails = await User.findAll({
      attributes: [
        'email',
        [sequelize.fn('COUNT', sequelize.col('email')), 'count']
      ],
      group: ['email'],
      having: sequelize.literal('COUNT(email) > 1')
    });
    
    if (duplicateEmails.length > 0) {
      console.log('Found duplicate emails:', duplicateEmails.map(d => d.email));
      
      // Fix duplicates by keeping only the latest record for each email
      await sequelize.transaction(async (t) => {
        for (const { email } of duplicateEmails) {
          const users = await User.findAll({
            where: { email },
            order: [['updatedAt', 'DESC']],
            transaction: t
          });
          
          // Keep the first (latest) record and delete the rest
          const [keep, ...remove] = users;
          if (remove.length > 0) {
            await User.destroy({
              where: {
                id: remove.map(u => u.id)
              },
              transaction: t
            });
            console.log(`Removed ${remove.length} duplicate records for email: ${email}`);
          }
        }
      });
    }
    
    // Verify foreign key constraints
    const orphanedChats = await Chat.findAll({
      where: {
        [Op.or]: [
          { senderId: { [Op.notIn]: sequelize.literal('(SELECT id FROM Users)') } },
          { receiverId: { [Op.notIn]: sequelize.literal('(SELECT id FROM Users)') } }
        ]
      }
    });
    
    if (orphanedChats.length > 0) {
      console.log(`Found ${orphanedChats.length} orphaned chat messages. Cleaning up...`);
      await Chat.destroy({
        where: {
          id: orphanedChats.map(c => c.id)
        }
      });
    }
    
    // Verify sessions
    const orphanedSessions = await Session.findAll({
      where: {
        UserId: { [Op.notIn]: sequelize.literal('(SELECT id FROM Users)') }
      }
    });
    
    if (orphanedSessions.length > 0) {
      console.log(`Found ${orphanedSessions.length} orphaned sessions. Cleaning up...`);
      await Session.destroy({
        where: {
          id: orphanedSessions.map(s => s.id)
        }
      });
    }
    
    console.log('Database verification complete');
    process.exit(0);
  } catch (error) {
    console.error('Database verification failed:', error);
    process.exit(1);
  }
}

verifyDatabase(); 