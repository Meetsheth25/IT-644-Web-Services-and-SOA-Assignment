package com.example.studentclient

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.studentclient.adapter.StudentAdapter
import com.example.studentclient.model.Student
import com.example.studentclient.network.RetrofitClient
import com.google.android.material.floatingactionbutton.FloatingActionButton
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class MainActivity : AppCompatActivity() {

    private lateinit var recyclerView: RecyclerView
    private lateinit var progressBar: ProgressBar
    private lateinit var tvEmptyState: TextView
    private lateinit var fabAddStudent: FloatingActionButton
    private lateinit var studentAdapter: StudentAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        recyclerView = findViewById(R.id.recyclerViewStudents)
        progressBar = findViewById(R.id.progressBar)
        tvEmptyState = findViewById(R.id.tvEmptyState)
        fabAddStudent = findViewById(R.id.fabAddStudent)

        recyclerView.layoutManager = LinearLayoutManager(this)
        studentAdapter = StudentAdapter(emptyList())
        recyclerView.adapter = studentAdapter

        fabAddStudent.setOnClickListener {
            val intent = Intent(this, AddStudentActivity::class.java)
            startActivity(intent)
        }
    }

    override fun onResume() {
        super.onResume()
        fetchStudents()
    }

    private fun fetchStudents() {
        progressBar.visibility = View.VISIBLE
        tvEmptyState.visibility = View.GONE
        recyclerView.visibility = View.GONE

        RetrofitClient.apiService.getAllStudents().enqueue(object : Callback<List<Student>> {
            override fun onResponse(call: Call<List<Student>>, response: Response<List<Student>>) {
                progressBar.visibility = View.GONE

                if (response.isSuccessful) {
                    val students = response.body()
                    if (students != null && students.isNotEmpty()) {
                        recyclerView.visibility = View.VISIBLE
                        studentAdapter.updateData(students)
                    } else {
                        tvEmptyState.visibility = View.VISIBLE
                        tvEmptyState.text = "No students found."
                    }
                } else {
                    if (response.code() == 404) {
                        Toast.makeText(this@MainActivity, "Student not found", Toast.LENGTH_SHORT).show()
                    } else {
                        Toast.makeText(this@MainActivity, "Something went wrong (HTTP ${response.code()})", Toast.LENGTH_SHORT).show()
                    }
                    tvEmptyState.visibility = View.VISIBLE
                    tvEmptyState.text = "Unable to load data."
                }
            }

            override fun onFailure(call: Call<List<Student>>, t: Throwable) {
                progressBar.visibility = View.GONE
                tvEmptyState.visibility = View.VISIBLE
                tvEmptyState.text = "Something went wrong"
                Toast.makeText(this@MainActivity, "Something went wrong", Toast.LENGTH_SHORT).show()
            }
        })
    }
}
