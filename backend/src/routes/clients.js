import { Router } from 'express';
import mongoose from 'mongoose';
import Client, { CLIENT_STATUSES, LEAD_SOURCES } from '../models/Client.js';

const router = Router();
const editableFields = [
  'name', 'company', 'email', 'phone', 'status', 'source', 'dealValue',
  'expectedCloseDate', 'followUpDate', 'followUpCompleted', 'notes',
];

function getClientFilter(request) {
  const filter = { owner: request.user.id };
  const { q, status, source } = request.query;
  if (status && status !== 'All clients') {
    if (!CLIENT_STATUSES.includes(status)) throw new Error('Invalid status filter.');
    filter.status = status;
  }
  if (source && source !== 'All sources') {
    if (!LEAD_SOURCES.includes(source)) throw new Error('Invalid source filter.');
    filter.source = source;
  }
  if (typeof q === 'string' && q.trim()) {
    const escaped = q.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = ['name', 'company', 'email'].map((field) => ({ [field]: { $regex: escaped, $options: 'i' } }));
  }
  return filter;
}

function getPagination(value, fallback) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error('Pagination values must be positive whole numbers.');
  return parsed;
}

function sendCsv(response, clients) {
  const columns = [
    ['Name', 'name'], ['Company', 'company'], ['Email', 'email'], ['Phone', 'phone'],
    ['Status', 'status'], ['Lead source', 'source'], ['Deal value', 'dealValue'],
    ['Expected close date', 'expectedCloseDate'], ['Follow-up date', 'followUpDate'],
    ['Follow-up completed', 'followUpCompleted'], ['Notes', 'notes'], ['Created at', 'createdAt'],
  ];
  const escapeCell = (value) => {
    let text = value instanceof Date ? value.toISOString() : String(value ?? '');
    if (!(value instanceof Date) && typeof value !== 'number' && typeof value !== 'boolean' && /^[\s]*[=+\-@]/.test(text)) {
      text = `'${text}`;
    }
    return `"${text.replaceAll('"', '""')}"`;
  };
  const rows = [columns.map(([label]) => escapeCell(label)).join(',')];
  for (const client of clients) {
    rows.push(columns.map(([, field]) => escapeCell(client[field])).join(','));
  }
  response
    .set('Content-Type', 'text/csv; charset=utf-8')
    .set('Content-Disposition', 'attachment; filename="clientflow-clients.csv"')
    .send(`\uFEFF${rows.join('\r\n')}`);
}

router.get('/export', async (request, response, next) => {
  try {
    const filter = getClientFilter(request);
    const clients = await Client.find(filter).sort({ updatedAt: -1 }).lean();
    return sendCsv(response, clients);
  } catch (error) {
    if (error.message.startsWith('Invalid ') || error.message.startsWith('Pagination ')) {
      return response.status(400).json({ message: error.message });
    }
    return next(error);
  }
});

router.get('/', async (request, response, next) => {
  try {
    const filter = getClientFilter(request);
    const page = getPagination(request.query.page, 1);
    const limit = Math.min(getPagination(request.query.limit, 10), 100);
    const sort = request.query.sort === 'oldest' ? { updatedAt: 1, _id: 1 } : { updatedAt: -1, _id: -1 };
    const [clients, total] = await Promise.all([
      Client.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
      Client.countDocuments(filter),
    ]);
    return response.json({ clients, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    if (error.message.startsWith('Invalid ') || error.message.startsWith('Pagination ')) {
      return response.status(400).json({ message: error.message });
    }
    return next(error);
  }
});

router.get('/:id', async (request, response, next) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(400).json({ message: 'Invalid client ID.' });
  }
  try {
    const client = await Client.findOne({ _id: request.params.id, owner: request.user.id }).lean();
    if (!client) return response.status(404).json({ message: 'Client not found.' });
    return response.json(client);
  } catch (error) {
    return next(error);
  }
});

router.post('/', async (request, response, next) => {
  try {
    const fields = Object.fromEntries(editableFields.filter((field) => field in request.body).map((field) => [field, request.body[field]]));
    const client = await Client.create({
      ...fields,
      owner: request.user.id,
      activity: [{ type: 'created', message: 'Client added to your workspace.' }],
    });
    return response.status(201).json(client);
  } catch (error) {
    return next(error);
  }
});

router.put('/:id', async (request, response, next) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(400).json({ message: 'Invalid client ID.' });
  }
  try {
    const client = await Client.findOne({ _id: request.params.id, owner: request.user.id });
    if (!client) return response.status(404).json({ message: 'Client not found.' });

    const fields = editableFields.filter((field) => field in request.body);
    if (!fields.length) return response.status(400).json({ message: 'Provide at least one editable client field.' });
    const previousStatus = client.status;
    for (const field of fields) client.set(field, request.body[field] === '' && ['expectedCloseDate', 'followUpDate'].includes(field) ? null : request.body[field]);

    if (previousStatus !== client.status) {
      client.activity.push({ type: 'status', message: `Status changed from ${previousStatus} to ${client.status}.` });
    }
    client.activity.push({ type: 'updated', message: 'Client details updated.' });
    await client.save();
    return response.json(client);
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/activity', async (request, response, next) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(400).json({ message: 'Invalid client ID.' });
  }
  const message = typeof request.body.message === 'string' ? request.body.message.trim() : '';
  if (!message || message.length > 500) {
    return response.status(400).json({ message: 'Activity note must be between 1 and 500 characters.' });
  }
  try {
    const client = await Client.findOne({ _id: request.params.id, owner: request.user.id });
    if (!client) return response.status(404).json({ message: 'Client not found.' });
    client.activity.push({ type: 'note', message });
    await client.save();
    return response.status(201).json(client.activity.at(-1));
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id/follow-up', async (request, response, next) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(400).json({ message: 'Invalid client ID.' });
  }
  if (typeof request.body.completed !== 'boolean') {
    return response.status(400).json({ message: 'Follow-up completion must be true or false.' });
  }
  try {
    const client = await Client.findOne({ _id: request.params.id, owner: request.user.id });
    if (!client) return response.status(404).json({ message: 'Client not found.' });
    client.followUpCompleted = request.body.completed;
    client.activity.push({
      type: 'follow-up',
      message: request.body.completed ? 'Follow-up marked complete.' : 'Follow-up marked incomplete.',
    });
    await client.save();
    return response.json(client);
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', async (request, response, next) => {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(400).json({ message: 'Invalid client ID.' });
  }
  try {
    const client = await Client.findOneAndDelete({ _id: request.params.id, owner: request.user.id });
    if (!client) return response.status(404).json({ message: 'Client not found.' });
    return response.status(204).end();
  } catch (error) {
    return next(error);
  }
});

export default router;
