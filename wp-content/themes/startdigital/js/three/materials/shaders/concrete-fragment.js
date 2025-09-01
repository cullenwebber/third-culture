const concreteFragment = /* glsl */ `
// Simple, good quality noise
float hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f); // smooth interpolation
	
	float a = hash(i);
	float b = hash(i + vec2(1.0, 0.0));
	float c = hash(i + vec2(0.0, 1.0));
	float d = hash(i + vec2(1.0, 1.0));
	
	return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Simple fbm
float fbm(vec2 p) {
	float value = 0.0;
	float amplitude = 0.5;
	for (int i = 0; i < 4; i++) {
		value += amplitude * noise(p);
		p *= 2.0;
		amplitude *= 0.5;
	}
	return value;
}

// High frequency static noise
float staticNoise(vec2 p) {
	return hash(p * 1.0) - 0.5;
}

// The key: good concrete patches
float concretePatches(vec2 p) {
	// Large patches at different scales
	float patches1 = noise(p * 1.2);
	float patches2 = noise(p * 0.8 + vec2(100.0));
	float patches3 = noise(p * 0.5 + vec2(200.0));
	
	// Combine and bias toward lighter values
	float combined = (patches1 + patches2 + patches3) / 3.0;
	combined = pow(combined, 0.7); // More white areas
	
	return combined;
}

// Generate concrete texture color
// Parameters:
// - baseColor: base color of the concrete
// - uv: UV coordinates (should be pre-scaled, typically * 8.0)
// - scrollOffset: offset for scrolling effect (optional, default vec2(0.0))
vec3 generateConcreteTexture(vec3 baseColor, vec2 uv, vec2 scrollOffset) {
	// Apply scroll offset to UV coordinates
	vec2 scrolledUv = uv + scrollOffset;
	
	// Start with base color
	vec3 color = baseColor;
	
	float veryFineNoise = fbm(scrolledUv);
	float veryFineNoise2 = fbm(scrolledUv * 9.5 + vec2(100.0, 50.0));
	
	color = mix(color, color * 0.95, veryFineNoise * 0.3);
	color = mix(color, color * 1.05, veryFineNoise2 * 0.9);
	color = mix(color, vec3(0.97), veryFineNoise * 0.2);
	
	// Medium scale blobs
	float mediumBlobs = fbm(scrolledUv * 0.2);
	float blobVariation = (mediumBlobs - 0.2) * 0.1;
	color = color * (1.0 + blobVariation);

	// Add subtle static noise
	float staticValue = staticNoise(scrolledUv);
	color += staticValue * 0.1; // Very subtle static overlay
	
	// Large concrete patches - this is the important part
	float patches = concretePatches(scrolledUv * 0.3);
	float patchVariation = (patches - 0.2) * 0.3;
	color = color * (1.0 + patchVariation);
	
	return color;
}

// Simplified version without scroll offset
vec3 generateConcreteTexture(vec3 baseColor, vec2 uv) {
	return generateConcreteTexture(baseColor, uv, vec2(0.0));
}
`

export default concreteFragment
