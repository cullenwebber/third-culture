import * as THREE from 'three'
import BaseScene from '../base-scene.js'
import WebGLManager from '../context-manager'
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js'

class NotFoundScene extends BaseScene {
	constructor(id, container) {
		super(id, container)
		this.cameraDistance = 5
	}

	setupScene() {
		this.time = 0
		this.shapeSize = 1.9
	}

	adjustCamera() {
		this.camera.position.z = this.cameraDistance
		this.camera.lookAt(0, 0, 0)
	}

	createMaterials() {
		// Will be created after GPU compute is initialized
	}

	async createObjects() {
		this.adjustCamera()
		this.initGPUCompute()
		this.createParticleMesh()
		this.createMouseListeners()
	}

	initGPUCompute() {
		const { width, height } = this.getFrustumDimensions(0)
		this.simWidth = width
		this.simHeight = height

		// Particle count - balance between visual density and performance
		this.textureSize = 100
		this.particleCount = this.textureSize * this.textureSize // 10000 particles

		// Get renderer from WebGLManager
		const renderer = WebGLManager.instance.renderer
		if (!renderer) {
			console.error('No renderer available for GPU computation')
			return
		}
		this.renderer = renderer

		this.gpuCompute = new GPUComputationRenderer(
			this.textureSize,
			this.textureSize,
			renderer
		)

		if (!renderer.capabilities.isWebGL2) {
			this.gpuCompute.setDataType(THREE.HalfFloatType)
		}

		// Create initial position texture
		const positionTexture = this.gpuCompute.createTexture()
		const velocityTexture = this.gpuCompute.createTexture()
		this.fillPositionTexture(positionTexture)
		this.fillVelocityTexture(velocityTexture)

		// Position computation shader
		this.positionVariable = this.gpuCompute.addVariable(
			'texturePosition',
			this.getPositionShader(),
			positionTexture
		)

		// Velocity computation shader
		this.velocityVariable = this.gpuCompute.addVariable(
			'textureVelocity',
			this.getVelocityShader(),
			velocityTexture
		)

		// Set dependencies
		this.gpuCompute.setVariableDependencies(this.positionVariable, [
			this.positionVariable,
			this.velocityVariable,
		])
		this.gpuCompute.setVariableDependencies(this.velocityVariable, [
			this.positionVariable,
			this.velocityVariable,
		])

		// Add uniforms to position shader
		const posUniforms = this.positionVariable.material.uniforms
		posUniforms.uDelta = { value: 0.016 }
		posUniforms.uBounds = {
			value: new THREE.Vector4(-width / 2, -height / 2, width / 2, height / 2),
		}
		posUniforms.uSquareMin = { value: new THREE.Vector2() }
		posUniforms.uSquareMax = { value: new THREE.Vector2() }
		posUniforms.uTriangleA = { value: new THREE.Vector2() }
		posUniforms.uTriangleB = { value: new THREE.Vector2() }
		posUniforms.uTriangleC = { value: new THREE.Vector2() }
		posUniforms.uMouse = { value: new THREE.Vector3(9999, 9999, 0) }
		posUniforms.uParticleRadius = { value: 0.025 }

		const velUniforms = this.velocityVariable.material.uniforms
		velUniforms.uDelta = { value: 0.016 }
		velUniforms.uTime = { value: 0 }
		velUniforms.uGravity = { value: new THREE.Vector2(0, -9.81) }
		velUniforms.uBounds = {
			value: new THREE.Vector4(-width / 2, -height / 2, width / 2, height / 2),
		}
		velUniforms.uSquareMin = { value: new THREE.Vector2() }
		velUniforms.uSquareMax = { value: new THREE.Vector2() }
		velUniforms.uTriangleA = { value: new THREE.Vector2() }
		velUniforms.uTriangleB = { value: new THREE.Vector2() }
		velUniforms.uTriangleC = { value: new THREE.Vector2() }
		velUniforms.uMouse = { value: new THREE.Vector3(9999, 9999, 0) }
		velUniforms.uPrevMouse = { value: new THREE.Vector3(9999, 9999, 0) }
		velUniforms.uParticleRadius = { value: 0.01 }
		velUniforms.uRepulsionRadius = { value: 3.12 }
		velUniforms.uRepulsionStrength = { value: 30.0 }

		// Set shape uniforms
		this.updateShapeUniforms()

		const error = this.gpuCompute.init()
		if (error !== null) {
			console.error('GPUComputationRenderer error:', error)
		}
	}

	updateShapeUniforms() {
		const posUniforms = this.positionVariable.material.uniforms
		const velUniforms = this.velocityVariable.material.uniforms

		// Square vertices
		const gap = 0.3
		const size = this.shapeSize
		const sqOffsetX = -size - gap / 2
		const sqOffsetY = -size / 2

		posUniforms.uSquareMin.value.set(sqOffsetX, sqOffsetY)
		posUniforms.uSquareMax.value.set(sqOffsetX + size, sqOffsetY + size)
		velUniforms.uSquareMin.value.set(sqOffsetX, sqOffsetY)
		velUniforms.uSquareMax.value.set(sqOffsetX + size, sqOffsetY + size)

		// Triangle vertices
		const triOffsetX = gap / 2
		const triOffsetY = -size / 2

		posUniforms.uTriangleA.value.set(triOffsetX, triOffsetY + size)
		posUniforms.uTriangleB.value.set(triOffsetX, triOffsetY)
		posUniforms.uTriangleC.value.set(triOffsetX + size, triOffsetY)
		velUniforms.uTriangleA.value.set(triOffsetX, triOffsetY + size)
		velUniforms.uTriangleB.value.set(triOffsetX, triOffsetY)
		velUniforms.uTriangleC.value.set(triOffsetX + size, triOffsetY)
	}

	fillPositionTexture(texture) {
		const data = texture.image.data
		const { width, height } = this.getFrustumDimensions(0)
		const gap = 0.3
		const size = this.shapeSize

		// Shape bounds for rejection sampling
		const sqMinX = -size - gap / 2
		const sqMaxX = sqMinX + size
		const sqMinY = -size / 2
		const sqMaxY = sqMinY + size

		const triAx = gap / 2,
			triAy = sqMaxY
		const triBx = gap / 2,
			triBy = sqMinY
		const triCx = gap / 2 + size,
			triCy = sqMinY

		const isInsideSquare = (x, y) =>
			x >= sqMinX && x <= sqMaxX && y >= sqMinY && y <= sqMaxY

		const isInsideTriangle = (px, py) => {
			const sign = (p1x, p1y, p2x, p2y, p3x, p3y) =>
				(p1x - p3x) * (p2y - p3y) - (p2x - p3x) * (p1y - p3y)
			const d1 = sign(px, py, triAx, triAy, triBx, triBy)
			const d2 = sign(px, py, triBx, triBy, triCx, triCy)
			const d3 = sign(px, py, triCx, triCy, triAx, triAy)
			const hasNeg = d1 < 0 || d2 < 0 || d3 < 0
			const hasPos = d1 > 0 || d2 > 0 || d3 > 0
			return !(hasNeg && hasPos)
		}

		const margin = 0.1
		const minX = -width / 2 + margin
		const maxX = width / 2 - margin
		const minY = -height / 2 + margin
		const maxY = height / 2 - margin

		for (let i = 0; i < data.length; i += 4) {
			let x, y
			let attempts = 0
			do {
				x = minX + Math.random() * (maxX - minX)
				y = minY + Math.random() * (maxY - minY)
				attempts++
			} while (
				(isInsideSquare(x, y) || isInsideTriangle(x, y)) &&
				attempts < 50
			)

			data[i] = x
			data[i + 1] = y
			data[i + 2] = 0
			data[i + 3] = 1
		}
	}

	fillVelocityTexture(texture) {
		const data = texture.image.data
		for (let i = 0; i < data.length; i += 4) {
			data[i] = (Math.random() - 0.5) * 0.5
			data[i + 1] = (Math.random() - 0.5) * 0.5
			data[i + 2] = 0
			data[i + 3] = 1
		}
	}

	getPositionShader() {
		return `
			uniform float uDelta;
			uniform vec4 uBounds;
			uniform vec2 uSquareMin;
			uniform vec2 uSquareMax;
			uniform vec2 uTriangleA;
			uniform vec2 uTriangleB;
			uniform vec2 uTriangleC;
			uniform vec3 uMouse;
			uniform float uParticleRadius;

			float sign2D(vec2 p1, vec2 p2, vec2 p3) {
				return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
			}

			bool isInsideTriangle(vec2 pt) {
				float d1 = sign2D(pt, uTriangleA, uTriangleB);
				float d2 = sign2D(pt, uTriangleB, uTriangleC);
				float d3 = sign2D(pt, uTriangleC, uTriangleA);
				bool hasNeg = (d1 < 0.0) || (d2 < 0.0) || (d3 < 0.0);
				bool hasPos = (d1 > 0.0) || (d2 > 0.0) || (d3 > 0.0);
				return !(hasNeg && hasPos);
			}

			bool isInsideSquare(vec2 pt) {
				return pt.x >= uSquareMin.x && pt.x <= uSquareMax.x &&
					   pt.y >= uSquareMin.y && pt.y <= uSquareMax.y;
			}

			vec2 closestPointOnSegment(vec2 p, vec2 a, vec2 b) {
				vec2 ab = b - a;
				float len2 = dot(ab, ab);
				if (len2 < 0.0001) return a;
				float t = clamp(dot(p - a, ab) / len2, 0.0, 1.0);
				return a + t * ab;
			}

			vec2 closestPointOnSquare(vec2 p) {
				vec2 c0 = uSquareMin;
				vec2 c1 = vec2(uSquareMax.x, uSquareMin.y);
				vec2 c2 = uSquareMax;
				vec2 c3 = vec2(uSquareMin.x, uSquareMax.y);

				vec2 cp0 = closestPointOnSegment(p, c0, c1);
				vec2 cp1 = closestPointOnSegment(p, c1, c2);
				vec2 cp2 = closestPointOnSegment(p, c2, c3);
				vec2 cp3 = closestPointOnSegment(p, c3, c0);

				float d0 = length(p - cp0);
				float d1 = length(p - cp1);
				float d2 = length(p - cp2);
				float d3 = length(p - cp3);

				float minD = min(min(d0, d1), min(d2, d3));
				if (minD == d0) return cp0;
				if (minD == d1) return cp1;
				if (minD == d2) return cp2;
				return cp3;
			}

			vec2 closestPointOnTriangle(vec2 p) {
				vec2 cp1 = closestPointOnSegment(p, uTriangleA, uTriangleB);
				vec2 cp2 = closestPointOnSegment(p, uTriangleB, uTriangleC);
				vec2 cp3 = closestPointOnSegment(p, uTriangleC, uTriangleA);

				float d1 = length(p - cp1);
				float d2 = length(p - cp2);
				float d3 = length(p - cp3);

				if (d1 < d2 && d1 < d3) return cp1;
				if (d2 < d3) return cp2;
				return cp3;
			}

			void main() {
				vec2 uv = gl_FragCoord.xy / resolution.xy;
				vec4 pos = texture2D(texturePosition, uv);
				vec4 vel = texture2D(textureVelocity, uv);

				// Update position with velocity
				vec2 newPos = pos.xy + vel.xy * uDelta;
				float margin = uParticleRadius + 0.02;

				// Boundary collisions - clamp to bounds
				newPos.x = clamp(newPos.x, uBounds.x + margin, uBounds.z - margin);
				newPos.y = clamp(newPos.y, uBounds.y + margin, uBounds.w - margin);

				// Shape collisions - push out of shapes
				if (isInsideSquare(newPos)) {
					vec2 closest = closestPointOnSquare(newPos);
					vec2 center = (uSquareMin + uSquareMax) * 0.5;
					vec2 dir = newPos - center;
					float len = length(dir);
					if (len > 0.001) {
						dir = dir / len;
					} else {
						dir = vec2(1.0, 0.0);
					}
					newPos = closest + dir * margin;
				}

				if (isInsideTriangle(newPos)) {
					vec2 closest = closestPointOnTriangle(newPos);
					vec2 center = (uTriangleA + uTriangleB + uTriangleC) / 3.0;
					vec2 dir = newPos - center;
					float len = length(dir);
					if (len > 0.001) {
						dir = dir / len;
					} else {
						dir = vec2(1.0, 0.0);
					}
					newPos = closest + dir * margin;
				}

				// Mouse collision
				if (uMouse.x < 1000.0) {
					float mouseRadius = 0.5;
					vec2 diff = newPos - uMouse.xy;
					float dist = length(diff);
					if (dist < mouseRadius && dist > 0.001) {
						newPos = uMouse.xy + (diff / dist) * mouseRadius;
					}
				}

				gl_FragColor = vec4(newPos, 0.0, 1.0);
			}
		`
	}

	getVelocityShader() {
		return `
			uniform float uDelta;
			uniform float uTime;
			uniform vec4 uBounds;
			uniform vec2 uSquareMin;
			uniform vec2 uSquareMax;
			uniform vec2 uTriangleA;
			uniform vec2 uTriangleB;
			uniform vec2 uTriangleC;
			uniform vec3 uMouse;
			uniform vec3 uPrevMouse;
			uniform float uParticleRadius;
			uniform float uPressureStrength;
			uniform float uRestDensity;

			float sign2D(vec2 p1, vec2 p2, vec2 p3) {
				return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
			}

			bool isInsideTriangle(vec2 pt) {
				float d1 = sign2D(pt, uTriangleA, uTriangleB);
				float d2 = sign2D(pt, uTriangleB, uTriangleC);
				float d3 = sign2D(pt, uTriangleC, uTriangleA);
				bool hasNeg = (d1 < 0.0) || (d2 < 0.0) || (d3 < 0.0);
				bool hasPos = (d1 > 0.0) || (d2 > 0.0) || (d3 > 0.0);
				return !(hasNeg && hasPos);
			}

			bool isInsideSquare(vec2 pt) {
				return pt.x >= uSquareMin.x && pt.x <= uSquareMax.x &&
					   pt.y >= uSquareMin.y && pt.y <= uSquareMax.y;
			}

			void main() {
				vec2 uv = gl_FragCoord.xy / resolution.xy;
				vec4 pos = texture2D(texturePosition, uv);
				vec4 vel = texture2D(textureVelocity, uv);
				vec4 densityData = texture2D(textureDensity, uv);

				vec2 p = pos.xy;
				vec2 v = vel.xy;

				// Get pressure force from density shader
				float density = densityData.x;
				vec2 pressureForce = densityData.yz;

				// Apply pressure force (pushes particles apart)
				float pressure = max(density - uRestDensity, 0.0) * uPressureStrength;
				v += pressureForce * pressure * uDelta;

				// Oscillating gravity for sloshing effect
				float t = uTime;
				float gravityAngle = sin(t * 0.7) * 0.7 + sin(t * 1.3) * 0.35 + sin(t * 2.1) * 0.15;
				vec2 gravity = vec2(
					cos(-1.5708 + gravityAngle) * 9.81,
					sin(-1.5708 + gravityAngle) * 9.81
				);

				v += gravity * uDelta;

				// Damping
				v *= 0.985;

				// Predict next position for collision response
				vec2 nextPos = p + v * uDelta;
				float margin = uParticleRadius + 0.02;
				float bounce = 0.3;

				// Boundary velocity response
				if (nextPos.x < uBounds.x + margin) {
					v.x = abs(v.x) * bounce;
				} else if (nextPos.x > uBounds.z - margin) {
					v.x = -abs(v.x) * bounce;
				}
				if (nextPos.y < uBounds.y + margin) {
					v.y = abs(v.y) * bounce;
				} else if (nextPos.y > uBounds.w - margin) {
					v.y = -abs(v.y) * bounce;
				}

				// Shape collision velocity response
				if (isInsideSquare(nextPos)) {
					vec2 center = (uSquareMin + uSquareMax) * 0.5;
					vec2 pushDir = normalize(p - center);
					float velIntoShape = -dot(v, pushDir);
					if (velIntoShape > 0.0) {
						v += pushDir * velIntoShape * (1.0 + bounce);
					}
					v += pushDir * 2.0;
				}

				if (isInsideTriangle(nextPos)) {
					vec2 center = (uTriangleA + uTriangleB + uTriangleC) / 3.0;
					vec2 pushDir = normalize(p - center);
					float velIntoShape = -dot(v, pushDir);
					if (velIntoShape > 0.0) {
						v += pushDir * velIntoShape * (1.0 + bounce);
					}
					v += pushDir * 2.0;
				}

				// Mouse interaction
				if (uMouse.x < 1000.0) {
					float mouseRadius = 0.6;
					vec2 toMouse = p - uMouse.xy;
					float dist = length(toMouse);
					if (dist < mouseRadius && dist > 0.001) {
						vec2 pushDir = toMouse / dist;
						vec2 mouseVel = (uMouse.xy - uPrevMouse.xy) / max(uDelta, 0.001);
						v += mouseVel * 0.5;
						v += pushDir * (mouseRadius - dist) * 12.0;
					}
				}

				// Clamp velocity
				float maxSpeed = 10.0;
				float speed = length(v);
				if (speed > maxSpeed) {
					v = v / speed * maxSpeed;
				}

				gl_FragColor = vec4(v, 0.0, 1.0);
			}
		`
	}

	createParticleMesh() {
		// Create geometry with UV references to position texture
		const geometry = new THREE.BufferGeometry()
		const references = new Float32Array(this.particleCount * 2)

		for (let i = 0; i < this.particleCount; i++) {
			const x = (i % this.textureSize) / this.textureSize
			const y = Math.floor(i / this.textureSize) / this.textureSize
			references[i * 2] = x
			references[i * 2 + 1] = y
		}

		geometry.setAttribute('reference', new THREE.BufferAttribute(references, 2))
		geometry.setAttribute(
			'position',
			new THREE.BufferAttribute(new Float32Array(this.particleCount * 3), 3)
		)

		// Particle material that samples position texture
		this.particleMaterial = new THREE.ShaderMaterial({
			uniforms: {
				uPositionTexture: { value: null },
				uColor: { value: new THREE.Color('#ffffff') },
				uSize: { value: 0.05 },
			},
			vertexShader: `
				uniform sampler2D uPositionTexture;
				uniform float uSize;
				attribute vec2 reference;

				void main() {
					vec4 posData = texture2D(uPositionTexture, reference);
					vec3 pos = vec3(posData.xy, 0.0);

					vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
					gl_Position = projectionMatrix * mvPosition;
					gl_PointSize = uSize * (300.0 / -mvPosition.z);
				}
			`,
			fragmentShader: `
				uniform vec3 uColor;

				void main() {
					vec2 center = gl_PointCoord - 0.5;
					float dist = length(center);
					if (dist > 0.5) discard;

					// Soft edge
					float alpha = 1.0 - smoothstep(0.45, 0.5, dist);
					gl_FragColor = vec4(uColor, alpha);
				}
			`,
			transparent: true,
			depthWrite: false,
			blending: THREE.NormalBlending,
		})

		this.particles = new THREE.Points(geometry, this.particleMaterial)
		this.scene.add(this.particles)
	}

	createLights() {
		this.scene.add(new THREE.AmbientLight(0xffffff, 1.0))
	}

	createScrollTriggers() {}

	createMouseListeners() {
		this.mouse = new THREE.Vector2(9999, 9999)
		this.mouse3d = new THREE.Vector3(9999, 9999, 0)
		this.prevMouse3d = new THREE.Vector3(9999, 9999, 0)

		this.onMouseMove = (event) => {
			const rect = this.container.getBoundingClientRect()
			if (
				event.clientX >= rect.left &&
				event.clientX <= rect.right &&
				event.clientY >= rect.top &&
				event.clientY <= rect.bottom
			) {
				this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
				this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

				this.prevMouse3d.copy(this.mouse3d)

				const vector = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5)
				vector.unproject(this.camera)
				const dir = vector.sub(this.camera.position).normalize()
				const dist = -this.camera.position.z / dir.z
				this.mouse3d.copy(this.camera.position).add(dir.multiplyScalar(dist))
			} else {
				this.mouse.x = 9999
				this.mouse3d.set(9999, 9999, 0)
			}
		}
		window.addEventListener('mousemove', this.onMouseMove)
	}

	animate(deltaTime) {
		if (!this.isInitialized || !this.gpuCompute || !this.particles) return

		this.time += deltaTime
		const dt = Math.min(deltaTime, 0.12)

		// Update velocity shader uniforms
		const velUniforms = this.velocityVariable.material.uniforms
		velUniforms.uDelta.value = dt
		velUniforms.uTime.value = this.time
		velUniforms.uMouse.value.set(this.mouse3d.x, this.mouse3d.y, 0)
		velUniforms.uPrevMouse.value.set(this.prevMouse3d.x, this.prevMouse3d.y, 0)

		// Update position shader uniforms
		const posUniforms = this.positionVariable.material.uniforms
		posUniforms.uDelta.value = dt
		posUniforms.uMouse.value.set(this.mouse3d.x, this.mouse3d.y, 0)

		// Run GPU computation
		this.gpuCompute.compute()

		// Update particle material with current position texture (no GPU->CPU readback!)
		this.particleMaterial.uniforms.uPositionTexture.value =
			this.gpuCompute.getCurrentRenderTarget(this.positionVariable).texture
	}

	getFrustumDimensions(zDifference = 0) {
		const distance = this.camera.position.z - zDifference
		const fov = this.camera.fov * (Math.PI / 180)
		const aspect = this.camera.aspect
		const height = 2 * Math.tan(fov / 2) * distance
		const width = height * aspect
		return { width, height }
	}

	onResize(width, height) {
		super.onResize(width, height)
		this.adjustCamera()

		// Update bounds uniform on position and velocity shaders
		if (this.velocityVariable && this.positionVariable) {
			const { width: w, height: h } = this.getFrustumDimensions(0)
			const bounds = new THREE.Vector4(-w / 2, -h / 2, w / 2, h / 2)
			this.velocityVariable.material.uniforms.uBounds.value.copy(bounds)
			this.positionVariable.material.uniforms.uBounds.value.copy(bounds)
		}
	}

	dispose() {
		if (this.onMouseMove) {
			window.removeEventListener('mousemove', this.onMouseMove)
		}
		if (this.particleMaterial) this.particleMaterial.dispose()
		if (this.particles) this.particles.geometry.dispose()
		if (this.gpuCompute) {
			this.gpuCompute.dispose()
		}
		super.dispose()
	}
}

export default NotFoundScene
