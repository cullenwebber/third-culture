import * as THREE from 'three'
import BaseScene from '../base-scene.js'

// FLIP Fluid Simulation based on Matthias Müller's implementation
class FlipFluid {
	constructor(density, width, height, spacing, particleRadius, maxParticles) {
		this.density = density
		this.fNumX = Math.floor(width / spacing) + 1
		this.fNumY = Math.floor(height / spacing) + 1
		this.h = Math.max(width / this.fNumX, height / this.fNumY)
		this.fInvSpacing = 1.0 / this.h
		this.fNumCells = this.fNumX * this.fNumY

		// Velocity fields (staggered grid)
		this.u = new Float32Array(this.fNumCells)
		this.v = new Float32Array(this.fNumCells)
		this.du = new Float32Array(this.fNumCells)
		this.dv = new Float32Array(this.fNumCells)
		this.prevU = new Float32Array(this.fNumCells)
		this.prevV = new Float32Array(this.fNumCells)
		this.p = new Float32Array(this.fNumCells)
		this.s = new Float32Array(this.fNumCells) // 0 = solid, 1 = fluid
		this.cellType = new Int32Array(this.fNumCells) // 0 = air, 1 = fluid, 2 = solid
		this.particleDensity = new Float32Array(this.fNumCells)

		// Particle data
		this.maxParticles = maxParticles
		this.particlePos = new Float32Array(maxParticles * 2)
		this.particleVel = new Float32Array(maxParticles * 2)
		this.particleColor = new Float32Array(maxParticles * 3)
		this.numParticles = 0

		this.particleRadius = particleRadius
		this.pInvSpacing = 1.0 / (2.2 * particleRadius)
		this.pNumX = Math.floor(width * this.pInvSpacing) + 1
		this.pNumY = Math.floor(height * this.pInvSpacing) + 1
		this.pNumCells = this.pNumX * this.pNumY

		this.numCellParticles = new Int32Array(this.pNumCells)
		this.firstCellParticle = new Int32Array(this.pNumCells + 1)
		this.cellParticleIds = new Int32Array(maxParticles)

		this.particleRestDensity = 0

		// Obstacles (square and triangle)
		this.obstacles = []
	}

	addObstacle(type, params) {
		this.obstacles.push({ type, ...params })
	}

	// Set text mask from canvas for obstacle detection
	setTextMask(maskData, maskWidth, maskHeight, simWidth, simHeight) {
		this.textMask = maskData
		this.textMaskWidth = maskWidth
		this.textMaskHeight = maskHeight
		this.textMaskSimWidth = simWidth
		this.textMaskSimHeight = simHeight
	}

	isInsideObstacle(x, y) {
		// Check text mask first
		if (this.textMask) {
			// Convert simulation coords to mask coords
			const maskX = Math.floor((x / this.textMaskSimWidth) * this.textMaskWidth)
			const maskY = Math.floor(
				((this.textMaskSimHeight - y) / this.textMaskSimHeight) *
					this.textMaskHeight
			)

			if (
				maskX >= 0 &&
				maskX < this.textMaskWidth &&
				maskY >= 0 &&
				maskY < this.textMaskHeight
			) {
				const idx = (maskY * this.textMaskWidth + maskX) * 4 + 3 // Alpha channel
				if (this.textMask[idx] > 128) return true
			}
		}

		// Check rectangle obstacles
		for (const obs of this.obstacles) {
			if (obs.type === 'square') {
				if (x >= obs.minX && x <= obs.maxX && y >= obs.minY && y <= obs.maxY) {
					return true
				}
			}
		}
		return false
	}

	setupGrid(domainWidth, domainHeight) {
		const n = this.fNumY
		// Mark boundary cells as solid
		for (let i = 0; i < this.fNumX; i++) {
			for (let j = 0; j < this.fNumY; j++) {
				let s = 1.0 // fluid
				if (i === 0 || i === this.fNumX - 1 || j === 0 || j === this.fNumY - 1)
					s = 0.0 // solid boundary

				// Check obstacles
				const x = (i + 0.5) * this.h
				const y = (j + 0.5) * this.h
				if (this.isInsideObstacle(x, y)) s = 0.0

				this.s[i * n + j] = s
			}
		}
	}

	integrateParticles(dt, gravity) {
		for (let i = 0; i < this.numParticles; i++) {
			this.particleVel[2 * i + 1] += dt * gravity
			this.particlePos[2 * i] += this.particleVel[2 * i] * dt
			this.particlePos[2 * i + 1] += this.particleVel[2 * i + 1] * dt
		}
	}

	pushParticlesApart(numIters) {
		const colorDiffusionCoeff = 0.001

		// Count particles per cell
		this.numCellParticles.fill(0)

		for (let i = 0; i < this.numParticles; i++) {
			const x = this.particlePos[2 * i]
			const y = this.particlePos[2 * i + 1]

			const xi = Math.floor(x * this.pInvSpacing)
			const yi = Math.floor(y * this.pInvSpacing)
			const cellNr =
				Math.max(0, Math.min(xi, this.pNumX - 1)) * this.pNumY +
				Math.max(0, Math.min(yi, this.pNumY - 1))
			this.numCellParticles[cellNr]++
		}

		// Compute prefix sum
		let first = 0
		for (let i = 0; i < this.pNumCells; i++) {
			first += this.numCellParticles[i]
			this.firstCellParticle[i] = first
		}
		this.firstCellParticle[this.pNumCells] = first

		// Fill particle ids
		for (let i = 0; i < this.numParticles; i++) {
			const x = this.particlePos[2 * i]
			const y = this.particlePos[2 * i + 1]

			const xi = Math.floor(x * this.pInvSpacing)
			const yi = Math.floor(y * this.pInvSpacing)
			const cellNr =
				Math.max(0, Math.min(xi, this.pNumX - 1)) * this.pNumY +
				Math.max(0, Math.min(yi, this.pNumY - 1))
			this.firstCellParticle[cellNr]--
			this.cellParticleIds[this.firstCellParticle[cellNr]] = i
		}

		// Push particles apart
		const minDist = 2.0 * this.particleRadius
		const minDist2 = minDist * minDist

		for (let iter = 0; iter < numIters; iter++) {
			for (let i = 0; i < this.numParticles; i++) {
				const px = this.particlePos[2 * i]
				const py = this.particlePos[2 * i + 1]

				const pxi = Math.floor(px * this.pInvSpacing)
				const pyi = Math.floor(py * this.pInvSpacing)
				const x0 = Math.max(pxi - 1, 0)
				const y0 = Math.max(pyi - 1, 0)
				const x1 = Math.min(pxi + 1, this.pNumX - 1)
				const y1 = Math.min(pyi + 1, this.pNumY - 1)

				for (let xi = x0; xi <= x1; xi++) {
					for (let yi = y0; yi <= y1; yi++) {
						const cellNr = xi * this.pNumY + yi
						const first = this.firstCellParticle[cellNr]
						const last = this.firstCellParticle[cellNr + 1]

						for (let j = first; j < last; j++) {
							const id = this.cellParticleIds[j]
							if (id === i) continue

							const qx = this.particlePos[2 * id]
							const qy = this.particlePos[2 * id + 1]

							const dx = qx - px
							const dy = qy - py
							const d2 = dx * dx + dy * dy

							if (d2 > minDist2 || d2 === 0) continue

							const d = Math.sqrt(d2)
							const s = (0.5 * (minDist - d)) / d
							const moveX = dx * s
							const moveY = dy * s

							this.particlePos[2 * i] -= moveX
							this.particlePos[2 * i + 1] -= moveY
							this.particlePos[2 * id] += moveX
							this.particlePos[2 * id + 1] += moveY

							// Color diffusion
							for (let k = 0; k < 3; k++) {
								const color0 = this.particleColor[3 * i + k]
								const color1 = this.particleColor[3 * id + k]
								const avgColor = (color0 + color1) * 0.5
								this.particleColor[3 * i + k] +=
									colorDiffusionCoeff * (avgColor - color0)
								this.particleColor[3 * id + k] +=
									colorDiffusionCoeff * (avgColor - color1)
							}
						}
					}
				}
			}
		}
	}

	handleParticleCollisions(
		obstacleX,
		obstacleY,
		obstacleRadius,
		domainWidth,
		domainHeight
	) {
		const minDist = obstacleRadius + this.particleRadius
		const minDist2 = minDist * minDist
		const minX = this.h + this.particleRadius
		const maxX = domainWidth - this.h - this.particleRadius
		const minY = this.h + this.particleRadius
		const maxY = domainHeight - this.h - this.particleRadius

		for (let i = 0; i < this.numParticles; i++) {
			let x = this.particlePos[2 * i]
			let y = this.particlePos[2 * i + 1]

			// Mouse interaction - apply velocity impulse instead of hard push
			if (obstacleX < 9000) {
				const dx = x - obstacleX
				const dy = y - obstacleY
				const d2 = dx * dx + dy * dy
				const influenceRadius = obstacleRadius * 3
				const influenceRadius2 = influenceRadius * influenceRadius
				if (d2 < influenceRadius2 && d2 > 0.0001) {
					const d = Math.sqrt(d2)
					// Smooth falloff - stronger close to mouse
					const strength = 1.0 - d / influenceRadius
					const pushStrength = strength * strength * 15.0
					this.particleVel[2 * i] += (dx / d) * pushStrength
					this.particleVel[2 * i + 1] += (dy / d) * pushStrength
				}
			}

			// Text mask obstacle collision
			if (this.textMask && this.isInsideObstacle(x, y)) {
				// Find direction to push particle out (sample surrounding points)
				const step = this.particleRadius * 2
				let bestDx = 0
				let bestDy = 0
				let minDepth = Infinity

				// Sample 8 directions to find closest exit
				const directions = [
					[1, 0],
					[-1, 0],
					[0, 1],
					[0, -1],
					[0.707, 0.707],
					[-0.707, 0.707],
					[0.707, -0.707],
					[-0.707, -0.707],
				]

				for (const [ddx, ddy] of directions) {
					for (let dist = step; dist < step * 20; dist += step) {
						const testX = x + ddx * dist
						const testY = y + ddy * dist
						if (!this.isInsideObstacle(testX, testY)) {
							if (dist < minDepth) {
								minDepth = dist
								bestDx = ddx
								bestDy = ddy
							}
							break
						}
					}
				}

				// Push particle out
				if (minDepth < Infinity) {
					x += bestDx * (minDepth + this.particleRadius)
					y += bestDy * (minDepth + this.particleRadius)
					// Dampen velocity toward obstacle
					this.particleVel[2 * i] *= 0.5
					this.particleVel[2 * i + 1] *= 0.5
				}
			}

			// Rectangle obstacles
			for (const obs of this.obstacles) {
				if (obs.type === 'square') {
					const pad = this.particleRadius
					if (
						x > obs.minX - pad &&
						x < obs.maxX + pad &&
						y > obs.minY - pad &&
						y < obs.maxY + pad
					) {
						const dLeft = x - (obs.minX - pad)
						const dRight = obs.maxX + pad - x
						const dBottom = y - (obs.minY - pad)
						const dTop = obs.maxY + pad - y
						const minD = Math.min(dLeft, dRight, dBottom, dTop)

						if (minD === dLeft) x = obs.minX - pad
						else if (minD === dRight) x = obs.maxX + pad
						else if (minD === dBottom) y = obs.minY - pad
						else y = obs.maxY + pad
					}
				}
			}

			// Boundary collisions
			if (x < minX) {
				x = minX
				this.particleVel[2 * i] = 0
			}
			if (x > maxX) {
				x = maxX
				this.particleVel[2 * i] = 0
			}
			if (y < minY) {
				y = minY
				this.particleVel[2 * i + 1] = 0
			}
			if (y > maxY) {
				y = maxY
				this.particleVel[2 * i + 1] = 0
			}

			this.particlePos[2 * i] = x
			this.particlePos[2 * i + 1] = y
		}
	}

	updateParticleDensity() {
		const n = this.fNumY
		const h = this.h
		const h1 = this.fInvSpacing
		const h2 = 0.5 * h

		this.particleDensity.fill(0)

		for (let i = 0; i < this.numParticles; i++) {
			const x = this.particlePos[2 * i]
			const y = this.particlePos[2 * i + 1]

			const x0 = Math.floor((x - h2) * h1)
			const y0 = Math.floor((y - h2) * h1)

			const tx = (x - h2 - x0 * h) * h1
			const ty = (y - h2 - y0 * h) * h1
			const sx = 1.0 - tx
			const sy = 1.0 - ty

			if (x0 >= 0 && x0 < this.fNumX - 1 && y0 >= 0 && y0 < this.fNumY - 1) {
				this.particleDensity[x0 * n + y0] += sx * sy
				this.particleDensity[(x0 + 1) * n + y0] += tx * sy
				this.particleDensity[(x0 + 1) * n + (y0 + 1)] += tx * ty
				this.particleDensity[x0 * n + (y0 + 1)] += sx * ty
			}
		}

		if (this.particleRestDensity === 0) {
			let sum = 0
			let numFluidCells = 0
			for (let i = 0; i < this.fNumCells; i++) {
				if (this.cellType[i] === 1) {
					sum += this.particleDensity[i]
					numFluidCells++
				}
			}
			if (numFluidCells > 0) this.particleRestDensity = sum / numFluidCells
		}
	}

	transferVelocities(toGrid, flipRatio) {
		const n = this.fNumY
		const h = this.h
		const h1 = this.fInvSpacing
		const h2 = 0.5 * h

		if (toGrid) {
			this.prevU.set(this.u)
			this.prevV.set(this.v)

			this.du.fill(0)
			this.dv.fill(0)
			this.u.fill(0)
			this.v.fill(0)

			for (let i = 0; i < this.fNumCells; i++)
				this.cellType[i] = this.s[i] === 0 ? 2 : 0

			for (let i = 0; i < this.numParticles; i++) {
				const x = this.particlePos[2 * i]
				const y = this.particlePos[2 * i + 1]
				const xi = Math.floor(x * h1)
				const yi = Math.floor(y * h1)
				const cellNr =
					Math.max(0, Math.min(xi, this.fNumX - 1)) * n +
					Math.max(0, Math.min(yi, this.fNumY - 1))
				if (this.cellType[cellNr] === 0) this.cellType[cellNr] = 1
			}
		}

		for (let component = 0; component < 2; component++) {
			const dx = component === 0 ? 0 : h2
			const dy = component === 0 ? h2 : 0
			const f = component === 0 ? this.u : this.v
			const prevF = component === 0 ? this.prevU : this.prevV
			const d = component === 0 ? this.du : this.dv

			for (let i = 0; i < this.numParticles; i++) {
				const x = this.particlePos[2 * i]
				const y = this.particlePos[2 * i + 1]

				const x0 = Math.min(Math.floor((x - dx) * h1), this.fNumX - 2)
				const y0 = Math.min(Math.floor((y - dy) * h1), this.fNumY - 2)

				const tx = (x - dx - x0 * h) * h1
				const ty = (y - dy - y0 * h) * h1
				const sx = 1.0 - tx
				const sy = 1.0 - ty

				const d0 = sx * sy
				const d1 = tx * sy
				const d2 = tx * ty
				const d3 = sx * ty

				const nr0 = x0 * n + y0
				const nr1 = (x0 + 1) * n + y0
				const nr2 = (x0 + 1) * n + (y0 + 1)
				const nr3 = x0 * n + (y0 + 1)

				if (toGrid) {
					const pv = this.particleVel[2 * i + component]
					f[nr0] += pv * d0
					d[nr0] += d0
					f[nr1] += pv * d1
					d[nr1] += d1
					f[nr2] += pv * d2
					d[nr2] += d2
					f[nr3] += pv * d3
					d[nr3] += d3
				} else {
					const valid0 = this.cellType[nr0] !== 0 || this.cellType[nr0] !== 2
					const valid1 = this.cellType[nr1] !== 0 || this.cellType[nr1] !== 2
					const valid2 = this.cellType[nr2] !== 0 || this.cellType[nr2] !== 2
					const valid3 = this.cellType[nr3] !== 0 || this.cellType[nr3] !== 2

					const v =
						valid0 * d0 * f[nr0] +
						valid1 * d1 * f[nr1] +
						valid2 * d2 * f[nr2] +
						valid3 * d3 * f[nr3]
					const weight = valid0 * d0 + valid1 * d1 + valid2 * d2 + valid3 * d3

					if (weight > 0) {
						const picV = v / weight
						const corr =
							valid0 * d0 * (f[nr0] - prevF[nr0]) +
							valid1 * d1 * (f[nr1] - prevF[nr1]) +
							valid2 * d2 * (f[nr2] - prevF[nr2]) +
							valid3 * d3 * (f[nr3] - prevF[nr3])
						const flipV = this.particleVel[2 * i + component] + corr / weight

						this.particleVel[2 * i + component] =
							(1.0 - flipRatio) * picV + flipRatio * flipV
					}
				}
			}

			if (toGrid) {
				for (let i = 0; i < f.length; i++) {
					if (d[i] > 0) f[i] /= d[i]
				}

				// Restore solid cell velocities
				for (let i = 0; i < this.fNumX; i++) {
					for (let j = 0; j < this.fNumY; j++) {
						const solid = this.cellType[i * n + j] === 2
						if (solid || (i > 0 && this.cellType[(i - 1) * n + j] === 2))
							this.u[i * n + j] = this.prevU[i * n + j]
						if (solid || (j > 0 && this.cellType[i * n + (j - 1)] === 2))
							this.v[i * n + j] = this.prevV[i * n + j]
					}
				}
			}
		}
	}

	solveIncompressibility(numIters, overRelaxation, compensateDrift) {
		this.p.fill(0)
		this.prevU.set(this.u)
		this.prevV.set(this.v)

		const n = this.fNumY
		const cp = (this.density * this.h) / dt

		for (let iter = 0; iter < numIters; iter++) {
			for (let i = 1; i < this.fNumX - 1; i++) {
				for (let j = 1; j < this.fNumY - 1; j++) {
					if (this.cellType[i * n + j] !== 1) continue

					const center = i * n + j
					const left = (i - 1) * n + j
					const right = (i + 1) * n + j
					const bottom = i * n + (j - 1)
					const top = i * n + (j + 1)

					const sx0 = this.s[left]
					const sx1 = this.s[right]
					const sy0 = this.s[bottom]
					const sy1 = this.s[top]
					const s = sx0 + sx1 + sy0 + sy1

					if (s === 0) continue

					let div =
						this.u[right] - this.u[center] + this.v[top] - this.v[center]

					if (compensateDrift) {
						const k = 1.0
						const compression =
							this.particleDensity[center] - this.particleRestDensity
						if (compression > 0) div -= k * compression
					}

					const p = (-div / s) * overRelaxation
					this.p[center] += cp * p

					this.u[center] -= sx0 * p
					this.u[right] += sx1 * p
					this.v[center] -= sy0 * p
					this.v[top] += sy1 * p
				}
			}
		}
	}

	simulate(
		dt,
		gravity,
		flipRatio,
		numPressureIters,
		numParticleIters,
		overRelaxation,
		compensateDrift,
		separateParticles,
		obstacleX,
		obstacleY,
		obstacleRadius,
		domainWidth,
		domainHeight
	) {
		const numSubSteps = 1
		const sdt = dt / numSubSteps

		for (let step = 0; step < numSubSteps; step++) {
			this.integrateParticles(sdt, gravity)
			if (separateParticles) this.pushParticlesApart(numParticleIters)
			this.handleParticleCollisions(
				obstacleX,
				obstacleY,
				obstacleRadius,
				domainWidth,
				domainHeight
			)
			this.transferVelocities(true, flipRatio)
			this.updateParticleDensity()
			this.solveIncompressibility(
				numPressureIters,
				overRelaxation,
				compensateDrift
			)
			this.transferVelocities(false, flipRatio)
		}
	}
}

// Global dt for pressure solver
let dt = 1 / 60

class NotFoundScene extends BaseScene {
	constructor(id, container) {
		super(id, container)
		this.cameraDistance = 5
	}

	setupScene() {
		this.time = 0
		this.shapeSize = 1.5
	}

	adjustCamera() {
		this.camera.position.z = this.cameraDistance
		this.camera.lookAt(0, 0, 0)
	}

	async createObjects() {
		this.adjustCamera()
		await this.initFluidSimulation()
		this.createParticleMesh()
		this.createMouseListeners()
	}

	async loadFont(fontUrl, fontFamily) {
		try {
			const font = new FontFace(fontFamily, `url(${fontUrl})`)
			await font.load()
			document.fonts.add(font)
			return true
		} catch (error) {
			console.warn('Failed to load font:', error)
			return false
		}
	}

	getResponsiveTextScale() {
		// Scale text smaller on mobile
		const viewportWidth = window.innerWidth
		if (viewportWidth < 480) return 0.22 // Small mobile
		if (viewportWidth < 768) return 0.22 // Mobile
		if (viewportWidth < 1024) return 0.28 // Tablet
		return 0.35 // Desktop
	}

	async createTextMask(text, width, height) {
		// Load custom font (Montreal Bold)
		const fontFamily = 'Montreal404'
		const fontUrl =
			'/wp-content/themes/startdigital/static/fonts/montreal-bold.ttf'
		await this.loadFont(fontUrl, fontFamily)

		// Create high-res canvas for text rendering
		const scale = 4 // Higher resolution for smooth edges
		const canvas = document.createElement('canvas')
		canvas.width = Math.floor(width * scale * 10)
		canvas.height = Math.floor(height * scale * 10)
		const ctx = canvas.getContext('2d')

		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height)

		// Draw text centered - scale smaller on mobile
		const textScale = this.getResponsiveTextScale()
		const fontSize = canvas.height * textScale
		ctx.font = `${fontSize}px "${fontFamily}", "PP Montreal", "Montreal", Arial, sans-serif`
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		ctx.fillStyle = 'white'
		ctx.fillText(text, canvas.width / 2, canvas.height / 2)

		// Get pixel data
		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

		return {
			data: imageData.data,
			width: canvas.width,
			height: canvas.height,
		}
	}

	async initFluidSimulation() {
		const { width, height } = this.getFrustumDimensions(-0.25)
		this.simWidth = width
		this.simHeight = height

		// Simulation parameters
		const res = 30
		const spacing = height / res
		const particleRadius = 0.065 * spacing
		const maxParticles = 100000

		this.fluid = new FlipFluid(
			1000,
			width,
			height,
			spacing,
			particleRadius,
			maxParticles
		)

		// Create text mask from font
		const textMask = await this.createTextMask('404', width, height)
		this.fluid.setTextMask(
			textMask.data,
			textMask.width,
			textMask.height,
			width,
			height
		)

		this.fluid.setupGrid(width, height)

		// Initialize particles in a dam-break configuration
		const h = this.fluid.h
		const dx = 2.0 * particleRadius
		const dy = (Math.sqrt(3.0) / 2.0) * dx

		let numX = Math.floor((width * 0.8) / dx)
		let numY = Math.floor((height * 0.4) / dy)

		let count = 0
		for (let i = 0; i < numX && count < maxParticles; i++) {
			for (let j = 0; j < numY && count < maxParticles; j++) {
				const x =
					h + particleRadius + dx * i + (j % 2 === 0 ? 0 : particleRadius)
				const y = h + particleRadius + dy * j

				// Skip if inside obstacle
				if (this.fluid.isInsideObstacle(x, y)) continue

				this.fluid.particlePos[2 * count] = x
				this.fluid.particlePos[2 * count + 1] = y
				this.fluid.particleVel[2 * count] = 0
				this.fluid.particleVel[2 * count + 1] = 0

				// Gradient from navy (#02001B) to white
				const t = j / numY
				this.fluid.particleColor[3 * count] = 0.008 + 0.3 * t // R: 0.008 -> 1.0
				this.fluid.particleColor[3 * count + 1] = 0.0 + 0.3 * t // G: 0.0 -> 1.0
				this.fluid.particleColor[3 * count + 2] = 0.106 + 0.35 * t // B: 0.106 -> 1.0

				count++
			}
		}
		this.fluid.numParticles = count

		// Scene parameters
		this.gravity = -9.81
		this.flipRatio = 0.9
		this.numPressureIters = 50
		this.numParticleIters = 2
		this.overRelaxation = 1.9
		this.compensateDrift = true
		this.separateParticles = true
		this.obstacleX = 9999
		this.obstacleY = 9999
		this.updateObstacleRadius()
	}

	updateObstacleRadius() {
		// Scale mouse interaction radius based on simulation height
		const baseRadius = 0.4
		const baseHeight = 5
		this.obstacleRadius = baseRadius * (this.simHeight / baseHeight)
	}

	getResponsiveParticleSize() {
		// Scale particle size based on viewport height
		const baseSize = 0.06
		const baseHeight = 800
		const currentHeight = window.innerHeight
		return baseSize * (currentHeight / baseHeight)
	}

	createParticleMesh() {
		const geometry = new THREE.BufferGeometry()
		const positions = new Float32Array(this.fluid.maxParticles * 3)
		const colors = new Float32Array(this.fluid.maxParticles * 3)

		geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
		geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

		this.particleMaterial = new THREE.ShaderMaterial({
			uniforms: {
				uSize: { value: this.getResponsiveParticleSize() },
			},
			vertexShader: /* glsl */ `
				uniform float uSize;
				varying vec3 vColor;

				void main() {
					vColor = color;
					vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
					gl_Position = projectionMatrix * mvPosition;
					gl_PointSize = uSize * (300.0 / -mvPosition.z);
				}
			`,
			fragmentShader: /* glsl */ `
				varying vec3 vColor;

				void main() {
					vec2 center = gl_PointCoord - 0.5;
					float dist = length(center);
					
					gl_FragColor = vec4(vColor, 1.0);
				}
			`,
			transparent: true,
			depthWrite: false,
			vertexColors: true,
		})

		this.particles = new THREE.Points(geometry, this.particleMaterial)
		this.scene.add(this.particles)
	}

	createMouseListeners() {
		this.mouse = new THREE.Vector2(9999, 9999)
		this.mouse3d = new THREE.Vector3(9999, 9999, 0)

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

				const vector = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5)
				vector.unproject(this.camera)
				const dir = vector.sub(this.camera.position).normalize()
				const dist = -this.camera.position.z / dir.z
				this.mouse3d.copy(this.camera.position).add(dir.multiplyScalar(dist))

				// Convert to simulation space
				this.obstacleX = this.mouse3d.x + this.simWidth / 2
				this.obstacleY = this.mouse3d.y + this.simHeight / 2
			} else {
				this.obstacleX = 9999
				this.obstacleY = 9999
			}
		}

		this.onMouseLeave = () => {
			this.obstacleX = 9999
			this.obstacleY = 9999
		}

		window.addEventListener('mousemove', this.onMouseMove)
		this.container.addEventListener('mouseleave', this.onMouseLeave)
	}

	animate(deltaTime) {
		if (!this.isInitialized || !this.fluid || !this.particles) return

		this.time += deltaTime
		dt = Math.min(deltaTime, 1 / 30)

		// Run simulation
		this.fluid.simulate(
			dt,
			this.gravity,
			this.flipRatio,
			this.numPressureIters,
			this.numParticleIters,
			this.overRelaxation,
			this.compensateDrift,
			this.separateParticles,
			this.obstacleX,
			this.obstacleY,
			this.obstacleRadius,
			this.simWidth,
			this.simHeight
		)

		// Update particle mesh
		const positions = this.particles.geometry.attributes.position.array
		const colors = this.particles.geometry.attributes.color.array

		for (let i = 0; i < this.fluid.numParticles; i++) {
			// Convert from simulation coords to scene coords
			positions[3 * i] = this.fluid.particlePos[2 * i] - this.simWidth / 2
			positions[3 * i + 1] =
				this.fluid.particlePos[2 * i + 1] - this.simHeight / 2
			positions[3 * i + 2] = 0

			colors[3 * i] = this.fluid.particleColor[3 * i]
			colors[3 * i + 1] = this.fluid.particleColor[3 * i + 1]
			colors[3 * i + 2] = this.fluid.particleColor[3 * i + 2]
		}

		this.particles.geometry.attributes.position.needsUpdate = true
		this.particles.geometry.attributes.color.needsUpdate = true
		this.particles.geometry.setDrawRange(0, this.fluid.numParticles)
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

		// Debounce the fluid reinitialization
		if (this.resizeTimeout) {
			clearTimeout(this.resizeTimeout)
		}

		this.resizeTimeout = setTimeout(() => {
			this.handleResponsiveResize()
		}, 150)
	}

	async handleResponsiveResize() {
		if (!this.fluid) return

		const { width: newWidth, height: newHeight } =
			this.getFrustumDimensions(-0.25)

		// Skip if dimensions haven't changed significantly
		if (
			Math.abs(newWidth - this.simWidth) < 0.1 &&
			Math.abs(newHeight - this.simHeight) < 0.1
		) {
			return
		}

		// Store old dimensions for remapping
		const oldWidth = this.simWidth
		const oldHeight = this.simHeight

		// Store particle positions (normalized 0-1)
		const normalizedPositions = []
		const velocities = []
		const colors = []

		for (let i = 0; i < this.fluid.numParticles; i++) {
			normalizedPositions.push({
				x: this.fluid.particlePos[2 * i] / oldWidth,
				y: this.fluid.particlePos[2 * i + 1] / oldHeight,
			})
			velocities.push({
				x: this.fluid.particleVel[2 * i],
				y: this.fluid.particleVel[2 * i + 1],
			})
			colors.push({
				r: this.fluid.particleColor[3 * i],
				g: this.fluid.particleColor[3 * i + 1],
				b: this.fluid.particleColor[3 * i + 2],
			})
		}

		const oldParticleCount = this.fluid.numParticles

		// Update simulation dimensions
		this.simWidth = newWidth
		this.simHeight = newHeight

		// Reinitialize fluid with new dimensions
		const res = 30
		const spacing = newHeight / res
		const particleRadius = 0.065 * spacing
		const maxParticles = 100000

		this.fluid = new FlipFluid(
			1000,
			newWidth,
			newHeight,
			spacing,
			particleRadius,
			maxParticles
		)

		// Recreate text mask for new dimensions
		const textMask = await this.createTextMask('404', newWidth, newHeight)
		this.fluid.setTextMask(
			textMask.data,
			textMask.width,
			textMask.height,
			newWidth,
			newHeight
		)

		this.fluid.setupGrid(newWidth, newHeight)

		// Restore particles at remapped positions
		const h = this.fluid.h
		let count = 0

		for (let i = 0; i < oldParticleCount && count < maxParticles; i++) {
			// Remap to new dimensions
			let x = normalizedPositions[i].x * newWidth
			let y = normalizedPositions[i].y * newHeight

			// Clamp to valid bounds
			const minBound = h + this.fluid.particleRadius
			const maxBoundX = newWidth - h - this.fluid.particleRadius
			const maxBoundY = newHeight - h - this.fluid.particleRadius

			x = Math.max(minBound, Math.min(maxBoundX, x))
			y = Math.max(minBound, Math.min(maxBoundY, y))

			// Skip if inside obstacle
			if (this.fluid.isInsideObstacle(x, y)) continue

			this.fluid.particlePos[2 * count] = x
			this.fluid.particlePos[2 * count + 1] = y
			this.fluid.particleVel[2 * count] = velocities[i].x
			this.fluid.particleVel[2 * count + 1] = velocities[i].y
			this.fluid.particleColor[3 * count] = colors[i].r
			this.fluid.particleColor[3 * count + 1] = colors[i].g
			this.fluid.particleColor[3 * count + 2] = colors[i].b

			count++
		}

		this.fluid.numParticles = count

		// Update particle size for new viewport
		if (this.particleMaterial) {
			this.particleMaterial.uniforms.uSize.value =
				this.getResponsiveParticleSize()
		}

		// Update mouse interaction radius
		this.updateObstacleRadius()
	}

	dispose() {
		if (this.resizeTimeout) {
			clearTimeout(this.resizeTimeout)
		}
		if (this.onMouseMove) {
			window.removeEventListener('mousemove', this.onMouseMove)
		}
		if (this.onMouseLeave) {
			this.container?.removeEventListener('mouseleave', this.onMouseLeave)
		}
		if (this.particleMaterial) this.particleMaterial.dispose()
		if (this.particles) this.particles.geometry.dispose()
		super.dispose()
	}
}

export default NotFoundScene
