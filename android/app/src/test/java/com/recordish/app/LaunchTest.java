package com.recordish.app;

import static org.junit.Assert.assertNotNull;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ActivityInfo;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.ResolveInfo;
import android.content.pm.ServiceInfo;

import com.google.androidbrowserhelper.trusted.LauncherActivity;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.Shadows;
import org.robolectric.annotation.Config;
import org.robolectric.shadows.ShadowPackageManager;

// 앱 아이콘을 눌렀을 때처럼 시작 화면(LauncherActivity)을 띄워 보고, 오류가 나면 그대로 보여줍니다.
@RunWith(RobolectricTestRunner.class)
@Config(sdk = {34, 35, 36})
public class LaunchTest {

    private static final String CHROME = "com.android.chrome";

    // 기기에 크롬(맞춤 탭 서비스 + 웹 브라우저)이 설치된 상태를 흉내 냅니다
    private void installFakeChrome() {
        ShadowPackageManager pm = Shadows.shadowOf(RuntimeEnvironment.getApplication().getPackageManager());

        PackageInfo pkg = new PackageInfo();
        pkg.packageName = CHROME;
        pkg.versionName = "130.0";
        pkg.applicationInfo = new ApplicationInfo();
        pkg.applicationInfo.packageName = CHROME;
        pm.installPackage(pkg);

        ResolveInfo service = new ResolveInfo();
        service.serviceInfo = new ServiceInfo();
        service.serviceInfo.packageName = CHROME;
        service.serviceInfo.name = "org.chromium.chrome.browser.customtabs.CustomTabsConnectionService";
        pm.addResolveInfoForIntent(new Intent("android.support.customtabs.action.CustomTabsService"), service);

        ComponentName browser = new ComponentName(CHROME, "com.google.android.apps.chrome.Main");
        IntentFilter filter = new IntentFilter(Intent.ACTION_VIEW);
        filter.addCategory(Intent.CATEGORY_BROWSABLE);
        filter.addCategory(Intent.CATEGORY_DEFAULT);
        filter.addDataScheme("https");
        pm.addActivityIfNotPresent(browser);
        pm.addIntentFilterForActivity(browser, filter);
    }

    private Activity launch() {
        Intent intent = new Intent(Intent.ACTION_MAIN);
        intent.addCategory(Intent.CATEGORY_LAUNCHER);
        intent.setComponent(new ComponentName(RuntimeEnvironment.getApplication(), LauncherActivity.class));
        return Robolectric.buildActivity(LauncherActivity.class, intent).setup().get();
    }

    @Test
    public void launchWithChrome() {
        installFakeChrome();
        Activity activity = launch();
        assertNotNull(activity);
        Intent next = Shadows.shadowOf(activity).getNextStartedActivity();
        System.out.println("크롬 있음 → 다음 화면: " + next);
    }

    @Test
    public void launchWithoutBrowser() {
        Activity activity = launch();
        assertNotNull(activity);
        System.out.println("브라우저 없음 → 다음 화면: " + Shadows.shadowOf(activity).getNextStartedActivity());
    }
}
