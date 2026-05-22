const { pool } = require('../config/database');

/**
 * 获取所有审批列表
 */
async function getApprovals(filters = {}) {
  const { status, type, keyword } = filters;
  
  let query = 'SELECT * FROM approvals WHERE 1=1';
  const params = [];

  // 按状态筛选
  if (status && status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }

  // 按类型筛选
  if (type && type !== 'all') {
    query += ' AND type = ?';
    params.push(type);
  }

  // 关键词搜索
  if (keyword) {
    query += ' AND (title LIKE ? OR applicant LIKE ? OR department LIKE ?)';
    const searchPattern = `%${keyword}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  // 按创建时间倒序排列
  query += ' ORDER BY create_time DESC';

  try {
    const [rows] = await pool.query(query, params);
    
    // 格式化返回数据
    return rows.map(row => ({
      id: row.id,
      title: row.title,
      applicant: row.applicant,
      creator: row.creator,
      department: row.department,
      type: row.type,
      amount: parseFloat(row.amount),
      status: row.status,
      createTime: formatDateTime(row.create_time),
      updateTime: formatDateTime(row.update_time),
      lastAutoSave: row.last_auto_save ? formatDateTime(row.last_auto_save) : null,
      description: row.description || '',
      approver: row.approver,
      approveTime: row.approve_time ? formatDateTime(row.approve_time) : null,
      comment: row.comment || ''
    }));
  } catch (error) {
    console.error('查询审批列表失败:', error.message);
    throw error;
  }
}

/**
 * 获取单个审批详情
 */
async function getApprovalById(id) {
  try {
    const [rows] = await pool.query('SELECT * FROM approvals WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      id: row.id,
      title: row.title,
      applicant: row.applicant,
      creator: row.creator,
      department: row.department,
      type: row.type,
      amount: parseFloat(row.amount),
      status: row.status,
      createTime: formatDateTime(row.create_time),
      updateTime: formatDateTime(row.update_time),
      lastAutoSave: row.last_auto_save ? formatDateTime(row.last_auto_save) : null,
      description: row.description || '',
      approver: row.approver,
      approveTime: row.approve_time ? formatDateTime(row.approve_time) : null,
      comment: row.comment || ''
    };
  } catch (error) {
    console.error('查询审批详情失败:', error.message);
    throw error;
  }
}

/**
 * 创建新的审批记录或保存为草稿
 */
async function createApproval(data, isDraft = false) {
  const { id, title, applicant, creator, department, type, amount, description, createTime } = data;
  const status = isDraft ? 'draft' : 'pending';
  
  try {
    await pool.query(
      `INSERT INTO approvals 
       (id, title, applicant, creator, department, type, amount, status, description, create_time) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title, applicant, creator || applicant, department, type, amount, status, description, createTime]
    );

    return await getApprovalById(id);
  } catch (error) {
    console.error('创建审批记录失败:', error.message);
    throw error;
  }
}

/**
 * 更新审批记录（用于编辑草稿）
 */
async function updateApproval(id, data) {
  const { title, applicant, department, type, amount, description } = data;
  const updateTime = getCurrentDateTime();
  
  try {
    await pool.query(
      `UPDATE approvals 
       SET title = ?, applicant = ?, department = ?, type = ?, amount = ?, description = ?, update_time = ?
       WHERE id = ?`,
      [title, applicant, department, type, amount, description, updateTime, id]
    );

    return await getApprovalById(id);
  } catch (error) {
    console.error('更新审批记录失败:', error.message);
    throw error;
  }
}

/**
 * 自动保存草稿
 */
async function autoSaveDraft(id, data) {
  const { title, applicant, department, type, amount, description } = data;
  const lastAutoSave = getCurrentDateTime();
  
  try {
    await pool.query(
      `UPDATE approvals 
       SET title = ?, applicant = ?, department = ?, type = ?, amount = ?, description = ?, 
           last_auto_save = ?, update_time = ?
       WHERE id = ? AND status = 'draft'`,
      [title, applicant, department, type, amount, description, lastAutoSave, lastAutoSave, id]
    );

    return await getApprovalById(id);
  } catch (error) {
    console.error('自动保存失败:', error.message);
    throw error;
  }
}

/**
 * 提交草稿（从 draft 转为 pending）
 */
async function submitDraft(id) {
  try {
    await pool.query(
      `UPDATE approvals SET status = 'pending', update_time = ? WHERE id = ? AND status = 'draft'`,
      [getCurrentDateTime(), id]
    );

    return await getApprovalById(id);
  } catch (error) {
    console.error('提交草稿失败:', error.message);
    throw error;
  }
}

/**
 * 删除审批记录（仅草稿状态可删除）
 */
async function deleteApproval(id) {
  try {
    await pool.query('DELETE FROM approvals WHERE id = ? AND status = ?', [id, 'draft']);
    return true;
  } catch (error) {
    console.error('删除审批记录失败:', error.message);
    throw error;
  }
}

/**
 * 更新审批状态（审批操作）
 */
async function updateApprovalStatus(id, action, comment, approver) {
  const status = action === 'approve' ? 'approved' : 'rejected';
  const approveTime = getCurrentDateTime();

  try {
    await pool.query(
      'UPDATE approvals SET status = ?, approver = ?, approve_time = ?, comment = ? WHERE id = ?',
      [status, approver, approveTime, comment, id]
    );

    return await getApprovalById(id);
  } catch (error) {
    console.error('更新审批状态失败:', error.message);
    throw error;
  }
}

/**
 * 获取统计数据
 */
async function getStatistics(creator = null) {
  let query = `
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
    FROM approvals
  `;
  const params = [];
  
  if (creator) {
    query += ' WHERE creator = ?';
    params.push(creator);
  }

  try {
    const [rows] = await pool.query(query, params);

    return {
      total: parseInt(rows[0].total),
      draft: parseInt(rows[0].draft),
      pending: parseInt(rows[0].pending),
      approved: parseInt(rows[0].approved),
      rejected: parseInt(rows[0].rejected)
    };
  } catch (error) {
    console.error('获取统计数据失败:', error.message);
    throw error;
  }
}

/**
 * 格式化日期时间为字符串
 */
function formatDateTime(date) {
  if (!date) return null;
  
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 获取当前日期时间字符串
 */
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

module.exports = {
  getApprovals,
  getApprovalById,
  createApproval,
  updateApproval,
  autoSaveDraft,
  submitDraft,
  deleteApproval,
  updateApprovalStatus,
  getStatistics
};
