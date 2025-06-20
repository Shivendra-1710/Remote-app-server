const { Sequelize, DataTypes, Op } = require('sequelize');
const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

// Load environment variables from .env file
dotenv.config();

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../../database.sqlite'),
  logging: false
});

// Define User model
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'
  },
  status: {
    type: DataTypes.ENUM('online', 'offline', 'busy', 'in-call', 'idle', 'dnd'),
    allowNull: false,
    defaultValue: 'offline'
  },
  role: {
    type: DataTypes.ENUM('admin', 'user'),
    allowNull: false,
    defaultValue: 'user'
  },
  customStatus: {
    type: DataTypes.STRING
  },
  activity: {
    type: DataTypes.STRING
  },
  phone: {
    type: DataTypes.STRING
  },
  department: {
    type: DataTypes.STRING
  },
  title: {
    type: DataTypes.STRING
  },
  location: {
    type: DataTypes.STRING
  },
  lastActive: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['email']
    },
    {
      unique: true,
      fields: ['username']
    }
  ],
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

User.prototype.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Define Chat model
const Chat = sequelize.define('Chat', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  senderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  receiverId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  timestamps: true
});

// Define Session model
const Session = sequelize.define('Session', {
  sessionId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'active'
  },
  endTime: {
    type: DataTypes.DATE
  }
});

// Set up associations
User.hasMany(Session);
Session.belongsTo(User);

// Set up Chat associations
User.hasMany(Chat, { foreignKey: 'senderId', as: 'SentMessages' });
User.hasMany(Chat, { foreignKey: 'receiverId', as: 'ReceivedMessages' });
Chat.belongsTo(User, { foreignKey: 'senderId', as: 'Sender' });
Chat.belongsTo(User, { foreignKey: 'receiverId', as: 'Receiver' });

async function connectDB() {
  try {
    console.log('Attempting to connect to SQLite database...');
    await sequelize.authenticate();
    console.log('Connected to database successfully');
    
    // First try to sync without altering (safer approach)
    try {
      await sequelize.sync();
      console.log('Database tables synced successfully');
    } catch (syncError) {
      // If sync fails, try to handle specific cases
      if (syncError.name === 'SequelizeUniqueConstraintError') {
        console.log('Handling duplicate entries in database...');
        // Remove duplicate entries keeping the latest one
        await sequelize.transaction(async (t) => {
          const models = [User, Chat, Session];
          for (const Model of models) {
            const records = await Model.findAll({
              attributes: [
                [sequelize.fn('MAX', sequelize.col('id')), 'id'],
                ...Object.keys(Model.rawAttributes).filter(attr => attr !== 'id')
              ],
              group: ['email'],
              transaction: t
            });
            
            // Delete all records and reinsert the unique ones
            await Model.destroy({ truncate: true, transaction: t });
            await Model.bulkCreate(records, { transaction: t });
          }
        });
        
        // Try sync again after cleaning up
        await sequelize.sync();
        console.log('Database cleaned and synced successfully');
      } else {
        throw syncError;
      }
    }
    
    return sequelize;
  } catch (err) {
    console.error('Database connection failed:', err);
    throw err;
  }
}

module.exports = {
  connectDB,
  sequelize,
  Op,
  models: {
    User,
    Session,
    Chat
  }
}; 