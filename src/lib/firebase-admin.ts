import admin from 'firebase-admin';

function getFirebaseAdmin() {
    if (admin.apps.length > 0) {
        return admin.apps[0]!;
    }

    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (!serviceAccountKey) {
        console.error('[Firebase Admin] FIREBASE_SERVICE_ACCOUNT_KEY is not set');
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set');
    }

    try {
        const serviceAccount = JSON.parse(serviceAccountKey);
        
        // Fix: Ensure private_key newlines are actual newlines (env vars may escape them)
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        console.log('[Firebase Admin] Initializing with project:', serviceAccount.project_id);

        return admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    } catch (error) {
        console.error('[Firebase Admin] Failed to initialize:', error);
        throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY format');
    }
}

// Lazy initialization — don't crash at import time
let _app: admin.app.App | null = null;

function getApp(): admin.app.App {
    if (!_app) {
        _app = getFirebaseAdmin();
    }
    return _app;
}

export const getAdminAuth = () => admin.auth(getApp());
export const getAdminDb = () => admin.firestore(getApp());
export default getApp;
