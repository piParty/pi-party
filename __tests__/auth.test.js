require('dotenv').config();
const { getUser, userAgent, adminAgent } = require('../lib/helpers/data-helpers');
const request = require('supertest');
const app = require('../lib/app');


describe('auth and user routes', () => {
  it('can signup a user via POST', () => {
    return request(app)
      .post('/api/v1/auth/signup')
      .send({ 
        email: 'new@tess.com',  
        password: 'password', 
        role: 'user', 
        myPis: [{ piNickname: 'myFirstPi' }] 
      })
      .then(res => {
        expect(res.header['set-cookie'][0]).toEqual(expect.stringContaining('session='));
        expect(res.body).toEqual({
          _id: expect.any(String),
          email: 'new@tess.com',
          role: 'user',
          myPis: [{ 
            piNickname: 'myFirstPi', 
            _id: expect.any(String) 
          }],
          __v: 0 
        });
      });
  });

  it('can login a user with email and password', async() => {
    const user = await getUser();
    return request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'password' })
      .then(res => {
        expect(res.header['set-cookie'][0]).toEqual(expect.stringContaining('session='));
        expect(res.body).toEqual({
          _id: user._id,
          email: user.email,
          role: 'user',
          myPis: [{ 
            piNickname: 'userPi', 
            _id: expect.any(String) 
          }],
          __v: 0
        });
      });
  });

  it('fails to login a user with a bad email', async() => {
    await getUser();
    return request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'badEmail@notgood.io', password: 'password' })
      .then(res => {
        expect(res.status).toEqual(401);
        expect(res.body).toEqual({
          status: 401,
          message: 'Invalid Email or Password'
        });
      });
  });

  it('fails to login a user with a bad password', async() => {
    await getUser();
    return request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'user@tess.com', password: 'notright' })
      .then(res => {
        expect(res.status).toEqual(401);
        expect(res.body).toEqual({
          status: 401,
          message: 'Invalid Email or Password'
        });
      });
  });

  it('should log out a user', async() => {
    return await userAgent
      .post('/api/v1/auth/logout')
      .then(res => {
        expect(res.header['set-cookie'][0]).toEqual(expect.stringContaining('session=;'));
      });
  });

  it('can patch the myPis field such that users can add an additional pi', async() => {
    const userInfoOfAgent = await getUser({ email:'user0@tess.com' });
    const initialPis = userInfoOfAgent.myPis;
    return userAgent
      .patch(`/api/v1/auth/myPis/${userInfoOfAgent._id}`)
      .send({ piNickname: 'mySecondPi' })
      .then(res => {
        expect(res.body).toEqual({
          ...userInfoOfAgent,
          myPis: [...initialPis, { 
            _id: expect.any(String), 
            piNickname: 'mySecondPi' 
          }]
        });
      });
  });

  it('via admin role only, can patch a user such that the role of the user is updated', async() => {
    const userToChangeRole = await getUser({ role: 'user' });

    return adminAgent
      .patch(`/api/v1/auth/change-role/${userToChangeRole._id}`)
      .send({ role: 'admin' })
      .then(res => {
        expect(res.body).toEqual({
          _id: userToChangeRole._id.toString(),
          email: userToChangeRole.email,
          role: 'admin',
          myPis: [{ 
            _id: expect.any(String), 
            piNickname: 'userPi' 
          }],
          __v: 0
        });
      });
  });

  it('should throw an error when a user tries to delete a user', async() => {
    const deleteMe = await getUser();

    return userAgent
      .delete(`/api/v1/auth/${deleteMe._id}`)
      .then(res => {
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual('Admin role required.');
      });
  });

  it('should only allow an admin to delete a user', async() => {
    const deleteMe = await getUser();
    return adminAgent
      .delete(`/api/v1/auth/${deleteMe._id}`)
      .then(res => {
        expect(res.body).toEqual({
          _id: deleteMe._id,
          email: deleteMe.email,
          role: 'user',
          myPis: [{ 
            piNickname: 'userPi', 
            _id: expect.any(String) 
          }],
          __v: 0
        });
      });
  });

  it('can verify a logged in user', async() => {
    const user = await getUser({ email: 'user0@tess.com' });
    return userAgent
      .get('/api/v1/auth/verify')
      .then(res => {
        expect(res.body).toEqual({
          _id: expect.any(String),
          email: user.email,
          role: 'user',
          myPis: user.myPis,
          __v: 0
        });
      });
  });
});
