"use client"

import { forwardRef } from "react"
import type { Group } from "three"
import * as THREE from "three"
import { useTexture } from "@react-three/drei"
import { GAME_CONFIG } from "./config"

interface TerrainSegment {
  id: number
  z: number
}

interface TunnelLight {
  id: number
  z: number
}

interface WallImage {
  id: number
  z: number
}

interface TerrainProps {
  terrainSegments: TerrainSegment[]
  tunnelLights: TunnelLight[]
  wallImages: WallImage[]
}

const Terrain = forwardRef<Group, TerrainProps>(({ terrainSegments, tunnelLights, wallImages }, ref) => {
  // Cargar la textura del piso una vez
  const floorTexture = useTexture("/textures/terrain/textura_piso.png")
  floorTexture.wrapS = THREE.RepeatWrapping
  floorTexture.wrapT = THREE.RepeatWrapping
  floorTexture.repeat.set(8, 4) // Más repeticiones para tiles más pequeños

  // Cargar la textura de la pared una vez
  const wallTexture = useTexture("/textures/terrain/textura_pared.png")
  wallTexture.wrapS = THREE.ClampToEdgeWrapping
  wallTexture.wrapT = THREE.ClampToEdgeWrapping
  wallTexture.repeat.set(1, 1)

  // Cargar la textura del techo una vez
  const roofTexture = useTexture("/textures/terrain/textura_techo.png")
  roofTexture.wrapS = THREE.RepeatWrapping
  roofTexture.wrapT = THREE.RepeatWrapping
  roofTexture.repeat.set(8, 4) // Igual que el piso para consistencia // Ajuste para paredes verticales

  return (
    <group ref={ref}>
      {/* Floor segments */}
      {terrainSegments.map((segment) => (
        <mesh key={segment.id} position={[0, -1, segment.z]} receiveShadow>
          <boxGeometry args={[20, 0.2, GAME_CONFIG.terrain.segmentSize]} />
          <meshStandardMaterial
            map={floorTexture}
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>
      ))}

      {/* Walls */}
      {terrainSegments.map((segment) => (
        <group key={`walls-${segment.id}`}>
          <mesh position={[-10, 4, segment.z]} receiveShadow>
            <boxGeometry args={[0.5, 10, GAME_CONFIG.terrain.segmentSize]} />
            <meshStandardMaterial
              map={wallTexture}
              roughness={0.7}
              metalness={0.0}
            />
          </mesh>
          <mesh position={[10, 4, segment.z]} receiveShadow>
            <boxGeometry args={[0.5, 10, GAME_CONFIG.terrain.segmentSize]} />
            <meshStandardMaterial
              map={wallTexture}
              roughness={0.7}
              metalness={0.0}
            />
          </mesh>
        </group>
      ))}

      {/* Wall features (windows and doors) */}
      {terrainSegments.map((segment) => {
        const seed = Math.abs(segment.z * 0.1) % 1
        const leftFeature = seed < 0.3 ? "window" : seed < 0.5 ? "door" : "none"
        const rightFeature = (seed + 0.5) % 1 < 0.3 ? "window" : (seed + 0.5) % 1 < 0.5 ? "door" : "none"

        return (
          <group key={`wall-features-${segment.id}`}>
            {leftFeature === "window" && (
              <mesh position={[-9.8, 5, segment.z]}>
                <boxGeometry args={[0.5, 2, 1.5]} />
                <meshStandardMaterial color="#87CEEB" roughness={0.1} metalness={0.8} />
              </mesh>
            )}
            {leftFeature === "door" && (
              <mesh position={[-9.8, 2, segment.z]}>
                <boxGeometry args={[0.5, 4, 1.2]} />
                <meshStandardMaterial color="#8B4513" roughness={0.8} metalness={0.1} />
              </mesh>
            )}

            {rightFeature === "window" && (
              <mesh position={[9.8, 5, segment.z]}>
                <boxGeometry args={[0.5, 2, 1.5]} />
                <meshStandardMaterial color="#87CEEB" roughness={0.1} metalness={0.8} />
              </mesh>
            )}
            {rightFeature === "door" && (
              <mesh position={[9.8, 2, segment.z]}>
                <boxGeometry args={[0.5, 4, 1.2]} />
                <meshStandardMaterial color="#8B4513" roughness={0.8} metalness={0.1} />
              </mesh>
            )}
          </group>
        )
      })}



      {/* Roof */}
      {terrainSegments.map((segment) => (
        <mesh key={`roof-${segment.id}`} position={[0, 9, segment.z]}>
          <boxGeometry args={[20, 0.5, GAME_CONFIG.terrain.segmentSize]} />
          <meshStandardMaterial
            map={roofTexture}
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>
      ))}

      {/* Tunnel lights (geometric cubes only, no point lights) */}
      {tunnelLights.map((light) => (
        <group key={`light-${light.id}`}>
          <mesh position={[-5, 8.5, light.z]}>
            <cylinderGeometry args={[0.3, 0.3, 0.2, 8]} />
            <meshStandardMaterial color="#ffff88" emissive="#ffff44" emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[5, 8.5, light.z]}>
            <cylinderGeometry args={[0.3, 0.3, 0.2, 8]} />
            <meshStandardMaterial color="#ffff88" emissive="#ffff44" emissiveIntensity={0.3} />
          </mesh>
        </group>
      ))}

      {/* Wall images */}
      {wallImages.map((image) => (
        <mesh key={`wall-image-${image.id}`} position={[-9.5, 4, image.z]}>
          <planeGeometry args={[2, 2]} />
          <meshStandardMaterial>
            <primitive
              object={(() => {
                const loader = new THREE.TextureLoader()
                const texture = loader.load("/assets/cet.png")
                texture.flipY = false
                return texture
              })()}
              attach="map"
            />
          </meshStandardMaterial>
        </mesh>
      ))}


    </group>
  )
})

Terrain.displayName = "Terrain"

export default Terrain
