import faker from 'faker';
import { readFile } from 'fs/promises';
import { query, end } from './db.js';

const schemaFile = './sql/schema.sql';

/**
 * Býr til random 10 stafa kennitölu
 */
function makeID() {
  let id = '';
  const numbers = '0123456789';
  for (let i = 0; i < 10; i++) { // eslint-disable-line
    id += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  return id;
}

/**
 * Býr til n undirskriftir og setur þær í gagnagrunninn
 * @param {int} n Fjöldi undirskrifta
 */
async function mock(n) {
  for (let i = 0; i < n; i++) { // eslint-disable-line
    const name = faker.name.findName();
    const nationalId = makeID();
    let comment = '';
    let anonymous = false;
    if (Math.random() >= 0.5) {
      comment = faker.lorem.sentence();
      anonymous = true;
    }
    const twoWeeksAgo = new Date(Date.now() - 12096e5); // 12096e5 is two weeks in milliseconds
    const signed = faker.date.between(twoWeeksAgo, new Date());

    const q = `
      INSERT INTO signatures
        (name, nationalId, comment, anonymous, signed)
      VALUES
        ($1, $2, $3, $4, $5);
    `;
    const values = [name, nationalId, comment, anonymous, signed];

    try {
      await query(q, values); // eslint-disable-line
    } catch (e) {
      console.error('Error inserting signature', e);
    }
  }
}

async function create() {
  const data = await readFile(schemaFile);

  await query(data.toString('utf-8'));

  await mock(500);

  await end();

  console.info('Schema created');
}

create().catch((err) => {
  console.error('Error creating schema', err);
});
