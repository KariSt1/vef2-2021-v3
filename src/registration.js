import express from 'express';
import { body, validationResult } from 'express-validator';
import xss from 'xss';

import { list, insert, countSignatures } from './db.js';
import { catchErrors } from './utils.js';

export const router = express.Router();

/**
 * Ósamstilltur route handler fyrir undirskriftir
 * @param {object} req Request hlutur
 * @param {object} res Response hlutur
 * @returns {string} Undirskriftarsíðu
 */
async function index(req, res) {
  const errors = [];
  const formData = {
    name: '',
    nationalId: '',
    anonymous: false,
    comment: '',
  };

  let { page = 1 } = req.query;
  page = Number(page);

  const registrations = await list(page);
  const totalSignatures = await countSignatures();

  const links = {
    self: {
      href: `/?page=${page}`,
    },
  };

  if (page > 1) {
    links.prev = {
      href: `/?page=${page - 1}`,
    };
  }

  if (registrations.length === 50) {
    links.next = {
      href: `/?page=${page + 1}`,
    };
  }

  const pageCount = {
    currentPage: `${page}`,
    lastPage: `${Math.ceil(totalSignatures.count / 50)}`,
  };

  res.render('index', {
    title: 'Undirskriftarlisti', errors, formData, registrations, links, totalSignatures, pageCount,
  });
}

const nationalIdPattern = '^[0-9]{6}-?[0-9]{4}$';

const validationMiddleware = [
  body('name')
    .isLength({ min: 1 })
    .withMessage('Nafn má ekki vera tómt'),
  body('name')
    .isLength({ max: 128 })
    .withMessage('Nafn má að hámarki vera 128 stafir'),
  body('nationalId')
    .isLength({ min: 1 })
    .withMessage('Kennitala má ekki vera tóm'),
  body('nationalId')
    .matches(new RegExp(nationalIdPattern))
    .withMessage('Kennitala verður að vera á formi 000000-0000 eða 0000000000'),
  body('comment')
    .isLength({ max: 400 })
    .withMessage('Athugasemd má að hámarki vera 400 stafir'),
];

// Viljum keyra sér og með validation, ver gegn „self XSS“
const xssSanitizationMiddleware = [
  body('name').customSanitizer((v) => xss(v)),
  body('nationalId').customSanitizer((v) => xss(v)),
  body('comment').customSanitizer((v) => xss(v)),
  body('anonymous').customSanitizer((v) => xss(v)),
];

const sanitizationMiddleware = [
  body('name').trim().escape(),
  body('nationalId').blacklist('-'),
];

async function validationCheck(req, res, next) {
  const {
    name, nationalId, comment, anonymous,
  } = req.body;

  const formData = {
    name, nationalId, comment, anonymous,
  };

  let { page = 1 } = req.query;
  page = Number(page);

  const registrations = await list(page);
  const totalSignatures = await countSignatures();

  const links = {
    self: {
      href: `/?page=${page}`,
    },
  };

  if (page > 1) {
    links.prev = {
      href: `/?page=${page - 1}`,
    };
  }

  if (registrations.length === 50) {
    links.next = {
      href: `/?page=${page + 1}`,
    };
  }

  const pageCount = {
    currentPage: `${page}`,
    lastPage: `${Math.ceil(totalSignatures.count / 50)}`,
  };

  const validation = validationResult(req);

  if (!validation.isEmpty()) {
    return res.render('index', {
      title: 'Undirskriftarlisti', formData, errors: validation.errors, registrations, links, totalSignatures, pageCount,
    });
  }

  return next();
}

async function register(req, res) {
  const {
    name, nationalId, comment, anonymous,
  } = req.body;

  let success = true;

  try {
    success = await insert({
      name, nationalId, comment, anonymous,
    });
  } catch (e) {
    console.error(e);
  }

  if (success) {
    return res.redirect('/');
  }

  return res.render('error', { title: 'Gat ekki skráð!', text: 'Hafðir þú skrifað undir áður?' });
}

router.get('/', catchErrors(index));

router.post(
  '/',
  validationMiddleware,
  xssSanitizationMiddleware,
  catchErrors(validationCheck),
  sanitizationMiddleware,
  catchErrors(register),
);
