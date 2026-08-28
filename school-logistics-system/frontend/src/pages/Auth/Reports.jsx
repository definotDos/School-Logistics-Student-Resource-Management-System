import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";

function Reports() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar type="admin" />

      <div className="flex flex-1 flex-col">
        <Navbar />

        <main className="p-6 lg:p-8">

          <h1 className="text-2xl font-bold text-slate-900">
            Reports & Analytics
          </h1>

          <p className="mt-1 text-slate-500">
            Review resource distribution and inventory performance.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">

            <ReportCard
              title="Inventory Report"
              description="View current stock levels and low-stock resources."
            />

            <ReportCard
              title="Distribution Report"
              description="Review released resources and distribution records."
            />

            <ReportCard
              title="Demand Analytics"
              description="Analyze resource requests and demand trends."
            />

            <ReportCard
              title="Campus Comparison"
              description="Compare logistics activity between campuses."
            />

            <ReportCard
              title="School Comparison"
              description="Compare resource distribution across schools."
            />

            <ReportCard
              title="Audit Logs"
              description="Review important system activities."
            />

          </div>

        </main>
      </div>
    </div>
  );
}

function ReportCard({ title, description }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 hover:shadow-sm">

      <h2 className="font-semibold text-slate-900">
        {title}
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {description}
      </p>

      <button className="mt-5 text-sm font-medium text-blue-600 hover:text-blue-700">
        View Report →
      </button>

    </div>
  );
}

export default Reports;