-- 审批系统数据库表结构

-- 1. 角色表 - 定义系统角色
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 用户表 - 存储用户信息
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  real_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  department VARCHAR(100),
  role_id INTEGER REFERENCES roles(id),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 审批类型表 - 定义审批类型及其流程
CREATE TABLE IF NOT EXISTS approval_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  workflow_config JSONB DEFAULT '[]'::jsonb,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 审批步骤表 - 定义审批流程步骤
CREATE TABLE IF NOT EXISTS approval_steps (
  id SERIAL PRIMARY KEY,
  type_id INTEGER REFERENCES approval_types(id),
  step_order INTEGER NOT NULL,
  role_id INTEGER REFERENCES roles(id),
  step_name VARCHAR(50) NOT NULL,
  required BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(type_id, step_order)
);

-- 5. 审批主表 - 审批申请单
CREATE TABLE IF NOT EXISTS approvals (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type_id INTEGER REFERENCES approval_types(id),
  applicant VARCHAR(100) NOT NULL,
  creator VARCHAR(100),
  department VARCHAR(100) NOT NULL,
  amount NUMERIC(12, 2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft',
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 3,
  description TEXT,
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_auto_save TIMESTAMP
);

-- 6. 审批记录表 - 每一步审批的详细记录
CREATE TABLE IF NOT EXISTS approval_records (
  id SERIAL PRIMARY KEY,
  approval_id VARCHAR(36) REFERENCES approvals(id),
  step_order INTEGER NOT NULL,
  role_id INTEGER REFERENCES roles(id),
  approver_id VARCHAR(36) REFERENCES users(id),
  approver_name VARCHAR(100),
  action VARCHAR(20) NOT NULL, -- approve/reject
  comment TEXT,
  action_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);
CREATE INDEX IF NOT EXISTS idx_approval_steps_type_id ON approval_steps(type_id);
CREATE INDEX IF NOT EXISTS idx_approvals_type_id ON approvals(type_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_current_step ON approvals(current_step);
CREATE INDEX IF NOT EXISTS idx_approval_records_approval_id ON approval_records(approval_id);
CREATE INDEX IF NOT EXISTS idx_approval_records_step_order ON approval_records(step_order);

-- 插入初始化数据

-- 插入角色
INSERT INTO roles (name, description, permissions) VALUES 
('creator', '制单人', '{"submit": true, "viewOwn": true}'),
('business', '采购商务', '{"approveStep1": true, "viewDept": true}'),
('leader', '采购组长', '{"approveStep2": true, "viewTeam": true}'),
('gm', '采购GM', '{"approveStep3": true, "viewAll": true}'),
('admin', '系统管理员', '{"all": true}')
ON CONFLICT (name) DO NOTHING;

-- 插入审批类型
INSERT INTO approval_types (name, description, workflow_config) VALUES 
('采购', '采购申请', '[1,2,3]'),
('请假', '请假申请', '[1,2]'),
('报销', '费用报销', '[1,2,3]'),
('入职', '入职申请', '[1]'),
('离职', '离职申请', '[1,2]')
ON CONFLICT (name) DO NOTHING;

-- 插入审批步骤配置
-- 采购流程：商务评估 -> 组长审批 -> GM审批
INSERT INTO approval_steps (type_id, step_order, role_id, step_name) VALUES 
((SELECT id FROM approval_types WHERE name = '采购'), 1, (SELECT id FROM roles WHERE name = 'business'), '待商务评估'),
((SELECT id FROM approval_types WHERE name = '采购'), 2, (SELECT id FROM roles WHERE name = 'leader'), '待采购组长审批'),
((SELECT id FROM approval_types WHERE name = '采购'), 3, (SELECT id FROM roles WHERE name = 'gm'), '待GM审批'),
-- 请假流程：商务评估 -> 组长审批
((SELECT id FROM approval_types WHERE name = '请假'), 1, (SELECT id FROM roles WHERE name = 'business'), '待审批'),
((SELECT id FROM approval_types WHERE name = '请假'), 2, (SELECT id FROM roles WHERE name = 'leader'), '待审批'),
-- 报销流程：商务评估 -> 组长审批 -> GM审批
((SELECT id FROM approval_types WHERE name = '报销'), 1, (SELECT id FROM roles WHERE name = 'business'), '待审核'),
((SELECT id FROM approval_types WHERE name = '报销'), 2, (SELECT id FROM roles WHERE name = 'leader'), '待审批'),
((SELECT id FROM approval_types WHERE name = '报销'), 3, (SELECT id FROM roles WHERE name = 'gm'), '待审批'),
-- 入职流程：HR审批
((SELECT id FROM approval_types WHERE name = '入职'), 1, (SELECT id FROM roles WHERE name = 'business'), '待HR审批'),
-- 离职流程：直属审批 -> HR审批
((SELECT id FROM approval_types WHERE name = '离职'), 1, (SELECT id FROM roles WHERE name = 'leader'), '待直属审批'),
((SELECT id FROM approval_types WHERE name = '离职'), 2, (SELECT id FROM roles WHERE name = 'business'), '待HR审批')
ON CONFLICT (type_id, step_order) DO NOTHING;

-- 插入示例用户
INSERT INTO users (id, username, real_name, email, department, role_id) VALUES 
('user-001', 'zhangsan', '张三', 'zhangsan@company.com', '技术部', (SELECT id FROM roles WHERE name = 'creator')),
('user-002', 'lisi', '李四', 'lisi@company.com', '采购部', (SELECT id FROM roles WHERE name = 'business')),
('user-003', 'wangwu', '王五', 'wangwu@company.com', '采购部', (SELECT id FROM roles WHERE name = 'leader')),
('user-004', 'zhaoliu', '赵六', 'zhaoliu@company.com', '采购部', (SELECT id FROM roles WHERE name = 'gm')),
('user-005', 'sunqi', '孙七', 'sunqi@company.com', '市场部', (SELECT id FROM roles WHERE name = 'creator'))
ON CONFLICT (username) DO NOTHING;

-- 更新现有approvals表添加必要字段（如果存在旧表）
ALTER TABLE IF EXISTS approvals ADD COLUMN IF NOT EXISTS type_id INTEGER REFERENCES approval_types(id);
ALTER TABLE IF EXISTS approvals ADD COLUMN IF NOT EXISTS current_step INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS approvals ADD COLUMN IF NOT EXISTS total_steps INTEGER DEFAULT 3;

-- 仅当字段存在时更新数据
DO $$
BEGIN
    -- 检查 type_id 字段是否存在
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'approvals' AND column_name = 'type_id') THEN
        UPDATE approvals SET type_id = (SELECT id FROM approval_types WHERE name = '采购') WHERE type = '采购';
        UPDATE approvals SET type_id = (SELECT id FROM approval_types WHERE name = '请假') WHERE type = '请假';
        UPDATE approvals SET type_id = (SELECT id FROM approval_types WHERE name = '报销') WHERE type = '报销';
    END IF;
    
    -- 检查 current_step 字段是否存在
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'approvals' AND column_name = 'current_step') THEN
        UPDATE approvals SET current_step = 1 WHERE status = 'pending' AND current_step = 0;
    END IF;
END $$;

SELECT '✅ 审批系统数据库初始化完成' AS result;