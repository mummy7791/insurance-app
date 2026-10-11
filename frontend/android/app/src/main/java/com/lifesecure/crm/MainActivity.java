package com.lifesecure.crm;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

/**
 * Keep startup lightweight. The Android system picker handles file/photo selection
 * without broad storage permissions; request camera permissions only when a camera
 * feature is actually invoked, not every time the WebView launches.
 */
public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }
}
