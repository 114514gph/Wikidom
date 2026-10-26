# 安全政策

## 报告安全漏洞

如果您发现了安全漏洞，请不要公开提交 Issue，而是通过以下方式私密报告：

- 邮箱：security@mengyou.studio
- GitHub Private Vulnerability Reporting

我们会在 48 小时内响应，并在确认漏洞后优先修复。

## 支持版本

| 版本 | 支持状态 |
| --- | --- |
| 2.0.x | 支持 |
| < 2.0 | 不支持 |

## 安全措施

- 所有用户密码使用 SHA-256 哈希存储
- 所有用户输入经过 DOMPurify 净化，防止 XSS
- 图片代理只允许白名单域名，防止 SSRF
- 系统命名空间（User/Template/Category/Help）普通用户不可创建
