const express = require('express');
const mysql = require('mysql2/promise');
const authRoutes = require('./routes/auth');
const verifyToken = require('./middleware/authMiddleware');
const app = express();
const port = 3333;

app.use(express.json());

// SQL db - simple names for now (or forever)
const pool = mysql.createPool({
    host: 'localhost',
    user: 'griff_app_db',
    password: 'griff',
    database: 'griff_app_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = { app, pool };

const postRoutes = require('./routes/posts');
const usersRoutes = require('./routes/users');

// apply verifyToken and pool middleware to usersRoutes
app.use('/api/users', verifyToken, (req, res, next) => {
    req.pool = pool;
    next();
}, usersRoutes);

// apply verifyToken and pool middleware to postRoutes
app.use('/api/posts', verifyToken, (req, res, next) => {
    req.pool = pool;
    next();
}, postRoutes);

app.use('/uploads', express.static('uploads'));

app.get('/api/protected', verifyToken, (req, res) => {
    res.json({ message: 'Protected route accessed!', user: req.user });
});

// REMINDER: place authRoutes at the bottom
app.use('/api', (req, res, next) => {
    req.pool = pool;
    next();
}, authRoutes);

app.listen(port, '0.0.0.0', () => {
    console.log('Server listening at http://localhost:' + port);
});