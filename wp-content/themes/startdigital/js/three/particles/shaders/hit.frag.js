export default /* glsl */ `
uniform vec2 resolution;
uniform sampler2D texturePosition;
uniform sampler2D textureHit;
uniform vec3 mouse3d;
uniform float mouseVelocity;
uniform float decay;

void main() {
	vec2 uv = gl_FragCoord.xy / resolution.xy;

	vec4 positionInfo = texture2D(texturePosition, uv);
	vec3 position = positionInfo.xyz;

	// Get previous hit intensity
	float prevHit = texture2D(textureHit, uv).r;

	// Calculate distance to mouse - radius scales with velocity
	float mouseDist = length(position - mouse3d);
	float mouseRadius = 40.0 + mouseVelocity * 5.0;

	// Add hit intensity when near mouse - stronger with velocity
	float newHit = 0.0;
	if (mouseDist < mouseRadius) {
		float proximity = 1.0 - (mouseDist / mouseRadius);
		float velocityBoost = clamp(mouseVelocity * 0.5, 0.8, 2.5);
		newHit = proximity * proximity * velocityBoost;
	}

	// Mouse hit with decay
	float hitIntensity = max(newHit, prevHit * decay);

	gl_FragColor = vec4(hitIntensity, 0.0, 0.0, 1.0);
}
`
