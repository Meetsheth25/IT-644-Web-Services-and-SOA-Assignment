import React, { useState, useEffect } from 'react';

export default function StudentForm({ initialData, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    course: '',
    semester: 1
  });
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        email: initialData.email || '',
        course: initialData.course || '',
        semester: initialData.semester || 1
      });
    } else {
      setFormData({
        name: '',
        email: '',
        course: '',
        semester: 1
      });
    }
    setValidationError('');
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'semester' ? (parseInt(value, 10) || '') : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    // Client-side validation rules
    if (!formData.name || formData.name.trim() === '') {
      setValidationError('Name is required and cannot be empty.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email.trim())) {
      setValidationError('A valid email address is required (e.g. user@domain.com).');
      return;
    }

    if (!formData.course || formData.course.trim() === '') {
      setValidationError('Course is required and cannot be empty.');
      return;
    }

    const sem = parseInt(formData.semester, 10);
    if (isNaN(sem) || sem <= 0) {
      setValidationError('Semester must be a positive integer greater than 0.');
      return;
    }

    onSave({
      ...formData,
      name: formData.name.trim(),
      email: formData.email.trim(),
      course: formData.course.trim(),
      semester: sem
    });
  };

  return (
    <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
      <div className="card-title" style={{ padding: '0 0 12px 0', backgroundColor: 'transparent' }}>
        {initialData ? `Edit Student (ID: ${initialData.id})` : 'Add New Student'}
      </div>

      {validationError && (
        <div className="alert alert-error">
          <span>{validationError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Full Name</label>
          <input
            id="name"
            type="text"
            name="name"
            className="form-control"
            placeholder="e.g. Aarav Patel"
            value={formData.name}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            name="email"
            className="form-control"
            placeholder="e.g. aarav@example.com"
            value={formData.email}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="course">Course / Department</label>
          <input
            id="course"
            type="text"
            name="course"
            className="form-control"
            placeholder="e.g. Computer Science"
            value={formData.course}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="semester">Academic Semester</label>
          <input
            id="semester"
            type="number"
            name="semester"
            min="1"
            max="12"
            className="form-control"
            placeholder="e.g. 5"
            value={formData.semester}
            onChange={handleChange}
          />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {initialData ? 'Save Changes' : 'Create Student'}
          </button>
        </div>
      </form>
    </div>
  );
}
