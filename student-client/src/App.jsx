import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from './config';
import StudentList from './components/StudentList';
import StudentForm from './components/StudentForm';

export default function App() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [editingStudent, setEditingStudent] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // Fetch all students from REST API
  const fetchStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/students`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Student records not found.');
        }
        throw new Error(`Server returned HTTP ${response.status}`);
      }
      const data = await response.json();
      setStudents(data);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Unable to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleOpenAddForm = () => {
    setEditingStudent(null);
    setShowForm(true);
    setError('');
    setSuccessMessage('');
  };

  const handleOpenEditForm = async (student) => {
    setError('');
    setSuccessMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/students/${student.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError(`Student with ID ${student.id} not found.`);
        } else {
          setError(`Unable to load student details (HTTP ${response.status}).`);
        }
        return;
      }
      const data = await response.json();
      setEditingStudent(data);
      setShowForm(true);
    } catch (err) {
      console.error('Fetch student by ID error:', err);
      setError('Unable to load data. Please try again.');
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingStudent(null);
  };

  // Handle Save (Add or Update)
  const handleSaveStudent = async (studentData) => {
    setError('');
    setSuccessMessage('');

    const isEdit = !!editingStudent;
    const url = isEdit
      ? `${API_BASE_URL}/students/${editingStudent.id}`
      : `${API_BASE_URL}/students`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(studentData)
      });

      const responseData = await response.json();

      if (!response.ok) {
        if (response.status === 400) {
          setError(responseData.message || 'Validation failed. Please check input parameters.');
        } else if (response.status === 404) {
          setError('Student not found.');
        } else {
          setError('Unable to save student data. Please try again.');
        }
        return;
      }

      setSuccessMessage(
        isEdit
          ? `Student (ID: ${editingStudent.id}) updated successfully!`
          : `New Student (ID: ${responseData.id}) created successfully!`
      );
      setShowForm(false);
      setEditingStudent(null);
      fetchStudents();
    } catch (err) {
      console.error('Save error:', err);
      setError('Unable to load data. Please try again.');
    }
  };

  // Handle Delete
  const handleDeleteStudent = async (id) => {
    if (!window.confirm(`Are you sure you want to delete Student ID ${id}?`)) {
      return;
    }

    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/students/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError('Student not found.');
        } else {
          setError('Unable to delete student. Please try again.');
        }
        return;
      }

      setSuccessMessage(`Student ID ${id} deleted successfully.`);
      fetchStudents();
    } catch (err) {
      console.error('Delete error:', err);
      setError('Unable to load data. Please try again.');
    }
  };

  return (
    <div className="container">
      <header>
        <div>
          <h1>Student Management Portal</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
            Lab 4 — Full-Stack Integration (React ↔ Express ↔ MongoDB Atlas)
          </p>
        </div>
        {!showForm && (
          <button className="btn btn-primary" onClick={handleOpenAddForm}>
            + Add Student
          </button>
        )}
      </header>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
          <button className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => setError('')}>Dismiss</button>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
          <span>{successMessage}</span>
          <button className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => setSuccessMessage('')}>Dismiss</button>
        </div>
      )}

      {showForm && (
        <StudentForm
          initialData={editingStudent}
          onSave={handleSaveStudent}
          onCancel={handleCancelForm}
        />
      )}

      {loading ? (
        <div className="loading-state">
          <p>Loading students...</p>
        </div>
      ) : (
        <StudentList
          students={students}
          onEdit={handleOpenEditForm}
          onDelete={handleDeleteStudent}
        />
      )}
    </div>
  );
}
