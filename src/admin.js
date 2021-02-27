import express from 'express';
import passport from './login.js';
import { catchErrors } from './utils.js';
import { query, list, countSignatures } from './db.js';

export const router = express.Router();

async function admin(req, res) {
  const { username } = req.user;

  let { page = 1 } = req.query;
  page = Number(page);

  const registrations = await list(page);
  const totalSignatures = await countSignatures();

  const links = {
    self: {
      href: `/admin/?page=${page}`,
    },
  };

  if (page > 1) {
    links.prev = {
      href: `/admin/?page=${page - 1}`,
    };
  }

  if (registrations.length === 50) {
    links.next = {
      href: `/admin/?page=${page + 1}`,
    };
  }

  const pageCount = {
    currentPage: `${page}`,
    lastPage: `${Math.ceil(totalSignatures.count / 50)}`,
  };

  res.render('admin', {
    title: 'Undirskriftarlisti - Umsjón', username, registrations, links, totalSignatures, pageCount,
  });
}

async function login(req, res) {
  let failureMessage = '';
  if (typeof req.session.messages !== 'undefined') {
    failureMessage = req.session.messages[0]; // eslint-disable-line
    req.session.messages = [];
  }

  res.render('login', {
    title: 'Innskráning',
    username: '',
    password: '',
    failureMessage,
  });
}

async function deleteSignature(req, res) {
  const { id } = req.params;
  query('DELETE FROM signatures WHERE ID=$1', [id]);
  res.redirect('/admin');
}

async function ensureLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  return res.redirect('/admin/login');
}

router.get('/', ensureLoggedIn, catchErrors(admin));

router.get('/login', catchErrors(login));

router.post(
  '/login',
  passport.authenticate('local', {
    failureMessage: 'Notendanafn eða lykilorð vitlaust.',
    failureRedirect: '/admin/login',
  }),
  (req, res) => {
    res.redirect('/admin');
  },
);

router.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

router.post('/delete/:id', ensureLoggedIn, catchErrors(deleteSignature));
