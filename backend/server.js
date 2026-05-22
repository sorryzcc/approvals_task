const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// 使用 Supabase 配置
const { testConnection, initDatabase } = require('./config/supabase');
const approvalModel = require('./models/supabaseApprovalModel');
const newModel = require('./models/newModel');

const app = express();
const PORT = 3001;

// 生成需求单号 (格式: YYYYMMDDHHmmss)
function generateApprovalId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 启动时初始化数据库
async function startServer() {
  try {
    // 测试数据库连接
    const connected = await testConnection();
    
    if (!connected) {
      console.error('无法连接到数据库，请检查 Supabase 配置');
      console.log('提示：请在 .env 文件中配置 SUPABASE_URL 和 SUPABASE_KEY');
      process.exit(1);
    }

    // 初始化数据库表和数据
    await initDatabase();

    // 启动 Express 服务器
    app.listen(PORT, () => {
      console.log(`审批系统后端服务运行在 http://localhost:${PORT}`);
      console.log(`数据库: Supabase`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error.message);
    process.exit(1);
  }
}

// ==================== API 路由 ====================

// 获取所有审批列表
app.get('/api/approvals', async (req, res) => {
  try {
    const { status, type, keyword } = req.query;
    
    const approvals = await approvalModel.getApprovals({
      status,
      type,
      keyword
    });
    
    res.json({
      code: 200,
      message: 'success',
      data: approvals
    });
  } catch (error) {
    console.error('获取审批列表失败:', error.message);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

// 获取单个审批详情
app.get('/api/approvals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const approval = await approvalModel.getApprovalById(id);
    
    if (!approval) {
      return res.status(404).json({
        code: 404,
        message: '审批记录不存在',
        data: null
      });
    }
    
    res.json({
      code: 200,
      message: 'success',
      data: approval
    });
  } catch (error) {
    console.error('获取审批详情失败:', error.message);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

// 创建新的审批申请或保存为草稿
app.post('/api/approvals', async (req, res) => {
  try {
    const { title, applicant, department, type, amount, description, isDraft, creator } = req.body;
    
    // 保存为草稿不需要验证必填字段
    if (!isDraft && (!title || !applicant || !department || !type)) {
      return res.status(400).json({
        code: 400,
        message: '请填写必填字段',
        data: null
      });
    }
    
    const newApproval = {
      id: generateApprovalId(),
      title,
      applicant,
      creator: creator || applicant,
      department,
      type,
      amount: amount || 0,
      description: description || '',
      createTime: getCurrentDateTime()
    };
    
    const result = await approvalModel.createApproval(newApproval, isDraft);
    
    res.status(201).json({
      code: 201,
      message: isDraft ? '保存为草稿成功' : '创建成功',
      data: result
    });
  } catch (error) {
    console.error('创建审批失败:', error.message);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

// 更新审批记录（编辑草稿）
app.put('/api/approvals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, applicant, department, type, amount, description } = req.body;
    
    // 检查是否存在且为草稿状态
    const approval = await approvalModel.getApprovalById(id);
    if (!approval) {
      return res.status(404).json({
        code: 404,
        message: '审批记录不存在',
        data: null
      });
    }
    
    const result = await approvalModel.updateApproval(id, {
      title,
      applicant,
      department,
      type,
      amount: amount || 0,
      description: description || ''
    });
    
    res.json({
      code: 200,
      message: '更新成功',
      data: result
    });
  } catch (error) {
    console.error('更新审批失败:', error.message);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

// 自动保存草稿
app.post('/api/approvals/:id/autosave', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, applicant, department, type, amount, description } = req.body;
    
    const result = await approvalModel.autoSaveDraft(id, {
      title,
      applicant,
      department,
      type,
      amount: amount || 0,
      description: description || ''
    });
    
    res.json({
      code: 200,
      message: '自动保存成功',
      data: result
    });
  } catch (error) {
    console.error('自动保存失败:', error.message);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

// 提交草稿
app.post('/api/approvals/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查是否存在且为草稿状态
    const approval = await approvalModel.getApprovalById(id);
    if (!approval) {
      return res.status(404).json({
        code: 404,
        message: '审批记录不存在',
        data: null
      });
    }
    
    if (approval.status !== 'draft') {
      return res.status(400).json({
        code: 400,
        message: '只能提交草稿状态的审批',
        data: null
      });
    }
    
    const result = await approvalModel.submitDraft(id);
    
    res.json({
      code: 200,
      message: '提交成功',
      data: result
    });
  } catch (error) {
    console.error('提交草稿失败:', error.message);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

// 删除审批记录（仅草稿）
app.delete('/api/approvals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查是否存在且为草稿状态
    const approval = await approvalModel.getApprovalById(id);
    if (!approval) {
      return res.status(404).json({
        code: 404,
        message: '审批记录不存在',
        data: null
      });
    }
    
    if (approval.status !== 'draft') {
      return res.status(400).json({
        code: 400,
        message: '只能删除草稿状态的审批',
        data: null
      });
    }
    
    await approvalModel.deleteApproval(id);
    
    res.json({
      code: 200,
      message: '删除成功',
      data: null
    });
  } catch (error) {
    console.error('删除审批失败:', error.message);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

// 审批操作（通过/拒绝）
app.post('/api/approvals/:id/action', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, comment, approver } = req.body;
    
    // 验证参数
    if (!action || (action !== 'approve' && action !== 'reject')) {
      return res.status(400).json({
        code: 400,
        message: '无效的操作类型',
        data: null
      });
    }
    
    // 检查审批是否存在且状态为 pending
    const approval = await approvalModel.getApprovalById(id);
    
    if (!approval) {
      return res.status(404).json({
        code: 404,
        message: '审批记录不存在',
        data: null
      });
    }
    
    if (approval.status !== 'pending') {
      return res.status(400).json({
        code: 400,
        message: '该审批已完成，无法再次操作',
        data: null
      });
    }
    
    // 执行审批操作
    const result = await approvalModel.updateApprovalStatus(
      id, 
      action, 
      comment || '', 
      approver || '管理员'
    );
    
    res.json({
      code: 200,
      message: action === 'approve' ? '审批通过' : '审批拒绝',
      data: result
    });
  } catch (error) {
    console.error('审批操作失败:', error.message);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

// 步骤审批操作
app.post('/api/approvals/:id/step/:step', async (req, res) => {
  try {
    const { id, step } = req.params;
    const { action, comment, approver } = req.body;
    const stepNum = parseInt(step);
    
    // 验证参数
    if (!action || (action !== 'approve' && action !== 'reject')) {
      return res.status(400).json({
        code: 400,
        message: '无效的操作类型',
        data: null
      });
    }
    
    if (![1, 2, 3].includes(stepNum)) {
      return res.status(400).json({
        code: 400,
        message: '无效的步骤编号',
        data: null
      });
    }
    
    // 先检查当前步骤是否匹配
    const approval = await approvalModel.getApprovalById(id);
    if (!approval) {
      return res.status(404).json({
        code: 404,
        message: '审批记录不存在',
        data: null
      });
    }
    
    if (approval.currentStep !== stepNum) {
      return res.status(400).json({
        code: 400,
        message: `当前步骤为 ${approval.currentStep}，请先处理该步骤`,
        data: null
      });
    }
    
    // 直接使用已经验证过的 updateApprovalStatus 函数
    const result = await approvalModel.updateApprovalStatus(
      id,
      action,
      comment || '',
      approver || '管理员'
    );
    
    const stepNames = ['', '商务评估', '采购组长审批', '采购GM审批'];
    const message = action === 'approve' 
      ? `${stepNames[stepNum]}通过`
      : `${stepNames[stepNum]}拒绝`;
    
    res.json({
      code: 200,
      message,
      data: result
    });
  } catch (error) {
    console.error('步骤审批失败:', error.message);
    res.status(500).json({
      code: 500,
      message: error.message || '服务器内部错误',
      data: null
    });
  }
});

// 获取统计数据
app.get('/api/statistics', async (req, res) => {
  try {
    const { creator } = req.query;
    const statistics = await approvalModel.getStatistics(creator);
    
    res.json({
      code: 200,
      message: 'success',
      data: statistics
    });
  } catch (error) {
    console.error('获取统计数据失败:', error.message);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

// ==================== 新表 API 端点 ====================

// 获取所有角色
app.get('/api/roles', async (req, res) => {
  try {
    const roles = await newModel.getRoles();
    res.json({
      code: 200,
      message: 'success',
      data: roles
    });
  } catch (error) {
    console.error('获取角色列表失败:', error.message);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

// 获取角色详情
app.get('/api/roles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const role = await newModel.getRoleById(id);
    
    if (!role) {
      return res.status(404).json({
        code: 404,
        message: '角色不存在',
        data: null
      });
    }
    
    res.json({
      code: 200,
      message: 'success',
      data: role
    });
  } catch (error) {
    console.error('获取角色详情失败:', error.message);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

// 用户登录
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        code: 400,
        message: '请输入账号和密码',
        data: null
      });
    }
    
    const user = await newModel.login(username, password);
    
    if (!user) {
      return res.status(401).json({
        code: 401,
        message: '账号或密码错误',
        data: null
      });
    }
    
    // 角色ID到角色名称的映射
    const roleIdToRole = {
      1: 'creator',
      2: 'business',
      3: 'leader',
      4: 'gm',
      5: 'admin'
    };
    
    // 返回用户信息（包含角色名称）
    const responseUser = {
      id: user.id,
      name: user.real_name || user.username,
      username: user.username,
      department: user.department || '未知部门',
      role: roleIdToRole[user.role_id] || 'creator'
    };
    
    res.json({
      code: 200,
      message: '登录成功',
      data: responseUser
    });
  } catch (error) {
    console.error('登录失败:', error.message);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

// 获取所有用户
app.get('/api/users', async (req, res) => {
  try {
    const users = await newModel.getUsers();
    
    // 角色ID到角色名称的映射
    const roleIdToRole = {
      1: 'creator',
      2: 'business',
      3: 'leader',
      4: 'gm',
      5: 'admin'
    };
    
    // 将用户数据映射为前端期望的格式
    const formattedUsers = users.map(user => ({
      id: user.id,
      name: user.real_name || user.username,
      username: user.username,
      department: user.department || '未知部门',
      role: roleIdToRole[user.role_id] || 'creator'
    }));
    
    res.json({
      code: 200,
      message: 'success',
      data: formattedUsers
    });
  } catch (error) {
    console.error('获取用户列表失败:', error.message);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

// 获取用户详情
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await newModel.getUserById(id);
    
    if (!user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在',
        data: null
      });
    }
    
    res.json({
      code: 200,
      message: 'success',
      data: user
    });
  } catch (error) {
    console.error('获取用户详情失败:', error.message);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

// 获取所有审批类型
app.get('/api/approval-types', async (req, res) => {
  try {
    const types = await newModel.getApprovalTypes();
    res.json({
      code: 200,
      message: 'success',
      data: types
    });
  } catch (error) {
    console.error('获取审批类型失败:', error.message);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

// 获取审批类型详情
app.get('/api/approval-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const type = await newModel.getApprovalTypeById(id);
    
    if (!type) {
      return res.status(404).json({
        code: 404,
        message: '审批类型不存在',
        data: null
      });
    }
    
    res.json({
      code: 200,
      message: 'success',
      data: type
    });
  } catch (error) {
    console.error('获取审批类型详情失败:', error.message);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

// 获取审批步骤配置
app.get('/api/approval-steps', async (req, res) => {
  try {
    const { typeId } = req.query;
    let steps;
    
    if (typeId) {
      steps = await newModel.getStepsByTypeId(typeId);
    } else {
      steps = await newModel.getApprovalSteps();
    }
    
    res.json({
      code: 200,
      message: 'success',
      data: steps
    });
  } catch (error) {
    console.error('获取审批步骤失败:', error.message);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

// 获取审批记录
app.get('/api/approval-records/:approvalId', async (req, res) => {
  try {
    const { approvalId } = req.params;
    const records = await newModel.getApprovalRecords(approvalId);
    
    res.json({
      code: 200,
      message: 'success',
      data: records
    });
  } catch (error) {
    console.error('获取审批记录失败:', error.message);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

// 获取用户待审批列表（按角色）
app.get('/api/pending-approvals', async (req, res) => {
  try {
    const { roleId } = req.query;
    
    if (!roleId) {
      return res.status(400).json({
        code: 400,
        message: '缺少角色ID参数',
        data: null
      });
    }
    
    const approvals = await newModel.getPendingApprovalsByRole(roleId);
    
    res.json({
      code: 200,
      message: 'success',
      data: approvals
    });
  } catch (error) {
    console.error('获取待审批列表失败:', error.message);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
});

// 辅助函数：获取当前日期时间字符串
function getCurrentDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 启动服务器
startServer();
