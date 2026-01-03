export default /*glsl*/ `

uniform sampler2D texturePosition;

varying vec4 vWorldPosition;

void main() {

    vec4 positionInfo = texture2D( texturePosition, position.xy );

    vec4 worldPosition = modelMatrix * vec4( positionInfo.xyz, 1.0 );
    vec4 mvPosition = viewMatrix * worldPosition;

    gl_PointSize = 650.0 / length( mvPosition.xyz ) * smoothstep(0.0, 0.2, positionInfo.w);

    vWorldPosition = worldPosition;

    gl_Position = projectionMatrix * mvPosition;

}
`
