import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require('./luloyorg-firebase-adminsdk-h6m0t-0c59f44f31.json'))
  });
}

export default admin;
