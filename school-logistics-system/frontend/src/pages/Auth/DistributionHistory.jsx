import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import StatusBadge from "../../components/StatusBadge";

function DistributionHistory() {
  const history = [
    {
      resource: "School ID",
      date: "August 18, 2026",
      status: "released",
    },
    {
      resource: "Learning Module",
      date: "August 10, 2026",
      status: "released",
    },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex flex-1 flex-col">
        <Navbar />

        <main className="p-6 lg:p-8">

          <h1 className="text-2xl font-bold text-slate-900">
            Distribution History
          </h1>

          <p className="mt-1 text-slate-500">
            View the resources that have been successfully released to you.
          </p>

          <div className="mt-8 space-y-3">
            {history.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5"
              >
                <div>
                  <h3 className="font-medium text-slate-900">
                    {item.resource}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Released on {item.date}
                  </p>
                </div>

                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>

        </main>
      </div>
    </div>
  );
}

export default DistributionHistory;