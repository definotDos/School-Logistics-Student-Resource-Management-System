import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";

function ClaimSchedule() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex flex-1 flex-col">
        <Navbar />

        <main className="p-6 lg:p-8">

          <h1 className="text-2xl font-bold text-slate-900">
            Claim Schedule
          </h1>

          <p className="mt-1 text-slate-500">
            View your scheduled resource claims.
          </p>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-6">
              <p className="text-sm font-medium text-blue-700">
                Upcoming Claim
              </p>

              <h2 className="mt-3 text-xl font-bold text-slate-900">
                School Uniform
              </h2>

              <div className="mt-5 space-y-2 text-sm text-slate-600">
                <p>📅 August 28, 2026</p>
                <p>⏰ 9:00 AM - 11:00 AM</p>
                <p>📍 Student Affairs Office</p>
              </div>

              <button className="mt-6 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
                View Claim Details
              </button>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

export default ClaimSchedule;