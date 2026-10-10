package com.coraw.campuscompanion;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.*;
import android.view.View;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/** Bundled student demo. Native back delegates to the front-end layer stack. */
public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private boolean backPending;
    private AlertDialog exitDialog;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.setBackgroundColor(0xfffaf9f6);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setGeolocationEnabled(false);
        settings.setTextZoom(100);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!HOST.equals(uri.getHost())) return null;
                if (!"https".equals(uri.getScheme()) || !"GET".equals(request.getMethod())) return missing();
                String path = uri.getPath();
                if (path == null || path.equals("/")) path = "/index.html";
                if (path.contains("..") || path.contains("\\") || path.indexOf('\0') >= 0) return missing();
                try {
                    InputStream content = getAssets().open("web" + path);
                    String ext = MimeTypeMap.getFileExtensionFromUrl(path);
                    String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
                    if (path.endsWith(".js")) mime = "application/javascript";
                    if (mime == null) mime = "application/octet-stream";
                    Map<String, String> headers = new HashMap<>();
                    headers.put("X-Content-Type-Options", "nosniff");
                    return new WebResourceResponse(mime, "UTF-8", 200, "OK", headers, content);
                } catch (Exception ignored) { return missing(); }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (HOST.equals(uri.getHost()) && "https".equals(uri.getScheme())) return false;
                if (request.isForMainFrame() && ("https".equals(uri.getScheme()) || "http".equals(uri.getScheme()))) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                    catch (Exception ignored) { Toast.makeText(MainActivity.this, "无法打开链接", Toast.LENGTH_SHORT).show(); }
                }
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent pick = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                pick.addCategory(Intent.CATEGORY_OPENABLE);
                pick.setType("image/*");
                pick.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
                try { startActivityForResult(pick, 100); }
                catch (Exception ignored) { fileCallback.onReceiveValue(null); fileCallback = null; }
                return true;
            }
        });
        setContentView(web);
        web.loadUrl("https://" + HOST + "/index.html");
    }

    private WebResourceResponse missing() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", new HashMap<>(), new ByteArrayInputStream(new byte[0]));
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request != 100 || fileCallback == null) return;
        Uri[] uris = null;
        if (result == RESULT_OK && data != null) {
            if (data.getClipData() != null) {
                int count = data.getClipData().getItemCount();
                uris = new Uri[count];
                for (int i = 0; i < count; i++) uris[i] = data.getClipData().getItemAt(i).getUri();
            } else if (data.getData() != null) uris = new Uri[]{data.getData()};
        }
        fileCallback.onReceiveValue(uris);
        fileCallback = null;
    }

    @Override public void onBackPressed() {
        if (backPending || (exitDialog != null && exitDialog.isShowing())) return;
        backPending = true;
        web.evaluateJavascript("typeof window.campusBack === 'function' ? window.campusBack() : null", result -> {
            if (isFinishing() || isDestroyed()) return;
            // A missing/loading script cannot authorize exiting the app.
            if ("false".equals(result)) {
                exitDialog = new AlertDialog.Builder(this).setMessage("退出心伙伴？")
                    .setNegativeButton("继续体验", null).setPositiveButton("退出", (dialog, which) -> finish()).create();
                exitDialog.show();
            }
            web.postDelayed(() -> backPending = false, 250);
        });
    }

    @Override protected void onDestroy() {
        if (fileCallback != null) { fileCallback.onReceiveValue(null); fileCallback = null; }
        if (web != null) web.destroy();
        super.onDestroy();
    }
}
