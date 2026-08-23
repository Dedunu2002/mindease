import CounsellorSidebar from '../components/CounsellorSidebar'
import '../styles/CounsellorStudents.css'

export default function CounsellorStudents() {

  return (
    <div className="counsellor-layout">

      <CounsellorSidebar />

      <main className="counsellor-placeholder-page">

        <span className="placeholder-kicker">
          COUNSELLOR PORTAL
        </span>

        <h1>
          Students
        </h1>

        <p>
          View and monitor students assigned to your
          counselling sessions.
        </p>

        <div className="placeholder-card">

          <div className="placeholder-icon">
            👨‍🎓
          </div>

          <div>

            <h2>
              Student Progress
            </h2>

            <p>
              Student progress, wellbeing history and
              counselling information will be available
              here.
            </p>

            <span className="coming-soon">
              Student management
            </span>

          </div>

        </div>

      </main>

    </div>
  )
}