require('dotenv').config();
const { usersDb, moderationDb, communityDb } = require('./src/db/connections');

async function runVerification() {
  console.log('--- Starting Admin API Verification ---');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@research4student.io.vn';
  const adminPassword = process.env.ADMIN_PASSWORD || 'change-me-please';
  const API_URL = 'http://localhost:4000/api';

  // 1. Authenticate as Admin
  console.log(`Authenticating as Admin (${adminEmail})...`);
  const adminLoginRes = await fetch(`${API_URL}/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword })
  });
  const adminLoginData = await adminLoginRes.json();
  
  if (adminLoginRes.status !== 200) {
    throw new Error(`Admin authentication failed. Status: ${adminLoginRes.status}, Error: ${JSON.stringify(adminLoginData)}`);
  }
  const adminToken = adminLoginData.data.token;
  console.log('Admin authenticated successfully.');

  // Clean up any existing teacher with the test email
  console.log('Cleaning up previous test teacher records...');
  const existingTeacher = usersDb.prepare("SELECT id FROM users WHERE email = ?").get('test_teacher_moderation@fpt.edu.vn');
  if (existingTeacher) {
    usersDb.prepare("DELETE FROM teacher_profiles WHERE user_id = ?").run(existingTeacher.id);
    usersDb.prepare("DELETE FROM users WHERE id = ?").run(existingTeacher.id);
  }
  console.log('Clean up completed.');

  // 2. Admin creates a new Teacher (POST /teachers)
  console.log('\n--- Step 2: Admin creates a new Teacher ---');
  const teacherPayload = {
    email: 'test_teacher_moderation@fpt.edu.vn',
    display_name: 'Test Teacher Moderation',
    employee_code: 'TCH002',
    department: 'Software Engineering',
    username: 'testteacher'
  };
  const createTeacherRes = await fetch(`${API_URL}/admin/teachers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify(teacherPayload)
  });
  const createTeacherData = await createTeacherRes.json();
  console.log('POST /admin/teachers Response:', JSON.stringify(createTeacherData, null, 2));

  if (createTeacherRes.status !== 201) {
    throw new Error(`Failed to create teacher. Status: ${createTeacherRes.status}`);
  }
  const tempPassword = createTeacherData.data.tempPassword;
  const teacherId = createTeacherData.data.user.id;
  console.log(`Created Teacher ID: ${teacherId}, tempPassword: ${tempPassword}`);

  // 3. Login as Teacher using temporary password (POST /auth/teacher/login)
  console.log('\n--- Step 3: Login as Teacher using temporary password ---');
  const loginTempRes = await fetch(`${API_URL}/auth/teacher/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: teacherPayload.email, password: tempPassword })
  });
  const loginTempData = await loginTempRes.json();
  console.log('POST /auth/teacher/login (Temp) Response:', JSON.stringify(loginTempData, null, 2));

  if (loginTempRes.status !== 200) {
    throw new Error(`Failed to login with temporary password. Status: ${loginTempRes.status}`);
  }
  if (loginTempData.data.mustChangePassword !== true) {
    throw new Error('Expected mustChangePassword to be true');
  }
  const teacherToken = loginTempData.data.token;
  console.log('Teacher successfully logged in with mustChangePassword = true.');

  // 4. Teacher changes password (POST /auth/change-password)
  console.log('\n--- Step 4: Teacher changes password to new password ---');
  const changePasswordPayload = {
    currentPassword: tempPassword,
    newPassword: 'NewSecurePassword123!'
  };
  const changePasswordRes = await fetch(`${API_URL}/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${teacherToken}`
    },
    body: JSON.stringify(changePasswordPayload)
  });
  const changePasswordData = await changePasswordRes.json();
  console.log('POST /auth/change-password Response:', JSON.stringify(changePasswordData, null, 2));

  if (changePasswordRes.status !== 200) {
    throw new Error(`Failed to change password. Status: ${changePasswordRes.status}`);
  }

  // 5. Login again with new password (POST /auth/teacher/login)
  console.log('\n--- Step 5: Login again with new password ---');
  const loginNewRes = await fetch(`${API_URL}/auth/teacher/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: teacherPayload.email, password: 'NewSecurePassword123!' })
  });
  const loginNewData = await loginNewRes.json();
  console.log('POST /auth/teacher/login (New) Response:', JSON.stringify(loginNewData, null, 2));

  if (loginNewRes.status !== 200) {
    throw new Error(`Failed to login with new password. Status: ${loginNewRes.status}`);
  }
  if (loginNewData.data.mustChangePassword === true) {
    throw new Error('Expected mustChangePassword to be false now');
  }
  console.log('SUCCESS: Teacher successfully logged in using new password!');

  // 6. Test other Admin moderation endpoints
  console.log('\n--- Step 6: Testing Admin Blacklist and Hiding Endpoints ---');
  
  // A. Add a banned keyword (POST /admin/banned-keywords)
  const bannedKeywordPayload = { keyword: 'badword123', match_type: 'contains' };
  const addKeywordRes = await fetch(`${API_URL}/admin/banned-keywords`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify(bannedKeywordPayload)
  });
  const addKeywordData = await addKeywordRes.json();
  console.log('POST /admin/banned-keywords Response:', JSON.stringify(addKeywordData, null, 2));
  if (addKeywordRes.status !== 201) {
    throw new Error(`Failed to add banned keyword. Status: ${addKeywordRes.status}`);
  }
  const keywordId = addKeywordData.data.id;

  // B. List banned keywords (GET /admin/banned-keywords)
  const getKeywordsRes = await fetch(`${API_URL}/admin/banned-keywords`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const getKeywordsData = await getKeywordsRes.json();
  console.log('GET /admin/banned-keywords count:', getKeywordsData.data.length);

  // C. Delete banned keyword (DELETE /admin/banned-keywords/:id)
  const delKeywordRes = await fetch(`${API_URL}/admin/banned-keywords/${keywordId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log('DELETE /admin/banned-keywords/:id Status:', delKeywordRes.status);
  if (delKeywordRes.status !== 200) {
    throw new Error(`Failed to delete banned keyword. Status: ${delKeywordRes.status}`);
  }

  // D. Hide a post (PATCH /admin/community/posts/:id/hide)
  // Ensure we have a post to hide. Let's insert a temporary post into communityDb
  const dummyPostInfo = communityDb.prepare(`
    INSERT INTO posts (author_id, title, content, status)
    VALUES (1, 'Dummy title', 'Dummy content', 'visible')
  `).run();
  const dummyPostId = dummyPostInfo.lastInsertRowid;

  const hidePostRes = await fetch(`${API_URL}/admin/community/posts/${dummyPostId}/hide`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const hidePostData = await hidePostRes.json();
  console.log(`PATCH /admin/community/posts/${dummyPostId}/hide Response:`, JSON.stringify(hidePostData, null, 2));

  // Clean up the dummy post
  communityDb.prepare("DELETE FROM posts WHERE id = ?").run(dummyPostId);

  console.log('\n--- Admin API Verification Completed Successfully! ---');
}

runVerification().catch(err => {
  console.error('\n Verification failed:', err.message);
  process.exit(1);
});
