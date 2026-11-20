import { useEffect, useState } from 'react';
import './App.css';

const studentFields = [
  ['Student name', 'name'],
  ['Register number', 'reg'],
  ['College name', 'college'],
  ['Department', 'department'],
  ['Year', 'year'],
  ['Degree', 'degree'],
  ['Email address', 'email'],
  ['Phone number', 'phone'],
  ['Address', 'address']
];

const readStoredValue = (key, fallback) => {
  try {
    const storedValue = JSON.parse(localStorage.getItem(key));
    return storedValue ?? fallback;
  } catch {
    return fallback;
  }
};

const initialStudent = {
  name: 'Dhanish M',
  reg: '311824201008',
  college: 'Mohamed Sathak A J College of Engineering',
  department: 'AI & Data Science',
  year: 'III Year',
  degree: 'B.Tech',
  email: 'dhanish00016@gmail.com',
  phone: '6384852570',
  address: '',
  photo: ''
};

function App() {
  const [students, setStudents] = useState(() => {
    return readStoredValue('students', []);
  });
  const [history, setHistory] = useState(() => {
    const savedHistory = readStoredValue('student-history', null);
    const savedStudents = readStoredValue('students', []);
    if (savedHistory?.length || savedStudents.length === 0) return savedHistory || [];

    return savedStudents.map((student) => {
      const { photo, ...studentDetails } = student;
      return {
        id: `${student.id}-existing`,
        action: 'Previously registered',
        occurredAt: student.registeredAt || '',
        student: studentDetails,
        photoAttached: Boolean(photo)
      };
    });
  });
  const [form, setForm] = useState(initialStudent);
  const [search, setSearch] = useState('');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('student-portal-theme') === 'dark');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportStatus, setExportStatus] = useState('');

  useEffect(() => {
    localStorage.setItem('students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('student-history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('student-portal-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const updateField = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const uploadPhoto = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setForm({ ...form, photo: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const registerStudent = (event) => {
    event.preventDefault();

    if (students.some((student) => student.reg === form.reg)) {
      alert('This register number is already registered!');
      return;
    }

    const registeredAt = new Date().toISOString();
    const student = { ...form, id: Date.now(), registeredAt };
    const { photo, ...studentDetails } = student;

    setStudents((currentStudents) => [...currentStudents, student]);
    setHistory((currentHistory) => [{
      id: `${student.id}-registered`,
      action: 'Registered',
      occurredAt: registeredAt,
      student: studentDetails,
      photoAttached: Boolean(photo)
    }, ...currentHistory]);
    setForm({ ...initialStudent, name: '', reg: '', email: '', phone: '', address: '', photo: '' });
    alert('Student registered successfully!');
  };

  const deleteStudent = (id) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      const student = students.find((currentStudent) => currentStudent.id === id);
      if (!student) return;

      const { photo, ...studentDetails } = student;
      setStudents((currentStudents) => currentStudents.filter((currentStudent) => currentStudent.id !== id));
      setHistory((currentHistory) => [{
        id: `${student.id}-removed-${Date.now()}`,
        action: 'Removed',
        occurredAt: new Date().toISOString(),
        student: studentDetails,
        photoAttached: Boolean(photo)
      }, ...currentHistory]);
    }
  };

  const exportWorkbook = async () => {
    setIsExporting(true);
    setExportError('');
    setExportStatus('');

    try {
      const { default: writeExcelFile } = await import('write-excel-file/browser');
      const makeSheetData = (rows, definitions) => [
        definitions.map(([header]) => ({
          value: header,
          fontWeight: 'bold',
          backgroundColor: '#7658E8',
          textColor: '#FFFFFF'
        })),
        ...rows.map((row) => definitions.map(([, key]) => row[key] ?? ''))
      ];
      const registrations = students.map((student) => ({
        ...student,
        photoAttached: student.photo ? 'Yes' : 'No',
        registeredAt: student.registeredAt || ''
      }));
      const historyRows = history.map((entry) => ({
        action: entry.action,
        occurredAt: entry.occurredAt,
        ...entry.student,
        photoAttached: entry.photoAttached ? 'Yes' : 'No'
      }));
      const studentColumns = [
        ['Student name', 'name', 24],
        ['Register number', 'reg', 20],
        ['College name', 'college', 38],
        ['Department', 'department', 24],
        ['Year', 'year', 14],
        ['Degree', 'degree', 16],
        ['Email address', 'email', 32],
        ['Phone number', 'phone', 20],
        ['Address', 'address', 36],
        ['Photo attached', 'photoAttached', 16],
        ['Registered at', 'registeredAt', 26]
      ];
      const historyColumns = [
        ['Action', 'action', 16],
        ['Date and time', 'occurredAt', 26],
        ...studentFields.map(([header, key]) => [header, key, key === 'address' ? 36 : 24]),
        ['Photo attached', 'photoAttached', 16]
      ];
      const blob = await writeExcelFile([
        {
          data: makeSheetData(registrations, studentColumns),
          sheet: 'Student Registrations',
          columns: studentColumns.map(([, , width]) => ({ width })),
          stickyRowsCount: 1
        },
        {
          data: makeSheetData(historyRows, historyColumns),
          sheet: 'Registration History',
          columns: historyColumns.map(([, , width]) => ({ width })),
          stickyRowsCount: 1
        }
      ]).toBlob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `campusID-students-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      setExportStatus('Workbook ready. Check your browser downloads.');
    } catch (error) {
      console.error('Failed to export student workbook', error);
      setExportError('Could not export the Excel workbook. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const filteredStudents = students.filter((student) =>
    student.name.toLowerCase().includes(search.toLowerCase()) ||
    student.reg.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`app${darkMode ? ' theme-dark' : ''}`}>
      <nav className="navbar">
        <a className="brand" href="#" aria-label="Campus ID home">
          <span className="brand-mark" aria-hidden="true">✦</span>
          <span>campus<span className="brand-accent">ID</span></span>
        </a>
        <div className="nav-actions">
          <span className="nav-caption">Student management, made simple</span>
          <button
            className="theme-toggle"
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            aria-label={`Switch to ${darkMode ? 'light' : 'dark'} theme`}
            aria-pressed={darkMode}
          >
            <span aria-hidden="true">{darkMode ? '☀️' : '🌙'}</span>
            <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>
          </button>
        </div>
      </nav>

      <header className="hero">
        <div className="hero-content">
          <p className="welcome"><span className="status-dot" /> YOUR CAMPUS, ALL IN ONE PLACE</p>
          <h1>Big things start<br />with <span>your next chapter.</span></h1>
          <p className="hero-description">Create student ID cards and keep your campus community organized.</p>
          <a className="hero-link" href="#registration">Create a student card <span aria-hidden="true">↓</span></a>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-card">
            <span className="art-sparkle">✦</span>
            <div className="art-avatar">🎓</div>
            <span className="art-line art-line-long" />
            <span className="art-line art-line-short" />
            <span className="art-chip">CAMPUS ID</span>
          </div>
          <span className="art-star star-one">✦</span>
          <span className="art-star star-two">✧</span>
        </div>
        <div className="hero-counter">
          <span className="counter-icon">👥</span>
          <span><strong>{students.length}</strong><small>students registered</small></span>
        </div>
      </header>

      <main className="container">
        <section className="registration panel" id="registration">
          <div className="section-heading">
            <span className="heading-icon icon-purple">✎</span>
            <div>
              <p className="eyebrow">GET STARTED</p>
              <h2>New student</h2>
              <p className="section-description">Add their details to create a campus ID card.</p>
            </div>
          </div>

          <form onSubmit={registerStudent}>
            <div className="photo-upload">
              {form.photo
                ? <img src={form.photo} alt="Student preview" />
                : <span className="photo-placeholder" aria-hidden="true">👩‍🎓</span>}
              <div className="photo-copy">
                <strong>Make it personal</strong>
                <span>Add a photo to the student card</span>
                <label className="upload-label">
                  Choose a photo
                  <input type="file" accept="image/*" onChange={uploadPhoto} />
                </label>
              </div>
            </div>

            <h3 className="form-section-title"><span>01</span> Personal & academic</h3>
            <div className="form-grid">
              <label>Student name
                <input name="name" value={form.name} onChange={updateField} placeholder="e.g. Alex Morgan" required />
              </label>
              <label>Register number
                <input name="reg" value={form.reg} onChange={updateField} placeholder="e.g. 311824201008" required />
              </label>
              <label>College name
                <input name="college" value={form.college} onChange={updateField} required />
              </label>
              <label>Department
                <input name="department" value={form.department} onChange={updateField} placeholder="e.g. Computer Science" required />
              </label>
              <label>Year
                <select name="year" value={form.year} onChange={updateField}>
                  <option>I Year</option>
                  <option>II Year</option>
                  <option>III Year</option>
                  <option>IV Year</option>
                </select>
              </label>
              <label>Degree
                <input name="degree" value={form.degree} onChange={updateField} placeholder="e.g. B.Tech" required />
              </label>
            </div>

            <h3 className="form-section-title"><span>02</span> Contact details</h3>
            <div className="form-grid">
              <label>Email address
                <input type="email" name="email" value={form.email} onChange={updateField} placeholder="student@college.edu" required />
              </label>
              <label>Phone number
                <input type="tel" name="phone" value={form.phone} onChange={updateField} placeholder="+91 00000 00000" required />
              </label>
              <label className="full-width">Address <span className="optional">(optional)</span>
                <textarea name="address" value={form.address} onChange={updateField} placeholder="Add a mailing address" />
              </label>
            </div>

            <button className="register-btn" type="submit">
              <span>Create student card</span><span aria-hidden="true">↗</span>
            </button>
          </form>
        </section>

        <section className="collection panel">
          <div className="collection-heading">
            <div className="section-heading">
              <span className="heading-icon icon-orange">▤</span>
              <div>
                <p className="eyebrow">THE COMMUNITY</p>
                <h2>Student cards <span className="count-badge">{students.length}</span></h2>
                <p className="section-description">Your growing collection of campus IDs.</p>
              </div>
            </div>
            <label className="search-wrap">
              <span aria-hidden="true">⌕</span>
              <input
                className="search"
                placeholder="Search students..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search by student name or register number"
              />
            </label>
          </div>

          <div className="student-grid">
            {filteredStudents.map((student) => (
              <article className="student-card" key={student.id}>
                <div className="card-top">
                  <div className="card-brand"><span>✦</span> CAMPUS ID <span className="card-brand-side">STUDENT</span></div>
                  <h3>{student.college}</h3>
                  <p>OFFICIAL STUDENT IDENTITY</p>
                </div>
                <div className="card-content">
                  {student.photo
                    ? <img className="card-photo" src={student.photo} alt={`${student.name}'s profile`} />
                    : <div className="card-photo placeholder" aria-hidden="true">🎓</div>}
                  <h2>{student.name}</h2>
                  <p className="card-reg">{student.reg}</p>
                  <div className="card-divider" />
                  <p><b>Department</b><span>{student.department}</span></p>
                  <p><b>Year</b><span>{student.year}</span></p>
                  <p><b>Degree</b><span>{student.degree}</span></p>
                  <button className="delete-btn" type="button" onClick={() => deleteStudent(student.id)}>Remove card</button>
                </div>
              </article>
            ))}
            {filteredStudents.length === 0 && (
              <div className="empty">
                <span aria-hidden="true">{search ? '🔎' : '🌱'}</span>
                <h3>{search ? 'No matches just yet' : 'Your campus story starts here'}</h3>
                <p>{search ? 'Try another name or register number.' : 'Add your first student using the form above.'}</p>
              </div>
            )}
          </div>
        </section>

        <section className="history panel">
          <div className="history-heading">
            <div className="section-heading">
              <span className="heading-icon icon-green">↺</span>
              <div>
                <p className="eyebrow">KEEP A RECORD</p>
                <h2>Registration history <span className="count-badge">{history.length}</span></h2>
                <p className="section-description">A timeline of student registrations and card removals.</p>
              </div>
            </div>
            <button className="export-btn" type="button" onClick={exportWorkbook} disabled={isExporting}>
              <span aria-hidden="true">⇩</span>
              {isExporting ? 'Preparing workbook…' : 'Export Excel'}
            </button>
          </div>

          {exportError && <p className="export-error" role="alert">{exportError}</p>}
          {exportStatus && <p className="export-status" role="status">{exportStatus}</p>}

          {history.length > 0 ? (
            <div className="history-list">
              {history.map((entry) => (
                <article className="history-entry" key={entry.id}>
                  <span className={`history-marker ${entry.action === 'Removed' ? 'removed' : ''}`} aria-hidden="true">
                    {entry.action === 'Removed' ? '−' : '✓'}
                  </span>
                  <div className="history-details">
                    <p>
                      <strong>{entry.student.name}</strong>
                      <span className={`history-action ${entry.action === 'Removed' ? 'removed' : ''}`}>
                        {entry.action}
                      </span>
                    </p>
                    <span className="history-meta">
                      {entry.student.reg} · {entry.student.department} · {entry.student.year}
                    </span>
                    {entry.occurredAt
                      ? <time dateTime={entry.occurredAt}>{new Date(entry.occurredAt).toLocaleString()}</time>
                      : <span className="history-meta">Date not recorded for this older student</span>}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="history-empty">
              <span aria-hidden="true">🗂️</span>
              <p>Registration activity will appear here as students are added or removed.</p>
            </div>
          )}
          <p className="history-note">The Excel workbook includes separate sheets for current registrations and activity history.</p>
        </section>
      </main>

      <footer>
        <span className="footer-mark">✦</span> campusID <span className="footer-divider">·</span> Made for the next generation
      </footer>
    </div>
  );
}

export default App;
