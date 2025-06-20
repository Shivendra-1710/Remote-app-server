const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ScreenShareSession = sequelize.define('ScreenShareSession', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    hostId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    viewerId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('active', 'ended', 'paused'),
      defaultValue: 'active'
    },
    startTime: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    endTime: {
      type: DataTypes.DATE
    },
    permissions: {
      type: DataTypes.JSON,
      defaultValue: {
        audio: false,
        control: false,
        record: false
      }
    }
  }, {
    timestamps: true
  });

  ScreenShareSession.associate = (models) => {
    ScreenShareSession.belongsTo(models.User, { as: 'host', foreignKey: 'hostId' });
    ScreenShareSession.belongsTo(models.User, { as: 'viewer', foreignKey: 'viewerId' });
  };

  return ScreenShareSession;
}; 