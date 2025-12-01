

export const Logo = ({ className = "h-8 w-8" }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        {/* Outer Hexagon/Nut shape representing plumbing hardware */}
        <path d="M50 5 L93.3 25 V75 L50 95 L6.7 75 V25 Z" className="text-primary" strokeWidth="4" />

        {/* Stylized 'S' formed by water flow */}
        <path d="M35 35 C35 25, 65 25, 65 35 C65 50, 35 50, 35 65 C35 75, 65 75, 65 65" className="text-blue-500" />

        {/* Stylized 'V' integrated below */}
        <path d="M40 65 L50 80 L60 65" className="text-blue-600" />

        {/* Water Drop accent */}
        <circle cx="65" cy="35" r="3" fill="currentColor" className="text-cyan-400" stroke="none" />
    </svg>
);
