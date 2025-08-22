export const metadata = {
  title: "ARKON CRM",
  description: "Prosty szkielet CRM w Next.js",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <body style={{ margin: 0, fontFamily: "system-ui, Segoe UI, Arial, sans-serif", background: "#0b1020", color: "#e7ecff" }}>
        {children}
      </body>
    </html>
  );
}
