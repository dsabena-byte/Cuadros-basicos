import Script from "next/script";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page() {
  return (
    <>
      <div id="root">
        <div className="card empty">Cargando dashboard…</div>
      </div>

      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"
        strategy="beforeInteractive"
      />
      <Script src="/dashboard.js" strategy="afterInteractive" />
    </>
  );
}
