import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Client from '../models/Client.js';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

async function migrate() {
  if (process.env.MIGRATE_UNOWNED_CLIENTS !== 'true') {
    throw new Error('This migration assigns every unowned client to one account. Review your data, then set MIGRATE_UNOWNED_CLIENTS=true to confirm.');
  }
  const email = process.env.MIGRATION_OWNER_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error('Set MIGRATION_OWNER_EMAIL to the account that should own the existing unowned clients.');
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing from backend/.env.');

  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const user = await User.findOne({ email }).select('_id').lean();
    if (!user) throw new Error('No account with MIGRATION_OWNER_EMAIL exists. Register that account before migrating legacy clients.');
    const result = await Client.updateMany({ owner: { $exists: false } }, { $set: { owner: user._id } });
    console.log(`Assigned ${result.modifiedCount} previously unowned client(s) to the specified account.`);
  } finally {
    await mongoose.disconnect();
  }
}

migrate().catch((error) => {
  console.error(`Legacy client migration stopped: ${error.message}`);
  process.exitCode = 1;
});
