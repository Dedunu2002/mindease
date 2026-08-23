import { useState } from 'react'
import api from '../api/axios'
import CounsellorSidebar from '../components/CounsellorSidebar'
import '../styles/CounsellorReports.css'

export default function CounsellorReports() {

  const today =
    new Date().toISOString().split('T')[0]

  const thirtyDaysAgo = new Date()

  thirtyDaysAgo.setDate(
    thirtyDaysAgo.getDate() - 30
  )

  const defaultFrom =
    thirtyDaysAgo.toISOString().split('T')[0]


  const [fromDate, setFromDate] =
    useState(defaultFrom)

  const [toDate, setToDate] =
    useState(today)

  const [generating, setGenerating] =
    useState(false)

  const [error, setError] =
    useState('')


  const handleGenerateReport = async () => {

    if (!fromDate || !toDate) {

      setError(
        'Please select both dates.'
      )

      return
    }


    if (fromDate > toDate) {

      setError(
        'From date cannot be after To date.'
      )

      return
    }


    try {

      setGenerating(true)

      setError('')


      const response = await api.get(
        '/counsellor/export_report',
        {
          params: {
            from: fromDate,
            to: toDate
          },

          responseType: 'blob'
        }
      )


      const blob = new Blob(
        [response.data],
        {
          type: 'application/pdf'
        }
      )


      const url =
        window.URL.createObjectURL(blob)


      const link =
        document.createElement('a')

      link.href = url

      link.download =
        `MindEase_Wellbeing_Report_${fromDate}_${toDate}.pdf`

      document.body.appendChild(link)

      link.click()

      link.remove()

      window.URL.revokeObjectURL(url)


    } catch (err) {

      console.error(
        'PDF generation error:',
        err
      )


      setError(
        'Could not generate the report. Please try again.'
      )

    } finally {

      setGenerating(false)

    }

  }


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
          Generate anonymous campus wellbeing reports
          for a selected date range.
        </p>


        {error && (

          <div className="report-error">
            ⚠️ {error}
          </div>

        )}


        <section className="report-card">

          <div className="report-icon">
            📄
          </div>


          <div className="report-content">

            <h2>
              Campus Wellbeing Report
            </h2>


            <p>
              Generate a PDF containing aggregated
              wellbeing statistics, risk distribution,
              weekly trends, counselling appointment
              statistics and anonymous SOS activity.
            </p>


            <div className="report-form">

              <div className="report-field">

                <label htmlFor="report-from">
                  From
                </label>

                <input
                  id="report-from"
                  type="date"
                  value={fromDate}
                  max={toDate}
                  onChange={e =>
                    setFromDate(e.target.value)
                  }
                />

              </div>


              <div className="report-field">

                <label htmlFor="report-to">
                  To
                </label>

                <input
                  id="report-to"
                  type="date"
                  value={toDate}
                  min={fromDate}
                  max={today}
                  onChange={e =>
                    setToDate(e.target.value)
                  }
                />

              </div>


              <button
                className="generate-report-button"
                onClick={handleGenerateReport}
                disabled={generating}
              >

                {generating
                  ? 'Generating...'
                  : 'Generate PDF'}

              </button>

            </div>


            <div className="report-note">
              🔒 The report contains aggregated
              statistics only. Individual student
              identities are not included.
            </div>

          </div>

        </section>


        <section className="report-info-grid">

  <div className="report-info-card">
    <div className="report-info-icon trend-icon">
      📈
    </div>

    <div className="report-info-content">
      <span className="report-info-label">
        ANALYTICS
      </span>

      <h3>
        Weekly trends
      </h3>

      <p>
        Good, Moderate and Poor wellbeing trends
        across the selected reporting period.
      </p>
    </div>
  </div>


  <div className="report-info-card">
    <div className="report-info-icon risk-icon">
      ◔
    </div>

    <div className="report-info-content">
      <span className="report-info-label">
        WELLBEING
      </span>

      <h3>
        Risk distribution
      </h3>

      <p>
        Percentage and number of students across
        each wellbeing risk level.
      </p>
    </div>
  </div>


  <div className="report-info-card">
    <div className="report-info-icon privacy-icon">
      🔒
    </div>

    <div className="report-info-content">
      <span className="report-info-label">
        PRIVACY
      </span>

      <h3>
        Anonymous
      </h3>

      <p>
        No individual student identities are included
        in the generated PDF report.
      </p>
    </div>
  </div>

</section>


<section className="report-help-card">

  <div className="report-help-icon">
    💡
  </div>

  <div className="report-help-content">

    <span className="report-info-label">
      REPORT INFORMATION
    </span>

    <h3>
      About these reports
    </h3>

    <p>
      Reports are intended to help counsellors
      understand campus-level wellbeing patterns
      without exposing individual student records.
    </p>

  </div>

</section>

      </main>

    </div>

  )
}