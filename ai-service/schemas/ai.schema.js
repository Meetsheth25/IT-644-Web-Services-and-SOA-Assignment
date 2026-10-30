/**
 * Lab 9 - Generative AI Request and Response Validation Schemas
 * 
 * Enforces strict input validation, task whitelisting, non-empty text checks,
 * length limits, and validates structured JSON output from the AI provider.
 */

const SUPPORTED_TASKS = ['summarize', 'explain', 'key_points', 'faq'];

/**
 * Validates request payload for POST /api/ai/generate
 * 
 * @param {object} body - Request body
 * @param {number} maxInputLength - Maximum allowed character length
 * @returns {{ isValid: boolean, error?: string, statusCode: number }}
 */
function validateGenerateRequest(body, maxInputLength = 2000) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      error: 'Request body must be a valid JSON object.',
      statusCode: 400
    };
  }

  // 1. Check required fields existence
  if (!('task' in body) || !('input' in body)) {
    return {
      isValid: false,
      error: "Both 'task' and 'input' are required fields.",
      statusCode: 400
    };
  }

  // 2. Validate 'task' type and value
  if (typeof body.task !== 'string' || body.task.trim() === '') {
    return {
      isValid: false,
      error: "'task' must be a non-empty string.",
      statusCode: 400
    };
  }

  const normalizedTask = body.task.trim().toLowerCase();
  if (!SUPPORTED_TASKS.includes(normalizedTask)) {
    return {
      isValid: false,
      error: `Unsupported task '${body.task}'. Supported tasks are: ${SUPPORTED_TASKS.join(', ')}.`,
      statusCode: 400
    };
  }

  // 3. Validate 'input' type, whitespace, and length
  if (typeof body.input !== 'string') {
    return {
      isValid: false,
      error: "'input' must be a string.",
      statusCode: 400
    };
  }

  if (body.input.trim().length === 0) {
    return {
      isValid: false,
      error: "'input' cannot be empty or whitespace only.",
      statusCode: 400
    };
  }

  if (body.input.length > maxInputLength) {
    return {
      isValid: false,
      error: `'input' length (${body.input.length} characters) exceeds maximum allowed limit of ${maxInputLength} characters.`,
      statusCode: 400
    };
  }

  return {
    isValid: true,
    task: normalizedTask,
    input: body.input.trim()
  };
}

/**
 * Validates request payload for POST /api/ai/compare
 * 
 * @param {object} body - Request body
 * @param {number} maxInputLength - Maximum allowed character length
 * @returns {{ isValid: boolean, error?: string, statusCode: number }}
 */
function validateCompareRequest(body, maxInputLength = 2000) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      error: 'Request body must be a valid JSON object.',
      statusCode: 400
    };
  }

  if (!('input' in body)) {
    return {
      isValid: false,
      error: "'input' is a required field.",
      statusCode: 400
    };
  }

  if (typeof body.input !== 'string' || body.input.trim().length === 0) {
    return {
      isValid: false,
      error: "'input' cannot be empty or whitespace only.",
      statusCode: 400
    };
  }

  if (body.input.length > maxInputLength) {
    return {
      isValid: false,
      error: `'input' length (${body.input.length} characters) exceeds maximum allowed limit of ${maxInputLength} characters.`,
      statusCode: 400
    };
  }

  return {
    isValid: true,
    input: body.input.trim()
  };
}

/**
 * Validates that model output strictly conforms to the expected structured schema.
 * Rejects malformed or incomplete output without silently converting it.
 * 
 * @param {any} parsedData - Parsed JSON returned by model
 * @returns {{ isValid: boolean, error?: string }}
 */
function validateOutputSchema(parsedData) {
  if (!parsedData || typeof parsedData !== 'object' || Array.isArray(parsedData)) {
    return {
      isValid: false,
      error: 'Model output is not a valid JSON object.'
    };
  }

  // Required keys: title, summary, key_points
  if (!parsedData.title || typeof parsedData.title !== 'string' || parsedData.title.trim() === '') {
    return {
      isValid: false,
      error: "Model output is missing a valid non-empty 'title' string."
    };
  }

  if (!parsedData.summary || typeof parsedData.summary !== 'string' || parsedData.summary.trim() === '') {
    return {
      isValid: false,
      error: "Model output is missing a valid non-empty 'summary' string."
    };
  }

  if (!Array.isArray(parsedData.key_points) || parsedData.key_points.length === 0) {
    return {
      isValid: false,
      error: "Model output is missing a valid 'key_points' array with at least one item."
    };
  }

  const allStrings = parsedData.key_points.every(item => typeof item === 'string' && item.trim().length > 0);
  if (!allStrings) {
    return {
      isValid: false,
      error: "All items in 'key_points' must be non-empty strings."
    };
  }

  return {
    isValid: true
  };
}

module.exports = {
  SUPPORTED_TASKS,
  validateGenerateRequest,
  validateCompareRequest,
  validateOutputSchema
};

