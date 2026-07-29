const $ = id => document.getElementById(id);
const token = localStorage.getItem('access_token');
const message = (text, good=false) => { $('message').textContent=text; $('message').style.color=good?'#267352':'#a33434'; };
async function loadProfile() {
  if (!token) return location.replace('/');
  const response = await fetch('/auth/me', {headers:{Authorization:`Bearer ${token}`}});
  if (!response.ok) { localStorage.removeItem('access_token'); return location.replace('/'); }
  const user=await response.json();
  $('profile_name').value=user.full_name;
  $('profile_timezone').value=user.timezone;
  $('wake_time').value=user.preferred_wake_time||'';
  $('sleep_hours').value=user.sleep_duration_hours||'';
  $('difficulty').value=user.difficulty_preference||'';
}
$('profile-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const payload={full_name:$('profile_name').value,timezone:$('profile_timezone').value,preferred_wake_time:$('wake_time').value||null,sleep_duration_hours:$('sleep_hours').value?Number($('sleep_hours').value):null,difficulty_preference:$('difficulty').value||null};
  const response=await fetch('/auth/me',{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(payload)});
  if(!response.ok)return message((await response.json()).detail||'Unable to save preferences');
  message('Profile preferences saved.',true);
});
loadProfile();
