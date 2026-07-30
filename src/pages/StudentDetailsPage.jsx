import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  User, 
  Clock, 
  Award, 
  Activity, 
  Save, 
  Send, 
  TrendingUp, 
  CheckCircle2, 
  XCircle,
  Moon,
  Brain
} from 'lucide-react';
import StatCard from '../components/StatCard';

const StudentDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Mock Database for Students
  const studentDataMap = {
    '1': {
      id: '1',
      name: 'Alex Rivera',
      email: 'alex@alarm.io',
      age: 21,
      course: 'Computer Science',
      wakeTime: '06:30 AM',
      sleepGoal: '8 Hours',
      habitScore: '84/100',
      consistency: '91%',
      avgSleep: '7.5 Hours',
      difficulty: 'Easy',
      upcomingAlarm: { time: '06:30 AM', challenge: 'Math Puzzle', status: 'Scheduled' },
      history: [
        { date: '28 Jul', challenge: 'Math Puzzle', result: 'Passed' },
        { date: '27 Jul', challenge: 'Memory Match', result: 'Passed' },
        { date: '26 Jul', challenge: 'Logic Puzzle', result: 'Failed' }
      ],
      recommendation: 'Alex has shown excellent consistency. Increase challenge difficulty next week.'
    },
    '2': {
      id: '2',
      name: 'John Carter',
      email: 'john@alarm.io',
      age: 22,
      course: 'Electrical Engineering',
      wakeTime: '07:00 AM',
      sleepGoal: '7.5 Hours',
      habitScore: '72/100',
      consistency: '78%',
      avgSleep: '6.8 Hours',
      difficulty: 'Medium',
      upcomingAlarm: { time: '07:00 AM', challenge: 'Memory Game', status: 'Scheduled' },
      history: [
        { date: '28 Jul', challenge: 'Memory Game', result: 'Failed' },
        { date: '27 Jul', challenge: 'Math Puzzle', result: 'Passed' },
        { date: '26 Jul', challenge: 'Riddle', result: 'Passed' }
      ],
      recommendation: 'John should reduce snoozing. Maintain medium difficulty for another week.'
    },
    '3': {
      id: '3',
      name: 'Sarah Lee',
      email: 'sarah@alarm.io',
      age: 20,
      course: 'Biomedical Science',
      wakeTime: '05:45 AM',
      sleepGoal: '8 Hours',
      habitScore: '91/100',
      consistency: '96%',
      avgSleep: '8.1 Hours',
      difficulty: 'Medium',
      upcomingAlarm: { time: '05:45 AM', challenge: 'Logic Puzzle', status: 'Scheduled' },
      history: [
        { date: '28 Jul', challenge: 'Logic Puzzle', result: 'Passed' },
        { date: '27 Jul', challenge: 'Math Puzzle', result: 'Passed' },
        { date: '26 Jul', challenge: 'Memory Match', result: 'Passed' }
      ],
      recommendation: 'Sarah is ready to move to Medium / Hard difficulty.'
    }
  };

  const student = studentDataMap[id] || studentDataMap['1'];

  const [recommendation, setRecommendation] = useState(student.recommendation);
  const [currentDifficulty, setCurrentDifficulty] = useState(student.difficulty);
  const [notice, setNotice] = useState(null);

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const handleSaveRecommendation = (e) => {
    e.preventDefault();
    showNotice('Recommendation saved successfully!');
  };

  const handleIncreaseDifficulty = () => {
    const nextDiff = currentDifficulty === 'Easy' ? 'Medium' : currentDifficulty === 'Medium' ? 'Hard' : 'Expert';
    setCurrentDifficulty(nextDiff);
    showNotice(`Challenge difficulty increased to ${nextDiff}`);
  };

  const handleSendReminder = () => {
    showNotice(`Push notification reminder dispatched to ${student.name}`);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {notice && (
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600" />
          <span>{notice}</span>
        </div>
      )}

      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/coach')}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 rounded-lg text-xs font-semibold shadow-xs transition-all self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Students
        </button>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleIncreaseDifficulty}
            className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-semibold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <TrendingUp className="w-3.5 h-3.5" /> Increase Difficulty
          </button>
          <button
            onClick={handleSendReminder}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" /> Send Reminder
          </button>
        </div>
      </div>

      {/* Student Profile Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-100">
          <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 font-bold text-lg flex items-center justify-center border border-blue-200">
            {student.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{student.name}</h1>
            <p className="text-xs text-slate-500 font-medium">{student.email} • {student.course}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs sm:text-sm">
          <div>
            <span className="text-slate-400 font-medium block">Age</span>
            <span className="font-semibold text-slate-800">{student.age} Years</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Course</span>
            <span className="font-semibold text-slate-800">{student.course}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Preferred Wake-up Time</span>
            <span className="font-semibold text-slate-800">{student.wakeTime}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Sleep Goal</span>
            <span className="font-semibold text-slate-800">{student.sleepGoal}</span>
          </div>
        </div>
      </div>

      {/* Habit Summary (4 Stat Cards) */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase">Habit Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Habit Score"
            value={student.habitScore}
            subtext="Overall score index"
            icon={Award}
            badgeColor="bg-blue-50 text-blue-600"
          />
          <StatCard
            title="Wake-up Consistency"
            value={student.consistency}
            subtext="On-time dismissal rate"
            icon={Activity}
            badgeColor="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            title="Average Sleep"
            value={student.avgSleep}
            subtext="Daily sleep duration"
            icon={Moon}
            badgeColor="bg-purple-50 text-purple-600"
          />
          <StatCard
            title="Current Difficulty"
            value={currentDifficulty}
            subtext="Cognitive puzzle level"
            icon={Brain}
            badgeColor="bg-amber-50 text-amber-600"
          />
        </div>
      </div>

      {/* Upcoming Alarm */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase">Upcoming Alarm</h2>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="text-2xl font-extrabold text-slate-900">{student.upcomingAlarm.time}</div>
            <div>
              <div className="text-sm font-semibold text-slate-800">{student.upcomingAlarm.challenge}</div>
              <div className="text-xs text-slate-500">Cognitive Challenge Type</div>
            </div>
          </div>
          <div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
              {student.upcomingAlarm.status}
            </span>
          </div>
        </div>
      </div>

      {/* Challenge History */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase">Recent Challenge History</h2>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 tracking-wider uppercase">
                <th className="py-3 px-4 sm:px-6">Date</th>
                <th className="py-3 px-4 sm:px-6">Challenge</th>
                <th className="py-3 px-4 sm:px-6">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {student.history.map((row, idx) => (
                <tr key={idx} className="even:bg-slate-50/50 hover:bg-slate-100/40 transition-colors">
                  <td className="py-3.5 px-4 sm:px-6 font-medium text-slate-500">{row.date}</td>
                  <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-800">{row.challenge}</td>
                  <td className="py-3.5 px-4 sm:px-6">
                    {row.result === 'Passed' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Passed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle className="w-3.5 h-3.5" /> Failed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sleep Progress */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase">Sleep Progress & Consistency</h2>
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-700">7-Day Sleep Goal Alignment</span>
            <span className="text-blue-600 font-bold">93.7%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full" style={{ width: '93.7%' }} />
          </div>
        </div>
      </div>

      {/* Coach Notes & Recommendation */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase">Coach Notes & Recommendation</h2>
        <form onSubmit={handleSaveRecommendation} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <textarea
            value={recommendation}
            onChange={(e) => setRecommendation(e.target.value)}
            rows={3}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors resize-none"
            placeholder="Write personalized advice or challenge difficulty recommendations..."
          />

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Future Ready: GET /students/{student.id} & POST /recommendations</span>

            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" /> Save Recommendation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentDetailsPage;
