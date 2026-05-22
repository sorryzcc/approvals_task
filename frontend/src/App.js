import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

const API_BASE_URL = 'http://localhost:3001/api';
const AUTO_SAVE_INTERVAL = 30000;

// 角色到权限的映射
const rolePermissions = {
  creator: ['create', 'view'],
  business: ['create', 'view', 'approve_step1'],
  assistant: ['create', 'view'],
  leader: ['create', 'view', 'approve_step2'],
  gm: ['create', 'view', 'approve_step3'],
  admin: ['create', 'view', 'approve_step1', 'approve_step2', 'approve_step3']
};

// 角色显示名称映射
const roleNames = {
  creator: '制单人',
  business: '采购商务',
  assistant: '采购助理',
  leader: '采购组长',
  gm: '采购GM',
  admin: '系统管理员'
};

// 角色图标映射
const roleIcons = {
  creator: '✏️',
  business: '💼',
  assistant: '📋',
  leader: '👔',
  gm: '👑',
  admin: '🔧'
};

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(true);
  const [approvals, setApprovals] = useState([]);
  const [statistics, setStatistics] = useState({ total: 0, draft: 0, pending: 0, approved: 0, rejected: 0 });
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('detail');
  const [actionData, setActionData] = useState({ action: '', comment: '' });
  const [newApproval, setNewApproval] = useState({
    id: null,
    title: '',
    applicant: '',
    department: '',
    type: '采购',
    amount: '',
    description: ''
  });
  const [autoSaveStatus, setAutoSaveStatus] = useState('');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const autoSaveTimerRef = useRef(null);
  const lastSaveTimeRef = useRef(Date.now());
  const [currentDetail, setCurrentDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 登录函数 - 账号密码登录
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/login`, {
        username: loginForm.username,
        password: loginForm.password
      });
      
      if (response.data.code === 200 && response.data.data) {
        const user = response.data.data;
        // 为用户添加权限信息
        const userWithPermissions = {
          ...user,
          permissions: rolePermissions[user.role] || ['view'],
          roleName: roleNames[user.role] || user.role
        };
        
        setCurrentUser(userWithPermissions);
        setIsLoggedIn(true);
        setShowLoginModal(false);
        setNewApproval(prev => ({ ...prev, applicant: user.name, department: user.department }));
        // 保存到 localStorage
        localStorage.setItem('currentUser', JSON.stringify(userWithPermissions));
        setLoginForm({ username: '', password: '' });
      } else {
        setLoginError(response.data.message || '登录失败');
      }
    } catch (error) {
      console.error('登录失败:', error);
      if (error.response && error.response.data && error.response.data.message) {
        setLoginError(error.response.data.message);
      } else {
        setLoginError('登录失败，请检查网络连接');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  // 登出函数
  const handleLogout = () => {
    setCurrentUser(null);
    setIsLoggedIn(false);
    setShowLoginModal(true);
    // 清除 localStorage
    localStorage.removeItem('currentUser');
  };

  // 组件挂载时检查 localStorage
  useEffect(() => {
    // 检查 localStorage
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        setIsLoggedIn(true);
        setShowLoginModal(false);
        setNewApproval(prev => ({ ...prev, applicant: user.name, department: user.department }));
      } catch (e) {
        localStorage.removeItem('currentUser');
      }
    }
  }, []);

  // 检查权限
  const hasPermission = (permission) => {
    if (!currentUser || !currentUser.permissions) return false;
    return currentUser.permissions.includes(permission);
  };

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterType !== 'all') params.type = filterType;
      if (keyword) params.keyword = keyword;

      const response = await axios.get(`${API_BASE_URL}/approvals`, { params });
      setApprovals(response.data.data);
    } catch (error) {
      console.error('获取审批列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/statistics`);
      setStatistics(response.data.data);
    } catch (error) {
      console.error('获取统计数据失败:', error);
    }
  };

  useEffect(() => {
    fetchApprovals();
    fetchStatistics();
  }, [filterStatus, filterType, keyword]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (location.pathname.startsWith('/detail/')) {
      const id = location.pathname.split('/detail/')[1];
      const fetchDetail = async () => {
        setDetailLoading(true);
        try {
          const response = await axios.get(`${API_BASE_URL}/approvals/${id}`);
          setCurrentDetail(response.data.data);
        } catch (error) {
          console.error('获取详情失败:', error);
          alert('获取详情失败');
        } finally {
          setDetailLoading(false);
        }
      };
      fetchDetail();
    }
  }, [location.pathname]);

  const startAutoSave = () => {
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }
    
    autoSaveTimerRef.current = setInterval(() => {
      const now = Date.now();
      if (now - lastSaveTimeRef.current > AUTO_SAVE_INTERVAL) {
        if (newApproval.id && (newApproval.title || newApproval.description)) {
          handleAutoSave();
        }
      }
    }, 5000);
  };

  const stopAutoSave = () => {
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  };

  const handleViewDetail = (id) => {
    navigate(`/detail/${id}`);
  };

  const handleCreate = () => {
    setNewApproval({
      id: null,
      title: '',
      applicant: currentUser?.name || '当前用户',
      department: '',
      type: '采购',
      amount: '',
      description: ''
    });
    setModalType('create');
    setAutoSaveStatus('');
    setShowModal(true);
    startAutoSave();
  };

  const handleEdit = (approval) => {
    setNewApproval({
      id: approval.id,
      title: approval.title,
      applicant: approval.applicant,
      department: approval.department,
      type: approval.type,
      amount: approval.amount,
      description: approval.description
    });
    setModalType('edit');
    setAutoSaveStatus('');
    setShowModal(true);
    startAutoSave();
  };

  const handleAutoSave = async () => {
    if (!newApproval.id) {
      return;
    }
    
    try {
      setAutoSaveStatus('正在保存...');
      await axios.post(`${API_BASE_URL}/approvals/${newApproval.id}/autosave`, newApproval);
      lastSaveTimeRef.current = Date.now();
      setAutoSaveStatus('已自动保存');
      setTimeout(() => setAutoSaveStatus(''), 2000);
    } catch (error) {
      console.error('自动保存失败:', error);
      setAutoSaveStatus('保存失败');
    }
  };

  const handleSaveDraft = async () => {
    try {
      if (newApproval.id) {
        await axios.put(`${API_BASE_URL}/approvals/${newApproval.id}`, newApproval);
      } else {
        const response = await axios.post(`${API_BASE_URL}/approvals`, {
          ...newApproval,
          isDraft: true,
          creator: currentUser?.name || '当前用户'
        });
        setNewApproval(prev => ({ ...prev, id: response.data.data.id }));
      }
      alert('保存为草稿成功');
      setShowModal(false);
      stopAutoSave();
      fetchApprovals();
      fetchStatistics();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败');
    }
  };

  const handleSubmitNew = async (e) => {
    e.preventDefault();
    try {
      if (newApproval.id) {
        await axios.put(`${API_BASE_URL}/approvals/${newApproval.id}`, newApproval);
        await axios.post(`${API_BASE_URL}/approvals/${newApproval.id}/submit`);
      } else {
        await axios.post(`${API_BASE_URL}/approvals`, {
          ...newApproval,
          creator: currentUser?.name || '当前用户'
        });
      }
      alert('提交成功');
      setShowModal(false);
      stopAutoSave();
      fetchApprovals();
      fetchStatistics();
    } catch (error) {
      console.error('提交失败:', error);
      alert('提交失败');
    }
  };

  const handleSubmitDraft = async (id) => {
    try {
      await axios.post(`${API_BASE_URL}/approvals/${id}/submit`);
      alert('提交成功');
      fetchApprovals();
      fetchStatistics();
    } catch (error) {
      console.error('提交失败:', error);
      alert('提交失败');
    }
  };

  const handleDeleteDraft = async (id) => {
    if (!window.confirm('确定要删除这个草稿吗？')) {
      return;
    }
    
    try {
      await axios.delete(`${API_BASE_URL}/approvals/${id}`);
      alert('删除成功');
      fetchApprovals();
      fetchStatistics();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  };

  const handleAction = (approval, action) => {
    setSelectedApproval(approval);
    setActionData({ action, comment: '', step: approval.currentStep });
    setModalType('action');
    setShowModal(true);
  };

  const handleSubmitAction = async (e) => {
    e.preventDefault();
    try {
      const step = selectedApproval.currentStep;
      if (step && step >= 1 && step <= 3) {
        await axios.post(`${API_BASE_URL}/approvals/${selectedApproval.id}/step/${step}`, {
          action: actionData.action,
          comment: actionData.comment,
          approver: currentUser?.name || '当前用户'
        });
      } else {
        await axios.post(`${API_BASE_URL}/approvals/${selectedApproval.id}/action`, {
          ...actionData,
          approver: currentUser?.name || '当前用户'
        });
      }
      const stepNames = {
        1: '商务评估',
        2: '采购组长审批',
        3: 'GM审批'
      };
      const msg = actionData.action === 'approve' 
        ? (step ? `${stepNames[step]}审批通过` : '审批通过') 
        : (step ? `${stepNames[step]}审批拒绝` : '审批拒绝');
      alert(msg);
      setShowModal(false);
      fetchApprovals();
      fetchStatistics();
    } catch (error) {
      console.error('操作失败:', error);
      alert(error.response?.data?.message || '操作失败');
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    stopAutoSave();
  };

  const getStatusText = (status, currentStep) => {
    if (status === 'pending' && currentStep) {
      const stepNames = {
        1: '待商务评估',
        2: '待采购组长审批',
        3: '待GM审批'
      };
      return stepNames[currentStep] || '待审批';
    }
    const statusMap = {
      draft: '待提交',
      pending: '待审批',
      approved: '已结单',
      rejected: '已拒绝'
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status) => {
    const classMap = {
      draft: 'status-draft',
      pending: 'status-pending',
      approved: 'status-approved',
      rejected: 'status-rejected'
    };
    return classMap[status] || '';
  };

  const calculateProgress = (approval) => {
    if (approval.status === 'draft') return 0;
    if (approval.status === 'approved') return 100;
    if (approval.status === 'rejected') return 100;
    
    const steps = approval.totalSteps || 3;
    const current = approval.currentStep || 0;
    return Math.round((current / steps) * 100);
  };

  const getStepStatus = (approval, step) => {
    const statusField = `step${step}Status`;
    return approval[statusField] || 'pending';
  };

  return (
    <div className="app">
      {/* 登录模态框 */}
      {showLoginModal && (
        <div className="login-overlay">
          <div className="login-container">
            <div className="login-header">
              <h2>🔐 用户登录</h2>
              <p>请输入账号密码登录系统</p>
            </div>
            <form className="login-form" onSubmit={(e) => handleLoginSubmit(e)}>
              <div className="form-group">
                <label htmlFor="username">账号</label>
                <input
                  type="text"
                  id="username"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="请输入账号"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">密码</label>
                <input
                  type="password"
                  id="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="请输入密码"
                  required
                />
              </div>
              <button type="submit" className="login-btn">
                {loginLoading ? '登录中...' : '登 录'}
              </button>
              {loginError && <div className="login-error">{loginError}</div>}
              <div className="login-hint">
                <p>测试账号：zhangsan / lisi / wangwu / zhaoliu / sunqi</p>
                <p>密码统一：123456</p>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 主界面 */}
      {isLoggedIn && (
        <>
          <aside className="sidebar">
            <div className="sidebar-header">
              <h2>📋 审批系统</h2>
              {currentUser && (
                <div className="user-profile">
                  <div className="user-avatar">
                    {currentUser.role === 'creator' && '✏️'}
                    {currentUser.role === 'business' && '💼'}
                    {currentUser.role === 'assistant' && '📋'}
                    {currentUser.role === 'leader' && '👔'}
                    {currentUser.role === 'gm' && '👑'}
                  </div>
                  <div className="user-details">
                    <div className="user-name-text">{currentUser.name}</div>
                    <div className="user-department-text">{currentUser.department}</div>
                  </div>
                  <button className="logout-btn" onClick={handleLogout}>
                    退出
                  </button>
                </div>
              )}
            </div>
            <nav className="sidebar-nav">
              <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
                <span className="nav-icon">🏠</span>
                <span className="nav-text">首页</span>
              </Link>
              <Link to="/create" className={`nav-item ${location.pathname === '/create' ? 'active' : ''}`}>
                <span className="nav-icon">➕</span>
                <span className="nav-text">创建需求</span>
              </Link>
              <Link to="/list" className={`nav-item ${location.pathname === '/list' ? 'active' : ''}`}>
                <span className="nav-icon">📝</span>
                <span className="nav-text">需求列表</span>
              </Link>
              <Link to="/approval" className={`nav-item ${location.pathname === '/approval' ? 'active' : ''}`}>
                <span className="nav-icon">✓</span>
                <span className="nav-text">审批列表</span>
              </Link>
            </nav>
      </aside>

      <main className="main-content">
        <Routes>
          <Route path="/" element={
            <>
              <header className="content-header">
                <h1>首页</h1>
              </header>
            <div className="container">
              {/* 第一排：创建需求、我的全部需求 */}
              <div className="home-actions">
                <Link to="/create" className="action-card primary">
                  <span className="action-icon">➕</span>
                  <span className="action-text">创建需求</span>
                </Link>
                <Link to="/list" className="action-card secondary">
                  <span className="action-icon">📋</span>
                  <span className="action-text">我的全部需求</span>
                </Link>
              </div>

              {/* 第二排：状态统计 */}
              <div className="status-stats">
                <div className="status-card status-draft" onClick={() => { setFilterStatus('draft'); navigate('/list'); }}>
                  <div className="status-icon">📝</div>
                  <div className="status-info">
                    <div className="status-count">{statistics.draft}</div>
                    <div className="status-name">待提交</div>
                  </div>
                </div>
                <div className="status-card status-business" onClick={() => { setFilterStatus('pending'); navigate('/list'); }}>
                  <div className="status-icon">💼</div>
                  <div className="status-info">
                    <div className="status-count">{statistics.pending > 0 ? Math.ceil(statistics.pending / 3) : 0}</div>
                    <div className="status-name">商务评估中</div>
                  </div>
                </div>
                <div className="status-card status-leader" onClick={() => { setFilterStatus('pending'); navigate('/list'); }}>
                  <div className="status-icon">👔</div>
                  <div className="status-info">
                    <div className="status-count">{statistics.pending > 0 ? Math.ceil(statistics.pending / 3) : 0}</div>
                    <div className="status-name">采购组长审核中</div>
                  </div>
                </div>
                <div className="status-card status-gm" onClick={() => { setFilterStatus('pending'); navigate('/list'); }}>
                  <div className="status-icon">👑</div>
                  <div className="status-info">
                    <div className="status-count">{statistics.pending > 0 ? Math.ceil(statistics.pending / 3) : 0}</div>
                    <div className="status-name">采购GM审核中</div>
                  </div>
                </div>
                <div className="status-card status-execution" onClick={() => { setFilterStatus('approved'); navigate('/list'); }}>
                  <div className="status-icon">✅</div>
                  <div className="status-info">
                    <div className="status-count">{statistics.approved}</div>
                    <div className="status-name">采购执行审核中</div>
                  </div>
                </div>
              </div>
            </div>
            </>
          } />
          
          <Route path="/create" element={
            <>
              <header className="content-header">
                <h1>创建需求</h1>
              </header>
            <div className="container container-fullwidth">
              <div className="form-container">
                <form onSubmit={handleSubmitNew}>
                  <div className="form-group">
                    <label>标题:</label>
                    <input
                      type="text"
                      value={newApproval.title}
                      onChange={(e) => setNewApproval({...newApproval, title: e.target.value})}
                      placeholder="请输入审批标题"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>申请人:</label>
                    <input
                      type="text"
                      value={newApproval.applicant}
                      onChange={(e) => setNewApproval({...newApproval, applicant: e.target.value})}
                      placeholder="请输入申请人姓名"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>部门:</label>
                    <input
                      type="text"
                      value={newApproval.department}
                      onChange={(e) => setNewApproval({...newApproval, department: e.target.value})}
                      placeholder="请输入部门名称"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>类型:</label>
                    <select
                      value={newApproval.type}
                      onChange={(e) => setNewApproval({...newApproval, type: e.target.value})}
                    >
                      <option value="采购">采购</option>
                      <option value="请假">请假</option>
                      <option value="报销">报销</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>金额:</label>
                    <input
                      type="number"
                      value={newApproval.amount}
                      onChange={(e) => setNewApproval({...newApproval, amount: e.target.value})}
                      placeholder="请输入金额"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label>描述:</label>
                    <textarea
                      value={newApproval.description}
                      onChange={(e) => setNewApproval({...newApproval, description: e.target.value})}
                      placeholder="请输入详细描述"
                      rows="4"
                    />
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn btn-secondary" onClick={handleSaveDraft}>
                      保存草稿
                    </button>
                    <button type="submit" className="btn btn-success">
                      创建需求
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => {
                      setNewApproval({
                        id: null,
                        title: '',
                        applicant: currentUser?.name || '当前用户',
                        department: '',
                        type: '采购',
                        amount: '',
                        description: ''
                      });
                    }}>
                      重置
                    </button>
                  </div>
                </form>
              </div>
            </div>
            </>
          } />
          
          <Route path="/list" element={
            <>
              <header className="content-header">
                <h1>需求列表</h1>
              </header>
            <div className="container container-fullwidth">
              <div className="toolbar">
                <div className="filters">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="filter-select"
                  >
                    <option value="all">全部状态</option>
                    <option value="draft">待提交</option>
                    <option value="pending">待审批</option>
                    <option value="approved">已结单</option>
                    <option value="rejected">已拒绝</option>
                  </select>

                  <select 
                    value={filterType} 
                    onChange={(e) => setFilterType(e.target.value)}
                    className="filter-select"
                  >
                    <option value="all">全部类型</option>
                    <option value="采购">采购</option>
                    <option value="请假">请假</option>
                    <option value="报销">报销</option>
                  </select>

                  <input
                    type="text"
                    placeholder="搜索标题、申请人或部门..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className="search-input"
                  />
                </div>
              </div>

              <div className="approval-table-container">
                {loading ? (
                  <div className="loading">加载中...</div>
                ) : approvals.length === 0 ? (
                  <div className="empty-state">暂无审批记录</div>
                ) : (
                  <table className="approval-table">
                    <thead>
                      <tr>
                        <th>需求单号</th>
                        <th>标题</th>
                        <th>申请人</th>
                        <th>部门</th>
                        <th>类型</th>
                        <th>金额</th>
                        <th>当前审批节点</th>
                        <th>创建时间</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvals.map((approval) => (
                        <tr key={approval.id}>
                          <td className="id-cell">{approval.id}</td>
                          <td>
                            <div className="title-cell">
                              <span className="approval-title">{approval.title}</span>
                              {approval.status === 'draft' && (
                                <span className="draft-badge">草稿</span>
                              )}
                            </div>
                          </td>
                          <td>{approval.applicant}</td>
                          <td>{approval.department}</td>
                          <td>{approval.type}</td>
                          <td>{approval.amount > 0 ? `¥${approval.amount.toLocaleString()}` : '-'}</td>
                          <td>
                            {approval.status === 'draft' ? (
                              <span className="status-badge status-draft">待提交</span>
                            ) : approval.status === 'approved' ? (
                              <span className="status-badge status-approved">已结单</span>
                            ) : approval.status === 'rejected' ? (
                              <span className="status-badge status-rejected">已拒绝</span>
                            ) : (
                              <div className="step-info">
                                <span className="step-badge step-current">
                                  {getStatusText(approval.status, approval.currentStep)}
                                </span>
                                {approval.status !== 'draft' && (
                                  <div className="mini-progress">
                                    <div className="mini-progress-bar">
                                      <div
                                        className="mini-progress-fill"
                                        style={{ width: `${calculateProgress(approval)}%` }}
                                      />
                                    </div>
                                    <span className="mini-progress-text">{calculateProgress(approval)}%</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td>{approval.createTime}</td>
                          <td>
                            <div className="action-buttons">
                              <Link to={`/detail/${approval.id}`} className="btn btn-secondary btn-sm">
                                查看
                              </Link>
                              {approval.status === 'draft' && (
                                <>
                                  <button 
                                    className="btn btn-primary btn-sm"
                                    onClick={() => handleEdit(approval)}
                                  >
                                    编辑
                                  </button>
                                  <button 
                                    className="btn btn-success btn-sm"
                                    onClick={() => handleSubmitDraft(approval.id)}
                                  >
                                    提交
                                  </button>
                                  <button 
                                    className="btn btn-danger btn-sm"
                                    onClick={() => handleDeleteDraft(approval.id)}
                                  >
                                    删除
                                  </button>
                                </>
                              )}
                              
                              {approval.status === 'pending' && hasPermission(`approve_step${approval.currentStep}`) && approval.creator !== currentUser?.name && (
                                <>
                                  <button
                                    className="btn btn-success btn-sm"
                                    onClick={() => handleAction(approval, 'approve')}
                                  >
                                    通过
                                  </button>
                                  <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => handleAction(approval, 'reject')}
                                  >
                                    拒绝
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            </>
          } />
          
          <Route path="/approval" element={
            <>
              <header className="content-header">
                <h1>审批列表</h1>
                <p className="header-subtitle">待我审批的需求</p>
              </header>
            <div className="container container-fullwidth">
              <div className="approval-table-container">
                {loading ? (
                  <div className="loading">加载中...</div>
                ) : (() => {
                  const pendingApprovals = approvals.filter(a => a.status === 'pending');
                  if (pendingApprovals.length === 0) {
                    return <div className="empty-state">暂无待审批的需求</div>;
                  }
                  return (
                    <table className="approval-table">
                      <thead>
                        <tr>
                          <th>需求单号</th>
                          <th>标题</th>
                          <th>申请人</th>
                          <th>部门</th>
                          <th>类型</th>
                          <th>金额</th>
                          <th>当前步骤</th>
                          <th>创建时间</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingApprovals.map((approval) => {
                          const currentStep = approval.currentStep || 1;
                          const stepNames = {
                            1: '待商务评估',
                            2: '待采购组长审批',
                            3: '待GM审批'
                          };
                          const canApprove = hasPermission(`approve_step${currentStep}`);
                          return (
                            <tr key={approval.id}>
                              <td className="id-cell">{approval.id}</td>
                              <td>
                                <div className="title-cell">
                                  <span className="approval-title">{approval.title}</span>
                                </div>
                              </td>
                              <td>{approval.applicant}</td>
                              <td>{approval.department}</td>
                              <td>{approval.type}</td>
                              <td>{approval.amount > 0 ? `¥${approval.amount.toLocaleString()}` : '-'}</td>
                              <td>
                                <div className="step-info">
                                  <span className={`step-badge ${canApprove ? 'step-current' : ''}`}>
                                    {stepNames[currentStep] || '审批中'}
                                  </span>
                                  {canApprove && <span className="step-tag">待我审批</span>}
                                </div>
                              </td>
                              <td>{approval.createTime}</td>
                              <td>
                                <div className="action-buttons">
                                  <Link to={`/detail/${approval.id}`} className="btn btn-secondary btn-sm">
                                    查看
                                  </Link>
                                  {canApprove && (
                                    <>
                                      <button 
                                        className="btn btn-success btn-sm"
                                        onClick={() => handleAction(approval, 'approve')}
                                      >
                                        通过
                                      </button>
                                      <button 
                                        className="btn btn-danger btn-sm"
                                        onClick={() => handleAction(approval, 'reject')}
                                      >
                                        拒绝
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </div>
            </>
          } />
          <Route path="/detail/:id" element={
            <>
              <header className="content-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
                  <h1>审批详情</h1>
                </div>
              </header>
            <div className="container container-fullwidth">
              {detailLoading ? (
                <div className="loading">加载中...</div>
              ) : currentDetail ? (
                <div className="detail-content">
                  <div className="detail-item">
                    <label>标题:</label>
                    <span>{currentDetail.title}</span>
                  </div>
                  <div className="detail-item">
                    <label>申请人:</label>
                    <span>{currentDetail.applicant}</span>
                  </div>
                  <div className="detail-item">
                    <label>部门:</label>
                    <span>{currentDetail.department}</span>
                  </div>
                  <div className="detail-item">
                    <label>类型:</label>
                    <span>{currentDetail.type}</span>
                  </div>
                  {currentDetail.amount > 0 && (
                    <div className="detail-item">
                      <label>金额:</label>
                      <span>¥{currentDetail.amount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="detail-item">
                    <label>状态:</label>
                    <span className={`status-badge ${getStatusClass(currentDetail.status)}`}>
                      {getStatusText(currentDetail.status, currentDetail.currentStep)}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>创建时间:</label>
                    <span>{currentDetail.createTime}</span>
                  </div>
                  {currentDetail.status === 'draft' && currentDetail.lastAutoSave && (
                    <div className="detail-item">
                      <label>最后保存:</label>
                      <span>{currentDetail.lastAutoSave}</span>
                    </div>
                  )}
                  <div className="detail-item full">
                    <label>说明:</label>
                    <p>{currentDetail.description || '无'}</p>
                  </div>
                  
                  {currentDetail.status !== 'draft' && (
                    <div className="detail-approval-steps">
                      <div className="detail-steps-header">审批进度</div>
                      <div className="detail-steps-list">
                        {[1, 2, 3].map((step) => {
                          const stepNames = {
                            1: '商务评估',
                            2: '采购组长审批',
                            3: 'GM审批'
                          };
                          const stepStatus = getStepStatus(currentDetail, step);
                          const stepApprover = currentDetail[`step${step}Approver`];
                          const stepTime = currentDetail[`step${step}Time`];
                          const stepComment = currentDetail[`step${step}Comment`];
                          const isCurrentStep = currentDetail.currentStep === step;
                          
                          return (
                            <div key={step} className={`detail-step-item ${isCurrentStep ? 'current' : ''} ${stepStatus === 'approved' ? 'approved' : ''} ${stepStatus === 'rejected' ? 'rejected' : ''}`}>
                              <div className="detail-step-number">
                                {stepStatus === 'approved' ? '✓' : stepStatus === 'rejected' ? '✗' : step}
                              </div>
                              <div className="detail-step-content">
                                <div className="detail-step-header">
                                  <span className="detail-step-name">{stepNames[step]}</span>
                                  {isCurrentStep && <span className="detail-step-tag">当前步骤</span>}
                                </div>
                                {stepApprover && <div className="detail-step-approver">审批人: {stepApprover}</div>}
                                {stepTime && <div className="detail-step-time">{stepTime}</div>}
                                {stepComment && <div className="detail-step-comment">意见: {stepComment}</div>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {currentDetail.status !== 'draft' && currentDetail.status !== 'pending' && (
                    <>
                      <div className="detail-item">
                        <label>审批人:</label>
                        <span>{currentDetail.approver}</span>
                      </div>
                      <div className="detail-item">
                        <label>审批时间:</label>
                        <span>{currentDetail.approveTime}</span>
                      </div>
                      <div className="detail-item full">
                        <label>审批意见:</label>
                        <p>{currentDetail.comment || '无'}</p>
                      </div>
                    </>
                  )}
                  
                  <div className="detail-footer">
                    {currentDetail.status === 'draft' && (
                      <>
                        <button 
                          className="btn btn-primary"
                          onClick={() => {
                            handleEdit(currentDetail);
                            setShowModal(true);
                          }}
                        >
                          编辑
                        </button>
                        <button 
                          className="btn btn-success"
                          onClick={() => {
                            handleSubmitDraft(currentDetail.id);
                          }}
                        >
                          提交
                        </button>
                      </>
                    )}
                    {currentDetail.status === 'pending' && hasPermission(`approve_step${currentDetail.currentStep}`) && currentDetail.creator !== currentUser?.name && (
                      <>
                        <button 
                          className="btn btn-success"
                          onClick={() => handleAction(currentDetail, 'approve')}
                        >
                          通过
                        </button>
                        <button 
                          className="btn btn-danger"
                          onClick={() => handleAction(currentDetail, 'reject')}
                        >
                          拒绝
                        </button>
                      </>
                    )}
                    <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                      返回
                    </button>
                  </div>
                </div>
              ) : (
                <div className="empty-state">未找到该审批详情</div>
              )}
            </div>
            </>
          } />
        </Routes>
      </main>
      </>
  )}

      {isLoggedIn && showModal && (
        <div className="modal-overlay" onClick={handleModalClose}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {modalType === 'detail' && selectedApproval && (
              <>
                <div className="modal-header">
                  <h2>
                    审批详情
                    {selectedApproval.status === 'draft' && (
                      <span className="draft-badge" style={{ marginLeft: '10px' }}>草稿</span>
                    )}
                  </h2>
                  <button className="close-btn" onClick={handleModalClose}>×</button>
                </div>
                <div className="modal-body">
                  <div className="detail-item">
                    <label>标题:</label>
                    <span>{selectedApproval.title}</span>
                  </div>
                  <div className="detail-item">
                    <label>申请人:</label>
                    <span>{selectedApproval.applicant}</span>
                  </div>
                  <div className="detail-item">
                    <label>部门:</label>
                    <span>{selectedApproval.department}</span>
                  </div>
                  <div className="detail-item">
                    <label>类型:</label>
                    <span>{selectedApproval.type}</span>
                  </div>
                  {selectedApproval.amount > 0 && (
                    <div className="detail-item">
                      <label>金额:</label>
                      <span>¥{selectedApproval.amount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="detail-item">
                    <label>状态:</label>
                    <span className={`status-badge ${getStatusClass(selectedApproval.status)}`}>
                      {getStatusText(selectedApproval.status, selectedApproval.currentStep)}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>创建时间:</label>
                    <span>{selectedApproval.createTime}</span>
                  </div>
                  {selectedApproval.status === 'draft' && selectedApproval.lastAutoSave && (
                    <div className="detail-item">
                      <label>最后保存:</label>
                      <span>{selectedApproval.lastAutoSave}</span>
                    </div>
                  )}
                  <div className="detail-item full">
                    <label>说明:</label>
                    <p>{selectedApproval.description || '无'}</p>
                  </div>
                  
                  {selectedApproval.status !== 'draft' && (
                    <div className="detail-approval-steps">
                      <div className="detail-steps-header">审批进度</div>
                      <div className="detail-steps-list">
                        {[1, 2, 3].map((step) => {
                          const stepNames = {
                            1: '商务评估',
                            2: '采购组长审批',
                            3: 'GM审批'
                          };
                          const stepStatus = getStepStatus(selectedApproval, step);
                          const stepApprover = selectedApproval[`step${step}Approver`];
                          const stepTime = selectedApproval[`step${step}Time`];
                          const stepComment = selectedApproval[`step${step}Comment`];
                          const isCurrentStep = selectedApproval.currentStep === step;
                          
                          return (
                            <div key={step} className={`detail-step-item ${isCurrentStep ? 'current' : ''} ${stepStatus === 'approved' ? 'approved' : ''} ${stepStatus === 'rejected' ? 'rejected' : ''}`}>
                              <div className="detail-step-number">
                                {stepStatus === 'approved' ? '✓' : stepStatus === 'rejected' ? '✗' : step}
                              </div>
                              <div className="detail-step-content">
                                <div className="detail-step-header">
                                  <span className="detail-step-name">{stepNames[step]}</span>
                                  {isCurrentStep && <span className="detail-step-tag">当前步骤</span>}
                                </div>
                                {stepApprover && <div className="detail-step-approver">审批人: {stepApprover}</div>}
                                {stepTime && <div className="detail-step-time">{stepTime}</div>}
                                {stepComment && <div className="detail-step-comment">意见: {stepComment}</div>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {selectedApproval.status !== 'draft' && selectedApproval.status !== 'pending' && (
                    <>
                      <div className="detail-item">
                        <label>审批人:</label>
                        <span>{selectedApproval.approver}</span>
                      </div>
                      <div className="detail-item">
                        <label>审批时间:</label>
                        <span>{selectedApproval.approveTime}</span>
                      </div>
                      <div className="detail-item full">
                        <label>审批意见:</label>
                        <p>{selectedApproval.comment || '无'}</p>
                      </div>
                    </>
                  )}
                </div>
                <div className="modal-footer">
                  {selectedApproval.status === 'draft' && (
                    <>
                      <button 
                        className="btn btn-primary"
                        onClick={() => {
                          handleModalClose();
                          handleEdit(selectedApproval);
                        }}
                      >
                        编辑
                      </button>
                      <button 
                        className="btn btn-success"
                        onClick={() => {
                          handleModalClose();
                          handleSubmitDraft(selectedApproval.id);
                        }}
                      >
                        提交
                      </button>
                    </>
                  )}
                  <button type="button" className="btn btn-secondary" onClick={handleModalClose}>
                    关闭
                  </button>
                </div>
              </>
            )}

            {(modalType === 'create' || modalType === 'edit') && (
              <>
                <div className="modal-header">
                  <h2>{modalType === 'create' ? '新建审批' : '编辑草稿'}</h2>
                  <button className="close-btn" onClick={handleModalClose}>×</button>
                </div>
                <form onSubmit={handleSubmitNew}>
                  <div className="modal-body">
                    {autoSaveStatus && (
                      <div className="auto-save-status">
                        {autoSaveStatus}
                      </div>
                    )}
                    <div className="form-group">
                      <label>标题 {!modalType === 'edit' && !newApproval.id && '*'}</label>
                      <input
                        type="text"
                        value={newApproval.title}
                        onChange={(e) => setNewApproval(prev => ({ ...prev, title: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label>申请人 {!modalType === 'edit' && !newApproval.id && '*'}</label>
                      <input
                        type="text"
                        value={newApproval.applicant}
                        onChange={(e) => setNewApproval(prev => ({ ...prev, applicant: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label>部门 {!modalType === 'edit' && !newApproval.id && '*'}</label>
                      <input
                        type="text"
                        value={newApproval.department}
                        onChange={(e) => setNewApproval(prev => ({ ...prev, department: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label>类型 {!modalType === 'edit' && !newApproval.id && '*'}</label>
                      <select
                        value={newApproval.type}
                        onChange={(e) => setNewApproval(prev => ({ ...prev, type: e.target.value }))}
                      >
                        <option value="采购">采购</option>
                        <option value="请假">请假</option>
                        <option value="报销">报销</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>金额</label>
                      <input
                        type="number"
                        value={newApproval.amount}
                        onChange={(e) => setNewApproval(prev => ({ ...prev, amount: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label>说明</label>
                      <textarea
                        rows="4"
                        value={newApproval.description}
                        onChange={(e) => setNewApproval(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={handleModalClose}>
                      取消
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={handleSaveDraft}>
                      保存为草稿
                    </button>
                    <button type="submit" className="btn btn-primary">
                      提交
                    </button>
                  </div>
                </form>
              </>
            )}

            {modalType === 'action' && selectedApproval && (
              <>
                <div className="modal-header">
                  <h2>
                    {actionData.action === 'approve' ? '审批通过' : '审批拒绝'}
                  </h2>
                  <button className="close-btn" onClick={handleModalClose}>×</button>
                </div>
                <form onSubmit={handleSubmitAction}>
                  <div className="modal-body">
                    <div className="detail-item">
                      <label>审批项目:</label>
                      <span>{selectedApproval.title}</span>
                    </div>
                    <div className="detail-item">
                      <label>申请人:</label>
                      <span>{selectedApproval.applicant}</span>
                    </div>
                    <div className="form-group">
                      <label>审批意见</label>
                      <textarea
                        rows="4"
                        value={actionData.comment}
                        onChange={(e) => setActionData({ ...actionData, comment: e.target.value })}
                        placeholder={actionData.action === 'approve' ? '请输入通过意见（可选）' : '请输入拒绝原因'}
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={handleModalClose}>
                      取消
                    </button>
                    <button 
                      type="submit" 
                      className={`btn ${actionData.action === 'approve' ? 'btn-success' : 'btn-danger'}`}
                    >
                      确认
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
