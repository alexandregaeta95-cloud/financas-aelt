package com.gaeta.financeiro.pix;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class PixNotificationBridge {

    private static final String TAG = "PixNotificationBridge";
    public static final String ACTION_PIX_DETECTED = "com.gaeta.financeiro.ACTION_PIX_DETECTED";

    public interface PixListener {
        void onPixDetected(JSONObject pixData);
    }

    private static final List<PixListener> listeners = new ArrayList<>();

    public static synchronized void registerListener(PixListener listener) {
        if (!listeners.contains(listener)) {
            listeners.add(listener);
            Log.d(TAG, "Listener registrado com sucesso.");
        }
    }

    public static synchronized void unregisterListener(PixListener listener) {
        listeners.remove(listener);
        Log.d(TAG, "Listener removido.");
    }

    public static void notifyPixReceived(Context context, JSONObject pixData) {
        if (pixData == null) return;

        Log.d(TAG, "Notificando ouvintes sobre novo PIX: " + pixData.toString());

        // 1. Dispatch to active plugin instance
        synchronized (PixNotificationBridge.class) {
            for (PixListener listener : listeners) {
                try {
                    listener.onPixDetected(pixData);
                } catch (Exception e) {
                    Log.e(TAG, "Erro ao notificar ouvinte", e);
                }
            }
        }

        // 2. Broadcast local intent for backup/background receiver
        if (context != null) {
            Intent intent = new Intent(ACTION_PIX_DETECTED);
            intent.putExtra("pix_json", pixData.toString());
            context.sendBroadcast(intent);
        }
    }
}
