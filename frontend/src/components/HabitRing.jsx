// Signature visual for the platform: a circular "habit score" gauge with a
// dawn gradient (midnight -> amber), echoing the wake-up theme of the product.
export default function HabitRing({ score, size = 128, stroke = 12 }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id="habitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1B1B3A" />
          <stop offset="100%" stopColor="#F2994A" />
        </linearGradient>
      </defs>
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="#EDEEF6" strokeWidth={stroke}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="url(#habitGradient)" strokeWidth={stroke}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text
        x="50%" y="47%" textAnchor="middle" dominantBaseline="middle"
        fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize={size * 0.22}
        fill="#17172E"
      >
        {score}
      </text>
      <text
        x="50%" y="66%" textAnchor="middle" dominantBaseline="middle"
        fontFamily="Inter, sans-serif" fontSize={size * 0.085}
        fill="#6B7089"
      >
        habit score
      </text>
    </svg>
  )
}
