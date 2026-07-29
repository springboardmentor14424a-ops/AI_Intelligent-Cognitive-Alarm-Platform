const $ = id => document.getElementById(id);
const message = (text, good = false) => { $('message').textContent = text; $('message').style.color = good ? '#267352' : '#a33434'; };
const showAuth = view => { $('login-form').hidden = view !== 'login'; $('register-form').hidden = view !== 'register'; message(''); };

async function showProfile(notice = 'Signed in successfully.') {
  const token = localStorage.getItem('access_token');
  if (!token) return;
  const response = await fetch('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) return localStorage.removeItem('access_token');
  const user = await response.json();
  $('register-form').hidden = $('login-form').hidden = true;
  $('profile').hidden = false;
  $('admin-panel').hidden = user.role !== 'administrator';
  $('profile-content').textContent = `${user.email} - ${user.role.replace('_', ' ')}`;
  message(notice, true);
}

$('register-form').addEventListener('submit', async event => {
  event.preventDefault();
  const payload = { full_name: $('full_name').value, email: $('email').value, password: $('password').value };
  const response = await fetch('/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!response.ok) return message((await response.json()).detail || 'Unable to create account');
  message('Account created. You can now sign in.', true); event.target.reset();
});

$('show-register').onclick = () => showAuth('register');
$('show-login').onclick = () => showAuth('login');
$('login-form').addEventListener('submit', async event => {
  event.preventDefault();
  const body = new URLSearchParams({ username: $('login_email').value, password: $('login_password').value });
  const response = await fetch('/auth/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  if (!response.ok) return message((await response.json()).detail || 'Unable to sign in');
  const token = (await response.json()).access_token;
  localStorage.setItem('access_token', token);
  const user = await (await fetch('/auth/me', { headers: { Authorization: `Bearer ${token}` } })).json();
  if (user.role !== $('login_role').value) { localStorage.removeItem('access_token'); return message(`This account is registered as ${user.role.replace('_', ' ')}. Choose that role to sign in.`); }
  showProfile();
});

$('admin-create-form').addEventListener('submit', async event => {
  event.preventDefault();
  const payload = { full_name: $('admin_new_name').value, email: $('admin_new_email').value, password: $('admin_new_password').value, role: $('admin_new_role').value };
  const response = await fetch('/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('access_token')}` }, body: JSON.stringify(payload) });
  if (!response.ok) return message((await response.json()).detail || 'Unable to create account');
  const user = await response.json(); message(`${user.full_name}'s ${user.role.replace('_', ' ')} account was created.`, true); event.target.reset();
});

$('delete-account').onclick = async () => {
  if (!confirm('Delete your account permanently? This action cannot be undone.')) return;
  const response = await fetch('/auth/me', { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } });
  if (!response.ok) return message((await response.json()).detail || 'Unable to delete account');
  localStorage.removeItem('access_token'); location.reload();
};

// Profile editing is available only from the dedicated Manage Profile page.
$('profile-form').remove();
const plansAction = document.createElement('button');
plansAction.type = 'button'; plansAction.className = 'action'; plansAction.textContent = 'View Plans'; plansAction.style.cursor = 'pointer';
plansAction.onclick = () => location.assign('/static/plans.html');
document.querySelector('.user-actions').append(plansAction);
const notifications = document.createElement('section');
notifications.className = 'notifications';
notifications.innerHTML = `<h3>Notifications</h3><p>Choose how you would like to receive reminders and updates.</p><label><input type="checkbox" value="SMS"> SMS</label><label><input type="checkbox" value="WhatsApp"> WhatsApp</label><label><input type="checkbox" value="Email"> Email</label><label><input type="checkbox" value="Push notification"> Push notification</label><label><input type="checkbox" value="Browser notification"> Browser notification</label><label><input type="checkbox" value="In-app notification"> In-app notification</label><button type="button">Save notification preferences</button>`;
const savedNotifications = JSON.parse(localStorage.getItem('notification_preferences') || '[]');
notifications.querySelectorAll('input').forEach(input => { input.checked = savedNotifications.includes(input.value); input.style.cssText = 'width:auto;display:inline;margin:0 .45rem 0 0;padding:0'; });
notifications.querySelector('button').onclick = () => { const selected = [...notifications.querySelectorAll('input:checked')].map(input => input.value); localStorage.setItem('notification_preferences', JSON.stringify(selected)); message(selected.length ? 'Notification preferences saved.' : 'No notification sources selected.', true); };
document.querySelector('.user-actions').insertAdjacentElement('afterend', notifications);
$('profile').querySelectorAll('.action').forEach(action => {
  const label = action.childNodes[0].textContent.trim();
  action.querySelector('small')?.remove();
  action.classList.remove('active'); action.style.cursor = 'pointer';
  if (label === 'View Plans') return;
  const destinations = {'Set Alarm':'/static/alarms.html','Dismiss Alarm':'/static/alarms.html','Solve Challenges':'/static/challenges.html','Track Habits':'/static/habits.html','View Analytics':'/static/analytics.html','Manage Profile':'/static/profile.html'};
  action.onclick = () => destinations[label]
    ? location.assign(destinations[label])
    : location.assign(`/static/action.html?action=${encodeURIComponent(label)}&available=false`);
});
$('signout').onclick = () => { localStorage.removeItem('access_token'); location.reload(); };
showProfile();
