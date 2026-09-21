import "./globals.css";
import RuntimeErrorHandler from "./components/RuntimeErrorHandler";

export const metadata = {
  title: "Dashboard",
  description: "Blank Dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
      </head>
      <body>
        <RuntimeErrorHandler />
        {children}
      </body>
    </html>
  );
}
