import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { section } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const adminName = user?.name || 'Admin User';
  const adminAvatar = user?.avatar || adminName.split(' ').map(n => n[0]).join('').toUpperCase();

  const handleLogout = () => { logout(); navigate('/'); };

  const [uptime, setUptime] = useState(89.64);
  const [serverLoad, setServerLoad] = useState(42);
  const [apiResponse, setApiResponse] = useState(124);
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeCoaches, setActiveCoaches] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setUptime(parseFloat((89.50 + Math.random() * 0.30).toFixed(2)));
      setServerLoad(Math.floor(38 + Math.random() * 10));
      setApiResponse(Math.floor(110 + Math.random() * 25));
    }, 3000);

    fetch('http://localhost:5001/api/users')
      .then(r => r.json())
      .then(data => {
        const allUsers = data.users || [];
        setUsers(allUsers);
        setTotalUsers(allUsers.length);
        setActiveCoaches(allUsers.filter(u => ['wellness coach', 'coach'].includes(u.role.toLowerCase())).length);
      })
      .catch(() => {});

    return () => clearInterval(interval);
  }, []);

  const recommendationMonitoring = [
    { recommendation: 'REM Sleep Wake-up Adaptation', targetSegment: 'Users sleeping < 6 hrs', acceptanceRate: '94%', impactScore: 'High (+18% Alertness)', status: 'Active AI Rule' },
    { recommendation: 'Hydration Challenge Prompt', targetSegment: 'All Active Users', acceptanceRate: '82%', impactScore: 'Medium (+12% Energy)', status: 'Active AI Rule' },
    { recommendation: 'Wind-down Screen Lock Trigger', targetSegment: 'Coach Assigned Clients', acceptanceRate: '76%', impactScore: 'Very High (+25% Deep Sleep)', status: 'A/B Testing' }
  ];

  const systemReports = [
    { reportName: 'Monthly User Engagement & Growth Report', generatedDate: 'Jul 28, 2026', format: 'CSV', status: 'Ready' },
    { reportName: 'Platform Uptime & Telemetry Audit Log',   generatedDate: 'Jul 25, 2026', format: 'JSON', status: 'Ready' },
    { reportName: 'Coach Progress & Intervention Audit',     generatedDate: 'Jul 20, 2026', format: 'CSV', status: 'Archived' }
  ];

  const downloadSystemReport = (report) => {
    const now = new Date();
    let content = '';
    let filename = '';
    let type = 'text/plain';

    if (report.format === 'JSON') {
      const data = {
        reportName: report.reportName, generatedDate: report.generatedDate,
        exportedAt: now.toISOString(), platform: 'CogniWell',
        uptime: `${uptime}%`, serverLoad: `${serverLoad}%`,
        apiLatency: `${apiResponse}ms`, totalUsers, activeCoaches,
        alarmThemes: [
          { name: 'REM Sleep Sync Alarms', successRate: '88%' },
          { name: 'Voice Prompt Alarms',   successRate: '72%' }
        ]
      };
      content = JSON.stringify(data, null, 2);
      filename = `CogniWell_TelemetryAudit_${now.toISOString().split('T')[0]}.json`;
      type = 'application/json';
    } else {
      const rows = [
        ['Report Name', report.reportName], ['Generated Date', report.generatedDate],
        ['Exported At', now.toISOString()], ['Platform', 'CogniWell'],
        ['Total Users', totalUsers], ['Active Coaches', activeCoaches],
        ['Platform Uptime', `${uptime}%`], ['CPU Server Load', `${serverLoad}%`],
        ['API Latency', `${apiResponse}ms`], ['Monthly Revenue', '$24,850'],
        ['REM Sync Success Rate', '88%'], ['Voice Prompt Success Rate', '72%'],
        ['REM Adaptation Acceptance', '94%'], ['Hydration Challenge Acceptance', '82%'],
        ['Screen Lock Acceptance', '76%']
      ];
      content = rows.map(r => r.join(',')).join('\n');
      filename = `CogniWell_${report.reportName.replace(/[^a-z0-9]/gi, '_')}_${now.toISOString().split('T')[0]}.csv`;
      type = 'text/csv;charset=utf-8;';
    }

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click();
    document.body.removeChild(link); URL.revokeObjectURL(url);
  };

  // ── SVG Line Graph setup ────────────────────────────────────────────────
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep'];
  const userGrowth    = [12, 19, 24, 30, 38, 47, 55, 62, Math.max(totalUsers, 68)];
  const sessionGrowth = [8,  15, 20, 28, 34, 42, 50, 57, 63];
  const solveRate     = [55, 60, 65, 70, 74, 78, 83, 88, 92];

  const W = 560, H = 190, PL = 42, PB = 28, PT = 14, PR = 16;
  const gW = W - PL - PR, gH = H - PB - PT;
  const maxV = 100;
  const toX = i  => PL + (i / (months.length - 1)) * gW;
  const toY = v  => PT + gH - (v / maxV) * gH;

  const drawLine = (data, color) => {
    const pts = data.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
    const fillPts = `${toX(0).toFixed(1)},${(PT + gH).toFixed(1)} ${pts} ${toX(data.length-1).toFixed(1)},${(PT+gH).toFixed(1)}`;
    return (
      <>
        <polygon points={fillPts} fill={color} fillOpacity="0.08" />
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((v, i) => <circle key={i} cx={toX(i)} cy={toY(v)} r="4" fill={color} stroke="#fff" strokeWidth="1.5" />)}
      </>
    );
  };

  const graphLines = [
    { data: userGrowth,    color: '#3182ce', label: 'Total Users' },
    { data: sessionGrowth, color: '#38a169', label: 'Alarm Sessions' },
    { data: solveRate,     color: '#805ad5', label: 'Solve Rate %' }
  ];

  return (
    <div className="admin-dashboard">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <h2>CogniWell <span className="admin-badge">Admin</span></h2>
        </div>
        <nav className="sidebar-nav">
          <Link to="/admin" className={`nav-item ${!section ? 'active' : ''}`}>📊 Dashboard</Link>
          <Link to="/admin/user-management" className={`nav-item ${section === 'user-management' ? 'active' : ''}`}>👥 User Management</Link>
          <Link to="/admin/platform-analytics" className={`nav-item ${section === 'platform-analytics' ? 'active' : ''}`}>📈 Platform Analytics</Link>
          <Link to="/admin/recommendation-monitoring" className={`nav-item ${section === 'recommendation-monitoring' ? 'active' : ''}`}>🤖 Recommendation Monitoring</Link>
          <Link to="/admin/system-reports" className={`nav-item ${section === 'system-reports' ? 'active' : ''}`}>📋 System Reports</Link>
        </nav>
        <div className="sidebar-footer">
          <div className="admin-profile">
            <div className="admin-avatar">{adminAvatar}</div>
            <span className="admin-name">{adminName}</span>
          </div>
          {user && (
            <button onClick={handleLogout} style={{background:'none',border:'none',color:'#e53e3e',cursor:'pointer',fontSize:'0.85rem',marginBottom:'8px',display:'block',fontWeight:600}}>
              🚪 Logout ({user.role})
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <header className="main-header">
          <div>
            {section && (
              <div style={{ marginBottom: '6px' }}>
                <Link to="/admin" style={{ textDecoration: 'none', color: '#3182ce', fontWeight: 600, fontSize: '0.85rem' }}>
                  ← Back to Full Dashboard
                </Link>
              </div>
            )}
            <h2>
              {section === 'user-management' && '👥 User Management'}
              {section === 'platform-analytics' && '📈 Platform Analytics'}
              {section === 'recommendation-monitoring' && '🤖 Recommendation Monitoring'}
              {section === 'system-reports' && '📋 System Reports'}
              {!section && `Admin Dashboard — Logged in as ${adminName}`}
            </h2>
            <span style={{fontSize:'0.85rem',color:'#e53e3e',fontWeight:600}}>
              Logged in Account: {user?.email || 'admin@cogniwell.com'}
            </span>
          </div>
          <div className="header-actions">
            <input type="text" placeholder="Search accounts..." className="search-input" />
            <span className="notification-bell">🔔</span>
          </div>
        </header>

        {/* Telemetry Stats */}
        <div className="telemetry-grid" style={{gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))'}}>
          {[
            { label:'Total Users',         value: totalUsers,           color:'blue',  sub:'Registered in PostgreSQL' },
            { label:'Active Coaches',       value: activeCoaches,        color:'green', sub:'Wellness Coaches Active' },
            { label:'Platform Uptime',      value: `${uptime}%`,         color:'green', sub:'Live Automated Metric' },
            { label:'CPU Server Load',      value: `${serverLoad}%`,     color:'blue',  sub:'Normal Operational Range' },
            { label:'API Latency Response', value: `${apiResponse} ms`,  color:'blue',  sub:'Global Edge Routing' },
            { label:'Revenue',              value: '$24,850',            color:'green', sub:'+18.4% MRR Growth' }
          ].map(({ label, value, color, sub }) => (
            <div key={label} className="telemetry-card">
              <h4>{label}</h4>
              <div className={`stat-value ${color}`}>{value}</div>
              <span style={{fontSize:'0.8rem',color:'#718096'}}>{sub}</span>
            </div>
          ))}
        </div>

        {/* User Management */}
        {(!section || section === 'user-management') && (
          <div className="card" id="user-management" style={{marginBottom:'24px'}}>
            <h3 className="section-title">👥 User Management</h3>
            <table className="admin-table">
              <thead>
                <tr><th>User Name</th><th>Email</th><th>Role</th><th>Joined Date</th><th>Status</th></tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan="5" style={{textAlign:'center',color:'#718096',padding:'20px'}}>Loading users from database...</td></tr>
                ) : users.map((u, idx) => (
                  <tr key={idx}>
                    <td><strong>{u.name}</strong></td>
                    <td style={{fontSize:'0.85rem',color:'#4a5568'}}>{u.email}</td>
                    <td><span className={`role-badge ${u.role.toLowerCase().replace(' ','-')}`}>{u.role}</span></td>
                    <td style={{fontSize:'0.85rem',color:'#718096'}}>{new Date(u.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td>
                    <td><span className="status-tag active">Active</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Platform Analytics — LINE GRAPH */}
        {(!section || section === 'platform-analytics') && (
          <div className="card" id="platform-analytics" style={{marginBottom:'24px'}}>
            <h3 className="section-title">📈 Platform Analytics</h3>
            <p style={{margin:'0 0 14px 0',color:'#718096',fontSize:'0.85rem'}}>
              Growth trends over the last 9 months — Users, Alarm Sessions &amp; Solve Rate
            </p>

            {/* Legend */}
            <div style={{display:'flex',gap:'20px',marginBottom:'10px',flexWrap:'wrap'}}>
              {graphLines.map(l => (
                <div key={l.label} style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'0.8rem',fontWeight:600,color:'#4a5568'}}>
                  <div style={{width:'24px',height:'3px',background:l.color,borderRadius:'2px'}}/>
                  {l.label}
                </div>
              ))}
            </div>

            {/* SVG Line Graph */}
            <div style={{overflowX:'auto',background:'#f8fafc',borderRadius:'8px',padding:'12px 8px'}}>
              <svg width={W} height={H} style={{display:'block',minWidth:'320px'}}>
                {[0,25,50,75,100].map(v => (
                  <g key={v}>
                    <line x1={PL} y1={toY(v)} x2={W-PR} y2={toY(v)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,4"/>
                    <text x={PL-4} y={toY(v)+4} fontSize="9" fill="#a0aec0" textAnchor="end">{v}</text>
                  </g>
                ))}
                {months.map((m, i) => (
                  <text key={m} x={toX(i)} y={H-6} fontSize="10" fill="#718096" textAnchor="middle">{m}</text>
                ))}
                {graphLines.map(l => <g key={l.label}>{drawLine(l.data, l.color)}</g>)}
              </svg>
            </div>

            {/* Alarm config bars */}
            <h4 style={{margin:'20px 0 12px 0',color:'#2d3748',fontSize:'0.92rem',fontWeight:700}}>Active Alarm Configurations &amp; Success Rates</h4>
            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              {[
                {label:'REM Sleep Sync Alarms',pct:88,color:'#3182ce'},
                {label:'Voice Prompt Alarms',  pct:72,color:'#38a169'},
                {label:'Gentle Tone Wave',     pct:65,color:'#805ad5'},
                {label:'Chimes',               pct:58,color:'#dd6b20'}
              ].map(({label,pct,color}) => (
                <div key={label}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.88rem',marginBottom:'4px'}}>
                    <span>{label}</span><strong style={{color}}>{pct}% Active Success</strong>
                  </div>
                  <div style={{height:'8px',background:'#e2e8f0',borderRadius:'4px',overflow:'hidden'}}>
                    <div style={{height:'100%',background:color,width:`${pct}%`,borderRadius:'4px'}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendation Monitoring + System Reports grid */}
        {(!section || section === 'recommendation-monitoring' || section === 'system-reports') && (
          <div className={!section ? "content-grid" : ""} style={!section ? {display:'grid',gridTemplateColumns:'1fr 1fr',gap:'24px'} : {}}>
            {(!section || section === 'recommendation-monitoring') && (
              <div className="card" id="recommendation-monitoring" style={{marginBottom:'24px'}}>
                <h3 className="section-title">🤖 Recommendation Monitoring</h3>
                <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
                  {recommendationMonitoring.map((rec, idx) => (
                    <div key={idx} style={{padding:'14px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'6px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
                        <strong style={{color:'#1a365d',fontSize:'0.92rem'}}>{rec.recommendation}</strong>
                        <span className="role-badge user">{rec.status}</span>
                      </div>
                      <p style={{margin:'0 0 6px 0',fontSize:'0.82rem',color:'#4a5568'}}>Target: <strong>{rec.targetSegment}</strong></p>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.78rem',color:'#718096'}}>
                        <span>Acceptance: <strong>{rec.acceptanceRate}</strong></span>
                        <span>Impact: <strong>{rec.impactScore}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* System Reports — fully downloadable */}
            {(!section || section === 'system-reports') && (
              <div className="card" id="system-reports" style={{marginBottom:'24px'}}>
                <h3 className="section-title">📋 System Reports</h3>
                <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
                  {systemReports.map((report, idx) => (
                    <div key={idx} style={{padding:'16px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'8px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:'12px'}}>
                      <div>
                        <strong style={{color:'#1a365d',fontSize:'0.9rem',display:'block',marginBottom:'4px'}}>{report.reportName}</strong>
                        <span style={{fontSize:'0.76rem',color:'#718096'}}>Generated: {report.generatedDate} | Format: {report.format}</span>
                      </div>
                      <button
                        onClick={() => downloadSystemReport(report)}
                        style={{padding:'8px 16px',background:'#2b6cb0',color:'#fff',border:'none',borderRadius:'6px',fontSize:'0.82rem',fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}
                        onMouseEnter={e => e.currentTarget.style.background='#1a365d'}
                        onMouseLeave={e => e.currentTarget.style.background='#2b6cb0'}
                      >
                        ⬇️ Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;

