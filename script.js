const takenEmails = ["admin@wellspring.io", "coach@wellspring.io"];

function switchTab(tab) {
  const isSignin = tab === 'signin';
  document.getElementById('tabSignin').classList.toggle('active', isSignin);
  document.getElementById('tabSignup').classList.toggle('active', !isSignin);
  document.getElementById('signinForm').classList.toggle('active', isSignin);
  document.getElementById('signupForm').classList.toggle('active', !isSignin);
  document.getElementById('panelTitle').innerHTML = isSignin
    ? "Welcome<br>back."
    : "Join the<br>network.";
  document.getElementById('panelLede').textContent = isSignin
    ? "Sign in to reach your coach, your care team, or your patients — all in one calm, secure place."
    : "Create your account and choose the role that fits how you'll use Wellspring.";
}

function toggleVis(id, btn) {
  const input = document.getElementById(id);
  const isPass = input.type === 'password';
  input.type = isPass ? 'text' : 'password';
  btn.textContent = isPass ? 'HIDE' : 'SHOW';
}

function checkEmailUnique() {
  const val = document.getElementById('su-email').value.trim().toLowerCase();
  const hint = document.getElementById('emailHint');
  const input = document.getElementById('su-email');
  if (!val) {
    hint.textContent = "Must be unique — we'll check availability.";
    hint.className = "hint";
    input.classList.remove('field-error');
    return;
  }
  if (takenEmails.includes(val)) {
    hint.textContent = "That email is already registered.";
    hint.className = "hint err";
    input.classList.add('field-error');
  } else {
    hint.textContent = "Available.";
    hint.className = "hint ok";
    input.classList.remove('field-error');
  }
}

function checkStrength() {
  const val = document.getElementById('su-pass').value;
  const hint = document.getElementById('passHint');
  if (val.length === 0) {
    hint.textContent = "Stored as a salted hash (bcrypt) — never in plain text.";
    hint.className = "hint";
  } else if (val.length < 8) {
    hint.textContent = "At least 8 characters needed.";
    hint.className = "hint err";
  } else {
    hint.textContent = "Looks good — will be hashed before saving.";
    hint.className = "hint ok";
  }
}

function handleSignin(e) {
  e.preventDefault();
  // TODO: wire up to your auth API
  window.location.href = 'dashboard.html';
  return false;
}

function handleSignup(e) {
  e.preventDefault();
  const email = document.getElementById('su-email').value.trim().toLowerCase();
  if (takenEmails.includes(email)) {
    checkEmailUnique();
    return false;
  }
  const name = document.getElementById('su-name').value;
  const role = document.getElementById('su-role').value;
  // TODO: wire up to your registration API
  alert(
    "Account payload (demo):\n" +
    "name: " + name + "\n" +
    "email: " + email + "\n" +
    "password: [encrypted client-side placeholder]\n" +
    "role: " + role + "\n" +
    "provider: LOCAL"
  );
  return false;
}

function handleOAuth(mode) {
  const note = document.getElementById('providerNote');
  if (note) {
    note.innerHTML = 'Provider set to <b>GOOGLE</b> — role still applies, password field is skipped.';
  }
  // TODO: redirect to your real OAuth flow
  alert("Redirecting to Google OAuth for " + mode + "...\n(Demo — connect this to your real OAuth flow.)");
}
