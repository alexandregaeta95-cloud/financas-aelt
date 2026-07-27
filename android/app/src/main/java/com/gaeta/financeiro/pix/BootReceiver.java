package com.gaeta.financeiro.pix;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class BootReceiver extends BroadcastReceiver {

    private static final String TAG = "PixBootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;

        String action = intent.getAction();
        Log.i(TAG, "BootReceiver ativado com a ação: " + action);

        if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
            "android.intent.action.MY_PACKAGE_REPLACED".equals(action) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(action)) {

            Log.i(TAG, "Dispositivo reiniciado / Pacote atualizado. O NotificationListenerService do Android reconectará automaticamente.");
        }
    }
}
