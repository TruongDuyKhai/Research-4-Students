const express = require("express");
const router = express.Router();
const { db } = require("../config/db");
const { authenticateToken } = require("../middleware/auth");

// GET /api/posts - Fetch all feed posts (Public)
router.get("/", (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Try extracting access token silently if present to show 'liked' status
    let currentUserId = null;
    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
            const jwt = require("jsonwebtoken");
            const token = authHeader.split(" ")[1];
            const decoded = jwt.verify(
                token,
                process.env.ACCESS_TOKEN_SECRET || "your_access_secret_here",
            );
            currentUserId = decoded.id;
        } catch (_) {}
    }

    try {
        const posts = db
            .prepare(
                `
      SELECT p.*, u.full_name, u.username, u.avatar, u.role,
             (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id) as comments_count,
             (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?) as liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `,
            )
            .all(currentUserId || 0, limit, offset);

        res.json(posts);
    } catch (err) {
        console.error("Error fetching feed posts:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// GET /api/posts/trending - Fetch trending tags based on database posts (Public)
router.get("/trending", (req, res) => {
    try {
        const trending = db
            .prepare(
                `
      SELECT tag, COUNT(*) as posts_count 
      FROM posts 
      WHERE tag IS NOT NULL AND tag != '' AND tag != 'General'
      GROUP BY tag 
      ORDER BY posts_count DESC 
      LIMIT 5
    `,
            )
            .all();
        res.json(trending);
    } catch (err) {
        console.error("Trending tags error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// GET /api/posts/top-members - Fetch top members with most contributions (Public)
router.get("/top-members", (req, res) => {
    try {
        // Only count real posts — users with 0 posts are excluded by INNER JOIN
        // Exclude admin accounts from featured members
        const topMembers = db.prepare(`
      SELECT u.id, u.full_name, u.username, u.role, u.avatar,
             COUNT(p.id) as posts_count
      FROM users u
      INNER JOIN posts p ON u.id = p.user_id
      WHERE u.role != 'admin'
      GROUP BY u.id
      ORDER BY posts_count DESC
      LIMIT 5
    `).all();

        // Fallback: show most recently joined non-admin users (with real 0 count)
        if (topMembers.length === 0) {
            const defaultMembers = db.prepare(`
        SELECT id, full_name, username, role, avatar
        FROM users
        WHERE role != 'admin'
        ORDER BY created_at DESC
        LIMIT 3
      `).all();
            return res.json(defaultMembers.map((m) => ({ ...m, posts_count: 0 })));
        }

        res.json(topMembers);
    } catch (err) {
        console.error("Top members error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// POST /api/posts - Create a new post (Protected)
router.post("/", authenticateToken, (req, res) => {
    const { content, tag } = req.body;
    const userId = req.user.id;

    if (!content || content.trim() === "") {
        return res.status(400).json({ error: "Content is required." });
    }

    try {
        const result = db
            .prepare(
                `
      INSERT INTO posts (user_id, content, tag, likes)
      VALUES (?, ?, ?, 0)
    `,
            )
            .run(userId, content.trim(), tag || "General");

        const newPost = db
            .prepare(
                `
      SELECT p.*, u.full_name, u.username, u.avatar, u.role,
             0 as comments_count, 0 as liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `,
            )
            .get(result.lastInsertRowid);

        res.status(201).json(newPost);
    } catch (err) {
        console.error("Create post error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// POST /api/posts/:id/like - Toggle like on a post (Protected)
router.post("/:id/like", authenticateToken, (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id;

    try {
        // Check if liked already
        const checkLiked = db
            .prepare(
                "SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?",
            )
            .get(postId, userId);

        let liked = false;
        db.transaction(() => {
            if (checkLiked) {
                db.prepare("DELETE FROM post_likes WHERE id = ?").run(
                    checkLiked.id,
                );
                db.prepare(
                    "UPDATE posts SET likes = MAX(0, likes - 1) WHERE id = ?",
                ).run(postId);
            } else {
                db.prepare(
                    "INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)",
                ).run(postId, userId);
                db.prepare(
                    "UPDATE posts SET likes = likes + 1 WHERE id = ?",
                ).run(postId);
                liked = true;

                // Optionally send notification to the post author
                const post = db
                    .prepare("SELECT user_id FROM posts WHERE id = ?")
                    .get(postId);
                if (post && post.user_id !== userId) {
                    db.prepare(
                        `
            INSERT INTO notifications (user_id, type, message, ref_id)
            VALUES (?, 'comment', ?, ?)
          `,
                    ).run(
                        post.user_id,
                        `${req.user.fullName} liked your post.`,
                        postId,
                    );
                }
            }
        })();

        const updatedPost = db
            .prepare("SELECT likes FROM posts WHERE id = ?")
            .get(postId);
        res.json({ liked, likes: updatedPost ? updatedPost.likes : 0 });
    } catch (err) {
        console.error("Like toggle error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// DELETE /api/posts/:id - Delete a post (Protected)
router.delete("/:id", authenticateToken, (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    try {
        const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(postId);
        if (!post) {
            return res.status(404).json({ error: "Post not found." });
        }

        // Allow author or admin
        if (post.user_id !== userId && userRole !== "admin") {
            return res
                .status(403)
                .json({ error: "Forbidden. You do not own this post." });
        }

        db.prepare("DELETE FROM posts WHERE id = ?").run(postId);
        res.json({ message: "Post deleted successfully." });
    } catch (err) {
        console.error("Delete post error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
