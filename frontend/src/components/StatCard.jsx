export default function StatCard({ icon: Icon, label, value, trend, trendDirection, tint }) {
  return (
    <div className="card stat-card">
      <div className="icon-wrap" style={{ background: tint?.bg || '#FCE3CB' }}>
        <Icon size={17} color={tint?.fg || '#F2994A'} />
      </div>
      <div className="value">{value}</div>
      <div className="label">{label}</div>
      {trend && (
        <div className={`trend ${trendDirection}`}>
          {trendDirection === 'up' ? '▲' : '▼'} {trend}
        </div>
      )}
    </div>
  )
}
