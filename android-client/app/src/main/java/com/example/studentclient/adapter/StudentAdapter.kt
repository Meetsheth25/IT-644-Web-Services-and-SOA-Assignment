package com.example.studentclient.adapter

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.example.studentclient.R
import com.example.studentclient.model.Student

class StudentAdapter(private var studentList: List<Student>) :
    RecyclerView.Adapter<StudentAdapter.StudentViewHolder>() {

    class StudentViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val tvId: TextView = itemView.findViewById(R.id.tvStudentId)
        val tvName: TextView = itemView.findViewById(R.id.tvStudentName)
        val tvEmail: TextView = itemView.findViewById(R.id.tvStudentEmail)
        val tvCourse: TextView = itemView.findViewById(R.id.tvStudentCourse)
        val tvSemester: TextView = itemView.findViewById(R.id.tvStudentSemester)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): StudentViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_student, parent, false)
        return StudentViewHolder(view)
    }

    override fun onBindViewHolder(holder: StudentViewHolder, position: Int) {
        val student = studentList[position]
        holder.tvId.text = "ID: ${student.id}"
        holder.tvName.text = student.name
        holder.tvEmail.text = student.email
        holder.tvCourse.text = "Course: ${student.course}"
        holder.tvSemester.text = "Semester: ${student.semester}"
    }

    override fun getItemCount(): Int = studentList.size

    fun updateData(newStudents: List<Student>) {
        studentList = newStudents
        notifyDataSetChanged()
    }
}
