import { useState } from 'react';
import { buildUCursosIcsUrl, parseIcsSchedule } from './services/api';
import './index.css';

function App() {
    const [facultad, setFacultad] = useState('ingenieria');
    const [ano, setAno] = useState('2026'); // Defaulting to 2026 as verified working year
    const [semestre, setSemestre] = useState('1');
    const [codigo, setCodigo] = useState('');

    const [courses, setCourses] = useState([]); // Array of { code, events: [] }
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Advanced Config State
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showTests, setShowTests] = useState(true);
    const [showRooms, setShowRooms] = useState(true);

    const [foundSections, setFoundSections] = useState([]); // Array of section numbers
    const [searching, setSearching] = useState(false);

    // 1. Search for available sections
    const handleSearch = async () => {
        if (!codigo) return;
        setSearching(true);
        setFoundSections([]);
        setError(null);

        const upperCode = codigo.toUpperCase();
        console.log(`Searching sections for ${upperCode}...`);

        const validSections = [];
        // Loop from 1 up to 20 (safe limit)
        for (let i = 1; i <= 20; i++) {
            try {
                // We use our helper checkSectionExists, OR we can just try to fetch here.
                // Since we need to use the imported helper.
                // Assuming checkSectionExists is imported.
                // We'll define a quick helper here if not imported, or update import.
                // Let's rely on api.js import.
                // Actually, I need to make sure I import checkSectionExists at the top first.
                // For now, I'll inline the logic using the duplicate Url builder or update imports later.
                // Wait, I can't update imports in THIS block easily without seeing the top.
                // I'll assume checkSectionExists is imported or I'll implement the loop using buildUCursosIcsUrl.

                const url = buildUCursosIcsUrl(facultad, ano, semestre, upperCode, i.toString());
                const response = await fetch(url, { method: 'HEAD' }); // Try HEAD first

                // If HEAD fails/404, break loop?
                // U-Cursos usually returns 404 for non-existent calendar.
                if (response.ok) {
                    validSections.push(i);
                } else {
                    // If 404, we assume no more sections exist (sequential principle).
                    break;
                }
            } catch (e) {
                // Network error or CORS might throw. 
                // If 1 fails, maybe we should stop? Or try a few more?
                // Prompt said "si no existe la 4, entonces no existen las siguientes".
                // So on error/failure, we break.
                console.warn(`Stopped searching at section ${i} due to error/404`);
                break;
            }
        }

        if (validSections.length === 0) {
            setError('No se encontraron secciones para este curso (o error de conexión).');
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
            setError(`La sección ${secNum} de ${upperCode} ya fue añadida.`);
            setLoading(false);
            return;
        }

        try {
            const url = buildUCursosIcsUrl(facultad, ano, semestre, upperCode, secNum.toString());
            const response = await fetch(url);
            const icsText = await response.text();
            const parsedEvents = parseIcsSchedule(icsText);

            if (parsedEvents.length === 0) {
                setError(`La sección ${secNum} no tiene horarios definidos.`);
            } else {
                setCourses(prev => [
                    ...prev,
                    {
                        id: codeWithSec, // Unique ID for React key
                        code: `${upperCode}-${secNum}`,
                        events: parsedEvents,
                        color: getRandomColor()
                    }
                ]);
                // We keep foundSections visible so user can add another section if they want.
            }
        } catch (err) {
            setError('Error al obtener la sección.');
        } finally {
            setLoading(false);
        }
    };

    // Simple random color generator for course differentiation
    const getRandomColor = () => {
        const colors = ['#e3f2fd', '#f3e5f5', '#e8f5e9', '#fff3e0', '#fce4ec', '#fffde7'];
        return colors[Math.floor(Math.random() * colors.length)];
    };

    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

    return (
        <div className="container">
            <header>
                <h1>UChile Schedule Planner</h1>
            </header>

            <div className="config-panel">
                <label>
                    Facultad:
                    <select value={facultad} onChange={e => setFacultad(e.target.value)}>
                        <option value="ingenieria">Ingeniería</option>
                    </select>
                </label>

                <label>
                    Año:
                    <select value={ano} onChange={e => setAno(e.target.value)}>
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                    </select>
                </label>

                <label>
                    Semestre:
                    <select value={semestre} onChange={e => setSemestre(e.target.value)}>
                        <option value="1">Otoño</option>
                        <option value="2">Primavera</option>
                    </select>
                </label>

                <div className="input-group">
                    <input
                        type="text"
                        placeholder="Código (ej: CC5205)"
                        value={codigo}
                        onChange={e => setCodigo(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    />
                    <button onClick={handleSearch} disabled={searching}>
                        {searching ? 'Buscando...' : 'Buscar'}
                    </button>
                </div>

                {foundSections.length > 0 && (
                    <div className="sections-list" style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <span>Secciones:</span>
                        {foundSections.map(num => (
                            <button
                                key={num}
                                onClick={() => handleAddSection(num)}
                                className="secondary-btn"
                                disabled={loading}
                                style={{ borderColor: '#646cff', color: 'white' }}
                            >
                                {num}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <button
                    className="secondary-btn"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                >
                    {showAdvanced ? 'Ocultar Configuración Avanzada' : 'Configuración Avanzada'}
                </button>

                {showAdvanced && (
                    <div className="advanced-options">
                        <label>
                            <input
                                type="checkbox"
                                checked={showTests}
                                onChange={e => setShowTests(e.target.checked)}
                            />
                            Mostrar Controles/Exámenes
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={showRooms}
                                onChange={e => setShowRooms(e.target.checked)}
                            />
                            Mostrar Salas
                        </label>
                    </div>
                )}
            </div>

            {error && <div className="error-msg">{error}</div>}

            <div className="active-courses">
                {courses.map((c, i) => (
                    <span key={c.id || i} className="course-tag" style={{ backgroundColor: c.color }}>
                        {c.code}
                        <button onClick={() => setCourses(courses.filter(cx => cx.id !== c.id))}>×</button>
                    </span>
                ))}
            </div>

            <div className="week-columns">
                {days.map(day => {
                    // Gather all events for this day, flatten, and sort by time
                    const dayEvents = courses.flatMap(c =>
                        c.events
                            .filter(e => e.day === day)
                            .filter(e => showTests || !e.isATest)
                            .map(e => ({ ...e, color: c.color, code: c.code }))
                    ).sort((a, b) => a.startTime.localeCompare(b.startTime));

                    return (
                        <div key={day} className="day-column">
                            <h3>{day}</h3>
                            <div className="day-events">
                                {dayEvents.map((e, idx) => (
                                    <div key={`${e.code}-${idx}`} className="event-card" style={{ backgroundColor: e.color }}>
                                        <div className="event-time">{e.startTime} - {e.endTime}</div>
                                        <div className="event-code"><strong>{e.code}</strong></div>
                                        <div className="event-type">{e.type}</div>
                                        {showRooms && <div className="event-room">{e.room}</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    )
}

export default App
