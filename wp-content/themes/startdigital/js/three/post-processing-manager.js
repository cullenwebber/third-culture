import * as THREE from 'three'

class PostProcessingManager {
	constructor(renderer, scene, camera) {
		this.renderer = renderer
		this.scene = scene
		this.camera = camera

		// Render targets for ping-pong rendering
		this.renderTarget1 = null
		this.renderTarget2 = null
		this.currentTarget = 0

		// Post-processing passes
		this.passes = []

		// Final composite scene and camera for screen quad
		this.postScene = new THREE.Scene()
		this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

		this.init()
	}

	init() {
		const size = this.renderer.getSize(new THREE.Vector2())
		const pixelRatio = this.renderer.getPixelRatio()

		// Create render targets
		this.renderTarget1 = new THREE.WebGLRenderTarget(
			size.width * pixelRatio,
			size.height * pixelRatio,
			{
				minFilter: THREE.LinearFilter,
				magFilter: THREE.LinearFilter,
				format: THREE.RGBAFormat,
				type: THREE.FloatType,
			}
		)

		this.renderTarget2 = this.renderTarget1.clone()

		// Create screen quad geometry
		this.screenQuad = new THREE.PlaneGeometry(2, 2)
	}

	addPass(pass) {
		this.passes.push(pass)
		return this
	}

	removePass(pass) {
		const index = this.passes.indexOf(pass)
		if (index > -1) {
			this.passes.splice(index, 1)
		}
		return this
	}

	render(deltaTime = 0) {
		if (this.passes.length === 0) {
			this.renderer.render(this.scene, this.camera)
			return
		}

		// Render scene to first render target
		this.renderer.setRenderTarget(this.renderTarget1)
		this.renderer.clear() // Add this line
		this.renderer.render(this.scene, this.camera)

		// Apply each pass
		for (let i = 0; i < this.passes.length; i++) {
			const pass = this.passes[i]
			const isLastPass = i === this.passes.length - 1

			const inputTarget =
				this.currentTarget === 0 ? this.renderTarget1 : this.renderTarget2
			const outputTarget = isLastPass
				? null
				: this.currentTarget === 0
				? this.renderTarget2
				: this.renderTarget1

			this.renderPass(pass, inputTarget, outputTarget, deltaTime, isLastPass)

			if (!isLastPass) {
				this.currentTarget = 1 - this.currentTarget
			}
		}
	}

	renderPass(pass, inputTarget, outputTarget, deltaTime, isLastPass) {
		this.renderer.setRenderTarget(outputTarget)
		this.renderer.clear() // Add this line

		pass.update(deltaTime, inputTarget.texture)
		const mesh = new THREE.Mesh(this.screenQuad, pass.material)

		this.postScene.clear()
		this.postScene.add(mesh)
		this.renderer.render(this.postScene, this.postCamera)
		this.postScene.remove(mesh)
	}

	resize(width, height) {
		const pixelRatio = this.renderer.getPixelRatio()
		const targetWidth = width * pixelRatio
		const targetHeight = height * pixelRatio

		// Dispose old targets
		this.renderTarget1?.dispose()
		this.renderTarget2?.dispose()

		// Create new targets with updated size
		this.renderTarget1 = new THREE.WebGLRenderTarget(
			targetWidth,
			targetHeight,
			{
				minFilter: THREE.LinearFilter,
				magFilter: THREE.LinearFilter,
				format: THREE.RGBAFormat,
				type: THREE.FloatType,
			}
		)

		this.renderTarget2 = this.renderTarget1.clone()

		// Update passes
		this.passes.forEach((pass) => {
			pass.resize?.(width, height)
		})
	}

	dispose() {
		this.renderTarget1?.dispose()
		this.renderTarget2?.dispose()
		this.passes.forEach((pass) => pass.dispose?.())
		this.screenQuad?.dispose()
	}
}

export default PostProcessingManager
