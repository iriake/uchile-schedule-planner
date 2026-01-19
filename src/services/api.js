export const buildUCursosUrl = (facultad, ano, semestre, codigo, seccion) => {
    return `https://www.u-cursos.cl/${facultad}/${ano}/${semestre}/${codigo}/${seccion}/horario_curso/`;
};

export const buildUCursosIcsUrl = (facultad, ano, semestre, codigo, seccion) => {
    return `https://www.u-cursos.cl/${facultad}/${ano}/${semestre}/${codigo}/${seccion}/horario_curso/icalendar`;
};

export const parseIcsSchedule = (icsContent) => {
    const events = [];
    const lines = icsContent.split(/\r\n|\n|\r/);
    let currentEvent = null;

    for (const line of lines) {
        if (line.startsWith('BEGIN:VEVENT')) {
            currentEvent = {};
        } else if (line.startsWith('END:VEVENT')) {
            if (currentEvent) {
                events.push(currentEvent);
                currentEvent = null;
            }
        } else if (currentEvent) {
            const [key, ...values] = line.split(':');
            const value = values.join(':');

            if (key === 'DTSTART') currentEvent.start = parseIcsDate(value);
            if (key === 'DTEND') currentEvent.end = parseIcsDate(value);
            if (key === 'SUMMARY') currentEvent.summary = value;
            if (key === 'LOCATION') currentEvent.location = value;
            if (key === 'CATEGORIES') currentEvent.categories = value;
            if (key === 'DESCRIPTION') currentEvent.description = value;
        }
    }

    // Format events to match our App's expected structure
    // We want to return specific "weekly blocks".
    // Strategy:
    // 1. We have hundreds of events.
    // 2. We want to identify the unique "Day + Time + Type" patterns.
    // 3. For Exams (one-off), we still want to keep them.
    // 4. We will return a list of unique schedule items.

    // Key -> { item, occurrences: [] }
    const uniqueMap = new Map();

    events.forEach(event => {
        if (!event.start || !event.end) return;

        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const dayName = days[event.start.getDay()];

        const startTime = formatTime(event.start);
        const endTime = formatTime(event.end);

        // Prefer CATEGORIES (e.g. "Cátedra", "Auxiliar", "Examen")
        // If not available, use SUMMARY or default.
        const type = event.categories || event.summary || 'Evento';

        // Key logic: Day-Start-End-Type
        // This groups all Mondays 12:00 Cátedra into one entry.
        // It also groups Exams if they happen on same day/time (unlikely for exams, but if they do).
        const key = `${dayName}-${startTime}-${endTime}-${type}`;

        const room = event.location || '';

        if (!uniqueMap.has(key)) {
            uniqueMap.set(key, {
                day: dayName,
                startTime,
                endTime,
                type,
                room,
                rawTime: `${startTime} - ${endTime}`,
                isATest: type.includes('Examen') || type.includes('Control') || (event.description && (event.description.includes('Examen') || event.description.includes('Control')))
            });
        } else {
            // If the same slot appears again (e.g. next Monday), we check if room changed.
            const existing = uniqueMap.get(key);
            if (room && existing.room && !existing.room.includes(room)) {
                existing.room += `, ${room}`;
            }
        }
    });

    return Array.from(uniqueMap.values());
};

// Helper to parse ICS date string (e.g. 20240311T161500)
const parseIcsDate = (dateStr) => {
    if (!dateStr) return null;
    // Handle TZID if present (e.g., ;TZID=...) - simplistic approach: grab last part
    const cleanStr = dateStr.includes(':') ? dateStr.split(':').pop() : dateStr;

    const year = cleanStr.substring(0, 4);
    const month = cleanStr.substring(4, 6);
    const day = cleanStr.substring(6, 8);
    const hour = cleanStr.substring(9, 11);
    const minute = cleanStr.substring(11, 13);
    const second = cleanStr.substring(13, 15);

    return new Date(year, month - 1, day, hour, minute, second);
};

const formatTime = (date) => {
    return date.toTimeString().substring(0, 5); // "16:15"
};

// Keep old HTML parser for reference or fallback
export const parseScheduleTable = (htmlContent) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const blocks = doc.querySelectorAll('.bloque');
    const schedule = [];

    blocks.forEach((block) => {
        const parentTd = block.closest('td');
        if (!parentTd) return;

        const row = parentTd.parentElement;
        const colIndex = Array.from(row.children).indexOf(parentTd);

        const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const dayName = days[colIndex - 1];

        if (!dayName) return;

        const timeRange = block.querySelector('h2')?.innerText.trim() || '';
        const [startTime, endTime] = timeRange.split(' - ');

        const h1 = block.querySelector('h1');
        const type = h1?.childNodes[0]?.textContent?.trim() || '';
        const room = h1?.querySelector('strong')?.innerText?.trim() || '';

        schedule.push({
            day: dayName,
            startTime,
            endTime,
            type,
            room,
            rawTime: timeRange
        });
    });

    return schedule;
};
