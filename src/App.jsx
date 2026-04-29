import React, { useState, useMemo, useEffect } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Plus, Search, Edit2, Trash2, X, Wallet, AlertCircle, ChevronLeft, ChevronRight, Moon, Sun, Download, Settings, Home, BarChart3, Tag, Coffee, ShoppingCart, Heart, Fuel, Bus, Trophy, Users, DollarSign, ArrowUpRight, ArrowDownRight, Sparkles, Repeat, PiggyBank, Target } from 'lucide-react';

const DEFAULT_CATEGORIES = [
  { id: 'restaurants', name: 'Restaurants', color: '#FF6B6B', icon: 'Coffee', budget: 300 },
  { id: 'supermarket', name: 'Supermarket', color: '#4ECDC4', icon: 'ShoppingCart', budget: 400 },
  { id: 'health', name: 'Health', color: '#95E1D3', icon: 'Heart', budget: 150 },
  { id: 'gas', name: 'Gas', color: '#F38181', icon: 'Fuel', budget: 200 },
  { id: 'transport', name: 'Transport', color: '#AA96DA', icon: 'Bus', budget: 100 },
  { id: 'football', name: 'Football', color: '#FCBAD3', icon: 'Trophy', budget: 80 },
  { id: 'friends', name: 'Friends', color: '#FFD93D', icon: 'Users', budget: 150 },
];

const ICON_MAP = { Coffee, ShoppingCart, Heart, Fuel, Bus, Trophy, Users, DollarSign, Tag, Sparkles, PiggyBank, Target };
const AVAILABLE_ICONS = ['Coffee', 'ShoppingCart', 'Heart', 'Fuel', 'Bus', 'Trophy', 'Users', 'DollarSign', 'Tag', 'Sparkles', 'PiggyBank', 'Target'];
const AVAILABLE_COLORS = ['#10B981', '#14B8A6', '#06B6D4', '#FF6B6B', '#4ECDC4', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3', '#FFD93D', '#FDCB6E', '#E17055'];

// --- localStorage helpers ---
const STORAGE_KEY = 'pocket-app-data-v1';

const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load from localStorage', e);
    return null;
  }
};

const saveToStorage = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
};

const formatMonth = (date) => date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
const getMonthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const formatCurrency = (n) => `€${Math.abs(n).toFixed(2)}`;

export default function ExpenseTracker() {
  // Load persisted data on first render
  const persisted = loadFromStorage();

  const [darkMode, setDarkMode] = useState(persisted?.darkMode ?? true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [expenses, setExpenses] = useState(persisted?.expenses ?? []);
  const [categories, setCategories] = useState(persisted?.categories ?? DEFAULT_CATEGORIES);
  const [defaultSalary, setDefaultSalary] = useState(persisted?.defaultSalary ?? 0);
  const [monthlySalaries, setMonthlySalaries] = useState(persisted?.monthlySalaries ?? {});
  const [recurring, setRecurring] = useState(persisted?.recurring ?? []);
  const [savingsGoal, setSavingsGoal] = useState(persisted?.savingsGoal ?? 0);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');

  // Lock body scroll when any modal is open
  useEffect(() => {
    const anyModalOpen = showExpenseModal || showCategoryModal || showSalaryModal;
    if (anyModalOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [showExpenseModal, showCategoryModal, showSalaryModal]);

  // Save to localStorage whenever important data changes
  useEffect(() => {
    saveToStorage({
      darkMode,
      expenses,
      categories,
      defaultSalary,
      monthlySalaries,
      recurring,
      savingsGoal,
    });
  }, [darkMode, expenses, categories, defaultSalary, monthlySalaries, recurring, savingsGoal]);

  const monthKey = getMonthKey(currentDate);
  const currentSalary = monthlySalaries[monthKey] ?? defaultSalary;

  const monthExpenses = useMemo(() => {
    return expenses.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === currentDate.getFullYear() && d.getMonth() === currentDate.getMonth();
    });
  }, [expenses, currentDate]);

  const totalSpent = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const remaining = currentSalary - totalSpent;
  const percentUsed = currentSalary > 0 ? (totalSpent / currentSalary) * 100 : 0;

  const categoryTotals = useMemo(() => {
    const totals = {};
    categories.forEach(c => { totals[c.id] = 0; });
    monthExpenses.forEach(e => { totals[e.category] = (totals[e.category] || 0) + e.amount; });
    return totals;
  }, [monthExpenses, categories]);

  const prevMonthExpenses = useMemo(() => {
    const prev = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    return expenses.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === prev.getFullYear() && d.getMonth() === prev.getMonth();
    });
  }, [expenses, currentDate]);

  const prevCategoryTotals = useMemo(() => {
    const totals = {};
    prevMonthExpenses.forEach(e => { totals[e.category] = (totals[e.category] || 0) + e.amount; });
    return totals;
  }, [prevMonthExpenses]);

  const alerts = useMemo(() => {
    const list = [];
    if (percentUsed >= 80 && percentUsed < 100) list.push({ type: 'warning', text: `You've used ${percentUsed.toFixed(0)}% of your monthly budget` });
    if (percentUsed >= 100) list.push({ type: 'danger', text: `You've exceeded your monthly budget by ${formatCurrency(totalSpent - currentSalary)}` });

    categories.forEach(cat => {
      const current = categoryTotals[cat.id] || 0;
      const prev = prevCategoryTotals[cat.id] || 0;
      if (prev > 0 && current > prev * 1.3 && current > 50) {
        list.push({ type: 'info', text: `You spent ${((current / prev - 1) * 100).toFixed(0)}% more on ${cat.name} than last month` });
      }
      if (cat.budget && current > cat.budget) {
        list.push({ type: 'warning', text: `${cat.name} exceeded its budget (${formatCurrency(current)} / ${formatCurrency(cat.budget)})` });
      }
    });
    return list.slice(0, 4);
  }, [percentUsed, totalSpent, currentSalary, categoryTotals, prevCategoryTotals, categories]);

  const topCategories = useMemo(() => {
    return categories
      .map(c => ({ ...c, total: categoryTotals[c.id] || 0 }))
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 4);
  }, [categories, categoryTotals]);

  const filteredExpenses = useMemo(() => {
    let list = [...monthExpenses];
    if (searchTerm) list = list.filter(e => e.description.toLowerCase().includes(searchTerm.toLowerCase()));
    if (filterCategory !== 'all') list = list.filter(e => e.category === filterCategory);
    const sorters = {
      'date-desc': (a, b) => new Date(b.date) - new Date(a.date),
      'date-asc': (a, b) => new Date(a.date) - new Date(b.date),
      'amount-desc': (a, b) => b.amount - a.amount,
      'amount-asc': (a, b) => a.amount - b.amount,
    };
    return list.sort(sorters[sortBy]);
  }, [monthExpenses, searchTerm, filterCategory, sortBy]);

  const monthlyTrend = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthExps = expenses.filter(e => {
        const ed = new Date(e.date);
        return ed.getFullYear() === d.getFullYear() && ed.getMonth() === d.getMonth();
      });
      data.push({
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        total: monthExps.reduce((s, e) => s + e.amount, 0),
      });
    }
    return data;
  }, [expenses, currentDate]);

  const top5Expenses = useMemo(() => [...monthExpenses].sort((a, b) => b.amount - a.amount).slice(0, 5), [monthExpenses]);

  const healthScore = useMemo(() => {
    if (currentSalary === 0) return 0;
    const savingsRate = Math.max(0, (currentSalary - totalSpent) / currentSalary);
    const budgetAdherence = categories.reduce((acc, c) => {
      if (!c.budget) return acc;
      const spent = categoryTotals[c.id] || 0;
      return acc + (spent <= c.budget ? 1 : 0);
    }, 0) / Math.max(1, categories.filter(c => c.budget).length);
    return Math.round((savingsRate * 60 + budgetAdherence * 40));
  }, [currentSalary, totalSpent, categories, categoryTotals]);

  const navigateMonth = (dir) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + dir, 1));
  };

  const saveExpense = (exp) => {
    if (editingExpense) {
      setExpenses(expenses.map(e => e.id === editingExpense.id ? { ...exp, id: editingExpense.id } : e));
    } else {
      setExpenses([...expenses, { ...exp, id: `exp-${Date.now()}` }]);
    }
    setShowExpenseModal(false);
    setEditingExpense(null);
  };

  const deleteExpense = (id) => setExpenses(expenses.filter(e => e.id !== id));

  const saveCategory = (cat) => {
    if (editingCategory) {
      setCategories(categories.map(c => c.id === editingCategory.id ? { ...cat, id: editingCategory.id } : c));
    } else {
      setCategories([...categories, { ...cat, id: `cat-${Date.now()}` }]);
    }
    setShowCategoryModal(false);
    setEditingCategory(null);
  };

  const deleteCategory = (id) => {
    if (expenses.some(e => e.category === id)) {
      alert('Cannot delete category with existing expenses. Reassign them first.');
      return;
    }
    setCategories(categories.filter(c => c.id !== id));
  };

  const exportData = (format) => {
    if (format === 'json') {
      const data = { expenses, categories, defaultSalary, monthlySalaries, recurring };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses-${monthKey}.json`;
      a.click();
    } else {
      const headers = ['Date', 'Description', 'Category', 'Amount', 'Notes'];
      const rows = expenses.map(e => [e.date, e.description, categories.find(c => c.id === e.category)?.name || e.category, e.amount, e.notes || '']);
      const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses-${monthKey}.csv`;
      a.click();
    }
  };

  const resetAllData = () => {
    if (confirm('This will delete ALL your data. Are you sure?')) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  };

  const theme = darkMode ? {
    bg: 'bg-slate-950',
    glass: 'bg-white/[0.03] border-white/10 backdrop-blur-2xl backdrop-saturate-150',
    glassSolid: 'bg-slate-900/90 backdrop-blur-2xl border-white/10',
    glassHover: 'hover:bg-white/[0.06]',
    text: 'text-white',
    textMuted: 'text-white/60',
    textDim: 'text-white/40',
    input: 'bg-slate-900/60 border-white/10 text-white placeholder-white/30 backdrop-blur-xl [color-scheme:dark]',
    accent: 'bg-white/[0.06]',
    divider: 'border-white/[0.06]',
    shadow: 'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]',
  } : {
    bg: 'bg-slate-100',
    glass: 'bg-white/60 border-white/80 backdrop-blur-2xl backdrop-saturate-150',
    glassSolid: 'bg-white/95 backdrop-blur-2xl border-white/80',
    glassHover: 'hover:bg-white/80',
    text: 'text-slate-900',
    textMuted: 'text-slate-600',
    textDim: 'text-slate-400',
    input: 'bg-white/60 border-white/80 text-slate-900 placeholder-slate-400 backdrop-blur-xl',
    accent: 'bg-white/50',
    divider: 'border-slate-200/50',
    shadow: 'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)]',
  };

  const getCategory = (id) => categories.find(c => c.id === id) || { name: 'Unknown', color: '#999', icon: 'Tag' };
  const renderIcon = (iconName, size = 18, color) => {
    const Icon = ICON_MAP[iconName] || Tag;
    return <Icon size={size} color={color} />;
  };

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} transition-colors duration-300 relative overflow-hidden`} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif', WebkitFontSmoothing: 'antialiased' }}>

      {/* Ambient gradient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full ${darkMode ? 'bg-emerald-500/25' : 'bg-emerald-300/40'} blur-[120px]`}></div>
        <div className={`absolute top-1/3 -right-40 w-[600px] h-[600px] rounded-full ${darkMode ? 'bg-teal-500/20' : 'bg-teal-300/40'} blur-[120px]`}></div>
        <div className={`absolute bottom-0 left-1/3 w-[500px] h-[500px] rounded-full ${darkMode ? 'bg-green-500/15' : 'bg-cyan-300/30'} blur-[120px]`}></div>
        <div className={`absolute top-1/2 left-1/4 w-[400px] h-[400px] rounded-full ${darkMode ? 'bg-cyan-500/15' : 'bg-emerald-300/30'} blur-[120px]`}></div>
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pb-32" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 1rem)' }}>

        {/* Header */}
        <header className="flex items-center justify-between mb-5 py-2">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 ring-1 ring-white/20">
              <Wallet size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Pocket</h1>
              <p className={`text-xs ${theme.textMuted} font-medium`}>Personal finance</p>
            </div>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} className={`w-11 h-11 rounded-full ${theme.glass} ${theme.glassHover} ${theme.shadow} border flex items-center justify-center transition-all active:scale-95`}>
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>

        {/* Month Navigator */}
        <div className={`${theme.glass} ${theme.shadow} border rounded-3xl p-3 mb-5 flex items-center justify-between`}>
          <button onClick={() => navigateMonth(-1)} className={`w-10 h-10 rounded-2xl ${theme.glassHover} flex items-center justify-center transition-all active:scale-95`}>
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <p className={`text-[10px] ${theme.textMuted} uppercase tracking-[0.15em] font-semibold`}>Current Month</p>
            <p className="text-base font-semibold mt-0.5">{formatMonth(currentDate)}</p>
          </div>
          <button onClick={() => navigateMonth(1)} className={`w-10 h-10 rounded-2xl ${theme.glassHover} flex items-center justify-center transition-all active:scale-95`}>
            <ChevronRight size={18} />
          </button>
        </div>

        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 p-6 sm:p-8 shadow-2xl shadow-emerald-500/30 ring-1 ring-white/20">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
              <div className="relative">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <p className="text-white/80 text-sm font-medium">Available balance</p>
                    <p className="text-white text-[40px] sm:text-5xl font-bold tracking-tight mt-1 leading-none">
                      {remaining < 0 ? '-' : ''}{formatCurrency(remaining)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-xl px-3 py-1.5 rounded-full border border-white/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4)]">
                    <Sparkles size={13} className="text-white" />
                    <span className="text-white text-xs font-semibold">{healthScore}%</span>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/90 text-xs font-medium">{percentUsed.toFixed(0)}% used</span>
                    <span className="text-white/90 text-xs font-medium">{formatCurrency(totalSpent)} / {formatCurrency(currentSalary)}</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-xl">
                    <div className="h-full bg-white rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ width: `${Math.min(100, percentUsed)}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className={`${theme.glass} ${theme.shadow} border rounded-3xl p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 backdrop-blur-xl flex items-center justify-center border border-emerald-500/20">
                    <ArrowDownRight size={16} className="text-emerald-500" />
                  </div>
                  <p className={`text-xs ${theme.textMuted} font-semibold`}>Income</p>
                </div>
                <p className="text-xl font-bold">{formatCurrency(currentSalary)}</p>
              </div>
              <div className={`${theme.glass} ${theme.shadow} border rounded-3xl p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 rounded-2xl bg-rose-500/15 backdrop-blur-xl flex items-center justify-center border border-rose-500/20">
                    <ArrowUpRight size={16} className="text-rose-500" />
                  </div>
                  <p className={`text-xs ${theme.textMuted} font-semibold`}>Spent</p>
                </div>
                <p className="text-xl font-bold">{formatCurrency(totalSpent)}</p>
              </div>
              <div className={`${theme.glass} ${theme.shadow} border rounded-3xl p-4 col-span-2 sm:col-span-1`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 rounded-2xl bg-teal-500/15 backdrop-blur-xl flex items-center justify-center border border-teal-500/20">
                    <PiggyBank size={16} className="text-teal-500" />
                  </div>
                  <p className={`text-xs ${theme.textMuted} font-semibold`}>Savings</p>
                </div>
                <p className="text-xl font-bold">{formatCurrency(Math.max(0, remaining))} <span className={`text-xs font-medium ${theme.textMuted}`}>/ {formatCurrency(savingsGoal)}</span></p>
              </div>
            </div>

            {alerts.length > 0 && (
              <div className="space-y-2">
                {alerts.map((a, i) => (
                  <div key={i} className={`${a.type === 'danger' ? 'bg-rose-500/15 border-rose-500/30 text-rose-500' : a.type === 'warning' ? 'bg-amber-500/15 border-amber-500/30 text-amber-600' : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500'} border rounded-2xl p-3.5 flex items-center gap-3 backdrop-blur-xl ${theme.shadow}`}>
                    <AlertCircle size={18} className="flex-shrink-0" />
                    <p className="text-sm font-medium">{a.text}</p>
                  </div>
                ))}
              </div>
            )}

            <div className={`${theme.glass} ${theme.shadow} border rounded-3xl p-5`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Top categories</h2>
                <button onClick={() => setActiveTab('analytics')} className="text-xs text-emerald-500 font-semibold active:opacity-60">See all</button>
              </div>
              {topCategories.length === 0 ? (
                <p className={`text-sm ${theme.textMuted} text-center py-6`}>No expenses this month yet</p>
              ) : (
                <div className="space-y-3.5">
                  {topCategories.map(cat => {
                    const pct = totalSpent > 0 ? (cat.total / totalSpent) * 100 : 0;
                    return (
                      <div key={cat.id} className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 backdrop-blur-xl border" style={{ backgroundColor: `${cat.color}25`, borderColor: `${cat.color}30` }}>
                          {renderIcon(cat.icon, 18, cat.color)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-sm font-semibold truncate">{cat.name}</p>
                            <p className="text-sm font-bold">{formatCurrency(cat.total)}</p>
                          </div>
                          <div className={`h-1.5 ${theme.accent} rounded-full overflow-hidden`}>
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: cat.color }}></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className={`${theme.glass} ${theme.shadow} border rounded-3xl p-5`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Recent activity</h2>
                <button onClick={() => setActiveTab('expenses')} className="text-xs text-emerald-500 font-semibold active:opacity-60">See all</button>
              </div>
              {monthExpenses.length === 0 ? (
                <p className={`text-sm ${theme.textMuted} text-center py-6`}>No expenses yet</p>
              ) : (
                <div className="space-y-1">
                  {[...monthExpenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5).map(exp => {
                    const cat = getCategory(exp.category);
                    return (
                      <div key={exp.id} className={`flex items-center gap-3 p-2 rounded-2xl ${theme.glassHover} transition-colors`}>
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 backdrop-blur-xl border" style={{ backgroundColor: `${cat.color}25`, borderColor: `${cat.color}30` }}>
                          {renderIcon(cat.icon, 18, cat.color)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{exp.description}</p>
                          <p className={`text-xs ${theme.textMuted}`}>{new Date(exp.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} · {cat.name}</p>
                        </div>
                        <p className="text-sm font-bold">-{formatCurrency(exp.amount)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* EXPENSES */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            <div className={`${theme.glass} ${theme.shadow} border rounded-3xl p-4 space-y-3`}>
              <div className="relative">
                <Search size={18} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${theme.textMuted}`} />
                <input type="text" placeholder="Search expenses..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`w-full ${theme.input} border rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40`} />
              </div>
              <div className="flex gap-2">
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={`flex-1 ${theme.input} border rounded-2xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40`}>
                  <option value="all">All categories</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={`flex-1 ${theme.input} border rounded-2xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40`}>
                  <option value="date-desc">Newest first</option>
                  <option value="date-asc">Oldest first</option>
                  <option value="amount-desc">Highest amount</option>
                  <option value="amount-asc">Lowest amount</option>
                </select>
              </div>
            </div>

            <div className={`${theme.glass} ${theme.shadow} border rounded-3xl overflow-hidden`}>
              {filteredExpenses.length === 0 ? (
                <div className="p-12 text-center">
                  <div className={`w-16 h-16 rounded-2xl ${theme.accent} mx-auto mb-3 flex items-center justify-center backdrop-blur-xl`}>
                    <Wallet size={24} className={theme.textMuted} />
                  </div>
                  <p className={`text-sm ${theme.textMuted}`}>No expenses match your filters</p>
                </div>
              ) : (
                <div className={`divide-y ${theme.divider}`}>
                  {filteredExpenses.map(exp => {
                    const cat = getCategory(exp.category);
                    return (
                      <div key={exp.id} className={`group flex items-center gap-3 p-4 ${theme.glassHover} transition-colors`}>
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 backdrop-blur-xl border" style={{ backgroundColor: `${cat.color}25`, borderColor: `${cat.color}30` }}>
                          {renderIcon(cat.icon, 20, cat.color)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{exp.description}</p>
                          <p className={`text-xs ${theme.textMuted}`}>{new Date(exp.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} · {cat.name}</p>
                          {exp.notes && <p className={`text-xs ${theme.textDim} mt-0.5 italic truncate`}>{exp.notes}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold">-{formatCurrency(exp.amount)}</p>
                          <div className="flex gap-1">
                            <button onClick={() => { setEditingExpense(exp); setShowExpenseModal(true); }} className={`w-9 h-9 rounded-xl ${theme.accent} ${theme.glassHover} flex items-center justify-center active:scale-95 transition-transform`}>
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => deleteExpense(exp.id)} className="w-9 h-9 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 flex items-center justify-center active:scale-95 transition-transform border border-rose-500/20">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-4">
            <div className={`${theme.glass} ${theme.shadow} border rounded-3xl p-5`}>
              <h2 className="font-semibold mb-4">Category breakdown</h2>
              {totalSpent === 0 ? (
                <p className={`text-sm ${theme.textMuted} text-center py-8`}>No data for this month</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-4 items-center">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categories.map(c => ({ name: c.name, value: categoryTotals[c.id] || 0, color: c.color })).filter(d => d.value > 0)} innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value">
                          {categories.filter(c => (categoryTotals[c.id] || 0) > 0).map((c, i) => <Cell key={i} fill={c.color} stroke="none" />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255,255,255,0.95)', border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.8)', borderRadius: '16px', backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }} formatter={(v) => formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {categories.map(c => ({ ...c, total: categoryTotals[c.id] || 0 })).filter(c => c.total > 0).sort((a, b) => b.total - a.total).map(cat => {
                      const pct = totalSpent > 0 ? (cat.total / totalSpent) * 100 : 0;
                      return (
                        <div key={cat.id} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                          <span className="text-sm flex-1">{cat.name}</span>
                          <span className={`text-xs ${theme.textMuted}`}>{pct.toFixed(0)}%</span>
                          <span className="text-sm font-bold w-20 text-right">{formatCurrency(cat.total)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className={`${theme.glass} ${theme.shadow} border rounded-3xl p-5`}>
              <h2 className="font-semibold mb-4">6-month trend</h2>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                    <XAxis dataKey="month" stroke={darkMode ? '#64748b' : '#94a3b8'} fontSize={12} />
                    <YAxis stroke={darkMode ? '#64748b' : '#94a3b8'} fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255,255,255,0.95)', border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.8)', borderRadius: '16px', backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }} formatter={(v) => formatCurrency(v)} />
                    <Line type="monotone" dataKey="total" stroke="url(#gradient)" strokeWidth={3} dot={{ fill: '#10B981', r: 4 }} activeDot={{ r: 6 }} />
                    <defs>
                      <linearGradient id="gradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#10B981" />
                        <stop offset="100%" stopColor="#06B6D4" />
                      </linearGradient>
                    </defs>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={`${theme.glass} ${theme.shadow} border rounded-3xl p-5`}>
              <h2 className="font-semibold mb-4">This month vs last month</h2>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categories.map(c => ({ name: c.name.slice(0, 8), current: categoryTotals[c.id] || 0, previous: prevCategoryTotals[c.id] || 0 })).filter(d => d.current > 0 || d.previous > 0)}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                    <XAxis dataKey="name" stroke={darkMode ? '#64748b' : '#94a3b8'} fontSize={11} />
                    <YAxis stroke={darkMode ? '#64748b' : '#94a3b8'} fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255,255,255,0.95)', border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.8)', borderRadius: '16px', backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }} formatter={(v) => formatCurrency(v)} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="previous" fill={darkMode ? '#475569' : '#cbd5e1'} radius={[8, 8, 0, 0]} name="Last month" />
                    <Bar dataKey="current" fill="#10B981" radius={[8, 8, 0, 0]} name="This month" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={`${theme.glass} ${theme.shadow} border rounded-3xl p-5`}>
              <h2 className="font-semibold mb-4">Top 5 expenses</h2>
              {top5Expenses.length === 0 ? (
                <p className={`text-sm ${theme.textMuted} text-center py-6`}>No expenses yet</p>
              ) : (
                <div className="space-y-2">
                  {top5Expenses.map((exp, i) => {
                    const cat = getCategory(exp.category);
                    return (
                      <div key={exp.id} className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-xl ${theme.accent} backdrop-blur-xl flex items-center justify-center text-xs font-bold ${theme.textMuted}`}>{i + 1}</div>
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 backdrop-blur-xl border" style={{ backgroundColor: `${cat.color}25`, borderColor: `${cat.color}30` }}>
                          {renderIcon(cat.icon, 16, cat.color)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{exp.description}</p>
                          <p className={`text-xs ${theme.textMuted}`}>{cat.name}</p>
                        </div>
                        <p className="text-sm font-bold">-{formatCurrency(exp.amount)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CATEGORIES */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            <button onClick={() => { setEditingCategory(null); setShowCategoryModal(true); }} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl py-3.5 font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 ring-1 ring-white/20 active:scale-[0.98] transition-transform">
              <Plus size={18} />
              New category
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map(cat => {
                const spent = categoryTotals[cat.id] || 0;
                const budgetPct = cat.budget ? (spent / cat.budget) * 100 : 0;
                return (
                  <div key={cat.id} className={`${theme.glass} ${theme.shadow} border rounded-3xl p-4`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-xl border" style={{ backgroundColor: `${cat.color}25`, borderColor: `${cat.color}30` }}>
                          {renderIcon(cat.icon, 20, cat.color)}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{cat.name}</p>
                          <p className={`text-xs ${theme.textMuted} mt-0.5`}>{formatCurrency(spent)} spent</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingCategory(cat); setShowCategoryModal(true); }} className={`w-9 h-9 rounded-xl ${theme.accent} ${theme.glassHover} flex items-center justify-center active:scale-95 transition-transform`}>
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => deleteCategory(cat.id)} className="w-9 h-9 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 flex items-center justify-center active:scale-95 transition-transform border border-rose-500/20">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {cat.budget > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs ${theme.textMuted} font-medium`}>Budget</span>
                          <span className={`text-xs font-semibold ${budgetPct > 100 ? 'text-rose-500' : budgetPct > 80 ? 'text-amber-500' : theme.textMuted}`}>{formatCurrency(spent)} / {formatCurrency(cat.budget)}</span>
                        </div>
                        <div className={`h-1.5 ${theme.accent} rounded-full overflow-hidden`}>
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, budgetPct)}%`, backgroundColor: budgetPct > 100 ? '#ef4444' : cat.color }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div className={`${theme.glass} ${theme.shadow} border rounded-3xl p-5`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold">Monthly income</h2>
                  <p className={`text-xs ${theme.textMuted} mt-0.5`}>{formatMonth(currentDate)}</p>
                </div>
                <button onClick={() => setShowSalaryModal(true)} className={`${theme.accent} ${theme.glassHover} ${theme.shadow} rounded-2xl px-4 py-2 text-sm font-semibold transition-colors active:scale-95`}>Edit</button>
              </div>
              <p className="text-3xl font-bold">{formatCurrency(currentSalary)}</p>
              <p className={`text-xs ${theme.textMuted} mt-1`}>Default: {formatCurrency(defaultSalary)}{monthlySalaries[monthKey] && ' · Custom for this month'}</p>
            </div>

            <div className={`${theme.glass} ${theme.shadow} border rounded-3xl p-5`}>
              <h2 className="font-semibold mb-3">Monthly savings goal</h2>
              <div className="flex items-center gap-3">
                <span className={`text-sm ${theme.textMuted}`}>€</span>
                <input type="number" value={savingsGoal} onChange={(e) => setSavingsGoal(Number(e.target.value))} className={`flex-1 ${theme.input} border rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40`} />
              </div>
            </div>

            <div className={`${theme.glass} ${theme.shadow} border rounded-3xl p-5`}>
              <div className="flex items-center gap-2 mb-3">
                <Repeat size={18} className={theme.textMuted} />
                <h2 className="font-semibold">Recurring expenses</h2>
              </div>
              {recurring.length === 0 ? (
                <p className={`text-sm ${theme.textMuted} text-center py-4`}>No recurring expenses</p>
              ) : (
                <div className="space-y-2">
                  {recurring.map(r => {
                    const cat = getCategory(r.category);
                    return (
                      <div key={r.id} className={`flex items-center gap-3 p-3 ${theme.accent} backdrop-blur-xl rounded-2xl border ${theme.divider}`}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center border backdrop-blur-xl" style={{ backgroundColor: `${cat.color}25`, borderColor: `${cat.color}30` }}>
                          {renderIcon(cat.icon, 16, cat.color)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{r.description}</p>
                          <p className={`text-xs ${theme.textMuted}`}>Day {r.day} · {cat.name}</p>
                        </div>
                        <p className="text-sm font-bold">{formatCurrency(r.amount)}</p>
                        <button onClick={() => setRecurring(recurring.filter(x => x.id !== r.id))} className="w-7 h-7 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 flex items-center justify-center border border-rose-500/20">
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className={`${theme.glass} ${theme.shadow} border rounded-3xl p-5`}>
              <h2 className="font-semibold mb-3">Export data</h2>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => exportData('json')} className={`${theme.accent} ${theme.glassHover} ${theme.shadow} rounded-2xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors active:scale-95 border ${theme.divider}`}>
                  <Download size={16} />JSON
                </button>
                <button onClick={() => exportData('csv')} className={`${theme.accent} ${theme.glassHover} ${theme.shadow} rounded-2xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors active:scale-95 border ${theme.divider}`}>
                  <Download size={16} />CSV
                </button>
              </div>
            </div>

            <div className={`${theme.glass} ${theme.shadow} border rounded-3xl p-5`}>
              <h2 className="font-semibold mb-3 text-rose-500">Danger zone</h2>
              <button onClick={resetAllData} className="w-full bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 rounded-2xl py-3 text-sm font-semibold border border-rose-500/30 active:scale-95 transition-transform">
                Reset all data
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="max-w-6xl mx-auto px-4 pb-3 pt-2">
          <div className={`${theme.glassSolid} ${theme.shadow} border rounded-[28px] p-2 flex items-center justify-around shadow-2xl`}>
            {[
              { id: 'dashboard', label: 'Home', icon: Home },
              { id: 'expenses', label: 'Expenses', icon: Wallet },
              { id: 'add', label: '', icon: Plus, isAction: true },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'settings', label: 'More', icon: Settings },
            ].map(tab => {
              const Icon = tab.icon;
              if (tab.isAction) {
                return (
                  <button key={tab.id} onClick={() => { setEditingExpense(null); setShowExpenseModal(true); }} className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/40 ring-1 ring-white/20 active:scale-90 transition-transform -mt-1">
                    <Plus size={24} className="text-white" />
                  </button>
                );
              }
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all active:scale-90 ${active ? 'text-emerald-500' : theme.textMuted}`}>
                  <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                  <span className="text-[10px] font-semibold">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {activeTab === 'settings' && (
        <div className="fixed bottom-28 right-4 z-30" style={{ bottom: 'calc(7rem + env(safe-area-inset-bottom, 0px))' }}>
          <button onClick={() => setActiveTab('categories')} className={`${theme.glassSolid} ${theme.shadow} border rounded-full px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-transform shadow-lg`}>
            <Tag size={14} />Manage Categories
          </button>
        </div>
      )}

      {showExpenseModal && <ExpenseModal expense={editingExpense} categories={categories} theme={theme} darkMode={darkMode} onSave={saveExpense} onClose={() => { setShowExpenseModal(false); setEditingExpense(null); }} currentDate={currentDate} />}
      {showCategoryModal && <CategoryModal category={editingCategory} theme={theme} onSave={saveCategory} onClose={() => { setShowCategoryModal(false); setEditingCategory(null); }} />}
      {showSalaryModal && <SalaryModal currentSalary={currentSalary} defaultSalary={defaultSalary} monthKey={monthKey} monthName={formatMonth(currentDate)} hasCustom={!!monthlySalaries[monthKey]} theme={theme} onSaveMonth={(val) => { setMonthlySalaries({ ...monthlySalaries, [monthKey]: val }); setShowSalaryModal(false); }} onSaveDefault={(val) => { setDefaultSalary(val); setShowSalaryModal(false); }} onResetMonth={() => { const nm = { ...monthlySalaries }; delete nm[monthKey]; setMonthlySalaries(nm); setShowSalaryModal(false); }} onClose={() => setShowSalaryModal(false)} />}
    </div>
  );
}

function ExpenseModal({ expense, categories, theme, onSave, onClose, currentDate }) {
  const [amount, setAmount] = useState(expense?.amount || '');
  const [description, setDescription] = useState(expense?.description || '');
  const [category, setCategory] = useState(expense?.category || categories[0]?.id);
  const [date, setDate] = useState(expense?.date || new Date(currentDate.getFullYear(), currentDate.getMonth(), new Date().getDate()).toISOString().split('T')[0]);
  const [notes, setNotes] = useState(expense?.notes || '');

  const handleSave = () => {
    if (!amount || !description || !category || !date) return;
    onSave({ amount: Number(amount), description, category, date, notes });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-end sm:items-center justify-center sm:p-4 overflow-hidden" onClick={onClose}>
      <div className={`${theme.glassSolid} ${theme.shadow} border rounded-t-[32px] sm:rounded-[32px] w-full max-w-md shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh]`} onClick={(e) => e.stopPropagation()}>
        <div className="overflow-y-auto overscroll-contain p-6" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1.5rem)' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold">{expense ? 'Edit expense' : 'New expense'}</h2>
            <button onClick={onClose} className={`w-10 h-10 rounded-full ${theme.accent} ${theme.glassHover} flex items-center justify-center active:scale-95`}>
              <X size={18} />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className={`text-xs font-semibold ${theme.textMuted} mb-1.5 block`}>Amount</label>
              <div className="relative">
                <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.textMuted} text-lg`}>€</span>
                <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" autoFocus className={`w-full ${theme.input} border rounded-2xl pl-10 pr-4 py-3.5 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/40`} />
              </div>
            </div>
            <div>
              <label className={`text-xs font-semibold ${theme.textMuted} mb-1.5 block`}>Description</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was it for?" className={`w-full ${theme.input} border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40`} />
            </div>
            <div>
              <label className={`text-xs font-semibold ${theme.textMuted} mb-1.5 block`}>Category</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {categories.map(c => {
                  const Icon = ICON_MAP[c.icon] || Tag;
                  const selected = category === c.id;
                  return (
                    <button key={c.id} onClick={() => setCategory(c.id)} className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border-2 transition-all active:scale-95 ${selected ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/5' : `border-transparent ${theme.accent}`}`}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center backdrop-blur-xl" style={{ backgroundColor: `${c.color}25` }}>
                        <Icon size={16} color={c.color} />
                      </div>
                      <span className="text-[11px] font-semibold truncate w-full text-center">{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className={`text-xs font-semibold ${theme.textMuted} mb-1.5 block`}>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`w-full ${theme.input} border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40`} />
            </div>
            <div>
              <label className={`text-xs font-semibold ${theme.textMuted} mb-1.5 block`}>Notes (optional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add a note..." rows={2} className={`w-full ${theme.input} border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none`} />
            </div>
            <button onClick={handleSave} disabled={!amount || !description} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl py-4 font-bold text-sm shadow-lg shadow-emerald-500/30 ring-1 ring-white/20 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed">
              {expense ? 'Update expense' : 'Add expense'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryModal({ category, theme, onSave, onClose }) {
  const [name, setName] = useState(category?.name || '');
  const [color, setColor] = useState(category?.color || AVAILABLE_COLORS[0]);
  const [icon, setIcon] = useState(category?.icon || AVAILABLE_ICONS[0]);
  const [budget, setBudget] = useState(category?.budget || '');

  const handleSave = () => {
    if (!name) return;
    onSave({ name, color, icon, budget: Number(budget) || 0 });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-end sm:items-center justify-center sm:p-4 overflow-hidden" onClick={onClose}>
      <div className={`${theme.glassSolid} ${theme.shadow} border rounded-t-[32px] sm:rounded-[32px] w-full max-w-md shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh]`} onClick={(e) => e.stopPropagation()}>
        <div className="overflow-y-auto overscroll-contain p-6" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1.5rem)' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold">{category ? 'Edit category' : 'New category'}</h2>
            <button onClick={onClose} className={`w-10 h-10 rounded-full ${theme.accent} ${theme.glassHover} flex items-center justify-center active:scale-95`}>
              <X size={18} />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className={`text-xs font-semibold ${theme.textMuted} mb-1.5 block`}>Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" className={`w-full ${theme.input} border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40`} />
            </div>
            <div>
              <label className={`text-xs font-semibold ${theme.textMuted} mb-1.5 block`}>Color</label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)} className={`w-10 h-10 rounded-2xl transition-all ring-1 ring-white/20 ${color === c ? 'ring-2 ring-offset-2 ring-emerald-500 scale-110' : ''}`} style={{ backgroundColor: c }}></button>
                ))}
              </div>
            </div>
            <div>
              <label className={`text-xs font-semibold ${theme.textMuted} mb-1.5 block`}>Icon</label>
              <div className="grid grid-cols-6 gap-2">
                {AVAILABLE_ICONS.map(i => {
                  const Icon = ICON_MAP[i];
                  return (
                    <button key={i} onClick={() => setIcon(i)} className={`w-full aspect-square rounded-2xl flex items-center justify-center transition-all active:scale-90 ${icon === i ? 'ring-2 ring-emerald-500' : theme.accent}`} style={icon === i ? { backgroundColor: `${color}25` } : {}}>
                      <Icon size={18} color={icon === i ? color : undefined} />
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className={`text-xs font-semibold ${theme.textMuted} mb-1.5 block`}>Monthly budget (optional)</label>
              <div className="relative">
                <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.textMuted}`}>€</span>
                <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0" className={`w-full ${theme.input} border rounded-2xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40`} />
              </div>
            </div>
            <button onClick={handleSave} disabled={!name} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl py-4 font-bold text-sm shadow-lg shadow-emerald-500/30 ring-1 ring-white/20 active:scale-[0.98] transition-transform disabled:opacity-50">
              {category ? 'Update category' : 'Create category'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SalaryModal({ currentSalary, defaultSalary, monthName, hasCustom, theme, onSaveMonth, onSaveDefault, onResetMonth, onClose }) {
  const [monthVal, setMonthVal] = useState(currentSalary);
  const [defaultVal, setDefaultVal] = useState(defaultSalary);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-end sm:items-center justify-center sm:p-4 overflow-hidden" onClick={onClose}>
      <div className={`${theme.glassSolid} ${theme.shadow} border rounded-t-[32px] sm:rounded-[32px] w-full max-w-md shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh]`} onClick={(e) => e.stopPropagation()}>
        <div className="overflow-y-auto overscroll-contain p-6" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1.5rem)' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold">Income</h2>
            <button onClick={onClose} className={`w-10 h-10 rounded-full ${theme.accent} ${theme.glassHover} flex items-center justify-center active:scale-95`}>
              <X size={18} />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className={`text-xs font-semibold ${theme.textMuted} mb-1.5 block`}>Income for {monthName}</label>
              <div className="relative">
                <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.textMuted} text-lg`}>€</span>
                <input type="number" value={monthVal} onChange={(e) => setMonthVal(Number(e.target.value))} className={`w-full ${theme.input} border rounded-2xl pl-10 pr-4 py-3.5 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/40`} />
              </div>
              <button onClick={() => onSaveMonth(monthVal)} className="w-full mt-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl py-3 font-semibold text-sm shadow-lg shadow-emerald-500/30 ring-1 ring-white/20 active:scale-[0.98]">
                Set for this month
              </button>
              {hasCustom && (
                <button onClick={onResetMonth} className={`w-full mt-2 ${theme.accent} ${theme.glassHover} rounded-2xl py-3 font-semibold text-sm border ${theme.divider}`}>
                  Reset to default
                </button>
              )}
            </div>
            <div className={`border-t ${theme.divider} pt-4`}>
              <label className={`text-xs font-semibold ${theme.textMuted} mb-1.5 block`}>Default monthly income</label>
              <div className="relative">
                <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.textMuted}`}>€</span>
                <input type="number" value={defaultVal} onChange={(e) => setDefaultVal(Number(e.target.value))} className={`w-full ${theme.input} border rounded-2xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40`} />
              </div>
              <button onClick={() => onSaveDefault(defaultVal)} className={`w-full mt-2 ${theme.accent} ${theme.glassHover} rounded-2xl py-3 font-semibold text-sm border ${theme.divider}`}>
                Update default
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
