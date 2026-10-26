import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import requireAuth from './middleware/requireAuth.js';
import authRouter from './routes/auth.js';
import clientsRouter from './routes/clients.js';
import dashboardRouter from './routes/dashboard.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const app = express();
const allowedOrigins = new Set(
  (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('This browser origin is not allowed by CLIENT_ORIGIN.'));
  },
}));
app.use(express.json({ limit: '32kb' }));

app.get('/api/health', (_request, response) => {
  const connected = mongoose.connection.readyState === 1;
  response.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'database_unavailable',
    database: connected ? 'connected' : 'disconnected',
  });
});

app.use('/api/auth', authRouter);
app.use('/api/dashboard', requireAuth, dashboardRouter);
app.use('/api/clients', requireAuth, clientsRouter);

app.use((error, _request, response, _next) => {
  if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
    return response.status(400).json({ message: error.message });
  }
  if (error.type === 'entity.parse.failed') {
    return response.status(400).json({ message: 'Request body must contain valid JSON.' });
  }
  console.error('API request failed:', error);
  return response.status(500).json({ message: 'An unexpected server error occurred.' });
});

function getPort() {
  const rawPort = process.env.PORT?.trim() || '5000';
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a whole number between 1 and 65535.');
  }

  return port;
}

function describeConnectionError(error) {
  const details = [
    error.name,
    error.code,
    error.message,
    error.cause?.code,
    error.cause?.message,
  ].filter(Boolean).join(' ').toLowerCase();

  if (details.includes('authentication failed') || details.includes('bad auth')) {
    return 'MongoDB authentication failed. Check the Atlas database username and password in backend/.env. URL-encode special characters in the password.';
  }

  if (details.includes('err_ssl') || details.includes('tls') || details.includes('ssl')) {
    return 'MongoDB TLS handshake failed. Keep TLS enabled; check Atlas Network Access for this computer’s current public IP, confirm the cluster is running, and retry without a VPN, proxy, or network firewall that inspects TLS.';
  }

  if (details.includes('querysrv') || details.includes('enotfound') || details.includes('getaddrinfo')) {
    return 'MongoDB could not resolve the cluster host. Check the Atlas connection string and your network connection.';
  }

  if (details.includes('server selection') || details.includes('timed out') || details.includes('etimeout')) {
    return 'MongoDB connection timed out. Check that the Atlas cluster is running and your current IP address is allowed in Atlas Network Access.';
  }

  return `MongoDB connection failed (${error.name || 'unknown error'}). Check the Atlas connection string, database user, cluster status, and IP access list.`;
}

function isRetryableConnectionError(error) {
  const details = [
    error.name,
    error.code,
    error.message,
    error.cause?.code,
    error.cause?.message,
  ].filter(Boolean).join(' ').toLowerCase();

  if (details.includes('authentication failed') || details.includes('bad auth')) return false;

  return [
    'mongonetworkerror',
    'mongoserverselectionerror',
    'server selection',
    'err_ssl',
    'tls',
    'ssl',
    'econnreset',
    'econnrefused',
    'etimedout',
    'querysrv',
    'enotfound',
    'getaddrinfo',
  ].some((indicator) => details.includes(indicator));
}

async function connectToMongoDB(uri) {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
      return;
    } catch (error) {
      if (!isRetryableConnectionError(error) || attempt === maxAttempts) {
        throw new Error(describeConnectionError(error));
      }

      const delayMs = attempt * 1500;
      console.warn(
        `MongoDB connection attempt ${attempt}/${maxAttempts} failed. Retrying in ${delayMs / 1000} seconds.`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function start() {
  const mongoUri = process.env.MONGODB_URI?.trim();
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not configured. Add your Atlas connection string to backend/.env.');
  }

  if (/<[^>]+>/.test(mongoUri)) {
    throw new Error('MONGODB_URI still contains template placeholders. Replace them with your Atlas database credentials and cluster host in backend/.env.');
  }

  if (!/^mongodb(?:\+srv)?:\/\//i.test(mongoUri)) {
    throw new Error('MONGODB_URI must start with mongodb:// or mongodb+srv://. Check backend/.env.');
  }

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET is missing or too short. Set a private random secret of at least 32 characters in backend/.env.');
  }

  const port = getPort();
  await connectToMongoDB(mongoUri);

  try {
    await new Promise((resolve, reject) => {
      const server = app.listen(port, resolve);
      server.once('error', reject);
    });
  } catch (error) {
    await mongoose.disconnect();
    if (error.code === 'EADDRINUSE') {
      throw new Error(`Port ${port} is already in use. Stop the other process or choose a different PORT in backend/.env.`);
    }
    throw new Error(`Could not start the API listener (${error.code || 'unknown error'}).`);
  }

  console.log(`ClientFlow API listening on http://localhost:${port}`);
  console.log('MongoDB connection established.');
}

start().catch((error) => {
  console.error(`Could not start ClientFlow API: ${error.message}`);
  process.exitCode = 1;
});
