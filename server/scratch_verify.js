require('dotenv').config();
const { usersDb, moderationDb, communityDb } = require('./src/db/connections');
const { signToken } = require('./src/utils/jwt');

async function runVerification() {
  console.log('--- Starting Community API Verification ---');
  
  // 1. Ensure a test student user exists in the database
  let testUser = usersDb.prepare("SELECT * FROM users WHERE email = ?").get('test_student@fpt.edu.vn');
  if (!testUser) {
    console.log('Test user not found. Creating a new test student...');
    usersDb.prepare(`
      INSERT INTO users (role, email, username, display_name, status)
      VALUES ('student', 'test_student@fpt.edu.vn', 'teststudent', 'Test Student', 'active')
    `).run();
    testUser = usersDb.prepare("SELECT * FROM users WHERE email = ?").get('test_student@fpt.edu.vn');
  } else {
    // If user is banned, unban them for the test
    if (testUser.status === 'banned') {
      usersDb.prepare("UPDATE users SET status = 'active' WHERE id = ?").run(testUser.id);
      testUser.status = 'active';
    }
    console.log(`Using existing test user: ID ${testUser.id}, username: ${testUser.username}`);
  }

  // Generate JWT token
  const token = signToken({ id: testUser.id, role: testUser.role, username: testUser.username });
  console.log('JWT Token generated successfully.');

  // Clean up any action logs and previous posts/comments for this user to ensure clean test state
  console.log('Cleaning up previous action logs and test data to avoid state issues...');
  moderationDb.prepare("DELETE FROM action_logs WHERE user_id = ?").run(testUser.id);
  // Optional: Clean up posts and comments created by this user
  communityDb.prepare("DELETE FROM posts WHERE author_id = ?").run(testUser.id);
  communityDb.prepare("DELETE FROM comments WHERE author_id = ?").run(testUser.id);
  communityDb.prepare("DELETE FROM reactions WHERE user_id = ?").run(testUser.id);
  moderationDb.prepare("DELETE FROM reports WHERE reporter_id = ?").run(testUser.id);
  console.log('Clean up completed.');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const API_URL = 'http://localhost:4000/api';

  // Helper for fetch post/get
  async function apiRequest(method, endpoint, body = null) {
    const options = {
      method,
      headers
    };
    if (body) {
      options.body = JSON.stringify(body);
    }
    const res = await fetch(`${API_URL}${endpoint}`, options);
    const data = await res.json();
    return { status: res.status, data };
  }

  // Step 1: Create a post (POST /posts)
  console.log('\n--- Step 1: Creating a post ---');
  const postPayload = {
    title: 'Self-directed learning in IT research',
    content: 'Exploring how university students can effectively structure their self-directed research projects.',
    tags: ['education', 'research', 'self-study']
  };
  const createPostRes = await apiRequest('POST', '/community/posts', postPayload);
  console.log('POST /community/posts Response:', JSON.stringify(createPostRes, null, 2));
  
  if (createPostRes.status !== 201) {
    throw new Error(`Failed to create post. Status: ${createPostRes.status}`);
  }
  const postId = createPostRes.data.data.id;
  console.log(`Created Post ID: ${postId}`);

  // Step 2: Create a comment on the post (POST /posts/:id/comments)
  console.log('\n--- Step 2: Creating a comment on the post ---');
  const commentPayload = {
    content: 'This is a very insightful post. I have a question regarding time management.'
  };
  const createCommentRes = await apiRequest('POST', `/community/posts/${postId}/comments`, commentPayload);
  console.log(`POST /community/posts/${postId}/comments Response:`, JSON.stringify(createCommentRes, null, 2));

  if (createCommentRes.status !== 201) {
    throw new Error(`Failed to create comment. Status: ${createCommentRes.status}`);
  }
  const commentId = createCommentRes.data.data.id;
  console.log(`Created Comment ID: ${commentId}`);

  // Step 3: Create a reply for the comment (POST /posts/:id/comments with parent_comment_id)
  console.log('\n--- Step 3: Creating a reply for the comment ---');
  // Clear the comment_create cooldown so we can comment again immediately
  moderationDb.prepare("DELETE FROM action_logs WHERE user_id = ? AND action_type = 'comment_create'").run(testUser.id);

  const replyPayload = {
    content: 'Excellent question! I usually allocate 2 hours every morning before class.',
    parent_comment_id: commentId
  };
  const createReplyRes = await apiRequest('POST', `/community/posts/${postId}/comments`, replyPayload);
  console.log(`POST /community/posts/${postId}/comments (Reply) Response:`, JSON.stringify(createReplyRes, null, 2));

  if (createReplyRes.status !== 201) {
    throw new Error(`Failed to create reply comment. Status: ${createReplyRes.status}`);
  }
  const replyId = createReplyRes.data.data.id;
  console.log(`Created Reply Comment ID: ${replyId}`);

  // Step 4: React to the post (POST /reactions)
  console.log('\n--- Step 4: Reacting to the post ---');
  const reactPayload = {
    target_type: 'post',
    target_id: postId,
    type: 'like'
  };
  const reactRes = await apiRequest('POST', '/community/reactions', reactPayload);
  console.log('POST /community/reactions Response:', JSON.stringify(reactRes, null, 2));

  if (reactRes.status !== 200) {
    throw new Error(`Failed to react to post. Status: ${reactRes.status}`);
  }

  // Step 5: Report the comment (POST /reports)
  console.log('\n--- Step 5: Reporting the comment ---');
  const reportPayload = {
    target_type: 'comment',
    target_id: replyId,
    reason: 'Off-topic discussion'
  };
  const reportRes = await apiRequest('POST', '/community/reports', reportPayload);
  console.log('POST /community/reports Response:', JSON.stringify(reportRes, null, 2));

  if (reportRes.status !== 201) {
    throw new Error(`Failed to report comment. Status: ${reportRes.status}`);
  }

  // Step 6: Call POST /posts a second time within 60s -> expect 429 COOLDOWN
  console.log('\n--- Step 6: Creating a second post within 60 seconds (expecting 429 COOLDOWN) ---');
  const secondPostPayload = {
    title: 'A second post too quickly',
    content: 'This post should be blocked by cooldown middleware.'
  };
  const secondPostRes = await apiRequest('POST', '/community/posts', secondPostPayload);
  console.log('POST /community/posts (Second) Response:', JSON.stringify(secondPostRes, null, 2));

  if (secondPostRes.status === 429 && secondPostRes.data.error && secondPostRes.data.error.code === 'COOLDOWN') {
    console.log('\n SUCCESS: Cooldown rate limit successfully triggered (429 COOLDOWN received).');
  } else {
    throw new Error(`Expected 429 COOLDOWN, but received Status: ${secondPostRes.status}`);
  }

  console.log('\n--- Verification completed successfully! ---');
}

runVerification().catch(err => {
  console.error('\n Verification failed:', err.message);
  process.exit(1);
});
