const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

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
  type: {
    type: DataTypes.ENUM('text', 'file', 'image'),
    allowNull: false,
    defaultValue: 'text'
  },
  status: {
    type: DataTypes.ENUM('sending', 'sent', 'delivered', 'read', 'error'),
    allowNull: false,
    defaultValue: 'sent'
  },
  read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true
});

module.exports = Chat; 