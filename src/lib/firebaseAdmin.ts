import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
} from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import type { NextFunction, Request, Response } from 'express';

let adminApp: App | undefined;

function getFirebaseAdminApp(): App {
  if (adminApp) return adminApp;

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const credential = serviceAccountJson
    ? cert(JSON.parse(serviceAccountJson))
    : applicationDefault();

  adminApp =
    getApps()[0] ??
    initializeApp({
      credential,
      ...(projectId ? { projectId } : {}),
    });

  return adminApp;
}

export function requireFirebaseUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authorization = req.header('authorization');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    res.status(401).json({ success: false, error: 'Sign in is required to edit rhythms' });
    return;
  }

  let auth;
  try {
    auth = getAuth(getFirebaseAdminApp());
  } catch (error) {
    console.error('Firebase Admin authentication is not configured:', error);
    res.status(503).json({ success: false, error: 'Rhythm editing is not configured' });
    return;
  }

  void auth
    .verifyIdToken(token)
    .then((decoded: DecodedIdToken) => {
      res.locals.firebaseUser = decoded;
      next();
    })
    .catch((error: unknown) => {
      console.warn('Rejected invalid Firebase ID token:', error);
      res.status(401).json({ success: false, error: 'Sign in is required to edit rhythms' });
    });
}
