export default /*glsl*/ `
uniform sampler2D texturePosition;

varying vec2 vHighPrecisionZW;

void main() {
    vec4 positionInfo = texture2D( texturePosition, position.xy );

    vec4 mvPosition = modelViewMatrix * vec4( positionInfo.xyz, 1.0 );

    gl_PointSize = 1050.0 / length( mvPosition.xyz ) * smoothstep(0.0, 0.2, positionInfo.w);

    gl_Position = projectionMatrix * mvPosition;

    vHighPrecisionZW = gl_Position.zw;
}
`
