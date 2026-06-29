import MainLayout from "../layouts/MainLayout";

type User = {
  name?: string;
  role?: "admin" | "bm" | "unit_manager" | "agency_manager" | "agent";
  email?: string;
};

export default function RoleDashboard() {
  const user: User = JSON.parse(localStorage.getItem("insuranceUser") || "{}");

  const role = user.role || "agent";

  const dashboardData = {
    admin: {
      title: "Admin Dashboard",
      subtitle: "Complete company overview",
      cards: [
        ["Branches", "12"],
        ["Employees", "248"],
        ["Customers", "4,820"],
        ["Premium", "₹82L"],
      ],
    },
    bm: {
      title: "Branch Manager Dashboard",
      subtitle: "Branch sales and team performance",
      cards: [
        ["Unit Managers", "8"],
        ["Agents", "74"],
        ["Branch Premium", "₹18L"],
        ["Claims Pending", "12"],
      ],
    },
    unit_manager: {
      title: "Unit Manager Dashboard",
      subtitle: "Unit level team performance",
      cards: [
        ["Agency Managers", "15"],
        ["Agents", "42"],
        ["Premium", "₹9.5L"],
        ["Target", "78%"],
      ],
    },
    agency_manager: {
      title: "Agency Manager Dashboard",
      subtitle: "Agency team leads and sales",
      cards: [
        ["Agents", "12"],
        ["Leads", "96"],
        ["Converted", "32"],
        ["Premium", "₹4.2L"],
      ],
    },
    agent: {
      title: "Agent Dashboard",
      subtitle: "Your leads, customers and policies",
      cards: [
        ["My Leads", "24"],
        ["Customers", "18"],
        ["Policies", "9"],
        ["Commission", "₹18K"],
      ],
    },
  };

  const current = dashboardData[role];

  return (
    <MainLayout title={current.title} subtitle={current.subtitle}>
      <div className="cards">
        {current.cards.map((card) => (
          <div className="card" key={card[0]}>
            <h3>{card[0]}</h3>
            <h1>{card[1]}</h1>
          </div>
        ))}
      </div>

      <div className="section">
        <h2>Role Access</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Module</th>
              <th>Access</th>
            </tr>
          </thead>
          <tbody>
            {role === "admin" && (
              <>
                <tr><td>Employees</td><td><span className="badge">Full Access</span></td></tr>
                <tr><td>Branches</td><td><span className="badge">Full Access</span></td></tr>
                <tr><td>Reports</td><td><span className="badge">Full Access</span></td></tr>
              </>
            )}

            {role === "bm" && (
              <>
                <tr><td>Branch Reports</td><td><span className="badge">Allowed</span></td></tr>
                <tr><td>Unit Managers</td><td><span className="badge">Allowed</span></td></tr>
                <tr><td>Claims</td><td><span className="badge">Allowed</span></td></tr>
              </>
            )}

            {role === "unit_manager" && (
              <>
                <tr><td>Agency Managers</td><td><span className="badge">Allowed</span></td></tr>
                <tr><td>Targets</td><td><span className="badge">Allowed</span></td></tr>
                <tr><td>Reports</td><td><span className="badge">Limited</span></td></tr>
              </>
            )}

            {role === "agency_manager" && (
              <>
                <tr><td>Agents</td><td><span className="badge">Allowed</span></td></tr>
                <tr><td>Leads</td><td><span className="badge">Allowed</span></td></tr>
                <tr><td>Premiums</td><td><span className="badge">Allowed</span></td></tr>
              </>
            )}

            {role === "agent" && (
              <>
                <tr><td>My Leads</td><td><span className="badge">Allowed</span></td></tr>
                <tr><td>Customers</td><td><span className="badge">Allowed</span></td></tr>
                <tr><td>Policies</td><td><span className="badge">Allowed</span></td></tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </MainLayout>
  );
}