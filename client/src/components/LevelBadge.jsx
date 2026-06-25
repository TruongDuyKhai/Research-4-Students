import React from 'react';
import './LevelBadge.css';

const LEVEL_LABELS = ['Công khai', 'Lv.1', 'Lv.2', 'Lv.3', 'Lv.4', 'Lv.5'];
const LEVEL_THRESHOLDS = [0, 50, 200, 500, 1000];

export function getLevel(points) {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (points >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return level;
}

const LevelBadge = ({ level, size = 'sm', showLabel = true }) => {
  // level=0: public content, don't show badge
  if (level == null || level < 1) return null;
  return (
    <span className={`level-badge level-badge--${size} level-badge--lv${level}`}>
      {showLabel ? LEVEL_LABELS[level] : level}
    </span>
  );
};

export default LevelBadge;
