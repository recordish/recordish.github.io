package com.recordish.app;

import android.app.Application;
import android.content.Context;
import android.os.Build;

import java.io.File;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.io.StringWriter;

// 앱이 오류로 꺼지면 오류 내용을 파일에 남겨 두었다가, 다음 실행 때 화면에 보여줍니다 (StartActivity).
// attachBaseContext 에서 설치해서, 앱 시작 직후(ContentProvider 준비 단계)의 오류도 잡습니다.
public class RecordishApp extends Application {
    static final String CRASH_FILE = "last_crash.txt";

    @Override
    protected void attachBaseContext(Context base) {
        super.attachBaseContext(base);
        final Thread.UncaughtExceptionHandler previous = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler((thread, error) -> {
            try {
                StringWriter trace = new StringWriter();
                error.printStackTrace(new PrintWriter(trace));
                try (FileWriter out = new FileWriter(new File(base.getFilesDir(), CRASH_FILE))) {
                    out.write("Recordish " + BuildConfig.VERSION_NAME + " (" + BuildConfig.VERSION_CODE + ")\n");
                    out.write("Android " + Build.VERSION.RELEASE + " (API " + Build.VERSION.SDK_INT + "), "
                            + Build.MANUFACTURER + " " + Build.MODEL + "\n");
                    out.write("Browser: " + StartActivity.browserInfo(base) + "\n\n");
                    out.write(trace.toString());
                }
            } catch (Throwable ignored) {
                // 기록에 실패해도 원래 처리 흐름은 그대로 둡니다
            }
            if (previous != null) previous.uncaughtException(thread, error);
        });
    }
}
