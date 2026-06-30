// 反向代理到 Vercel 部署
export default {
  async fetch(request) {
    const url = new URL(request.url);
    // 转发到 Vercel 生产部署
    url.hostname = "home-financial-assistant-52syw1pz0-songmyhallows-projects.vercel.app";

    const modifiedRequest = new Request(url.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: "follow",
    });

    return fetch(modifiedRequest);
  }
};
