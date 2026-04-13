import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use initializeFirestore with long polling to bypass potential websocket restrictions in iframes
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId || '(default)');

// Test connection to Firestore
async function testConnection() {
  try {
    console.log('Testing Firestore connection with Project ID:', firebaseConfig.projectId);
    await getDocFromServer(doc(db, '_test_connection_', 'ping'));
    console.log('Firestore connection successful');
  } catch (error: any) {
    console.error('Firestore Connection Test Failed:', error.message);
    if (error.message && error.message.includes('the client is offline')) {
      console.error('CRITICAL: Firestore is offline. This usually means:');
      console.error('1. The Project ID or API Key in firebase-applet-config.json is incorrect.');
      console.error('2. The Firestore database has not been created in the Firebase Console.');
      console.error('3. The database is in a region that is currently unreachable.');
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const message = error instanceof Error ? error.message : String(error);
  
  if (message.includes('the client is offline')) {
    console.error('CRITICAL: Firestore is offline. This usually means the Firebase Project ID or API Key in firebase-applet-config.json is incorrect, or the database has not been created in the Firebase Console.');
  }

  const errInfo: FirestoreErrorInfo = {
    error: message,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
