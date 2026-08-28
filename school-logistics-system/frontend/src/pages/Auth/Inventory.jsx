import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";

function Inventory() {
  const inventory = [
    {
      name: "School Uniform",
      category: "Uniform",
      available: 45,
      reserved: 10,
      total: 55,
    },
    {
      name: "Mathematics Book",
      category: "Books",
      available: 120,
      reserved: 25,
      total: 145,
    },
    {
      name: "School Shoes",
      category: "Footwear",
      available: 28,
      reserved: 7,
      total: 35,
    },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar type="admin" />

      <div className="flex flex-1 flex-col">
        <Navbar />

        <main className="p-6 lg:p-8">

          <div className="flex flex-col justify-between gap-4 sm:flex-row">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Inventory
              </h1>

              <p className="mt-1 text-slate-500">
                Monitor current school resource stock.
              </p>
            </div>

            <button className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
              + Receive Resources
            </button>
          </div>

          <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">

              <table className="w-full text-left text-sm">

                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Resource</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Available</th>
                    <th className="px-6 py-4">Reserved</th>
                    <th className="px-6 py-4">Total</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {inventory.map((item) => (
                    <tr key={item.name}>
                      <td className="px-6 py-4 font-medium text-slate-800">
                        {item.name}
                      </td>

                      <td className="px-6 py-4 text-slate-500">
                        {item.category}
                      </td>

                      <td className="px-6 py-4 font-medium text-green-600">
                        {item.available}
                      </td>

                      <td className="px-6 py-4 text-yellow-600">
                        {item.reserved}
                      </td>

                      <td className="px-6 py-4 text-slate-700">
                        {item.total}
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}

export default Inventory;