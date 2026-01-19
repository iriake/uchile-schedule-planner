import { useState } from 'react'

function App() {
    const [count, setCount] = useState(0)

    return (
        <>
            <div style={{ textAlign: 'center', marginTop: '20vh' }}>
                <h1>UChile Schedule Planner</h1>
                <div className="card">
                    <button onClick={() => setCount((count) => count + 1)}>
                        count is {count}
                    </button>
                    <p>
                        App is running!
                    </p>
                </div>
            </div>
        </>
    )
}

export default App
