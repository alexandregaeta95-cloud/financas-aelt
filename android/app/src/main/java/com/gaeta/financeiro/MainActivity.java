package com.gaeta.financeiro;

import android.os.Bundle;
import com.gaeta.financeiro.pix.PixNotificationPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PixNotificationPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
