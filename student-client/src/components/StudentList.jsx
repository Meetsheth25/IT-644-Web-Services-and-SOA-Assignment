import React from 'react';

export default function StudentList({ students, onEdit, onDelete }) {
  if (!students || students.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <p>No students found. Click "Add Student" to create a record.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Course</th>
              <th>Semester</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td><strong>{student.id}</strong></td>
                <td>{student.name}</td>
                <td>{student.email}</td>
                <td>{student.course}</td>
                <td>
                  <span className="badge">Semester {student.semester}</span>
                </td>
                <td>
                  <button
                    className="btn btn-edit"
                    onClick={() => onEdit(student)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-delete"
                    onClick={() => onDelete(student.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
