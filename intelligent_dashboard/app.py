from flask import Flask, render_template, request, redirect, url_for

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("home.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        role = request.form.get("role")

        if role == "admin":
            return redirect(url_for("admin"))

        elif role == "coach":
            return redirect(url_for("coach"))

        elif role == "user":
            return redirect(url_for("user"))

    return render_template("login.html")


@app.route("/admin")
def admin():
    return render_template("admin.html")


@app.route("/coach")
def coach():
    return render_template("coach.html")


@app.route("/user")
def user():
    return render_template("user.html")


@app.route("/logout")
def logout():
    return redirect(url_for("home"))


if __name__ == "__main__":
    app.run(debug=True)