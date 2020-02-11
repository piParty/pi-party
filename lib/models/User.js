const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const myPiSchema = new mongoose.Schema({
  description: String, 
  piNickname: {
    type: String, 
    required: true 
  }
});

const schema = new mongoose.Schema({
  email: {
    type: String, 
    required: true, 
    unique: [true, 'Email is taken']
  }, 
  passwordHash: {
    type: String, 
    required: true
  }, 
  role: {
    type: String, 
    required: true,
    enum: ['admin', 'user'],
    default: 'user'
  }, 
  myPis: {
    type: [myPiSchema],
    required: true, 
    validate: {
      validator: function(myPis) {
        return myPis.length > 0;
      },
      message: 'Pi registration required.'
    }
  }
}, {
  toJSON: {
    transform: (doc, ret) => {
      delete ret.passwordHash;
    }
  }
});

//connect a user with the plants that they have
schema.virtual('myPlants', {
  ref: 'Plant', 
  localField: '_id', 
  foreignField: 'user',
  applySetters: true
},);

schema.virtual('password').set(function(password) {
  this.passwordHash = bcrypt.hashSync(password, 10);
});

schema.statics.findByAuthToken = function(token) {
  try {
    const tokenPayload = jwt.verify(token, process.env.APP_SECRET);
    return Promise.resolve(this.hydrate({
      _id: tokenPayload._id,
      email: tokenPayload.email,
      role: tokenPayload.role,
      myPis: tokenPayload.myPis,
      __v : tokenPayload.__v,
    }));
  }
  catch(err) {
    return Promise.reject(err);
  }
};

schema.methods.authToken = function() {
  return jwt.sign(this.toJSON(), process.env.APP_SECRET, {
    expiresIn: '24h'
  });
};

schema.statics.authorize = async function({ email, password }) {
  const user = await this.findOne({ email });
  if(!user) {
    const err = new Error('Invalid Email or Password');
    err.status = 401;
    throw err;
  }
  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if(!validPassword) {
    const err = new Error('Invalid Email or Password');
    err.status = 401;
    throw err;
  }
  return user;
};

schema.statics.getAllSessionsByUser = function() {
  return this.aggregate([
    {
      '$unwind': {
        'path': '$myPis'
      }
    }, {
      '$lookup': {
        'from': 'pidatasessions', 
        'localField': 'myPis._id', 
        'foreignField': 'piNicknameId', 
        'as': 'sessions'
      }
    }, {
      '$unwind': {
        'path': '$sessions'
      }
    }, {
      '$group': {
        '_id': '$_id', 
        'sessions': {
          '$push': '$sessions'
        }
      }
    }
  ]);
};

schema.statics.getUserSessionsByCity = function(piCity, userId) {
  return this.aggregate([
    {
      '$match': {
        '_id': new mongoose.Types.ObjectId(userId)
      }
    }, {
      '$unwind': {
        'path': '$myPis'
      }
    }, {
      '$lookup': {
        'from': 'pidatasessions', 
        'localField': 'myPis._id', 
        'foreignField': 'piNicknameId', 
        'as': 'sessions'
      }
    }, {
      '$project': {
        'sessions': true
      }
    }, {
      '$unwind': {
        'path': '$sessions'
      }
    }, {
      '$match': {
        'sessions.city': piCity
      }
    }
  ]);
};

schema.statics.getUserSessionsByLocation = function(piLocation, userId) {
  return this.aggregate([
    {
      '$match': {
        '_id': new mongoose.Types.ObjectId(userId)
      }
    }, {
      '$unwind': {
        'path': '$myPis'
      }
    }, {
      '$lookup': {
        'from': 'pidatasessions', 
        'localField': 'myPis._id', 
        'foreignField': 'piNicknameId', 
        'as': 'sessions'
      }
    }, {
      '$project': {
        'sessions': true
      }
    }, {
      '$unwind': {
        'path': '$sessions'
      }
    }, {
      '$match': {
        'sessions.piLocationInHouse': piLocation
      }
    }
  ]);
};

schema.statics.getUserSessionsByPiNickname = function(nickname, userId) {
  return this.aggregate([
    {
      '$match': {
        '_id': new mongoose.Types.ObjectId(userId)
      }
    }, {
      '$unwind': {
        'path': '$myPis'
      }
    }, {
      '$match': {
        'myPis.piNickname': nickname
      }
    }, {
      '$lookup': {
        'from': 'pidatasessions', 
        'localField': 'myPis._id', 
        'foreignField': 'piNicknameId', 
        'as': 'sessions'
      }
    }, {
      '$unwind': {
        'path': '$sessions'
      }
    }, {
      '$project': {
        'sessions': true
      }
    }
  ]);
};

module.exports = mongoose.model('User', schema);
