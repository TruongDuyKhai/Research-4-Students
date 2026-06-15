const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');
const { uploadFile, getFileById, refreshFileUrl } = require('../services/discordStorage');
const features = require('../config/features');

const router = express.Router();
const maxUploadSizeMb = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '10', 10);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxUploadSizeMb * 1024 * 1024
  }
}).single('file');

const VALID_PURPOSES = ['avatar', 'post_attachment', 'article_pdf', 'guide_doc', 'resource_icon'];
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const PDF_TYPES = ['application/pdf'];

/**
 * POST /api/files/upload
 * Protect route with authentication, accept a single file upload, validate size, mimetype, and purpose.
 */
router.post('/upload', requireAuth, (req, res, next) => {
  if (!features.discordStorage) {
    return res.status(503).json({
      error: { code: 'FEATURE_DISABLED', message: 'File uploads are not configured on this server yet.' }
    });
  }
  upload(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            error: {
              code: 'FILE_TOO_LARGE',
              message: `Max ${maxUploadSizeMb}MB`
            }
          });
        }
        return res.status(400).json({
          error: {
            code: 'UPLOAD_ERROR',
            message: err.message
          }
        });
      }
      return next(err);
    }

    const { purpose } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'No file provided under field name "file"'
        }
      });
    }

    if (!purpose || !VALID_PURPOSES.includes(purpose)) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: `Invalid or missing purpose. Must be one of: ${VALID_PURPOSES.join(', ')}`
        }
      });
    }

    // Validate mime types matching upload purposes
    let isValidType = false;
    if (['avatar', 'resource_icon', 'post_attachment'].includes(purpose)) {
      isValidType = IMAGE_TYPES.includes(file.mimetype);
    } else if (['article_pdf', 'guide_doc'].includes(purpose)) {
      isValidType = PDF_TYPES.includes(file.mimetype);
    }

    if (!isValidType) {
      return res.status(400).json({
        error: {
          code: 'INVALID_FILE_TYPE',
          message: `Mime type "${file.mimetype}" is not permitted for purpose "${purpose}".`
        }
      });
    }

    try {
      const dbRecord = await uploadFile({
        buffer: file.buffer,
        filename: file.originalname,
        mimetype: file.mimetype,
        purpose,
        uploaderId: req.user.id
      });

      return res.status(201).json({
        data: dbRecord
      });
    } catch (uploadError) {
      console.error('Discord storage upload failure:', uploadError.message);
      return res.status(500).json({
        error: {
          code: 'UPLOAD_FAILED',
          message: 'Failed to upload file to Discord CDN storage'
        }
      });
    }
  });
});

/**
 * GET /api/files/:id
 * Retrieve details of a file, automatically refreshing URL from Discord if expired.
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    let file = getFileById(id);
    if (!file) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'File not found'
        }
      });
    }

    // Verify CDN URL expiry status
    const now = new Date();
    const isExpired = file.cdn_url_expires_at && new Date(file.cdn_url_expires_at) <= now;
    if (isExpired) {
      try {
        await refreshFileUrl(file);
        file = getFileById(file.id);
      } catch (refreshError) {
        console.error(`Failed to refresh expired CDN URL for file ID ${file.id}:`, refreshError.message);
      }
    }

    return res.status(200).json({
      data: {
        id: file.id,
        cdn_url: file.cdn_url,
        mime_type: file.mime_type,
        purpose: file.purpose,
        original_name: file.original_name
      }
    });
  } catch (error) {
    console.error('File retrieval error:', error.message);
    return res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while retrieving the file'
      }
    });
  }
});

module.exports = router;
