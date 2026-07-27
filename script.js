function login() {

    let role = document.getElementById("role").value;

    if (role == "admin") {

        window.location = "admin.html";

    }

    else if (role == "student") {

        window.location = "student.html";

    }

    else if (role == "doctor") {

        window.location = "doctor.html";

    }

    else if (role == "recruiter") {

        window.location = "recruiter.html";

    }

    else if (role == "coach") {

        window.location = "coach.html";

    }

    else {

        alert("Please Select Role");

    }

}