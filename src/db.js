import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const {
  DATABASE_URL: connectionString,
  NODE_ENV: nodeEnv = 'development',
} = process.env;

// Notum SSL tengingu við gagnagrunn ef við erum *ekki* í development mode, þ.e.a.s. á local vél
const ssl = nodeEnv !== 'development' ? { rejectUnauthorized: false } : false;

const pool = new pg.Pool({ connectionString, ssl });

pool.on('error', (err) => {
  console.error('Villa í tengingu við gagnagrunn, forrit hættir', err);
  process.exit(-1);
});

export async function query(_query, values = []) {
  const client = await pool.connect();

  try {
    const result = await client.query(_query, values);
    return result;
  } finally {
    client.release();
  }
}

/**
 * Insert a single registration into the registration table.
 *
 * @param {string} entry.name – Name of registrant
 * @param {string} entry.nationalId – National ID of registrant
 * @param {string} entry.comment – Comment, if any from registrant
 * @param {boolean} entry.anonymous – If the registrants name should be displayed or not
 * @returns {Promise<boolean>} Promise, resolved as true if inserted, otherwise false
 */
export async function insert({
  name, nationalId, comment, anonymous,
} = {}) {
  let success = true;

  const q = `
    INSERT INTO signatures
      (name, nationalId, comment, anonymous)
    VALUES
      ($1, $2, $3, $4);
  `;
  const values = [name, nationalId, comment, anonymous === 'on'];

  try {
    await query(q, values);
  } catch (e) {
    console.error('Error inserting signature', e);
    success = false;
  }

  return success;
}

/**
 * List 50 registrations from the registration table beginning at offset*limit.
 *
 * @returns {Promise<Array<list>>} Promise, resolved to array of all registrations.
 */
export async function list(page) {
  let result = [];
  const offset = (page - 1) * 50;
  try {
    const queryResult = await query(
      'SELECT id, name, nationalId, comment, anonymous, signed FROM signatures ORDER BY signed DESC OFFSET $1 LIMIT $2',
      [offset, 50],
    );
    if (queryResult && queryResult.rows) {
      result = queryResult.rows;
    }
  } catch (e) {
    console.error('Error selecting signatures', e);
  }

  return result;
}

export async function countSignatures() {
  let result;

  try {
    const queryResult = await query('SELECT COUNT(*) AS count FROM signatures');
    if (queryResult && queryResult.rows[0]) {
      result = queryResult.rows[0]; // eslint-disable-line
    }
  } catch (e) {
    console.error('Error counting signatures', e);
  }

  return result;
}

// Helper to remove pg from the event loop
export async function end() {
  await pool.end();
}
