package com.example.studentclient.model

import com.google.gson.annotations.SerializedName

data class Student(
    @SerializedName("id")
    val id: Long? = null,

    @SerializedName("name")
    val name: String,

    @SerializedName("email")
    val email: String,

    @SerializedName("course")
    val course: String,

    @SerializedName("semester")
    val semester: Int
)

data class ErrorResponse(
    @SerializedName("error")
    val error: String?,

    @SerializedName("message")
    val message: String?
)
