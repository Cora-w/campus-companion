# 找回密码接口待接入（2026-10-15）

登录页「忘记密码」进入独立全页，不再打开登录帮助。界面依次为确认账号、短信验证、设置密码、完成。参考腾讯账号安全的身份验证流程：https://rule.tencent.com/rule/preview/77970129-5be5-48c1-b135-6c28bf283200 。保留应用自身暖色样式。

以下为前端提出的接口契约，尚未实现后端或短信供应商。路径相对 `VITE_API_BASE_URL`，使用项目现有 JSON 错误格式 `{ message, code, requestId? }`。本地 mock 不模拟验证码发送或密码修改成功。

| POST 路径 | 请求 | 成功响应 |
| --- | --- | --- |
| `/auth/password-recovery/code` | `{ schoolId, account, phone }` | `{ challengeId, maskedPhone, retryAfter }` |
| `/auth/password-recovery/verify` | `{ challengeId, code }` | `{ resetToken }` |
| `/auth/password-recovery/reset` | `{ resetToken, password }` | `204` 或 JSON |

手机号必须由服务端核对为该学校账号已绑定的手机号；不能凭客户端提交的手机号重置任意账号。`retryAfter` 单位为秒。验证码为六位数字，由服务端生成、验证、限次并设置有效期。服务端统一账号不存在、手机号不匹配等响应，防止枚举账号；对账号、手机号、IP 限流。challenge 绑定账号、学校和验证渠道，过期或次数耗尽必须重新验证。

resetToken 为服务端验证成功后签发的短时、单次凭证，绑定已验证账号及学校；仅用于重置密码，不能作为登录令牌。前端只存内存，返回或完成时清理；服务端不得信任客户端的页面步骤。密码策略沿用注册规则：8–64 位且包含字母与数字，服务端必须再次校验并安全散列。成功后消费凭证并撤销既有会话，不自动登录。

无法接收短信的用户可打开学校管理员求助说明；没有伪造联系电话或提交人工申诉的行为。后端实际提供学校联系方式后可继续完善此入口。

浏览器检查：`node qa/check-password-recovery.mjs`。验证独立页面、320/390/430 宽度、必填、求助、返回、错误验证码、密码不一致和成功状态。后半段使用测试专用传输替身，不会发送短信，不代表后端联调通过。
