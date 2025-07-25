// 根布局 - 全局样式和Provider
// 侧边栏现在在dashboard路由组中管理，实现布局持久化

import "./globals.css";
import {Providers} from "./providers";

export default function RootLayout({children}: { children: React.ReactNode }) {
  return (
    <html lang="en" className='light'>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
