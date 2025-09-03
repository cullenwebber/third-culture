import * as THREE from 'three'
import { Text } from 'troika-three-text'
import BaseScene from '../base-scene'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { getStaticPath } from '../utils'
import StoneMaterial from '../materials/stone'

class CtaScene extends BaseScene {
	createMaterials() {
		this.material = new StoneMaterial()
	}

	adjustCamera() {
		this.camera.position.z = 3.0
	}

	createLights() {
		this.spotLight = new THREE.SpotLight(0xffffff, 8.0)
		this.spotLight.position.set(0.0, 0.0, 3.0)
		this.scene.add(this.spotLight)

		this.ambientLight = new THREE.AmbientLight(0xffffff, 0.2)
		this.scene.add(this.ambientLight)
	}

	createObjects() {
		this.loadIcons()
		this.createText()
		this.setupResize()
	}

	getResponsiveFontSize() {
		const width = window.innerWidth

		const minSize = 0.5
		const maxSize = 1.35
		const minWidth = 320
		const maxWidth = 1920

		const size =
			minSize +
			(maxSize - minSize) *
				Math.min(Math.max((width - minWidth) / (maxWidth - minWidth), 0), 1)
		return size
	}

	createText() {
		const material = new THREE.MeshBasicMaterial({ color: 0xffffff })
		const fontSize = this.getResponsiveFontSize()

		this.text1 = new Text()
		this.text1.text = `Let's Work`
		this.text1.fontSize = fontSize
		this.text1.anchorX = 'center'
		this.text1.anchorY = 'bottom'
		this.text1.position.z = -1
		this.text1.material = material
		this.text1.font =
			'/wp-content/themes/startdigital/static/fonts/montreal.otf'

		this.text2 = new Text()
		this.text2.text = `Together`
		this.text2.fontSize = fontSize
		this.text2.anchorX = 'center'
		this.text2.anchorY = 'bottom'
		this.text2.position.z = -1
		this.text2.position.y = -fontSize
		this.text2.material = material
		this.text2.font =
			'/wp-content/themes/startdigital/static/fonts/montreal.otf'

		this.scene.add(this.text1)
		this.scene.add(this.text2)
	}

	setupResize() {
		window.addEventListener('resize', () => {
			this.updateTextSize()
		})
	}

	updateTextSize() {
		if (!this.text1 || !this.text2) return

		const fontSize = this.getResponsiveFontSize()
		this.text1.fontSize = fontSize
		this.text2.fontSize = fontSize
		this.text2.position.y = -fontSize
	}

	loadIcons() {
		const glbPath = getStaticPath('/cube-and-triangle.glb')
		const dracoLoader = new DRACOLoader()
		dracoLoader.setDecoderPath(
			'https://www.gstatic.com/draco/versioned/decoders/1.5.6/'
		)

		const gltfLoader = new GLTFLoader()
		gltfLoader.setDRACOLoader(dracoLoader)

		gltfLoader.load(
			glbPath,
			(gltf) => {
				this.logo = gltf.scene
				this.logo.scale.set(0.8, 0.8, 0.8)
				this.logo.traverse((child) => {
					if (!child.isMesh) return

					child.castShadow = true
					child.material = this.material.getMaterial()
				})
				this.scene.add(this.logo)
			},
			undefined,
			undefined
		)
	}

	animate(deltaTime) {
		this.time += deltaTime
		if (!this.logo) return
		this.logo.traverse((child) => {
			if (!child.isMesh) return

			if (!child.userData.originalPosition) {
				child.userData.originalPosition = child.position.clone()
			}

			const offset = (child.position.x + child.position.z) * 2.0
			const floatAmount = Math.cos(this.time * 0.7 + offset) * 0.1

			child.position.y = child.userData.originalPosition.y + floatAmount
			child.rotation.y = Math.sin(this.time * 0.5 + offset * 2.0) * 0.25
			child.rotation.x = Math.sin(this.time * 0.2 + offset) * 0.25
			child.rotation.z = Math.cos(this.time * 0.6 + offset) * 0.25
		})
	}
}

export default CtaScene
