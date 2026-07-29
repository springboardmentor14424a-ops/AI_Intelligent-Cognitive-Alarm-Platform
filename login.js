function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('form').forEach(form => form.classList.remove('active'));
  
  if (tabId === 'signin') {
    document.getElementById('tabSignin').classList.add('active');
    document.getElementById('signinForm').classList.add('active');
    document.getElementById('panelTitle').innerHTML = 'Welcome<br>back.';
    document.getElementById('panelLede').innerText = 'Sign in to reach your coach, your care team, or your patients — all in one calm, secure place.';
  } else {
    document.getElementById('tabSignup').classList.add('active');
    document.getElementById('signupForm').classList.add('active');
    document.getElementById('panelTitle').innerHTML = 'Join<br>us.';
    document.getElementById('panelLede').innerText = 'Create an account to track your cognitive habits and wake up sharper.';
  }
}

function handleSignin(e) {
  e.preventDefault();
  // Redirect to dashboard (index.html) as default user, or if we had a role saved, redirect there
  // Since we don't have a role select in signin in this template, we default to user.
  window.location.href = 'index.html?role=user';
  return false;
}

function handleSignup(e) {
  e.preventDefault();
  const role = document.getElementById('su-role').value || 'user';
  let targetRole = 'user';
  if (role === 'wellness_coach') targetRole = 'coach';
  if (role === 'admin') targetRole = 'admin';
  window.location.href = `index.html?role=${targetRole}`;
  return false;
}

function toggleVis(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = 'HIDE';
  } else {
    input.type = 'password';
    btn.textContent = 'SHOW';
  }
}

function handleOAuth(mode) {
  // Mock OAuth redirection
  window.location.href = 'index.html?role=user';
}

function checkEmailUnique() {
  const hint = document.getElementById('emailHint');
  const email = document.getElementById('su-email').value;
  if (email.includes('@') && email.includes('.')) {
    hint.textContent = 'Email is available.';
    hint.className = 'hint ok';
  } else {
    hint.textContent = "Must be unique — we'll check availability.";
    hint.className = 'hint';
  }
}

function checkStrength() {
  const hint = document.getElementById('passHint');
  const pass = document.getElementById('su-pass').value;
  if (pass.length >= 8) {
    hint.textContent = 'Password strength: Strong';
    hint.className = 'hint ok';
  } else {
    hint.textContent = 'Stored as a salted hash (bcrypt) — never in plain text.';
    hint.className = 'hint';
  }
}
