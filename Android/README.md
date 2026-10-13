# 心伙伴安卓体验包

Android 目录只负责将 Frontend 的构建产物封装成安卓 WebView 应用，不更改前端业务。页面从 APK 内置资源通过本地 HTTPS 域名加载，不依赖电脑预览服务。学生登录与内容为演示数据，网络图片仍需联网。此包未在真机或模拟器安装验证。

## 文件

- src：原生 Activity、本地资源加载、图片选择和退出确认。
- res：心伙伴图标和系统栏主题。
- AndroidManifest.xml：名称、版本、系统要求和权限。
- scripts/build.ps1：使用本机 JDK 与 Android SDK 直接编译、对齐并签名，不需要 Gradle。
- scripts/serve-apk.mjs：根据清单版本提供安装页与 APK 的局域网下载服务。
- scripts/verify-web.mjs：校验打包网页中的官方地图、16 个校园商铺、版本信息，并生成资源 SHA-256 清单。
- scripts/inspect-apk.py：只读检查 APK 内网页资源及资源清单，不解压、不运行安装包。
- build：自动生成，已忽略。
- .signing：本机演示签名与密码，已忽略，不能提交。保留它才能用同一签名更新安装包。
- ../Releases：最终 APK 输出，已忽略二进制文件。

## 打包与下载

需要 PowerShell 7、支持原生 TypeScript 的 Node.js（22.18+ 或 24+）、npm、JDK 和 Android SDK（含 API 35 platform 与 build-tools）。先在自己的 Git 克隆目录同步，再从项目根目录打包：

```powershell
git pull --ff-only
pwsh -File ./Android/scripts/build.ps1
```

默认查找本机 Android Studio 的 JDK 以及 LOCALAPPDATA 下的 Android SDK，也可通过 `-Jdk` 和 `-Sdk` 指定路径。脚本自动运行 `npm ci`，强制使用 mock 认证，包名为 com.coraw.campuscompanion，最低 Android 8.0，目标 API 35。

每次构建使用独立目录直接编译当前 Frontend 源码，不复制旧的 Frontend/dist。官方地图、16 个商铺或构建信息缺失时立即终止；封装后逐文件校验 SHA-256。APK 名称、下载页和网页版本都来自 AndroidManifest.xml，当前为 0.1.14（versionCode 15）。

输出为 `Releases/campus-companion-0.1.14.apk`，旁边的 `.apk.build-info.json` 记录 Git 提交、是否有本地修改、构建时间。APP 的“登录帮助”也显示版本和提交编号。源码 ZIP 无 Git 历史时会标记 source-archive，不能据此追溯提交。

可在项目根目录用 Python 3 复核实际准备分发的 APK：

```powershell
python Android/scripts/inspect-apk.py Releases/campus-companion-0.1.14.apk
```

只有所有检查均为 true 且退出码为 0 时才通过；该检查针对内置网页内容，不代替 APK 签名验证或真机测试。手机上仍看到样例地图时，应检查实际发出的 APK，不能只看文件名判断代码版本。

运行 `node Android/scripts/serve-apk.mjs` 后，同一 Wi-Fi 下的手机访问电脑 IP 的 8181 端口下载。也可将 Releases/campus-companion-0.1.14.apk 直接传到手机安装。

Android WebView 已禁用整页手势缩放；校园地图的图片预览仍可单独缩放。本地网页资源使用 no-store，避免后续升级复用旧网页缓存。

此版本支持系统图片选择器，不申请全盘存储权限；不接入相机、录音、后台推送或真实定位权限。地图位置使用现有手动选择和演示流程。手机需有较新的 Android System WebView。

签名使用本机生成的演示证书，不是应用商店发布证书。当前为前端演示，关闭或重建 Activity 后内存业务状态可能重置。
