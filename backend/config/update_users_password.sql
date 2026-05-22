-- 为 users 表添加 password 字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- 更新现有用户的密码为默认密码 123456（实际项目请使用加密存储）
UPDATE users SET password = '123456' WHERE password IS NULL;
