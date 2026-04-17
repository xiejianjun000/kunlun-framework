# 昆仑框架安全运行机制

> **版本**：v1.0  
> **日期**：2026年4月17日  
> **整合来源**：OpenCLAW v2026.4.15 + Hermes v0.9.0 + Claude Code

---

## 一、三大系统安全机制总览

### 1.1 OpenCLAW安全机制

#### 沙箱隔离（核心安全边界）

```yaml
# 沙箱模式配置
sandbox:
  mode: "non-main"  # off/non-main/all
  scope: "session"  # session/agent/shared
  workspaceAccess: "none"  # none/ro/rw
  
  # Docker容器配置
  docker:
    network: "bridge"  # none/bridge
    binds:
      - "/home/user/source:/source:ro"
      - "/var/data:/data:rw"
  
  # 浏览器沙箱
  browser:
    autoStart: true
    network: "openclaw-sandbox-browser"
    cdpSourceRange: "172.21.0.1/32"  # CIDR白名单
```

**隔离内容**：
- 工具执行（exec/read/write/edit/apply_patch/process）
- 浏览器自动化（可选沙箱化）
- 文件系统访问限制
- 网络连接限制
- 进程命名空间隔离

#### 四级权限模型

```yaml
# 权限级别定义
permissions:
  Level_0_none:      # 无系统访问
    tools: [calculator, text_processing]
    
  Level_1_read:      # 只读
    tools: [file_read, web_search, memory_recall]
    
  Level_2_write:     # 写入（沙箱内）
    tools: [file_write, memory_store, http_request_post]
    
  Level_3_execute:   # 执行命令
    tools: [shell, browser]
```

#### 插件安全预设

```yaml
# 四级安全预设
security_presets:
  minimal:    # 开发者/自托管
    process_isolation: none
    filesystem: path_validation_only
    network: none
    credentials: shared_process_env
    
  standard:   # 普通用户（默认）
    process_isolation: separate_per_plugin
    filesystem: read_only_system_dirs
    network: outbound_allowlist_per_manifest
    credentials: declared_env_vars_only
    resources: { memory: 512MB, cpu: 30s }
    
  strict:     # 安全意识用户
    process_isolation: platform_native_sandbox
    filesystem: minimal_view
    network: strict_allowlist_no_raw_socket
    credentials: vault_on_demand_injection
    resources: { memory: 256MB, cpu: 10s, files: 100 }
    
  paranoid:   # 企业/多租户
    process_isolation: deep_isolation_gVisor_VM
    filesystem: ephemeral_per_invocation
    network: namespace_egress_proxy
    credentials: HSM_backed_injection
    resources: aggressive_limits_watchdog
```

#### 插件能力声明

```yaml
# manifest.yaml
name: my-plugin
sandbox:
  env:
    require: [OPENAI_API_KEY, MY_PLUGIN_TOKEN]
  fs:
    read: ["./data/**", "/tmp/openclaw/**"]
    write: ["./output/**"]
  net:
    allow: ["api.openai.com:443", "discord.com:443"]
  tools:
    allow: [read, write, message_send]
```

---

### 1.2 Hermes Agent安全机制

#### 六类五级权限系统

```yaml
# 权限配置（Tools > Permissions）
permissions:
  file_reading:
    Level_0_disabled: "无法读取任何文件"
    Level_1_app_only: "仅Hermes应用文件夹"
    Level_2_app_home: "应用+用户文件夹（默认）"
    Level_3_anywhere: "任意文件"
    Level_4_system: "系统文件、配置、注册表"
    
  file_writing:
    Level_0_disabled: "无法写入任何文件"
    Level_1_app_only: "仅Hermes文件夹（默认）"
    Level_2_app_home: "应用+用户文件夹"
    Level_3_anywhere: "任意位置"
    Level_4_system: "系统文件（极度危险）"
    
  package_installation:
    Level_0_disabled: "无法安装包"
    Level_1_app_only: "仅便携Python（默认）"
    Level_2_app_user: "便携+用户级包"
    Level_3_system_wide: "系统级安装"
    Level_4_admin: "系统服务和驱动"
    
  command_execution:
    Level_0_disabled: "无法运行命令"
    Level_1_app_only: "仅Hermes文件夹内"
    Level_2_app_safe: "任意位置但无管理权限（默认）"
    Level_3_unrestricted: "任意命令"
    Level_4_admin: "管理员权限命令"
    
  file_deletion:
    Level_0_disabled: "无法删除文件"
    Level_1_app_only: "仅Hermes文件夹（默认）"
    Level_2_app_home: "应用+用户文件夹"
    Level_3_anywhere: "任意文件"
    Level_4_system: "系统文件（危险）"
    
  network_access:
    Level_0_offline: "无网络访问"
    Level_1_local_only: "仅localhost"
    Level_2_web_apis: "网页+API（默认）"
    Level_3_full_network: "SSH等任意网络"
    Level_4_full_listen: "监听端口+入站连接"
```

#### 危险命令审批机制

```python
# tools/approval.py
DANGEROUS_PATTERNS = [
    # 系统破坏
    r"rm\s+-rf\s+/",
    r"sudo\s+rm",
    r"format\s+",
    r"del\s+/[sS]",
    
    # 权限提升
    r"sudo\s+",
    r"su\s+",
    r"chmod\s+777",
    r"chown\s+root",
    
    # 网络危险操作
    r"curl\s+.*\|\s*bash",
    r"wget\s+.*\|\s*bash",
    r"nc\s+-l",
    r"iptables",
    
    # 凭据泄露
    r"cat\s+.*id_rsa",
    r"cat\s+.*/etc/shadow",
    r"cat\s+.*/.env",
    
    # 进程危险
    r"kill\s+-9\s+1",
    r"pkill\s+.*systemd",
]
```

**审批流程**：
1. 命令匹配危险模式 → 触发审批
2. 用户收到提示："该命令需要授权执行"
3. 用户选择：Allow Once / Always Allow / Don't Allow
4. 日志记录审批结果

#### 用户授权系统

```yaml
# ~/.hermes/.env
# 平台白名单
TELEGRAM_ALLOWED_USERS=123456789,987654321
DISCORD_ALLOWED_USERS=111222333444555666
WHATSAPP_ALLOWED_USERS=15551234567
SLACK_ALLOWED_USERS=U01ABC123

# 跨平台白名单
GATEWAY_ALLOWED_USERS=123456789

# 开放访问（谨慎使用）
DISCORD_ALLOW_ALL_USERS=true
GATEWAY_ALLOW_ALL_USERS=true
```

#### 配对码系统

```bash
# 安全配对流程
1. 未知用户发送DM → Bot生成8字符配对码
2. Bot提示："配对码: ABC12DEF（1小时有效）"
3. Bot所有者运行：hermes pairing approve telegram ABC12DEF
4. 用户永久授权

# 配对安全特性
- 32字符无歧义字母表（无0/O/1/I）
- 加密随机生成（secrets.choice()）
- 1小时有效期
- 每用户10分钟限1次请求
- 每平台最多3个待处理配对码
- 5次失败尝试 → 1小时锁定
- 文件权限：chmod 0600
- 配对码永不记录到日志
```

#### RBAC角色控制

```yaml
# config.yaml
gateway:
  user_roles:
    "123456789":        # Telegram用户ID - 管理员
      role: admin
      allowed_tools: all
      
    "987654321":        # 经理 - 无终端/代码执行
      role: manager
      blocked_tools: [terminal, execute_code, bash]
      
    default:            # 其他所有人 - 仅MCP工具
      role: viewer
      allowed_tools: [mcp__*]
```

#### Docker容器加固

```python
# tools/environments/docker.py
_SECURITY_ARGS = [
    "--cap-drop", "ALL",                      # 移除所有Linux能力
    "--security-opt", "no-new-privileges",    # 阻止权限提升
    "--pids-limit", "256",                    # 限制进程数
    "--tmpfs", "/tmp:rw,nosuid,size=512m",    # 限制/tmp大小
    "--tmpfs", "/var/tmp:rw,noexec,nosuid,size=256m",  # 禁止执行
    "--read-only",                            # 只读根文件系统
]
```

#### MCP环境变量过滤

```python
# MCP子进程只接收安全变量
SAFE_ENV_VARS = [
    "PATH", "HOME", "USER", "LANG", "LC_ALL",
    "TERM", "SHELL", "TMPDIR"
]

# 加上所有XDG_*变量
# 其他变量（API密钥、令牌、密钥）全部过滤
```

---

### 1.3 Claude Code安全机制

#### 沙箱隔离

```json
{
  "sandbox": {
    "enabled": true,
    
    // 文件系统隔离
    "filesystem": {
      "allowWrite": ["~/.kube", "/tmp/build"],  // 额外写入路径
      "denyRead": ["~/.ssh", "~/.gnupg"]         // 禁止读取
    },
    
    // 网络隔离
    "network": {
      "allowDomains": [
        "api.github.com",
        "api.anthropic.com"
      ],
      "allowManagedDomainsOnly": false  // 仅允许托管域名
    },
    
    // 命令排除（不进入沙箱）
    "excludedCommands": [
      "docker",
      "kubectl"
    ]
  }
}
```

**沙箱实现**：
- macOS：Seatbelt（操作系统级强制）
- Linux：bubblewrap（命名空间隔离）
- 所有子进程继承沙箱限制（kubectl、terraform、npm等）

#### 权限系统

```bash
# 查看权限
/permissions

# 权限类型
- Bash命令执行权限
- 文件系统访问权限
- 网络访问权限
- MCP服务器权限
```

**权限粒度**：
- 细粒度：单个命令/文件/域名
- 粗粒度：目录/通配符/域名组
- 临时：单次会话
- 永久：持久保存

#### 敏感操作保护

```yaml
# 敏感文件保护
protected_files:
  - ~/.ssh/id_rsa
  - ~/.gnupg
  - ~/.config/credentials
  - .env
  - **/secrets.yaml

# 敏感命令保护
protected_commands:
  - "git push --force"
  - "sudo *"
  - "rm -rf *"
  - "curl * | bash"
```

#### 云执行安全

```yaml
# 云端沙箱
cloud_execution:
  - 隔离虚拟机（每个会话独立VM）
  - 网络访问控制（默认禁用或仅特定域名）
  - 凭据保护（安全代理+作用域令牌）
  - 分支限制（仅当前分支推送）
  - 审计日志（所有操作记录）
  - 自动清理（会话结束自动终止）
```

---

## 二、昆仑框架安全设计

### 2.1 整合三大系统安全机制

```yaml
# 昆仑框架安全配置
kunlun:
  security:
    # 沙箱模式（整合OpenCLAW）
    sandbox:
      enabled: true
      level: standard  # minimal/standard/strict/paranoid
      mode: non-main   # off/non-main/all
      scope: session   # session/agent/shared
      
    # 权限系统（整合Hermes）
    permissions:
      file_access: Level_2        # 应用+用户文件夹
      command_execution: Level_2  # 无管理员权限
      network_access: Level_2     # Web+API
      package_installation: Level_1  # 仅应用内
      
    # 危险操作审批（整合Hermes + Claude Code）
    approval_required:
      - dangerous_commands
      - sensitive_files
      - network_unknown_domains
      - system_modifications
      
    # 用户授权（整合Hermes）
    authorization:
      gateway_allowed_users: []
      platform_allowlists: {}
      pairing_enabled: true
      rbac_enabled: true
```

### 2.2 ⚠️ 需要主动授权的操作

**框架设计原则：涉及电脑安全的操作必须主动跳出授权**

```yaml
# 必须授权的操作类别
authorization_triggers:
  
  # 1. 命令执行
  command_execution:
    - pattern: "sudo *"
      action: "提示：需要管理员权限，是否授权？"
    - pattern: "rm -rf /"
      action: "警告：危险操作，是否继续？"
    - pattern: "curl * | bash"
      action: "警告：远程脚本执行，是否授权？"
    - pattern: "git push --force"
      action: "警告：强制推送，是否继续？"
      
  # 2. 文件访问
  file_access:
    - pattern: "~/.ssh/*"
      action: "提示：访问SSH密钥，是否授权？"
    - pattern: "~/.gnupg/*"
      action: "提示：访问GPG密钥，是否授权？"
    - pattern: "**/.env"
      action: "提示：访问环境变量文件，是否授权？"
    - pattern: "**/credentials.json"
      action: "提示：访问凭据文件，是否授权？"
      
  # 3. 网络访问
  network_access:
    - pattern: "unknown_domain.com"
      action: "提示：首次访问该域名，是否授权？"
    - pattern: "localhost:*"
      action: "提示：访问本地服务，是否授权？"
    - pattern: "*:22"  # SSH端口
      action: "提示：访问SSH端口，是否授权？"
      
  # 4. 系统修改
  system_modification:
    - pattern: "/etc/*"
      action: "提示：修改系统配置，是否授权？"
    - pattern: "/usr/local/*"
      action: "提示：安装系统软件，是否授权？"
    - pattern: "launchctl *"
      action: "提示：修改系统服务，是否授权？"
      
  # 5. 进程管理
  process_management:
    - pattern: "kill -9 *"
      action: "提示：强制终止进程，是否授权？"
    - pattern: "pkill *"
      action: "提示：批量终止进程，是否授权？"
    - pattern: "systemctl *"
      action: "提示：操作系统服务，是否授权？"
```

### 2.3 授权弹窗设计

```typescript
// 授权请求接口
interface AuthorizationRequest {
  type: 'command' | 'file' | 'network' | 'system' | 'process';
  operation: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details: {
    command?: string;
    filePath?: string;
    domain?: string;
    port?: number;
  };
  options: AuthorizationOption[];
}

// 授权选项
interface AuthorizationOption {
  label: string;
  value: 'allow_once' | 'allow_always' | 'allow_session' | 'deny';
  recommended?: boolean;
}

// 授权弹窗示例
const authRequest: AuthorizationRequest = {
  type: 'command',
  operation: 'sudo apt install nginx',
  risk: 'high',
  description: '安装系统软件需要管理员权限',
  details: {
    command: 'sudo apt install nginx'
  },
  options: [
    { label: '仅本次允许', value: 'allow_once', recommended: true },
    { label: '本次会话允许', value: 'allow_session' },
    { label: '永久允许', value: 'allow_always' },
    { label: '拒绝', value: 'deny' }
  ]
};
```

### 2.4 安全预设配置

```yaml
# 昆仑框架三级安全预设
kunlun_security_presets:
  
  # Level 1: 开发模式（宽松）
  developer:
    sandbox:
      enabled: false
    permissions:
      file_access: Level_3        # 任意文件
      command_execution: Level_3  # 任意命令
      network_access: Level_3     # 任意网络
    approval_required:
      - critical_operations_only
      
  # Level 2: 标准模式（默认）
  standard:
    sandbox:
      enabled: true
      level: standard
    permissions:
      file_access: Level_2        # 应用+用户文件夹
      command_execution: Level_2  # 无管理员权限
      network_access: Level_2     # Web+API
    approval_required:
      - dangerous_commands
      - sensitive_files
      - system_modifications
      
  # Level 3: 严格模式（企业）
  enterprise:
    sandbox:
      enabled: true
      level: paranoid
    permissions:
      file_access: Level_1        # 仅应用文件夹
      command_execution: Level_1  # 仅应用文件夹内
      network_access: Level_1     # 仅localhost
    approval_required:
      - all_commands
      - all_file_access
      - all_network_access
```

---

## 三、实施建议

### 3.1 默认安全配置

```yaml
# 昆仑框架默认安全配置
default_security:
  sandbox:
    enabled: true
    level: standard
    mode: non-main
    
  permissions:
    file_access: Level_2
    command_execution: Level_2
    network_access: Level_2
    package_installation: Level_1
    
  approval_required:
    - dangerous_commands
    - sensitive_files
    - network_unknown_domains
    - system_modifications
```

### 3.2 敏感操作检测

```python
# 敏感操作检测器
class SensitiveOperationDetector:
    def detect(self, operation: str, context: dict) -> Optional[AuthorizationRequest]:
        # 检测危险命令
        if self.is_dangerous_command(operation):
            return self.create_auth_request('command', operation, 'high')
        
        # 检测敏感文件
        if self.is_sensitive_file(context.get('file_path')):
            return self.create_auth_request('file', operation, 'medium')
        
        # 检测未知域名
        if self.is_unknown_domain(context.get('domain')):
            return self.create_auth_request('network', operation, 'low')
        
        # 检测系统修改
        if self.is_system_modification(operation):
            return self.create_auth_request('system', operation, 'critical')
        
        return None
```

### 3.3 审计日志

```python
# 安全审计日志
class SecurityAuditLogger:
    async def log_authorization(self, request: AuthorizationRequest, result: str):
        await self.db.insert({
            'timestamp': datetime.now(),
            'type': request.type,
            'operation': request.operation,
            'risk': request.risk,
            'result': result,  # allow_once/allow_always/deny
            'user_id': self.user_id,
            'session_id': self.session_id,
            'details': request.details
        })
```

---

## 四、总结

### 核心安全原则

1. **默认拒绝**：未明确允许的操作一律拒绝
2. **最小权限**：只授予完成任务所需的最小权限
3. **主动授权**：涉及电脑安全的操作必须主动跳出授权
4. **审计追踪**：所有安全相关操作记录日志
5. **分层防御**：沙箱+权限+审批+审计多层保护

### 必须授权的操作

- ✅ 管理员权限命令（sudo、su）
- ✅ 危险文件操作（rm -rf、format）
- ✅ 敏感文件访问（SSH密钥、凭据文件）
- ✅ 远程脚本执行（curl | bash）
- ✅ 系统配置修改（/etc/*）
- ✅ 进程终止（kill -9、pkill）
- ✅ 未知域名访问
- ✅ 系统服务操作（systemctl、launchctl）

---

**文档版本**：v1.0  
**最后更新**：2026年4月17日  
**维护者**：昆仑框架团队
