import curl from './curl.js'

export default /* glsl */ `
uniform vec2 resolution;
uniform sampler2D texturePosition;
uniform sampler2D textureDefaultPosition;
uniform sampler2D textureTargetPosition;
uniform float time;
uniform float speed;
uniform float dieSpeed;
uniform float radius;
uniform float curlSize;
uniform float attraction;
uniform float initAnimation;
uniform float morphProgress;
uniform vec3 mouse3d;
uniform float mouseVelocity;

${curl}

void main() {
	vec2 uv = gl_FragCoord.xy / resolution.xy;

	vec4 positionInfo = texture2D(texturePosition, uv);
	vec3 position = positionInfo.xyz;
	float life = positionInfo.a - dieSpeed;

	// Get target position (blend between default and target based on morphProgress)
	vec4 defaultPos = texture2D(textureDefaultPosition, uv);
	vec4 targetPos = texture2D(textureTargetPosition, uv);
	vec4 goalPos = mix(defaultPos, targetPos, morphProgress);

	if (life < 0.0) {
		position = goalPos.xyz;
		life = 0.5 + fract(goalPos.w * 21.4131 + time);
	} else {
		vec3 toGoal = goalPos.xyz - position;
		float goalDist = length(toGoal);

		// Mouse repulsion - scales with velocity
		vec3 toMouse = position - mouse3d;
		float mouseDist = length(toMouse);
		float velocityScale = clamp(mouseVelocity * 0.2, 0.4, 8.0);
		float mouseRadius = 10.0 + mouseVelocity * 2.0;
		float mouseStrength = 120.0 * velocityScale;

		if (mouseDist < mouseRadius) {
			float repelForce = (1.0 - mouseDist / mouseRadius);
			repelForce = repelForce * repelForce * mouseStrength;
			vec3 repelDir = normalize(toMouse + 0.001);
			position += repelDir * repelForce * speed;
		}

		// Phase 1 (0-0.5): Disperse with strong curl wave
		// Phase 2 (0.5-1): Converge back to target
		float dispersePhase = smoothstep(0.0, 0.5, morphProgress);
		float convergePhase = smoothstep(0.5, 1.0, morphProgress);


		// Big swirling curl wave during dispersion
		float curlIntensity = sin(morphProgress * 3.14159) * 7.0;
		vec3 curlOffset = curl(position * curlSize * 0.4, time * 2.0, 0.1) * speed * curlIntensity;
		position += curlOffset;

		// Attraction to goal - weak during disperse, strong during converge
		float attraction = mix(0.01, 0.12, convergePhase);
		position += toGoal * attraction * speed;

		// Normal curl movement (reduced during morph)
		float normalCurl = 1.0 - sin(morphProgress * 3.14159) * 0.8;
		position += curl(position * curlSize, time, 0.1 + (1.0 - life) * 0.1) * speed * normalCurl;
	}

	gl_FragColor = vec4(position, life);
}
`
