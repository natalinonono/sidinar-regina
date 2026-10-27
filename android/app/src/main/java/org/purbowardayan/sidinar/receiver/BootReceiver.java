package org.purbowardayan.sidinar.receiver;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import org.purbowardayan.sidinar.auth.SessionManager;

public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null || intent == null) return;
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            SessionManager sessionManager = new SessionManager(context);
            if (sessionManager.isLoggedIn()) {
                ReminderSyncReceiver.startBackgroundMonitoring(context);
            }
        }
    }
}
