require('dotenv').config();
const dns = require('dns');
try {
  dns.setDefaultResultOrder('ipv4first');
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {}

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/student_db';

// Enable CORS for frontend clients (React on port 5173, Android emulator on 10.0.2.2, etc.)
app.use(cors());

// Use express.json() for JSON body parsing
app.use(express.json());

// Handle invalid JSON body syntax
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Invalid JSON body syntax'
    });
  }
  next(err);
});

// MongoDB Atlas Mongoose Connection & Schema
const studentSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  course: { type: String, required: true, trim: true },
  semester: { type: Number, required: true, min: 1 }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      delete ret._id;
      delete ret.__v;
      delete ret.createdAt;
      delete ret.updatedAt;
      return ret;
    }
  }
});

const StudentModel = mongoose.model('Student', studentSchema);

// Mongoose Connection to MongoDB Atlas
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log(`[MongoDB] Connected successfully to MongoDB Atlas database`);
  })
  .catch((err) => {
    console.error(`[MongoDB] Connection error: ${err.message}`);
  });

// Validation helper function
function validateStudent(data) {
  const errors = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    errors.push('Name is required and cannot be empty.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || typeof data.email !== 'string' || !emailRegex.test(data.email.trim())) {
    errors.push('A valid email address is required.');
  }

  if (!data.course || typeof data.course !== 'string' || data.course.trim() === '') {
    errors.push('Course is required and cannot be empty.');
  }

  if (
    data.semester === undefined ||
    data.semester === null ||
    typeof data.semester !== 'number' ||
    !Number.isInteger(data.semester) ||
    data.semester <= 0
  ) {
    errors.push('Semester is required and must be a valid positive integer.');
  }

  return errors;
}

// Swagger / OpenAPI Specification
const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'RESTful Student Management API — Lab 4',
    version: '2.0.0',
    description: 'Express.js RESTful Web Service for Student Management backed by MongoDB Atlas.'
  },
  servers: [
    {
      url: `http://localhost:${PORT}`,
      description: 'Local Express Server'
    }
  ],
  paths: {
    '/students': {
      get: {
        summary: 'Get all students',
        description: 'Returns a list of all registered students from MongoDB Atlas.',
        responses: {
          '200': { description: 'List of students retrieved successfully' },
          '500': { description: 'Internal Server Error' }
        }
      },
      post: {
        summary: 'Create a new student',
        description: 'Validates input data and creates a new student record in MongoDB Atlas.',
        responses: {
          '201': { description: 'Student created successfully' },
          '400': { description: 'Bad Request - Validation or Duplicate Email' },
          '500': { description: 'Internal Server Error' }
        }
      }
    },
    '/students/{id}': {
      get: {
        summary: 'Get student by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'Student found' },
          '404': { description: 'Not Found' }
        }
      },
      put: {
        summary: 'Update student by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'Student updated' },
          '400': { description: 'Validation failed' },
          '404': { description: 'Not Found' }
        }
      },
      delete: {
        summary: 'Delete student by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'Student deleted successfully' },
          '404': { description: 'Not Found' }
        }
      }
    }
  }
};

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Route: GET /students
app.get('/students', async (req, res, next) => {
  try {
    const students = await StudentModel.find({}, '-_id -__v -createdAt -updatedAt').sort({ id: 1 });
    return res.status(200).json(students);
  } catch (err) {
    next(err);
  }
});

// Route: GET /students/:id
app.get('/students/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Student ID must be a valid integer'
      });
    }

    const student = await StudentModel.findOne({ id }, '-_id -__v -createdAt -updatedAt');
    if (!student) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Student with ID ${id} not found`
      });
    }
    return res.status(200).json(student);
  } catch (err) {
    next(err);
  }
});

// Route: POST /students
app.post('/students', async (req, res, next) => {
  try {
    const validationErrors = validateStudent(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: validationErrors.join(' ')
      });
    }

    const emailTrimmed = req.body.email.trim().toLowerCase();

    // Check for duplicate email constraint
    const existingEmail = await StudentModel.findOne({ email: emailTrimmed });
    if (existingEmail) {
      return res.status(400).json({
        error: 'Validation failed',
        message: `Email address '${emailTrimmed}' is already registered.`
      });
    }

    // Generate next numeric ID
    const maxStudent = await StudentModel.findOne().sort({ id: -1 });
    const newId = maxStudent ? maxStudent.id + 1 : 1;

    const newStudentDoc = new StudentModel({
      id: newId,
      name: req.body.name.trim(),
      email: emailTrimmed,
      course: req.body.course.trim(),
      semester: req.body.semester
    });

    const savedStudent = await newStudentDoc.save();
    return res.status(201).json(savedStudent.toJSON());
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Duplicate key error: email address already exists in database.'
      });
    }
    next(err);
  }
});

// Route: PUT /students/:id
app.put('/students/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Student ID must be a valid integer'
      });
    }

    const validationErrors = validateStudent(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: validationErrors.join(' ')
      });
    }

    const emailTrimmed = req.body.email.trim().toLowerCase();

    const student = await StudentModel.findOne({ id });
    if (!student) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Student with ID ${id} not found`
      });
    }

    // Check unique email conflict with another student
    const duplicateEmail = await StudentModel.findOne({ email: emailTrimmed, id: { $ne: id } });
    if (duplicateEmail) {
      return res.status(400).json({
        error: 'Validation failed',
        message: `Email address '${emailTrimmed}' is already in use by another student.`
      });
    }

    student.name = req.body.name.trim();
    student.email = emailTrimmed;
    student.course = req.body.course.trim();
    student.semester = req.body.semester;

    const updatedStudent = await student.save();
    return res.status(200).json(updatedStudent.toJSON());
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Duplicate key error: email address already exists in database.'
      });
    }
    next(err);
  }
});

// Route: DELETE /students/:id
app.delete('/students/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Student ID must be a valid integer'
      });
    }

    const deletedStudent = await StudentModel.findOneAndDelete({ id });
    if (!deletedStudent) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Student with ID ${id} not found`
      });
    }
    return res.status(200).json({ message: `Student with ID ${id} deleted successfully` });
  } catch (err) {
    next(err);
  }
});

// 404 Route Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// General 500 Internal Server Error Handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected server error occurred'
  });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Express Student API server running at http://0.0.0.0:${PORT} (accessible via http://localhost:${PORT})`);
  console.log(`Swagger UI documentation available at http://localhost:${PORT}/api-docs`);
});
