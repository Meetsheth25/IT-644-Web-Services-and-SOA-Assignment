package com.example.studentclient

import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.example.studentclient.model.ErrorResponse
import com.example.studentclient.model.Student
import com.example.studentclient.network.RetrofitClient
import com.google.gson.Gson
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class AddStudentActivity : AppCompatActivity() {

    private lateinit var etName: EditText
    private lateinit var etEmail: EditText
    private lateinit var etCourse: EditText
    private lateinit var etSemester: EditText
    private lateinit var btnSubmit: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_add_student)

        etName = findViewById(R.id.etName)
        etEmail = findViewById(R.id.etEmail)
        etCourse = findViewById(R.id.etCourse)
        etSemester = findViewById(R.id.etSemester)
        btnSubmit = findViewById(R.id.btnSubmit)

        btnSubmit.setOnClickListener {
            submitStudentForm()
        }
    }

    private fun submitStudentForm() {
        val name = etName.text.toString().trim()
        val email = etEmail.text.toString().trim()
        val course = etCourse.text.toString().trim()
        val semesterStr = etSemester.text.toString().trim()

        if (name.isEmpty()) {
            etName.error = "Name is required"
            return
        }

        if (email.isEmpty() || !android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            etEmail.error = "Valid email is required"
            return
        }

        if (course.isEmpty()) {
            etCourse.error = "Course is required"
            return
        }

        val semester = semesterStr.toIntOrNull()
        if (semester == null || semester <= 0) {
            etSemester.error = "Valid positive semester is required"
            return
        }

        val newStudent = Student(
            name = name,
            email = email,
            course = course,
            semester = semester
        )

        btnSubmit.isEnabled = false

        RetrofitClient.apiService.createStudent(newStudent).enqueue(object : Callback<Student> {
            override fun onResponse(call: Call<Student>, response: Response<Student>) {
                btnSubmit.isEnabled = true

                if (response.isSuccessful && response.code() == 201) {
                    Toast.makeText(
                        this@AddStudentActivity,
                        "Student Created Successfully (ID: ${response.body()?.id})",
                        Toast.LENGTH_LONG
                    ).show()
                    finish()
                } else if (response.code() == 400) {
                    val errorBodyString = response.errorBody()?.string()
                    val errorMessage = try {
                        val parsed = Gson().fromJson(errorBodyString, ErrorResponse::class.java)
                        parsed.message ?: "Validation error"
                    } catch (e: Exception) {
                        "Validation error (HTTP 400)"
                    }
                    Toast.makeText(this@AddStudentActivity, errorMessage, Toast.LENGTH_LONG).show()
                } else if (response.code() == 404) {
                    Toast.makeText(this@AddStudentActivity, "Student not found", Toast.LENGTH_LONG).show()
                } else {
                    Toast.makeText(this@AddStudentActivity, "Something went wrong", Toast.LENGTH_SHORT).show()
                }
            }

            override fun onFailure(call: Call<Student>, t: Throwable) {
                btnSubmit.isEnabled = true
                Toast.makeText(this@AddStudentActivity, "Something went wrong", Toast.LENGTH_SHORT).show()
            }
        })
    }
}
