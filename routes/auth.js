const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');


// Register user
router.post('/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const [existingUsers] = await req.pool.execute('SELECT * FROM user WHERE username = ? OR email = ?', [username, email]);

        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }

        const [result] = await req.pool.execute('INSERT INTO user (username, password, email) VALUES (?, ?, ?)', [username, hashedPassword, email]);
        res.status(201).json({ message: 'User registered successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Registration failed!' });
    }
});

module.exports = router;

const jwt = require('jsonwebtoken');


// Login call
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const [users] = await req.pool.execute('SELECT * FROM user WHERE username = ?', [username]);

        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = users[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.user_id, username: user.username }, '07042000', { expiresIn: '1h' });

        res.json({ message: 'Login successful!', token: token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Login failed!' });
    }
});