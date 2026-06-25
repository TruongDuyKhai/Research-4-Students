const LEVEL_THRESHOLDS = [0, 50, 200, 500, 1000];

function getLevel(points) {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (points >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    }
  }
  return level;
}

function getNextLevelThreshold(points) {
  const level = getLevel(points);
  return level < LEVEL_THRESHOLDS.length ? LEVEL_THRESHOLDS[level] : null;
}

function addStudentPoints(usersDb, userId, points) {
  usersDb.prepare(
    `UPDATE users SET level_points = level_points + ?, updated_at = datetime('now')
     WHERE id = ? AND role = 'student'`
  ).run(points, userId);
}

module.exports = { LEVEL_THRESHOLDS, getLevel, getNextLevelThreshold, addStudentPoints };
