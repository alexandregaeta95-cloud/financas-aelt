package com.gaeta.financeiro.pix;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.Iterator;

@CapacitorPlugin(name = "PixNotification")
public class PixNotificationPlugin extends Plugin implements PixNotificationBridge.PixListener {

    private static final String TAG = "PixNotificationPlugin";
    private static final String PREFS_NAME = "gaeta_pix_prefs";
    private static final String KEY_MONITORING_ACTIVE = "monitoring_active";

    @Override
    public void load() {
        super.load();
        PixNotificationBridge.registerListener(this);
        Log.i(TAG, "PixNotificationPlugin carregado e escutando ponte de notificações.");
    }

    @Override
    protected void handleOnDestroy() {
        PixNotificationBridge.unregisterListener(this);
        super.handleOnDestroy();
    }

    @Override
    public void onPixDetected(JSONObject pixData) {
        if (pixData == null) return;
        try {
            JSObject ret = new JSObject();
            Iterator<String> keys = pixData.keys();
            while (keys.hasNext()) {
                String key = keys.next();
                ret.put(key, pixData.get(key));
            }
            Log.d(TAG, "Emitindo evento 'pixNotificationReceived' para o React.");
            notifyListeners("pixNotificationReceived", ret);
        } catch (JSONException e) {
            Log.e(TAG, "Erro ao converter evento PIX para JSObject", e);
        }
    }

    @PluginMethod
    public void isPermissionGranted(PluginCall call) {
        Context context = getContext();
        boolean isGranted = isNotificationServiceEnabled(context);

        JSObject ret = new JSObject();
        ret.put("granted", isGranted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        try {
            Intent intent = new Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("requested", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Erro ao abrir tela de permissão de notificações", e);
        }
    }

    @PluginMethod
    public void startService(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putBoolean(KEY_MONITORING_ACTIVE, true).apply();

        JSObject ret = new JSObject();
        ret.put("status", "STARTED");
        call.resolve(ret);
    }

    @PluginMethod
    public void stopService(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putBoolean(KEY_MONITORING_ACTIVE, false).apply();

        JSObject ret = new JSObject();
        ret.put("status", "STOPPED");
        call.resolve(ret);
    }

    @PluginMethod
    public void getServiceStatus(PluginCall call) {
        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean isMonitoring = prefs.getBoolean(KEY_MONITORING_ACTIVE, true);
        boolean permissionGranted = isNotificationServiceEnabled(context);
        boolean batteryOptimizationIgnored = isBatteryOptimizationIgnored(context);

        JSObject ret = new JSObject();
        ret.put("isRunning", isMonitoring);
        ret.put("permissionGranted", permissionGranted);
        ret.put("batteryOptimizationIgnored", batteryOptimizationIgnored);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestBatteryOptimizationIgnore(PluginCall call) {
        Context context = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
                if (pm != null && !pm.isIgnoringBatteryOptimizations(context.getPackageName())) {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + context.getPackageName()));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                }
            } catch (Exception e) {
                Log.e(TAG, "Erro ao solicitar isenção de otimização de bateria", e);
            }
        }
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    private boolean isNotificationServiceEnabled(Context context) {
        String pkgName = context.getPackageName();
        final String flat = Settings.Secure.getString(context.getContentResolver(), "enabled_notification_listeners");
        if (flat != null) {
            final String[] names = flat.split(":");
            for (String name : names) {
                if (name.contains(pkgName)) {
                    return true;
                }
            }
        }
        return false;
    }

    private boolean isBatteryOptimizationIgnored(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            return pm != null && pm.isIgnoringBatteryOptimizations(context.getPackageName());
        }
        return true;
    }
}
