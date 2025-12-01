import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, Float, PresentationControls, Text3D } from '@react-three/drei';
import { Suspense, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

function BrandName() {
    const meshRef = useRef<THREE.Mesh>(null);

    useLayoutEffect(() => {
        if (meshRef.current) {
            meshRef.current.geometry.center();
        }
    }, []);

    return (
        <Text3D
            font="https://threejs.org/examples/fonts/helvetiker_regular.typeface.json"
            size={0.7}
            height={0.1}
            curveSegments={12}
            bevelEnabled
            bevelThickness={0.02}
            bevelSize={0.02}
            bevelOffset={0}
            bevelSegments={5}
            ref={meshRef}
        >
            SV Enterprises
            <meshStandardMaterial
                color="#0ea5e9" // Ocean Blue/Cyan
                roughness={0.1}
                metalness={0.9}
            />
        </Text3D>
    );
}

function Particles() {
    return (
        <group>
            {Array.from({ length: 50 }).map((_, i) => (
                <mesh
                    key={i}
                    position={[
                        (Math.random() - 0.5) * 10,
                        (Math.random() - 0.5) * 10,
                        (Math.random() * -10) - 2, // Z position: -2 to -12 (behind text)
                    ]}
                    scale={0.1}
                >
                    <sphereGeometry args={[1, 16, 16]} />
                    <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={2} />
                </mesh>
            ))}
        </group>
    );
}

export default function HeroSection() {
    return (
        <section className="relative w-full h-[600px] bg-gray-50 dark:bg-gray-900 overflow-hidden flex flex-col md:flex-row items-center justify-center">

            {/* Text Content */}
            <div className="z-10 container px-4 md:px-6 flex flex-col items-start gap-6 md:w-1/2">
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-gray-900 dark:text-white font-heading">
                    Premium <span className="text-primary">Sanitary</span> Solutions
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-300 max-w-[500px]">
                    Experience the next generation of sanitary plumbing. Unmatched durability, elegant design, and quality that speaks volumes.
                </p>
                <div className="flex gap-4">
                    <Button size="lg" asChild>
                        <Link to="/products">
                            Shop Now <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                    <Button size="lg" variant="outline" asChild>
                        <Link to="/categories">View Collections</Link>
                    </Button>
                </div>
            </div>

            {/* 3D Scene */}
            <div className="absolute inset-0 md:static md:w-1/2 h-full">
                <Canvas shadows camera={{ position: [0, 0, 8], fov: 45 }}>
                    <ambientLight intensity={0.5} />
                    <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} shadow-mapSize={2048} castShadow />
                    <Environment preset="city" />

                    <Suspense fallback={null}>
                        <PresentationControls
                            global
                            config={{ mass: 2, tension: 500 }}
                            snap={{ mass: 4, tension: 1500 }}
                            rotation={[0, 0, 0]}
                            polar={[-Math.PI / 3, Math.PI / 3]}
                            azimuth={[-Math.PI / 1.4, Math.PI / 2]}
                        >
                            <Float rotationIntensity={0.4} floatIntensity={0.5}>
                                <BrandName />
                            </Float>
                        </PresentationControls>
                        <Particles />
                        <ContactShadows position={[0, -1.4, 0]} opacity={0.5} scale={10} blur={2.5} far={4} />
                    </Suspense>
                </Canvas>
            </div>
        </section>
    );
}

