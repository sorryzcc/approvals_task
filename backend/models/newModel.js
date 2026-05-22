const { supabaseRequest } = require('../config/supabase');

// ==================== 模拟数据（当数据库表不存在时使用）====================

const mockRoles = [
  { id: 1, name: 'creator', description: '制单人', permissions: '{"submit": true, "viewOwn": true}', created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 2, name: 'business', description: '采购商务', permissions: '{"approveStep1": true, "viewDept": true}', created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 3, name: 'leader', description: '采购组长', permissions: '{"approveStep2": true, "viewTeam": true}', created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 4, name: 'gm', description: '采购GM', permissions: '{"approveStep3": true, "viewAll": true}', created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 5, name: 'admin', description: '系统管理员', permissions: '{"all": true}', created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' }
];

const mockUsers = [
  { id: 'user-001', username: 'zhangsan', password: '123456', real_name: '张三', email: 'zhangsan@company.com', department: '技术部', role_id: 1, status: 'active', created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 'user-002', username: 'lisi', password: '123456', real_name: '李四', email: 'lisi@company.com', department: '采购部', role_id: 2, status: 'active', created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 'user-003', username: 'wangwu', password: '123456', real_name: '王五', email: 'wangwu@company.com', department: '采购部', role_id: 3, status: 'active', created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 'user-004', username: 'zhaoliu', password: '123456', real_name: '赵六', email: 'zhaoliu@company.com', department: '采购部', role_id: 4, status: 'active', created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 'user-005', username: 'sunqi', password: '123456', real_name: '孙七', email: 'sunqi@company.com', department: '市场部', role_id: 1, status: 'active', created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' }
];

const mockApprovalTypes = [
  { id: 1, name: '采购', description: '采购申请', workflow_config: '[1,2,3]', enabled: true, created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 2, name: '请假', description: '请假申请', workflow_config: '[1,2]', enabled: true, created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 3, name: '报销', description: '费用报销', workflow_config: '[1,2,3]', enabled: true, created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 4, name: '入职', description: '入职申请', workflow_config: '[1]', enabled: true, created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 5, name: '离职', description: '离职申请', workflow_config: '[1,2]', enabled: true, created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' }
];

const mockApprovalSteps = [
  { id: 1, type_id: 1, step_order: 1, role_id: 2, step_name: '待商务评估', created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 2, type_id: 1, step_order: 2, role_id: 3, step_name: '待采购组长审批', created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 3, type_id: 1, step_order: 3, role_id: 4, step_name: '待GM审批', created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 4, type_id: 2, step_order: 1, role_id: 2, step_name: '待审批', created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 5, type_id: 2, step_order: 2, role_id: 3, step_name: '待审批', created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 6, type_id: 3, step_order: 1, role_id: 2, step_name: '待审核', created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 7, type_id: 3, step_order: 2, role_id: 3, step_name: '待审批', created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 8, type_id: 3, step_order: 3, role_id: 4, step_name: '待审批', created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 9, type_id: 4, step_order: 1, role_id: 2, step_name: '待HR审批', created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 10, type_id: 5, step_order: 1, role_id: 3, step_name: '待直属审批', created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 11, type_id: 5, step_order: 2, role_id: 2, step_name: '待HR审批', created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' }
];

// 内存审批记录存储（模拟）
let mockApprovalRecords = [];

// ==================== 角色相关操作 ====================

async function getRoles() {
  try {
    const data = await supabaseRequest('GET', 'roles?select=*');
    return data && data.length > 0 ? data : mockRoles;
  } catch {
    return mockRoles;
  }
}

async function getRoleById(id) {
  try {
    const data = await supabaseRequest('GET', `roles?select=*&id=eq.${id}`);
    return data && data.length > 0 ? data[0] : mockRoles.find(r => r.id == id) || null;
  } catch {
    return mockRoles.find(r => r.id == id) || null;
  }
}

async function getRoleByName(name) {
  try {
    const data = await supabaseRequest('GET', `roles?select=*&name=eq.${encodeURIComponent(name)}`);
    return data && data.length > 0 ? data[0] : mockRoles.find(r => r.name === name) || null;
  } catch {
    return mockRoles.find(r => r.name === name) || null;
  }
}

// ==================== 用户相关操作 ====================

async function getUsers() {
  try {
    const data = await supabaseRequest('GET', 'users?select=*');
    return data && data.length > 0 ? data : mockUsers;
  } catch {
    return mockUsers;
  }
}

async function getUserById(id) {
  try {
    const data = await supabaseRequest('GET', `users?select=*&id=eq.${id}`);
    return data && data.length > 0 ? data[0] : mockUsers.find(u => u.id === id) || null;
  } catch {
    return mockUsers.find(u => u.id === id) || null;
  }
}

async function getUserByUsername(username) {
  try {
    const data = await supabaseRequest('GET', `users?select=*&username=eq.${encodeURIComponent(username)}`);
    return data && data.length > 0 ? data[0] : mockUsers.find(u => u.username === username) || null;
  } catch {
    return mockUsers.find(u => u.username === username) || null;
  }
}

/**
 * 用户登录验证
 */
async function login(username, password) {
  try {
    // 首先尝试从数据库查询用户
    const data = await supabaseRequest('GET', `users?select=*&username=eq.${encodeURIComponent(username)}`);
    
    if (data && data.length > 0) {
      const user = data[0];
      // 检查用户是否有密码字段
      if (user.password) {
        // 验证密码
        if (user.password === password) {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        }
        return null;
      }
    }
    
    // 如果数据库中没有密码或查询失败，使用模拟数据
    const mockUser = mockUsers.find(u => u.username === username);
    if (mockUser && mockUser.password === password) {
      const { password, ...userWithoutPassword } = mockUser;
      return userWithoutPassword;
    }
    
    return null;
  } catch {
    // 使用模拟数据
    const mockUser = mockUsers.find(u => u.username === username);
    if (mockUser && mockUser.password === password) {
      const { password, ...userWithoutPassword } = mockUser;
      return userWithoutPassword;
    }
    return null;
  }
}

// ==================== 审批类型相关操作 ====================

async function getApprovalTypes() {
  try {
    const data = await supabaseRequest('GET', 'approval_types?select=*');
    return data && data.length > 0 ? data : mockApprovalTypes;
  } catch {
    return mockApprovalTypes;
  }
}

async function getApprovalTypeById(id) {
  try {
    const data = await supabaseRequest('GET', `approval_types?select=*&id=eq.${id}`);
    return data && data.length > 0 ? data[0] : mockApprovalTypes.find(t => t.id == id) || null;
  } catch {
    return mockApprovalTypes.find(t => t.id == id) || null;
  }
}

async function getApprovalTypeByName(name) {
  try {
    const data = await supabaseRequest('GET', `approval_types?select=*&name=eq.${encodeURIComponent(name)}`);
    return data && data.length > 0 ? data[0] : mockApprovalTypes.find(t => t.name === name) || null;
  } catch {
    return mockApprovalTypes.find(t => t.name === name) || null;
  }
}

// ==================== 审批步骤相关操作 ====================

async function getApprovalSteps() {
  try {
    const data = await supabaseRequest('GET', 'approval_steps?select=*');
    return data && data.length > 0 ? data : mockApprovalSteps;
  } catch {
    return mockApprovalSteps;
  }
}

async function getStepsByTypeId(typeId) {
  try {
    const data = await supabaseRequest('GET', `approval_steps?select=*&type_id=eq.${typeId}&order=step_order.asc`);
    if (data && data.length > 0) return data;
    return mockApprovalSteps.filter(s => s.type_id == typeId).sort((a, b) => a.step_order - b.step_order);
  } catch {
    return mockApprovalSteps.filter(s => s.type_id == typeId).sort((a, b) => a.step_order - b.step_order);
  }
}

async function getStepByTypeAndOrder(typeId, stepOrder) {
  try {
    const data = await supabaseRequest('GET', `approval_steps?select=*&type_id=eq.${typeId}&step_order=eq.${stepOrder}`);
    return data && data.length > 0 ? data[0] : mockApprovalSteps.find(s => s.type_id == typeId && s.step_order == stepOrder) || null;
  } catch {
    return mockApprovalSteps.find(s => s.type_id == typeId && s.step_order == stepOrder) || null;
  }
}

// ==================== 审批记录相关操作 ====================

async function getApprovalRecords(approvalId) {
  try {
    const data = await supabaseRequest('GET', `approval_records?select=*&approval_id=eq.${approvalId}&order=step_order.asc`);
    if (data && data.length > 0) return data;
    return mockApprovalRecords.filter(r => r.approval_id === approvalId).sort((a, b) => a.step_order - b.step_order);
  } catch {
    return mockApprovalRecords.filter(r => r.approval_id === approvalId).sort((a, b) => a.step_order - b.step_order);
  }
}

async function createApprovalRecord(record) {
  const { approval_id, step_order, role_id, approver_id, approver_name, action, comment } = record;
  const newRecord = {
    id: mockApprovalRecords.length + 1,
    approval_id,
    step_order,
    role_id,
    approver_id,
    approver_name,
    action,
    comment: comment || '',
    action_time: new Date().toISOString(),
    created_at: new Date().toISOString()
  };
  
  try {
    const body = {
      approval_id,
      step_order,
      role_id,
      approver_id,
      approver_name,
      action,
      comment: comment || '',
      action_time: new Date().toISOString()
    };
    await supabaseRequest('POST', 'approval_records', body);
  } catch {
    mockApprovalRecords.push(newRecord);
  }
}

async function deleteApprovalRecords(approvalId) {
  try {
    await supabaseRequest('DELETE', `approval_records?approval_id=eq.${approvalId}`);
  } catch {
    mockApprovalRecords = mockApprovalRecords.filter(r => r.approval_id !== approvalId);
  }
}

// ==================== 获取用户待审批列表 ====================

async function getPendingApprovalsByRole(roleId) {
  try {
    // 获取该角色需要审批的步骤
    const steps = await getApprovalSteps();
    const roleSteps = steps.filter(s => s.role_id == roleId);
    
    if (!roleSteps || roleSteps.length === 0) return [];
    
    // 构建查询条件
    const typeIds = [...new Set(roleSteps.map(s => s.type_id))];
    const stepOrders = [...new Set(roleSteps.map(s => s.step_order))];
    
    // 查询待审批的单据
    let query = 'approvals?select=*&status=eq.pending';
    
    if (typeIds.length > 0) {
      query += `&type_id=in.(${typeIds.join(',')})`;
    }
    
    if (stepOrders.length > 0) {
      query += `&current_step=in.(${stepOrders.join(',')})`;
    }
    
    const data = await supabaseRequest('GET', query);
    return data || [];
  } catch {
    return [];
  }
}

module.exports = {
  getRoles,
  getRoleById,
  getRoleByName,
  getUsers,
  getUserById,
  getUserByUsername,
  login,
  getApprovalTypes,
  getApprovalTypeById,
  getApprovalTypeByName,
  getApprovalSteps,
  getStepsByTypeId,
  getStepByTypeAndOrder,
  getApprovalRecords,
  createApprovalRecord,
  deleteApprovalRecords,
  getPendingApprovalsByRole
};