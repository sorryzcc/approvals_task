const { supabaseRequest } = require('../config/supabase');
const newModel = require('./newModel');

/**
 * 格式化日期时间为字符串
 */
function formatDateTime(dateTime) {
  if (!dateTime) return null;
  const date = new Date(dateTime);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 格式化审批数据
 */
// 缓存审批类型
let approvalTypesCache = null;

async function getApprovalTypesCached() {
  if (!approvalTypesCache) {
    approvalTypesCache = await newModel.getApprovalTypes();
  }
  return approvalTypesCache;
}

async function formatApprovalAsync(row) {
  const result = {
    id: row.id,
    title: row.title,
    applicant: row.applicant,
    creator: row.creator,
    department: row.department,
    amount: parseFloat(row.amount) || 0,
    status: row.status,
    createTime: formatDateTime(row.create_time),
    updateTime: formatDateTime(row.update_time),
    lastAutoSave: row.last_auto_save ? formatDateTime(row.last_auto_save) : null,
    description: row.description || '',
    approver: row.approver,
    approveTime: row.approve_time ? formatDateTime(row.approve_time) : null,
    comment: row.comment || ''
  };
  
  // 处理 type_id 转换为 type 名称
  if (row.type_id) {
    const types = await getApprovalTypesCached();
    const typeInfo = types.find(t => t.id === row.type_id);
    result.type = typeInfo ? typeInfo.name : '未知';
  } else {
    result.type = row.type || '未知';
  }
  
  if ('current_step' in row) {
    result.currentStep = row.current_step || 0;
  } else if (row.status === 'pending') {
    result.currentStep = 1;
  }
  if ('total_steps' in row) {
    result.totalSteps = row.total_steps || 3;
  } else {
    result.totalSteps = 3;
  }
  if ('step1_approver' in row) {
    result.step1Approver = row.step1_approver;
  }
  if ('step1_status' in row) {
    result.step1Status = row.step1_status || 'pending';
  }
  if ('step1_time' in row) {
    result.step1Time = row.step1_time ? formatDateTime(row.step1_time) : null;
  }
  if ('step1_comment' in row) {
    result.step1Comment = row.step1_comment || '';
  }
  if ('step2_approver' in row) {
    result.step2Approver = row.step2_approver;
  }
  if ('step2_status' in row) {
    result.step2Status = row.step2_status || 'pending';
  }
  if ('step2_time' in row) {
    result.step2Time = row.step2_time ? formatDateTime(row.step2_time) : null;
  }
  if ('step2_comment' in row) {
    result.step2Comment = row.step2_comment || '';
  }
  if ('step3_approver' in row) {
    result.step3Approver = row.step3_approver;
  }
  if ('step3_status' in row) {
    result.step3Status = row.step3_status || 'pending';
  }
  if ('step3_time' in row) {
    result.step3Time = row.step3_time ? formatDateTime(row.step3_time) : null;
  }
  if ('step3_comment' in row) {
    result.step3Comment = row.step3_comment || '';
  }
  
  return result;
}

function formatApproval(row) {
  const result = {
    id: row.id,
    title: row.title,
    applicant: row.applicant,
    creator: row.creator,
    department: row.department,
    type: row.type,
    amount: parseFloat(row.amount) || 0,
    status: row.status,
    createTime: formatDateTime(row.create_time),
    updateTime: formatDateTime(row.update_time),
    lastAutoSave: row.last_auto_save ? formatDateTime(row.last_auto_save) : null,
    description: row.description || '',
    approver: row.approver,
    approveTime: row.approve_time ? formatDateTime(row.approve_time) : null,
    comment: row.comment || ''
  };
  
  if ('current_step' in row) {
    result.currentStep = row.current_step || 0;
  } else if (row.status === 'pending') {
    result.currentStep = 1;
  }
  if ('total_steps' in row) {
    result.totalSteps = row.total_steps || 3;
  } else {
    result.totalSteps = 3;
  }
  if ('step1_approver' in row) {
    result.step1Approver = row.step1_approver;
  }
  if ('step1_status' in row) {
    result.step1Status = row.step1_status || 'pending';
  }
  if ('step1_time' in row) {
    result.step1Time = row.step1_time ? formatDateTime(row.step1_time) : null;
  }
  if ('step1_comment' in row) {
    result.step1Comment = row.step1_comment || '';
  }
  if ('step2_approver' in row) {
    result.step2Approver = row.step2_approver;
  }
  if ('step2_status' in row) {
    result.step2Status = row.step2_status || 'pending';
  }
  if ('step2_time' in row) {
    result.step2Time = row.step2_time ? formatDateTime(row.step2_time) : null;
  }
  if ('step2_comment' in row) {
    result.step2Comment = row.step2_comment || '';
  }
  if ('step3_approver' in row) {
    result.step3Approver = row.step3_approver;
  }
  if ('step3_status' in row) {
    result.step3Status = row.step3_status || 'pending';
  }
  if ('step3_time' in row) {
    result.step3Time = row.step3_time ? formatDateTime(row.step3_time) : null;
  }
  if ('step3_comment' in row) {
    result.step3Comment = row.step3_comment || '';
  }
  
  return result;
}

/**
 * 获取审批列表
 */
async function getApprovals(filters = {}) {
  let path = 'approvals?select=*';
  
  if (filters.status) {
    path += `&status=eq.${filters.status}`;
  }

  if (filters.type) {
    // 根据 type 名称获取 type_id
    const types = await getApprovalTypesCached();
    const typeInfo = types.find(t => t.name === filters.type);
    if (typeInfo) {
      path += `&type_id=eq.${typeInfo.id}`;
    }
  }

  if (filters.keyword) {
    const keyword = encodeURIComponent(filters.keyword);
    path += `&or=(title.ilike.%25${keyword}%25,applicant.ilike.%25${keyword}%25,department.ilike.%25${keyword}%25)`;
  }

  path += '&order=create_time.desc';

  try {
    const data = await supabaseRequest('GET', path);
    // 使用异步格式化
    return Promise.all(data.map(row => formatApprovalAsync(row)));
  } catch (error) {
    // 如果表不存在，返回空数组
    if (error.message.includes('Could not find the table')) {
      console.log('ℹ️  表不存在，返回空列表');
      return [];
    }
    throw error;
  }
}

/**
 * 获取单个审批详情
 */
async function getApprovalById(id) {
  const data = await supabaseRequest('GET', `approvals?select=*&id=eq.${id}`);
  
  if (!data || data.length === 0) return null;
  return formatApprovalAsync(data[0]);
}

/**
 * 创建新的审批记录或保存为草稿
 */
async function createApproval(data, isDraft = false) {
  const { id, title, applicant, creator, department, type, amount, description, createTime } = data;
  
  // 根据 type 字符串获取 type_id
  let typeId = null;
  if (type) {
    const types = await newModel.getApprovalTypes();
    const typeInfo = types.find(t => t.name === type);
    if (typeInfo) {
      typeId = typeInfo.id;
    }
  }
  
  const body = {
    id,
    title,
    type_id: typeId,  // 使用 type_id
    type: type || '采购',  // 兼容旧表结构，提供 type 字符串
    applicant,
    creator: creator || applicant,
    department,
    amount: amount || 0,
    status: isDraft ? 'draft' : 'pending',
    description: description || '',
    create_time: createTime || new Date().toISOString(),
    current_step: isDraft ? 0 : 1,
    total_steps: 3
  };

  try {
    await supabaseRequest('POST', 'approvals', body);
    
    // 如果不是草稿，在 approval_records 表中插入提交记录
    if (!isDraft) {
      await newModel.createApprovalRecord({
        approval_id: id,
        step_order: 0,
        role_id: 1,  // 制单人角色
        approver_id: null,
        approver_name: creator || applicant,
        action: 'submit',
        comment: '需求已提交'
      });
    }
  } catch (error) {
    console.error('创建审批失败:', error.message);
    throw error;
  }
  
  const created = await getApprovalById(id);
  if (!created) {
    throw new Error('创建审批记录失败');
  }
  return created;
}

/**
 * 更新审批记录（用于编辑草稿）
 */
async function updateApproval(id, data) {
  const { title, applicant, department, type, amount, description } = data;

  const body = {
    title,
    applicant,
    department,
    type,
    amount: amount || 0,
    description: description || '',
    update_time: new Date().toISOString()
  };

  await supabaseRequest('PATCH', `approvals?id=eq.${id}`, body);
  
  const updated = await getApprovalById(id);
  if (!updated) throw new Error('更新审批记录失败');
  return updated;
}

/**
 * 自动保存草稿
 */
async function autoSaveDraft(id, data) {
  const { title, applicant, department, type, amount, description } = data;

  const body = {
    title,
    applicant,
    department,
    type,
    amount: amount || 0,
    description: description || '',
    last_auto_save: new Date().toISOString(),
    update_time: new Date().toISOString()
  };

  await supabaseRequest('PATCH', `approvals?id=eq.${id}&status=eq.draft`, body);
  
  const updated = await getApprovalById(id);
  if (!updated) throw new Error('更新审批记录失败');
  return updated;
}

/**
 * 提交草稿（从 draft 转为 pending）
 */
async function submitDraft(id) {
  const now = new Date().toISOString();
  const body = {
    status: 'pending',
    current_step: 1,
    update_time: now
  };

  try {
    const extraFields = {
      step1_status: 'pending'
    };
    Object.assign(body, extraFields);
    await supabaseRequest('PATCH', `approvals?id=eq.${id}&status=eq.draft`, body);
  } catch (error) {
    console.log('⚠️  submitDraft PATCH 失败，尝试移除额外字段:', error.message);
    const safeBody = { status: 'pending', current_step: 1, update_time: now };
    try {
      await supabaseRequest('PATCH', `approvals?id=eq.${id}&status=eq.draft`, safeBody);
    } catch (retryError) {
      console.log('⚠️  重试也失败:', retryError.message);
      throw retryError;
    }
  }

  const updated = await getApprovalById(id);
  if (!updated) throw new Error('草稿不存在或更新失败');
  return updated;
}

/**
 * 删除审批记录（仅草稿状态可删除）
 */
async function deleteApproval(id) {
  const result = await supabaseRequest('DELETE', `approvals?id=eq.${id}&status=eq.draft`);
  if (!result || result.length === 0) throw new Error('草稿不存在或状态不是 draft');
  return true;
}

/**
 * 更新审批状态（审批操作）
 */
async function updateApprovalStatus(id, action, comment, approver) {
  // 先获取当前审批状态
  const currentApproval = await getApprovalById(id);
  if (!currentApproval) {
    throw new Error('审批记录不存在');
  }
  
  const currentStep = currentApproval.currentStep || 1;
  const totalSteps = currentApproval.totalSteps || 3;
  
  let body = {};
  let finalStatus = currentApproval.status;
  
  if (action === 'reject') {
    // 拒绝：直接设置状态为 rejected
    body = {
      status: 'rejected',
      approver: approver || '管理员',
      approve_time: new Date().toISOString(),
      comment: comment || '',
      update_time: new Date().toISOString()
    };
    finalStatus = 'rejected';
  } else {
    // 通过：检查是否是最后一步
    if (currentStep >= totalSteps) {
      // 最后一步通过，设置为已结单
      body = {
        status: 'approved',
        approver: approver || '管理员',
        approve_time: new Date().toISOString(),
        comment: comment || '',
        update_time: new Date().toISOString()
      };
      finalStatus = 'approved';
    } else {
      // 不是最后一步，递增 current_step
      body = {
        current_step: currentStep + 1,
        update_time: new Date().toISOString()
      };
      finalStatus = 'pending';
    }
  }
  
  await supabaseRequest('PATCH', `approvals?id=eq.${id}`, body);
  
  // 在 approval_records 表中记录审批操作
  await newModel.createApprovalRecord({
    approval_id: id,
    step_order: currentStep,
    role_id: currentStep === 1 ? 2 : (currentStep === 2 ? 3 : 4),  // 根据步骤对应角色
    approver_id: null,
    approver_name: approver || '管理员',
    action: action,
    comment: comment || ''
  });
  
  const updated = await getApprovalById(id);
  if (!updated) throw new Error('更新审批记录失败');
  return updated;
}

/**
 * 获取统计数据
 */
async function getStatistics(creator = null) {
  let path = 'approvals?select=status';
  
  if (creator) {
    path += `&creator=eq.${encodeURIComponent(creator)}`;
  }

  const data = await supabaseRequest('GET', path);
  
  let total = 0, draft = 0, pending = 0, approved = 0, rejected = 0;
  
  if (data && data.length > 0) {
    total = data.length;
    data.forEach(item => {
      switch (item.status) {
        case 'draft': draft++; break;
        case 'pending': pending++; break;
        case 'approved': approved++; break;
        case 'rejected': rejected++; break;
      }
    });
  }

  return { total, draft, pending, approved, rejected };
}

/**
 * 审批步骤处理
 */
async function approveStep(id, step, action, comment, approver) {
  const approval = await getApprovalById(id);
  if (!approval) throw new Error('审批记录不存在');
  
  if (!('currentStep' in approval)) {
    console.log('⚠️  使用旧的单步审批逻辑');
    return updateApprovalStatus(id, action, comment, approver);
  }
  
  if (approval.currentStep !== step) {
    throw new Error(`当前步骤为 ${approval.currentStep}，请先处理该步骤`);
  }
  
  const isApproved = action === 'approve';
  const now = new Date().toISOString();
  
  const body = {
    update_time: now
  };
  
  if (step === 1) {
    if ('step1_status' in approval) {
      body.step1_approver = approver || '管理员';
      body.step1_status = isApproved ? 'approved' : 'rejected';
      body.step1_time = now;
      body.step1_comment = comment || '';
    }
  } else if (step === 2) {
    if ('step2_status' in approval) {
      body.step2_approver = approver || '管理员';
      body.step2_status = isApproved ? 'approved' : 'rejected';
      body.step2_time = now;
      body.step2_comment = comment || '';
    }
  } else if (step === 3) {
    if ('step3_status' in approval) {
      body.step3_approver = approver || '管理员';
      body.step3_status = isApproved ? 'approved' : 'rejected';
      body.step3_time = now;
      body.step3_comment = comment || '';
    }
  }
  
  if (!isApproved) {
    body.status = 'rejected';
    body.approver = approver || '管理员';
    body.approve_time = now;
    body.comment = comment || '';
  } else {
    if ('currentStep' in approval && step < approval.totalSteps) {
      body.current_step = step + 1;
    } else {
      body.status = 'approved';
      body.approver = approver || '管理员';
      body.approve_time = now;
      body.comment = comment || '';
    }
  }
  
  try {
    await supabaseRequest('PATCH', `approvals?id=eq.${id}`, body);
  } catch (error) {
    console.log('⚠️  PATCH 更新失败，尝试移除不支持的字段:', error.message);
    const safeBody = { ...body };
    delete safeBody.step1_status;
    delete safeBody.step2_status;
    delete safeBody.step3_status;
    delete safeBody.step1_approver;
    delete safeBody.step2_approver;
    delete safeBody.step3_approver;
    delete safeBody.step1_time;
    delete safeBody.step2_time;
    delete safeBody.step3_time;
    delete safeBody.step1_comment;
    delete safeBody.step2_comment;
    delete safeBody.step3_comment;
    try {
      await supabaseRequest('PATCH', `approvals?id=eq.${id}`, safeBody);
    } catch (retryError) {
      console.log('⚠️  重试也失败，使用最小字段更新');
      const minimalBody = {
        status: isApproved ? 'pending' : 'rejected',
        current_step: isApproved ? (step < approval.totalSteps ? step + 1 : step) : approval.currentStep,
        update_time: now
      };
      if (!isApproved) {
        minimalBody.approver = approver || '管理员';
        minimalBody.comment = comment || '';
      }
      await supabaseRequest('PATCH', `approvals?id=eq.${id}`, minimalBody);
    }
  }
  
  const updated = await getApprovalById(id);
  if (!updated) throw new Error('更新审批记录失败');
  return updated;
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
  approveStep,
  getStatistics
};
