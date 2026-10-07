# 心伙伴安卓体验包

Android 目录只负责将 Frontend 的构建产物封装成安卓 WebView 应用，不更改前端业务。页面从 APK 内置资源通过本地 HTTPS 域名加载，不依赖电脑预览服务。学生登录与内容为演示数据，网络图片仍需联网。此包未在真机或模拟器安装验证。

## 文件

- src：原生 Activity、本地资源加载、图片选择和退出确认。
- res：心伙伴图标和系统栏主题。
- AndroidManifest.xml：名称、版本、系统要求和权限。
- scripts/build.ps1：使用本机 JDK 与 Android SDK 直接编译、对齐并签名，不需要 Gradle。
- scripts/serve-apk.mjs：仅提供安装页与 APK 的局域网下载服务。
- build：自动生成，已忽略。
- .signing：本机演示签名与密码，已忽略，不能提交。保留它才能用同一签名更新安装包。
- ../Releases：最终 APK 输出，已忽略二进制文件。

## 打包与下载

项目根目录运行 `./Android/scripts/build.ps1`。默认查找本机 Android Studio 的 JDK 以及 LOCALAPPDATA 下的 Android SDK，也可通过 -Jdk 和 -Sdk 指定路径。脚本强制使用 mock 认证，包名为 com.coraw.campuscompanion，最低 Android 8.0，目标 API 35。

运行 `node Android/scripts/serve-apk.mjs` 后，同一 Wi-Fi 下的手机访问电脑 IP 的 8181 端口下载。也可将 Releases/campus-companion-0.1.4.apk 直接传到手机安装。

此版本支持系统图片选择器，不申请全盘存储权限；不接入相机、录音、后台推送或真实定位权限。地图位置使用现有手动选择和演示流程。手机需有较新的 Android System WebView。

签名使用本机生成的演示证书，不是应用商店发布证书。当前为前端演示，关闭或重建 Activity 后内存业务状态可能重置。
