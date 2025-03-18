const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const verifyToken = require('../middleware/authMiddleware');
const pool = require('../index').pool;


// Initialize multer - currently stored in /uploads/
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 }, // 10MB limit
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
}).single('image');

// Only allow image types
function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}

// get posts from follower list
router.get('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const [posts] = await pool.execute(`
            SELECT p.*, u.username
            FROM post p
            JOIN user u ON p.user_id = u.user_id
            WHERE p.user_id IN (
                SELECT following_id
                FROM follow
                WHERE follower_id = ?
            )
            OR p.user_id = ?
            ORDER BY p.timestamp DESC
            `, [userId, userId]);

            res.json(posts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to retrieve posts' });
    }
});

// Upload image call
router.post('/', (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Please upload an image' });
        }

        try {
            const { caption } = req.body;
            console.log("req.body: ", req.body)
            const imagePath = req.file.filename; // Store filename in DB
            console.log("req.file: ", req.file.filename);
            const [result] = await req.pool.execute('INSERT INTO post (user_id, image_path, caption) VALUES (?, ?, ?)', [req.user.userId, imagePath, caption]);
            res.status(201).json({ message: 'Post created successfully!' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Failed to create post' });
        }
    });
});

module.exports = router;