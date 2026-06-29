'use client';
import { useState, useEffect } from 'react';

export default function PushSettings() {
  const [hasPushPlus, setHasPushPlus] = useState(false);
  const [notifyGranted, setNotifyGranted] = useState(false);
  const [testMsg, setTestMsg] = useState('');

  useEffect(() => {
    setNotifyGranted(Notification.permission === 'granted');
    // 通过 API 检查 PushPlus Token 是否已配置
    fetch('/api/push/test', { method: 'GET' })
      .then(res => res.json())
      .then(data => setHasPushPlus(data.configured))
      .catch(() => {});
  }, []);

  async function requestNotification() {
    const result = await Notification.requestPermission();
    setNotifyGranted(result === 'granted');
  }

  async function testBrowserNotify() {
    if (!notifyGranted) return;
    new Notification('✅ 测试通知', { body: '浏览器通知已正常推送！' });
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

      <div className="space-y-3 bg-gray-50 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">微信推送</p>
            <p className="text-xs text-gray-500">
              {hasPushPlus ? '已配置 PushPlus Token' : '需在环境变量中配置 PUSHPLUS_TOKEN'}
            </p>
          </div>
          <button onClick={testWechatPush} className="border px-3 py-1 rounded text-sm">测试</button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">浏览器通知</p>
            <p className="text-xs text-gray-500">
              {notifyGranted ? '✅ 已授权' : '⚠ 未授权'}
            </p>
          </div>
          {notifyGranted ? (
            <button onClick={testBrowserNotify} className="border px-3 py-1 rounded text-sm">测试</button>
          ) : (
            <button onClick={requestNotification} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">开启通知</button>
          )}
        </div>

        {testMsg && <p className="text-sm">{testMsg}</p>}
      </div>
    </div>
  );
}
