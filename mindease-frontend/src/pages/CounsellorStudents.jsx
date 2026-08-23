import { useEffect, useMemo, useState } from 'react'
import api from '../api/axios'
import CounsellorSidebar from '../components/CounsellorSidebar'
import '../styles/CounsellorStudents.css'


const getRiskClass = (risk) => {

  if (!risk) {
    return 'student-risk-none'
  }

  const value = risk.toLowerCase()

  if (
    value === 'low' ||
    value === 'good'
  ) {
    return 'student-risk-good'
  }

  if (
    value === 'medium' ||
    value === 'moderate'
  ) {
    return 'student-risk-moderate'
  }

  return 'student-risk-poor'
}


const getRiskLabel = (risk) => {

  if (!risk) {
    return 'No check-in'
  }

  const value = risk.toLowerCase()

  if (value === 'low') {
    return 'Good'
  }

  if (value === 'medium') {
    return 'Moderate'
  }

  if (value === 'high') {
    return 'Poor'
  }

  return risk
}


export default function CounsellorStudents() {

  const [students, setStudents] = useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [search, setSearch] =
    useState('')

  const [selectedStudent, setSelectedStudent] =
    useState(null)

  const [progress, setProgress] =
    useState(null)

  const [progressLoading, setProgressLoading] =
    useState(false)


  // ==========================================================
  // LOAD STUDENTS
  // ==========================================================

  const loadStudents = async () => {

    try {

      setLoading(true)
      setError('')

      const response = await api.get(
        '/counsellor/students'
      )

      setStudents(
        response.data.students || []
      )

    } catch (err) {

      console.error(
        'Student loading error:',
        err
      )

      setError(
        err.response?.data?.error ||
        'Could not load students.'
      )

    } finally {

      setLoading(false)

    }
  }


  useEffect(() => {

    loadStudents()

  }, [])


  // ==========================================================
  // SEARCH
  // ==========================================================

  const filteredStudents = useMemo(() => {

    const query =
      search.trim().toLowerCase()

    if (!query) {
      return students
    }

    return students.filter(student =>

      student.name
        ?.toLowerCase()
        .includes(query)

      ||

      student.email
        ?.toLowerCase()
        .includes(query)

    )

  }, [
    students,
    search
  ])


  // ==========================================================
  // VIEW PROGRESS
  // ==========================================================

  const handleViewProgress = async (
    student
  ) => {

    try {

      setSelectedStudent(student)

      setProgress(null)

      setProgressLoading(true)

      const response = await api.get(
        `/counsellor/students/${student.id}/progress`
      )

      setProgress(response.data)

    } catch (err) {

      console.error(
        'Student progress error:',
        err
      )

      alert(
        err.response?.data?.error ||
        'Could not load student progress.'
      )

      setSelectedStudent(null)

    } finally {

      setProgressLoading(false)

    }
  }


  // ==========================================================
  // CLOSE
  // ==========================================================

  const closeProgress = () => {

    setSelectedStudent(null)

    setProgress(null)

  }


  // ==========================================================
  // SUMMARY
  // ==========================================================

  const goodCount =
    students.filter(student => {

      const risk =
        student.latest_risk?.toLowerCase()

      return (
        risk === 'low' ||
        risk === 'good'
      )

    }).length


  const moderateCount =
    students.filter(student => {

      const risk =
        student.latest_risk?.toLowerCase()

      return (
        risk === 'medium' ||
        risk === 'moderate'
      )

    }).length


  const poorCount =
    students.filter(student => {

      const risk =
        student.latest_risk?.toLowerCase()

      return (
        risk === 'high' ||
        risk === 'poor'
      )

    }).length


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div className="counsellor-layout">

      <CounsellorSidebar />


      <main className="counsellor-students-page">

        {/* ==================================================
            HEADER
        ================================================== */}

        <header className="students-page-header">

          <div>

            <span className="students-kicker">
              COUNSELLOR PORTAL
            </span>

            <h1>
              Students
            </h1>

            <p>
              Monitor student wellbeing and
              counselling progress.
            </p>

          </div>


          <button
            className="students-refresh"
            onClick={loadStudents}
          >
            ↻ Refresh
          </button>

        </header>


        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (

          <div className="students-error">
            ⚠️ {error}
          </div>

        )}


        {/* ==================================================
            SUMMARY
        ================================================== */}

        <section className="students-summary">

          <div className="student-summary-card student-summary-total">

            <span>
              Students
            </span>

            <strong>
              {students.length}
            </strong>

            <small>
              Connected to you
            </small>

          </div>


          <div className="student-summary-card student-summary-good">

            <span>
              Good
            </span>

            <strong>
              {goodCount}
            </strong>

            <small>
              Latest check-in
            </small>

          </div>


          <div className="student-summary-card student-summary-moderate">

            <span>
              Moderate
            </span>

            <strong>
              {moderateCount}
            </strong>

            <small>
              May need monitoring
            </small>

          </div>


          <div className="student-summary-card student-summary-poor">

            <span>
              Poor
            </span>

            <strong>
              {poorCount}
            </strong>

            <small>
              Consider follow-up
            </small>

          </div>

        </section>


        {/* ==================================================
            STUDENT PANEL
        ================================================== */}

        <section className="students-panel">

          <div className="students-panel-header">

            <div>

              <span>
                YOUR STUDENTS
              </span>

              <h2>
                Student Progress
              </h2>

            </div>


            <div className="student-search">

              <span>
                🔍
              </span>

              <input
                type="text"
                placeholder="Search students..."
                value={search}
                onChange={e =>
                  setSearch(e.target.value)
                }
              />

            </div>

          </div>


          {/* =================================================
              LOADING
          ================================================= */}

          {loading ? (

            <div className="students-empty">

              <div className="student-spinner" />

              <strong>
                Loading students...
              </strong>

            </div>

          ) : filteredStudents.length === 0 ? (

            <div className="students-empty">

              <div className="students-empty-icon">
                👨‍🎓
              </div>

              <strong>
                {search
                  ? 'No students found'
                  : 'No students yet'}
              </strong>

              <span>
                {search
                  ? 'Try a different search.'
                  : 'Students who book appointments with you will appear here.'}
              </span>

            </div>

          ) : (

            <div className="students-table-wrapper">

              <table className="students-table">

                <thead>

                  <tr>

                    <th>
                      STUDENT
                    </th>

                    <th>
                      RISK LEVEL
                    </th>

                    <th>
                      LAST CHECK-IN
                    </th>

                    <th>
                      CHECK-INS
                    </th>

                    <th>
                      APPOINTMENTS
                    </th>

                    <th>
                      ACTION
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {filteredStudents.map(
                    student => (

                      <tr key={student.id}>

                        {/* STUDENT */}

                        <td>

                          <div className="student-table-person">

                            <div className="student-table-avatar">

                              {student.name
                                ?.charAt(0)
                                ?.toUpperCase()}

                            </div>

                            <div>

                              <strong>
                                {student.name}
                              </strong>

                              <span>
                                {student.email}
                              </span>

                            </div>

                          </div>

                        </td>


                        {/* RISK */}

                        <td>

                          <span
                            className={`student-risk ${getRiskClass(
                              student.latest_risk
                            )}`}
                          >

                            <span className="risk-dot" />

                            {getRiskLabel(
                              student.latest_risk
                            )}

                          </span>

                        </td>


                        {/* LAST CHECK-IN */}

                        <td>

                          <span className="student-date">

                            {student.last_checkin
                              ? new Date(
                                  `${student.last_checkin}T00:00:00`
                                ).toLocaleDateString(
                                  'en-GB',
                                  {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  }
                                )
                              : 'No check-in'}

                          </span>

                        </td>


                        {/* CHECK-INS */}

                        <td>

                          <span className="student-count">

                            {student.checkin_count}

                          </span>

                        </td>


                        {/* APPOINTMENTS */}

                        <td>

                          <span className="student-count">

                            {student.appointment_count}

                          </span>

                        </td>


                        {/* ACTION */}

                        <td>

                          <button
                            className="view-progress-button"
                            onClick={() =>
                              handleViewProgress(
                                student
                              )
                            }
                          >
                            View Progress →
                          </button>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </section>

      </main>


      {/* ====================================================
          PROGRESS MODAL
      ==================================================== */}

      {selectedStudent && (

        <div
          className="student-progress-overlay"
          onClick={closeProgress}
        >

          <div
            className="student-progress-modal"
            onClick={e =>
              e.stopPropagation()
            }
          >

            <div className="progress-modal-header">

              <div>

                <span>
                  STUDENT PROGRESS
                </span>

                <h2>
                  {selectedStudent.name}
                </h2>

                <p>
                  {selectedStudent.email}
                </p>

              </div>


              <button
                className="progress-close-button"
                onClick={closeProgress}
              >
                ×
              </button>

            </div>


            {progressLoading ? (

              <div className="progress-loading">

                <div className="student-spinner" />

                <span>
                  Loading progress...
                </span>

              </div>

            ) : progress ? (

              <div className="progress-modal-content">

                {/* =========================================
                    LATEST RISK
                ========================================= */}

                <section className="latest-progress-card">

                  <span>
                    LATEST WELLBEING RESULT
                  </span>

                  <strong
                    className={`large-risk-badge ${getRiskClass(
                      progress.latest_checkin?.risk_result
                    )}`}
                  >
                    {getRiskLabel(
                      progress.latest_checkin?.risk_result
                    )}
                  </strong>

                  {progress.latest_checkin && (

                    <p>
                      Last check-in:{' '}
                      {new Date(
                        `${progress.latest_checkin.date}T00:00:00`
                      ).toLocaleDateString(
                        'en-GB',
                        {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        }
                      )}
                    </p>

                  )}

                </section>


                {/* =========================================
                    WELLBEING INDICATORS
                ========================================= */}

                {progress.latest_checkin && (

                  <section className="progress-indicators">

                    <div>

                      <span>
                        Stress
                      </span>

                      <strong>
                        {progress.latest_checkin.stress_level}
                      </strong>

                    </div>


                    <div>

                      <span>
                        Sleep
                      </span>

                      <strong>
                        {progress.latest_checkin.sleep_hours}
                        <small> hrs</small>
                      </strong>

                    </div>


                    <div>

                      <span>
                        Physical Activity
                      </span>

                      <strong>
                        {progress.latest_checkin.physical_activity}
                      </strong>

                    </div>


                    <div>

                      <span>
                        Social Support
                      </span>

                      <strong>
                        {progress.latest_checkin.social_support}
                      </strong>

                    </div>


                    <div>

                      <span>
                        Academic Performance
                      </span>

                      <strong>
                        {progress.latest_checkin.academic_performance}
                      </strong>

                    </div>

                  </section>

                )}


                {/* =========================================
                    CHECK-IN HISTORY
                ========================================= */}

                <section className="progress-history-section">

                  <div className="progress-section-title">

                    <div>

                      <span>
                        WELLBEING HISTORY
                      </span>

                      <h3>
                        Recent Check-ins
                      </h3>

                    </div>

                    <strong>
                      {progress.checkins.length}
                    </strong>

                  </div>


                  {progress.checkins.length === 0 ? (

                    <div className="progress-no-data">
                      No check-ins recorded.
                    </div>

                  ) : (

                    <div className="progress-history-list">

                      {progress.checkins
                        .slice(0, 8)
                        .map(checkin => (

                          <div
                            className="progress-history-row"
                            key={checkin.id}
                          >

                            <span className="history-date">

                              {new Date(
                                `${checkin.date}T00:00:00`
                              ).toLocaleDateString(
                                'en-GB',
                                {
                                  day: '2-digit',
                                  month: 'short'
                                }
                              )}

                            </span>


                            <span
                              className={`student-risk ${getRiskClass(
                                checkin.risk_result
                              )}`}
                            >

                              <span className="risk-dot" />

                              {getRiskLabel(
                                checkin.risk_result
                              )}

                            </span>


                            <span>
                              Stress: {checkin.stress_level}
                            </span>

                            <span>
                              Sleep: {checkin.sleep_hours}h
                            </span>

                          </div>

                        ))}

                    </div>

                  )}

                </section>


                {/* =========================================
                    APPOINTMENT HISTORY
                ========================================= */}

                <section className="progress-history-section">

                  <div className="progress-section-title">

                    <div>

                      <span>
                        COUNSELLING
                      </span>

                      <h3>
                        Appointment History
                      </h3>

                    </div>

                    <strong>
                      {progress.appointments.length}
                    </strong>

                  </div>


                  {progress.appointments.length === 0 ? (

                    <div className="progress-no-data">
                      No appointments recorded.
                    </div>

                  ) : (

                    <div className="progress-appointment-list">

                      {progress.appointments
                        .slice(0, 6)
                        .map(appointment => (

                          <div
                            className="progress-appointment-row"
                            key={appointment.id}
                          >

                            <span>
                              {new Date(
                                `${appointment.date}T00:00:00`
                              ).toLocaleDateString(
                                'en-GB',
                                {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                }
                              )}
                            </span>

                            <span>
                              {appointment.time}
                            </span>

                            <span
                              className={`appointment-mini-status appointment-mini-${appointment.status}`}
                            >
                              {appointment.status}
                            </span>

                          </div>

                        ))}

                    </div>

                  )}

                </section>

              </div>

            ) : (

              <div className="progress-no-data">
                Could not load student progress.
              </div>

            )}

          </div>

        </div>

      )}

    </div>
  )
}