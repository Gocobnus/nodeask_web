// app/layout.tsx

// globals.css includes @tailwind directives
// adjust the path if necessary
import "./globals.css";
import {Providers} from "./providers";
import Sidebar from "./components/navigation/Sidebar";

export default function RootLayout({children}: { children: React.ReactNode }) {
  return (
    <html lang="en" className='light'>
      <body>
        <Providers>
          <div className="flex h-screen">
            <Sidebar />
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
