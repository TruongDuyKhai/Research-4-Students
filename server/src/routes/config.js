const express = require('express');
const features = require('../config/features');
const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({ data: { features } });
});

module.exports = router;
