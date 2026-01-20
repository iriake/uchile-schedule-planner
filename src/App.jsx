import { useState } from 'react';
import { buildUCursosIcsUrl, parseIcsSchedule } from './services/api';
import './index.css';

function App() {
    const [facultad, setFacultad] = useState('ingenieria');
    const [ano, setAno] = useState('2026');
    const [semestre, setSemestre] = useState('1');
    const [codigo, setCodigo] = useState('');

    const [courses, setCourses] = useState([]); // Array of active/inactive courses
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Advanced Config State
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showTests, setShowTests] = useState(true);
    const [showRooms, setShowRooms] = useState(true);

    const [foundSections, setFoundSections] = useState([]);
    const [searching, setSearching] = useState(false);

    // 1. Search for available sections
    const handleSearch = async () => {
        if (!codigo) return;
        setSearching(true);
        setFoundSections([]);
        setError(null);

        const upperCode = codigo.toUpperCase();
        const validSections = [];
        // Loop from 1 up to 20 (safe limit)
        for (let i = 1; i <= 20; i++) {
            try {
                const url = buildUCursosIcsUrl(facultad, ano, semestre, upperCode, i.toString());
                const response = await fetch(url, { method: 'HEAD' });
                if (response.ok) {
                    validSections.push(i);
                } else {
                    break;
                }
            } catch (e) {
                break;
            }
        }

        if (validSections.length === 0) {
            setError('No se encontraron secciones (o error de conexión).');
        } else {
            setFoundSections(validSections);
        }
        setSearching(false);
    };

    // 2. Add specific section
    const handleAddSection = async (secNum) => {
        setLoading(true);
        setError(null);
        const upperCode = codigo.toUpperCase();
        const codeWithSec = `${upperCode}-${secNum}`;

        if (courses.some(c => c.id === codeWithSec)) {
            // If exists but inactive, maybe just activate? For now just error.
            setError(`La sección ${secNum} ya está en la lista.`);
            setLoading(false);
            return;
        }

        try {
            const url = buildUCursosIcsUrl(facultad, ano, semestre, upperCode, secNum.toString());
            const response = await fetch(url);
            const icsText = await response.text();
            const parsedEvents = parseIcsSchedule(icsText);

            if (parsedEvents.length === 0) {
                setError(`La sección ${secNum} no tiene horarios.`);
            } else {
                // Extract course name from first event if available, or use placeholder
                let courseName = 'Curso';
                const firstEventWithName = parsedEvents.find(e => e.courseName);
                if (firstEventWithName) {
                    courseName = firstEventWithName.courseName;
                }

                setCourses(prev => [
                    ...prev,
                    {
                        id: codeWithSec,
                        code: `${upperCode}-${secNum}`,
                        name: courseName,
                        events: parsedEvents,
                        color: getRandomColor(),
                        isActive: true
                    }
                ]);
            }
        } catch (err) {
            setError('Error al obtener la sección.');
        } finally {
            setLoading(false);
        }
    };

    const toggleCourseActive = (courseId) => {
        setCourses(prev => prev.map(c =>
            c.id === courseId ? { ...c, isActive: !c.isActive } : c
        ));
    };

    const removeCourse = (courseId) => {
        setCourses(courses.filter(cx => cx.id !== courseId));
    };

    const getRandomColor = () => {
        const colors = ['#e3f2fd', '#f3e5f5', '#e8f5e9', '#fff3e0', '#fce4ec', '#fffde7', '#e1f5fe', '#fafafa'];
        return colors[Math.floor(Math.random() * colors.length)];
    };

    const parseTime = (timeStr) => {
        const [hh, mm] = timeStr.split(':').map(Number);
        return hh * 60 + mm;
    };

    const layoutDayEvents = (events) => {
        const sorted = [...events].sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));
        const clusters = [];

        for (const event of sorted) {
            const start = parseTime(event.startTime);
            const end = parseTime(event.endTime);
            let added = false;
            for (const cluster of clusters) {
                if (start < cluster.end) {
                    cluster.events.push(event);
                    cluster.end = Math.max(cluster.end, end);
                    added = true;
                    break;
                }
            }
            if (!added) clusters.push({ events: [event], start, end });
        }

        const nodes = [];
        for (const cluster of clusters) {
            const columns = [];
            for (const event of cluster.events) {
                const start = parseTime(event.startTime);
                let placed = false;
                for (let i = 0; i < columns.length; i++) {
                    const lastInCol = columns[i][columns[i].length - 1];
                    if (parseTime(lastInCol.endTime) <= start) {
                        columns[i].push(event);
                        event.colIndex = i;
                        placed = true;
                        break;
                    }
                }
                if (!placed) {
                    columns.push([event]);
                    event.colIndex = columns.length - 1;
                }
            }
            const totalCols = columns.length;
            for (const event of cluster.events) {
                const start = parseTime(event.startTime);
                const end = parseTime(event.endTime);
                const startMin = 480; // 08:00
                const scale = 1.0;

                const top = (start - startMin) * scale;
                const height = (end - start) * scale;
                const width = 100 / totalCols;
                const left = event.colIndex * width;

                nodes.push({
                    event,
                    style: {
                        top: `${top}px`,
                        height: `${height}px`,
                        left: `${left}%`,
                        width: `${width}%`
                    }
                });
            }
        }
        return nodes;
    };

    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

    return (
        <div className="app-layout">
            {/* SIDEBAR */}
            <aside className="sidebar">
                <h1>UChile Schedule Planner</h1>

                <div className="sidebar-section">
                    <h2>Buscar Ramos</h2>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Facultad</label>
                            <select value={facultad} onChange={e => setFacultad(e.target.value)}>
                                <option value="ingenieria">Ingeniería</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Año</label>
                            <select value={ano} onChange={e => setAno(e.target.value)}>
                                <option value="2024">2024</option>
                                <option value="2025">2025</option>
                                <option value="2026">2026</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Semestre</label>
                            <select value={semestre} onChange={e => setSemestre(e.target.value)}>
                                <option value="1">Otoño</option>
                                <option value="2">Primavera</option>
                            </select>
                        </div>
                    </div>

                    <div className="search-box">
                        <input
                            type="text"
                            placeholder="Buscar código..."
                            value={codigo}
                            onChange={e => setCodigo(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        />
                        <button onClick={handleSearch} disabled={searching} style={{ padding: '0 1rem' }}>
                            {searching ? '...' : '🔍'}
                        </button>
                    </div>

                    {error && <div className="error-msg" style={{ textAlign: 'left' }}>{error}</div>}

                    {/* Found Sections List */}
                    {foundSections.length > 0 && (
                        <div className="found-sections">
                            <h2 style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Secciones encontradas:</h2>
                            {foundSections.map(num => {
                                const isAdded = courses.some(c => c.code === `${codigo.toUpperCase()}-${num}`);
                                return (
                                    <div key={num} className="found-section-item">
                                        <span>Sec {num}</span>
                                        <button
                                            className="add-btn"
                                            onClick={() => handleAddSection(num)}
                                            disabled={isAdded || loading}
                                        >
                                            {isAdded ? 'Agregado' : 'Agregar'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="sidebar-section">
                    <button className="secondary-btn" onClick={() => setShowAdvanced(!showAdvanced)} style={{ width: '100%' }}>
                        {showAdvanced ? 'Ocultar Opciones' : 'Configuración Avanzada'}
                    </button>
                    {showAdvanced && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                            <label style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem', color: '#aaa' }}>
                                <input type="checkbox" checked={showTests} onChange={e => setShowTests(e.target.checked)} />
                                Controles/Exámenes
                            </label>
                            <label style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem', color: '#aaa' }}>
                                <input type="checkbox" checked={showRooms} onChange={e => setShowRooms(e.target.checked)} />
                                Salas
                            </label>
                        </div>
                    )}
                </div>

                <div className="sidebar-section" style={{ flex: 1 }}>
                    <h2>Mis Ramos</h2>
                    <div className="course-list">
                        {courses.length === 0 && <span style={{ fontSize: '0.8rem', color: '#666', fontStyle: 'italic' }}>No has agregado ramos.</span>}
                        {courses.map(c => (
                            <div
                                key={c.id}
                                className={`course-item ${!c.isActive ? 'inactive' : ''}`}
                                onClick={() => toggleCourseActive(c.id)}
                            >
                                <div className="course-info">
                                    <div className="course-color-dot" style={{ background: c.color }}></div>
                                    <div className="course-details">
                                        <span className="course-code">{c.code}</span>
                                        <span className="course-name">{c.name || 'Cargando...'}</span>
                                    </div>
                                </div>
                                <button className="remove-btn" onClick={(e) => {
                                    e.stopPropagation();
                                    removeCourse(c.id);
                                }}>×</button>
                            </div>
                        ))}
                    </div>
                </div>

            </aside>

            {/* MAIN CONTENT - SCHEDULE */}
            <main className="main-content">
                <div className="header-controls">
                    {/* Placeholder for top bar if needed, or just spacers */}
                </div>

                <div className="week-columns">
                    {/* Time Axis */}
                    <div className="time-axis">
                        <div className="day-header-spacer"></div>
                        <div className="day-content">
                            {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(h => (
                                <div key={h} className="time-marker" style={{ top: `${(h * 60 - 480) * 1.0}px` }}>
                                    {h}:00
                                </div>
                            ))}
                        </div>
                    </div>

                    {days.map(day => {
                        const dayEventsRaw = courses
                            .filter(c => c.isActive)
                            .flatMap(c => c.events
                                .filter(e => e.day === day)
                                .filter(e => showTests || !e.isATest)
                                .map(e => ({ ...e, color: c.color, code: c.code, courseName: c.name }))
                            );

                        const eventNodes = layoutDayEvents(dayEventsRaw);

                        return (
                            <div key={day} className="day-column">
                                <h3>{day}</h3>
                                <div className="day-content">
                                    {/* Grid lines */}
                                    {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(h => (
                                        <div key={h} className="grid-line" style={{ top: `${(h * 60 - 480) * 1.0}px` }}></div>
                                    ))}

                                    {eventNodes.map((node, idx) => (
                                        <div
                                            key={`${node.event.code}-${idx}`}
                                            className="event-card"
                                            style={{
                                                ...node.style,
                                                backgroundColor: node.event.color,
                                            }}
                                            title={`${node.event.code} - ${node.event.type}`}
                                        >
                                            <div style={{ fontWeight: 'bold', fontSize: '0.8rem', lineHeight: '1.1', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                                {node.event.courseName || node.event.code}
                                            </div>
                                            <div style={{ fontSize: '0.7rem', opacity: 0.9 }}>{node.event.code}</div>
                                            <div style={{ fontSize: '0.7rem', fontStyle: 'italic', opacity: 0.8 }}>{node.event.type}</div>
                                            {showRooms && <div style={{ fontSize: '0.65rem', marginTop: '2px' }}>{node.event.room}</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}

export default App;
