/**
 * Lab 9 - Generative AI Service Express Router
 * 
 * Exposes application routes:
 * - POST /api/ai/generate (Academic content generation and structured summarization)
 * - POST /api/ai/compare  (Basic vs Improved prompt side-by-side comparison)
 * - GET  /api/ai/tasks    (Supported tasks and operational limits)
 */

const express = require('express');
const router = express.Router();
const {
  SUPPORTED_TASKS,
  validateGenerateRequest,
  validateCompareRequest
} = require('../schemas/ai.schema');
const {
  sanitizeMessage,
  generateAIResult,
  comparePrompts
} = require('../services/ai.service');

const getMaxInputLength = () => parseInt(process.env.MAX_INPUT_LENGTH || '2000', 10);

/**
 * POST /generate
 * Generates structured academic summaries, explanations, key points, or FAQs.
 */
router.post('/generate', async (req, res, next) => {
  try {
    const maxLen = getMaxInputLength();
    const validation = validateGenerateRequest(req.body, maxLen);

    if (!validation.isValid) {
      return res.status(validation.statusCode || 400).json({
        success: false,
        error: 'Validation Error',
        message: validation.error,
        statusCode: validation.statusCode || 400
      });
    }

    const result = await generateAIResult({
      task: validation.task,
      input: validation.input,
      options: req.body.options || {}
    });

    return res.status(200).json(result);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    const errorType = err.code || 'AI_SERVICE_ERROR';
    console.error(`[AI Service Error] ${req.method} ${req.originalUrl} failed: ${sanitizeMessage(err.message)} [status: ${statusCode}]`);
    return res.status(statusCode).json({
      success: false,
      error: errorType,
      message: sanitizeMessage(err.message),
      statusCode
    });
  }
});

/**
 * POST /compare
 * Side-by-side execution comparing Basic Prompt baseline against Improved Prompt.
 */
router.post('/compare', async (req, res, next) => {
  try {
    const maxLen = getMaxInputLength();
    const validation = validateCompareRequest(req.body, maxLen);

    if (!validation.isValid) {
      return res.status(validation.statusCode || 400).json({
        success: false,
        error: 'Validation Error',
        message: validation.error,
        statusCode: validation.statusCode || 400
      });
    }

    const task = (req.body.task && typeof req.body.task === 'string' && SUPPORTED_TASKS.includes(req.body.task.toLowerCase()))
      ? req.body.task.toLowerCase()
      : 'summarize';

    const result = await comparePrompts({
      input: validation.input,
      task
    });

    return res.status(200).json(result);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    const errorType = err.code || 'AI_SERVICE_ERROR';
    console.error(`[AI Service Error] ${req.method} ${req.originalUrl} failed: ${sanitizeMessage(err.message)} [status: ${statusCode}]`);
    return res.status(statusCode).json({
      success: false,
      error: errorType,
      message: sanitizeMessage(err.message),
      statusCode
    });
  }
});

/**
 * GET /tasks
 * Metadata describing supported tasks, parameter rules, and current model.
 */
router.get('/tasks', (req, res) => {
  return res.status(200).json({
    success: true,
    service: 'ai-service',
    supported_tasks: SUPPORTED_TASKS,
    task_descriptions: {
      summarize: 'Generate concise factual summary under 120 words with key takeaways.',
      explain: 'Explain technical concepts in accessible language with educational analogies.',
      key_points: 'Extract between 3 and 5 key bullet points or principles from study material.',
      faq: 'Formulate frequently asked revision questions and answers grounded strictly in text.'
    },
    constraints: {
      max_input_length: getMaxInputLength(),
      timeout_ms: parseInt(process.env.AI_TIMEOUT_MS || '30000', 10),
      model: process.env.AI_MODEL || 'gemini-3.8-flash'
    }
  });
});

module.exports = router;

