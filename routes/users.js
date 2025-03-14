const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const pool = require('../index').pool;

const storage = multer.diskStorage({
    destination: './uploads/',
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const uploadProfile = multer({ storage: storage }).single('profileImage');

// Profile picture? Stored in SQL as image name (path = ./uploads/profileImage[datetime].[ext])
router.post('/profile-picture', verifyToken, (req, res) => {
    uploadProfile(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a profile picture' });
        }

        try {
            const imagePath = req.file.filename;
            await pool.execute('UPDATE user SET profile_picture = ? WHERE user_id = ?', [imagePath, req.user.userId]);
            res.json({ message: 'Profile picture uploaded successfully!' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Failed to upload profile picture' });
        }
    });
});

// follow user
router.post('/follow/:username', verifyToken, async (req, res) => {
    try {
        const followerId = req.user.userId;
        const usernameToFollow = req.params.username;

        // Get user ID of user to follow
        const [usersToFollow] = await pool.execute('SELECT user_id FROM user WHERE username = ?', [usernameToFollow]);

        if (usersToFollow.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const followingId = usersToFollow[0].user_id;

        // Prevent following yourself
        if (followerId === followingId) {
            return res.status(400).json({ message: 'Cannot follow yourself' });
        }

        const [existingFollow] = await pool.execute('SELECT * FROM follow WHERE follower_id = ? AND following_id = ?', [followerId, followingId]);

        if (existingFollow.length > 0) {
            return res.status(400).json({ message: 'Already following this user' });
        }
        
        // Insert follow record
        await pool.execute('INSERT INTO follow (follower_id, following_id) VALUES (?, ?)', [followerId, followingId]);

        res.json({ message: `Successfully followed ${usernameToFollow}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to follow user' });
    }
});

// unfollow user
router.post('/unfollow/:username', verifyToken, async (req, res) => {
    try {
        const followerId = req.user.userId;
        const usernameToUnfollow = req.params.username;

        // Get the user ID of the user to unfollow
        const [usersToUnfollow] = await pool.execute('SELECT user_id FROM user WHERE username = ?', [usernameToUnfollow]);

        if (usersToUnfollow.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const followingId = usersToUnfollow[0].user_id;

        // Delete follow record
        const [result] = await pool.execute('DELETE FROM follow WHERE follower_id = ? AND following_id = ?', [followerId, followingId]);

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: 'Not following this user' });
        }

        res.json({ message: `Successfully unfollowed ${usernameToUnfollow}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to unfollow user' });
    }
});

// get profile of given user
router.get('/:username', verifyToken, async (req, res) => {
    try {
        const username = req.params.username;
        const [users] = await pool.execute('SELECT user_id, username, profile_picture FROM user WHERE username = ?', [username]);

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        const user = users[0];
        if(user.profile_picture){
            user.profile_picture = 'your_server_ip:3333/uploads/'+ user.profile_picture;
        }

        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to get user profile' });
    }
});

// get posts from given user
router.get('/:username/posts', verifyToken, async (req, res) => {
    try {
        const username = req.params.username;
        const [users] = await pool.execute('SELECT user_id FROM user WHERE username = ?', [username]);

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userId = users[0].user_id;
        const [posts] = await pool.execute('SELECT * FROM post WHERE user_id = ?', [userId]);

        res.json(posts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to get user posts' });
    }
});

module.exports = router;