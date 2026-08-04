export default function Unauthorized() {
  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h2>403 — Not authorized</h2>
      <p>Your account role doesn't have access to this page.</p>
    </div>
  )
}
