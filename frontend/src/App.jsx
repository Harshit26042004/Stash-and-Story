import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, Receipt, LogOut, TrendingUp, Edit2, Check, 
  X, Trash2, Plus, Calendar, List, ChevronRight, PieChart as PieIcon, Settings2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  Cell, CartesianGrid, PieChart, Pie, Legend,
  Sector
} from 'recharts';
import axios from 'axios';

// --- 1. API CONFIGURATION ---
const api = axios.create({ baseURL: 'http://127.0.0.1:8000' });

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// --- 2. CONSTANTS ---
const CATEGORIES = [
  { value: 'FOOD', label: 'Food', color: '#3b82f6' },
  { value: 'RECHARGE', label: 'Recharge', color: '#10b981' },
  { value: 'TRAVEL', label: 'Travel', color: '#f59e0b' },
  { value: 'ENT', label: 'Entertainment', color: '#ef4444' },
  { value: 'RENT', label: 'Rent', color: '#8b5cf6' },
  { value: 'SHOP', label: 'Shopping', color: '#ec4899' },
  { value: 'INCOME', label: 'Income', color: '#22c55e' },
  { value: 'FUN', label: 'Fun Expense', color: '#06b6d4' },
  { value: 'REQUIRED', label: 'Required (Needs)', color: '#f97316' },
];

const getCategoryColor = (val) => CATEGORIES.find(c => c.value === val)?.color || '#cbd5e1';

// --- 3. LOGIN COMPONENT ---
const Login = ({ onLogin }) => {
  const [creds, setCreds] = useState({ username: '', password: '' });
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/token/', creds);
      localStorage.setItem('access_token', res.data.access);
      onLogin();
    } catch (err) { alert("Login Failed"); }
  };
  return (
    <div className="h-screen flex items-center justify-center bg-slate-950 px-4">
      <form onSubmit={handleLogin} className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md">
        <h2 className="text-2xl font-black text-slate-900 uppercase text-center mb-8 tracking-tighter">Stash & Story</h2>
        <div className="space-y-4">
          <input type="text" placeholder="Username" className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setCreds({...creds, username: e.target.value})} />
          <input type="password" placeholder="Password" className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setCreds({...creds, password: e.target.value})} />
          <button className="w-full bg-slate-900 text-white p-4 rounded-2xl font-bold hover:bg-blue-600 transition-all">Access Dashboard</button>
        </div>
      </form>
    </div>
  );
};

// --- 4. DASHBOARD COMPONENT ---
import { LineChart, Line } from 'recharts';

const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;

  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="black"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-[10px] font-black"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const total = payload.reduce(
    (sum, item) => sum + Number(item.value || 0),
    0
  );

  return (
    <div className="bg-white border border-slate-200 shadow-xl rounded-2xl p-4 min-w-[220px]">
      
      <p className="text-xs font-black uppercase text-slate-900 mb-3">
        {label}
      </p>

      <div className="space-y-2">
        {payload.map((entry, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-4 text-xs"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="font-bold text-slate-600">
                {entry.name}
              </span>
            </div>

            <span className="font-black text-slate-900">
              ₹{Number(entry.value).toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 mt-3 pt-3 flex justify-between">
        <span className="text-xs font-black uppercase text-slate-500">
          Total
        </span>

        <span className="text-sm font-black text-blue-600">
          ₹{total.toLocaleString()}
        </span>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [period, setPeriod] = useState('month');
  const [limit, setLimit] = useState(4);
  const [activeCategory, setActiveCategory] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [sRes, eRes] = await Promise.all([
          api.get(`/stash/expenses/dashboard_data/?period=${period}`),
          api.get('/stash/expenses/')
        ]);
        setStats(sRes.data);
        setExpenses(eRes.data);
      } catch (err) { console.error("Error loading dashboard", err); }
    };
    loadData();
  }, [period]);

  // --- BAR DATA ---
  const { groupedData, allKeys } = useMemo(() => {
    const groups = {};
    const keys = new Set();
    
    stats.forEach(item => {
      const date = item.time_period;
      if (!groups[date]) groups[date] = { time_period: date };
      groups[date][item.category] = parseFloat(item.total_spent);
      keys.add(item.category);
    });

    const sorted = Object.values(groups).sort((a,b) => new Date(a.time_period) - new Date(b.time_period));
    const limited = sorted.slice(-limit);

    return { groupedData: limited, allKeys: Array.from(keys) };
  }, [stats, limit]);

  // --- DONUT ---
  const donutData = useMemo(() => {
    const agg = {};
    groupedData.forEach(periodEntry => {
      Object.keys(periodEntry).forEach(key => {
        if (key !== 'time_period') {
          agg[key] = (agg[key] || 0) + periodEntry[key];
        }
      });
    });
    return Object.keys(agg).map(k => ({ name: k, value: agg[k] })).sort((a,b) => b.value - a.value);
  }, [groupedData]);

  const totalVisibleSpent = useMemo(() => {
    return donutData.reduce((sum, item) => sum + item.value, 0);
  }, [donutData]);

  const filteredExpenses = useMemo(() => {
    return activeCategory ? expenses.filter(e => e.category === activeCategory) : expenses;
  }, [activeCategory, expenses]);

  // --- LINE CHART DATA ---
  const BUDGET = 20000;

  const lineData = useMemo(() => {
    if (!expenses.length) return [];

    const sorted = [...expenses].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    let cumulative = 0;
    const totalPoints = sorted.length;

    return sorted.map((item, index) => {
      cumulative += parseFloat(item.amount);
      const avgSpend = cumulative / (index + 1);

      return {
        date: item.date,
        cumulative,
        budgetLine: (BUDGET / totalPoints) * (index + 1),
        projected: avgSpend * totalPoints
      };
    });
  }, [expenses]);

  const finalProjection = lineData[lineData.length - 1]?.projected || 0;
  const isOverBudget = finalProjection > BUDGET;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">

      {/* Top Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-100">
             <TrendingUp size={24}/>
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">Analysis</h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1 italic">
              Showing last {limit} {period}s
            </p>
          </div>
        </div>

        {/* FILTERS (UNCHANGED) */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl gap-2">
            <Settings2 size={14} className="text-slate-400" />
            <span className="text-[10px] font-black text-slate-400 uppercase">Limit:</span>
            <input 
              type="number" 
              value={limit} 
              min="1"
              max="52"
              onChange={(e) => setLimit(parseInt(e.target.value) || 1)}
              className="w-10 bg-transparent text-[10px] font-black text-blue-600 outline-none"
            />
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            {['week', 'month', 'quarter', 'year'].map((p) => (
              <button key={p} onClick={() => {setPeriod(p); setActiveCategory(null);}}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
                  period === p 
                  ? 'bg-white text-blue-600 shadow-sm border border-slate-200' 
                  : 'text-slate-400 hover:text-slate-600'
                }`}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* BAR CHART */}
        <div className="lg:col-span-8 bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={groupedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time_period" />
              <YAxis />
              <Tooltip content={<CustomBarTooltip />} />
              <Legend />
              {allKeys.map((key) => (
                <Bar key={key} dataKey={key} stackId="a" fill={getCategoryColor(key)} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* PIE (UNCHANGED) */}
        <div className="lg:col-span-4 bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col justify-center">

        <div className="mb-4">
          <h3 className="text-sm font-black uppercase text-slate-900">
            Expense Distribution
          </h3>

          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
            Category percentage split
          </p>
        </div>

        <ResponsiveContainer width="100%" height={350}>
          <PieChart>

            {/* CENTER TOTAL */}
            <text
              x="50%"
              y="35%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-slate-400 text-[11px] font-bold uppercase tracking-widest"
            >
              Total
            </text>

            <text
              x="50%"
              y="45%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-slate-900 text-xl font-black"
            >
              ₹{totalVisibleSpent.toLocaleString()}
            </text>

            <Pie
              data={donutData}
              cx="50%"
              cy="50%"
              innerRadius={85}
              outerRadius={125}
              paddingAngle={4}
              dataKey="value"
              labelLine={false}
              label={renderCustomizedLabel}
            >
              {donutData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getCategoryColor(entry.name)}
                  stroke="white"
                  strokeWidth={3}
                />
              ))}
            </Pie>

            <Tooltip
              formatter={(value, name) => [
                `₹${Number(value).toLocaleString()}`,
                name
              ]}
            />

            <Legend
              verticalAlign="bottom"
              iconType="circle"
              formatter={(value) => (
                <span className="text-xs font-bold text-slate-700">
                  {value}
                </span>
              )}
            />

          </PieChart>
        </ResponsiveContainer>
      </div>
      </div>

      {/* 🔥 LINE CHART */}
      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 p-8">
        <h3 className="text-sm font-black uppercase mb-4">
          Spend Trajectory
        </h3>

        <p className={`text-xs mb-4 font-bold ${
          isOverBudget ? 'text-red-500' : 'text-green-600'
        }`}>
          {isOverBudget
            ? `⚠️ Projected overspend: ₹${(finalProjection - BUDGET).toFixed(0)}`
            : `✅ You are within budget`}
        </p>

        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />

              <Line type="monotone" dataKey="cumulative" stroke="#3b82f6" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="budgetLine" stroke="#ef4444" strokeDasharray="5 5" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="projected" stroke={isOverBudget ? "#ef4444" : "#f59e0b"} strokeDasharray="3 3" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

// --- 5. EXPENSE MANAGER COMPONENT ---
const ExpenseManager = () => {
  const emptyForm = {
    amount: '',
    description: '',
    category: 'FOOD',
    date: ''
  };

  const [expenses, setExpenses] = useState([]);
  const [editingId, setEditingId] = useState(null);

  // EDIT FORM
  const [editForm, setEditForm] = useState(emptyForm);

  // ADD FORM (IMPORTANT FIX)
  const [addForm, setAddForm] = useState(emptyForm);

  const [showAdd, setShowAdd] = useState(false);

  const fetchData = async () => {
    const res = await api.get('/stash/expenses/');
    setExpenses(res.data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (id) => {
    await api.patch(`/stash/expenses/${id}/`, editForm);

    setEditingId(null);
    setEditForm(emptyForm);

    fetchData();
  };

  const handleAdd = async (e) => {
    e.preventDefault();

    try {
      await api.post('/stash/expenses/', addForm);

      setAddForm(emptyForm);
      setShowAdd(false);

      fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to add expense");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">
          Vault Ledger
        </h2>

        <button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2"
        >
          <Plus size={18} />
          New Record
        </button>
      </div>

      {/* ADD FORM */}
      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-blue-100 grid grid-cols-1 md:grid-cols-5 gap-4 items-end"
        >
          {/* DATE */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
              Date
            </label>

            <input
              type="date"
              required
              value={addForm.date}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none"
              onChange={(e) =>
                setAddForm({
                  ...addForm,
                  date: e.target.value
                })
              }
            />
          </div>

          {/* AMOUNT */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
              Amount
            </label>

            <input
              type="number"
              required
              step="0.01"
              value={addForm.amount}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none"
              onChange={(e) =>
                setAddForm({
                  ...addForm,
                  amount: e.target.value
                })
              }
            />
          </div>

          {/* CATEGORY */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
              Category
            </label>

            <select
              value={addForm.category}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none"
              onChange={(e) =>
                setAddForm({
                  ...addForm,
                  category: e.target.value
                })
              }
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* NOTES */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
              Notes
            </label>

            <input
              type="text"
              value={addForm.description}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none"
              onChange={(e) =>
                setAddForm({
                  ...addForm,
                  description: e.target.value
                })
              }
            />
          </div>

          <button className="bg-blue-600 text-white p-4 rounded-2xl font-black uppercase text-xs">
            Add
          </button>
        </form>
      )}

      {/* TABLE */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
            <tr>
              <th className="p-6">Date</th>
              <th className="p-6">Category</th>
              <th className="p-6">Notes</th>
              <th className="p-6">Flow</th>
              <th className="p-6 text-center">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-50">
            {expenses.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50/50">

                {/* DATE */}
                <td className="p-6 text-xs font-bold text-slate-500">
                  {editingId === e.id ? (
                    <input
                      type="date"
                      value={editForm.date}
                      onChange={(v) =>
                        setEditForm({
                          ...editForm,
                          date: v.target.value
                        })
                      }
                    />
                  ) : (
                    e.date
                  )}
                </td>

                {/* CATEGORY */}
                <td className="p-6">
                  {editingId === e.id ? (
                    <select
                      value={editForm.category}
                      onChange={(v) =>
                        setEditForm({
                          ...editForm,
                          category: v.target.value
                        })
                      }
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="px-2 py-1 bg-slate-100 rounded text-[9px] font-black uppercase">
                      {e.category_display}
                    </span>
                  )}
                </td>

                {/* NOTES */}
                <td className="p-6 text-xs text-slate-500">
                  {editingId === e.id ? (
                    <input
                      type="text"
                      value={editForm.description}
                      onChange={(v) =>
                        setEditForm({
                          ...editForm,
                          description: v.target.value
                        })
                      }
                    />
                  ) : (
                    e.description
                  )}
                </td>

                {/* AMOUNT */}
                <td className="p-6 font-black text-slate-900">
                  ₹{parseFloat(e.amount).toLocaleString()}
                </td>

                {/* ACTIONS */}
                <td className="p-6 flex justify-center gap-3">

                  {editingId === e.id ? (
                    <button
                      onClick={() => handleSave(e.id)}
                      className="text-green-600 bg-green-50 p-2 rounded-xl"
                    >
                      <Check size={18} />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingId(e.id);

                        setEditForm({
                          amount: e.amount,
                          description: e.description,
                          category: e.category,
                          date: e.date
                        });
                      }}
                      className="text-slate-400 hover:text-blue-600 bg-slate-50 p-2 rounded-xl"
                    >
                      <Edit2 size={16} />
                    </button>
                  )}

                  <button
                    onClick={async () => {
                      if (window.confirm("Delete?")) {
                        await api.delete(`/stash/expenses/${e.id}/`);
                        fetchData();
                      }
                    }}
                    className="text-red-500 bg-red-50 p-2 rounded-xl"
                  >
                    <Trash2 size={16} />
                  </button>

                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- 6. MAIN APP ---
export default function App() {
  const [isAuth, setIsAuth] = useState(!!localStorage.getItem('access_token'));
  if (!isAuth) return <Login onLogin={() => setIsAuth(true)} />;

  return (
    <Router>
      <div className="flex min-h-screen bg-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900">
        <aside className="w-72 bg-slate-950 text-white p-8 flex flex-col hidden lg:flex rounded-r-[3.5rem] shadow-2xl relative z-10 border-r border-slate-900">
          <div className="flex items-center gap-4 mb-16 px-2">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2.5 rounded-2xl shadow-xl shadow-blue-500/20">
                <TrendingUp size={24} className="text-white" />
            </div>
            <h1 className="font-black text-xl tracking-tighter uppercase leading-none">Stash <br/><span className="text-blue-500">Analytics</span></h1>
          </div>
          
          <nav className="flex-1 space-y-4">
            <Link to="/" className="flex items-center space-x-4 p-5 rounded-[1.5rem] hover:bg-slate-900 transition-all group">
              <LayoutDashboard className="text-slate-600 group-hover:text-blue-500 transition-colors" size={20}/>
              <span className="font-bold text-sm tracking-tight">Dashboard</span>
            </Link>
            <Link to="/expenses" className="flex items-center space-x-4 p-5 rounded-[1.5rem] hover:bg-slate-900 transition-all group">
              <Receipt className="text-slate-600 group-hover:text-blue-500 transition-colors" size={20}/>
              <span className="font-bold text-sm tracking-tight">Financial Vault</span>
            </Link>
          </nav>
          
          <div className="mt-auto pt-8 border-t border-slate-900">
            <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="flex items-center space-x-4 p-5 rounded-[1.5rem] text-red-400 hover:bg-red-400/10 font-black uppercase text-[10px] tracking-widest w-full transition-all">
                <LogOut size={18}/><span>Logoff Session</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-auto bg-slate-50/30">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/expenses" element={<ExpenseManager />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}