export default /*glsl*/ `
#include <common>
#include <packing>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>

varying float vLife;
varying float vHit;
varying float vMorphProgress;
varying vec3 vWorldPosition;
uniform vec3 color1;
uniform vec3 color2;
uniform vec4 shadowColor;

void main() {
    // Convert gl_PointCoord (0-1) to centered coordinates (-1 to 1)
    vec2 uv = (gl_PointCoord - 0.5) * 2.0;

    // Discard pixels outside sphere
    float d = length(uv);
    if (d > 1.0) discard;

    // Base color from life
    vec3 baseColor = mix(color2, color1, smoothstep(0.0, 0.5, vLife));

    // Faux sphere lighting with two lights
    float light1 = 0.8 - distance(uv, vec2(-0.3, -0.3)) * 0.1;
    float light2 = 0.6 - distance(uv, vec2(0.4, 0.5)) * 0.4;
    vec3 sphere = baseColor * max(light1 + light2, 0.9);

    // Apply shadow using uniform (rgb = color, a = not used currently)
    float shadow = getShadowMask();
    sphere = mix(shadowColor.rgb, sphere, max(shadow, 0.0));

    // Morph flash - color interpolated by life
    vec3 morphColorStart = vec3(0.8, 0.8, 1.0) * 1.5; // White for low life
    vec3 morphColorEnd = sphere;   // Blue-ish for high life
    vec3 morphColor = mix(morphColorStart, morphColorEnd, vLife * 1.2);
    float morphWave = sin(clamp(vMorphProgress, 0.0, 1.0) * 3.14159);
    sphere = mix(sphere, morphColor, morphWave * 0.9);

    // Mouse hit - flash to white (separate from morph)
    vec3 hitColor = vec3(0.8, 0.8, 1.0);
    sphere = mix(sphere, hitColor, vHit * vHit * 0.7);

    gl_FragColor = vec4(sphere, 1.0);
}
`
