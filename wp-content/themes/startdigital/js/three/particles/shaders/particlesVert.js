export default /*glsl*/ `
#include <common>
#include <shadowmap_pars_vertex>

uniform sampler2D texturePosition;
uniform sampler2D textureHit;
uniform float morphProgress;

varying float vLife;
varying float vHit;
varying float vMorphProgress;
varying vec3 vWorldPosition;

void main() {
    vec4 positionInfo = texture2D( texturePosition, position.xy );
    float hitInfo = texture2D( textureHit, position.xy ).r;

    // Calculate world position - named to match Three.js shadow chunks
    vec4 worldPosition = modelMatrix * vec4( positionInfo.xyz, 1.0 );
    vWorldPosition = worldPosition.xyz;

    vec4 mvPosition = viewMatrix * worldPosition;

    // Dummy normal for shadow normal bias (particles don't have real normals)
    vec3 transformedNormal = vec3(0.0, 1.0, 0.0);

    // Use Three.js built-in shadow coordinate calculation
    #include <shadowmap_vertex>

    vLife = positionInfo.w;
    vHit = hitInfo;
    vMorphProgress = morphProgress;
    gl_PointSize = 1050.0 / length( mvPosition.xyz ) * smoothstep(0.0, 0.2, positionInfo.w);

    gl_Position = projectionMatrix * mvPosition;
}
`
