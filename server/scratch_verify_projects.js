require('dotenv').config();
const { usersDb, moderationDb, communityDb } = require('./src/db/connections');
const { signToken } = require('./src/utils/jwt');

async function runVerification() {
  console.log('--- Starting Group Projects API Verification ---');
  
  // 1. Ensure Student A and Student B exist in the database
  let studentA = usersDb.prepare("SELECT * FROM users WHERE email = ?").get('student_a@fpt.edu.vn');
  if (!studentA) {
    console.log('Student A not found. Creating a new test student...');
    usersDb.prepare(`
      INSERT INTO users (role, email, username, display_name, status)
      VALUES ('student', 'student_a@fpt.edu.vn', 'studenta', 'Student A', 'active')
    `).run();
    studentA = usersDb.prepare("SELECT * FROM users WHERE email = ?").get('student_a@fpt.edu.vn');
  } else if (studentA.status === 'banned') {
    usersDb.prepare("UPDATE users SET status = 'active' WHERE id = ?").run(studentA.id);
    studentA.status = 'active';
  }

  let studentB = usersDb.prepare("SELECT * FROM users WHERE email = ?").get('student_b@fpt.edu.vn');
  if (!studentB) {
    console.log('Student B not found. Creating a new test student...');
    usersDb.prepare(`
      INSERT INTO users (role, email, username, display_name, status)
      VALUES ('student', 'student_b@fpt.edu.vn', 'studentb', 'Student B', 'active')
    `).run();
    studentB = usersDb.prepare("SELECT * FROM users WHERE email = ?").get('student_b@fpt.edu.vn');
  } else if (studentB.status === 'banned') {
    usersDb.prepare("UPDATE users SET status = 'active' WHERE id = ?").run(studentB.id);
    studentB.status = 'active';
  }

  console.log(`Student A: ID ${studentA.id}, username: ${studentA.username}`);
  console.log(`Student B: ID ${studentB.id}, username: ${studentB.username}`);

  // Generate tokens
  const tokenA = signToken({ id: studentA.id, role: studentA.role, username: studentA.username });
  const tokenB = signToken({ id: studentB.id, role: studentB.role, username: studentB.username });

  // 2. Clean up previous test data
  console.log('Cleaning up previous test data for clean state...');
  moderationDb.prepare("DELETE FROM action_logs WHERE user_id IN (?, ?)").run(studentA.id, studentB.id);
  
  // Find projects owned by Student A
  const ownedProjects = communityDb.prepare("SELECT id FROM projects WHERE owner_id = ?").all(studentA.id);
  for (const proj of ownedProjects) {
    communityDb.prepare("DELETE FROM posts WHERE project_id = ?").run(proj.id);
    communityDb.prepare("DELETE FROM project_members WHERE project_id = ?").run(proj.id);
    communityDb.prepare("DELETE FROM project_invites WHERE project_id = ?").run(proj.id);
    communityDb.prepare("DELETE FROM projects WHERE id = ?").run(proj.id);
  }
  
  // Clear any stray invites for Student B
  communityDb.prepare("DELETE FROM project_invites WHERE invited_user_id = ?").run(studentB.id);
  console.log('Clean up completed.');

  const API_URL = 'http://localhost:4000/api';

  async function apiRequest(token, method, endpoint, body = null) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    if (body) {
      options.body = JSON.stringify(body);
    }
    const res = await fetch(`${API_URL}${endpoint}`, options);
    const data = await res.json();
    return { status: res.status, data };
  }

  // Step 1: Student A creates a project (POST /projects)
  console.log('\n--- Step 1: Student A creates a project ---');
  const projectPayload = {
    name: 'Advanced Coding Group',
    description: 'A research project collaborating on AI agent architectures.',
    visibility: 'public'
  };
  const createProjRes = await apiRequest(tokenA, 'POST', '/community/projects', projectPayload);
  console.log('POST /community/projects Response:', JSON.stringify(createProjRes, null, 2));

  if (createProjRes.status !== 201) {
    throw new Error(`Failed to create project. Status: ${createProjRes.status}`);
  }
  const projectId = createProjRes.data.data.id;
  console.log(`Created Project ID: ${projectId}`);

  // Step 2: Student A invites Student B (POST /projects/:id/invite)
  console.log('\n--- Step 2: Student A invites Student B by username ---');
  const invitePayload = { username: 'studentb' };
  const inviteRes = await apiRequest(tokenA, 'POST', `/community/projects/${projectId}/invite`, invitePayload);
  console.log('POST /community/projects/:id/invite Response:', JSON.stringify(inviteRes, null, 2));

  if (inviteRes.status !== 201) {
    throw new Error(`Failed to invite user. Status: ${inviteRes.status}`);
  }

  // Step 3: Student B retrieves pending invites (GET /projects/invites/me)
  console.log('\n--- Step 3: Student B checks their invitations ---');
  const checkInvitesRes = await apiRequest(tokenB, 'GET', '/community/projects/invites/me');
  console.log('GET /community/projects/invites/me Response:', JSON.stringify(checkInvitesRes, null, 2));

  if (checkInvitesRes.status !== 200) {
    throw new Error(`Failed to retrieve invites. Status: ${checkInvitesRes.status}`);
  }
  const invites = checkInvitesRes.data.data;
  if (!invites || invites.length === 0) {
    throw new Error('Expected at least one pending invitation for Student B');
  }
  const inviteId = invites[0].id;
  console.log(`Found Invite ID: ${inviteId}`);

  // Step 4: Student B accepts the invitation (POST /projects/invites/:id/respond)
  console.log('\n--- Step 4: Student B accepts the invitation ---');
  const respondPayload = { action: 'accept' };
  const respondRes = await apiRequest(tokenB, 'POST', `/community/projects/invites/${inviteId}/respond`, respondPayload);
  console.log(`POST /community/projects/invites/${inviteId}/respond Response:`, JSON.stringify(respondRes, null, 2));

  if (respondRes.status !== 200) {
    throw new Error(`Failed to respond to invite. Status: ${respondRes.status}`);
  }

  // Step 5: Verify members list (GET /projects/:id)
  console.log('\n--- Step 5: Verify Student B is listed in the project members ---');
  const getProjRes = await apiRequest(tokenA, 'GET', `/community/projects/${projectId}`);
  console.log('GET /community/projects/:id Response:', JSON.stringify(getProjRes, null, 2));

  if (getProjRes.status !== 200) {
    throw new Error(`Failed to retrieve project details. Status: ${getProjRes.status}`);
  }
  const members = getProjRes.data.data.members;
  const isBInMembers = members.some(m => m.username === 'studentb' && m.role === 'member');
  if (!isBInMembers) {
    throw new Error('Student B was not found in the project members list');
  }
  console.log('SUCCESS: Student B is listed as a member in the project!');

  // Step 6: Student B creates a post inside the project (POST /projects/:id/posts)
  console.log('\n--- Step 6: Student B creates a post inside the project ---');
  const postPayload = {
    title: 'Collaborative Notes',
    content: 'Here are the notes from our brainstorming session on AI memory structures.',
    tags: ['ai', 'brainstorm', 'notes']
  };
  const createPostRes = await apiRequest(tokenB, 'POST', `/community/projects/${projectId}/posts`, postPayload);
  console.log('POST /community/projects/:id/posts Response:', JSON.stringify(createPostRes, null, 2));

  if (createPostRes.status !== 201) {
    throw new Error(`Failed to create post within project. Status: ${createPostRes.status}`);
  }
  console.log('SUCCESS: Student B successfully created a post inside the project!');

  // Step 7: Retrieve project posts to verify (GET /projects/:id/posts)
  console.log('\n--- Step 7: Retrieve and verify posts under the project ---');
  const getPostsRes = await apiRequest(tokenB, 'GET', `/community/projects/${projectId}/posts`);
  console.log('GET /community/projects/:id/posts Response:', JSON.stringify(getPostsRes, null, 2));

  if (getPostsRes.status !== 200) {
    throw new Error(`Failed to retrieve project posts. Status: ${getPostsRes.status}`);
  }
  console.log('\n--- Group Projects API Verification Completed Successfully! ---');
}

runVerification().catch(err => {
  console.error('\n Verification failed:', err.message);
  process.exit(1);
});
