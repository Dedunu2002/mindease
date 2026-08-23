import CounsellorSidebar from '../components/CounsellorSidebar'
import '../styles/CounsellorReports.css'

export default function CounsellorReports() {

  return (
    <div className="counsellor-layout">

      <CounsellorSidebar />

      <main className="counsellor-reports-page">

        <span className="reports-kicker">
          COUNSELLOR PORTAL
        </span>

        <h1>
          Reports
        </h1>

        <p className="reports-subtitle">
          Generate anonymous campus wellbeing reports.
        </p>

        <section className="report-card">

          <div className="report-icon">
            📄
          </div>

          <div className="report-content">

            <h2>
              Campus Wellbeing Report
            </h2>

            <p>
              Generate reports containing aggregated
              wellbeing statistics, risk distribution,
              appointment statistics and weekly trends.
            </p>

            <div className="report-form">

              <div className="report-field">

                <label>
                  From
                </label>

                <input
                  type="date"
                  id="report-from"
                />

              </div>

              <div className="report-field">

                <label>
                  To
                </label>

                <input
                  type="date"
                  id="report-to"
                />

              </div>

              <button
                className="generate-report-button"
                disabled
              >
                Generate PDF
              </button>

            </div>

            <div className="report-note">
              📊 PDF report generation will be connected
              to the backend next.
            </div>

          </div>

        </section>

      </main>

    </div>
  )
}