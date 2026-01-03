export default /* glsl */ `
uniform vec2 resolution;
uniform sampler2D tDiffuse;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    gl_FragColor = texture2D(tDiffuse, uv);
}
`
