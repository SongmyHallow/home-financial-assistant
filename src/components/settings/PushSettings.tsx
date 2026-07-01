'use client';
import { useState, useEffect } from 'react';

export default function PushSettings() {
  const [hasPushPlus, setHasPushPlus] = useState(false);
  const [notifyGranted, setNotifyGranted] = useState(false);
  const [notifySupported, setNotifySupported] = useState(true);
  const [testMsg, setTestMsg] = useState('');
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifyGranted(Notification.permission === 'granted');
    } else {
      setNotifySupported(false);
    }
    fetch('/api/push/test', { method: 'GET' })
      .then(res => res.json())
      .then(data => setHasPushPlus(data.configured))
      .catch(() => {});
  }, []);

  async function requestNotification() {
    setRequesting(true);
    setTestMsg('');
    try {
      if (!('Notification' in window)) {
        setTestMsg('❌ 当前浏览器不支持通知功能');
        setRequesting(false);
        return;
      }
      const result = await Notification.requestPermission();
      setNotifyGranted(result === 'granted');
      if (result === 'granted') {
        setTestMsg('✅ 通知已开启');
        new Notification('✅ 测试通知', { body: '浏览器通知已正常推送！' });
      } else if (result === 'denied') {
        setTestMsg('⚠ 通知已被拒绝，请在浏览器设置中手动开启');
      } else {
        setTestMsg('⚠ 通知请求被关闭');
      }
    } catch (e) {
      setTestMsg('❌ 请求通知权限失败');
    } finally {
      setRequesting(false);
    }
  }

  async function testBrowserNotify() {
    if (!notifyGranted) return;
    try {
      new Notification('✅ 测试通知', { body: '浏览器通知已正常推送！' });
      setTestMsg('✅ 测试通知已发送');
    } catch {
      setTestMsg('❌ 发送通知失败');
    }
  }

  async function testWechatPush() {
    setTestMsg('');
    try {
      const res = await fetch('/api/push/test', { method: 'POST' });
      const data = await res.json();
      setTestMsg(data.success ? '✅ 测试成功，请检查微信' : '❌ 推送失败，请检查 Token');
    } catch {
      setTestMsg('❌ 网络错误');
    }
  }

  return (
    <div>
      <h3 className="font-semibold mb-2">推送设置</h3>

      <div className="space-y-3 bg-[var(--color-background)] rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">微信推送</p>
            <p className="text-xs text-[var(--color-muted)]">
              {hasPushPlus ? '已配置 PushPlus Token' : '需在环境变量中配置 PUSHPLUS_TOKEN'}
            </p>
          </div>
          <button onClick={testWechatPush} className="border border-[var(--color-border)] px-3 py-1.5 rounded-lg text-sm">测试</button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">浏览器通知</p>
            <p className="text-xs text-[var(--color-muted)]">
              {!notifySupported ? '⚠ 浏览器不支持' :
               notifyGranted ? '✅ 已授权' : '⚠ 未授权'}
            </p>
          </div>
          {notifyGranted ? (
            <button onClick={testBrowserNotify} className="border border-[var(--color-border)] px-3 py-1.5 rounded-lg text-sm">测试</button>
          ) : (
            <button
              onClick={requestNotification}
              disabled={requesting || !notifySupported}
              className="bg-[var(--color-accent)] text-white px-3 py-1.5 rounded-lg text-sm disabled:opacity-50"
            >
              {requesting ? '请求中...' : '开启通知'}
            </button>
          )}
        </div>

        {testMsg && <p className="text-xs text-[var(--color-muted)]">{testMsg}</p>}
      </div>
    </div>
  );
}
