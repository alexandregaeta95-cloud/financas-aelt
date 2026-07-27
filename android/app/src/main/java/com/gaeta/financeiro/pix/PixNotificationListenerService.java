package com.gaeta.financeiro.pix;

import android.app.Notification;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import org.json.JSONObject;

public class PixNotificationListenerService extends NotificationListenerService {

    private static final String TAG = "PixNotificationService";
    private static final String PREFS_NAME = "gaeta_pix_prefs";
    private static final String KEY_MONITORING_ACTIVE = "monitoring_active";

    @Override
    public void onCreate() {
        super.onCreate();
        Log.i(TAG, "NotificationListenerService criado com sucesso.");
    }

    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        Log.i(TAG, "NotificationListenerService conectado ao sistema Android.");
    }

    @Override
    public void onListenerDisconnected() {
        super.onListenerDisconnected();
        Log.w(TAG, "NotificationListenerService desconectado do sistema Android.");
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null) return;

        // Check if user disabled monitoring in settings
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        boolean isMonitoring = prefs.getBoolean(KEY_MONITORING_ACTIVE, true);
        if (!isMonitoring) {
            return;
        }

        try {
            String packageName = sbn.getPackageName();
            Notification notification = sbn.getNotification();
            if (notification == null) return;

            Bundle extras = notification.extras;
            if (extras == null) return;

            CharSequence titleChar = extras.getCharSequence(Notification.EXTRA_TITLE);
            CharSequence textChar = extras.getCharSequence(Notification.EXTRA_TEXT);

            String title = titleChar != null ? titleChar.toString() : "";
            String text = textChar != null ? textChar.toString() : "";

            if (text.isEmpty() && title.isEmpty()) return;

            Log.d(TAG, "Notificação recebida de " + packageName + ": " + title + " | " + text);

            // Parse financial / PIX data
            JSONObject pixData = PixParser.parseNotification(packageName, title, text);

            if (pixData.optBoolean("isFinancial", false)) {
                double valor = pixData.optDouble("valor", 0.0);
                if (valor > 0) {
                    Log.i(TAG, "PIX/Transferência detectada com sucesso! Valor: R$ " + valor);
                    PixNotificationBridge.notifyPixReceived(getApplicationContext(), pixData);
                } else {
                    Log.d(TAG, "Notificação financeira detectada, mas sem valor numérico claro.");
                }
            }

        } catch (Exception e) {
            Log.e(TAG, "Erro ao processar notificação no serviço nativo", e);
        }
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        // Ignored
    }
}
