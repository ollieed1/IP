package co.groogle.iptv;

import android.app.Activity;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.TextView;

import com.amazon.device.iap.PurchasingListener;
import com.amazon.device.iap.PurchasingService;
import com.amazon.device.iap.model.FulfillmentResult;
import com.amazon.device.iap.model.ProductDataResponse;
import com.amazon.device.iap.model.PurchaseResponse;
import com.amazon.device.iap.model.PurchaseUpdatesResponse;
import com.amazon.device.iap.model.Receipt;
import com.amazon.device.iap.model.UserDataResponse;

import java.util.HashSet;
import java.util.Set;

public class MainActivity extends Activity implements PurchasingListener {

    private static final String APP_URL = "https://groogle.co.uk/iptv/app/";
    private static final String SKU = "co.groogle.iptv.unlock";

    private WebView webView;
    private View paywallView;
    private TextView statusText;
    private Button buyButton;
    private Button restoreButton;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Fullscreen
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_FULLSCREEN |
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        );

        // Root container
        FrameLayout root = new FrameLayout(this);
        setContentView(root);

        // WebView (behind paywall)
        webView = new WebView(this);
        webView.setVisibility(View.GONE);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUseWideViewPort(true);
        settings.setBuiltInZoomControls(false);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                view.loadUrl(req.getUrl().toString());
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient());
        root.addView(webView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));

        // Paywall overlay (inflated programmatically — no XML needed)
        paywallView = buildPaywall();
        root.addView(paywallView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));

        // Register Amazon IAP
        PurchasingService.registerListener(this, this);
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
        PurchasingService.getUserData();

        Set<String> skus = new HashSet<>();
        skus.add(SKU);
        PurchasingService.getProductData(skus);
        PurchasingService.getPurchaseUpdates(false);
    }

    @Override
    protected void onPause() {
        super.onPause();
        webView.onPause();
    }

    // ── Amazon IAP callbacks ──────────────────────────────────

    @Override
    public void onUserDataResponse(UserDataResponse response) {
        // User identified — nothing to do here
    }

    @Override
    public void onProductDataResponse(ProductDataResponse response) {
        // Could update the price label here from response.getProductData()
    }

    @Override
    public void onPurchaseUpdatesResponse(PurchaseUpdatesResponse response) {
        if (response.getRequestStatus() == PurchaseUpdatesResponse.RequestStatus.SUCCESSFUL) {
            for (Receipt receipt : response.getReceipts()) {
                if (receipt.getSku().equals(SKU) && !receipt.isCanceled()) {
                    PurchasingService.notifyFulfillment(receipt.getReceiptId(), FulfillmentResult.FULFILLED);
                    unlockApp();
                    return;
                }
            }
            if (response.hasMore()) {
                PurchasingService.getPurchaseUpdates(false);
            }
        }
    }

    @Override
    public void onPurchaseResponse(PurchaseResponse response) {
        if (response.getRequestStatus() == PurchaseResponse.RequestStatus.SUCCESSFUL) {
            Receipt receipt = response.getReceipt();
            if (!receipt.isCanceled()) {
                PurchasingService.notifyFulfillment(receipt.getReceiptId(), FulfillmentResult.FULFILLED);
                unlockApp();
            }
        } else {
            runOnUiThread(() -> {
                statusText.setText("Purchase failed. Please try again.");
                buyButton.setEnabled(true);
                restoreButton.setEnabled(true);
            });
        }
    }

    // ── App unlock ────────────────────────────────────────────

    private void unlockApp() {
        runOnUiThread(() -> {
            paywallView.setVisibility(View.GONE);
            webView.setVisibility(View.VISIBLE);
            webView.loadUrl(APP_URL);
        });
    }

    // ── Back button ───────────────────────────────────────────

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            if (webView.getVisibility() == View.VISIBLE && webView.canGoBack()) {
                webView.goBack();
                return true;
            }
        }
        return super.onKeyDown(keyCode, event);
    }

    // ── Paywall UI (TV-optimised, built in code) ──────────────

    private View buildPaywall() {
        android.widget.LinearLayout layout = new android.widget.LinearLayout(this);
        layout.setOrientation(android.widget.LinearLayout.VERTICAL);
        layout.setGravity(android.view.Gravity.CENTER);
        layout.setBackgroundColor(0xFF121214);
        layout.setPadding(80, 80, 80, 80);

        // App name
        TextView title = new TextView(this);
        title.setText("IP Player");
        title.setTextSize(48);
        title.setTextColor(0xFFFFFFFF);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        title.setGravity(android.view.Gravity.CENTER);
        layout.addView(title);

        // Tagline
        TextView sub = new TextView(this);
        sub.setText("Your M3U and Xtream Codes player");
        sub.setTextSize(20);
        sub.setTextColor(0xFF8A8A8E);
        sub.setGravity(android.view.Gravity.CENTER);
        sub.setPadding(0, 16, 0, 64);
        layout.addView(sub);

        // Status / price
        statusText = new TextView(this);
        statusText.setText("One-time purchase — yours forever");
        statusText.setTextSize(18);
        statusText.setTextColor(0xFF8A8A8E);
        statusText.setGravity(android.view.Gravity.CENTER);
        statusText.setPadding(0, 0, 0, 32);
        layout.addView(statusText);

        // Buy button
        buyButton = new Button(this);
        buyButton.setText("Buy Now");
        buyButton.setTextSize(22);
        buyButton.setTextColor(0xFFFFFFFF);
        buyButton.setBackgroundColor(0xFF4285F4);
        buyButton.setPadding(80, 24, 80, 24);
        buyButton.setOnClickListener(v -> {
            buyButton.setEnabled(false);
            restoreButton.setEnabled(false);
            statusText.setText("Opening Amazon checkout…");
            PurchasingService.purchase(SKU);
        });

        android.widget.LinearLayout.LayoutParams btnParams =
            new android.widget.LinearLayout.LayoutParams(600, 100);
        btnParams.gravity = android.view.Gravity.CENTER_HORIZONTAL;
        btnParams.setMargins(0, 0, 0, 20);
        layout.addView(buyButton, btnParams);

        // Restore button
        restoreButton = new Button(this);
        restoreButton.setText("Restore Purchase");
        restoreButton.setTextSize(18);
        restoreButton.setTextColor(0xFF8A8A8E);
        restoreButton.setBackgroundColor(0x00000000);
        restoreButton.setOnClickListener(v -> {
            statusText.setText("Checking your purchases…");
            PurchasingService.getPurchaseUpdates(true);
        });

        android.widget.LinearLayout.LayoutParams restoreParams =
            new android.widget.LinearLayout.LayoutParams(600,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
        restoreParams.gravity = android.view.Gravity.CENTER_HORIZONTAL;
        layout.addView(restoreButton, restoreParams);

        return layout;
    }
}
