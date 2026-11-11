package com.recordish.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.widget.Toast;

import com.google.androidbrowserhelper.trusted.LauncherActivity;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

// 앱 아이콘을 누르면 가장 먼저 열리는 화면.
// 지난번에 오류로 꺼졌다면 오류 내용을 보여주고(복사 가능), 아니면 바로 Recordish(TWA)를 엽니다.
public class StartActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        File crash = new File(getFilesDir(), RecordishApp.CRASH_FILE);
        if (crash.exists()) {
            String report;
            try {
                report = new String(Files.readAllBytes(crash.toPath()), StandardCharsets.UTF_8);
            } catch (Exception e) {
                report = "오류 기록을 읽지 못했습니다: " + e;
            }
            //noinspection ResultOfMethodCallIgnored
            crash.delete();
            showReport(report);
            return;
        }
        openTwa();
    }

    private void openTwa() {
        Intent intent = new Intent(this, LauncherActivity.class);
        if (getIntent() != null && getIntent().getData() != null) intent.setData(getIntent().getData());
        startActivity(intent);
        finish();
        overridePendingTransition(0, 0);
    }

    private void showReport(String report) {
        final String text = report;
        new AlertDialog.Builder(this, android.R.style.Theme_DeviceDefault_Light_Dialog_Alert)
                .setTitle("지난번에 앱이 오류로 꺼졌어요")
                .setMessage("아래 내용을 [복사]해서 개발자에게 보내 주세요.\n\n" + text)
                .setPositiveButton("복사", (d, w) -> {
                    ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                    cm.setPrimaryClip(ClipData.newPlainText("Recordish 오류", text));
                    Toast.makeText(this, "복사했어요", Toast.LENGTH_SHORT).show();
                    finish();
                })
                .setNegativeButton("다시 열기", (d, w) -> openTwa())
                .setOnCancelListener(d -> finish())
                .show();
    }

    // 크래시 기록에 넣을 브라우저 정보 (기본 브라우저와 크롬 버전)
    static String browserInfo(Context context) {
        PackageManager pm = context.getPackageManager();
        StringBuilder sb = new StringBuilder();
        for (String pkg : new String[] {"com.android.chrome", "com.sec.android.app.sbrowser"}) {
            try {
                PackageInfo info = pm.getPackageInfo(pkg, 0);
                sb.append(pkg).append(' ').append(info.versionName)
                        .append(info.applicationInfo != null && !info.applicationInfo.enabled ? " (사용 안 함)" : "")
                        .append("; ");
            } catch (Exception e) {
                sb.append(pkg).append(" 없음; ");
            }
        }
        return sb.toString();
    }
}
