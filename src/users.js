import bcrypt from 'bcrypt';
import { query } from './db.js';

/**
 * Ber saman innslegið lykilorð við raunverulegt lykilorð
 * @param {string} password Lykilorð sem notandi skrifaði
 * @param {string} hash Hashað rétt lykilorð
 * @returns {boolean} Hvort lykilorð sé rétt eða ekki
 */
export async function comparePasswords(password, hash) {
  const result = await bcrypt.compare(password, hash);
  return result;
}

/**
 * Finnur notanda eftir notendanafni
 * @param {string} username Innslegið notendanafn
 * @returns {user} Skilar notanda ef hann fannst
 */
export async function findByUsername(username) {
  const q = 'SELECT * FROM users WHERE username = $1';
  try {
    const result = await query(q, [username]);

    if (result.rowCount === 1) {
      return result.rows[0];
    }
  } catch (e) {
    console.error('Gat ekki fundið notanda eftir notendnafni');
    return null;
  }

  return false;
}

/**
 * Finnur notanda eftir auðkenni
 * @param {int} id Auðkenni notenda
 * @returns {user} Skilar notanda ef hann fannst
 */
export async function findById(id) {
  const q = 'SELECT * FROM users WHERE id = $1';

  try {
    const result = await query(q, [id]);

    if (result.rowCount === 1) {
      return result.rows[0];
    }
  } catch (e) {
    console.error('Gat ekki fundið notanda eftir id');
  }

  return null;
}
