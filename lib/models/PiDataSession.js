const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const schema = new mongoose.Schema({
  piNicknameId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  sensorType: {
    type: [String],
    enum: ['light', 'humidity', 'temperature'],
    required: true
  },
  piLocationInHouse: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  notes: String

});

schema.virtual('user', {
  ref: 'User',
  localField: 'piNickNameId',
  foreignField: 'myPis._id'
});

schema.methods.dataSessionToken = function() {
  return jwt.sign(this.toJSON(), process.env.APP_SECRET, {
    expiresIn: '1y'
  });
};

module.exports = mongoose.model('PiDataSession', schema);
