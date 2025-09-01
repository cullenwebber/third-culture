import * as THREE from 'three'
import BaseScene from '../base-scene'
import CapabilitesScrollTrigger from '../animate/home-capabilites-trigger'
import StoneMaterial from '../materials/stone'

class CapabilitiesScene extends BaseScene {
	setupScene() {
		this.scene.background = new THREE.Color(0x1e1e1e)
	}

	createMaterials() {
		this.material = new StoneMaterial()
	}

	createObjects() {
		this.createPlaceHolderObjects()
	}

	createPlaceHolderObjects() {
		this.meshs = []
		for (let i = 0; i < 4; i++) {
			const geo = new THREE.TorusKnotGeometry(1, 0.4, 128, 16)
			this.meshs[i] = new THREE.Mesh(geo, this.material.getMaterial())
			this.meshs[i].position.y = i * -8.0
			this.scene.add(this.meshs[i])
		}
	}

	createLights() {
		this.spotLight = new THREE.SpotLight(0xffffff, 5.0)
		this.spotLight.position.set(0.0, 0.0, 3.0)
		this.scene.add(this.spotLight)

		this.ambientLight = new THREE.AmbientLight(0xffffff, 0.2)
		this.scene.add(this.ambientLight)
	}

	createScrollTriggers() {
		this.animationsTrigger = new CapabilitesScrollTrigger(this)
	}
}

export default CapabilitiesScene
