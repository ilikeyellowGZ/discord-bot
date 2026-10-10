import mongoose from 'mongoose';

import { env } from '../config/env.js';

export async function connectDatabase() {
  if (!env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured.');
  }

  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    autoIndex: true,
  });

  return mongoose;
}

export function getDatabaseStatus() {
  return {
    connected: mongoose.connection.readyState === 1,
    state: mongoose.connection.readyState,
  };
}
